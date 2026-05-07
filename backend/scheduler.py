from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from kalshi import get_losing_trades, update_top_ten_all_time

# Module-level state shared between the scheduler and the API.
state: dict = {"top_ten": []}

_scheduler: BackgroundScheduler | None = None


def _refresh() -> None:
    get_losing_trades()
    state["top_ten"] = update_top_ten_all_time()


def refresh_now() -> list[dict]:
    _refresh()
    return state["top_ten"]


def get_top_ten() -> list[dict]:
    return state["top_ten"]


def start() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
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
