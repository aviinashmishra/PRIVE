"use client";

import { useEffect, useState } from "react";
import { useProjects } from "@/lib/useProjects";
import { postProject } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { StageTracker, StatusBadge } from "@/components/ui/StageTracker";
import { TypePill } from "@/components/ui/bits";
import { fmtCompact, fmtUsd, timeAgo, clsx } from "@/lib/format";
import { Plus, Loader2, X, FileText, MapPin } from "lucide-react";

const TYPES = ["Reforestation", "Solar", "Wind", "Blue Carbon", "Biogas", "Direct Air Capture", "Cookstoves"];
const STANDARDS = ["Verra VCS", "Gold Standard", "CDM", "Prive Native"];

export default function SellerProjects() {
  const { projects, loading, addLocal } = useProjects();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", projectType: "Reforestation", standard: "Verra VCS",
    country: "", location: "", vintage: String(new Date().getFullYear()),
    expectedAnnual: "", price: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) setOpen(true);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      const rec = await postProject({
        sellerName: "Verdant Terra Ltd",
        name: form.name.trim(),
        projectType: form.projectType,
        standard: form.standard,
        country: form.country.trim() || "🌍 Global",
        location: form.location.trim() || "—",
        vintage: Number(form.vintage) || new Date().getFullYear(),
        expectedAnnual: Number(form.expectedAnnual) || 0,
        price: Number(form.price) || 0,
      });
      addLocal(rec);
      toast.success("Project submitted", "Entered the verification pipeline · Stage 1");
      setOpen(false);
      setForm({ name: "", projectType: "Reforestation", standard: "Verra VCS", country: "", location: "", vintage: String(new Date().getFullYear()), expectedAnnual: "", price: "" });
    } catch (e) {
      toast.error("Submission failed", String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Projects</h1>
          <p className="text-sm text-ink-soft mt-1">Submit new carbon projects and track them through verification.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-primary"><Plus className="h-4 w-4" /> Submit a project</button>
      </div>

      {open && (
        <div className="card p-6 border-brand-200 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-ink flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" /> New project submission</h2>
            <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Project name" className="sm:col-span-2">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Congo Basin Reforestation" className="inp" />
            </Field>
            <Field label="Project type">
              <select value={form.projectType} onChange={(e) => set("projectType", e.target.value)} className="inp">
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Methodology / standard">
              <select value={form.standard} onChange={(e) => set("standard", e.target.value)} className="inp">
                {STANDARDS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="🇨🇩 DR Congo" className="inp" />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Équateur Province" className="inp" />
            </Field>
            <Field label="Vintage year">
              <input value={form.vintage} onChange={(e) => set("vintage", e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="inp tnum" />
            </Field>
            <Field label="Expected annual issuance (tCO₂e)">
              <input value={form.expectedAnnual} onChange={(e) => set("expectedAnnual", e.target.value.replace(/[^0-9]/g, ""))} placeholder="250000" inputMode="numeric" className="inp tnum" />
            </Field>
            <Field label="Indicative price (USDT)" className="sm:col-span-2">
              <input value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="24.50" inputMode="decimal" className="inp tnum" />
            </Field>
          </div>
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
            <p className="text-xs text-ink-faint flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Documents (PDD, verifier certs) are hashed to IPFS in production.</p>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="btn-outline">Cancel</button>
              <button onClick={submit} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 grid place-items-center text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <TypePill type={p.projectType} />
                  <div>
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{p.country} · {p.location} · {p.standard} · Vintage {p.vintage}</p>
                    <p className="text-xs text-ink-soft mt-1 tnum">{fmtCompact(p.expectedAnnual)} tCO₂e/yr · {fmtUsd(p.price)} indicative · submitted {timeAgo(p.time)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.tokenId && <span className="chip !border-brand-200 !text-brand-700 tnum">{p.tokenId}</span>}
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <StageTracker stage={p.stage} rejected={p.status === "rejected"} />
              {p.note && <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Admin note: {p.note}</p>}
            </div>
          ))}
        </div>
      )}

      <style>{`.inp{width:100%;border:1px solid #E6EEE9;background:#fff;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}.inp:focus{border-color:#39AC7C}`}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="text-xs text-ink-faint">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
