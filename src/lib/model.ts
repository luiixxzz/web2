export type RateChoice = "bcv" | "bnb";

export type Settings = {
  manualBcv: string;
  manualBnbBuy: string;
  manualBnbSell: string;
  manualCop: string;
  cBcvTasa: string;
  cBcvPct: string;
  cBcvDias: string;
  cBnbTasa: string;
  cBnbPct: string;
  cBnbDias: string;
  cBcvAuto: boolean;
  cBnbAuto: boolean;
  dCop: string;
  dBcv: string;
  dBnb: string;
  dBcvAuto: boolean;
  dBnbAuto: boolean;
  hBcvPct: string;
  hBnbPct: string;
  pTasaTipo: RateChoice;
  autoRefresh: boolean;
};

export type Product = {
  id: number;
  nombre: string;
  costo: number;
  ganancia: number;
};

export const defaultSettings: Settings = {
  manualBcv: "",
  manualBnbBuy: "",
  manualBnbSell: "",
  manualCop: "",
  cBcvTasa: "",
  cBcvPct: "0.6",
  cBcvDias: "7",
  cBnbTasa: "",
  cBnbPct: "0.6",
  cBnbDias: "7",
  cBcvAuto: true,
  cBnbAuto: true,
  dCop: "3200",
  dBcv: "",
  dBnb: "",
  dBcvAuto: true,
  dBnbAuto: true,
  hBcvPct: "0.6",
  hBnbPct: "0.6",
  pTasaTipo: "bcv",
  autoRefresh: false,
};

export const STRING_SETTING_KEYS = [
  "manualBcv",
  "manualBnbBuy",
  "manualBnbSell",
  "manualCop",
  "cBcvTasa",
  "cBcvPct",
  "cBcvDias",
  "cBnbTasa",
  "cBnbPct",
  "cBnbDias",
  "dCop",
  "dBcv",
  "dBnb",
  "hBcvPct",
  "hBnbPct",
] as const satisfies readonly (keyof Settings)[];

export const BOOLEAN_SETTING_KEYS = [
  "cBcvAuto",
  "cBnbAuto",
  "dBcvAuto",
  "dBnbAuto",
  "autoRefresh",
] as const satisfies readonly (keyof Settings)[];
