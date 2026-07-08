"use client";

import { useStore } from "@/lib/store";
import { fmtPrice, fmtQty, clsx } from "@/lib/format";

export function OrderBook({ symbol, onPick }: { symbol: string; onPick: (price: number) => void }) {
  const book = useStore((s) => s.books[symbol]);
  const m = useStore((s) => s.bySymbol(symbol));
  if (!book || !m) return null;

  const asks = book.asks.slice(0, 9).reverse();
  const bids = book.bids.slice(0, 9);
  const maxTotal = Math.max(book.asks[8]?.total ?? 1, book.bids[8]?.total ?? 1);
  const up = m.price >= m.prevPrice;
  const spread = (book.asks[0].price - book.bids[0].price);
  const spreadPct = (spread / m.price) * 100;

  const Row = ({ lvl, side }: { lvl: { price: number; size: number; total: number }; side: "ask" | "bid" }) => (
    <button
      onClick={() => onPick(lvl.price)}
      className="relative w-full grid grid-cols-3 items-center px-3 py-[3px] text-xs hover:bg-mist/70 transition-colors"
    >
      <div
        className={clsx("absolute inset-y-0 right-0", side === "ask" ? "bg-red-500/[0.06]" : "bg-brand-500/[0.07]")}
        style={{ width: `${(lvl.total / maxTotal) * 100}%` }}
      />
      <span className={clsx("relative tnum text-left font-medium", side === "ask" ? "text-down" : "text-up")}>{fmtPrice(lvl.price)}</span>
      <span className="relative tnum text-right text-ink-soft">{fmtQty(lvl.size, 0)}</span>
      <span className="relative tnum text-right text-ink-faint">{fmtQty(lvl.total, 0)}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wide text-ink-faint border-b border-line">
        <span>Price</span>
        <span className="text-right">Size (t)</span>
        <span className="text-right">Total</span>
      </div>
      <div className="flex-1 overflow-hidden py-1">
        {asks.map((l, i) => <Row key={"a" + i} lvl={l} side="ask" />)}
        <div className="flex items-center justify-between px-3 py-2 my-1 border-y border-line bg-mist/40">
          <span className={clsx("tnum text-base font-bold", up ? "text-up" : "text-down")}>{fmtPrice(m.price)}</span>
          <span className="text-[10px] text-ink-faint">Spread {fmtPrice(spread)} · {spreadPct.toFixed(3)}%</span>
        </div>
        {bids.map((l, i) => <Row key={"b" + i} lvl={l} side="bid" />)}
      </div>
    </div>
  );
}
