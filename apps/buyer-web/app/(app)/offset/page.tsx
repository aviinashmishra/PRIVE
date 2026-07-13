"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/Toast";
import { StatCard } from "@/components/ui/StatCard";
import { getRetirements, postRetirement, getHealth, ApiRetirement } from "@/lib/api";
import { ChainPanel } from "@/components/chain/ChainPanel";
import { fmtQty, fmtUsd, fmtCompact, timeAgo, clsx } from "@/lib/format";
import { Leaf, ShieldCheck, Download, ExternalLink, Flame, Award, Globe2, Database, Loader2 } from "lucide-react";

export default function OffsetPage() {
  const holdings = useStore((s) => s.holdings);
  const markets = useStore((s) => s.markets);
  const applyWallet = useStore((s) => s.applyWallet);
  const platformRetired = useStore((s) => s.platformRetired);

  const [symbol, setSymbol] = useState(holdings[0]?.symbol ?? "");
  const [qty, setQty] = useState("");
  const [beneficiary, setBeneficiary] = useState("Personal · FY2026");
  const [certs, setCerts] = useState<ApiRetirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbMode, setDbMode] = useState<string>("");

  const selected = holdings.find((h) => h.symbol === symbol);
  const market = markets.find((m) => m.symbol === symbol);
  const q = parseFloat(qty) || 0;
  const myRetired = certs.reduce((a, r) => a + r.qty, 0);

  const refresh = useCallback(async () => {
    try {
      const [rows, health] = await Promise.all([getRetirements(), getHealth()]);
      setCerts(rows);
      setDbMode(health.database);
    } catch {
      /* keep prior state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!symbol && holdings[0]) setSymbol(holdings[0].symbol);
  }, [holdings, symbol]);

  const doRetire = async () => {
    if (!symbol || q <= 0) { toast.error("Select an amount to retire"); return; }
    if (!selected || q > selected.qty) { toast.error("Insufficient balance", `You hold ${fmtQty(selected?.qty ?? 0)} t.`); return; }
    setSubmitting(true);
    try {
      // the server burns the credits from the wallet, then mints the certificate
      const { rec, wallet } = await postRetirement({ symbol, name: market?.name ?? symbol, qty: q, beneficiary });
      if (wallet) applyWallet(wallet.usd, wallet.holdings);
      setCerts((prev) => [rec, ...prev]);
      toast.success(`Retired ${fmtQty(q)} tCO₂e`, `Certificate ${rec.certId} minted on-chain`);
      setQty("");
    } catch (e) {
      toast.error("Retirement failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Carbon Offset</h2>
          <p className="text-sm text-ink-soft mt-1">Retire credits to permanently offset emissions. Each retirement burns the token on-chain and mints a certificate.</p>
        </div>
        {dbMode && (
          <span className={clsx("chip", dbMode === "neon" ? "!border-brand-200 !text-brand-700 !bg-brand-50" : "")}>
            <Database className="h-3.5 w-3.5" />
            {dbMode === "neon" ? "Persisting to Neon" : "In-memory (set DATABASE_URL for Neon)"}
          </span>
        )}
      </div>

      {/* real on-chain layer: reads contract state + executes genuine burn txs */}
      <ChainPanel />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="You've retired" value={`${fmtQty(myRetired)} t`} sub={`${certs.length} certificates`} icon={<Award className="h-4 w-4" />} tone="brand" />
        <StatCard label="Retirable now" value={`${fmtCompact(holdings.reduce((a, h) => a + h.qty, 0))} t`} sub="across holdings" icon={<Leaf className="h-4 w-4" />} />
        <StatCard label="Platform total" value={`${fmtCompact(platformRetired)} t`} sub="CO₂ retired on Prive" icon={<Globe2 className="h-4 w-4" />} />
        <StatCard label="Est. cars off road" value={fmtCompact(myRetired / 4.6)} sub="for a year" icon={<Flame className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* retire form */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-ink mb-5">Retire credits</h3>

          <label className="block mb-4">
            <span className="text-xs text-ink-faint">Project</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              {holdings.length === 0 && <option value="">No holdings to retire</option>}
              {holdings.map((h) => (
                <option key={h.symbol} value={h.symbol}>{h.symbol} — {fmtQty(h.qty)} t available</option>
              ))}
            </select>
          </label>

          <label className="block mb-2">
            <span className="text-xs text-ink-faint">Amount (tCO₂e)</span>
            <div className="mt-1 flex items-center rounded-xl border border-line bg-paper px-3 py-2.5 focus-within:border-brand-400">
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                inputMode="decimal"
                className="flex-1 bg-transparent outline-none tnum text-sm"
              />
              <button onClick={() => setQty(String(selected?.qty ?? 0))} className="text-xs font-semibold text-brand-700 hover:text-brand-800">MAX</button>
            </div>
          </label>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button key={p} onClick={() => setQty(((selected?.qty ?? 0) * p).toFixed(2))} className="py-1.5 rounded-lg bg-mist text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700 transition-colors">
                {p * 100}%
              </button>
            ))}
          </div>

          <label className="block mb-5">
            <span className="text-xs text-ink-faint">Beneficiary (on certificate)</span>
            <input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="rounded-xl bg-mist/60 p-4 space-y-2 text-xs mb-5">
            <div className="flex justify-between"><span className="text-ink-faint">Retiring</span><span className="tnum font-semibold text-ink">{fmtQty(q)} tCO₂e</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">Market value</span><span className="tnum text-ink-soft">{fmtUsd(q * (market?.price ?? 0))}</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">Action</span><span className="text-ink-soft">Burn on-chain · irreversible</span></div>
          </div>

          <button onClick={doRetire} disabled={!(q > 0) || submitting} className="btn-primary w-full py-3">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Minting…</> : <><Leaf className="h-4 w-4" /> Retire &amp; mint certificate</>}
          </button>
          <p className="mt-2 text-[11px] text-ink-faint text-center flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3 text-brand-600" /> Retirement is permanent and cannot be undone
          </p>
        </div>

        {/* certificates */}
        <div className="lg:col-span-3 card p-6">
          <h3 className="font-semibold text-ink mb-5">Your certificates</h3>
          {loading ? (
            <div className="py-12 grid place-items-center text-ink-faint">
              <Loader2 className="h-5 w-5 animate-spin mb-2" /> <span className="text-sm">Loading from the ledger…</span>
            </div>
          ) : certs.length === 0 ? (
            <p className="text-sm text-ink-faint py-12 text-center">No retirements yet. Your certificates will appear here.</p>
          ) : (
            <div className="space-y-3">
              {certs.map((r) => (
                <div key={r.id} className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 to-paper p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shrink-0">
                        <Award className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{r.name} <span className="text-ink-faint font-normal">· {r.symbol}</span></p>
                        <p className="text-xs text-ink-faint mt-0.5">{r.beneficiary} · {timeAgo(r.time)}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-soft">
                          <span className="tnum">Cert <b className="text-ink">{r.certId}</b></span>
                          <span className="tnum">Tx <b className="text-ink">{r.txHash}</b></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="tnum font-display text-xl font-semibold text-brand-700">{fmtQty(r.qty)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-ink-faint">tCO₂e</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => toast.info("Certificate PDF", "Download would begin in production.")} className="btn-ghost !py-1.5 !px-3 text-xs border border-line">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button onClick={() => toast.info("Opening explorer", `Tx ${r.txHash}`)} className="btn-ghost !py-1.5 !px-3 text-xs border border-line">
                      <ExternalLink className="h-3.5 w-3.5" /> View on-chain
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
