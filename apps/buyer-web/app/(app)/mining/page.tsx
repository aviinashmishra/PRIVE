"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import { toast } from "@/components/ui/Toast";
import { fmtCompact, fmtQty, timeAgo, clsx } from "@/lib/format";
import { Pickaxe, Flame, Leaf, Footprints, Sun, Users, TreePine, Zap, Trophy, ArrowRight } from "lucide-react";

const actions = [
  { key: "steps", label: "Log 12,480 steps", sub: "Health sync · GPS verified", points: 120, icon: Footprints },
  { key: "checkin", label: "Daily check-in", sub: "Keep your streak alive", points: 50, icon: Flame },
  { key: "utility", label: "Upload utility bill", sub: "Reduced consumption", points: 80, icon: Zap },
  { key: "referral", label: "Refer a friend", sub: "Both earn credits", points: 400, icon: Users },
  { key: "tree", label: "Tree-planting drive", sub: "Geotagged + NGO verified", points: 200, icon: TreePine },
  { key: "solar", label: "Green merchant purchase", sub: "Receipt scanned", points: 90, icon: Sun },
];

const leaderboard = [
  { rank: 1, name: "A. Mehta", city: "Mumbai", pts: 18420 },
  { rank: 2, name: "L. Okoro", city: "Lagos", pts: 15980 },
  { rank: 3, name: "You", city: "Mumbai", pts: 3420, you: true },
  { rank: 4, name: "S. Haryanto", city: "Jakarta", pts: 3110 },
  { rank: 5, name: "M. Silva", city: "São Paulo", pts: 2890 },
];

export default function MiningPage() {
  const points = useStore((s) => s.points);
  const co2 = useStore((s) => s.co2SavedKg);
  const streak = useStore((s) => s.streak);
  const log = useStore((s) => s.logMiningAction);
  const convert = useStore((s) => s.convertPoints);
  const miningLog = useStore((s) => s.miningLog);
  const [convertAmt, setConvertAmt] = useState("");

  const doAction = (label: string, pts: number) => {
    log(label, pts);
    toast.success(`+${pts} points earned`, label);
  };

  const doConvert = () => {
    const amt = parseFloat(convertAmt) || points;
    if (amt <= 0 || amt > points) { toast.error("Enter a valid amount", `You have ${fmtCompact(points)} points.`); return; }
    const credits = (amt / 1000).toFixed(3);
    convert(amt);
    toast.success(`Converted to ${credits} PRIVE-CO₂`, `${fmtCompact(amt)} points redeemed`);
    setConvertAmt("");
  };

  const liveLeaderboard = leaderboard.map((r) => (r.you ? { ...r, pts: points } : r)).sort((a, b) => b.pts - a.pts).map((r, i) => ({ ...r, rank: i + 1 }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Mining Hub</h2>
        <p className="text-sm text-ink-soft mt-1">Proof-of-Green-Action — earn points for verified eco-actions, convert them to real credits.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prive points" value={fmtCompact(points)} sub="≈ this month" icon={<Pickaxe className="h-4 w-4" />} tone="brand" />
        <StatCard label="Day streak" value={`${streak} 🔥`} sub="don't break it" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="CO₂ saved" value={`${co2} kg`} sub="from your actions" icon={<Leaf className="h-4 w-4" />} />
        <StatCard label="Conversion rate" value="1,000 : 1" sub="points per credit" icon={<Zap className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* earn actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Earn today</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.key}
                    onClick={() => doAction(a.label, a.points)}
                    className="group flex items-center gap-3 rounded-xl border border-line p-3.5 text-left hover:border-brand-300 hover:bg-brand-50/40 transition-all"
                  >
                    <span className="grid place-items-center h-10 w-10 rounded-lg bg-brand-50 text-brand-600 shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{a.label}</p>
                      <p className="text-xs text-ink-faint truncate">{a.sub}</p>
                    </div>
                    <span className="tnum text-sm font-bold text-brand-700 shrink-0">+{a.points}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* streak calendar */}
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">14-day streak</h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => {
                const active = i < streak;
                const today = i === streak - 1;
                return (
                  <div
                    key={i}
                    className={clsx(
                      "aspect-square rounded-lg grid place-items-center text-xs font-medium",
                      today ? "bg-brand-600 text-white ring-2 ring-brand-200 ring-offset-2" : active ? "bg-brand-100 text-brand-700" : "bg-mist text-ink-faint",
                    )}
                  >
                    {active ? "🔥" : i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* right: convert + activity + leaderboard */}
        <div className="space-y-6">
          <div className="card p-6 bg-gradient-to-br from-brand-50 to-paper border-brand-200">
            <h3 className="font-semibold text-ink mb-1">Convert to credits</h3>
            <p className="text-xs text-ink-soft mb-4">Redeem points for fractional PRIVE-CO₂.</p>
            <div className="flex items-center rounded-xl border border-line bg-paper px-3 py-2.5 mb-3 focus-within:border-brand-400">
              <input
                value={convertAmt}
                onChange={(e) => setConvertAmt(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={String(points)}
                inputMode="numeric"
                className="flex-1 bg-transparent outline-none tnum text-sm"
              />
              <span className="text-xs text-ink-faint">pts</span>
            </div>
            <div className="flex justify-between text-xs mb-4">
              <span className="text-ink-faint">You receive</span>
              <span className="tnum font-semibold text-brand-700">{(((parseFloat(convertAmt) || points) / 1000)).toFixed(3)} PRIVE-CO₂</span>
            </div>
            <button onClick={doConvert} className="btn-primary w-full">Convert <ArrowRight className="h-4 w-4" /></button>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Leaderboard · Mumbai</h3>
            <div className="space-y-2.5">
              {liveLeaderboard.map((r) => (
                <div key={r.name} className={clsx("flex items-center gap-3 rounded-lg px-2 py-1.5", r.you && "bg-brand-50")}>
                  <span className={clsx("tnum text-sm font-bold w-5", r.rank <= 3 ? "text-gold" : "text-ink-faint")}>{r.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm truncate", r.you ? "font-bold text-brand-700" : "font-medium text-ink")}>{r.name}</p>
                    <p className="text-xs text-ink-faint">{r.city}</p>
                  </div>
                  <span className="tnum text-sm font-semibold text-ink">{fmtCompact(r.pts)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Recent activity</h3>
            <div className="space-y-3">
              {miningLog.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink">{e.type}</p>
                    <p className="text-xs text-ink-faint">{timeAgo(e.time)}</p>
                  </div>
                  <span className="tnum text-sm font-semibold text-brand-700">+{e.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
