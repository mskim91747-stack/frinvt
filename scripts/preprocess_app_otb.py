"""
FR 재고자산 - 의류 OTB 전처리 스크립트 (시즌 주문금액)

실행:
  python scripts/preprocess_app_otb.py   # 전체 재조회 (시즌 오더 확정 후 재실행)

결과: frontend/public/data/app_otb_2026.json

의류 중분류: product_season (26S/26F/26N)
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

QUERY = """
SELECT
    a.account_cd                                        AS account_id,
    c.account_nm_cn                                     AS account_nm,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng)     AS brand_nm,

    b.sesn                                              AS product_season,

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
  AND a.pr_sesn IN ('26S', '26F', '26N')
  AND b.sesn IN ('26S', '26F', '26N')
  AND b.parent_prdt_kind_nm_cn = '服装'

GROUP BY
    a.account_cd,
    c.account_nm_cn,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    b.sesn

ORDER BY
    a.account_cd,
    NVL(brd_account.brd_nm_eng, brd_pr.brd_nm_eng),
    b.sesn
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

    for brand_nm in BRAND_ORDER:
        brand_df = df[df["brand_nm_norm"] == brand_nm]
        accounts = []

        for (account_id, account_nm), acc_grp in brand_df.groupby(
            ["account_id", "account_nm"], sort=False
        ):
            acc_total = int(acc_grp["otb_retail_amt"].sum())
            subcategories = []
            for sesn_nm, sub_grp in acc_grp.groupby("product_season", sort=False):
                subcategories.append({
                    "중분류": str(sesn_nm),
                    "total": int(sub_grp["otb_retail_amt"].sum()),
                })
            subcategories.sort(key=lambda x: sesn_sort_key(x["중분류"]))

            accounts.append({
                "account_id": str(account_id) if pd.notna(account_id) else "",
                "account_nm": str(account_nm) if pd.notna(account_nm) else str(account_id),
                "total": acc_total,
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
    out_path = output_dir / "app_otb_2026.json"

    print("의류 OTB 조회 중...")
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
