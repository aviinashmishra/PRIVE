"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/Toast";
import { fmtPrice, fmtQty, timeAgo, clsx } from "@/lib/format";
import { X } from "lucide-react";

export function OpenOrders() {
  const orders = useStore((s) => s.openOrders);
  const cancel = useStore((s) => s.cancelOrder);
  const [tab, setTab] = useState<"open" | "history">("open");

  const open = orders.filter((o) => o.status === "open");
  const history = orders.filter((o) => o.status !== "open");
  const list = tab === "open" ? open : history;

  return (
    <div className="card">
      <div className="flex items-center gap-5 px-5 pt-4 border-b border-line">
        {(["open", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx("pb-3 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px", tab === t ? "border-brand-600 text-ink" : "border-transparent text-ink-faint hover:text-ink-soft")}
          >
            {t === "open" ? `Open orders (${open.length})` : "Order history"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] text-ink-faint">
              <th className="font-medium px-5 py-2.5">Time</th>
              <th className="font-medium px-3 py-2.5">Market</th>
              <th className="font-medium px-3 py-2.5">Side</th>
              <th className="font-medium px-3 py-2.5">Type</th>
              <th className="font-medium px-3 py-2.5 text-right">Price</th>
              <th className="font-medium px-3 py-2.5 text-right">Amount</th>
              <th className="font-medium px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="border-t border-line text-sm">
                <td className="px-5 py-3 text-ink-faint text-xs">{timeAgo(o.time)}</td>
                <td className="px-3 py-3 font-medium text-ink">{o.pair.split("/")[0]}</td>
                <td className="px-3 py-3">
                  <span className={clsx("text-xs font-bold uppercase", o.side === "buy" ? "text-up" : "text-down")}>{o.side}</span>
                </td>
                <td className="px-3 py-3 text-ink-soft capitalize">{o.type}</td>
                <td className="px-3 py-3 text-right tnum">{fmtPrice(o.price)}</td>
                <td className="px-3 py-3 text-right tnum">{fmtQty(o.qty)} t</td>
                <td className="px-3 py-3">
                  <span className={clsx("text-xs font-medium capitalize px-2 py-0.5 rounded-full", o.status === "open" ? "bg-brand-50 text-brand-700" : o.status === "filled" ? "bg-mist text-ink-soft" : "bg-red-50 text-down")}>
                    {o.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {o.status === "open" && (
                    <button
                      onClick={() => { cancel(o.id); toast.info("Order cancelled", `${o.side} ${fmtQty(o.qty)} ${o.pair.split("/")[0]}`); }}
                      className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-down transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="text-center text-sm text-ink-faint py-10">Nothing here yet.</p>}
      </div>
    </div>
  );
}
