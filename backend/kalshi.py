#This script is used to fetch the losing trades from the Kalshi API and save them to a database.

import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = "https://api.elections.kalshi.com/trade-api/v2"
KEY_ID = os.getenv("key_ID")

if not KEY_ID:
    raise RuntimeError("Missing key_ID in backend/.env")

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "trades.db"


def _local_trade_date(created_iso: str) -> str:
    """Return the local-date (YYYY-MM-DD) for a Kalshi UTC `created_time`.

    Kalshi sends ISO-8601 UTC strings like "2026-05-12T01:15:00Z". We convert
    to the server's local timezone so the daily leaderboard matches the user's
    intuitive "today" instead of the UTC day.
    """
    if not created_iso:
        return ""
    try:
        utc_dt = datetime.fromisoformat(created_iso.replace("Z", "+00:00"))
    except ValueError:
        return ""
    return utc_dt.astimezone().date().isoformat()


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS losing_trades (
                trade_id TEXT PRIMARY KEY,
                ticker TEXT NOT NULL,
                title TEXT,
                subtitle TEXT,
                taker_side TEXT NOT NULL,
                entry_price REAL NOT NULL,
                contracts REAL NOT NULL,
                loss REAL NOT NULL,
                trade_date TEXT NOT NULL
            )
        """)
        # Additive migrations for DBs created before newer columns existed.
        existing = {row["name"] for row in conn.execute("PRAGMA table_info(losing_trades)")}
        if "title" not in existing:
            conn.execute("ALTER TABLE losing_trades ADD COLUMN title TEXT")
        if "subtitle" not in existing:
            conn.execute("ALTER TABLE losing_trades ADD COLUMN subtitle TEXT")


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
            subtitle = market.get("yes_sub_title") or ""
            if not title:
                title = subtitle

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
                    INSERT OR IGNORE INTO losing_trades
                        (trade_id, ticker, title, subtitle, taker_side, entry_price, contracts, loss, trade_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        trade["trade_id"],
                        ticker,
                        title,
                        subtitle,
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