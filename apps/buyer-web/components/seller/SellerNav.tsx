"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { UserMenu } from "@/components/ui/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { clsx } from "@/lib/format";
import { LayoutDashboard, FolderKanban, Boxes, LineChart } from "lucide-react";

const nav = [
  { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/projects", label: "Projects", icon: FolderKanban },
  { href: "/seller/inventory", label: "Inventory", icon: Boxes },
  { href: "/seller/revenue", label: "Revenue", icon: LineChart },
];

export function SellerNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden sm:inline chip !border-line-strong">for Sellers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block leading-tight text-right">
              <p className="text-[11px] text-ink-faint">KYB verified · Project Developer</p>
            </div>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {nav.map((item) => {
            const active = item.href === "/seller" ? path === "/seller" : path.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  active ? "border-brand-600 text-ink" : "border-transparent text-ink-faint hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
