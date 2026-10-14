import type { MarketResult } from "./market-types.ts";
import type { Settings } from "./model.ts";
import { cushionQuote, divisionRate, num } from "./pricing.ts";

export type SideSource = "manual" | "api" | "none";

export type EffectiveRates = {
  bcvUsd: number;
  bcvUsdSource: SideSource;
  bcvEur: number;
  bcvEurSource: SideSource;
  bnbBuy: number;
  bnbBuySource: SideSource;
  bnbSell: number;
  bnbSellSource: SideSource;
  bybBuy: number;
  bybSell: number;
  bybitSource: SideSource;
  bnbAvg: number;
  cop: number;
  copSource: SideSource;
  usdChangePct: number | null;
  eurChangePct: number | null;
  prevDate: string;
  bcvDate: string;
  bcvName: string;
  p2pName: string;
  copName: string;
};

export function effectiveRates(market: MarketResult | null, settings: Settings): EffectiveRates {
  const manualBcv = num(settings.manualBcv);
  const manualBuy = num(settings.manualBnbBuy);
  const manualSell = num(settings.manualBnbSell);
  const manualCop = num(settings.manualCop);

  const bcvUsd = manualBcv > 0 ? manualBcv : (market?.bcv?.usd ?? 0);
  const bnbBuy = manualBuy > 0 ? manualBuy : (market?.p2p?.binanceBuy ?? 0);
  const bnbSell = manualSell > 0 ? manualSell : (market?.p2p?.binanceSell ?? 0);
  const cop = manualCop > 0 ? manualCop : (market?.cop?.perUsd ?? 0);
  const pair = [bnbBuy, bnbSell].filter((value) => value > 0);
  const bnbAvg = pair.length ? pair.reduce((sum, value) => sum + value, 0) / pair.length : 0;

  return {
    bcvUsd,
    bcvUsdSource: manualBcv > 0 ? "manual" : bcvUsd > 0 ? "api" : "none",
    bcvEur: market?.bcv?.eur ?? 0,
    bcvEurSource: market?.bcv?.eur ? "api" : "none",
    bnbBuy,
    bnbBuySource: manualBuy > 0 ? "manual" : bnbBuy > 0 ? "api" : "none",
    bnbSell,
    bnbSellSource: manualSell > 0 ? "manual" : bnbSell > 0 ? "api" : "none",
    bybBuy: market?.p2p?.bybitBuy ?? 0,
    bybSell: market?.p2p?.bybitSell ?? 0,
    bybitSource: market?.p2p?.bybitBuy || market?.p2p?.bybitSell ? "api" : "none",
    bnbAvg,
    cop,
    copSource: manualCop > 0 ? "manual" : cop > 0 ? "api" : "none",
    usdChangePct: manualBcv > 0 ? null : (market?.bcv?.usdChangePct ?? null),
    eurChangePct: market?.bcv?.eurChangePct ?? null,
    prevDate: market?.bcv?.prevDate || "ayer",
    bcvDate: market?.bcv?.date || "",
    bcvName: manualBcv > 0 ? "Ajuste manual" : market?.bcv?.source || "",
    p2pName: market?.p2p?.source || "",
    copName: manualCop > 0 ? "Ajuste manual" : market?.cop?.source || "",
  };
}

/** Division rate used by the product sheet: COP per USD ÷ cushioned Bs rate. */
export function productDivision(settings: Settings, market: MarketResult | null): number {
  const eff = effectiveRates(market, settings);
  const cop = num(settings.dCop) || 3200;
  if (settings.pTasaTipo === "bcv") {
    const quote = cushionQuote(settings.cBcvTasa, settings.cBcvPct, settings.cBcvDias);
    const bs = quote?.projected || eff.bcvUsd || num(settings.cBcvTasa);
    return divisionRate(cop, bs);
  }
  const quote = cushionQuote(settings.cBnbTasa, settings.cBnbPct, settings.cBnbDias);
  const bs = quote?.projected || eff.bnbAvg || num(settings.cBnbTasa);
  return divisionRate(cop, bs);
}
