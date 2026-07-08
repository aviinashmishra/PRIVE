"use client";

import { useCallback, useEffect, useState } from "react";
import { getChainStatus, postChainRetire, ChainStatus } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { fmtCompact, clsx } from "@/lib/format";
import { Link2, Flame, Loader2, ShieldCheck, Boxes, Award, CircleOff } from "lucide-react";

/// Live view of the REAL blockchain: reads CreditRegistry + RetirementVault state over RPC
/// and lets you execute a genuine on-chain retirement (burn + certificate NFT mint).
export function ChainPanel() {
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [amount, setAmount] = useState("25");
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<{ txHash: string; certificateId: string; blockNumber: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getChainStatus());
    } catch {
      /* keep prior */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  const retire = async () => {
    const amt = parseInt(amount) || 0;
    if (amt <= 0) { toast.error("Enter an amount"); return; }
    setBusy(true);
    try {
      const res = await postChainRetire(amt, "Prive Demo · On-chain");
      setLastTx(res);
      toast.success(`Burned ${amt} t on-chain`, `Certificate NFT #${res.certificateId} · block ${res.blockNumber}`);
      await refresh();
    } catch (e) {
      toast.error("On-chain retirement failed", String(e).slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="card p-6 grid place-items-center text-ink-faint h-40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!status.configured || !status.connected) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <CircleOff className="h-4 w-4 text-ink-faint" />
          <h3 className="font-semibold text-ink">On-chain layer offline</h3>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          {!status.configured
            ? "Contracts not deployed yet. From /contracts run: npm run node (terminal 1), then npm run deploy:local (terminal 2)."
            : `Deployed but the RPC node isn't reachable (${status.error?.slice(0, 80)}…). Start it with: npm run node in /contracts.`}
        </p>
      </div>
    );
  }

  const b = status.batch!;
  return (
    <div className="card p-6 border-brand-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Link2 className="h-4 w-4 text-brand-600" /> Live blockchain · {status.seed?.symbol}
        </h3>
        <span className="chip !border-brand-200 !text-brand-700 !bg-brand-50">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          {status.network} · chain {status.chainId}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { k: "Minted on-chain", v: fmtCompact(Number(b.totalMinted)) + " t", icon: Boxes },
          { k: "Retired (burned)", v: fmtCompact(Number(b.totalRetired)) + " t", icon: Flame },
          { k: "Circulating", v: fmtCompact(Number(b.circulating)) + " t", icon: ShieldCheck },
          { k: "Certificates", v: status.certificates ?? "0", icon: Award },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.k} className="rounded-xl bg-mist/60 p-3">
              <div className="flex items-center gap-1.5 text-ink-faint mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wide">{s.k}</span>
              </div>
              <p className="tnum text-lg font-bold text-ink leading-none">{s.v}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs text-ink-faint">Burn amount (tCO₂e)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="mt-1 w-36 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm tnum outline-none focus:border-brand-400"
          />
        </label>
        <button onClick={retire} disabled={busy} className="btn-primary py-2.5">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Mining tx…</> : <><Flame className="h-4 w-4" /> Burn on-chain</>}
        </button>
        {lastTx && (
          <p className="text-[11px] text-ink-soft tnum">
            ✓ tx {lastTx.txHash.slice(0, 10)}… · cert #{lastTx.certificateId} · block {lastTx.blockNumber}
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        This panel is not simulated: it reads CreditRegistry/RetirementVault over JSON-RPC and the button submits a
        real transaction that burns ERC-1155 credits and mints a soulbound certificate NFT.
      </p>
    </div>
  );
}
