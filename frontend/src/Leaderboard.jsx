import TradeCard from "./TradeCard.jsx";

export default function Leaderboard({ trades }) {
  if (!trades.length) {
    return (
      <div
        style={{
          padding: "3rem 1rem",
          textAlign: "center",
          color: "var(--text-muted)",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        No losing trades yet — check back after the next refresh.
      </div>
    );
  }

  return (
    <div>
      <h2>All-Time Leaderboard</h2>
      <ol style={{ display: "grid", gap: "0.6rem" }}>
        {trades.map((trade, i) => (
          <li key={`${trade.ticker}-${i}`}>
            <TradeCard rank={i + 1} trade={trade} />
          </li>
        ))}
      </ol>
    </div>
  );
}
