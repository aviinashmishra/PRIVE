"use client";

import { clsx } from "@/lib/format";
import { Clock3, CheckCircle2, CircleDot } from "lucide-react";

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock3 }> = {
    open: { label: "Open", cls: "border-amber-200 bg-amber-50 text-amber-700", Icon: CircleDot },
    in_progress: { label: "In progress", cls: "border-sky-200 bg-sky-50 text-sky-700", Icon: Clock3 },
    resolved: { label: "Resolved", cls: "border-brand-200 bg-brand-50/70 text-brand-700", Icon: CheckCircle2 },
  };
  const s = map[status] ?? map.open;
  const Icon = s.Icon;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", s.cls)}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}
