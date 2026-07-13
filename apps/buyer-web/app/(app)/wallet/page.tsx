"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import {
  getWallet, getMining, getChainStatus,
  ApiWallet, ApiMiningPayload, ChainStatus,
} from "@/lib/api";
import { fmtUsd, fmtPrice, fmtQty, fmtCompact, timeAgo, clsx } from "@/lib/format";
import {
  Wallet as WalletIcon, Coins, Pickaxe, Landmark, Link2, ShieldCheck,
  ArrowUpRight, Loader2, Zap,
} from "lucide-react";

export default function WalletPage() {
  const markets = useStore((s) => s.markets);
  const applyWallet = useStore((s) => s.applyWallet);

  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [mining, setMining] = useState<ApiMiningPayload | null>(null);
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [w, m, c] = await Promise.all([
        getWallet(),
        getMining().catch(() => null),
        getChainStatus().catch(() => null),
      ]);
      setWallet(w);
      applyWallet(w.usd, w.holdings); // keep the app-wide store in sync
      if (m) setMining(m);
      if (c) setChain(c);
    } catch {
      /* unauthenticated or offline */
    } finally {
      setLoading(false);
    }
  }, [applyWallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !wallet) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const holdings = wallet?.holdings ?? [];
  const priceOf = (symbol: string) => markets.find((m) => m.symbol === symbol)?.price ?? 0;
  const creditsValue = holdings.reduce((a, h) => a + priceOf(h.symbol) * h.qty, 0);
  const usd = wallet?.usd ?? 0;
  const creditsMinted = mining?.stats.creditsMinted ?? 0;
  const conversions = (mining?.stats.log ?? []).filter((e) => e.kind === "convert");

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Wallet</h2>
          <p className="text-sm text-ink-soft mt-1">Your server-settled balances — cash, carbon credits and mining rewards.</p>
        </div>
        <Link href="/mining" className="btn-primary">Earn credits <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cash (USDT)" value={fmtUsd(usd)} sub="available to trade" icon={<Landmark className="h-4 w-4" />} tone="brand" />
        <StatCard label="Credit holdings" value={fmtUsd(creditsValue)} sub={`${holdings.length} assets`} icon={<Coins className="h-4 w-4" />} />
        <StatCard label="Mining credits" value={`${fmtQty(creditsMinted)} PRIVE-CO₂`} sub="minted from points" icon={<Pickaxe className="h-4 w-4" />} />
        <StatCard label="Net worth" value={fmtUsd(usd + creditsValue)} sub="cash + credits" icon={<WalletIcon className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* holdings ledger */}
        <div className="lg:col-span-2 card overflow-hidden">
          <h3 className="font-semibold text-ink px-6 pt-5 pb-3">Credit balances</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] text-ink-faint border-y border-line">
                  <th className="font-medium px-6 py-2.5">Asset</th>
                  <th className="font-medium px-3 py-2.5 text-right">Balance</th>
                  <th className="font-medium px-3 py-2.5 text-right">Avg cost</th>
                  <th className="font-medium px-3 py-2.5 text-right">Mark</th>
                  <th className="font-medium px-6 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-ink-faint">
                      No credits yet — <Link href="/markets" className="text-brand-700 font-medium">buy on the exchange</Link> or <Link href="/mining" className="text-brand-700 font-medium">mine them</Link>.
                    </td>
                  </tr>
                )}
                {holdings.map((h) => {
                  const mark = priceOf(h.symbol);
                  return (
                    <tr key={h.symbol} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link href={`/trade/${h.symbol}`} className="group">
                          <p className="font-semibold text-ink text-sm group-hover:text-brand-700">{h.symbol}</p>
                          <p className="text-xs text-ink-faint">{h.avgCost === 0 ? "incl. mining grants" : "exchange-bought"}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-right tnum text-sm">{fmtQty(h.qty)} t</td>
                      <td className="px-3 py-3.5 text-right tnum text-sm text-ink-soft">${fmtPrice(h.avgCost)}</td>
                      <td className="px-3 py-3.5 text-right tnum text-sm">${fmtPrice(mark)}</td>
                      <td className="px-6 py-3.5 text-right tnum text-sm font-semibold">{fmtUsd(mark * h.qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* right column: chain anchor + conversions */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> On-chain anchor
            </h3>
            {chain?.connected ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-faint">Network</span>
                  <span className="font-medium text-ink">{chain.network} · #{chain.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Mining accrued</span>
                  <span className="tnum font-medium text-ink">{fmtCompact(Number(chain.mining?.totalAccruedKg ?? 0))} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Mining settled</span>
                  <span className="tnum font-medium text-ink">{fmtCompact(Number(chain.mining?.totalSettledKg ?? 0))} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Certificates</span>
                  <span className="tnum font-medium text-ink">{chain.certificates}</span>
                </div>
                <Link href="/explorer" className="inline-flex items-center gap-1 text-brand-700 font-medium pt-1">
                  Transparency explorer <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-ink-faint">
                {chain?.configured
                  ? "Chain node unreachable — grants are recorded off-chain and anchor when the node returns."
                  : "On-chain layer not deployed. Wallet balances are settled in the exchange ledger."}
              </p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-gold" /> Mining conversions</h3>
            <div className="space-y-3">
              {conversions.length === 0 && (
                <p className="text-xs text-ink-faint">No conversions yet — earn points in the <Link href="/mining" className="text-brand-700 font-medium">Mining Hub</Link>.</p>
              )}
              {conversions.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">+{fmtQty(e.credits)} PRIVE-CO₂</p>
                    <p className="text-xs text-ink-faint flex items-center gap-1">
                      {timeAgo(e.time)}
                      {e.txHash && (
                        <span className={clsx("inline-flex items-center gap-0.5 text-brand-600")} title={e.txHash}>
                          · <Link2 className="h-3 w-3" /> {e.txHash.slice(0, 10)}…
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="tnum text-sm font-semibold text-ink-soft shrink-0">{fmtCompact(e.points)} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
