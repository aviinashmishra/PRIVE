"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const tick = useStore((s) => s.tick);
  const applyWallet = useStore((s) => s.applyWallet);
  // Gate on mount: store seeds time/random-dependent data, so we render a stable
  // shell on the server and swap to live content on the client — no hydration mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(tick, 1400);
    // hydrate cash + holdings from the server-authoritative wallet
    void import("@/lib/api").then(async (api) => {
      try {
        const w = await api.getWallet();
        applyWallet(w.usd, w.holdings);
      } catch {
        /* unauthenticated or offline — the seeded local wallet remains */
      }
    });
    return () => clearInterval(id);
  }, [tick, applyWallet]);

  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-4 animate-pulse-dot">
          <Logo mark />
          <p className="text-sm text-ink-faint">Connecting to live markets…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
