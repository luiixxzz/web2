/** Pure pricing rules ported from the working desk (compound cushion, division, Bs price). */

export function num(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundTo(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function projectRate(rate: number, dailyPct: number, days: number): number {
  return rate * Math.pow(1 + dailyPct / 100, days);
}

export function pastRate(rate: number, dailyPct: number, days: number): number {
  return rate / Math.pow(1 + dailyPct / 100, days);
}

export function cushionPercent(dailyPct: number, days: number): number {
  return (Math.pow(1 + dailyPct / 100, days) - 1) * 100;
}

export function divisionRate(copPerUsd: number, bsPerUsd: number): number {
  if (!copPerUsd || !bsPerUsd) return 0;
  return copPerUsd / bsPerUsd;
}

export function priceCop(cost: number, marginPct: number): number {
  return cost * (1 + marginPct / 100);
}

export function priceBs(cost: number, marginPct: number, tasaDiv: number): number {
  if (!tasaDiv) return 0;
  return priceCop(cost, marginPct) / tasaDiv;
}

export function gapPercent(official: number, parallel: number): number | null {
  if (!official || !parallel) return null;
  return ((parallel - official) / official) * 100;
}

export type CushionQuote = {
  rate: number;
  pct: number;
  days: number;
  projected: number;
  cushion: number;
};

export function cushionQuote(tasaRaw: string, pctRaw: string, diasRaw: string): CushionQuote | null {
  const rate = num(tasaRaw);
  const pct = num(pctRaw);
  const days = Math.round(num(diasRaw)) || 7;
  if (!rate || !pct || days < 1) return null;
  return {
    rate,
    pct,
    days,
    projected: projectRate(rate, pct, days),
    cushion: cushionPercent(pct, days),
  };
}

export type ProjectionPoint = {
  day: number;
  label: string;
  bcv: number | null;
  p2p: number | null;
};

export function projectionSeries(
  bcv: number,
  bcvPct: number,
  p2p: number,
  p2pPct: number,
  horizon = 30,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  for (let day = -horizon; day <= horizon; day += 1) {
    const abs = Math.abs(day);
    points.push({
      day,
      label: day === 0 ? "Hoy" : day > 0 ? `+${day}` : `${day}`,
      bcv: bcv > 0 ? (day >= 0 ? projectRate(bcv, bcvPct, abs) : pastRate(bcv, bcvPct, abs)) : null,
      p2p: p2p > 0 ? (day >= 0 ? projectRate(p2p, p2pPct, abs) : pastRate(p2p, p2pPct, abs)) : null,
    });
  }
  return points;
}
