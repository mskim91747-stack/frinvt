"""
FR 재고자산 - FastAPI 로컬 개발 서버
실행: uvicorn backend.main:app --reload --port 8000
"""

import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FR 재고자산 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data"


def load_json(filename: str) -> dict:
    path = DATA_DIR / filename
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"{filename} 파일이 없습니다. preprocess.py를 먼저 실행하세요.",
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/stock/{year}")
def get_stock(year: int):
    """월별 재고잔액 데이터 반환 (year: 2025 or 2026)"""
    if year not in (2025, 2026):
        raise HTTPException(status_code=400, detail="year는 2025 또는 2026이어야 합니다.")
    return load_json(f"stock_{year}.json")


@app.get("/api/health")
def health():
    return {"status": "ok"}
