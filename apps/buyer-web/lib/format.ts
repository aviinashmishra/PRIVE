export const fmtPrice = (n: number, dp = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtUsd = (n: number, dp = 2) =>
  "$" +
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
};

export const fmtUsdCompact = (n: number) => "$" + fmtCompact(n);

export const fmtPct = (n: number, withSign = true) => {
  const s = n.toFixed(2) + "%";
  return withSign && n > 0 ? "+" + s : s;
};

export const fmtQty = (n: number, dp = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtTonnes = (n: number) => fmtCompact(n) + " t";

export const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
};

export const clsx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");
