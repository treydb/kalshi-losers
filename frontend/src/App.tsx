import { useEffect, useState } from "react";
import * as api from "./api";
import type { Trade } from "./api";
import Leaderboard from "./Leaderboard";
import Countdown from "./Countdown";

const REFRESH_MS = 60_000;

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesDaily, setTradesDaily] = useState<Trade[]>([]);
  const [count, setCount] = useState(0);
  const [countDaily, setCountDaily] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0.0);
  const [totalLossDaily, setTotalLossDaily] = useState(0.0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [data, dataDaily, tradesCount, tradesCountDaily, totalLoss, totalLossDaily] = await Promise.all([
        api.fetchTrades(),
        api.fetchTradesDaily(),
        api.fetchTradesCount(),
        api.fetchTradesCountDaily(),
        api.fetchTradesTotalLoss(),
        api.fetchTradesTotalLossDaily(),
      ]);
      setTrades(data);
      setTradesDaily(dataDaily);
      setCount(tradesCount);
      setCountDaily(tradesCountDaily);
      setTotalLoss(totalLoss);
      setTotalLossDaily(totalLossDaily);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__title">
          <div className="app-eyebrow">Kalshi Leaderboard</div>
          <h1 className="page-title">Kalshi's Biggest <br />Losers</h1>
        </div>
        <Countdown intervalMs={REFRESH_MS} className="app-header__countdown" />
      </header>

      {loading && (
        <p className="app-message app-message--loading">Loading…</p>
      )}
      {error && (
        <p className="app-message app-message--error">Error: {error}</p>
      )}
      {!loading && !error && (
        <>
          <Leaderboard trades={tradesDaily} count={countDaily} totalLoss={totalLossDaily} title="Today's Leaderboard" />
          <Leaderboard trades={trades} count={count} totalLoss={totalLoss} title="All-Time Leaderboard" />
        </>
      )}
    </div>
  );
}
