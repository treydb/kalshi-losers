#This script is used to fetch the losing trades from the Kalshi API and save them to a database.

import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = "https://api.elections.kalshi.com/trade-api/v2"
KEY_ID = os.getenv("key_ID")

if not KEY_ID:
    raise RuntimeError("Missing key_ID in backend/.env")

# Hard-pinned so the "today" bucket doesn't drift when the backend runs on a
# host whose system TZ is UTC (which silently re-introduces the off-by-one-day
# bug for late-evening trades). Override via the LOCAL_TZ env var if needed.
LOCAL_TZ = ZoneInfo(os.getenv("LOCAL_TZ", "America/Denver"))

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "trades.db"


def _local_trade_date(created_iso: str) -> str:
    """Return the local-date (YYYY-MM-DD) for a Kalshi UTC `created_time`.

    Kalshi sends ISO-8601 UTC strings like "2026-05-12T01:15:00Z". We convert
    to `LOCAL_TZ` so the daily leaderboard matches the user's intuitive
    "today" instead of the UTC day, regardless of where the backend is hosted.
    """
    if not created_iso:
        return ""
    try:
        utc_dt = datetime.fromisoformat(created_iso.replace("Z", "+00:00"))
    except ValueError:
        return ""
    return utc_dt.astimezone(LOCAL_TZ).date().isoformat()


def local_today_iso() -> str:
    """Today's date (YYYY-MM-DD) in `LOCAL_TZ`."""
    return datetime.now(LOCAL_TZ).date().isoformat()


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _ensure_indexes(conn):
    # Backs `ORDER BY loss DESC LIMIT 10` and `WHERE trade_date = ? ORDER BY loss DESC`.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_losing_trades_raw_loss "
        "ON losing_trades_raw(loss DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_losing_trades_raw_date_loss "
        "ON losing_trades_raw(trade_date, loss DESC)"
    )


def init_db():
    """Create / migrate the schema.

    Storage layout:
      - `markets`           : one row per ticker holding title/subtitle (was
                              previously duplicated on every trade row, ~59
                              bytes * N trades of pure duplication).
      - `losing_trades_raw` : the actual append-only trade rows, without the
                              denormalized text columns.
      - `losing_trades`     : a VIEW that joins the two and exposes the exact
                              same column shape the rest of the app
                              (`stats.py`) already queries. This keeps the
                              normalization invisible to callers.
    """
    migrated = False
    with connect() as conn:
        existing = conn.execute(
            "SELECT type FROM sqlite_master WHERE name = 'losing_trades'"
        ).fetchone()
        existing_type = existing["type"] if existing else None

        conn.execute("""
            CREATE TABLE IF NOT EXISTS markets (
                ticker TEXT PRIMARY KEY,
                title TEXT,
                subtitle TEXT
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS losing_trades_raw (
                trade_id TEXT PRIMARY KEY,
                ticker TEXT NOT NULL,
                taker_side TEXT NOT NULL,
                entry_price REAL NOT NULL,
                contracts REAL NOT NULL,
                loss REAL NOT NULL,
                trade_date TEXT NOT NULL
            )
        """)

        if existing_type == "table":
            # Legacy schema: copy data out, then drop the wide table.
            legacy_cols = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(losing_trades)")
            }
            title_expr = "title" if "title" in legacy_cols else "NULL"
            subtitle_expr = "subtitle" if "subtitle" in legacy_cols else "NULL"

            # Per ticker we pick the longest non-empty text we've ever seen,
            # which is robust against rows that were inserted before the
            # title/subtitle columns existed (those are NULL).
            conn.execute(f"""
                INSERT OR IGNORE INTO markets (ticker, title, subtitle)
                SELECT
                    ticker,
                    COALESCE(MAX(NULLIF({title_expr}, '')), ''),
                    COALESCE(MAX(NULLIF({subtitle_expr}, '')), '')
                FROM losing_trades
                GROUP BY ticker
            """)

            conn.execute("""
                INSERT OR IGNORE INTO losing_trades_raw
                    (trade_id, ticker, taker_side, entry_price, contracts, loss, trade_date)
                SELECT trade_id, ticker, taker_side, entry_price, contracts, loss, trade_date
                FROM losing_trades
            """)

            conn.execute("DROP TABLE losing_trades")
            migrated = True

        # LEFT JOIN so a missing markets row never silently drops a trade.
        conn.execute("""
            CREATE VIEW IF NOT EXISTS losing_trades AS
            SELECT
                t.trade_id,
                t.ticker,
                m.title,
                m.subtitle,
                t.taker_side,
                t.entry_price,
                t.contracts,
                t.loss,
                t.trade_date
            FROM losing_trades_raw AS t
            LEFT JOIN markets AS m ON m.ticker = t.ticker
        """)

        _ensure_indexes(conn)

    # VACUUM rewrites the file to release the space the dropped table held.
    # It cannot run inside a transaction, hence the separate connection.
    if migrated:
        vac = sqlite3.connect(DB_PATH)
        try:
            vac.execute("VACUUM")
        finally:
            vac.close()


