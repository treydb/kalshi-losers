from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from kalshi import get_losing_trades
from stats import update_top_ten_all_time, update_top_ten_daily

# Module-level state shared between the scheduler and the API.
state: dict = {"top_ten": [],
               "top_ten_daily": []}

_scheduler: BackgroundScheduler | None = None


def _refresh() -> None:
    try:
        get_losing_trades()
    except Exception as e:
        # Kalshi can hiccup (connection resets, timeouts). Don't let a fetch
        # failure prevent the leaderboard from reflecting whatever is in the DB.
        print(f"Kalshi refresh failed: {e}")
    state["top_ten"] = update_top_ten_all_time()
    state["top_ten_daily"] = update_top_ten_daily()


def refresh_now() -> list[dict]:
    _refresh()
    return {
        "top_ten": state["top_ten"],
        "top_ten_daily": state["top_ten_daily"]
    }

def get_top_ten() -> list[dict]:
    return state["top_ten"]
def get_top_ten_daily() -> list[dict]:
    return state["top_ten_daily"]


def start() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    # Hydrate from the DB immediately so the leaderboard is populated before
    # the first Kalshi refresh completes (or even if it never does).
    state["top_ten"] = update_top_ten_all_time()
    state["top_ten_daily"] = update_top_ten_daily()
    _scheduler = BackgroundScheduler()
    # Runs once at startup, then every 5 minutes to match Kalshi's lookback window.
    _scheduler.add_job(_refresh, "interval", minutes=5, next_run_time=datetime.now())
    _scheduler.start()
    return _scheduler


def stop() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
