"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import { Donut } from "@/components/ui/Donut";
import { Sparkline } from "@/components/ui/Sparkline";
import { Delta } from "@/components/ui/bits";
import { OpenOrders } from "@/components/trade/OpenOrders";
import { fmtUsd, fmtPrice, fmtQty, fmtCompact, clsx } from "@/lib/format";
import { Wallet, TrendingUp, Leaf, ArrowUpRight, Flame } from "lucide-react";

const PALETTE = ["#0E7C55", "#39AC7C", "#6FC7A0", "#B8934F", "#0A4E37", "#A6DDC4"];

export default function PortfolioPage() {
  const holdings = useStore((s) => s.holdings);
  const markets = useStore((s) => s.markets);
  const usd = useStore((s) => s.usd);
  const pv = useStore((s) => s.portfolioValue());

  const rows = holdings.map((h) => {
    const m = markets.find((x) => x.symbol === h.symbol)!;
    const value = m.price * h.qty;
    const cost = h.avgCost * h.qty;
    const pl = value - cost;
    const plPct = cost ? (pl / cost) * 100 : 0;
    return { h, m, value, cost, pl, plPct };
  }).sort((a, b) => b.value - a.value);

  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalPl = pv - totalCost;
  const totalPlPct = totalCost ? (totalPl / totalCost) * 100 : 0;
  const co2 = holdings.reduce((a, h) => a + h.qty, 0);
  const net = pv + usd;

  const donut = rows.map((r, i) => ({ label: r.h.symbol, value: r.value, color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Net worth</p>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="font-display text-3xl font-semibold text-ink tnum">{fmtUsd(net)}</h2>
            <Delta value={totalPlPct} className="text-sm" />
          </div>
        </div>
        <Link href="/markets" className="btn-primary">Add to portfolio <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Holdings value" value={fmtUsd(pv)} sub={`${holdings.length} projects`} icon={<TrendingUp className="h-4 w-4" />} tone="brand" />
        <StatCard label="Cash (USDT)" value={fmtUsd(usd)} sub="ready to deploy" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Unrealised P&L" value={<span className={totalPl >= 0 ? "text-up" : "text-down"}>{totalPl >= 0 ? "+" : ""}{fmtUsd(totalPl)}</span>} sub={<Delta value={totalPlPct} />} icon={<Flame className="h-4 w-4" />} />
        <StatCard label="CO₂ offset potential" value={`${fmtCompact(co2)} t`} sub="if fully retired" icon={<Leaf className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* allocation */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink mb-5">Allocation</h3>
          <div className="flex items-center gap-6">
            <Donut data={donut} />
            <div className="flex-1 space-y-2.5">
              {rows.map((r, i) => (
                <div key={r.h.symbol} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-sm text-ink flex-1 truncate">{r.h.symbol}</span>
                  <span className="tnum text-xs text-ink-soft">{((r.value / pv) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* holdings table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <h3 className="font-semibold text-ink px-6 pt-5 pb-3">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] text-ink-faint border-y border-line">
                  <th className="font-medium px-6 py-2.5">Asset</th>
                  <th className="font-medium px-3 py-2.5 text-right">Amount</th>
                  <th className="font-medium px-3 py-2.5 text-right">Avg cost</th>
                  <th className="font-medium px-3 py-2.5 text-right">Price</th>
                  <th className="font-medium px-3 py-2.5 text-right">Value</th>
                  <th className="font-medium px-6 py-2.5 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.h.symbol} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/trade/${r.h.symbol}`} className="group">
                        <p className="font-semibold text-ink text-sm group-hover:text-brand-700">{r.h.symbol}</p>
                        <p className="text-xs text-ink-faint">{r.m.projectType}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-right tnum text-sm">{fmtQty(r.h.qty)} t</td>
                    <td className="px-3 py-3.5 text-right tnum text-sm text-ink-soft">${fmtPrice(r.h.avgCost)}</td>
                    <td className="px-3 py-3.5 text-right tnum text-sm">${fmtPrice(r.m.price)}</td>
                    <td className="px-3 py-3.5 text-right tnum text-sm font-semibold">{fmtUsd(r.value)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <p className={clsx("tnum text-sm font-semibold", r.pl >= 0 ? "text-up" : "text-down")}>{r.pl >= 0 ? "+" : ""}{fmtUsd(r.pl)}</p>
                      <Delta value={r.plPct} className="text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OpenOrders />
    </div>
  );
}
