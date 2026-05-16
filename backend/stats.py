#Script uses database to get various stats about losing kalshi trades.

from kalshi import connect, local_today_iso


def update_top_ten_all_time():
    with connect() as conn:
        rows = conn.execute("""
            SELECT ticker, title, subtitle, category, taker_side, entry_price, contracts, loss, trade_date
            FROM losing_trades
            ORDER BY loss DESC
            LIMIT 10
        """).fetchall()
    return [dict(row) for row in rows]

def update_top_ten_daily():
    # "Today" is resolved in Python against the pinned LOCAL_TZ rather than
    # SQLite's `DATE('now','localtime')` so the result doesn't depend on the
    # host's system timezone.
    today = local_today_iso()
    with connect() as conn:
        rows = conn.execute("""
            SELECT ticker, title, subtitle, category, taker_side, entry_price, contracts, loss, trade_date
            FROM losing_trades
            WHERE trade_date = ?
            ORDER BY loss DESC
            LIMIT 10
        """, (today,)).fetchall()
    return [dict(row) for row in rows]

def update_count():
    with connect() as conn:
        rows = conn.execute("""
            SELECT COUNT(*) FROM losing_trades
        """).fetchone()
    return rows[0]
def update_daily_count():
    today = local_today_iso()
    with connect() as conn:
        rows = conn.execute("""
            SELECT COUNT(*) FROM losing_trades
            WHERE trade_date = ?
        """, (today,)).fetchone()
    return rows[0]

def update_total_loss():
    with connect() as conn:
        row = conn.execute("""
            SELECT COALESCE(SUM(loss), 0) FROM losing_trades
        """).fetchone()
    return round(row[0], 2)

def update_daily_total_loss():
    today = local_today_iso()
    with connect() as conn:
        row = conn.execute("""
            SELECT COALESCE(SUM(loss), 0) FROM losing_trades
            WHERE trade_date = ?
        """, (today,)).fetchone()
    return round(row[0], 2)