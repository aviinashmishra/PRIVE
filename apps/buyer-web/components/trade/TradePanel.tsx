"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/Toast";
import { postOrder } from "@/lib/api";
import { fmtUsd, fmtPrice, fmtQty, clsx } from "@/lib/format";
import { Leaf } from "lucide-react";

export function TradePanel({ symbol, pickedPrice }: { symbol: string; pickedPrice: number | null }) {
  const m = useStore((s) => s.bySymbol(symbol));
  const usd = useStore((s) => s.usd);
  const holdingQty = useStore((s) => s.holdingQty(symbol));
  const placeOrder = useStore((s) => s.placeOrder);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");

  useEffect(() => {
    if (m && price === "") setPrice(m.price.toFixed(2));
  }, [m, price]);

  useEffect(() => {
    if (pickedPrice) setPrice(pickedPrice.toFixed(2));
  }, [pickedPrice]);

  if (!m) return null;

  const p = type === "market" ? m.price : parseFloat(price) || 0;
  const q = parseFloat(qty) || 0;
  const notional = p * q;
  const fee = notional * 0.002;
  const maxBuy = p > 0 ? usd / p : 0;
  const maxQty = side === "buy" ? maxBuy : holdingQty;

  const setPct = (pct: number) => {
    const target = maxQty * pct;
    setQty(target > 0 ? target.toFixed(2) : "");
  };

  const submit = () => {
    const res = placeOrder(m.pair, side, type, parseFloat(price) || 0, q);
    if (res.ok) {
      toast.success(res.message, res.filled ? `Fee ${fmtUsd(fee)} · CO₂ ${fmtQty(q)} t` : undefined);
      // best-effort persist to the backend order history (Neon or in-memory)
      void postOrder({ pair: m.pair, side, type, price: res.avgPrice ?? p, qty: q, status: res.filled ? "filled" : "open" });
      setQty("");
    } else {
      toast.error("Order rejected", res.message);
    }
  };

  return (
    <div className="flex flex-col">
      {/* side tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-mist rounded-xl mb-4">
        <button
          onClick={() => setSide("buy")}
          className={clsx("py-2 rounded-lg text-sm font-semibold transition-all", side === "buy" ? "bg-brand-600 text-white shadow-glow" : "text-ink-soft hover:text-ink")}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={clsx("py-2 rounded-lg text-sm font-semibold transition-all", side === "sell" ? "bg-down text-white shadow-soft" : "text-ink-soft hover:text-ink")}
        >
          Sell
        </button>
      </div>

      {/* order type */}
      <div className="flex gap-4 mb-4 text-sm">
        {(["limit", "market"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={clsx("capitalize font-medium pb-1 border-b-2 transition-colors", type === t ? "border-brand-600 text-ink" : "border-transparent text-ink-faint hover:text-ink-soft")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* price */}
      <label className="block mb-3">
        <span className="text-xs text-ink-faint">Price (USDT)</span>
        <div className={clsx("mt-1 flex items-center rounded-xl border bg-paper px-3 py-2.5 transition-colors", type === "market" ? "border-line bg-mist/50" : "border-line focus-within:border-brand-400")}>
          <input
            value={type === "market" ? "Market" : price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={type === "market"}
            inputMode="decimal"
            className="flex-1 bg-transparent outline-none tnum text-sm disabled:text-ink-faint"
          />
          {type !== "market" && <span className="text-xs text-ink-faint">USDT</span>}
        </div>
      </label>

      {/* qty */}
      <label className="block mb-3">
        <span className="text-xs text-ink-faint">Amount (tCO₂e)</span>
        <div className="mt-1 flex items-center rounded-xl border border-line bg-paper px-3 py-2.5 focus-within:border-brand-400 transition-colors">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            inputMode="decimal"
            className="flex-1 bg-transparent outline-none tnum text-sm"
          />
          <span className="text-xs text-ink-faint">t</span>
        </div>
      </label>

      {/* pct slider */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <button
            key={pct}
            onClick={() => setPct(pct)}
            className="py-1.5 rounded-lg bg-mist text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700 transition-colors"
          >
            {pct * 100}%
          </button>
        ))}
      </div>

      {/* summary */}
      <div className="space-y-2 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-ink-faint">Available</span>
          <span className="tnum text-ink font-medium">{side === "buy" ? fmtUsd(usd) : `${fmtQty(holdingQty)} t`}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-faint">Order value</span>
          <span className="tnum text-ink font-medium">{fmtUsd(notional)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-faint">Est. fee (0.20%)</span>
          <span className="tnum text-ink-soft">{fmtUsd(fee)}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-line">
          <span className="text-ink-faint flex items-center gap-1"><Leaf className="h-3 w-3 text-brand-600" /> Impact</span>
          <span className="tnum text-brand-700 font-semibold">{fmtQty(q)} tCO₂e</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!(q > 0)}
        className={clsx(
          "btn w-full py-3 text-white",
          side === "buy" ? "bg-brand-600 hover:bg-brand-700 shadow-glow" : "bg-down hover:brightness-95",
        )}
      >
        {side === "buy" ? "Buy" : "Sell"} {symbol}
      </button>
      <p className="mt-2 text-[11px] text-ink-faint text-center">Gasless · settles on Polygon in ~90s</p>
    </div>
  );
}
