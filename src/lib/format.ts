const cache = new Map<number, Intl.NumberFormat>();

export function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  let format = cache.get(digits);
  if (!format) {
    format = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    cache.set(digits, format);
  }
  return format.format(value);
}

export function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const body = fmt(Math.abs(value), digits);
  if (value > 0) return `+${body}%`;
  if (value < 0) return `−${body}%`;
  return `${body}%`;
}

export function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
