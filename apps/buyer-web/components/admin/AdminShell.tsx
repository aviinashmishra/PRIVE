"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalSwitcher } from "@/components/ui/PortalSwitcher";
import { UserMenu } from "@/components/ui/UserMenu";
import { clsx } from "@/lib/format";
import {
  LayoutGrid,
  ClipboardCheck,
  Users,
  Radar,
  Landmark,
  ShieldHalf,
  KeyRound,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/verification", label: "Verification", icon: ClipboardCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/surveillance", label: "Surveillance", icon: Radar },
  { href: "/admin/treasury", label: "Treasury", icon: Landmark },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="admin-root min-h-screen flex">
      {/* sidebar */}
      <aside className="hidden lg:flex flex-col w-[230px] shrink-0 border-r admin-line sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b admin-line">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-[#23C286] text-[#06110B]">
            <ShieldHalf className="h-4 w-4" />
          </span>
          <div className="leading-none">
            <p className="text-sm font-bold text-white">Prive Admin</p>
            <p className="text-[10px] admin-faint mt-0.5">Mission Control</p>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {nav.map((item) => {
            const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-[#23C286] text-[#06110B]" : "admin-soft hover:bg-[#16221C] hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t admin-line">
          <div className="admin-chip w-full justify-center !bg-[#0E1712]">
            <KeyRound className="h-3.5 w-3.5 text-[#23C286]" /> FIDO2 session · Super Admin
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 h-16 border-b admin-line flex items-center justify-between px-5 bg-[#0A0F0C]/85 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="lg:hidden text-sm font-bold text-white">Prive Admin</span>
            <span className="admin-chip">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#23C286] opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#23C286]" />
              </span>
              PRODUCTION
            </span>
            <span className="admin-chip hidden sm:inline-flex">Engine 9,840 TPS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="admin-chip hidden md:inline-flex">⌘K</span>
            <PortalSwitcher current="admin" dark />
            <UserMenu dark />
          </div>
        </header>
        <main className="flex-1 p-5 pb-24 lg:pb-5 max-w-[1360px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminStat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "crit";
}) {
  const c = tone === "good" ? "text-[#23C286]" : tone === "warn" ? "text-[#D6A63E]" : tone === "crit" ? "text-[#E5715C]" : "text-white";
  return (
    <div className="admin-card p-4">
      <p className="text-[11px] admin-faint uppercase tracking-wide">{label}</p>
      <p className={clsx("mt-1.5 font-display text-2xl font-semibold tnum leading-none", c)}>{value}</p>
      {sub && <p className="mt-1.5 text-xs admin-soft">{sub}</p>}
    </div>
  );
}
