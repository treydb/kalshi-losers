import { formatDollar } from "./utils"  
export default function TradeCard({ rank, trade }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.75rem 1rem",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
      }}
    >
      <div style={{ minWidth: 0, flex: 1, paddingRight: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
          <strong>#{rank}</strong>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={trade.title || trade.ticker}
          >
            {trade.title || trade.ticker}
          </span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#666" }}>
          {trade.taker_side.toUpperCase()} @ ${formatDollar(trade.entry_price)} &times; {trade.contracts}
          {trade.title && <span style={{ marginLeft: "0.5rem", opacity: 0.7 }}>&middot; {trade.ticker}</span>}
        </div>
      </div>
      <div style={{ fontWeight: 600, color: "crimson" }}>-${formatDollar(trade.loss)}</div>
    </div>
  );
}
