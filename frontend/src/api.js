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

export async function fetchTradesCount() {
  const res = await fetch(`${BASE}/trades/count`);
  if (!res.ok) throw new Error(`Failed to fetch trades count: ${res.status}`);
  const data = await res.json();
  return data.count ?? 0;
}
export async function fetchTradesCountDaily() {
  const res = await fetch(`${BASE}/trades/count/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades count daily: ${res.status}`);
  const data = await res.json();
  return data.daily_count ?? 0;
}
export async function fetchTradesTotalLoss() {
  const res = await fetch(`${BASE}/trades/total_loss`);
  if (!res.ok) throw new Error(`Failed to fetch trades total loss: ${res.status}`);
  const data = await res.json();
  return data.total_loss ?? 0;
}
export async function fetchTradesTotalLossDaily() {
  const res = await fetch(`${BASE}/trades/total_loss/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades total loss daily: ${res.status}`);
  const data = await res.json();
  return data.daily_total_loss ?? 0;
}