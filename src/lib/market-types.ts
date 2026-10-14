export type BcvQuote = {
  usd: number;
  eur: number | null;
  prevUsd: number | null;
  prevEur: number | null;
  prevDate: string;
  date: string;
  usdChangePct: number | null;
  eurChangePct: number | null;
  source: string;
};

export type P2pQuote = {
  binanceBuy: number;
  binanceSell: number;
  bybitBuy: number | null;
  bybitSell: number | null;
  source: string;
};

export type CopQuote = {
  perUsd: number;
  source: string;
};

export type MarketResult = {
  ok: boolean;
  fetchedAt: string;
  bcv: BcvQuote | null;
  p2p: P2pQuote | null;
  cop: CopQuote | null;
  notes: string[];
};

export type BcvPoint = {
  fecha: string;
  iso: string;
  tasa: number;
  variacion: number | null;
};

export type HistoryResult = {
  ok: boolean;
  fetchedAt: string;
  source: string;
  months: number;
  points: BcvPoint[];
  error?: string;
};
