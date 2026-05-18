# Kalshi's Biggest Losers

**Live site:** [losers.thisisgambling.uk](https://losers.thisisgambling.uk)

Unofficial leaderboard of the largest losing trades on [Kalshi](https://kalshi.com) prediction markets. A FastAPI backend polls settled markets every five minutes, stores losing-side trades in SQLite, and serves ranked losses to a React frontend (60s UI refresh).

## Stack

| Backend (Python 3.11+)            | Frontend (Node 18+)          |
| --------------------------------- | ---------------------------- |
| FastAPI + Uvicorn                 | React 18 + TypeScript + Vite |
| APScheduler (5 min ingest)        | Plain CSS, native `fetch`    |
| SQLite — `backend/data/trades.db` | Dev proxy: `/api` → `:8000`  |

```
Kalshi API → scheduler → SQLite → FastAPI (:8000) → React (:5173)
```

Modules: `main.py` (routes, CORS), `kalshi.py` (ingest, schema), `stats.py` (queries), `scheduler.py` (job + in-memory cache). No Kalshi API key — public market data only.

## Features

- **Leaderboards** — Top 10 daily and all-time losses (`LOCAL_TZ`, not UTC), with trade counts and total $ lost per board.
- **Trade cards** — Rank, title, subtitle, YES/NO, size, date, loss; top 3 get medal styling.
- **Category pie chart** — Losses by Kalshi category (cached at ingest).
- **Live UI** — 60s polling, refresh countdown, collapsible About, errors without wiping cached data.
- **Manual refresh** — `POST /api/refresh`

## Local setup

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Optional `backend/.env`:

```env
LOCAL_TZ=America/Denver
FRONTEND_URL=http://localhost:5173
```

```bash
uvicorn main:app --reload
```

SQLite is created at `backend/data/trades.db` on first run.

**Frontend**

```bash
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. Set `VITE_API_URL` if the API is not proxied at `/api`.

## API

| Method | Path                            | Returns                        |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/health`                   | `{ "status": "ok" }`           |
| GET    | `/api/trades`                   | Top 10 all-time losses         |
| GET    | `/api/trades/daily`             | Top 10 today (`LOCAL_TZ`)      |
| GET    | `/api/trades/count`             | All-time losing trade count    |
| GET    | `/api/trades/count/daily`       | Today's count                  |
| GET    | `/api/trades/total_loss`        | All-time aggregate $ lost      |
| GET    | `/api/trades/total_loss/daily`  | Today's aggregate $ lost       |
| GET    | `/api/trades/count/by_category` | `{ "category_counts": [...] }` |
| POST   | `/api/refresh`                  | Force Kalshi ingest            |

Trade fields: `ticker`, `title`, `subtitle`, `category`, `taker_side`, `entry_price`, `contracts`, `loss`, `trade_date`.

## Notes

- **`trades.db` is gitignored** — runtime state; schema from `init_db()`.
- **Kalshi outages** — failed fetches are logged; the API keeps serving cached DB data.
- **Lookback** — ingest only checks markets settled in the last ~5 minutes; longer downtime can miss trades in the gap.
- **Not affiliated with Kalshi.**
