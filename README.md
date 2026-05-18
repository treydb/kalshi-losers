# Kalshi's Biggest Losers

An unofficial leaderboard that surfaces the largest losing trades on [Kalshi](https://kalshi.com) prediction markets — contracts that settled on the wrong side. A FastAPI backend polls the public Kalshi API every five minutes for settled markets, records every trade that ended up on the wrong side, and serves ranked losses to a React frontend.

## Features

### Leaderboards

- **Today's top 10** — biggest dollar losses from trades settled today (bucketed by `LOCAL_TZ`, not server UTC).
- **All-time hall of shame** — top 10 losses across the full ingested history.
- **Per-board stats** — total number of losing trades and aggregate dollars lost (today vs all-time).

### Trade cards

Each ranked entry shows market title and subtitle, YES/NO side, contracts × entry price, trade date, ticker, and loss amount. Ranks 1–3 get gold, silver, and bronze medal styling; ranks 4–10 use numbered badges.

### Category breakdown

A **losing trades by category** pie chart groups all ingested losses by Kalshi market category (Politics, Sports, etc.). Categories are resolved from the Kalshi series/event API during ingest and cached in SQLite; trades without a category appear as `Unknown`.

### Live UI

- **60-second auto-refresh** — the frontend polls all endpoints every minute.
- **Countdown** — header timer shows seconds until the next refresh.
- **About** — collapsible section explaining what the site tracks and how often data updates.
- **Error resilience** — failed fetches show an error message without wiping prior data; loading and empty states are handled per section.

### Backend

- **Scheduled ingest** — APScheduler pulls newly settled markets every five minutes.
- **Normalized SQLite schema** — `markets`, `events`, and `losing_trades_raw` tables with a `losing_trades` view for queries.
- **Manual refresh** — `POST /api/refresh` forces an immediate Kalshi pull.
- **Category backfill** — `backfill_categories.py` attaches `event_ticker` and category to historical rows (run once after upgrading).

## How it works

```
Kalshi API ──► scheduler (every 5 min) ──► SQLite (trades.db) ──► FastAPI ──► React UI
                                                      │
                                              category cache (events)
```

1. `scheduler.py` triggers `kalshi.get_losing_trades()` every five minutes.
2. `kalshi.py` pages through `/markets?status=settled` (for the last ~5 minutes), fetches trades in each market, and inserts losing-side rows into `losing_trades_raw`. Market titles live in `markets`; categories are cached per `event_ticker` in `events`. The `losing_trades` view joins them for callers.
3. `stats.py` runs leaderboard queries (top 10 all-time, top 10 today, counts, total $ lost, category counts). "Today" is resolved against a pinned `LOCAL_TZ` so the bucket doesn't drift when the server runs in UTC.
4. `main.py` exposes results over `/api/*`; the React app polls every 60 seconds.

## Project layout

```
backend/
  main.py               FastAPI app + CORS + lifespan that boots the scheduler
  kalshi.py             Kalshi API client, SQLite schema, ingest + category enrichment
  stats.py              Leaderboard and aggregate queries
  scheduler.py          APScheduler job + in-memory cache for the API
  backfill_categories.py  One-time script to backfill event_ticker + category on old rows
  requirements.txt
  data/trades.db        SQLite (gitignored)
frontend/
  src/
    App.tsx             Top-level layout, polling, dashboard
    Leaderboard.tsx     Ranked list + footer stats
    TradeCard.tsx       Individual trade row (medals for top 3)
    CategoryPieChart.tsx  Conic-gradient pie + legend
    Countdown.tsx       Next-refresh timer
    About.tsx           Collapsible site description
    api.ts              Typed fetch wrappers
    utils.ts            Dollar/date formatting
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

To backfill categories on existing trade history (after upgrading):

```bash
cd backend
python backfill_categories.py
```

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
| GET    | `/api/trades/count`               | `{ "count": n }` — all-time losing trade count         |
| GET    | `/api/trades/count/daily`         | `{ "daily_count": n }`                                 |
| GET    | `/api/trades/total_loss`          | `{ "total_loss": n }` — all-time aggregate $ lost      |
| GET    | `/api/trades/total_loss/daily`    | `{ "daily_total_loss": n }`                            |
| GET    | `/api/trades/count/by_category`   | `{ "category_counts": [{ "category", "count" }, ...] }` |
| POST   | `/api/refresh`                    | Forces a Kalshi pull and returns the fresh state       |

Trade objects include `ticker`, `title`, `subtitle`, `category`, `taker_side`, `entry_price`, `contracts`, `loss`, and `trade_date`.

## Notes

- **Database is gitignored.** `trades.db` contains your own ingested trade history; treat it as runtime state, not source. Schema lives in `init_db()` and is recreated automatically.
- **Kalshi can hiccup.** A failed fetch is logged but doesn't blank the leaderboard — the API keeps serving whatever is already in the DB.
- **Lookback window.** `fetch_settled_markets` only asks for markets settled in the last ~5 minutes to match the scheduler cadence; longer downtime means trades in that gap won't be backfilled.
- **Not affiliated with Kalshi.** This is an unofficial fan project.
