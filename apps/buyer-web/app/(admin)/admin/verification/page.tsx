"use client";

import { useState } from "react";
import { useProjects } from "@/lib/useProjects";
import { patchProject } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { STAGES, stageIndex } from "@/lib/pipeline";
import { fmtCompact, fmtUsd, timeAgo, clsx } from "@/lib/format";
import { Check, ChevronRight, X, MessageSquareWarning, Coins, Loader2, FileText } from "lucide-react";

export default function AdminVerification() {
  const { projects, loading, patchLocal } = useProjects();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"queue" | "live" | "all">("queue");

  const rows = projects.filter((p) =>
    filter === "queue" ? p.status === "pending" : filter === "live" ? p.status === "live" : true,
  );

  const act = async (id: string, action: "advance" | "approve" | "reject" | "request_info", label: string) => {
    setBusy(id + action);
    try {
      const note = action === "reject" ? "Documentation incomplete — resubmit PDD" : action === "request_info" ? "Please provide updated verifier certificate" : undefined;
      const rec = await patchProject(id, action, note);
      patchLocal(rec);
      toast.success(label, action === "approve" ? `Tokenised as ${rec.tokenId} · now LIVE` : `${rec.name} → ${rec.stage}`);
    } catch (e) {
      toast.error("Action failed", String(e));
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    queue: projects.filter((p) => p.status === "pending").length,
    live: projects.filter((p) => p.status === "live").length,
    all: projects.length,
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-white">Verification pipeline</h1>
          <p className="text-sm admin-soft mt-0.5">Advance, approve, or reject seller projects. Approval triggers a multi-sig mint.</p>
        </div>
        <div className="flex gap-1 rounded-xl border admin-line p-1">
          {(["queue", "live", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors", filter === f ? "bg-[#23C286] text-[#06110B]" : "admin-soft hover:text-white")}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-12 grid place-items-center admin-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="admin-card p-12 text-center admin-soft text-sm">Nothing in this view.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const idx = stageIndex(p.stage);
            const atApproval = p.stage === "Approval" || p.stage === "Tokenization";
            const rejected = p.status === "rejected";
            return (
              <div key={p.id} className="admin-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="grid place-items-center h-10 w-10 rounded-lg bg-[#12241C] text-[#23C286] shrink-0">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-xs admin-faint mt-0.5">{p.sellerName} · {p.country} · {p.standard} · Vintage {p.vintage}</p>
                      <p className="text-xs admin-soft mt-1 tnum">{fmtCompact(p.expectedAnnual)} tCO₂e/yr · {fmtUsd(p.price)} indicative · submitted {timeAgo(p.time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.tokenId && <span className="admin-chip !text-[#23C286] !border-[#23C286]/40 tnum">{p.tokenId}</span>}
                    <span className={clsx("admin-chip capitalize", rejected ? "!text-[#E5715C] !border-[#E5715C]/40" : p.status === "live" ? "!text-[#23C286] !border-[#23C286]/40" : "!text-[#D6A63E] !border-[#D6A63E]/40")}>
                      {p.status}
                    </span>
                  </div>
                </div>

                {/* stage rail */}
                <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
                  {STAGES.map((s, i) => (
                    <div key={s} className="flex items-center shrink-0">
                      <span className={clsx("grid place-items-center h-6 rounded-md px-2 text-[10px] font-semibold whitespace-nowrap",
                        i < idx ? "bg-[#12241C] text-[#23C286]" : i === idx ? (rejected ? "bg-[#2A1512] text-[#E5715C]" : "bg-[#23C286] text-[#06110B]") : "bg-[#0E1712] admin-faint")}>
                        {i < idx ? <Check className="h-3 w-3" /> : s}
                      </span>
                      {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 admin-faint mx-0.5" />}
                    </div>
                  ))}
                </div>

                {p.note && <p className="mt-3 text-xs text-[#D6A63E] bg-[#1E1A0E] rounded-lg px-3 py-2">Note: {p.note}</p>}

                {/* actions */}
                {p.status === "pending" && (
                  <div className="mt-4 pt-4 border-t admin-line flex flex-wrap gap-2">
                    {atApproval ? (
                      <button
                        onClick={() => act(p.id, "approve", "Approved & tokenised")}
                        disabled={!!busy}
                        className="btn bg-[#23C286] text-[#06110B] px-4 py-2 text-sm font-semibold hover:brightness-110"
                      >
                        {busy === p.id + "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />} Approve &amp; mint (multi-sig)
                      </button>
                    ) : (
                      <button
                        onClick={() => act(p.id, "advance", "Stage advanced")}
                        disabled={!!busy}
                        className="btn bg-[#16221C] text-white border border-[#24352C] px-4 py-2 text-sm font-semibold hover:bg-[#1B2A22]"
                      >
                        {busy === p.id + "advance" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Advance stage
                      </button>
                    )}
                    <button onClick={() => act(p.id, "request_info", "Info requested")} disabled={!!busy} className="btn bg-transparent admin-soft border border-[#24352C] px-4 py-2 text-sm hover:text-white">
                      <MessageSquareWarning className="h-4 w-4" /> Request info
                    </button>
                    <button onClick={() => act(p.id, "reject", "Project rejected")} disabled={!!busy} className="btn bg-transparent text-[#E5715C] border border-[#E5715C]/30 px-4 py-2 text-sm hover:bg-[#2A1512]">
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
