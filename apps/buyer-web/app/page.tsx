import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LandingTicker } from "@/components/marketing/LandingTicker";
import { Sparkline } from "@/components/ui/Sparkline";
import { MARKETS } from "@/lib/data";
import { fmtPrice, fmtCompact } from "@/lib/format";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Link2,
  BarChart3,
  Leaf,
  Globe2,
  LockKeyhole,
  CheckCircle2,
  LineChart,
  Building2,
  ShieldHalf,
} from "lucide-react";

const features = [
  { icon: Zap, title: "24/7 live order book", body: "A Rust matching engine with sub-10ms fills, real candlestick charts, and market depth streamed to you in real time." },
  { icon: Link2, title: "On-chain settlement", body: "Every trade settles on Polygon with Merkle-batched finality. Off-chain speed, on-chain proof." },
  { icon: ShieldCheck, title: "1 token = 1 retired tonne", body: "Minting is blocked unless the registry serial was retired at source. No double-counting, by construction." },
  { icon: BarChart3, title: "Professional terminal", body: "Limit, market, and stop orders. Portfolio P&L, cost basis, and total CO₂ offset potential at a glance." },
  { icon: Leaf, title: "Retire & certify", body: "Burn credits to offset in one click and receive a certificate NFT with a QR link to the on-chain transaction." },
  { icon: LockKeyhole, title: "Institutional custody", body: "MPC wallets, 95%+ cold storage, withdrawal allowlists, and multi-sig on every treasury operation." },
];

const stats = [
  { k: "CO₂ retired on Prive", v: "4.81M t" },
  { k: "24h traded volume", v: "$18.4M" },
  { k: "Verified projects live", v: "40+" },
  { k: "Platform uptime", v: "99.97%" },
];

