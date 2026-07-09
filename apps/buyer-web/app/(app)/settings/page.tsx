"use client";

import { useEffect, useState } from "react";
import { Field, TextInput, FormError, FormNotice } from "@/components/auth/bits";
import { UserRound, KeyRound, MonitorSmartphone, ShieldCheck, BadgeCheck } from "lucide-react";
import { clsx } from "@/lib/format";

interface Me {
  email: string;
  name: string;
  role: string;
  accountId: string;
}

interface SessionRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: number;
  current: boolean;
}

function agentLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile device";
  if (/windows/i.test(ua)) return "Windows · browser";
  if (/mac os/i.test(ua)) return "macOS · browser";
  if (/linux/i.test(ua)) return "Linux · browser";
  return "Browser session";
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ ok?: string; err?: string }>({});
  const [savingName, setSavingName] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok?: string; err?: string }>({});
  const [savingPw, setSavingPw] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);

  async function loadAll() {
    const [meRes, seRes] = await Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/auth/sessions", { cache: "no-store" }),
    ]);
    if (meRes.ok) {
      const j = await meRes.json();
      setMe(j.data);
      setName(j.data.name);
    }
    if (seRes.ok) setSessions((await seRes.json()).data);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg({});
    setSavingName(true);
    const r = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json().catch(() => ({}));
    setSavingName(false);
    if (!r.ok) return setProfileMsg({ err: j.error || "Failed to save." });
    setProfileMsg({ ok: "Profile updated." });
    setMe((m) => (m ? { ...m, name } : m));
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg({});
    if (newPw !== confirmPw) return setPwMsg({ err: "New passwords do not match." });
    setSavingPw(true);
    const r = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const j = await r.json().catch(() => ({}));
    setSavingPw(false);
    if (!r.ok) return setPwMsg({ err: j.error || "Failed to change password." });
    setPwMsg({ ok: "Password changed. Other devices were signed out." });
    setCurPw("");
    setNewPw("");
    setConfirmPw("");
    loadAll();
  }

  async function revoke(id?: string) {
    await fetch(id ? `/api/auth/sessions?id=${id}` : "/api/auth/sessions?scope=others", {
      method: "DELETE",
    });
    loadAll();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Account settings</h2>
        <p className="text-sm text-ink-soft mt-1">Profile, security and active devices.</p>
      </div>

      {/* profile */}
      <section className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand-50 text-brand-600">
            <UserRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-semibold text-ink leading-none">Profile</h3>
            <p className="text-xs text-ink-faint mt-1">How you appear across Prive</p>
          </div>
        </div>
        <form onSubmit={saveName} className="space-y-4">
          <FormNotice message={profileMsg.ok ?? null} />
          <FormError message={profileMsg.err ?? null} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Display name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </Field>
            <Field label="Email">
              <TextInput value={me?.email ?? ""} disabled className="opacity-70" />
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <BadgeCheck className="h-4 w-4 text-brand-600" />
              {me ? (
                <>
                  <span className="capitalize font-semibold text-ink-soft">{me.role}</span> account ·
                  ID <span className="tnum">{me.accountId.slice(0, 8)}…</span>
                </>
              ) : (
                "Loading…"
              )}
            </div>
            <button className="btn-primary" disabled={savingName}>
              {savingName ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {/* password */}
      <section className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand-50 text-brand-600">
            <KeyRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-semibold text-ink leading-none">Password</h3>
            <p className="text-xs text-ink-faint mt-1">
              Changing it signs out every other device
            </p>
          </div>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <FormNotice message={pwMsg.ok ?? null} />
          <FormError message={pwMsg.err ?? null} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Current password">
              <TextInput type="password" autoComplete="current-password" required value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </Field>
            <Field label="New password">
              <TextInput type="password" autoComplete="new-password" required minLength={10} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" autoComplete="new-password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={savingPw}>
              {savingPw ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      {/* sessions */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand-50 text-brand-600">
              <MonitorSmartphone className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink leading-none">Active sessions</h3>
              <p className="text-xs text-ink-faint mt-1">Devices currently signed in to your account</p>
            </div>
          </div>
          {sessions.filter((s) => !s.current).length > 0 && (
            <button onClick={() => revoke()} className="btn-outline !px-3.5 !py-2 text-xs">
              Sign out other devices
            </button>
          )}
        </div>
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink flex items-center gap-2">
                  {agentLabel(s.userAgent)}
                  {s.current && (
                    <span className="chip !py-0.5 !px-2 !text-[10px] !border-brand-200 !bg-brand-50/60 text-brand-700">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-faint tnum mt-0.5">
                  {s.ip ?? "IP unavailable"} · since {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              {!s.current && (
                <button
                  onClick={() => revoke(s.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 shrink-0"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {sessions.length === 0 && <li className="py-3 text-sm text-ink-faint">Loading sessions…</li>}
        </ul>
        <p className={clsx("mt-4 text-xs text-ink-faint flex items-center gap-1.5")}>
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
          Sessions are revocable server-side — a revoked device loses access immediately.
        </p>
      </section>
    </div>
  );
}
