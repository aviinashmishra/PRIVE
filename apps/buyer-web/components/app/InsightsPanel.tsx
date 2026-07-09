"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { fmtCompact, fmtPrice } from "@/lib/format";
import { Sparkles, TrendingUp, Droplets, Leaf } from "lucide-react";

// Prive Intelligence — an on-platform analyst that turns the live market state
// into a plain-language desk briefing. Deterministic and explainable: every
// insight below is computed from the same feed the charts use.
export function InsightsPanel() {
  const markets = useStore((s) => s.markets);
  const holdings = useStore((s) => s.holdings);
  const platformRetired = useStore((s) => s.platformRetired);

  const insights = useMemo(() => {
    if (!markets.length) return [];
    const byMomentum = [...markets].sort(
      (a, b) => b.price / b.open24h - a.price / a.open24h,
    );
    const leader = byMomentum[0];
    const laggard = byMomentum[byMomentum.length - 1];
    const leaderPct = (leader.price / leader.open24h - 1) * 100;
    const laggardPct = (laggard.price / laggard.open24h - 1) * 100;

    const totalVol = markets.reduce((a, m) => a + m.quoteVolume24h, 0);
    const byVol = [...markets].sort((a, b) => b.quoteVolume24h - a.quoteVolume24h);
    const volShare = totalVol ? (byVol[0].quoteVolume24h / totalVol) * 100 : 0;

    const held = new Set(holdings.map((h) => h.symbol));
    const exposure = held.has(leader.symbol)
      ? `You hold ${leader.symbol} — momentum is currently working for your book.`
      : `Your portfolio has no exposure to today's leader.`;

    return [
      {
        icon: TrendingUp,
        title: `${leader.symbol} leads the tape`,
        body: `Up ${leaderPct.toFixed(1)}% over 24h at $${fmtPrice(leader.price)} while ${laggard.symbol} trails at ${laggardPct.toFixed(1)}%. ${exposure}`,
        href: `/trade/${leader.symbol}`,
      },
      {
        icon: Droplets,
        title: "Liquidity concentration",
        body: `${byVol[0].symbol} is absorbing ${volShare.toFixed(0)}% of platform volume ($${fmtCompact(byVol[0].quoteVolume24h)}). Spreads are tightest there — size executes best where depth lives.`,
        href: `/trade/${byVol[0].symbol}`,
      },
      {
        icon: Leaf,
        title: "Retirement flow",
        body: `${fmtCompact(platformRetired)} t CO₂e permanently retired platform-wide. Supply that retires can never re-enter the market — structural support for verified vintages.`,
        href: "/offset",
      },
    ];
  }, [markets, holdings, platformRetired]);

  return (
    <div className="relative card p-6 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-24 -z-0 pointer-events-none"
        style={{ background: "radial-gradient(70% 100% at 20% 0%, rgba(14,124,85,.08), transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <span className="grid place-items-center h-6 w-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          Prive Intelligence
        </h3>
        <span className="chip !py-0.5 !px-2 !text-[10px] !border-brand-200 !bg-brand-50/60 text-brand-700">
          Live analysis
        </span>
      </div>
      <div className="relative space-y-4">
        {insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <Link key={ins.title} href={ins.href} className="block group">
              <p className="text-sm font-semibold text-ink flex items-center gap-2 group-hover:text-brand-700 transition-colors">
                <Icon className="h-3.5 w-3.5 text-brand-600" /> {ins.title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{ins.body}</p>
            </Link>
          );
        })}
      </div>
      <p className="relative mt-4 pt-3 border-t border-line text-[10px] text-ink-faint">
        Computed from the live feed — informational, not investment advice.
      </p>
    </div>
  );
}