export default function Landing() {
  const preview = MARKETS.slice(0, 5);
  return (
    <div className="min-h-screen bg-canvas">
      {/* NAV */}
      <header className="sticky top-0 z-50 glass border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
            <a href="#markets" className="link-underline hover:text-ink">Markets</a>
            <a href="#features" className="link-underline hover:text-ink">Platform</a>
            <a href="#integrity" className="link-underline hover:text-ink">Integrity</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-sm font-medium text-ink-soft hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary">
              Launch app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 grain" />
        <div
          className="absolute -z-10 inset-x-0 top-0 h-[560px]"
          style={{ background: "radial-gradient(60% 70% at 50% -10%, rgba(14,124,85,.10), transparent 60%)" }}
        />
        <div className="max-w-6xl mx-auto px-5 pt-20 pb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/60 px-4 py-1.5 text-xs font-semibold text-brand-700 mb-7">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Live markets · Blockchain-settled
          </div>

          <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.05] tracking-tight text-ink max-w-4xl mx-auto text-balance">
            The exchange where the{" "}
            <span className="text-brand-600">planet</span> and the{" "}
            <span className="italic">market</span> both win.
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Trade tokenised carbon credits 24/7 with the reliability of a crypto exchange and the
            integrity of a public registry. Real order books, instant settlement, verified impact.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary text-base px-7 py-3.5">
              Start trading <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/markets" className="btn-outline text-base px-7 py-3.5">
              Explore markets
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-faint flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> No gas fees · Retire in one click · Audit-ready certificates
          </p>
        </div>

        <LandingTicker />
      </section>

      {/* STATS */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.k} className="card p-6">
              <p className="font-display text-3xl font-semibold text-ink tnum">{s.v}</p>
              <p className="mt-1.5 text-sm text-ink-soft">{s.k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MARKETS PREVIEW */}
      <section id="markets" className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="eyebrow mb-2">Live now</p>
            <h2 className="font-display text-3xl font-semibold text-ink">Top carbon markets</h2>
          </div>
          <Link href="/markets" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1.5">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-ink-faint border-b border-line">
                <th className="font-medium px-6 py-3">Market</th>
                <th className="font-medium px-6 py-3 hidden sm:table-cell">Type</th>
                <th className="font-medium px-6 py-3 text-right">Price</th>
                <th className="font-medium px-6 py-3 text-right hidden md:table-cell">24h Vol</th>
                <th className="font-medium px-6 py-3 text-right">7d</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((m) => {
                const spark = m.candles.slice(-40).map((c) => c.close);
                const up = m.candles[m.candles.length - 1].close >= m.candles[m.candles.length - 40].close;
                return (
                  <tr key={m.symbol} className="border-b border-line last:border-0 hover:bg-mist/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-ink">{m.symbol}</p>
                      <p className="text-xs text-ink-faint">{m.name}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-sm text-ink-soft">{m.projectType}</td>
                    <td className="px-6 py-4 text-right tnum font-semibold text-ink">${fmtPrice(m.price)}</td>
                    <td className="px-6 py-4 text-right tnum text-sm text-ink-soft hidden md:table-cell">${fmtCompact(m.quoteVolume24h)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <Sparkline data={spark} up={up} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="eyebrow mb-2">Exchange-grade, planet-safe</p>
          <h2 className="font-display text-4xl font-semibold text-ink text-balance">
            Everything a serious carbon trader needs
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-7 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300">
                <div className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 mb-5">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* INTEGRITY */}
      <section id="integrity" className="max-w-6xl mx-auto px-5 py-16">
        <div className="card overflow-hidden grid lg:grid-cols-2">
          <div className="p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 text-brand-700 text-sm font-semibold mb-4">
              <Globe2 className="h-4 w-4" /> Transparency Explorer
            </div>
            <h2 className="font-display text-3xl font-semibold text-ink mb-4 text-balance">
              Every credit, traceable from forest to retirement
            </h2>
            <p className="text-ink-soft leading-relaxed mb-6">
              Anyone — no login — can follow a credit's full lifecycle on-chain: issuance,
              verification, every trade, and its final retirement. Provenance is anchored to IPFS
              and the registry serial is retired at source before a single token is minted.
            </p>
            <ul className="space-y-3">
              {["Registry serials retired before mint", "IPFS-anchored project documents", "Public on-chain retirement certificates", "Continuous ledger ↔ chain reconciliation"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-ink">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/explorer" className="btn-outline mt-6 inline-flex">
              Open the Transparency Explorer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative bg-gradient-to-br from-brand-600 to-forest p-10 lg:p-12 text-white flex flex-col justify-center">
            <div className="absolute inset-0 grain opacity-30" />
            <p className="relative text-xs uppercase tracking-widest text-brand-100/80 mb-2">Retirement certificate</p>
            <p className="relative font-display text-2xl font-semibold mb-6">PRV-CERT-8814</p>
            <div className="relative space-y-3 text-sm">
              {[
                ["Project", "Amazon Reforestation 2025"],
                ["Retired", "120.00 tCO₂e"],
                ["Beneficiary", "Personal · FY2025"],
                ["Tx hash", "0x7a1c…e93f"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/15 pb-2">
                  <span className="text-brand-100/70">{k}</span>
                  <span className="font-medium tnum">{v}</span>
                </div>
              ))}
            </div>
            <div className="relative mt-6 inline-flex items-center gap-2 text-xs text-brand-100/80">
              <ShieldCheck className="h-4 w-4" /> Verified on Polygon
            </div>
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="eyebrow mb-2">Three portals, one ecosystem</p>
          <h2 className="font-display text-4xl font-semibold text-ink text-balance">Choose how you enter</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/dashboard", title: "Trader", body: "Buy, trade, mine and offset carbon credits with a pro terminal.", icon: LineChart, cta: "Enter terminal" },
            { href: "/seller", title: "Seller", body: "List projects, move through verification, and tokenise your credits.", icon: Building2, cta: "Open seller portal" },
            { href: "/admin", title: "Admin", body: "Mission control: verification, surveillance, treasury and users.", icon: ShieldHalf, cta: "Open admin console" },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.href} href={p.href} className="card p-7 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 mb-5"><Icon className="h-5 w-5" /></div>
                <h3 className="font-semibold text-lg text-ink mb-2">{p.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed mb-4">{p.body}</p>
                <span className="text-sm font-semibold text-brand-700 inline-flex items-center gap-1.5">
                  {p.cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-forest text-white text-center px-6 py-16">
          <div className="absolute inset-0 grain opacity-40" />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(57,172,124,.35), transparent 60%)" }}
          />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4 text-balance">
              Trade the market. Heal the planet.
            </h2>
            <p className="text-brand-100/80 max-w-xl mx-auto mb-8">
              Join the exchange built for both. Onboard in minutes, mine your first credits, and
              make your first offset today.
            </p>
            <Link href="/signup" className="btn bg-white text-forest px-8 py-3.5 text-base font-semibold hover:bg-brand-50 inline-flex">
              Launch the app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-ink-faint">© 2026 Prive Exchange · A demonstration build. Not investment advice.</p>
          <div className="flex gap-6 text-sm text-ink-soft">
            <a href="#" className="hover:text-ink">Terms</a>
            <a href="#" className="hover:text-ink">Privacy</a>
            <a href="#" className="hover:text-ink">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
