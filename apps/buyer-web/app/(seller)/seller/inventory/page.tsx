"use client";

import { useSellerSummary } from "@/lib/useSellerSummary";
import { StatCard } from "@/components/ui/StatCard";
import { TypePill } from "@/components/ui/bits";
import { fmtCompact, fmtUsd, fmtQty } from "@/lib/format";
import { Boxes, Coins, Flame, TrendingUp, Loader2 } from "lucide-react";

export default function SellerInventory() {
  const { summary, loading } = useSellerSummary();
  const batches = summary?.batches ?? [];
  const t = summary?.totals;

  const unsold = (b: (typeof batches)[number]) => Math.max(b.minted - b.retired - b.soldQty, 0);
  const inventoryValue = batches.reduce((a, b) => a + unsold(b) * b.price, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Inventory</h1>
        <p className="text-sm text-ink-soft mt-1">
          Tokenised credit batches — minted supply, live order flow, and retirements from the ledger.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total minted" value={`${fmtCompact(t?.minted ?? 0)} t`} sub={`${batches.length} batches`} icon={<Boxes className="h-4 w-4" />} tone="brand" />
        <StatCard label="Sold on-platform" value={`${fmtCompact(t?.soldQty ?? 0)} t`} sub="filled buy orders" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Retired by buyers" value={`${fmtCompact(t?.retired ?? 0)} t`} sub="permanently offset" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Unsold inventory value" value={fmtUsd(inventoryValue)} sub="at current price" icon={<Coins className="h-4 w-4" />} />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 grid place-items-center text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : batches.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint">No tokenised batches yet. Get a project to <b>Live</b> to mint credits.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] text-ink-faint border-b border-line">
                  <th className="font-medium px-6 py-3">Batch</th>
                  <th className="font-medium px-3 py-3 text-right">Minted</th>
                  <th className="font-medium px-3 py-3 text-right">Sold</th>
                  <th className="font-medium px-3 py-3 text-right">Retired</th>
                  <th className="font-medium px-3 py-3 text-right">Unsold</th>
                  <th className="font-medium px-3 py-3 text-right">Price</th>
                  <th className="font-medium px-6 py-3 text-right">Unsold value</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.tokenId} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <TypePill type={b.projectType} />
                        <div>
                          <p className="font-semibold text-ink text-sm tnum">{b.tokenId}</p>
                          <p className="text-xs text-ink-faint">{b.name} · {b.vintage}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right tnum text-sm">{fmtQty(b.minted, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-brand-700 font-medium">{fmtQty(b.soldQty, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-ink-soft">{fmtQty(b.retired, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-ink-soft">{fmtQty(unsold(b), 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm">{fmtUsd(b.price)}</td>
                    <td className="px-6 py-4 text-right tnum text-sm font-semibold">{fmtUsd(unsold(b) * b.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink-faint">
        Sold = platform-wide filled buy orders on your pairs · Retired = registry baseline + buyer retirements ·
        figures read live from the exchange ledger.
      </p>
    </div>
  );
}
