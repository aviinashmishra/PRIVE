"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Sparkline } from "@/components/ui/Sparkline";
import { Delta, RatingBadge, TypePill } from "@/components/ui/bits";
import { fmtPrice, fmtCompact, clsx } from "@/lib/format";
import { Search, ArrowUpRight } from "lucide-react";

const filters = ["All", "Reforestation", "Solar", "Wind", "Blue Carbon", "Biogas", "Direct Air Capture", "Cookstoves"];

export default function MarketsPage() {
  const markets = useStore((s) => s.markets);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  const rows = markets.filter((m) => {
    const matchF = filter === "All" || m.projectType === filter;
    const matchQ =
      !q ||
      m.symbol.toLowerCase().includes(q.toLowerCase()) ||
      m.name.toLowerCase().includes(q.toLowerCase());
    return matchF && matchQ;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">All markets</h2>
          <p className="text-sm text-ink-soft mt-1">{markets.length} verified carbon instruments trading live.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or project…"
            className="w-full rounded-xl border border-line bg-paper pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
              filter === f ? "bg-brand-600 text-white border-brand-600" : "bg-paper text-ink-soft border-line hover:border-line-strong",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-ink-faint border-b border-line">
                <th className="font-medium px-6 py-3.5">Market</th>
                <th className="font-medium px-4 py-3.5">Type</th>
                <th className="font-medium px-4 py-3.5">Rating</th>
                <th className="font-medium px-4 py-3.5 text-right">Price</th>
                <th className="font-medium px-4 py-3.5 text-right">24h</th>
                <th className="font-medium px-4 py-3.5 text-right">24h Volume</th>
                <th className="font-medium px-4 py-3.5 text-right">7d Chart</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const spark = m.candles.slice(-48).map((c) => c.close);
                const chg = (m.price / m.open24h - 1) * 100;
                const up = m.price >= m.prevPrice;
                return (
                  <tr key={m.symbol} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-ink text-sm">{m.symbol}</p>
                          <p className="text-xs text-ink-faint">{m.name} · {m.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><TypePill type={m.projectType} /></td>
                    <td className="px-4 py-4"><RatingBadge rating={m.rating} /></td>
                    <td className={clsx("px-4 py-4 text-right tnum font-semibold transition-colors", up ? "text-ink" : "text-ink")}>
                      ${fmtPrice(m.price)}
                    </td>
                    <td className="px-4 py-4 text-right"><Delta value={chg} /></td>
                    <td className="px-4 py-4 text-right tnum text-sm text-ink-soft">${fmtCompact(m.quoteVolume24h)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end"><Sparkline data={spark} up={chg >= 0} /></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/trade/${m.symbol}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        Trade <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="text-center text-sm text-ink-faint py-12">No markets match your search.</p>}
      </div>
    </div>
  );
}
