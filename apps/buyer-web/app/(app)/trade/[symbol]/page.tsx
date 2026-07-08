"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MarketHeader } from "@/components/trade/MarketHeader";
import { OrderBook } from "@/components/trade/OrderBook";
import { TradesTape } from "@/components/trade/TradesTape";
import { TradePanel } from "@/components/trade/TradePanel";
import { OpenOrders } from "@/components/trade/OpenOrders";
import { LiveDot } from "@/components/ui/bits";
import { clsx } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

const PriceChart = dynamic(
  () => import("@/components/trade/PriceChart").then((m) => m.PriceChart),
  { ssr: false, loading: () => <div className="w-full h-full grid place-items-center text-sm text-ink-faint">Loading chart…</div> },
);

export default function TradePage() {
  const params = useParams();
  const symbol = String(params.symbol || "AMZN-RF25");
  const exists = useStore((s) => !!s.bySymbol(symbol));
  const [picked, setPicked] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<"book" | "trades">("book");

  if (!exists) {
    return (
      <div className="card p-12 text-center">
        <p className="text-ink-soft">Market <b>{symbol}</b> not found.</p>
        <Link href="/markets" className="btn-outline mt-4 inline-flex"><ArrowLeft className="h-4 w-4" /> Back to markets</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 animate-fade-up">
      <div className="col-span-12">
        <MarketHeader symbol={symbol} />
      </div>

      {/* left: chart + open orders */}
      <div className="col-span-12 xl:col-span-6 flex flex-col gap-4 order-2 xl:order-1">
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Price</span>
              <span className="chip !py-0.5 !px-2 tnum">1H</span>
            </div>
            <LiveDot />
          </div>
          <div className="h-[380px] px-2 py-2">
            <PriceChart symbol={symbol} />
          </div>
        </div>
        <div className="hidden xl:block">
          <OpenOrders />
        </div>
      </div>

      {/* middle: book / trades */}
      <div className="col-span-12 sm:col-span-6 xl:col-span-3 order-3 xl:order-2">
        <div className="card p-0 h-full flex flex-col">
          <div className="flex items-center gap-4 px-4 pt-3 border-b border-line">
            {(["book", "trades"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={clsx("pb-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors", rightTab === t ? "border-brand-600 text-ink" : "border-transparent text-ink-faint hover:text-ink-soft")}
              >
                {t === "book" ? "Order book" : "Trades"}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-[420px]">
            {rightTab === "book" ? <OrderBook symbol={symbol} onPick={setPicked} /> : <TradesTape symbol={symbol} />}
          </div>
        </div>
      </div>

      {/* right: trade panel */}
      <div className="col-span-12 sm:col-span-6 xl:col-span-3 order-1 xl:order-3">
        <div className="card p-5 sticky top-20">
          <TradePanel symbol={symbol} pickedPrice={picked} />
        </div>
      </div>

      {/* open orders on smaller screens */}
      <div className="col-span-12 xl:hidden order-4">
        <OpenOrders />
      </div>
    </div>
  );
}
