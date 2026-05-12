import { useEffect, useState } from "react";
import { fetchTrades, fetchTradesDaily } from "./api.js";
import Leaderboard from "./Leaderboard.jsx";
import Countdown from "./Countdown.jsx";

const REFRESH_MS = 60_000;

export default function App() {
  const [trades, setTrades] = useState([]);
  const [tradesDaily, setTradesDaily] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [data, dataDaily] = await Promise.all([fetchTrades(), fetchTradesDaily()]);
      setTrades(data);
      setTradesDaily(dataDaily)
      setError(null);
    } catch (e) {
      setError(e.message);
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
        maxWidth: 760,
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
          <Leaderboard trades={tradesDaily} title="Today's Leaderboard" />
          <Leaderboard trades={trades} title="All-Time Leaderboard" />
        </>
      )}
    </div>
  );
}
