export default function About() {
  return (
    <details className="about-section">
      <summary className="about-section__summary">About this site</summary>
      <div className="about-section__body">
        <p>
          <strong>Kalshi&apos;s Biggest Losers</strong> is an unofficial leaderboard of the
          largest losing trades on{" "}
          <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer">
            Kalshi
          </a>{" "}
          prediction markets &mdash; the contracts that settled on the wrong side.
        </p>
        <p>
          Every five minutes the backend checks newly settled markets, records losing
          trades, and ranks the biggest dollar losses. You&apos;ll see today&apos;s top 10
          and the all-time hall of shame, plus a breakdown of losses by market category.
        </p>
        <p className="about-section__meta">
          This page refreshes every minute. Not affiliated with Kalshi.
        </p>
      </div>
    </details>
  );
}
