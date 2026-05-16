#!/usr/bin/env python3
"""One-time backfill: attach event_ticker + category to historical trades.

Run from the backend directory (with .env present):

    python backfill_categories.py

Steps:
  1. For each ticker in losing_trades_raw missing event_ticker, fetch Kalshi market metadata.
  2. Cache categories in `events` for every event_ticker still missing a category.
"""

from __future__ import annotations

import sys
import time

import requests

from kalshi import API_BASE, connect, enrich_events, init_db


def _fetch_market(ticker: str) -> dict | None:
    r = requests.get(f"{API_BASE}/markets/{ticker}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    time.sleep(0.05)
    return r.json().get("market")


def _tickers_needing_event_ticker(conn) -> list[str]:
    rows = conn.execute(
        """
        SELECT DISTINCT t.ticker
        FROM losing_trades_raw AS t
        LEFT JOIN markets AS m ON m.ticker = t.ticker
        WHERE m.ticker IS NULL OR m.event_ticker IS NULL
        ORDER BY t.ticker
        """
    ).fetchall()
    return [row["ticker"] for row in rows]


def _event_tickers_needing_category(conn) -> set[str]:
    rows = conn.execute(
        """
        SELECT DISTINCT m.event_ticker
        FROM markets AS m
        INNER JOIN losing_trades_raw AS t ON t.ticker = m.ticker
        WHERE m.event_ticker IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM events AS e
              WHERE e.event_ticker = m.event_ticker
                AND e.category IS NOT NULL
          )
        """
    ).fetchall()
    return {row["event_ticker"] for row in rows}


def _upsert_market_event_ticker(
    conn, ticker: str, event_ticker: str | None, title: str
) -> None:
    row = conn.execute(
        "SELECT ticker, title, subtitle FROM markets WHERE ticker = ?",
        (ticker,),
    ).fetchone()
    if row:
        conn.execute(
            """
            UPDATE markets
            SET event_ticker = ?, title = CASE WHEN ? != '' THEN ? ELSE title END
            WHERE ticker = ?
            """,
            (event_ticker, title, title, ticker),
        )
    else:
        conn.execute(
            """
            INSERT INTO markets (ticker, title, subtitle, event_ticker)
            VALUES (?, ?, '', ?)
            """,
            (ticker, title or "", event_ticker),
        )


def backfill_market_event_tickers(conn) -> tuple[int, int, int]:
    tickers = _tickers_needing_event_ticker(conn)
    if not tickers:
        print("All market rows already have event_ticker.")
        return 0, 0, 0

    print(f"Backfilling event_ticker for {len(tickers)} market(s)...")
    updated = 0
    skipped = 0
    failed = 0

    for i, ticker in enumerate(tickers, 1):
        try:
            market = _fetch_market(ticker)
        except requests.RequestException as e:
            print(f"  [{i}/{len(tickers)}] {ticker}: request failed — {e}")
            failed += 1
            continue

        if not market:
            print(f"  [{i}/{len(tickers)}] {ticker}: not found on Kalshi (404)")
            skipped += 1
            continue

        event_ticker = market.get("event_ticker")
        title = market.get("title") or ""
        _upsert_market_event_ticker(conn, ticker, event_ticker, title)

        if event_ticker:
            print(f"  [{i}/{len(tickers)}] {ticker} → {event_ticker}")
            updated += 1
        else:
            print(f"  [{i}/{len(tickers)}] {ticker}: market has no event_ticker")
            skipped += 1

    return updated, skipped, failed


def backfill_event_categories(conn) -> int:
    pending = _event_tickers_needing_category(conn)
    if not pending:
        print("All events already have a cached category.")
        return 0

    print(f"Fetching categories for {len(pending)} event(s)...")
    enrich_events(conn, pending)
    return len(pending)


def _print_summary(conn) -> None:
    uncategorized_trades = conn.execute(
        "SELECT COUNT(*) FROM losing_trades WHERE category IS NULL"
    ).fetchone()[0]
    total_trades = conn.execute("SELECT COUNT(*) FROM losing_trades_raw").fetchone()[0]
    missing_event_ticker = conn.execute(
        """
        SELECT COUNT(DISTINCT t.ticker)
        FROM losing_trades_raw AS t
        LEFT JOIN markets AS m ON m.ticker = t.ticker
        WHERE m.ticker IS NULL OR m.event_ticker IS NULL
        """
    ).fetchone()[0]

    print()
    print("Summary")
    print(f"  Total trades:              {total_trades}")
    print(f"  Trades without category:   {uncategorized_trades}")
    print(f"  Tickers missing event:     {missing_event_ticker}")
    if uncategorized_trades:
        by_cat = conn.execute(
            """
            SELECT COALESCE(category, 'Unknown') AS category, COUNT(*) AS n
            FROM losing_trades
            GROUP BY category
            ORDER BY n DESC
            """
        ).fetchall()
        print("  Category breakdown:")
        for row in by_cat:
            print(f"    {row['category']}: {row['n']}")


def main() -> int:
    print("Initializing database schema...")
    init_db()

    with connect() as conn:
        updated, skipped, failed = backfill_market_event_tickers(conn)
        print(
            f"\nMarkets: {updated} updated, {skipped} skipped, {failed} failed"
        )

        events_touched = backfill_event_categories(conn)
        print(f"Events: attempted category fetch for {events_touched} event(s)")

        _print_summary(conn)

    print("\nDone. Restart the API or POST /api/refresh to refresh the in-memory cache.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
