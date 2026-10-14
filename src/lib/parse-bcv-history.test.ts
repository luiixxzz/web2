import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBackup } from "./backup.ts";
import { historyStats, parseFinanzasTable, recentMonths } from "./parse-bcv-history.ts";

const SAMPLE = `
<table><caption>Tasas de octubre de 2026</caption><tbody>
<tr><td><a href="/a">01/10/2026</a></td><td><a href="/a">860,1753</a></td><td class="fdtc-positive">+0,13%</td></tr>
<tr><td><a href="/b">02/10/2026</a></td><td>866,5612</td><td class="fdtc-positive">+0,74%</td></tr>
<tr><td><a href="/a">01/10/2026</a></td><td>860,1753</td><td>+0,13%</td></tr>
</tbody></table>
`;

describe("bcv history parser", () => {
  it("reads fecha, tasa and daily variation, dropping duplicate days", () => {
    const points = parseFinanzasTable(SAMPLE);
    assert.equal(points.length, 2);
    assert.equal(points[0]?.iso, "2026-10-01");
    assert.equal(points[0]?.tasa, 860.1753);
    assert.equal(points[0]?.variacion, 0.13);
    assert.equal(points[1]?.tasa, 866.5612);
    const stats = historyStats(points);
    assert.equal(stats?.minimo, 860.1753);
    assert.equal(stats?.maximo, 866.5612);
    assert.ok(stats?.variacionMedia != null && Math.abs(stats.variacionMedia - (0.13 + 0.74) / 2) < 1e-9);
  });

  it("builds a Caracas month window oldest-first", () => {
    const months = recentMonths(3, new Date("2026-10-10T18:00:00Z"));
    assert.deepEqual(months, [
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
  });
});

describe("backup", () => {
  it("imports the old export and drops workspace credentials", () => {
    const parsed = parseBackup({
      settings: { manualBcv: "100", cBcvTasa: "101", cBcvPct: "0.5", pTasaTipo: "bnb" },
      productos: [{ id: 1, nombre: "Aceite", costo: 3200, ganancia: 15 }],
      workspace: { roomId: "secreto", firebaseConfig: { apiKey: "no-debe-pasar" } },
      exportDate: "2026-01-01",
    });
    assert.ok(parsed);
    assert.equal(parsed?.settings.manualBcv, "100");
    assert.equal(parsed?.settings.pTasaTipo, "bnb");
    assert.equal(parsed?.settings.cBcvAuto, false);
    assert.equal(parsed?.products[0]?.nombre, "Aceite");
    assert.equal(JSON.stringify(parsed).includes("no-debe-pasar"), false);
    assert.equal(JSON.stringify(parsed).includes("secreto"), false);
  });

  it("rejects unrelated files", () => {
    assert.equal(parseBackup({ hello: "world" }), null);
    assert.equal(parseBackup(null), null);
  });
});
