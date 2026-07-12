"use client";

import { useSellerSummary } from "@/lib/useSellerSummary";
import { StatCard } from "@/components/ui/StatCard";
import { fmtUsd, clsx } from "@/lib/format";
import { Coins, Wallet, Receipt, TrendingUp, Loader2, Download } from "lucide-react";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
}

export default function SellerRevenue() {
  const { summary, loading } = useSellerSummary();
  const batches = summary?.batches ?? [];
  const t = summary?.totals;
  const monthly = summary?.monthly ?? [];

  const gross = t?.grossRevenue ?? 0;
  const net = t?.netRevenue ?? 0;
  const fee = t?.fee ?? 0;
  const maxM = Math.max(...monthly.map((x) => x.notional), 1);
  const thisMonth = monthly.length ? monthly[monthly.length - 1].notional : 0;
  const avgPrice = (t?.soldQty ?? 0) > 0 ? gross / (t!.soldQty || 1) : 0;
  const byProject = [...batches].sort((a, b) => b.soldNotional - a.soldNotional);

  function exportCsv() {
    const rows = [
      ["token_id", "project", "sold_qty_t", "gross_usd", "price_usd"],
      ...batches.map((b) => [b.tokenId, b.name, b.soldQty, b.soldNotional.toFixed(2), b.price.toFixed(2)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prive-revenue.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Revenue &amp; payouts</h1>
          <p className="text-sm text-ink-soft mt-1">
            Live sales performance from the exchange ledger — filled buy orders on your pairs.
          </p>
        </div>
        <button onClick={exportCsv} className="btn-outline"><Download className="h-4 w-4" /> Export (CSV)</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross sales" value={fmtUsd(gross)} sub="all-time on-platform" icon={<Coins className="h-4 w-4" />} tone="brand" />
        <StatCard label="This month" value={fmtUsd(thisMonth)} sub="filled order notional" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg. sale price" value={fmtUsd(avgPrice)} sub="per tCO₂e sold" icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Net after fees" value={fmtUsd(net)} sub={`platform fee ${fmtUsd(fee)} (2.5%)`} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-ink mb-6">Monthly sales (ledger)</h2>
          {loading ? (
            <div className="h-56 grid place-items-center text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : monthly.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-ink-faint">
              No filled orders on your pairs yet — sales will chart here as buyers trade.
            </div>
          ) : (
            <div className="flex items-end gap-2 h-56">
              {monthly.map((x, i) => (
                <div key={x.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className={clsx("w-full max-w-[44px] rounded-t-lg transition-all", i === monthly.length - 1 ? "bg-brand-600" : "bg-brand-200 group-hover:bg-brand-400")}
                      style={{ height: `${Math.max((x.notional / maxM) * 100, 2)}%` }}
                      title={`${fmtUsd(x.notional)} · ${x.qty} t`}
                    />
                  </div>
                  <span className="text-[10px] text-ink-faint">{monthLabel(x.month)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-4">Revenue by project</h2>
          {byProject.length === 0 && !loading && (
            <p className="text-sm text-ink-faint">No live batches yet.</p>
          )}
          <div className="space-y-3">
            {byProject.map((b) => (
              <div key={b.tokenId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink truncate pr-2">{b.name}</span>
                  <span className="tnum font-semibold text-ink">{fmtUsd(b.soldNotional)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${(b.soldNotional / (byProject[0]?.soldNotional || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-ink mb-1.5">Payout center</h2>
        <p className="text-sm text-ink-soft mb-4">
          Net proceeds settle to your account wallet after the 2.5% platform fee. Fiat rails and
          scheduled payouts arrive with the payments integration (docs/06).
        </p>
        <div className="rounded-2xl border border-line bg-mist/60 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-faint">Available to withdraw</p>
            <p className="font-display text-2xl font-semibold text-ink tnum">{fmtUsd(net)}</p>
          </div>
          <span className="chip">USDT · Polygon</span>
        </div>
      </div>
    </div>
  );
}
