"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui/StatCard";
import { toast } from "@/components/ui/Toast";
import { getMining, postMiningAction, postMiningConvert, ApiMiningPayload, ApiMiningStats } from "@/lib/api";
import { fmtCompact, fmtQty, timeAgo, clsx } from "@/lib/format";
import {
  Pickaxe, Flame, Leaf, Footprints, Sun, Users, TreePine, Zap, Trophy, ArrowRight,
  Loader2, CheckCircle2, Link2,
} from "lucide-react";

// icon per action key — the catalog itself (labels/points) comes from the server
const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  steps: Footprints,
  checkin: Flame,
  utility: Zap,
  referral: Users,
  tree: TreePine,
  solar: Sun,
};

export default function MiningPage() {
  const applyWallet = useStore((s) => s.applyWallet);

  const [data, setData] = useState<ApiMiningPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertAmt, setConvertAmt] = useState("");

  const refresh = useCallback(async () => {
    try {
      setData(await getMining());
    } catch {
      /* keep prior state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats: ApiMiningStats | undefined = data?.stats;
  const points = stats?.points ?? 0;
  const pointsPerCredit = data?.pointsPerCredit ?? 1000;

  const patchStats = (next: ApiMiningStats) =>
    setData((prev) => (prev ? { ...prev, stats: next } : prev));

  const doAction = async (key: string, label: string) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const res = await postMiningAction(key);
      patchStats(res.stats);
      toast.success(`+${res.points} points earned`, label);
      void refresh(); // leaderboard may have shifted
    } catch (e) {
      toast.error("Not counted", e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  };

  const doConvert = async () => {
    if (converting) return;
    const amt = Math.floor(parseFloat(convertAmt)) || points;
    if (amt <= 0 || amt > points) {
      toast.error("Enter a valid amount", `You have ${fmtCompact(points)} points.`);
      return;
    }
    setConverting(true);
    try {
      const res = await postMiningConvert(amt);
      patchStats(res.stats);
      applyWallet(res.wallet.usd, res.wallet.holdings);
      toast.success(
        `Converted to ${res.credits.toFixed(3)} PRIVE-CO₂`,
        res.txHash ? `Anchored on-chain · ${res.txHash.slice(0, 10)}…` : `${fmtCompact(amt)} points redeemed`,
      );
      setConvertAmt("");
    } catch (e) {
      toast.error("Conversion failed", e instanceof Error ? e.message : String(e));
    } finally {
      setConverting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const leaderboard = data?.leaderboard ?? [];
  const actions = data?.actions ?? [];
  const doneToday = new Set(stats?.doneToday ?? []);
  const streak = stats?.streak ?? 0;
  const previewCredits = ((Math.floor(parseFloat(convertAmt)) || points) / pointsPerCredit);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Mining Hub</h2>
        <p className="text-sm text-ink-soft mt-1">Proof-of-Green-Action — earn points for verified eco-actions, convert them to real credits.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prive points" value={fmtCompact(points)} sub={`${fmtCompact(stats?.earned ?? 0)} lifetime`} icon={<Pickaxe className="h-4 w-4" />} tone="brand" />
        <StatCard label="Day streak" value={`${streak} 🔥`} sub="don't break it" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="CO₂ saved" value={`${stats?.co2SavedKg ?? 0} kg`} sub="from your actions" icon={<Leaf className="h-4 w-4" />} />
        <StatCard label="Credits minted" value={fmtQty(stats?.creditsMinted ?? 0)} sub={`${fmtCompact(pointsPerCredit)} : 1 rate`} icon={<Zap className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* earn actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Earn today</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {actions.map((a) => {
                const Icon = ACTION_ICONS[a.key] ?? Zap;
                const done = doneToday.has(a.key);
                const busy = busyKey === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => doAction(a.key, a.label)}
                    disabled={done || busy}
                    className={clsx(
                      "group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                      done
                        ? "border-line bg-mist/50 opacity-60 cursor-default"
                        : "border-line hover:border-brand-300 hover:bg-brand-50/40",
                    )}
                  >
                    <span className="grid place-items-center h-10 w-10 rounded-lg bg-brand-50 text-brand-600 shrink-0 group-hover:scale-105 transition-transform">
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{a.label}</p>
                      <p className="text-xs text-ink-faint truncate">{done ? "Completed today ✓" : a.sub}</p>
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
                const active = i < Math.min(streak, 14);
                const today = i === Math.min(streak, 14) - 1;
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

        {/* right: convert + leaderboard + activity */}
        <div className="space-y-6">
          <div className="card p-6 bg-gradient-to-br from-brand-50 to-paper border-brand-200">
            <h3 className="font-semibold text-ink mb-1">Convert to credits</h3>
            <p className="text-xs text-ink-soft mb-4">Redeem points for fractional PRIVE-CO₂ — minted to your wallet, anchored on-chain.</p>
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
              <span className="tnum font-semibold text-brand-700">{previewCredits.toFixed(3)} PRIVE-CO₂</span>
            </div>
            <button onClick={doConvert} disabled={converting || points <= 0} className="btn-primary w-full disabled:opacity-60">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Convert <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Leaderboard</h3>
            <div className="space-y-2.5">
              {leaderboard.length === 0 && <p className="text-xs text-ink-faint">No miners yet — log your first action.</p>}
              {leaderboard.map((r) => (
                <div key={r.rank} className={clsx("flex items-center gap-3 rounded-lg px-2 py-1.5", r.you && "bg-brand-50")}>
                  <span className={clsx("tnum text-sm font-bold w-5", r.rank <= 3 ? "text-gold" : "text-ink-faint")}>{r.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm truncate", r.you ? "font-bold text-brand-700" : "font-medium text-ink")}>{r.you ? "You" : r.name}</p>
                    <p className="text-xs text-ink-faint">{r.country}</p>
                  </div>
                  <span className="tnum text-sm font-semibold text-ink">{fmtCompact(r.points)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Recent activity</h3>
            <div className="space-y-3">
              {(stats?.log ?? []).length === 0 && <p className="text-xs text-ink-faint">Nothing yet — actions and conversions appear here.</p>}
              {(stats?.log ?? []).slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{e.label}</p>
                    <p className="text-xs text-ink-faint flex items-center gap-1">
                      {timeAgo(e.time)}
                      {e.txHash && (
                        <span className="inline-flex items-center gap-0.5 text-brand-600" title={e.txHash}>
                          · <Link2 className="h-3 w-3" /> {e.txHash.slice(0, 8)}…
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={clsx("tnum text-sm font-semibold shrink-0", e.points >= 0 ? "text-brand-700" : "text-ink-soft")}>
                    {e.points >= 0 ? `+${e.points}` : fmtCompact(e.points)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
