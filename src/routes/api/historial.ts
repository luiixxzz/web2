import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/historial")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fresh = url.searchParams.get("fresh") === "1";
        const months = Number(url.searchParams.get("months") || "12");
        const { loadBcvHistory } = await import("@/server/market.server");
        const data = await loadBcvHistory(Number.isFinite(months) ? months : 12, { fresh });
        return Response.json(data, {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
