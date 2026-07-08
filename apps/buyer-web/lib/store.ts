"use client";

import { create } from "zustand";
import { MARKETS } from "./data";
import { Market, OrderLevel, Trade, Holding, OpenOrder, Retirement } from "./types";

// ---- deterministic seed for first paint (SSR === client) ----
function seededRand(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Book = { bids: OrderLevel[]; asks: OrderLevel[] };

function buildBook(price: number, rnd: () => number): Book {
  const levels = 14;
  const tick = Math.max(0.01, price * 0.0007);
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];
  let bt = 0;
  let at = 0;
  for (let i = 0; i < levels; i++) {
    const bs = Math.round((40 + rnd() * 900) * (1 - i / (levels * 1.5)));
    const as = Math.round((40 + rnd() * 900) * (1 - i / (levels * 1.5)));
    bt += bs;
    at += as;
    bids.push({ price: +(price - tick * (i + 1)).toFixed(2), size: bs, total: bt });
    asks.push({ price: +(price + tick * (i + 1)).toFixed(2), size: as, total: at });
  }
  return { bids, asks };
}

function seedTrades(price: number, rnd: () => number): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < 24; i++) {
    const side = rnd() > 0.5 ? "buy" : "sell";
    out.push({
      id: "t" + i + "-" + Math.floor(price * 100),
      price: +(price * (1 + (rnd() - 0.5) * 0.002)).toFixed(2),
      size: +(2 + rnd() * 180).toFixed(2),
      side,
      time: Date.now() - i * 4200,
    });
  }
  return out;
}

const initBooks: Record<string, Book> = {};
const initTrades: Record<string, Trade[]> = {};
MARKETS.forEach((m, i) => {
  const rnd = seededRand(m.symbol.length * 997 + i * 131 + 7);
  initBooks[m.symbol] = buildBook(m.price, rnd);
  initTrades[m.symbol] = seedTrades(m.price, rnd);
});

// starting portfolio so the app feels lived-in
const seedHoldings: Holding[] = [
  { symbol: "AMZN-RF25", qty: 1240, avgCost: 21.1 },
  { symbol: "BLUE-ID24", qty: 380, avgCost: 28.9 },
  { symbol: "SOLR-IN24", qty: 5200, avgCost: 10.2 },
  { symbol: "PRIVE-CO2", qty: 2100, avgCost: 19.4 },
];

export interface OrderResult {
  ok: boolean;
  message: string;
  filled?: number;
  avgPrice?: number;
}

interface State {
  markets: Market[];
  books: Record<string, Book>;
  trades: Record<string, Trade[]>;
  usd: number;
  holdings: Holding[];
  openOrders: OpenOrder[];
  retirements: Retirement[];
  points: number;
  co2SavedKg: number;
  streak: number;
  miningLog: { id: string; type: string; points: number; time: number }[];
  platformRetired: number; // live global counter (tonnes)
  live: boolean;

  bySymbol: (s: string) => Market | undefined;
  holdingQty: (s: string) => number;
  portfolioValue: () => number;

  tick: () => void;
  placeOrder: (
    pair: string,
    side: "buy" | "sell",
    type: "limit" | "market",
    price: number,
    qty: number,
  ) => OrderResult;
  cancelOrder: (id: string) => void;
  retire: (symbol: string, qty: number, beneficiary: string) => Retirement | null;
  burnCredits: (symbol: string, qty: number) => boolean;
  logMiningAction: (type: string, points: number) => void;
  convertPoints: (points: number) => void;
}

let idc = 1;
const uid = (p: string) => p + "-" + Date.now().toString(36) + "-" + (idc++).toString(36);

