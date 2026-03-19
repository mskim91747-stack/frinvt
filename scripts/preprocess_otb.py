"""
FR 재고자산 - 입고OTB 전처리 (의류+ACC 통합, pr_customer_req_dt 기준 월별)

실행:
  python scripts/preprocess_otb.py

결과: frontend/public/data/otb_2026.json

구조:
  의류 중분류 = b.sesn (26S/26F/26N/27S 등)
  ACC  중분류 = prdt_kind_nm_cn 매핑 (신발/모자/가방/기타)
  월별 집계   = MONTH(pr_customer_req_dt)
"""

import os
import json
import pandas as pd
import snowflake.connector
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

BRAND_ORDER = ["MLB", "MLB KIDS", "DISCOVERY"]

BRAND_NORMALIZE = {
    "MLB": "MLB",
    "MLB KIDS": "MLB KIDS",
    "MLB Kids": "MLB KIDS",
    "mlb kids": "MLB KIDS",
    "DISCOVERY": "DISCOVERY",
    "Discovery": "DISCOVERY",
    "discovery": "DISCOVERY",
}

ACC_ORDER = ["신발", "모자", "가방", "기타"]
CAT_ORDER = {"의류": 0, "ACC": 1}

QUERY = """
SELECT
    a.account_cd                                        AS account_id,
    c.account_nm_cn                                     AS account_nm,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng)     AS brand_nm,

    CASE
        WHEN b.parent_prdt_kind_nm_cn = '服装' THEN '의류'
        WHEN b.parent_prdt_kind_nm_cn = '饰品' THEN 'ACC'
        ELSE b.parent_prdt_kind_nm_cn
    END AS "대분류",

    CASE
        WHEN b.parent_prdt_kind_nm_cn = '服装' THEN b.sesn
        WHEN b.prdt_kind_nm_cn = 'Shoes'    THEN '신발'
        WHEN b.prdt_kind_nm_cn = 'Headwear' THEN '모자'
        WHEN b.prdt_kind_nm_cn = 'Bag'      THEN '가방'
        WHEN b.prdt_kind_nm_cn = 'Acc_etc'  THEN '기타'
        ELSE b.prdt_kind_nm_cn
    END AS "중분류",

    MONTH(b.pr_customer_req_dt)                         AS req_month,
    SUM(COALESCE(b.retail_amt, 0))                      AS otb_amt

FROM FNF.CHN.dw_pr a
JOIN FNF.CHN.dw_pr_scs b
  ON a.pr_no = b.pr_no
JOIN FNF.PRCS.dw_brd brd_pr
  ON a.brd_cd = brd_pr.brd_cd
LEFT JOIN FNF.PRCS.dw_brd brd_account
  ON a.brd_account_cd = brd_account.brd_cd
JOIN FNF.CHN.mst_account c
  ON a.account_cd = c.account_id

WHERE a.pr_type_nm_cn = '经销商采购申请 - 期货'
  AND b.parent_prdt_kind_nm_cn IN ('服装', '饰品')
  AND YEAR(b.pr_customer_req_dt) = 2026
  AND b.pr_customer_req_dt IS NOT NULL

GROUP BY
    a.account_cd,
    c.account_nm_cn,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    b.parent_prdt_kind_nm_cn,
    CASE
        WHEN b.parent_prdt_kind_nm_cn = '服装' THEN b.sesn
        WHEN b.prdt_kind_nm_cn = 'Shoes'    THEN '신발'
        WHEN b.prdt_kind_nm_cn = 'Headwear' THEN '모자'
        WHEN b.prdt_kind_nm_cn = 'Bag'      THEN '가방'
        WHEN b.prdt_kind_nm_cn = 'Acc_etc'  THEN '기타'
        ELSE b.prdt_kind_nm_cn
    END,
    MONTH(b.pr_customer_req_dt)

ORDER BY
    a.account_cd,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    4,
    5,
    req_month
"""


def sesn_sort_key(s: str) -> tuple:
    if not s or s == "과시즌":
        return (9999, 99)
    try:
        year = int(s[:2])
        suffix = s[2:] if len(s) > 2 else ""
        suffix_order = {"F": 0, "S": 1, "N": 2}.get(suffix, 3)
        return (-year, suffix_order)
    except Exception:
        return (9998, 99)


def normalize_brand(raw: str) -> str:
    if not raw or str(raw).strip() == "":
        return ""
    return BRAND_NORMALIZE.get(str(raw).strip(), str(raw).strip())


def build_json(df: pd.DataFrame) -> dict:
    result = {"year": "2026", "brands": {}}
    df = df.copy()
    df["brand_nm_norm"] = df["brand_nm"].apply(normalize_brand)
    acc_order_map = {v: i for i, v in enumerate(ACC_ORDER)}

    for brand_nm in BRAND_ORDER:
        brand_df = df[df["brand_nm_norm"] == brand_nm]
        accounts = []

        for (account_id, account_nm), acc_grp in brand_df.groupby(
            ["account_id", "account_nm"], sort=False
        ):
            categories = []
            for 대분류_nm, cat_grp in acc_grp.groupby("대분류", sort=False):
                대분류_nm = str(대분류_nm)
                subcategories = []

                for 중분류_nm, sub_grp in cat_grp.groupby("중분류", sort=False):
                    months_dict: dict[str, int] = {}
                    for _, row in sub_grp.iterrows():
                        m = str(int(row["req_month"]))
                        months_dict[m] = months_dict.get(m, 0) + int(row["otb_amt"])
                    subcategories.append({
                        "중분류": str(중분류_nm),
                        "months": months_dict,
                    })

                # 정렬: 의류=시즌순, ACC=고정순서
                if 대분류_nm == "의류":
                    subcategories.sort(key=lambda x: sesn_sort_key(x["중분류"]))
                else:
                    subcategories.sort(key=lambda x: acc_order_map.get(x["중분류"], 99))

                categories.append({"대분류": 대분류_nm, "subcategories": subcategories})

            categories.sort(key=lambda x: CAT_ORDER.get(x["대분류"], 99))
            accounts.append({
                "account_id": str(account_id) if pd.notna(account_id) else "",
                "account_nm": str(account_nm) if pd.notna(account_nm) else str(account_id),
                "categories": categories,
            })

        accounts.sort(key=lambda x: x["account_id"])
        result["brands"][brand_nm] = accounts
    return result


def get_connection():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
        database=os.environ["SNOWFLAKE_DATABASE"],
        schema=os.environ["SNOWFLAKE_SCHEMA"],
        role=os.environ["SNOWFLAKE_ROLE"],
    )


def main():
    output_dir = Path(__file__).parent.parent / "frontend" / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "otb_2026.json"

    print("입고OTB 조회 중 (의류+ACC 통합)...")
    conn = get_connection()
    try:
        df = pd.read_sql(QUERY, conn)
        df.columns = [c.lower() for c in df.columns]
        print(f"  조회: {len(df)}건")

        data = (
            build_json(df)
            if not df.empty
            else {"year": "2026", "brands": {b: [] for b in BRAND_ORDER}}
        )

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("  저장 완료:", out_path)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
