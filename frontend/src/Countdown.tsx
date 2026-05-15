import { useEffect, useState } from "react";

interface CountdownProps {
  intervalMs: number;
  className?: string;
}

export default function Countdown({ intervalMs, className }: CountdownProps) {
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
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.35rem 0.75rem",
        borderRadius: "999px",
        border: "2px solid var(--border)",
        background: "var(--bg-elev)",
        color: "var(--text-muted)",
        fontSize: "0.78rem",
        boxShadow: "var(--shadow-sm)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgb(50, 150, 92)",
          boxShadow: "0 0 6px rgba(50, 150, 92, 0.5)",
        }}
      />
      next refresh {seconds}s
    </span>
  );
}
