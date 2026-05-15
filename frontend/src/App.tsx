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
    <div
      style={{
        maxWidth: 950,
        margin: "0 auto",
        padding: "3rem 1.25rem 4rem",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1rem",
          marginBottom: "1.75rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
              marginBottom: "0.4rem",
            }}
          >
            Kalshi Leaderboard
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              background: "linear-gradient(180deg, #ffffff 0%, #b8bfc8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Kalshi's  Biggest Losers
          </h1>
        </div>
        <Countdown intervalMs={REFRESH_MS} />
      </header>

      {loading && (
        <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>Loading…</p>
      )}
      {error && (
        <p
          style={{
            color: "var(--accent)",
            background: "var(--accent-soft)",
            border: "1px solid rgba(255, 77, 109, 0.3)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Error: {error}
        </p>
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
