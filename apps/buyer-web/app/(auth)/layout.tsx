import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-canvas flex flex-col">
      <div className="absolute inset-0 -z-10 grain" />
      <div
        className="absolute -z-10 inset-x-0 top-0 h-[480px]"
        style={{ background: "radial-gradient(60% 70% at 50% -10%, rgba(14,124,85,.10), transparent 60%)" }}
      />
      <header className="h-16 flex items-center px-5 max-w-6xl w-full mx-auto">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="pb-8 text-center text-[11px] text-ink-faint flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
        Argon2id · verified email · session revocation — per the Prive security baseline
      </footer>
    </div>
  );
}
