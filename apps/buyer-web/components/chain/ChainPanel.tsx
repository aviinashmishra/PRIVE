"use client";

import { useCallback, useEffect, useState } from "react";
import { getChainStatus, ChainStatus } from "@/lib/api";
import { fmtCompact } from "@/lib/format";
import { Link2, Flame, Loader2, ShieldCheck, Boxes, Award, CircleOff } from "lucide-react";

/// Live view of the REAL blockchain: reads CreditRegistry + RetirementVault state
/// over RPC. Retirements placed with the form below burn credits on this ledger.
export function ChainPanel({ onStatus }: { onStatus?: (s: ChainStatus) => void }) {
  const [status, setStatus] = useState<ChainStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getChainStatus();
      setStatus(s);
      onStatus?.(s);
    } catch {
      /* keep prior */
    }
  }, [onStatus]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

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
          {" "}Retirements placed while the chain is offline are recorded on the ledger and shown without a transaction hash.
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <p className="mt-4 text-[11px] text-ink-faint">
        This panel is not simulated: it reads CreditRegistry/RetirementVault over JSON-RPC. Retiring credits below
        submits a real transaction that burns ERC-1155 credits and mints a soulbound certificate NFT.
      </p>
    </div>
  );
}
