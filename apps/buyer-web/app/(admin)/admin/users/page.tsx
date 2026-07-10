"use client";

import { useEffect, useState } from "react";
import { AdminStat } from "@/components/admin/AdminShell";
import { toast } from "@/components/ui/Toast";
import { fmtUsd, clsx } from "@/lib/format";
import { Search, Snowflake, ShieldCheck, Users, Building2 } from "lucide-react";

interface U {
  id: string; name: string; email?: string; type: "Individual" | "Company"; country: string;
  tier: string; status: "active" | "frozen" | "pending"; vol: number; role?: string;
}

// Registered platform users come from /api/admin/users (real DB rows); this seed
// only illustrates the surrounding book of business in the demo.
const SEED: U[] = [
  { id: "c-2201", name: "Acme Steel Ltd", type: "Company", country: "🇮🇳 IN", tier: "Tier 2", status: "active", vol: 4200000 },
  { id: "u-1088", name: "A. Mehta", type: "Individual", country: "🇮🇳 IN", tier: "Tier 1", status: "active", vol: 12400 },
  { id: "u-1120", name: "S. Haryanto", type: "Individual", country: "🇮🇩 ID", tier: "Tier 1", status: "pending", vol: 0 },
  { id: "u-1133", name: "L. Okoro", type: "Individual", country: "🇳🇬 NG", tier: "Tier 0", status: "frozen", vol: 640 },
];

function tierLabel(t: string): string {
  return t.replace("tier", "Tier ");
}

export default function AdminUsers() {
  const [users, setUsers] = useState<U[]>(SEED);
  const [registered, setRegistered] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data?.length) return;
        const real: U[] = j.data.map((u: Record<string, unknown>) => ({
          id: String(u.id).slice(0, 8),
          name: `${u.name}`,
          email: `${u.email}`,
          role: `${u.role}`,
          type: u.accountType === "company" ? "Company" : "Individual",
          country: `${u.country}`,
          tier: tierLabel(`${u.kycTier}`),
          status: u.locked ? "frozen" : u.verified ? "active" : "pending",
          vol: Number(u.usdBalance) || 0,
        }));
        setRegistered(real.length);
        setUsers([...real, ...SEED]);
      })
      .catch(() => {});
  }, []);

  const toggleFreeze = (id: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== id) return u;
      const next = u.status === "frozen" ? "active" : "frozen";
      toast[next === "frozen" ? "info" : "success"](next === "frozen" ? "Account frozen" : "Account unfrozen", `${u.name} · ${u.id}`);
      return { ...u, status: next as U["status"] };
    }));
  };
  const approve = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "active" } : u)));
    const u = users.find((x) => x.id === id);
    toast.success("KYC approved", `${u?.name} · tier upgraded`);
  };

  const rows = users.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.id.includes(q) ||
      (u.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );
  const companies = users.filter((u) => u.type === "Company").length;
  const pending = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display text-xl font-semibold text-white">User management</h1>
        <p className="text-sm admin-soft mt-0.5">Search, review KYC, and act on any account. PII masked for support roles.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStat label="Registered users" value={String(registered || users.length)} sub="live from the users table" tone="good" />
        <AdminStat label="Companies (KYB)" value={String(companies)} sub="verified developers & buyers" />
        <AdminStat label="Pending verification" value={String(pending)} sub="awaiting email/KYC" tone={pending ? "warn" : "default"} />
        <AdminStat label="Frozen / locked" value={String(users.filter((u) => u.status === "frozen").length)} sub="compliance & lockouts" tone="crit" />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b admin-line">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 admin-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID…" className="admin-input w-full pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] admin-faint border-b admin-line">
                <th className="font-medium px-5 py-2.5">Account</th>
                <th className="font-medium px-3 py-2.5">Type</th>
                <th className="font-medium px-3 py-2.5">KYC</th>
                <th className="font-medium px-3 py-2.5">Status</th>
                <th className="font-medium px-3 py-2.5 text-right">Balance / 30d vol</th>
                <th className="font-medium px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b admin-line last:border-0 admin-row transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center h-8 w-8 rounded-lg bg-[#12241C] text-[#23C286]">
                        {u.type === "Company" ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {u.name}
                          {u.role && <span className="ml-2 admin-chip !py-0 !px-1.5 !text-[9px] uppercase">{u.role}</span>}
                        </p>
                        <p className="text-[11px] admin-faint tnum">{u.email ?? u.id} · {u.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm admin-soft">{u.type}</td>
                  <td className="px-3 py-3"><span className="admin-chip">{u.tier}</span></td>
                  <td className="px-3 py-3">
                    <span className={clsx("text-xs font-semibold capitalize", u.status === "active" ? "text-[#23C286]" : u.status === "frozen" ? "text-[#E5715C]" : "text-[#D6A63E]")}>{u.status}</span>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-sm admin-soft">{fmtUsd(u.vol)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      {u.status === "pending" && (
                        <button onClick={() => approve(u.id)} className="admin-chip !text-[#23C286] hover:!bg-[#12241C]"><ShieldCheck className="h-3.5 w-3.5" /> Approve</button>
                      )}
                      <button onClick={() => toggleFreeze(u.id)} className={clsx("admin-chip", u.status === "frozen" ? "!text-[#23C286]" : "!text-[#E5715C]")}>
                        <Snowflake className="h-3.5 w-3.5" /> {u.status === "frozen" ? "Unfreeze" : "Freeze"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
