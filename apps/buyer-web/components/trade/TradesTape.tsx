"use client";

import { useStore } from "@/lib/store";
import { fmtPrice, fmtQty, clsx } from "@/lib/format";

export function TradesTape({ symbol }: { symbol: string }) {
  const trades = useStore((s) => s.trades[symbol]) ?? [];
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wide text-ink-faint border-b border-line">
        <span>Price</span>
        <span className="text-right">Size (t)</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {trades.slice(0, 24).map((t) => {
          const d = new Date(t.time);
          const hh = d.toLocaleTimeString("en-US", { hour12: false });
          return (
            <div key={t.id} className="grid grid-cols-3 px-3 py-[3px] text-xs">
              <span className={clsx("tnum font-medium", t.side === "buy" ? "text-up" : "text-down")}>{fmtPrice(t.price)}</span>
              <span className="tnum text-right text-ink-soft">{fmtQty(t.size)}</span>
              <span className="tnum text-right text-ink-faint">{hh}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
