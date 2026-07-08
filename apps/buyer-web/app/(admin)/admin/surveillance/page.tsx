"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { AdminStat } from "@/components/admin/AdminShell";
import { toast } from "@/components/ui/Toast";
import { fmtPrice, clsx } from "@/lib/format";
import { TriangleAlert, OctagonPause, Play, Radar } from "lucide-react";

interface Alert { id: string; kind: string; market: string; sev: "low" | "medium" | "high"; note: string; time: string; }

const ALERTS: Alert[] = [
  { id: "a1", kind: "Wash trading", market: "COOK-UG25", sev: "medium", note: "Self-crossing between 3 linked accounts", time: "4m" },
  { id: "a2", kind: "Pump & dump", market: "BIO-KE24", sev: "high", note: "+14% on 6× median volume in 6 min", time: "1h" },
  { id: "a3", kind: "Spoofing / layering", market: "DAC-IS25", sev: "low", note: "Large asks pulled before fill, 12 events", time: "22m" },
  { id: "a4", kind: "Insider watch", market: "BLUE-ID24", sev: "medium", note: "Accumulation ahead of verifier update", time: "3h" },
];

export default function AdminSurveillance() {
  const markets = useStore((s) => s.markets);
  const [halted, setHalted] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  const toggleHalt = (symbol: string) => {
    setHalted((prev) => {
      const next = !prev[symbol];
      toast[next ? "info" : "success"](next ? "Market halted" : "Trading resumed", `${symbol} · circuit breaker ${next ? "engaged" : "released"}`);
      return { ...prev, [symbol]: next };
    });
  };

  const openAlerts = ALERTS.filter((a) => !resolved[a.id]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display text-xl font-semibold text-white">Market surveillance</h1>
        <p className="text-sm admin-soft mt-0.5">Real-time abuse detection and per-market circuit breakers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStat label="Open alerts" value={String(openAlerts.length)} sub="ML-flagged" tone={openAlerts.length ? "warn" : "good"} />
        <AdminStat label="High severity" value={String(openAlerts.filter((a) => a.sev === "high").length)} sub="needs action" tone="crit" />
        <AdminStat label="Markets halted" value={String(Object.values(halted).filter(Boolean).length)} sub="circuit breakers" />
        <AdminStat label="Auto-halts (24h)" value="3" sub="±X% band trips" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* alerts */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-[#D6A63E]" /> Alert feed</h2>
          <div className="space-y-2.5">
            {openAlerts.length === 0 && <p className="text-sm admin-faint py-6 text-center">All clear.</p>}
            {openAlerts.map((a) => (
              <div key={a.id} className="rounded-lg border admin-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={clsx("mt-1 h-2 w-2 rounded-full shrink-0", a.sev === "high" ? "bg-[#E5715C]" : a.sev === "medium" ? "bg-[#D6A63E]" : "bg-[#5f7268]")} />
                    <div className="min-w-0">
                      <p className="text-sm text-white">{a.kind} · <span className="tnum">{a.market}</span></p>
                      <p className="text-xs admin-faint">{a.note} · {a.time} ago</p>
                    </div>
                  </div>
                  <button onClick={() => { setResolved((p) => ({ ...p, [a.id]: true })); toast.success("Alert resolved", `${a.kind} · ${a.market}`); }} className="admin-chip shrink-0 hover:!text-white">
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* circuit breakers */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Radar className="h-4 w-4 text-[#23C286]" /> Circuit breakers</h2>
          <div className="space-y-1.5">
            {markets.slice(0, 7).map((m) => {
              const isHalted = halted[m.symbol];
              return (
                <div key={m.symbol} className="flex items-center justify-between rounded-lg px-3 py-2 admin-row">
                  <div>
                    <p className="text-sm font-medium text-white tnum">{m.pair}</p>
                    <p className="text-[11px] admin-faint">Band ±10% / 5m · <span className="tnum">${fmtPrice(m.price)}</span></p>
                  </div>
                  <button
                    onClick={() => toggleHalt(m.symbol)}
                    className={clsx("btn px-3 py-1.5 text-xs font-semibold", isHalted ? "bg-[#12241C] text-[#23C286] border border-[#23C286]/30" : "bg-transparent text-[#E5715C] border border-[#E5715C]/30 hover:bg-[#2A1512]")}
                  >
                    {isHalted ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><OctagonPause className="h-3.5 w-3.5" /> Halt</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
