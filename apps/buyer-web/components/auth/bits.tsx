"use client";

import { clsx } from "@/lib/format";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={clsx(
        "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink",
        "placeholder:text-ink-faint transition-colors",
        "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
        className,
      )}
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 text-[13px] font-medium text-brand-700">
      {message}
    </p>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
      {busy ? "Please wait…" : children}
    </button>
  );
}

// Only same-app relative paths are honoured as post-login targets.
export function safeNext(next: string | null, fallback: string): string {
  return next && /^\/(?!\/)/.test(next) ? next : fallback;
}

export async function postJson(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
  return j as { ok: boolean; next?: string; requiresVerification?: boolean };
}
