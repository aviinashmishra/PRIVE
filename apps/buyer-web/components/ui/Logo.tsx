import { clsx } from "@/lib/format";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-grid place-items-center h-8 w-8 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-800 shadow-glow">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3c-4 3.2-6.5 6.2-6.5 10.2A6.5 6.5 0 0 0 12 20a6.5 6.5 0 0 0 6.5-6.8C18.5 9.2 16 6.2 12 3Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path d="M12 20V9.5M12 13.5 9 11m3 4 3-2.6" stroke="#0B6244" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      {!mark && (
        <span className="font-display text-[19px] font-semibold tracking-tight text-ink leading-none">
          Prive<span className="text-brand-600"> Exchange</span>
        </span>
      )}
    </span>
  );
}
