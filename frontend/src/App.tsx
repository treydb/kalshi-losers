import { useEffect, useState } from "react";
import * as api from "./api";
import type { Trade, CategoryCount } from "./api";
import Leaderboard from "./Leaderboard";
import CategoryPieChart from "./CategoryPieChart";
import Countdown from "./Countdown";
import About from "./About";

const REFRESH_MS = 60_000;

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesDaily, setTradesDaily] = useState<Trade[]>([]);
  const [count, setCount] = useState(0);
  const [countDaily, setCountDaily] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0.0);
  const [totalLossDaily, setTotalLossDaily] = useState(0.0);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [
        data,
        dataDaily,
        tradesCount,
        tradesCountDaily,
        totalLoss,
        totalLossDaily,
        categories,
      ] = await Promise.all([
        api.fetchTrades(),
        api.fetchTradesDaily(),
        api.fetchTradesCount(),
        api.fetchTradesCountDaily(),
        api.fetchTradesTotalLoss(),
        api.fetchTradesTotalLossDaily(),
        api.fetchCategoryCounts(),
      ]);
      setTrades(data);
      setTradesDaily(dataDaily);
      setCount(tradesCount);
      setCountDaily(tradesCountDaily);
      setTotalLoss(totalLoss);
      setTotalLossDaily(totalLossDaily);
      setCategoryCounts(categories);
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

      <About />

      {loading && (
        <p className="app-message app-message--loading">Loading…</p>
      )}
      {error && (
        <p className="app-message app-message--error">Error: {error}</p>
      )}
      {!loading && !error && (
        <div className="dashboard">
          <div className="dashboard__leaderboards">
            <Leaderboard trades={tradesDaily} count={countDaily} totalLoss={totalLossDaily} title="Today's Leaderboard" />
            <Leaderboard trades={trades} count={count} totalLoss={totalLoss} title="All-Time Leaderboard" />
          </div>
          <CategoryPieChart data={categoryCounts} />
        </div>
      )}
    </div>
  );
}
