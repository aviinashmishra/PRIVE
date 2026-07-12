"use client";

import { useEffect, useState } from "react";

export interface SellerBatch {
  tokenId: string;
  name: string;
  projectType: string;
  vintage: number;
  minted: number;
  retired: number;
  price: number;
  soldQty: number;
  soldNotional: number;
}

export interface SellerSummary {
  batches: SellerBatch[];
  monthly: { month: string; notional: number; qty: number }[];
  totals: {
    projects: number;
    live: number;
    pending: number;
    minted: number;
    retired: number;
    soldQty: number;
    grossRevenue: number;
    fee: number;
    netRevenue: number;
  };
}

export function useSellerSummary() {
  const [summary, setSummary] = useState<SellerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSummary(j?.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  return { summary, loading };
}
