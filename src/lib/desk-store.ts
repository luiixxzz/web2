import { create } from "zustand";
import { persist } from "zustand/middleware";
import { effectiveRates } from "@/lib/effective";
import type { MarketResult } from "@/lib/market-types";
import { defaultSettings, type Product, type Settings } from "@/lib/model";
import { roundTo } from "@/lib/pricing";

type Desk = {
  settings: Settings;
  products: Product[];
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  absorbMarket: (market: MarketResult | null) => void;
  followBcv: (market: MarketResult | null) => void;
  followBnb: (market: MarketResult | null) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: number, patch: Partial<Omit<Product, "id">>) => void;
  deleteProduct: (id: number) => void;
  clearProducts: () => void;
  replaceDesk: (settings: Settings, products: Product[]) => void;
};

function withAutoRates(settings: Settings, market: MarketResult | null, forceBcv: boolean, forceBnb: boolean): Settings {
  const next: Settings = { ...settings };
  if (forceBcv) next.cBcvAuto = true;
  if (forceBnb) next.cBnbAuto = true;
  const eff = effectiveRates(market, next);
  if (next.cBcvAuto && eff.bcvUsd > 0) next.cBcvTasa = String(roundTo(eff.bcvUsd, 4));
  if (next.cBnbAuto && eff.bnbAvg > 0) next.cBnbTasa = String(roundTo(eff.bnbAvg, 4));
  return next;
}

export const useDesk = create<Desk>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      products: [],
      setSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      patchSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      absorbMarket: (market) => set({ settings: withAutoRates(get().settings, market, false, false) }),
      followBcv: (market) => set({ settings: withAutoRates(get().settings, market, true, false) }),
      followBnb: (market) => set({ settings: withAutoRates(get().settings, market, false, true) }),
      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, { ...product, id: Date.now() + Math.floor(Math.random() * 1000) }],
        })),
      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      deleteProduct: (id) => set((state) => ({ products: state.products.filter((item) => item.id !== id) })),
      clearProducts: () => set({ products: [] }),
      replaceDesk: (settings, products) => set({ settings, products }),
    }),
    {
      name: "gestion-puerto-ayacucho-v1",
      skipHydration: true,
      partialize: (state) => ({ settings: state.settings, products: state.products }),
    },
  ),
);
