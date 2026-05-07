import { useEffect, useState } from "react";

export default function Countdown({ intervalMs }) {
  const [remaining, setRemaining] = useState(intervalMs);

  useEffect(() => {
    setRemaining(intervalMs);
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1000 ? intervalMs : r - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [intervalMs]);

  const seconds = Math.ceil(remaining / 1000);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.3rem 0.7rem",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        background: "var(--bg-elev)",
        color: "var(--text-muted)",
        fontSize: "0.78rem",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#5fcf8a",
          boxShadow: "0 0 8px rgba(95, 207, 138, 0.7)",
        }}
      />
      next refresh {seconds}s
    </span>
  );
}
