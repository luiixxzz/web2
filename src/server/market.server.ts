import type { BcvPoint, BcvQuote, CopQuote, HistoryResult, MarketResult, P2pQuote } from "@/lib/market-types";
import { parseFinanzasTable, recentMonths } from "@/lib/parse-bcv-history";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const MARKET_TTL_MS = 30_000;
const HISTORY_TTL_MS = 10 * 60_000;

let marketCache: { at: number; value: MarketResult } | null = null;
const historyCache = new Map<number, { at: number; value: HistoryResult }>();

function asRate(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function readJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": UA,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function readHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { accept: "text/html", "user-agent": UA },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

async function loadBcv(): Promise<BcvQuote> {
  try {
    const json = readRecord(await readJson("https://rates.dolarvzla.com/bcv/current.json"));
    const current = readRecord(json?.current);
    const previous = readRecord(json?.previous);
    const change = readRecord(json?.changePercentage);
    const usd = asRate(current?.usd);
    if (!usd) throw new Error("sin usd");
    const eur = asRate(current?.eur);
    return {
      usd,
      eur,
      prevUsd: asRate(previous?.usd),
      prevEur: asRate(previous?.eur),
      prevDate: typeof previous?.date === "string" ? previous.date : "",
      date: typeof current?.date === "string" ? current.date : "",
      usdChangePct: typeof change?.usd === "number" ? change.usd : null,
      eurChangePct: typeof change?.eur === "number" ? change.eur : null,
      source: "dolarvzla.com",
    };
  } catch {
    const json = await readJson("https://ve.dolarapi.com/v1/dolares");
    if (!Array.isArray(json)) throw new Error("BCV no disponible");
    const oficial = json.map(readRecord).find((row) => row?.fuente === "oficial");
    const usd = asRate(oficial?.promedio);
    if (!usd) throw new Error("BCV no disponible");
    return {
      usd,
      eur: null,
      prevUsd: null,
      prevEur: null,
      prevDate: "",
      date: typeof oficial?.fechaActualizacion === "string" ? oficial.fechaActualizacion.slice(0, 10) : "",
      usdChangePct: null,
      eurChangePct: null,
      source: "ve.dolarapi.com",
    };
  }
}

async function binanceSide(tradeType: "BUY" | "SELL"): Promise<number | null> {
  const json = readRecord(
    await readJson("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "VES",
        merchantCheck: false,
        page: 1,
        payTypes: [],
        rows: 10,
        tradeType,
      }),
    }),
  );
  const rows = Array.isArray(json?.data) ? json.data : [];
  const prices = rows
    .map((row) => asRate(readRecord(readRecord(row)?.adv)?.price))
    .filter((price): price is number => price != null);
  if (prices.length === 0) return null;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

async function loadP2p(): Promise<P2pQuote> {
  try {
    const json = readRecord(await readJson("https://www.usdt.com.ve/api/rates"));
    const data = readRecord(json?.data);
    const binance = readRecord(data?.binance);
    const bybit = readRecord(data?.bybit);
    const binanceBuy = asRate(binance?.buyRate);
    const binanceSell = asRate(binance?.sellRate);
    if (!binanceBuy || !binanceSell) throw new Error("sin binance");
    return {
      binanceBuy,
      binanceSell,
      bybitBuy: asRate(bybit?.buyRate),
      bybitSell: asRate(bybit?.sellRate),
      source: "usdt.com.ve",
    };
  } catch {
    try {
      const [buy, sell] = await Promise.all([binanceSide("BUY"), binanceSide("SELL")]);
      if (!buy || !sell) throw new Error("sin p2p binance");
      return {
        binanceBuy: buy,
        binanceSell: sell,
        bybitBuy: null,
        bybitSell: null,
        source: "Binance P2P",
      };
    } catch {
      const json = await readJson("https://ve.dolarapi.com/v1/dolares");
      if (!Array.isArray(json)) throw new Error("P2P no disponible");
      const paralelo = json.map(readRecord).find((row) => row?.fuente === "paralelo");
      const avg = asRate(paralelo?.promedio);
      if (!avg) throw new Error("P2P no disponible");
      return {
        binanceBuy: avg,
        binanceSell: avg,
        bybitBuy: null,
        bybitSell: null,
        source: "ve.dolarapi.com",
      };
    }
  }
}

