import type { Trade } from "./api";
import { formatDollar, formatContracts, formatTradeDate } from "./utils";
import goldMedalGif from "./images/gold-medal.gif";
import silverMedalGif from "./images/silver-medal.gif";
import bronzeMedalGif from "./images/bronze-medal.gif";

interface RankStyle {
  color: string;
  background: string;
  shadow: string;
}

const RANK_STYLES: Record<number, RankStyle> = {
  1: { color: "#1a1300", background: "linear-gradient(135deg, #f7d36a 0%, #c89321 100%)", shadow: "0 0 0 1px rgba(245, 196, 81, 0.4), 0 4px 16px -6px rgba(245, 196, 81, 0.5)" },
  2: { color: "#10141a", background: "linear-gradient(135deg, #e6ecf2 0%, #a4adb6 100%)", shadow: "0 0 0 1px rgba(200, 208, 216, 0.35), 0 4px 16px -6px rgba(200, 208, 216, 0.35)" },
  3: { color: "#1a0d04", background: "linear-gradient(135deg, #e3a06a 0%, #a55c25 100%)", shadow: "0 0 0 1px rgba(217, 135, 74, 0.35), 0 4px 16px -6px rgba(217, 135, 74, 0.4)" },
};

const DEFAULT_RANK_STYLE: RankStyle = {
  color: "var(--text-secondary)",
  background: "var(--bg-accent)",
  shadow: "0 0 0 1px var(--border-strong)",
};

interface TradeCardProps {
  rank: number;
  trade: Trade;
}

export default function TradeCard({ rank, trade }: TradeCardProps) {
  const rankStyle = RANK_STYLES[rank] ?? DEFAULT_RANK_STYLE;
  const sideIsYes = trade.taker_side?.toLowerCase() === "yes";
  const sideLabel = (trade.taker_side || "").toUpperCase();
  const medalClass =
    rank === 1 ? "medal-card first-place"
    : rank === 2 ? "medal-card second-place"
    : rank === 3 ? "medal-card third-place"
    : undefined;

  const headline = trade.title || trade.subtitle || trade.ticker;
  const subline = trade.subtitle && trade.subtitle !== trade.title
    ? trade.subtitle
    : null;

  const cardClass = medalClass ? `trade-card ${medalClass}` : "trade-card";

  return (
    <div
      className={cardClass}
      onMouseEnter={(e) => {
        if (!medalClass) e.currentTarget.style.background = "var(--bg-elev-hover)";
        if (!medalClass) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!medalClass) e.currentTarget.style.background = "var(--bg-elev)";
        if (!medalClass) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {rank === 1 ? (
        <img src={goldMedalGif} alt="1st place" className="trade-card__medal" />
      ) : rank === 2 ? (
        <img src={silverMedalGif} alt="2nd place" className="trade-card__medal" />
      ) : rank === 3 ? (
        <img src={bronzeMedalGif} alt="3rd place" className="trade-card__medal" />
      ) : (
        <div
          className="trade-card__rank"
          style={{
            color: rankStyle.color,
            background: rankStyle.background,
            boxShadow: rankStyle.shadow,
          }}
        >
          {rank}
        </div>
      )}

      <div className="trade-card__body">
        <div
          className="trade-card__headline"
          title={subline ? `${headline} — ${subline}` : headline}
        >
          {headline}
        </div>

        {subline && (
          <div className="trade-card__subline">{subline}</div>
        )}

        <div className="trade-card__meta">
          <span
            className={`trade-card__side ${sideIsYes ? "trade-card__side--yes" : "trade-card__side--no"}`}
            title={
              trade.subtitle
                ? `Bought ${sideLabel} on "${trade.subtitle}"`
                : `Bought ${sideLabel}`
            }
          >
            {sideLabel}
          </span>

          <span title="Contracts × entry price">
            {formatContracts(trade.contracts)} @ ${formatDollar(trade.entry_price)}
          </span>

          <span>{formatTradeDate(trade.trade_date)}</span>

          <span className="trade-card__ticker-dot" title={trade.ticker}>
            ·
          </span>
        </div>
      </div>

      <div className="trade-card__loss">
        −${formatDollar(trade.loss)}
      </div>
    </div>
  );
}
