"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getChainStatus, ChainStatus } from "@/lib/api";
import { fmtCompact, timeAgo, clsx } from "@/lib/format";
import {
  Globe2, Boxes, Flame, Award, ShieldCheck, Loader2, FileText,
  BadgeCheck, Coins, CircleOff, ArrowRight, Link2,
} from "lucide-react";

interface ChainEvent {
  kind: string;
  tokenId: string;
  detail: string;
  amount?: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

const KIND_META: Record<string, { label: string; icon: any; tone: string }> = {
  BatchRegistered: { label: "Batch registered", icon: FileText, tone: "text-ink-soft bg-mist" },
  RegistryRetiredSet: { label: "Registry attested", icon: BadgeCheck, tone: "text-brand-700 bg-brand-50" },
  CreditsMinted: { label: "Credits minted", icon: Coins, tone: "text-brand-700 bg-brand-50" },
  CreditsRetired: { label: "Credits burned", icon: Flame, tone: "text-amber-700 bg-amber-50" },
  CertificateIssued: { label: "Certificate issued", icon: Award, tone: "text-brand-700 bg-brand-100" },
  RewardAccrued: { label: "Mining reward anchored", icon: Coins, tone: "text-brand-700 bg-brand-50" },
  RewardSettled: { label: "Mining reward settled", icon: BadgeCheck, tone: "text-brand-700 bg-brand-50" },
};

export default function ExplorerPage() {
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // ?tx=<hash> deep link (from certificate "View on-chain" buttons) — read from
  // location instead of useSearchParams to keep the page statically prerenderable.
  const [focusTx, setFocusTx] = useState<string | null>(null);
  const scrolledToFocus = useRef(false);
  useEffect(() => {
    const tx = new URLSearchParams(window.location.search).get("tx");
    if (tx) setFocusTx(tx.toLowerCase());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, evRes] = await Promise.all([
        getChainStatus(),
        fetch("/api/chain/events", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setStatus(s);
      setEvents(evRes.data ?? []);
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const online = status?.connected && status?.configured;
  const b = status?.batch;

  return (
    <div className="min-h-screen bg-canvas">
      {/* public header */}
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <span className="chip hidden sm:inline-flex"><Globe2 className="h-3.5 w-3.5" /> Public · no login</span>
            <ThemeToggle />
            <Link href="/dashboard" className="btn-primary !py-2">Launch app <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="eyebrow mb-3">Transparency Explorer</p>
          <h1 className="font-display text-4xl font-semibold text-ink text-balance">
            Every credit, auditable by anyone
          </h1>
          <p className="mt-4 text-ink-soft">
            This page reads the blockchain directly — registration, attestation, minting, burning, and
            certificates, straight from the contract event log. No database, no trust required.
          </p>
        </div>

        {loading ? (
          <div className="card p-16 grid place-items-center text-ink-faint"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !online ? (
          <div className="card p-10 text-center">
            <CircleOff className="h-8 w-8 text-ink-faint mx-auto mb-3" />
            <h2 className="font-semibold text-ink mb-1">Chain node offline</h2>
            <p className="text-sm text-ink-soft max-w-md mx-auto">
              The explorer reads a live node over JSON-RPC. Start the local chain
              (<span className="tnum">npm run node</span> + <span className="tnum">npm run deploy:local</span> in
              /contracts) or point CHAIN_RPC_URL at a public network.
            </p>
          </div>
        ) : (
          <>
            {/* live stats from the chain */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { k: "Minted on-chain", v: fmtCompact(Number(b!.totalMinted)) + " t", icon: Boxes },
                { k: "Retired (burned)", v: fmtCompact(Number(b!.totalRetired)) + " t", icon: Flame },
                { k: "Circulating", v: fmtCompact(Number(b!.circulating)) + " t", icon: ShieldCheck },
                { k: "Certificates issued", v: status!.certificates ?? "0", icon: Award },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.k} className="card p-5 text-center">
                    <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                    <p className="tnum font-display text-2xl font-semibold text-ink">{s.v}</p>
                    <p className="text-xs text-ink-faint mt-1">{s.k}</p>
                  </div>
                );
              })}
            </div>

            {/* batch provenance card */}
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-ink flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-brand-600" /> Batch #{status!.seed?.tokenId} · {status!.seed?.symbol}
                </h2>
                <span className={clsx("chip", b!.registryRetired ? "!border-brand-200 !text-brand-700 !bg-brand-50" : "!text-amber-700")}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {b!.registryRetired ? "Registry serials retired at source" : "Awaiting registry attestation"}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-ink-faint mb-0.5">Network</p><p className="text-ink font-medium capitalize tnum">{status!.network} · chain {status!.chainId}</p></div>
                <div><p className="text-xs text-ink-faint mb-0.5">CreditRegistry</p><p className="text-ink font-medium tnum truncate">{status!.contracts?.CreditRegistry}</p></div>
                <div><p className="text-xs text-ink-faint mb-0.5">Metadata</p><p className="text-ink font-medium tnum truncate">{b!.uri}</p></div>
              </div>
            </div>

            {/* lifecycle event timeline */}
            <div className="card p-6">
              <h2 className="font-semibold text-ink mb-5">On-chain lifecycle · {events.length} events</h2>
              {events.length === 0 ? (
                <p className="text-sm text-ink-faint text-center py-8">No events yet.</p>
              ) : (
                <ol className="relative border-l border-line ml-3 space-y-5">
                  {events.map((e, i) => {
                    const meta = KIND_META[e.kind] ?? KIND_META.BatchRegistered;
                    const Icon = meta.icon;
                    const focused = !!focusTx && e.txHash.toLowerCase() === focusTx;
                    return (
                      <li
                        key={e.txHash + i}
                        className={clsx("ml-6", focused && "rounded-xl ring-2 ring-brand-400 bg-brand-50/50 p-3 -m-1")}
                        ref={focused ? (el) => {
                          if (el && !scrolledToFocus.current) {
                            scrolledToFocus.current = true;
                            el.scrollIntoView({ block: "center" });
                          }
                        } : undefined}
                      >
                        <span className={clsx("absolute -left-[13px] grid place-items-center h-[26px] w-[26px] rounded-full border-2 border-canvas", meta.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-sm font-semibold text-ink">
                            {meta.label}
                            {e.amount && <span className="ml-2 tnum text-brand-700">{fmtCompact(Number(e.amount))} t</span>}
                            {focused && <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-700">your transaction</span>}
                          </p>
                          <p className="text-[11px] text-ink-faint tnum">block {e.blockNumber} · {e.timestamp ? timeAgo(e.timestamp) : ""}</p>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">{e.detail}</p>
                        <p className={clsx("text-[11px] tnum mt-1 break-all", focused ? "text-ink" : "text-ink-faint")}>
                          tx {focused ? e.txHash : `${e.txHash.slice(0, 22)}…`}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}

        <p className="text-center text-xs text-ink-faint pb-6">
          Prive Exchange · the ledger the planet can check. Data read live from the chain each 8s.
        </p>
      </main>
    </div>
  );
}
