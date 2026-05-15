import TradeCard from "./TradeCard";
import type { Trade } from "./api";
import { formatDollar } from "./utils";

interface LeaderboardProps {
  trades: Trade[];
  count: number;
  totalLoss: number;
  title?: string;
}

export default function Leaderboard({ trades, count, totalLoss, title }: LeaderboardProps) {
  return (
    <section
      style={{
        marginTop: "2rem",
        padding: "1rem 1rem 1.1rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {title || "Leaderboard"}
        </h2>
        {trades.length > 0 && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-faint)",
            }}
          >
            {trades.length} {trades.length === 1 ? "trade" : "trades"}
          </span>
        )}
      </div>

      {trades.length === 0 ? (
        <div
          style={{
            padding: "1.5rem 1rem",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          No losing trades yet — check back after the next refresh.
        </div>
      ) : (
        <ol style={{ 
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: ".4rem", 
          margin: 0, 
          padding: 0, 
          listStyle: "none", 
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          {trades.map((trade, i) => (
            <li key={`${trade.ticker}-${i}`}>
              <TradeCard rank={i + 1} trade={trade} />
            </li>
          ))}
        </ol>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-faint)",
            marginTop: "0.5rem",
          }}
        >
          Total losing trades: {count.toLocaleString()}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-faint)",
            marginTop: "0.5rem",
          }}
        >
          Total loss: ${formatDollar(totalLoss ?? 0)}
        </span>
      </div>
    </section>
  );
}
