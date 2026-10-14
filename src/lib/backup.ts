import {
  BOOLEAN_SETTING_KEYS,
  STRING_SETTING_KEYS,
  defaultSettings,
  type Product,
  type Settings,
} from "./model.ts";

export type BackupFile = {
  version: 1;
  exportedAt: string;
  settings: Settings;
  products: Product[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return null;
}

function productsFrom(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  const products: Product[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row) continue;
    const nombre = asString(row.nombre)?.trim() ?? "";
    const costo = typeof row.costo === "number" ? row.costo : Number(row.costo);
    const ganancia = typeof row.ganancia === "number" ? row.ganancia : Number(row.ganancia);
    if (!nombre || !Number.isFinite(costo) || costo < 0 || !Number.isFinite(ganancia)) continue;
    const id = typeof row.id === "number" && Number.isFinite(row.id) ? row.id : Date.now() + products.length;
    products.push({ id, nombre, costo, ganancia });
  }
  return products;
}

/** Accepts this app's backup and the previous JSON export. Drops workspace, Firebase and passwords. */
export function parseBackup(raw: unknown): { settings: Settings; products: Product[] } | null {
  const root = asRecord(raw);
  if (!root) return null;

  const settingsRaw = asRecord(root.settings) ?? root;
  const products = productsFrom(root.products ?? root.productos);
  const hasSettings = STRING_SETTING_KEYS.some((key) => asString(settingsRaw[key]) != null);
  if (!hasSettings && products.length === 0) return null;

  const settings: Settings = { ...defaultSettings };
  for (const key of STRING_SETTING_KEYS) {
    const value = asString(settingsRaw[key]);
    if (value != null) settings[key] = value;
  }
  for (const key of BOOLEAN_SETTING_KEYS) {
    if (typeof settingsRaw[key] === "boolean") settings[key] = settingsRaw[key];
  }
  if (settingsRaw.pTasaTipo === "bcv" || settingsRaw.pTasaTipo === "bnb") {
    settings.pTasaTipo = settingsRaw.pTasaTipo;
  }

  const legacy = !("version" in root);
  if (legacy) {
    if (asString(settingsRaw.cBcvTasa)) settings.cBcvAuto = false;
    if (asString(settingsRaw.cBnbTasa)) settings.cBnbAuto = false;
    if (asString(settingsRaw.dBcv)) settings.dBcvAuto = false;
    if (asString(settingsRaw.dBnb)) settings.dBnbAuto = false;
  }

  return { settings, products };
}
