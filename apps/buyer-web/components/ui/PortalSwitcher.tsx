"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { clsx } from "@/lib/format";
import { ChevronDown, LineChart, Building2, ShieldHalf } from "lucide-react";

const portals = [
  { key: "buyer", label: "Trader", href: "/dashboard", icon: LineChart, desc: "Buy, trade & offset" },
  { key: "seller", label: "Seller", href: "/seller", icon: Building2, desc: "List & tokenise credits" },
  { key: "admin", label: "Admin", href: "/admin", icon: ShieldHalf, desc: "Mission control" },
];

export function PortalSwitcher({ current, dark = false }: { current: "buyer" | "seller" | "admin"; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = portals.find((p) => p.key === current)!;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const Icon = active.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
          dark ? "border-white/10 bg-white/5 text-white/90 hover:bg-white/10" : "border-line bg-paper text-ink hover:border-line-strong",
        )}
      >
        <Icon className="h-4 w-4 text-brand-500" />
        {active.label}
        <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={clsx("absolute right-0 mt-2 w-60 rounded-2xl border p-1.5 shadow-lift z-50", dark ? "bg-[#12181C] border-white/10" : "bg-paper border-line")}>
          {portals.map((p) => {
            const PIcon = p.icon;
            const isActive = p.key === current;
            return (
              <Link
                key={p.key}
                href={p.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  isActive ? "bg-brand-600 text-white" : dark ? "text-white/80 hover:bg-white/10" : "text-ink-soft hover:bg-mist",
                )}
              >
                <PIcon className={clsx("h-4 w-4", isActive ? "text-white" : "text-brand-500")} />
                <div>
                  <p className="text-sm font-semibold leading-none">{p.label} portal</p>
                  <p className={clsx("text-[11px] mt-0.5", isActive ? "text-white/80" : "text-ink-faint")}>{p.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
