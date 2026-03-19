"""
FR 재고자산 - ACC OTB 전처리 스크립트 (customer request date 기준 월별)

실행:
  python scripts/preprocess_acc_otb.py   # 전체 재조회

결과: frontend/public/data/acc_otb_2026.json

ACC 중분류: class_level_2 (신발/모자/가방/기타)
월별 집계: pr_customer_req_dt 기준 2026년 월별
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

QUERY = """
SELECT
    a.account_cd                                        AS account_id,
    c.account_nm_cn                                     AS account_nm,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng)     AS brand_nm,

    CASE
        WHEN b.prdt_kind_nm_cn = 'Shoes'    THEN '신발'
        WHEN b.prdt_kind_nm_cn = 'Headwear' THEN '모자'
        WHEN b.prdt_kind_nm_cn = 'Bag'      THEN '가방'
        WHEN b.prdt_kind_nm_cn = 'Acc_etc'  THEN '기타'
        ELSE b.prdt_kind_nm_cn
    END AS class_level_2,

    MONTH(a.pr_customer_req_dt)                         AS req_month,

    SUM(COALESCE(b.retail_amt, 0)) AS otb_retail_amt

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
  AND b.parent_prdt_kind_nm_cn = '饰品'
  AND YEAR(a.pr_customer_req_dt) = 2026
  AND a.pr_customer_req_dt IS NOT NULL

GROUP BY
    a.account_cd,
    c.account_nm_cn,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    b.prdt_kind_nm_cn,
    MONTH(a.pr_customer_req_dt)

ORDER BY
    a.account_cd,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    b.prdt_kind_nm_cn,
    req_month
"""


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
            subcategories = []
            for sub_nm, sub_grp in acc_grp.groupby("class_level_2", sort=False):
                months_dict: dict[str, int] = {}
                for _, row in sub_grp.iterrows():
                    m = int(row["req_month"])
                    months_dict[str(m)] = months_dict.get(str(m), 0) + int(row["otb_retail_amt"])
                subcategories.append({
                    "중분류": str(sub_nm),
                    "months": months_dict,
                })
            subcategories.sort(key=lambda x: acc_order_map.get(x["중분류"], 99))

            accounts.append({
                "account_id": str(account_id) if pd.notna(account_id) else "",
                "account_nm": str(account_nm) if pd.notna(account_nm) else str(account_id),
                "subcategories": subcategories,
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
    out_path = output_dir / "acc_otb_2026.json"

    print("ACC OTB 월별 조회 중...")
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
