import { STAGES, stageIndex } from "@/lib/pipeline";
import { clsx } from "@/lib/format";
import { Check } from "lucide-react";

export function StageTracker({ stage, rejected = false, compact = false }: { stage: string; rejected?: boolean; compact?: boolean }) {
  const cur = stageIndex(stage);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        return (
          <div key={s} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={clsx(
                  "grid place-items-center rounded-full text-[11px] font-bold transition-colors",
                  compact ? "h-6 w-6" : "h-7 w-7",
                  rejected && active ? "bg-down text-white" : done ? "bg-brand-600 text-white" : active ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-mist text-ink-faint",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {!compact && (
                <span className={clsx("text-[10px] whitespace-nowrap max-w-[72px] text-center leading-tight", active ? "text-ink font-semibold" : "text-ink-faint")}>
                  {s}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <span className={clsx("h-0.5 w-6 sm:w-8 mx-0.5", i < cur ? "bg-brand-500" : "bg-line")} style={compact ? { marginTop: 0 } : { marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: "bg-brand-50 text-brand-700 border-brand-200",
    approved: "bg-brand-50 text-brand-700 border-brand-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-red-50 text-down border-red-200",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", map[status] ?? "bg-mist text-ink-soft border-line")}>
      {status}
    </span>
  );
}
