import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const pages = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-50 glass border-b border-line">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink-soft">
            {pages.map((p) => (
              <Link key={p.href} href={p.href} className="link-underline hover:text-ink hidden sm:inline">
                {p.label}
              </Link>
            ))}
            <Link href="/login" className="btn-outline !px-4 !py-2 text-xs">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-14">
        <article
          className="
            [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:text-ink [&_h1]:mb-2
            [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3
            [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink-soft [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_li]:text-[15px] [&_li]:text-ink-soft
            [&_strong]:text-ink [&_table]:w-full [&_table]:text-sm
          "
        >
          {children}
        </article>
      </main>
      <footer className="border-t border-line">
        <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
          <p>© 2026 Prive Exchange. Demonstration platform — not investment advice.</p>
          <div className="flex gap-5">
            {pages.map((p) => (
              <Link key={p.href} href={p.href} className="hover:text-ink">
                {p.label.split(" ")[0]}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