export const useStore = create<State>((set, get) => ({
  markets: MARKETS.map((m) => ({ ...m })),
  books: initBooks,
  trades: initTrades,
  usd: 48_650.0,
  holdings: seedHoldings,
  openOrders: [
    { id: uid("o"), pair: "WIND-SC25/USDT", side: "buy", type: "limit", price: 17.4, qty: 500, filled: 0, time: Date.now() - 1000 * 60 * 24, status: "open" },
    { id: uid("o"), pair: "DAC-IS25/USDT", side: "sell", type: "limit", price: 134.0, qty: 40, filled: 0, time: Date.now() - 1000 * 60 * 92, status: "open" },
  ],
  retirements: [
    { id: uid("r"), symbol: "AMZN-RF25", name: "Amazon Reforestation", qty: 120, beneficiary: "Personal · FY2025", time: Date.now() - 1000 * 60 * 60 * 26, certId: "PRV-CERT-8814", txHash: "0x7a1c…e93f" },
  ],
  points: 3_420,
  co2SavedKg: 184,
  streak: 12,
  miningLog: [
    { id: uid("m"), type: "Daily streak", points: 50, time: Date.now() - 1000 * 60 * 60 * 3 },
    { id: uid("m"), type: "12,480 steps", points: 120, time: Date.now() - 1000 * 60 * 60 * 6 },
    { id: uid("m"), type: "Referral · A. Mehta", points: 400, time: Date.now() - 1000 * 60 * 60 * 20 },
  ],
  platformRetired: 4_812_664,
  live: false,

  bySymbol: (s) => get().markets.find((m) => m.symbol === s),
  holdingQty: (s) => get().holdings.find((h) => h.symbol === s)?.qty ?? 0,
  portfolioValue: () => {
    const { holdings, markets } = get();
    return holdings.reduce((a, h) => {
      const m = markets.find((x) => x.symbol === h.symbol);
      return a + (m ? m.price * h.qty : 0);
    }, 0);
  },

  tick: () => {
    set((state) => {
      const markets = state.markets.map((m) => {
        const vol = m.price * 0.0016;
        const change = (Math.random() - 0.5) * vol * 2;
        const price = Math.max(0.5, +(m.price + change).toFixed(2));
        const candles = m.candles.slice();
        const last = { ...candles[candles.length - 1] };
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec - last.time >= 3600) {
          candles.push({ time: last.time + 3600, open: last.close, high: price, low: price, close: price, volume: Math.round(50 + Math.random() * 200) });
          if (candles.length > 200) candles.shift();
        } else {
          last.close = price;
          last.high = Math.max(last.high, price);
          last.low = Math.min(last.low, price);
          last.volume += Math.round(Math.random() * 12);
          candles[candles.length - 1] = last;
        }
        return {
          ...m,
          prevPrice: m.price,
          price,
          high24h: Math.max(m.high24h, price),
          low24h: Math.min(m.low24h, price),
          candles,
        };
      });

      // refresh books + occasionally push a trade for the actively viewed markets
      const books = { ...state.books };
      const trades = { ...state.trades };
      markets.forEach((m) => {
        books[m.symbol] = buildBook(m.price, Math.random);
        if (Math.random() > 0.55) {
          const side = Math.random() > 0.5 ? "buy" : "sell";
          const t: Trade = {
            id: uid("t"),
            price: +(m.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2),
            size: +(1 + Math.random() * 220).toFixed(2),
            side,
            time: Date.now(),
          };
          trades[m.symbol] = [t, ...state.trades[m.symbol]].slice(0, 40);
        }
      });

      // occasionally bump the global retired counter
      const platformRetired = state.platformRetired + (Math.random() > 0.6 ? Math.floor(Math.random() * 40) : 0);

      return { markets, books, trades, platformRetired, live: true };
    });
  },

  placeOrder: (pair, side, type, price, qty) => {
    const symbol = pair.split("/")[0];
    const st = get();
    const m = st.bySymbol(symbol);
    if (!m) return { ok: false, message: "Unknown market." };
    if (!(qty > 0)) return { ok: false, message: "Enter a quantity." };
    const execPrice = type === "market" ? m.price : price;
    if (type === "limit" && !(execPrice > 0)) return { ok: false, message: "Enter a limit price." };
    const notional = execPrice * qty;

    if (side === "buy") {
      if (notional > st.usd) return { ok: false, message: "Insufficient USDT balance." };
    } else {
      if (qty > st.holdingQty(symbol)) return { ok: false, message: `Insufficient ${symbol} balance.` };
    }

    // Market orders fill instantly. Limit orders on the passive side rest as open orders.
    const marketable =
      type === "market" ||
      (side === "buy" && execPrice >= m.price) ||
      (side === "sell" && execPrice <= m.price);

    if (marketable) {
      set((state) => {
        let usd = state.usd;
        let holdings = state.holdings.slice();
        const cur = holdings.find((h) => h.symbol === symbol);
        if (side === "buy") {
          usd -= notional;
          if (cur) {
            const newQty = cur.qty + qty;
            cur.avgCost = (cur.avgCost * cur.qty + notional) / newQty;
            cur.qty = newQty;
          } else {
            holdings.push({ symbol, qty, avgCost: execPrice });
          }
        } else {
          usd += notional;
          if (cur) {
            cur.qty -= qty;
            if (cur.qty <= 0.0001) holdings = holdings.filter((h) => h.symbol !== symbol);
          }
        }
        const trade: Trade = { id: uid("t"), price: execPrice, size: qty, side, time: Date.now() };
        const trades = { ...state.trades, [symbol]: [trade, ...(state.trades[symbol] || [])].slice(0, 40) };
        const filledOrder: OpenOrder = { id: uid("o"), pair, side, type, price: execPrice, qty, filled: qty, time: Date.now(), status: "filled" };
        return { usd, holdings, trades, openOrders: [filledOrder, ...state.openOrders] };
      });
      return { ok: true, message: `${side === "buy" ? "Bought" : "Sold"} ${qty} ${symbol} @ ${execPrice.toFixed(2)}`, filled: qty, avgPrice: execPrice };
    }

    // rests on the book
    set((state) => {
      const order: OpenOrder = { id: uid("o"), pair, side, type, price: execPrice, qty, filled: 0, time: Date.now(), status: "open" };
      // reserve funds for buys by lowering available USD
      const usd = side === "buy" ? state.usd - notional : state.usd;
      return { openOrders: [order, ...state.openOrders], usd };
    });
    return { ok: true, message: `Limit ${side} order placed · ${qty} ${symbol} @ ${execPrice.toFixed(2)}` };
  },

  cancelOrder: (id) => {
    set((state) => {
      const order = state.openOrders.find((o) => o.id === id);
      if (!order || order.status !== "open") return {};
      // refund reserved USD for open buys
      const usd = order.side === "buy" ? state.usd + order.price * order.qty : state.usd;
      return { openOrders: state.openOrders.filter((o) => o.id !== id), usd };
    });
  },

  burnCredits: (symbol, qty) => {
    const st = get();
    if (qty <= 0 || qty > st.holdingQty(symbol)) return false;
    set((state) => {
      let holdings = state.holdings.slice();
      const cur = holdings.find((h) => h.symbol === symbol);
      if (cur) {
        cur.qty -= qty;
        if (cur.qty <= 0.0001) holdings = holdings.filter((h) => h.symbol !== symbol);
      }
      return { holdings, platformRetired: state.platformRetired + qty };
    });
    return true;
  },

  retire: (symbol, qty, beneficiary) => {
    const st = get();
    const m = st.bySymbol(symbol);
    if (!m || qty <= 0 || qty > st.holdingQty(symbol)) return null;
    const rec: Retirement = {
      id: uid("r"),
      symbol,
      name: m.name,
      qty,
      beneficiary: beneficiary || "Personal",
      time: Date.now(),
      certId: "PRV-CERT-" + Math.floor(1000 + Math.random() * 9000),
      txHash: "0x" + Math.random().toString(16).slice(2, 6) + "…" + Math.random().toString(16).slice(2, 6),
    };
    set((state) => {
      let holdings = state.holdings.slice();
      const cur = holdings.find((h) => h.symbol === symbol);
      if (cur) {
        cur.qty -= qty;
        if (cur.qty <= 0.0001) holdings = holdings.filter((h) => h.symbol !== symbol);
      }
      return {
        holdings,
        retirements: [rec, ...state.retirements],
        platformRetired: state.platformRetired + qty,
      };
    });
    return rec;
  },

  logMiningAction: (type, points) => {
    set((state) => ({
      points: state.points + points,
      co2SavedKg: state.co2SavedKg + Math.round(points / 8),
      miningLog: [{ id: uid("m"), type, points, time: Date.now() }, ...state.miningLog].slice(0, 24),
    }));
  },

  convertPoints: (points) => {
    set((state) => {
      const usable = Math.min(points, state.points);
      if (usable <= 0) return {};
      const credits = +(usable / 1000).toFixed(3); // 1000 pts = 1 fractional credit
      let holdings = state.holdings.slice();
      const cur = holdings.find((h) => h.symbol === "PRIVE-CO2");
      const price = state.bySymbol("PRIVE-CO2")?.price ?? 21.9;
      if (cur) {
        const newQty = cur.qty + credits;
        cur.avgCost = (cur.avgCost * cur.qty) / newQty; // free credits lower avg cost
        cur.qty = newQty;
      } else {
        holdings.push({ symbol: "PRIVE-CO2", qty: credits, avgCost: 0 });
      }
      void price;
      return { points: state.points - usable, holdings };
    });
  },
}));
