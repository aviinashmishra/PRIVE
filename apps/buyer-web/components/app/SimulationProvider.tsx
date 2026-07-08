"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const tick = useStore((s) => s.tick);
  // Gate on mount: store seeds time/random-dependent data, so we render a stable
  // shell on the server and swap to live content on the client — no hydration mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(tick, 1400);
    return () => clearInterval(id);
  }, [tick]);

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
