import type { CategoryCount } from "./api";

const SLICE_COLORS = [
  "#b60021",
  "#f5c451",
  "#1a5fb6",
  "#48cf80",
  "#d9874a",
  "#7b4bb7",
  "#1a2028",
  "#c8d0d8",
  "#e55f5f",
  "#2d8a6e",
];

interface CategoryPieChartProps {
  data: CategoryCount[];
}

function buildConicGradient(data: CategoryCount[], total: number): string {
  let deg = 0;
  const stops: string[] = [];

  data.forEach((item, i) => {
    const sliceDeg = (item.count / total) * 360;
    if (sliceDeg <= 0) return;
    const end = deg + sliceDeg;
    stops.push(`${SLICE_COLORS[i % SLICE_COLORS.length]} ${deg}deg ${end}deg`);
    deg = end;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <section className="category-chart-section">
        <div className="leaderboard-header">
          <h2 className="leaderboard-title">Losing Trades by Category</h2>
        </div>
        <div className="leaderboard-empty">
          No category data yet — check back after the next refresh.
        </div>
      </section>
    );
  }

  const gradient = buildConicGradient(data, total);

  return (
    <section className="category-chart-section" aria-labelledby="category-chart-title">
      <div className="leaderboard-header">
        <h2 id="category-chart-title" className="leaderboard-title">
          Losing Trades by Category
        </h2>
        <span className="leaderboard-count">{total.toLocaleString()} trades</span>
      </div>

      <div className="category-chart">
        <div
          className="category-chart__pie"
          style={{ background: gradient }}
          role="img"
          aria-label={`Pie chart of ${data.length} categories across ${total} losing trades`}
        />

        <ul className="category-chart__legend">
          {data.map((item, i) => {
            const pct = (item.count / total) * 100;
            const color = SLICE_COLORS[i % SLICE_COLORS.length];

            return (
              <li key={item.category} className="category-chart__legend-item">
                <span
                  className="category-chart__swatch"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="category-chart__label">
                  <span className="category-chart__name">{item.category}</span>
                  <span className="category-chart__meta">
                    {item.count.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
