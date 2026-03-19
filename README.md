# FR 재고자산 대시보드

중국 대리상(FR) 재고잔액 현황 대시보드 (MLB / MLB KIDS / DISCOVERY)

## 폴더 구조

```
FRINVT/
├── scripts/          # Snowflake 전처리 (Python)
├── backend/          # FastAPI 로컬 서버
├── frontend/         # Next.js 대시보드
└── .env.local        # Snowflake 접속 정보 (gitignore)
```

---

## 1. 데이터 전처리 (Snowflake → JSON)

### 최초 1회 설정

```powershell
cd scripts
pip install -r requirements.txt
```

### 실행 (데이터 갱신 시마다)

```powershell
# 프로젝트 루트에서 실행
python scripts/preprocess.py
```

결과물: `frontend/public/data/stock_2025.json`, `stock_2026.json`

---

## 2. 로컬 개발

### FastAPI 백엔드 (선택사항)

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Next.js 프론트엔드

```powershell
cd frontend
npm install
npm run dev
```

→ http://localhost:3000

---

## 3. Vercel 배포

1. GitHub 저장소에 push (`frontend/public/data/*.json` 포함)
2. Vercel에서 `frontend` 폴더를 루트로 프로젝트 연결
3. 자동 배포 완료

> 데이터 갱신 시: `preprocess.py` 재실행 → JSON push → Vercel 자동 재배포

---

## 브랜드 코드

| 브랜드 | brd_cd |
|--------|--------|
| MLB | M |
| MLB KIDS | I |
| DISCOVERY | X |
