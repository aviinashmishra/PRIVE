"use client";

import { useProjects } from "@/lib/useProjects";
import { StatCard } from "@/components/ui/StatCard";
import { fmtUsd, fmtCompact, clsx } from "@/lib/format";
import { Coins, Wallet, Receipt, TrendingUp, Loader2, Download } from "lucide-react";

const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export default function SellerRevenue() {
  const { projects, loading } = useProjects();
  const live = projects.filter((p) => p.status === "live");

  const rev = live.map((p, i) => ({ p, revenue: Math.round(p.expectedAnnual * p.price * (0.28 + ((i * 11) % 20) / 100)) }));
  const total = rev.reduce((a, r) => a + r.revenue, 0);

  // deterministic monthly series trending up
  const monthly = MONTHS.map((m, i) => {
    const base = (total / 12) * (0.5 + i / 12);
    const jitter = ((i * 37) % 40) / 100;
    return { m, v: Math.round(base * (0.8 + jitter)) };
  });
  const maxM = Math.max(...monthly.map((x) => x.v), 1);
  const thisMonth = monthly[monthly.length - 1].v;
  const avgPrice = live.length ? live.reduce((a, p) => a + p.price, 0) / live.length : 0;

  const payouts = [
    { id: "PO-2291", date: "Jul 2, 2026", amount: thisMonth * 0.4, rail: "USDT · Polygon", status: "Paid" },
    { id: "PO-2264", date: "Jun 18, 2026", amount: thisMonth * 0.55, rail: "Bank · SEPA", status: "Paid" },
    { id: "PO-2301", date: "Jul 9, 2026", amount: thisMonth * 0.6, rail: "USDT · Polygon", status: "Scheduled" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Revenue &amp; payouts</h1>
          <p className="text-sm text-ink-soft mt-1">Sales performance across your live projects.</p>
        </div>
        <button className="btn-outline"><Download className="h-4 w-4" /> Export (CSV)</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total revenue" value={fmtUsd(total)} sub="all-time realised" icon={<Coins className="h-4 w-4" />} tone="brand" />
        <StatCard label="This month" value={fmtUsd(thisMonth)} sub="+18.4% MoM" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg. sale price" value={fmtUsd(avgPrice)} sub="per tCO₂e" icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Next payout" value={fmtUsd(thisMonth * 0.6)} sub="scheduled Jul 9" icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-ink mb-6">Monthly revenue</h2>
          {loading ? (
            <div className="h-56 grid place-items-center text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="flex items-end gap-2 h-56">
              {monthly.map((x, i) => (
                <div key={x.m} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className={clsx("w-full max-w-[34px] rounded-t-lg transition-all", i === monthly.length - 1 ? "bg-brand-600" : "bg-brand-200 group-hover:bg-brand-400")}
                      style={{ height: `${(x.v / maxM) * 100}%` }}
                      title={fmtUsd(x.v)}
                    />
                  </div>
                  <span className="text-[10px] text-ink-faint">{x.m}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-4">Revenue by project</h2>
          <div className="space-y-3">
            {rev.sort((a, b) => b.revenue - a.revenue).map((r) => (
              <div key={r.p.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink truncate pr-2">{r.p.name}</span>
                  <span className="tnum font-semibold text-ink">{fmtUsd(r.revenue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(r.revenue / (rev[0]?.revenue || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="font-semibold text-ink px-6 pt-5 pb-3">Payout center</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] text-ink-faint border-y border-line">
                <th className="font-medium px-6 py-2.5">Payout ID</th>
                <th className="font-medium px-3 py-2.5">Date</th>
                <th className="font-medium px-3 py-2.5">Rail</th>
                <th className="font-medium px-3 py-2.5 text-right">Amount</th>
                <th className="font-medium px-6 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((po) => (
                <tr key={po.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5 tnum text-sm font-medium text-ink">{po.id}</td>
                  <td className="px-3 py-3.5 text-sm text-ink-soft">{po.date}</td>
                  <td className="px-3 py-3.5 text-sm text-ink-soft">{po.rail}</td>
                  <td className="px-3 py-3.5 text-right tnum text-sm font-semibold">{fmtUsd(po.amount)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={clsx("text-xs font-semibold px-2.5 py-0.5 rounded-full", po.status === "Paid" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700")}>{po.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