def fetch_settled_markets():
    ts = int(time.time()) - 5 * 60
    all_markets = []
    cursor = None

    while True:
        params = {
            "status": "settled",
            "min_settled_ts": ts,
            "mve_filter": "exclude",
            "limit": 1000,
        }
        if cursor:
            params["cursor"] = cursor

        r = requests.get(f"{API_BASE}/markets", params=params)
        r.raise_for_status()
        time.sleep(0.05)
        data = r.json()
        all_markets.extend(data.get("markets", []))
        cursor = data.get("cursor")
        if not cursor:
            break

    return all_markets


def _fetch_market_trades(ticker):
    trades = []
    cursor = None
    while True:
        params = {"ticker": ticker, "limit": 1000}
        if cursor:
            params["cursor"] = cursor
        r = requests.get(f"{API_BASE}/markets/trades", params=params)
        r.raise_for_status()
        time.sleep(0.05)
        data = r.json()
        trades.extend(data.get("trades", []))
        cursor = data.get("cursor")
        if not cursor:
            break
    return trades


def save_losing_trades(markets):
    with connect() as conn:
        for market in markets:
            ticker = market["ticker"]
            result = market.get("result")
            if not result:
                continue

            # `title` is the broad event question (e.g. "New York Y vs Baltimore Winner?").
            # `subtitle` (yes_sub_title) names the specific sibling market — usually the team
            # the YES side is betting on. Keeping them separate lets the UI disambiguate
            # otherwise-identical-looking sibling markets.
            title = market.get("title") or ""
            losing_side = "no" if result == "yes" else "yes"
            subtitle = (market.get(f"{losing_side}_sub_title") or "")

            # One row per ticker in `markets`; the title/subtitle are no longer
            # duplicated on every trade row. INSERT OR REPLACE keeps the entry
            # in sync if Kalshi ever revises the text.
            conn.execute(
                "INSERT OR REPLACE INTO markets (ticker, title, subtitle) VALUES (?, ?, ?)",
                (ticker, title, subtitle),
            )

            for trade in _fetch_market_trades(ticker):
                if trade["taker_side"] == result:
                    continue
                yes_price = float(trade["yes_price_dollars"])
                no_price = float(trade["no_price_dollars"])
                contracts = float(trade["count_fp"])
                entry_price = yes_price if trade["taker_side"] == "yes" else no_price
                loss = round(entry_price * contracts, 2)
                trade_date = _local_trade_date(trade.get("created_time", ""))

                conn.execute(
                    """
                    INSERT OR IGNORE INTO losing_trades_raw
                        (trade_id, ticker, taker_side, entry_price, contracts, loss, trade_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        trade["trade_id"],
                        ticker,
                        trade["taker_side"],
                        entry_price,
                        contracts,
                        loss,
                        trade_date,
                    ),
                )


def get_losing_trades():
    print("Fetching settled markets...")
    markets = fetch_settled_markets()
    print(f"Found {len(markets)} settled markets")
    print("Finding losing trades...")
    save_losing_trades(markets)