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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
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


@app.post("/api/refresh")
def refresh():
    return scheduler.refresh_now()
