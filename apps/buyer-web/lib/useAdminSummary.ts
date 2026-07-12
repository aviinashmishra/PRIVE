"use client";

import { useEffect, useState } from "react";

export interface AdminSummary {
  users: { total: number; verified: number; sellers: number; new24h: number };
  orders: { total: number; open: number; notional24h: number; count24h: number };
  retirements: { total: number; tonnes: number };
  projects: { total: number; pending: number; live: number };
  tickets: { open: number; inProgress: number };
  sessions: { active: number };
  treasury: { customerBalances: number };
  alerts: { kind: string; market: string; sev: string; note: string; time: number }[];
}

export function useAdminSummary() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  useEffect(() => {
    fetch("/api/admin/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSummary(j?.data ?? null))
      .catch(() => {});
  }, []);
  return summary;
}
