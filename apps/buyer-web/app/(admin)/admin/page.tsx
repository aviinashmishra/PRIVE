"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { useProjects } from "@/lib/useProjects";
import { AdminStat } from "@/components/admin/AdminShell";
import { fmtCompact, fmtUsd, fmtPrice, clsx } from "@/lib/format";
import { Activity, Cpu, Fuel, ShieldCheck, TriangleAlert, ArrowRight, Gavel } from "lucide-react";

const health = [
  { label: "Matching engine", value: "9,840 TPS", ok: true, icon: Cpu },
  { label: "WS fan-out p99", value: "82 ms", ok: true, icon: Activity },
  { label: "Settlement lag", value: "1.4 blocks", ok: true, icon: ShieldCheck },
  { label: "Relayer gas tank", value: "128 MATIC", ok: true, icon: Fuel },
  { label: "Reconciliation drift", value: "0.00", ok: true, icon: ShieldCheck },
  { label: "KYC vendor", value: "Operational", ok: true, icon: ShieldCheck },
];

const alerts = [
  { kind: "wash_trade", market: "COOK-UG25", sev: "medium", note: "Self-crossing pattern, 3 accounts", time: "4m" },
  { kind: "spoofing", market: "DAC-IS25", sev: "low", note: "Layered asks pulled pre-fill", time: "22m" },
  { kind: "pump_dump", market: "BIO-KE24", sev: "high", note: "+14% / 6m volume anomaly", time: "1h" },
];

export default function AdminOverview() {
  const markets = useStore((s) => s.markets);
  const platformRetired = useStore((s) => s.platformRetired);
  const { projects } = useProjects();

  const vol24 = markets.reduce((a, m) => a + m.quoteVolume24h, 0);
  const tokenized = markets.reduce((a, m) => a + m.supply, 0);
  const pending = projects.filter((p) => p.status === "pending").length;
  const top = [...markets].sort((a, b) => b.quoteVolume24h - a.quoteVolume24h).slice(0, 5);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display text-xl font-semibold text-white">Global overview</h1>
        <p className="text-sm admin-soft mt-0.5">Real-time health of the entire ecosystem.</p>
      </div>

      {/* KPI wall */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <AdminStat label="Active users (24h)" value="12,480" sub="+6.2% vs. yesterday" tone="good" />
        <AdminStat label="24h volume" value={fmtUsd(vol24)} sub="across all pairs" />
        <AdminStat label="Tonnes tokenised" value={`${fmtCompact(tokenized)}`} sub="circulating supply" />
        <AdminStat label="Tonnes retired" value={fmtCompact(platformRetired)} sub="lifetime, on-chain" tone="good" />
        <AdminStat label="Pending verifications" value={String(pending)} sub="in the queue" tone={pending > 3 ? "warn" : "default"} />
        <AdminStat label="Open disputes" value="2" sub="1 needs escrow action" tone="warn" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* system health */}
        <div className="lg:col-span-2 admin-card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">System health</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {health.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.label} className="flex items-center gap-3 rounded-lg border admin-line p-3">
                  <span className={clsx("grid place-items-center h-9 w-9 rounded-lg", h.ok ? "bg-[#12241C] text-[#23C286]" : "bg-[#2A1512] text-[#E5715C]")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] admin-faint">{h.label}</p>
                    <p className="text-sm font-semibold text-white tnum">{h.value}</p>
                  </div>
                  <span className={clsx("ml-auto h-2 w-2 rounded-full", h.ok ? "bg-[#23C286]" : "bg-[#E5715C]")} />
                </div>
              );
            })}
          </div>
        </div>

        {/* alerts */}
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-[#D6A63E]" /> Surveillance</h2>
            <Link href="/admin/surveillance" className="text-xs font-semibold text-[#23C286] inline-flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2.5">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={clsx("mt-1 h-2 w-2 rounded-full shrink-0", a.sev === "high" ? "bg-[#E5715C]" : a.sev === "medium" ? "bg-[#D6A63E]" : "bg-[#5f7268]")} />
                <div className="min-w-0">
                  <p className="text-sm text-white capitalize">{a.kind.replace("_", " ")} · <span className="tnum">{a.market}</span></p>
                  <p className="text-xs admin-faint truncate">{a.note} · {a.time} ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* top markets */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b admin-line">
          <h2 className="text-sm font-semibold text-white">Market activity</h2>
          <span className="admin-chip"><Gavel className="h-3.5 w-3.5" /> Circuit breakers armed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="text-left text-[11px] admin-faint border-b admin-line">
                <th className="font-medium px-5 py-2.5">Pair</th>
                <th className="font-medium px-3 py-2.5 text-right">Price</th>
                <th className="font-medium px-3 py-2.5 text-right">24h</th>
                <th className="font-medium px-3 py-2.5 text-right">24h volume</th>
                <th className="font-medium px-5 py-2.5 text-right">Supply</th>
              </tr>
            </thead>
            <tbody>
              {top.map((m) => {
                const chg = (m.price / m.open24h - 1) * 100;
                return (
                  <tr key={m.symbol} className="border-b admin-line last:border-0 admin-row transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{m.pair}</td>
                    <td className="px-3 py-3 text-right tnum text-sm text-white">${fmtPrice(m.price)}</td>
                    <td className={clsx("px-3 py-3 text-right tnum text-sm font-semibold", chg >= 0 ? "text-[#23C286]" : "text-[#E5715C]")}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</td>
                    <td className="px-3 py-3 text-right tnum text-sm admin-soft">{fmtUsd(m.quoteVolume24h)}</td>
                    <td className="px-5 py-3 text-right tnum text-sm admin-soft">{fmtCompact(m.supply)} t</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
