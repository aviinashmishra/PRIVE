"use client";

import { useEffect, useState } from "react";
import { MARKETS } from "@/lib/data";
import { fmtPrice, clsx } from "@/lib/format";

export function LandingTicker() {
  const [prices, setPrices] = useState(() => MARKETS.map((m) => m.price));
  const [dirs, setDirs] = useState(() => MARKETS.map(() => 0));

  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) =>
        prev.map((p, i) => {
          const change = (Math.random() - 0.5) * p * 0.004;
          return Math.max(0.5, +(p + change).toFixed(2));
        }),
      );
      setDirs((prev) => prev.map(() => (Math.random() > 0.5 ? 1 : -1)));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const row = [...MARKETS, ...MARKETS];
  return (
    <div className="relative overflow-hidden border-y border-line bg-paper/60">
      <div className="flex gap-8 py-3 whitespace-nowrap animate-[marquee_38s_linear_infinite] hover:[animation-play-state:paused]">
        {row.map((m, i) => {
          const idx = i % MARKETS.length;
          const up = dirs[idx] >= 0;
          return (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className="font-semibold text-ink">{m.symbol}</span>
              <span className={clsx("tnum", up ? "text-up" : "text-down")}>
                ${fmtPrice(prices[idx])}
              </span>
              <span className={clsx("tnum text-xs", up ? "text-up" : "text-down")}>
                {up ? "▲" : "▼"} {(((idx * 37) % 280) / 100 + 0.2).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
