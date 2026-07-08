"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, TextInput, FormError, SubmitButton, postJson } from "@/components/auth/bits";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await postJson("/api/auth/reset-password", { email, token, password });
      router.push(res.next ?? "/login?reset=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="card p-7 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Invalid reset link</h1>
        <p className="text-[13px] text-ink-soft mb-5">
          This link is incomplete or has expired. Request a fresh one.
        </p>
        <Link href="/forgot-password" className="btn-primary justify-center">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <p className="eyebrow mb-1.5">Account recovery</p>
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Choose a new password</h1>
      <p className="text-[13px] text-ink-soft mb-5">
        For <span className="font-semibold text-ink">{email}</span>. All existing sessions will be signed out.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="New password">
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="10+ characters, letters & digits"
          />
        </Field>
        <Field label="Confirm password">
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the password"
          />
        </Field>
        <SubmitButton busy={busy}>Update password</SubmitButton>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
