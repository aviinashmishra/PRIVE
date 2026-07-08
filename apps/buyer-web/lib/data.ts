import { Candle, Market } from "./types";

// Deterministic pseudo-random so SSR and client match on first paint.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCandles(seed: number, base: number, count: number): Candle[] {
  const rand = mulberry32(seed);
  const out: Candle[] = [];
  let price = base * (0.82 + rand() * 0.1);
  const now = Math.floor(Date.now() / 1000);
  const step = 3600; // 1h candles
  const start = now - count * step;
  let drift = (base - price) / count; // gentle trend toward base
  for (let i = 0; i < count; i++) {
    const open = price;
    const vol = base * (0.012 + rand() * 0.02);
    const dir = (rand() - 0.46) * vol * 2 + drift;
    let close = Math.max(base * 0.4, open + dir);
    const high = Math.max(open, close) + rand() * vol;
    const low = Math.min(open, close) - rand() * vol;
    out.push({
      time: start + i * step,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +Math.max(0.5, low).toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(200 + rand() * 3000),
    });
    price = close;
  }
  return out;
}

interface Seed {
  symbol: string;
  name: string;
  projectType: Market["projectType"];
  standard: Market["standard"];
  vintage: number;
  location: string;
  country: string;
  rating: Market["rating"];
  price: number;
  supply: number;
  retired: number;
  sdgs: number[];
  seed: number;
}

const seeds: Seed[] = [
  { symbol: "AMZN-RF25", name: "Amazon Reforestation", projectType: "Reforestation", standard: "Verra VCS", vintage: 2025, location: "Pará Basin", country: "🇧🇷 Brazil", rating: "AAA", price: 24.8, supply: 1_820_000, retired: 412_000, sdgs: [13, 15, 6], seed: 101 },
  { symbol: "SOLR-IN24", name: "Rajasthan Solar Array", projectType: "Solar", standard: "Gold Standard", vintage: 2024, location: "Thar Desert", country: "🇮🇳 India", rating: "AA", price: 11.4, supply: 3_100_000, retired: 640_000, sdgs: [7, 13, 8], seed: 202 },
  { symbol: "WIND-SC25", name: "North Sea Wind", projectType: "Wind", standard: "Gold Standard", vintage: 2025, location: "Dogger Bank", country: "🏴 Scotland", rating: "AAA", price: 18.2, supply: 2_240_000, retired: 305_000, sdgs: [7, 13, 9], seed: 303 },
  { symbol: "BLUE-ID24", name: "Mangrove Blue Carbon", projectType: "Blue Carbon", standard: "Verra VCS", vintage: 2024, location: "Sumatra Coast", country: "🇮🇩 Indonesia", rating: "AAA", price: 32.6, supply: 640_000, retired: 188_000, sdgs: [14, 13, 15], seed: 404 },
  { symbol: "DAC-IS25", name: "Hellisheiði Direct Air Capture", projectType: "Direct Air Capture", standard: "Prive Native", vintage: 2025, location: "Reykjavík", country: "🇮🇸 Iceland", rating: "AAA", price: 128.5, supply: 92_000, retired: 41_000, sdgs: [13, 9], seed: 505 },
  { symbol: "BIO-KE24", name: "Rift Valley Biogas", projectType: "Biogas", standard: "Gold Standard", vintage: 2024, location: "Nakuru", country: "🇰🇪 Kenya", rating: "A", price: 9.1, supply: 880_000, retired: 210_000, sdgs: [7, 13, 1], seed: 606 },
  { symbol: "COOK-UG25", name: "Clean Cookstoves", projectType: "Cookstoves", standard: "Gold Standard", vintage: 2025, location: "Kampala", country: "🇺🇬 Uganda", rating: "AA", price: 7.4, supply: 1_450_000, retired: 520_000, sdgs: [3, 5, 13], seed: 707 },
  { symbol: "PRIVE-CO2", name: "Prive CO₂ Index", projectType: "Reforestation", standard: "Prive Native", vintage: 2025, location: "Blended Basket", country: "🌍 Global", rating: "AAA", price: 21.9, supply: 8_400_000, retired: 1_900_000, sdgs: [13, 17], seed: 808 },
];

export const MARKETS: Market[] = seeds.map((s) => {
  const candles = buildCandles(s.seed, s.price, 168);
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const open24h = closes[Math.max(0, closes.length - 24)];
  const last24 = candles.slice(-24);
  return {
    symbol: s.symbol,
    pair: `${s.symbol}/USDT`,
    name: s.name,
    projectType: s.projectType,
    standard: s.standard,
    vintage: s.vintage,
    location: s.location,
    country: s.country,
    rating: s.rating,
    price,
    prevPrice: price,
    open24h,
    high24h: Math.max(...last24.map((c) => c.high)),
    low24h: Math.min(...last24.map((c) => c.low)),
    volume24h: last24.reduce((a, c) => a + c.volume, 0),
    quoteVolume24h: last24.reduce((a, c) => a + c.volume * c.close, 0),
    supply: s.supply,
    retired: s.retired,
    candles,
    sdgs: s.sdgs,
  };
});

export const SDG_NAMES: Record<number, string> = {
  1: "No Poverty",
  3: "Good Health",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Industry & Innovation",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  17: "Partnerships",
};
