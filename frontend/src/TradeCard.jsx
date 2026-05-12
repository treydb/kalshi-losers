import { formatDollar, formatContracts, formatTradeDate } from "./utils";
import goldMedalGif from "./images/gold-medal.gif";
import silverMedalGif from "./images/silver-medal.gif";
import bronzeMedalGif from "./images/bronze-medal.gif";

const RANK_STYLES = {
  1: { color: "#1a1300", background: "linear-gradient(135deg, #f7d36a 0%, #c89321 100%)", shadow: "0 0 0 1px rgba(245, 196, 81, 0.4), 0 4px 16px -6px rgba(245, 196, 81, 0.5)" },
  2: { color: "#10141a", background: "linear-gradient(135deg, #e6ecf2 0%, #a4adb6 100%)", shadow: "0 0 0 1px rgba(200, 208, 216, 0.35), 0 4px 16px -6px rgba(200, 208, 216, 0.35)" },
  3: { color: "#1a0d04", background: "linear-gradient(135deg, #e3a06a 0%, #a55c25 100%)", shadow: "0 0 0 1px rgba(217, 135, 74, 0.35), 0 4px 16px -6px rgba(217, 135, 74, 0.4)" },
};

const DEFAULT_RANK_STYLE = {
  color: "var(--text-muted)",
  background: "var(--bg)",
  shadow: "0 0 0 1px var(--border-strong)",
};

export default function TradeCard({ rank, trade }) {
  const rankStyle = RANK_STYLES[rank] || DEFAULT_RANK_STYLE;
  const sideIsYes = trade.taker_side?.toLowerCase() === "yes";
  const sideLabel = (trade.taker_side || "").toUpperCase();
  const medalClass =
    rank === 1 ? "medal-card first-place"
    : rank === 2 ? "medal-card second-place"
    : rank === 3 ? "medal-card third-place"
    : undefined;

  // The `subtitle` (yes_sub_title) is the side-specific name for the market —
  // typically a team like "Yankees" or "Orioles". We lead with it so two
  // sibling markets that share a `title` (e.g. "...vs Baltimore Winner?")
  // don't look like duplicates.
  const headline = trade.subtitle || trade.title || trade.ticker;
  const subline = trade.subtitle && trade.title && trade.subtitle !== trade.title
    ? trade.title
    : null;

  return (
    <div
      className={medalClass}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0.8rem",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-elev-hover)";
        if (!medalClass) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-elev)";
        if (!medalClass) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {rank === 1 ? (
        <img src={goldMedalGif} alt="1st place" style={medalImgStyle} />
      ) : rank === 2 ? (
        <img src={silverMedalGif} alt="2nd place" style={medalImgStyle} />
      ) : rank === 3 ? (
        <img src={bronzeMedalGif} alt="3rd place" style={medalImgStyle} />
      ) : (
        <div
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.72rem",
            borderRadius: "999px",
            color: rankStyle.color,
            background: rankStyle.background,
            boxShadow: rankStyle.shadow,
          }}
        >
          {rank}
        </div>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.92rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--text)",
            lineHeight: 1.25,
          }}
          title={subline ? `${headline} — ${subline}` : headline}
        >
          {headline}
        </div>

        {subline && (
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-faint)",
              marginTop: "0.1rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subline}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.35rem",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              padding: "0.1rem 0.5rem",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              color: sideIsYes ? "#7ee2a8" : "#ff8aa1",
              background: sideIsYes ? "rgba(80, 200, 130, 0.12)" : "rgba(255, 77, 109, 0.12)",
              border: `1px solid ${sideIsYes ? "rgba(80, 200, 130, 0.3)" : "rgba(255, 77, 109, 0.3)"}`,
            }}
            title={
              trade.subtitle
                ? `Bought ${sideLabel}`
                : `Bought ${sideLabel} on "${trade.subtitle}"`
            }
          >
            {sideLabel}
          </span>

          <span title="Contracts × entry price">
            {formatContracts(trade.contracts)} @ ${formatDollar(trade.entry_price)}
          </span>

          <span>{formatTradeDate(trade.trade_date)}</span>

          <span
            title={trade.ticker}
            style={{
              color: "var(--text-faint)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.7rem",
              cursor: "help",
            }}
          >
            ·
          </span>
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          fontWeight: 700,
          fontSize: "0.95rem",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "var(--accent)",
          letterSpacing: "-0.01em",
        }}
      >
        −${formatDollar(trade.loss)}
      </div>
    </div>
  );
}

const medalImgStyle = {
  flexShrink: 0,
  width: 32,
  height: 32,
  objectFit: "contain",
};
