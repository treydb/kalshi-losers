# Kalshi's Biggest Losers

A leaderboard that surfaces the largest losing trades on [Kalshi](https://kalshi.com). A FastAPI backend polls the public Kalshi API every five minutes for settled markets, records every trade that ended up on the wrong side, and serves the top losses (all-time and today) to a React frontend.

## How it works

```
Kalshi API ──► scheduler (every 5 min) ──► SQLite (trades.db) ──► FastAPI ──► React UI
```

1. `scheduler.py` triggers `kalshi.get_losing_trades()` every five minutes.
2. `kalshi.py` pages through `/markets?status=settled` (for the last ~5 minutes), then fetches every trade in each market and inserts the ones on the losing side into `losing_trades_raw`. Market titles are deduplicated into a `markets` table; a `losing_trades` view rejoins them for callers.
3. `stats.py` runs the leaderboard queries (top 10 all-time, top 10 today, counts, total $ lost). "Today" is resolved against a pinned `LOCAL_TZ` so the bucket doesn't drift when the server runs in UTC.
4. `main.py` exposes the results over `/api/*` and the React app polls every 60 seconds.

## Project layout

```
backend/
  main.py          FastAPI app + CORS + lifespan that boots the scheduler
  kalshi.py        Kalshi API client, SQLite schema, ingest pipeline
  stats.py         Leaderboard queries
  scheduler.py     APScheduler job + in-memory cache for the API
  requirements.txt
  data/trades.db   SQLite (gitignored)
frontend/
  src/
    App.jsx        Top-level layout, polling, error state
    Leaderboard.jsx, TradeCard.jsx, Countdown.jsx
    api.js         Thin fetch wrappers around the backend
  package.json
```

## Requirements

- Python 3.11+ (uses `zoneinfo`)
- Node 18+

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
key_ID=your_kalshi_key_id
# Optional — defaults to America/Denver
LOCAL_TZ=America/Denver
# Optional — defaults to http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Run the API:

```bash
uvicorn main:app --reload
```

The SQLite file is created automatically at `backend/data/trades.db` on first startup. If you're upgrading from the old denormalized schema, `init_db()` migrates and VACUUMs in place.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. Override the backend URL with `VITE_API_URL` if it isn't behind a proxy at `/api`.

## API

| Method | Path                              | Returns                                                |
| ------ | --------------------------------- | ------------------------------------------------------ |
| GET    | `/api/health`                     | `{ "status": "ok" }`                                   |
| GET    | `/api/trades`                     | `{ "trades": [...] }` — top 10 losses all-time         |
| GET    | `/api/trades/daily`               | `{ "trades": [...] }` — top 10 losses today (LOCAL_TZ) |
| GET    | `/api/trades/count`               | `{ "count": n }`                                       |
| GET    | `/api/trades/count/daily`         | `{ "daily_count": n }`                                 |
| GET    | `/api/trades/total_loss`          | `{ "total_loss": n }`                                  |
| GET    | `/api/trades/total_loss/daily`    | `{ "daily_total_loss": n }`                            |
| POST   | `/api/refresh`                    | Forces a Kalshi pull and returns the fresh state       |

## Notes

- **Database is gitignored.** `trades.db` contains your own ingested trade history; treat it as runtime state, not source. Schema lives in `init_db()` and is recreated automatically.
- **Kalshi can hiccup.** A failed fetch is logged but doesn't blank the leaderboard — the API keeps serving whatever is already in the DB.
- **Lookback window.** `fetch_settled_markets` only asks for markets settled in the last ~5 minutes to match the scheduler cadence; longer downtime means trades in that gap won't be backfilled.
