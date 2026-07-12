"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAdminSummary } from "@/lib/useAdminSummary";
import { AdminStat } from "@/components/admin/AdminShell";
import { toast } from "@/components/ui/Toast";
import { fmtUsd, fmtCompact, clsx } from "@/lib/format";
import { Wallet, Snowflake, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";

interface Payout { id: string; account: string; amount: number; rail: string; }

export default function AdminTreasury() {
  const markets = useStore((s) => s.markets);
  const platformRetired = useStore((s) => s.platformRetired);
  const [queue, setQueue] = useState<Payout[]>([
    { id: "PO-3312", account: "Verdant Terra Ltd", amount: 184200, rail: "USDT · Polygon" },
    { id: "PO-3315", account: "Helios Grid Co", amount: 92640, rail: "Bank · SEPA" },
    { id: "PO-3319", account: "Nordic Capture AS", amount: 311080, rail: "USDT · Polygon" },
  ]);
  const [approving, setApproving] = useState<string | null>(null);

  const summary = useAdminSummary();
  const custodyValue = markets.reduce((a, m) => a + m.supply * m.price, 0);
  const feeRevenue = markets.reduce((a, m) => a + m.quoteVolume24h * 0.0015, 0);
  const customerBalances = summary?.treasury.customerBalances ?? 0;
  const retiredTonnes = (summary?.retirements.tonnes ?? 0) + platformRetired;

  const approve = (id: string) => {
    setApproving(id);
    setTimeout(() => {
      const p = queue.find((x) => x.id === id);
      setQueue((prev) => prev.filter((x) => x.id !== id));
      setApproving(null);
      toast.success("Payout approved (maker-checker)", `${p?.id} · ${fmtUsd(p?.amount ?? 0)} to ${p?.account}`);
    }, 700);
  };

  const balances = [
    { label: "Hot wallet (USDT)", value: 1_240_000, pct: 4, tone: "warn" as const },
    { label: "Cold storage (USDT)", value: 29_600_000, pct: 96, tone: "good" as const },
    { label: "Fee revenue (24h)", value: feeRevenue, pct: 100, tone: "good" as const },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display text-xl font-semibold text-white">Treasury &amp; settlement</h1>
        <p className="text-sm admin-soft mt-0.5">Custody balances, reconciliation, and maker-checker payouts.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStat label="Customer balances" value={fmtUsd(customerBalances)} sub="sum of all account wallets (ledger)" tone="good" />
        <AdminStat label="Assets under custody" value={fmtUsd(custodyValue)} sub="credits + stablecoin" tone="good" />
        <AdminStat label="Retired (lifetime)" value={`${fmtCompact(retiredTonnes)} t`} sub={`${summary?.retirements.total ?? 0} certificates issued`} />
        <AdminStat label="Reconciliation drift" value="0.00" sub="ledger ↔ chain" tone="good" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* balances + reconciliation */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-[#23C286]" /> Balances</h2>
          <div className="space-y-4">
            {balances.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="admin-soft">{b.label}</span>
                  <span className="tnum font-semibold text-white">{fmtUsd(b.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0E1712] overflow-hidden">
                  <div className={clsx("h-full rounded-full", b.tone === "good" ? "bg-[#23C286]" : "bg-[#D6A63E]")} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-lg border admin-line p-3">
            <ShieldCheck className="h-4 w-4 text-[#23C286]" />
            <p className="text-xs admin-soft">Automated reconciliation passed at 21:00 UTC · <span className="text-[#23C286] font-semibold">0 discrepancies</span></p>
          </div>
        </div>

        {/* payout queue */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#23C286]" /> Payout queue · maker-checker</h2>
          {queue.length === 0 ? (
            <p className="text-sm admin-faint py-8 text-center">Queue cleared. All payouts approved.</p>
          ) : (
            <div className="space-y-2.5">
              {queue.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border admin-line p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{p.account}</p>
                    <p className="text-[11px] admin-faint tnum">{p.id} · {p.rail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm font-semibold text-white">{fmtUsd(p.amount)}</span>
                    <button onClick={() => approve(p.id)} disabled={approving === p.id} className="btn bg-[#23C286] text-[#06110B] px-3 py-1.5 text-xs font-semibold hover:brightness-110">
                      {approving === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] admin-faint">A proposer cannot approve their own payout. All approvals are audit-logged.</p>
        </div>
      </div>
    </div>
  );
}
