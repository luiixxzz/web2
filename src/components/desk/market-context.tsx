import { createContext, useContext } from "react";
import type { MarketResult } from "@/lib/market-types";

export type MarketContextValue = {
  market: MarketResult | null;
  refreshing: boolean;
  refresh: (announce: boolean) => void;
};

const MarketContext = createContext<MarketContextValue>({
  market: null,
  refreshing: false,
  refresh: () => {},
});

export function MarketProvider({
  value,
  children,
}: {
  value: MarketContextValue;
  children: React.ReactNode;
}) {
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  return useContext(MarketContext);
}
