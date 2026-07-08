"use client";

import { clsx } from "@/lib/format";
import { ShieldCheck } from "lucide-react";

export function RatingBadge({ rating }: { rating: string }) {
  const tone =
    rating === "AAA"
      ? "text-brand-700 bg-brand-50 border-brand-200"
      : rating === "AA"
        ? "text-brand-600 bg-brand-50/60 border-brand-100"
        : "text-ink-soft bg-mist border-line";
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tnum", tone)}>
      <ShieldCheck className="h-3 w-3" strokeWidth={2.2} />
      {rating}
    </span>
  );
}

export function TypePill({ type }: { type: string }) {
  const map: Record<string, string> = {
    Reforestation: "🌳",
    Solar: "☀️",
    Wind: "🌬️",
    "Blue Carbon": "🌊",
    Biogas: "♻️",
    "Direct Air Capture": "🏭",
    Cookstoves: "🔥",
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-ink-soft">
      <span aria-hidden>{map[type] ?? "🌱"}</span>
      {type}
    </span>
  );
}

export function Delta({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={clsx("tnum font-semibold", up ? "text-up" : "text-down", className)}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
      </span>
      {label}
    </span>
  );
}
