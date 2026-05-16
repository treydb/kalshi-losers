const BASE = import.meta.env.VITE_API_URL || "/api";

export interface Trade {
  ticker: string;
  taker_side?: string;
  title?: string;
  subtitle?: string;
  category?: string | null;
  contracts: number;
  entry_price: number;
  trade_date: string;
  loss: number;
}

interface TradesResponse {
  trades?: Trade[];
}

interface TradesCountResponse {
  count?: number;
}

interface TradesCountDailyResponse {
  daily_count?: number;
}

interface TradesTotalLossResponse {
  total_loss?: number;
}

interface TradesTotalLossDailyResponse {
  daily_total_loss?: number;
}

export async function fetchTrades(): Promise<Trade[]> {
  const res = await fetch(`${BASE}/trades`);
  if (!res.ok) throw new Error(`Failed to fetch trades: ${res.status}`);
  const data: TradesResponse = await res.json();
  return data.trades ?? [];
}

export async function fetchTradesDaily(): Promise<Trade[]> {
  const res = await fetch(`${BASE}/trades/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades daily: ${res.status}`);
  const data: TradesResponse = await res.json();
  return data.trades ?? [];
}

export async function fetchTradesCount(): Promise<number> {
  const res = await fetch(`${BASE}/trades/count`);
  if (!res.ok) throw new Error(`Failed to fetch trades count: ${res.status}`);
  const data: TradesCountResponse = await res.json();
  return data.count ?? 0;
}

export async function fetchTradesCountDaily(): Promise<number> {
  const res = await fetch(`${BASE}/trades/count/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades count daily: ${res.status}`);
  const data: TradesCountDailyResponse = await res.json();
  return data.daily_count ?? 0;
}

export async function fetchTradesTotalLoss(): Promise<number> {
  const res = await fetch(`${BASE}/trades/total_loss`);
  if (!res.ok) throw new Error(`Failed to fetch trades total loss: ${res.status}`);
  const data: TradesTotalLossResponse = await res.json();
  return data.total_loss ?? 0;
}

export async function fetchTradesTotalLossDaily(): Promise<number> {
  const res = await fetch(`${BASE}/trades/total_loss/daily`);
  if (!res.ok) throw new Error(`Failed to fetch trades total loss daily: ${res.status}`);
  const data: TradesTotalLossDailyResponse = await res.json();
  return data.daily_total_loss ?? 0;
}
