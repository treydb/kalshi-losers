export function formatDollar(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatContracts(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount ?? "");
  // Kalshi `count_fp` can be fractional but is usually integer-ish; trim
  // trailing zeros so 17301.94 renders as "17,301.94" but 8022 stays "8,022".
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatTradeDate(isoDate) {
  if (!isoDate) return "";
  // `trade_date` is already a local YYYY-MM-DD string from the backend, so
  // parse the parts directly to avoid the browser interpreting it as UTC.
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
