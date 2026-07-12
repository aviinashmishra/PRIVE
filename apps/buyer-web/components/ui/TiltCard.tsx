"use client";

import { useRef } from "react";
import { clsx } from "@/lib/format";

/**
 * TiltCard — wraps content in a pointer-tracked 3D tilt with a soft glare
 * that follows the cursor. Purely presentational: children keep their own
 * card styling and interactivity. Motion is disabled for reduced-motion users
 * via the global CSS kill-switch (the transition collapses to ~0ms).
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-ny * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(nx * max).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((nx + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((ny + 0.5) * 100).toFixed(1)}%`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={clsx("tilt-card", className)}
    >
      {children}
      <div className="tilt-glare" aria-hidden />
    </div>
  );
}
