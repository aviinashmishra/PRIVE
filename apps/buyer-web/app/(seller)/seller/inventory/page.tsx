"use client";

import { useProjects } from "@/lib/useProjects";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import { TypePill } from "@/components/ui/bits";
import { fmtCompact, fmtUsd, fmtQty, clsx } from "@/lib/format";
import { Boxes, Coins, Flame, TrendingUp, Loader2 } from "lucide-react";

export default function SellerInventory() {
  const { projects, loading } = useProjects();
  const bySymbol = useStore((s) => s.bySymbol);
  const live = projects.filter((p) => p.status === "live");

  // Synthesise a batch ledger from live projects (minted / listed / sold / retired).
  const batches = live.map((p, i) => {
    const minted = p.expectedAnnual;
    const sold = Math.round(minted * (0.22 + ((i * 7) % 30) / 100));
    const retired = Math.round(sold * 0.4);
    const listed = Math.round((minted - sold) * 0.5);
    const mkt = p.tokenId ? bySymbol(p.tokenId) : undefined;
    const price = mkt?.price ?? p.price;
    return { p, minted, sold, retired, listed, unsold: minted - sold, price, value: (minted - sold) * price };
  });

  const totalMinted = batches.reduce((a, b) => a + b.minted, 0);
  const totalSold = batches.reduce((a, b) => a + b.sold, 0);
  const totalRetired = batches.reduce((a, b) => a + b.retired, 0);
  const inventoryValue = batches.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Inventory</h1>
        <p className="text-sm text-ink-soft mt-1">Tokenised credit batches — minted, listed, sold, and retired.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total minted" value={`${fmtCompact(totalMinted)} t`} sub={`${batches.length} batches`} icon={<Boxes className="h-4 w-4" />} tone="brand" />
        <StatCard label="Sold" value={`${fmtCompact(totalSold)} t`} sub={`${((totalSold / (totalMinted || 1)) * 100).toFixed(0)}% of supply`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Retired by buyers" value={`${fmtCompact(totalRetired)} t`} sub="permanently offset" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Unsold inventory value" value={fmtUsd(inventoryValue)} sub="at live market price" icon={<Coins className="h-4 w-4" />} />
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
                  <th className="font-medium px-3 py-3 text-right">Listed</th>
                  <th className="font-medium px-3 py-3 text-right">Sold</th>
                  <th className="font-medium px-3 py-3 text-right">Retired</th>
                  <th className="font-medium px-3 py-3 text-right">Price</th>
                  <th className="font-medium px-6 py-3 text-right">Unsold value</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.p.id} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <TypePill type={b.p.projectType} />
                        <div>
                          <p className="font-semibold text-ink text-sm tnum">{b.p.tokenId}</p>
                          <p className="text-xs text-ink-faint">{b.p.name} · {b.p.vintage}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right tnum text-sm">{fmtQty(b.minted, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-ink-soft">{fmtQty(b.listed, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-brand-700 font-medium">{fmtQty(b.sold, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm text-ink-soft">{fmtQty(b.retired, 0)}</td>
                    <td className="px-3 py-4 text-right tnum text-sm">{fmtUsd(b.price)}</td>
                    <td className="px-6 py-4 text-right tnum text-sm font-semibold">{fmtUsd(b.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
