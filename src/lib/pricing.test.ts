import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { productDivision } from "./effective.ts";
import { defaultSettings } from "./model.ts";
import {
  cushionPercent,
  divisionRate,
  pastRate,
  priceBs,
  projectRate,
} from "./pricing.ts";

describe("pricing", () => {
  it("compounds the cushion the same way as the original desk", () => {
    const factor = Math.pow(1.006, 7);
    assert.ok(Math.abs(projectRate(100, 0.6, 7) - 100 * factor) < 1e-9);
    assert.ok(Math.abs(cushionPercent(0.6, 7) - (factor - 1) * 100) < 1e-9);
    assert.ok(Math.abs(pastRate(100, 0.6, 7) - 100 / factor) < 1e-9);
  });

  it("prices one dollar of COP at the cushioned bolívar rate", () => {
    const settings = {
      ...defaultSettings,
      dCop: "3200",
      cBcvTasa: "800",
      cBcvPct: "0.6",
      cBcvDias: "7",
      pTasaTipo: "bcv" as const,
    };
    const projected = projectRate(800, 0.6, 7);
    const tasa = productDivision(settings, null);
    assert.ok(Math.abs(tasa - divisionRate(3200, projected)) < 1e-9);
    assert.ok(Math.abs(priceBs(3200, 0, tasa) - projected) < 1e-6);
    assert.ok(Math.abs(priceBs(3200, 15, tasa) - projected * 1.15) < 1e-6);
  });

  it("prefers a manual BCV rate over the feed", () => {
    const settings = { ...defaultSettings, manualBcv: "900", cBcvTasa: "900", cBcvPct: "0", pTasaTipo: "bcv" as const };
    const tasa = productDivision(settings, {
      ok: true,
      fetchedAt: "",
      bcv: {
        usd: 100,
        eur: null,
        prevUsd: null,
        prevEur: null,
        prevDate: "",
        date: "",
        usdChangePct: 1,
        eurChangePct: null,
        source: "test",
      },
      p2p: null,
      cop: null,
      notes: [],
    });
    assert.ok(Math.abs(tasa - divisionRate(3200, 900)) < 1e-9);
  });
});
