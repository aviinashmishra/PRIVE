export type ProjectType =
  | "Reforestation"
  | "Solar"
  | "Wind"
  | "Blue Carbon"
  | "Biogas"
  | "Direct Air Capture"
  | "Cookstoves";

export type Standard = "Verra VCS" | "Gold Standard" | "CDM" | "Prive Native";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Market {
  symbol: string; // e.g. AMZN-RF25
  pair: string; // e.g. AMZN-RF25/USDT
  name: string; // Amazon Reforestation 2025
  projectType: ProjectType;
  standard: Standard;
  vintage: number;
  location: string;
  country: string;
  rating: "AAA" | "AA" | "A" | "BBB";
  price: number;
  prevPrice: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number; // in credits
  quoteVolume24h: number; // in usd
  supply: number; // circulating tonnes
  retired: number; // tonnes retired
  candles: Candle[];
  sdgs: number[];
}

export interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export interface Trade {
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  time: number;
}

export interface Holding {
  symbol: string;
  qty: number;
  avgCost: number;
}

export interface OpenOrder {
  id: string;
  pair: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price: number;
  qty: number;
  filled: number;
  time: number;
  status: "open" | "filled" | "cancelled";
}

export interface Retirement {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  beneficiary: string;
  time: number;
  certId: string;
  txHash: string;
}
