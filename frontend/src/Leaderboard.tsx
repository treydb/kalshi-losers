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
    <section className="leaderboard-section">
      <div className="leaderboard-header">
        <h2 className="leaderboard-title">{title || "Leaderboard"}</h2>
        {trades.length > 0 && (
          <span className="leaderboard-count">
            {trades.length} {trades.length === 1 ? "trade" : "trades"}
          </span>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="leaderboard-empty">
          No losing trades yet — check back after the next refresh.
        </div>
      ) : (
        <ol className="leaderboard-list">
          {trades.map((trade, i) => (
            <li key={`${trade.ticker}-${i}`}>
              <TradeCard rank={i + 1} trade={trade} />
            </li>
          ))}
        </ol>
      )}
      <div className="leaderboard-footer">
        <span className="leaderboard-stat">
          Total losing trades: {count.toLocaleString()}
        </span>
        <span className="leaderboard-stat leaderboard-stat--loss">
          Total loss: ${formatDollar(totalLoss ?? 0)}
        </span>
      </div>
    </section>
  );
}
