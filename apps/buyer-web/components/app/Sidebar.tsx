"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { clsx } from "@/lib/format";
import {
  LayoutDashboard,
  CandlestickChart,
  Wallet,
  Pickaxe,
  Leaf,
  ArrowLeftRight,
  LifeBuoy,
  Sparkles,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: CandlestickChart },
  { href: "/trade/AMZN-RF25", label: "Trade", icon: ArrowLeftRight, match: "/trade" },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/mining", label: "Mining", icon: Pickaxe },
  { href: "/offset", label: "Offset", icon: Leaf },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-[248px] shrink-0 border-r border-line bg-paper/70 h-screen sticky top-0">
      <div className="px-6 h-16 flex items-center border-b border-line">
        <Link href="/dashboard" aria-label="Prive Exchange home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
        <p className="eyebrow px-3 pb-2">Trading</p>
        {nav.map((item) => {
          const active = item.match ? path.startsWith(item.match) : path === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-600 text-white shadow-glow"
                  : "text-ink-soft hover:bg-mist hover:text-ink",
              )}
            >
              <Icon className={clsx("h-[18px] w-[18px]", active ? "text-white" : "text-ink-faint group-hover:text-brand-600")} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-paper p-4">
          <div className="flex items-center gap-2 text-brand-700">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold">Verified Trader</p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
            KYC Tier 2 active. Full trading, withdrawals & OTC unlocked.
          </p>
        </div>
        <Link href="#" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-mist hover:text-ink transition-all">
          <LifeBuoy className="h-[18px] w-[18px] text-ink-faint" />
          Support
        </Link>
      </div>
    </aside>
  );
}
