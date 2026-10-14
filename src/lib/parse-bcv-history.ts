import type { BcvPoint } from "./market-types.ts";

function parseEsNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/\u2212/g, "-")
    .replace(/%/g, "")
    .replace(/[^\d,.\-+]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "+" || cleaned === "." || cleaned === ",") return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function fechaToIso(fecha: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull daily BCV rows out of the finanzasdigital.com month table. */
export function parseFinanzasTable(html: string): BcvPoint[] {
  const points: BcvPoint[] = [];
  const seen = new Set<string>();
  const rows = html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
      cellText(cell[1]),
    );
    if (cells.length < 2) continue;
    const fecha = cells[0]?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
    if (!fecha) continue;
    const iso = fechaToIso(fecha);
    const tasa = parseEsNumber(cells[1] ?? "");
    if (!iso || tasa == null || tasa < 0.01 || tasa > 1_000_000) continue;
    if (seen.has(iso)) continue;
    seen.add(iso);
    const variacion = cells[2] ? parseEsNumber(cells[2]) : null;
    points.push({
      fecha,
      iso,
      tasa,
      variacion: variacion != null && Math.abs(variacion) < 1000 ? variacion : null,
    });
  }

  points.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
  return points;
}

export function recentMonths(count: number, now = new Date()): { year: number; month: number }[] {
  const safe = Math.min(36, Math.max(1, Math.floor(count)));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  let year = Number(parts.find((part) => part.type === "year")?.value);
  let month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !month) {
    year = now.getUTCFullYear();
    month = now.getUTCMonth() + 1;
  }
  const list: { year: number; month: number }[] = [];
  for (let i = 0; i < safe; i += 1) {
    list.push({ year, month });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return list.reverse();
}

export type HistoryStats = {
  promedio: number;
  maximo: number;
  maxFecha: string;
  minimo: number;
  minFecha: string;
  variacionMedia: number | null;
  ultimo: number;
  ultimaFecha: string;
  total: number;
};

export function historyStats(points: readonly BcvPoint[]): HistoryStats | null {
  if (points.length === 0) return null;
  let max = points[0]!;
  let min = points[0]!;
  let sum = 0;
  let varSum = 0;
  let varCount = 0;
  for (const point of points) {
    sum += point.tasa;
    if (point.tasa > max.tasa) max = point;
    if (point.tasa < min.tasa) min = point;
    if (point.variacion != null) {
      varSum += point.variacion;
      varCount += 1;
    }
  }
  const last = points[points.length - 1]!;
  return {
    promedio: sum / points.length,
    maximo: max.tasa,
    maxFecha: max.fecha,
    minimo: min.tasa,
    minFecha: min.fecha,
    variacionMedia: varCount > 0 ? varSum / varCount : null,
    ultimo: last.tasa,
    ultimaFecha: last.fecha,
    total: points.length,
  };
}