async function loadCop(): Promise<CopQuote> {
  try {
    const json = readRecord(await readJson("https://api.exchangerate-api.com/v4/latest/USD"));
    const cop = asRate(readRecord(json?.rates)?.COP);
    if (!cop) throw new Error("sin cop");
    return { perUsd: cop, source: "exchangerate-api.com" };
  } catch {
    const json = readRecord(await readJson("https://api.frankfurter.app/latest?from=USD&to=COP"));
    const cop = asRate(readRecord(json?.rates)?.COP);
    if (!cop) throw new Error("COP no disponible");
    return { perUsd: cop, source: "frankfurter.app" };
  }
}

async function fetchMarket(): Promise<MarketResult> {
  const notes: string[] = [];
  const [bcv, p2p, cop] = await Promise.all([
    loadBcv().catch((error: unknown) => {
      notes.push(error instanceof Error ? `BCV: ${error.message}` : "BCV no disponible");
      return null;
    }),
    loadP2p().catch((error: unknown) => {
      notes.push(error instanceof Error ? `P2P: ${error.message}` : "P2P no disponible");
      return null;
    }),
    loadCop().catch((error: unknown) => {
      notes.push(error instanceof Error ? `COP: ${error.message}` : "COP no disponible");
      return null;
    }),
  ]);

  return {
    ok: Boolean(bcv || p2p || cop),
    fetchedAt: new Date().toISOString(),
    bcv,
    p2p,
    cop,
    notes,
  };
}

export async function loadMarket(options: { fresh?: boolean } = {}): Promise<MarketResult> {
  if (!options.fresh && marketCache && Date.now() - marketCache.at < MARKET_TTL_MS) {
    return marketCache.value;
  }
  const value = await fetchMarket();
  marketCache = { at: Date.now(), value };
  return value;
}

async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await fn(items[index]!);
    }
  }
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

async function loadMonth(year: number, month: number): Promise<BcvPoint[]> {
  const pretty = `https://finanzasdigital.com/tasa-de-cambio-dolar-diaria/${year}/${month}/`;
  try {
    return parseFinanzasTable(await readHtml(pretty));
  } catch {
    if (month === new Date().getUTCMonth() + 1) {
      return parseFinanzasTable(await readHtml("https://finanzasdigital.com/tasa-de-cambio-dolar-diaria/"));
    }
    return [];
  }
}

export async function loadBcvHistory(months: number, options: { fresh?: boolean } = {}): Promise<HistoryResult> {
  const span = Math.min(36, Math.max(1, Math.floor(months) || 12));
  const cached = historyCache.get(span);
  if (!options.fresh && cached && Date.now() - cached.at < HISTORY_TTL_MS) return cached.value;

  try {
    const windows = recentMonths(span);
    const batches = await mapPool(windows, 4, (window) => loadMonth(window.year, window.month));
    const merged = new Map<string, BcvPoint>();
    for (const batch of batches) {
      for (const point of batch) merged.set(point.iso, point);
    }
    const points = [...merged.values()].sort((a, b) => (a.iso < b.iso ? -1 : 1));
    if (points.length === 0) throw new Error("La tabla publicada no trajo filas");
    const value: HistoryResult = {
      ok: true,
      fetchedAt: new Date().toISOString(),
      source: "finanzasdigital.com",
      months: span,
      points,
    };
    historyCache.set(span, { at: Date.now(), value });
    return value;
  } catch (error) {
    return {
      ok: false,
      fetchedAt: new Date().toISOString(),
      source: "finanzasdigital.com",
      months: span,
      points: [],
      error: error instanceof Error ? error.message : "No se pudo leer el historial",
    };
  }
}
