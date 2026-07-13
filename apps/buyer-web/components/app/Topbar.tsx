"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtUsd, fmtCompact, clsx } from "@/lib/format";
import { Search, Bell, Leaf } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { UserMenu } from "@/components/ui/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/markets": "Markets",
  "/portfolio": "Portfolio",
  "/mining": "Mining Hub",
  "/offset": "Carbon Offset",
};

export function Topbar() {
  const path = usePathname();
  const usd = useStore((s) => s.usd);
  const pv = useStore((s) => s.portfolioValue());
  const platformRetired = useStore((s) => s.platformRetired);

  const title =
    Object.entries(titles).find(([k]) => path.startsWith(k))?.[1] ??
    (path.startsWith("/trade") ? "Trade Terminal" : "Prive");

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line glass">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="lg:hidden">
            <Logo mark />
          </Link>
          <h1 className="font-display text-lg sm:text-xl font-semibold text-ink truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* live global counter — social proof */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/60 pl-2.5 pr-3.5 py-1.5">
            <Leaf className="h-4 w-4 text-brand-600" />
            <div className="leading-none">
              <span className="tnum text-[13px] font-bold text-brand-700">{fmtCompact(platformRetired)} t</span>
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-ink-faint">CO₂ retired</span>
            </div>
          </div>

          <button className="hidden sm:grid place-items-center h-9 w-9 rounded-xl border border-line text-ink-faint hover:text-ink hover:border-line-strong transition-colors" aria-label="Search">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button className="relative grid place-items-center h-9 w-9 rounded-xl border border-line text-ink-faint hover:text-ink hover:border-line-strong transition-colors" aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
          </button>

          <div className="hidden sm:block text-right leading-tight pl-1">
            <p className="text-[11px] text-ink-faint">Available</p>
            <p className="tnum text-sm font-bold text-ink">{fmtUsd(usd)}</p>
          </div>
          <div className="hidden xl:block text-right leading-tight">
            <p className="text-[11px] text-ink-faint">Portfolio</p>
            <p className="tnum text-sm font-bold text-brand-700">{fmtUsd(pv)}</p>
          </div>

          <ThemeToggle />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: "Home" },
    { href: "/markets", label: "Markets" },
    { href: "/trade/AMZN-RF25", label: "Trade", match: "/trade" },
    { href: "/wallet", label: "Wallet" },
    { href: "/mining", label: "Mine" },
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line glass h-16 flex items-stretch">
      {items.map((it) => {
        const active = it.match ? path.startsWith(it.match) : path === it.href;
        return (
          <Link key={it.href} href={it.href} className={clsx("flex-1 grid place-items-center text-xs font-semibold", active ? "text-brand-700" : "text-ink-faint")}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
