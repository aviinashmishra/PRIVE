"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "@/lib/format";
import { LogOut, Settings, UserRound } from "lucide-react";

interface Me {
  email: string;
  name: string;
  role: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "PX";
}

export function UserMenu({ dark = false }: { dark?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.data ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-white text-sm font-bold shadow-glow"
        aria-label="Account menu"
      >
        {me ? initials(me.name) : <UserRound className="h-4 w-4" />}
      </button>
      {open && (
        <div
          className={clsx(
            "absolute right-0 mt-2 w-60 rounded-2xl border p-1.5 shadow-lift z-50",
            dark ? "bg-[#12181C] border-white/10" : "bg-paper border-line",
          )}
        >
          <div className="px-3 py-2.5">
            <p className={clsx("text-sm font-semibold truncate", dark ? "text-white" : "text-ink")}>
              {me?.name ?? "Signed in"}
            </p>
            <p className={clsx("text-[11px] truncate", dark ? "text-white/60" : "text-ink-faint")}>
              {me?.email}
            </p>
            {me && (
              <span
                className={clsx(
                  "mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  dark ? "border-white/15 text-white/70" : "border-brand-200 bg-brand-50/60 text-brand-700",
                )}
              >
                {me.role}
              </span>
            )}
          </div>
          {me?.role !== "seller" && (
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={clsx(
                "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                dark ? "text-white/80 hover:bg-white/10" : "text-ink-soft hover:bg-mist",
              )}
            >
              <Settings className="h-4 w-4 text-brand-500" />
              Account settings
            </Link>
          )}
          <button
            onClick={signOut}
            className={clsx(
              "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              dark ? "text-white/80 hover:bg-white/10" : "text-ink-soft hover:bg-mist",
            )}
          >
            <LogOut className="h-4 w-4 text-brand-500" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
