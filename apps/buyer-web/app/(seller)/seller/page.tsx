"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProjects } from "@/lib/useProjects";
import { useSellerSummary } from "@/lib/useSellerSummary";
import { StatCard } from "@/components/ui/StatCard";
import { StageTracker, StatusBadge } from "@/components/ui/StageTracker";
import { TypePill } from "@/components/ui/bits";
import { fmtCompact, fmtUsd, clsx } from "@/lib/format";
import { FolderKanban, Boxes, Clock, Coins, ArrowRight, Plus, Loader2 } from "lucide-react";

export default function SellerDashboard() {
  const { projects, loading } = useProjects();
  const { summary } = useSellerSummary();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setName(j?.data?.name ?? null))
      .catch(() => {});
  }, []);

  const live = projects.filter((p) => p.status === "live");
  const pending = projects.filter((p) => p.status === "pending");
  const issued = summary?.totals.minted ?? live.reduce((a, p) => a + p.expectedAnnual, 0);
  const inPipeline = pending.reduce((a, p) => a + p.expectedAnnual, 0);
  const netRevenue = summary?.totals.netRevenue ?? 0;

  return (
    <div className="space-y-7 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Welcome back{name ? `, ${name}` : ""}</p>
          <h1 className="font-display text-2xl font-semibold text-ink mt-1">Project developer console</h1>
        </div>
        <Link href="/seller/projects?new=1" className="btn-primary"><Plus className="h-4 w-4" /> Submit a project</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Live projects" value={String(live.length)} sub={`${projects.length} total`} icon={<FolderKanban className="h-4 w-4" />} tone="brand" />
        <StatCard label="Credits issued" value={`${fmtCompact(issued)} t`} sub="tokenised & tradable" icon={<Boxes className="h-4 w-4" />} />
        <StatCard label="In verification" value={`${fmtCompact(inPipeline)} t`} sub={`${pending.length} projects pending`} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Net revenue" value={fmtUsd(netRevenue)} sub="ledger sales, after fees" icon={<Coins className="h-4 w-4" />} />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-ink">Verification pipeline</h2>
            <p className="text-xs text-ink-soft mt-0.5">Live status of every project as it moves toward tokenisation.</p>
          </div>
          <Link href="/seller/projects" className="text-sm font-semibold text-brand-700 inline-flex items-center gap-1">
            Manage <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 grid place-items-center text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line p-4 hover:border-line-strong transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <TypePill type={p.projectType} />
                    <div>
                      <p className="font-semibold text-ink text-sm">{p.name}</p>
                      <p className="text-xs text-ink-faint">{p.country} · {p.standard} · {p.vintage} · {fmtCompact(p.expectedAnnual)} t/yr</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.tokenId && <span className="chip !border-brand-200 !text-brand-700 tnum">{p.tokenId}</span>}
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <StageTracker stage={p.stage} rejected={p.status === "rejected"} />
                {p.note && <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Admin note: {p.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
