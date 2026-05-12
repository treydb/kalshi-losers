const BASE = import.meta.env.VITE_API_URL || "/api";

export async function fetchTrades() {
  const res = await fetch(`${BASE}/trades`);
  if (!res.ok) throw new Error(`Failed to fetch trades: ${res.status}`);
  const data = await res.json();
  return data.trades ?? [];
}

export async function fetchTradesDaily() {
  const res = await fetch(`${BASE}/trades/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades daily: ${res.status}`);
  const data = await res.json();
  return data.trades ?? [];
}

export async function refreshTrades() {
  const res = await fetch(`${BASE}/refresh`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to refresh: ${res.status}`);
  const data = await res.json();
  return data.trades ?? [];
}
