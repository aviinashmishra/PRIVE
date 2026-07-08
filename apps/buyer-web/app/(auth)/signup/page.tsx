"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, TextInput, FormError, SubmitButton, postJson } from "@/components/auth/bits";
import { clsx } from "@/lib/format";
import { LineChart, Building2 } from "lucide-react";

const roles = [
  { key: "buyer", label: "Trader", desc: "Buy, trade & offset credits", icon: LineChart },
  { key: "seller", label: "Seller", desc: "List & tokenise projects", icon: Building2 },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await postJson("/api/auth/signup", { name, email, password, role });
      router.push(res.next ?? "/verify-email");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card p-7">
      <p className="eyebrow mb-1.5">Get started</p>
      <h1 className="font-display text-2xl font-semibold text-ink mb-5">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid grid-cols-2 gap-2.5">
          {roles.map((r) => {
            const Icon = r.icon;
            const active = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={clsx(
                  "rounded-xl border p-3 text-left transition-colors",
                  active ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20" : "border-line hover:border-line-strong",
                )}
              >
                <Icon className={clsx("h-4 w-4 mb-1.5", active ? "text-brand-600" : "text-ink-faint")} />
                <p className="text-[13px] font-semibold text-ink leading-none">{r.label}</p>
                <p className="text-[11px] text-ink-faint mt-1">{r.desc}</p>
              </button>
            );
          })}
        </div>
        <Field label={role === "seller" ? "Company name" : "Full name"}>
          <TextInput
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={role === "seller" ? "Verdant Terra Ltd" : "Ada Verde"}
            autoComplete="name"
          />
        </Field>
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
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="10+ characters, letters & digits"
          />
        </Field>
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="mt-5 text-center text-[13px] text-ink-soft">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
