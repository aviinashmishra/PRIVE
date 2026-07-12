"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MARKETS } from "@/lib/data";
import { fmtPrice, fmtCompact, clsx } from "@/lib/format";
import { Activity, ArrowRight, ShieldCheck, Flame, TrendingUp } from "lucide-react";

const SYMBOL = "PRIVE-CO2";
const VISIBLE = 42; // candles shown in the chart

interface C {
  o: number;
  h: number;
  l: number;
  c: number;
}

// Deterministic hash → [0,1). Keeps SSR and first client render identical,
// then produces fresh-but-stable order-book/tape numbers on every tick.
function hash01(a: number, b: number): number {
  let x = (a * 374761393 + b * 668265263) | 0;
  x = (x ^ (x >>> 13)) | 0;
  x = Math.imul(x, 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * Hero3D — a live, mouse-tracked 3D trading terminal.
 *
 * The stage sits in a CSS perspective and tilts toward the cursor (lerped in
 * rAF so it feels weighted, not jittery). Panels float at different
 * translateZ depths: candlestick chart, order book, trade tape, and ambient
 * stat chips. Prices tick every 900ms; every 9th tick rolls a new candle.
 * All chrome uses theme tokens so the scene re-skins in light and dark.
 */
export function Hero3D() {
  const market = MARKETS.find((m) => m.symbol === SYMBOL) ?? MARKETS[0];

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const target = useRef({ rx: 0, ry: 0 });

  // ── live market state (seeded deterministically from MARKETS) ──
  const [candles, setCandles] = useState<C[]>(() =>
    market.candles.slice(-(VISIBLE + 1)).map((k) => ({ o: k.open, h: k.high, l: k.low, c: k.close })),
  );
  const [tick, setTick] = useState(0);
  const prevPrice = useRef(market.price);
  const last = candles[candles.length - 1].c;
  const first = candles[0].c;
  const up = last >= prevPrice.current;
  const sessionUp = last >= first;
  const changePct = ((last - first) / first) * 100;

  // ── mouse-parallax tilt ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cur = { rx: 0, ry: 0 };
    let raf = 0;
    const loop = () => {
      cur.rx += (target.current.rx - cur.rx) * 0.07;
      cur.ry += (target.current.ry - cur.ry) * 0.07;
      stage.style.transform = `rotateX(${(10 + cur.rx).toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      target.current = { rx: -ny * 7, ry: nx * 9 };
    };
    const onLeave = () => {
      target.current = { rx: 0, ry: 0 };
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // ── price engine ──
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        const next = prev.map((c) => ({ ...c }));
        const cur = next[next.length - 1];
        prevPrice.current = cur.c;
        const drift = (Math.random() - 0.485) * cur.c * 0.0035;
        cur.c = Math.max(0.5, +(cur.c + drift).toFixed(2));
        cur.h = Math.max(cur.h, cur.c);
        cur.l = Math.min(cur.l, cur.c);
        return next;
      });
      setTick((t) => {
        if ((t + 1) % 9 === 0) {
          // roll a fresh candle so the chart visibly marches forward
          setCandles((prev) => {
            const lastC = prev[prev.length - 1];
            return [...prev.slice(1), { o: lastC.c, h: lastC.c, l: lastC.c, c: lastC.c }];
          });
        }
        return t + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  // ── derived: order book + tape (deterministic per tick) ──
  const spreadStep = Math.max(0.01, last * 0.0012);
  const asks = Array.from({ length: 6 }, (_, i) => ({
    p: last + spreadStep * (i + 1),
    q: 40 + hash01(i + 1, tick) * 520,
  })).reverse();
  const bids = Array.from({ length: 6 }, (_, i) => ({
    p: last - spreadStep * (i + 1),
    q: 40 + hash01(i + 101, tick) * 520,
  }));
  const maxQ = Math.max(...asks.map((a) => a.q), ...bids.map((b) => b.q));

  const tape = Array.from({ length: 7 }, (_, i) => {
    const t = tick - i;
    const buy = hash01(7, t) > 0.45;
    return {
      key: t,
      buy,
      p: last * (1 + (hash01(11, t) - 0.5) * 0.002),
      q: 5 + hash01(13, t) * 240,
    };
  });

  // ── chart geometry ──
  const W = 620;
  const H = 250;
  const PAD = 8;
  const view = candles.slice(-VISIBLE);
  const hi = Math.max(...view.map((c) => c.h));
  const lo = Math.min(...view.map((c) => c.l));
  const span = hi - lo || 1;
  const y = (v: number) => PAD + (H - PAD * 2) * (1 - (v - lo) / span);
  const cw = (W - PAD * 2) / VISIBLE;
  const lastY = y(last);

  return (
    <div ref={wrapRef} className="persp mx-auto max-w-5xl px-5 select-none" aria-hidden={false}>
      <div ref={stageRef} className="preserve-3d relative" style={{ transform: "rotateX(10deg)" }}>
        {/* floating ambient chips (pushed toward the viewer) */}
        <div className="float-slow absolute -top-5 -left-2 md:-left-8 z-20 hidden sm:flex chip !bg-paper shadow-lift gap-1.5" style={{ transform: "translateZ(70px)" }}>
          <TrendingUp className="h-3.5 w-3.5 text-up" />
          <span className="tnum font-semibold text-up">+2.41%</span>
          <span className="text-ink-faint">24h</span>
        </div>
        <div className="float-slower absolute -top-6 right-2 md:-right-6 z-20 hidden sm:flex chip !bg-paper shadow-lift gap-1.5" style={{ transform: "translateZ(90px)" }}>
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
          Settled on Polygon
        </div>
        <div className="float-slow absolute -bottom-5 left-8 z-20 hidden md:flex chip !bg-paper shadow-lift gap-1.5" style={{ transform: "translateZ(80px)" }}>
          <Flame className="h-3.5 w-3.5 text-gold" />
          <span className="tnum font-semibold text-ink">4.81M t</span>
          <span className="text-ink-faint">retired forever</span>
        </div>

        {/* terminal frame */}
        <div className="preserve-3d grid gap-3 lg:grid-cols-[1.75fr_1fr]">
          {/* ── chart panel ── */}
          <div className="card overflow-hidden shadow-lift" style={{ transform: "translateZ(30px)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-brand-50 text-brand-600">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink leading-tight">{market.symbol}<span className="text-ink-faint font-normal">/USDT</span></p>
                  <p className="text-[11px] text-ink-faint leading-tight">{market.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={clsx("tnum text-lg font-semibold transition-colors duration-300", up ? "text-up" : "text-down")}>
                  ${fmtPrice(last)}
                </p>
                <p className={clsx("tnum text-[11px]", sessionUp ? "text-up" : "text-down")}>
                  {sessionUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </p>
              </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={`Live ${market.symbol} candlestick chart`}>
              {/* grid */}
              {[0.2, 0.4, 0.6, 0.8].map((g) => (
                <line key={g} x1={PAD} x2={W - PAD} y1={PAD + (H - PAD * 2) * g} y2={PAD + (H - PAD * 2) * g} className="stroke-line" strokeDasharray="3 5" strokeWidth="1" />
              ))}
              {/* candles */}
              {view.map((c, i) => {
                const cx = PAD + i * cw + cw / 2;
                const bull = c.c >= c.o;
                const color = bull ? "#0E9E68" : "#D2564B";
                const top = y(Math.max(c.o, c.c));
                const bh = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
                return (
                  <g key={i}>
                    <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1.1" />
                    <rect x={cx - cw * 0.32} y={top} width={cw * 0.64} height={bh} rx="1" fill={color} opacity={bull ? 0.95 : 0.9} />
                  </g>
                );
              })}
              {/* last-price line + tag */}
              <line x1={PAD} x2={W - PAD} y1={lastY} y2={lastY} stroke={up ? "#0E9E68" : "#D2564B"} strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
              <g transform={`translate(${W - PAD - 62}, ${Math.min(H - 20, Math.max(4, lastY - 9))})`}>
                <rect width="62" height="18" rx="4" fill={up ? "#0E9E68" : "#D2564B"} />
                <text x="31" y="12.5" textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="#fff">
                  {fmtPrice(last)}
                </text>
              </g>
            </svg>

            {/* action row — real links into the terminal */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-t border-line bg-mist/40">
              <Link href={`/trade/${market.symbol}`} className="btn flex-1 justify-center bg-up/90 hover:bg-up text-white py-2.5">
                Buy {market.symbol.split("-")[0]}
              </Link>
              <Link href={`/trade/${market.symbol}`} className="btn flex-1 justify-center bg-down/90 hover:bg-down text-white py-2.5">
                Sell
              </Link>
              <Link href="/markets" className="btn-ghost !px-3.5 py-2.5 whitespace-nowrap">
                All markets <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* ── right column: order book + tape ── */}
          <div className="preserve-3d hidden lg:grid grid-rows-[auto_1fr] gap-3">
            <div className="card p-4 shadow-lift" style={{ transform: "translateZ(52px)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-ink">Order book</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot" /> LIVE
                </span>
              </div>
              <div className="space-y-[3px] text-[11px] tnum">
                {asks.map((a, i) => (
                  <div key={`a${i}`} className="relative flex justify-between px-1.5 py-[3px] rounded">
                    <div className="absolute inset-y-0 right-0 rounded bg-down/10 transition-[width] duration-500" style={{ width: `${(a.q / maxQ) * 100}%` }} />
                    <span className="relative text-down">{fmtPrice(a.p)}</span>
                    <span className="relative text-ink-soft">{a.q.toFixed(1)} t</span>
                  </div>
                ))}
                <div className="flex justify-between px-1.5 py-1.5 my-0.5 rounded bg-mist font-semibold">
                  <span className={up ? "text-up" : "text-down"}>${fmtPrice(last)}</span>
                  <span className="text-ink-faint">spread {(spreadStep * 2).toFixed(2)}</span>
                </div>
                {bids.map((b, i) => (
                  <div key={`b${i}`} className="relative flex justify-between px-1.5 py-[3px] rounded">
                    <div className="absolute inset-y-0 right-0 rounded bg-up/10 transition-[width] duration-500" style={{ width: `${(b.q / maxQ) * 100}%` }} />
                    <span className="relative text-up">{fmtPrice(b.p)}</span>
                    <span className="relative text-ink-soft">{b.q.toFixed(1)} t</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 shadow-lift overflow-hidden" style={{ transform: "translateZ(40px)" }}>
              <p className="text-xs font-semibold text-ink mb-2.5">Recent trades</p>
              <div className="space-y-[5px] text-[11px] tnum">
                {tape.map((t) => (
                  <div key={t.key} className={clsx("flex justify-between px-1.5 py-[2px] rounded", t.key === tick && (t.buy ? "animate-flash-up" : "animate-flash-down"))}>
                    <span className={t.buy ? "text-up" : "text-down"}>{fmtPrice(t.p)}</span>
                    <span className="text-ink-soft">{t.q.toFixed(1)} t</span>
                    <span className="text-ink-faint">{t.buy ? "BUY" : "SELL"}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 pt-2.5 border-t border-line text-[10px] text-ink-faint flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-brand-600" /> 24h vol ${fmtCompact(market.quoteVolume24h ?? 18_400_000)}
              </p>
            </div>
          </div>
        </div>

        {/* floor reflection / glow under the stage */}
        <div
          className="absolute -bottom-10 inset-x-8 h-16 -z-10 rounded-[50%] blur-2xl opacity-60"
          style={{ transform: "translateZ(-40px)", background: "radial-gradient(50% 100% at 50% 50%, rgba(14,124,85,.28), transparent 70%)" }}
        />
      </div>
    </div>
  );
}
