"use client";

import { useStore } from "@/lib/store";
import { Delta, RatingBadge, TypePill, LiveDot } from "@/components/ui/bits";
import { fmtPrice, fmtCompact, clsx } from "@/lib/format";

export function MarketHeader({ symbol }: { symbol: string }) {
  const m = useStore((s) => s.bySymbol(symbol));
  if (!m) return null;
  const chg = (m.price / m.open24h - 1) * 100;
  const up = m.price >= m.prevPrice;

  const stat = (label: string, value: string, cls?: string) => (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={clsx("tnum text-sm font-semibold text-ink mt-0.5", cls)}>{value}</p>
    </div>
  );

  return (
    <div className="card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-ink">{m.pair}</h2>
              <RatingBadge rating={m.rating} />
            </div>
            <p className="text-xs text-ink-faint mt-0.5">{m.name} · {m.vintage} · {m.standard}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx("tnum text-2xl font-bold transition-colors", up ? "text-up" : "text-down")}>
            ${fmtPrice(m.price)}
          </span>
          <Delta value={chg} className="text-sm" />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {stat("24h High", "$" + fmtPrice(m.high24h))}
          {stat("24h Low", "$" + fmtPrice(m.low24h))}
          {stat("24h Volume", fmtCompact(m.volume24h) + " t")}
          {stat("Circulating", fmtCompact(m.supply) + " t")}
          {stat("Retired", fmtCompact(m.retired) + " t", "text-brand-700")}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <TypePill type={m.projectType} />
          <LiveDot />
        </div>
      </div>
    </div>
  );
}
