#Script uses database to get various stats about losing kalshi trades.

from kalshi import connect


def update_top_ten_all_time():
    with connect() as conn:
        rows = conn.execute("""
            SELECT ticker, title, subtitle, taker_side, entry_price, contracts, loss, trade_date
            FROM losing_trades
            ORDER BY loss DESC
            LIMIT 10
        """).fetchall()
    return [dict(row) for row in rows]

def update_top_ten_daily():
    with connect() as conn:
        rows = conn.execute("""
            SELECT ticker, title, subtitle, taker_side, entry_price, contracts, loss, trade_date
            FROM losing_trades
            WHERE trade_date = DATE('now', 'localtime')
            ORDER BY loss DESC
            LIMIT 10
        """).fetchall()
    return [dict(row) for row in rows]
