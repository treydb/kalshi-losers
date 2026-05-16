from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kalshi import init_db
import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()
    try:
        yield
    finally:
        scheduler.stop()


app = FastAPI(title="Biggest Losers API", lifespan=lifespan)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in [frontend_url] if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/trades")
def trades():
    return {"trades": scheduler.get_top_ten()}

@app.get("/api/trades/daily")
def trades_daily():
    return {"trades": scheduler.get_top_ten_daily()}
@app.get("/api/trades/count")
def trades_count():
    return {"count": scheduler.get_count()}
@app.get("/api/trades/count/daily")
def trades_daily_count():
    return {"daily_count": scheduler.get_daily_count()}
@app.get("/api/trades/total_loss")
def trades_total_loss():
    return {"total_loss": scheduler.get_total_loss()}
@app.get("/api/trades/total_loss/daily")
def trades_daily_total_loss():
    return {"daily_total_loss": scheduler.get_daily_total_loss()}

@app.get("/api/trades/count/by_category")
def trades_count_by_category():
    return {"category_counts": scheduler.get_category_counts()}

@app.post("/api/refresh")
def refresh():
    return scheduler.refresh_now()
