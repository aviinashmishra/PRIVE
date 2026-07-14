"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, TextInput, FormError, FormNotice, SubmitButton, safeNext, postJson } from "@/components/auth/bits";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notice = params.get("reset")
    ? "Password updated. Sign in with your new password."
    : params.get("next")
      ? "Sign in to continue."
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await postJson("/api/auth/login", { email, password });
      if (res.requiresVerification) {
        router.push(res.next!);
        return;
      }
      router.push(safeNext(params.get("next"), res.next ?? "/dashboard"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card p-7">
      <p className="eyebrow mb-1.5">Welcome back</p>
      <h1 className="font-display text-2xl font-semibold text-ink mb-5">Sign in to Prive</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormNotice message={notice} />
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
        <Field label="Password">
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
        </Field>
        <div className="flex justify-end -mt-1">
          <Link href="/forgot-password" className="text-[13px] font-medium text-brand-700 hover:text-brand-800 link-underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <p className="mt-5 text-center text-[13px] text-ink-soft">
        New to Prive?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
