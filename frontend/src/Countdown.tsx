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
        borderRadius: "var(--radius-sm)",
        border: "2px solid var(--border)",
        background: "var(--bg-elev)",
        color: "var(--text)",
        fontSize: "0.78rem",
        boxShadow: "var(--shadow-sm)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <span className="countdown__live-dot" aria-hidden />
      next refresh {seconds}s
    </span>
  );
}
