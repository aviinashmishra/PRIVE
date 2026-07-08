import { clsx } from "@/lib/format";

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "brand";
  icon?: React.ReactNode;
}) {
  return (
    <div className={clsx("card p-5", tone === "brand" && "bg-gradient-to-br from-brand-50 to-paper border-brand-200")}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-faint">{label}</p>
        {icon && <span className="text-brand-600">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink tnum leading-none">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
