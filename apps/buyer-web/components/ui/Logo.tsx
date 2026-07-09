import { clsx } from "@/lib/format";

// Prive Exchange mark — an emerald shield-leaf with a champagne-gold vein,
// set in a soft-squircle gradient tile. Lockup: display-serif "Prive" +
// letterspaced EXCHANGE descriptor.
export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-grid place-items-center h-9 w-9 rounded-[11px] bg-gradient-to-br from-brand-500 via-brand-700 to-forest shadow-glow ring-1 ring-white/20">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* shield-leaf silhouette */}
          <path
            d="M12 2.6c3.9 1.9 6.7 2.7 8.4 3-0.2 7.5-2.6 12.9-8.4 15.8C6.2 18.5 3.8 13.1 3.6 5.6 5.3 5.3 8.1 4.5 12 2.6Z"
            fill="white"
            fillOpacity="0.96"
          />
          {/* leaf vein — champagne gold */}
          <path
            d="M12 19V8.2M12 12.4 9.2 10m2.8 5.4 3-2.5"
            stroke="#B99A45"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* apex accent */}
          <circle cx="12" cy="6.2" r="0.9" fill="#B99A45" />
        </svg>
        <span className="pointer-events-none absolute inset-0 rounded-[11px] bg-gradient-to-t from-transparent via-white/5 to-white/25" />
      </span>
      {!mark && (
        <span className="leading-none">
          <span className="block font-display text-[19px] font-semibold tracking-tight text-ink">
            Prive
          </span>
          <span className="block font-mono text-[8.5px] font-semibold uppercase tracking-[0.34em] text-brand-600 mt-[3px]">
            Exchange
          </span>
        </span>
      )}
    </span>
  );
}
