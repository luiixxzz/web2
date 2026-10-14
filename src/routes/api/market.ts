import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/market")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fresh = new URL(request.url).searchParams.get("fresh") === "1";
        const { loadMarket } = await import("@/server/market.server");
        const data = await loadMarket({ fresh });
        return Response.json(data, {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
