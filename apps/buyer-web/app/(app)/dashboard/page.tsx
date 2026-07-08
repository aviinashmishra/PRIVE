"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Delta, TypePill, LiveDot } from "@/components/ui/bits";
import { fmtUsd, fmtPrice, fmtCompact, fmtQty, timeAgo, clsx } from "@/lib/format";
import { Wallet, Leaf, TrendingUp, Pickaxe, ArrowUpRight, ArrowRight, Flame } from "lucide-react";

export default function Dashboard() {
  const markets = useStore((s) => s.markets);
  const holdings = useStore((s) => s.holdings);
  const usd = useStore((s) => s.usd);
  const pv = useStore((s) => s.portfolioValue());
  const openOrders = useStore((s) => s.openOrders.filter((o) => o.status === "open"));
  const points = useStore((s) => s.points);
  const co2 = useStore((s) => s.co2SavedKg);
  const streak = useStore((s) => s.streak);

  const co2Potential = holdings.reduce((a, h) => a + h.qty, 0);
  const movers = [...markets].sort((a, b) => (b.price / b.open24h - 1) - (a.price / a.open24h - 1));
  const gainers = movers.slice(0, 4);

  const dayCost = holdings.reduce((a, h) => a + h.avgCost * h.qty, 0);
  const pnl = pv - dayCost;
  const pnlPct = dayCost ? (pnl / dayCost) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Good afternoon, Oz — here&apos;s your desk.</p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">Portfolio {fmtUsd(pv)}</h2>
            <Delta value={pnlPct} className="text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveDot label="Markets live" />
          <Link href="/markets" className="btn-primary">
            Trade now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available balance" value={fmtUsd(usd)} sub="USDT · ready to trade" icon={<Wallet className="h-4 w-4" />} tone="brand" />
        <StatCard label="Unrealised P&L" value={<span className={pnl >= 0 ? "text-up" : "text-down"}>{pnl >= 0 ? "+" : ""}{fmtUsd(pnl)}</span>} sub={<Delta value={pnlPct} />} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="CO₂ offset potential" value={`${fmtCompact(co2Potential)} t`} sub="across your holdings" icon={<Leaf className="h-4 w-4" />} />
        <StatCard label="Mining points" value={fmtCompact(points)} sub={`${streak}-day streak · ${co2} kg saved`} icon={<Pickaxe className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* holdings */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-ink">Your holdings</h3>
            <Link href="/portfolio" className="text-sm text-brand-700 font-medium hover:text-brand-800 inline-flex items-center gap-1">
              Full portfolio <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {holdings.map((h) => {
              const m = markets.find((x) => x.symbol === h.symbol)!;
              const value = m.price * h.qty;
              const pl = (m.price - h.avgCost) * h.qty;
              const plPct = h.avgCost ? ((m.price - h.avgCost) / h.avgCost) * 100 : 0;
              const spark = m.candles.slice(-30).map((c) => c.close);
              return (
                <Link
                  key={h.symbol}
                  href={`/trade/${h.symbol}`}
                  className="flex items-center gap-4 rounded-xl px-3 py-3 -mx-3 hover:bg-mist/60 transition-colors"
                >
                  <div className="w-28 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{h.symbol}</p>
                    <p className="text-xs text-ink-faint truncate">{fmtQty(h.qty)} t</p>
                  </div>
                  <div className="hidden sm:block"><Sparkline data={spark} up={plPct >= 0} width={80} height={28} /></div>
                  <div className="flex-1 text-right">
                    <p className="tnum font-semibold text-ink text-sm">${fmtPrice(m.price)}</p>
                    <Delta value={(m.price / m.open24h - 1) * 100} className="text-xs" />
                  </div>
                  <div className="w-28 text-right">
                    <p className="tnum font-semibold text-ink text-sm">{fmtUsd(value)}</p>
                    <p className={clsx("tnum text-xs font-medium", pl >= 0 ? "text-up" : "text-down")}>
                      {pl >= 0 ? "+" : ""}{fmtUsd(pl)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* side column */}
        <div className="space-y-6">
          {/* top movers */}
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Flame className="h-4 w-4 text-brand-600" /> Top movers
            </h3>
            <div className="space-y-3">
              {gainers.map((m) => (
                <Link key={m.symbol} href={`/trade/${m.symbol}`} className="flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-semibold text-ink group-hover:text-brand-700 transition-colors">{m.symbol}</p>
                    <p className="text-xs text-ink-faint">{m.projectType}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-sm font-semibold text-ink">${fmtPrice(m.price)}</p>
                    <Delta value={(m.price / m.open24h - 1) * 100} className="text-xs" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* open orders */}
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Open orders</h3>
            {openOrders.length === 0 ? (
              <p className="text-sm text-ink-faint py-4 text-center">No resting orders.</p>
            ) : (
              <div className="space-y-3">
                {openOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={clsx("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", o.side === "buy" ? "bg-brand-50 text-brand-700" : "bg-red-50 text-down")}>
                        {o.side}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink">{o.pair.split("/")[0]}</p>
                        <p className="text-xs text-ink-faint">{timeAgo(o.time)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-sm font-semibold text-ink">${fmtPrice(o.price)}</p>
                      <p className="tnum text-xs text-ink-faint">{fmtQty(o.qty)} t</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
