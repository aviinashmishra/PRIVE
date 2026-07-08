"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, TextInput, FormError, FormNotice, SubmitButton, postJson } from "@/components/auth/bits";
import { MailCheck } from "lucide-react";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await postJson("/api/auth/verify-email", { email, code });
      router.push(res.next ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    try {
      await postJson("/api/auth/resend-code", { email });
      setNotice("If the address is registered, a new code is on its way.");
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card p-7">
      <span className="mb-4 grid place-items-center h-11 w-11 rounded-2xl bg-brand-50 border border-brand-200">
        <MailCheck className="h-5 w-5 text-brand-600" />
      </span>
      <p className="eyebrow mb-1.5">Email authentication</p>
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Check your inbox</h1>
      <p className="text-[13px] text-ink-soft mb-5">
        We sent a 6-digit code to <span className="font-semibold text-ink">{email || "your email"}</span>. It
        expires in 15 minutes.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormNotice message={notice} />
        <FormError message={error} />
        {!params.get("email") && (
          <Field label="Email">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </Field>
        )}
        <Field label="Verification code">
          <TextInput
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="tnum text-center !text-xl tracking-[.4em] font-bold"
          />
        </Field>
        <SubmitButton busy={busy}>Verify & continue</SubmitButton>
      </form>
      <button
        onClick={resend}
        disabled={cooldown > 0 || !email}
        className="mt-4 w-full text-center text-[13px] font-medium text-brand-700 hover:text-brand-800 disabled:text-ink-faint"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
