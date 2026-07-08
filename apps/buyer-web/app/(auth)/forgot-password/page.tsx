"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, TextInput, FormError, FormNotice, SubmitButton, postJson } from "@/components/auth/bits";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="card p-7">
      <p className="eyebrow mb-1.5">Account recovery</p>
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Reset your password</h1>
      <p className="text-[13px] text-ink-soft mb-5">
        Enter your account email and we&apos;ll send a reset link. The link expires in 30 minutes.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormNotice
          message={sent ? "If that address is registered, a reset link is on its way. Check your inbox." : null}
        />
        <FormError message={error} />
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
      </form>
      <p className="mt-5 text-center text-[13px] text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
