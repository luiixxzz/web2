import { createServerFn } from "@tanstack/react-start";

function flag(data: unknown, key: "fresh"): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as { fresh?: unknown })[key] === true;
}

function monthsOf(data: unknown): number {
  if (!data || typeof data !== "object" || !("months" in data)) return 12;
  const months = Number((data as { months?: unknown }).months);
  if (!Number.isFinite(months)) return 12;
  return Math.min(36, Math.max(1, Math.floor(months)));
}

export const getMarket = createServerFn({ method: "GET" })
  .validator((data: unknown) => ({ fresh: flag(data, "fresh") }))
  .handler(async ({ data }) => {
    const { loadMarket } = await import("@/server/market.server");
    return loadMarket({ fresh: data.fresh });
  });

export const getBcvHistory = createServerFn({ method: "GET" })
  .validator((data: unknown) => ({
    fresh: flag(data, "fresh"),
    months: monthsOf(data),
  }))
  .handler(async ({ data }) => {
    const { loadBcvHistory } = await import("@/server/market.server");
    return loadBcvHistory(data.months, { fresh: data.fresh });
  });
