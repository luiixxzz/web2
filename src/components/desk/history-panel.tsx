import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button, Card, SectionIntro } from "@/components/desk/ui";
import { fmt, fmtPct, fmtWhen } from "@/lib/format";
import { getBcvHistory } from "@/lib/market.functions";
import type { BcvPoint, HistoryResult } from "@/lib/market-types";
import { historyStats } from "@/lib/parse-bcv-history";

const SPANS = [6, 12, 24] as const;

function Tip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { fecha?: string; tasa?: number } }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="text-muted">{point.fecha}</p>
      <p className="tabular-nums text-fg">{fmt(point.tasa, 4)} Bs/USD</p>
    </div>
  );
}

export function HistoryPanel() {
  const [months, setMonths] = useState<(typeof SPANS)[number]>(12);
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getBcvHistory({ data: { months, fresh: false } })
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        if (!data.ok) toast.error(data.error || "No se pudo leer el historial");
      })
      .catch(() => {
        if (!cancelled) toast.error("No se pudo leer el historial");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  async function reload() {
    setLoading(true);
    try {
      const data = await getBcvHistory({ data: { months, fresh: true } });
      setResult(data);
      if (data.ok) toast.success(`Historial actualizado · ${data.points.length} días`);
      else toast.error(data.error || "No se pudo leer el historial");
    } catch {
      toast.error("No se pudo leer el historial");
    } finally {
      setLoading(false);
    }
  }

  const points = result?.points ?? [];
  const stats = historyStats(points);
  const rows = newestFirst ? [...points].reverse() : points;
  const chart = points.map((point) => ({
    label: point.fecha.slice(0, 5),
    fecha: point.fecha,
    tasa: point.tasa,
  }));

  return (
    <div>
      <SectionIntro title="Historial BCV">
        Tasas diarias publicadas, no una estimación. Se leen de finanzasdigital.com para los meses que elijas.
      </SectionIntro>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SPANS.map((span) => (
          <Button key={span} variant={span === months ? "primary" : "ghost"} onClick={() => setMonths(span)} aria-pressed={span === months}>
            {span} meses
          </Button>
        ))}
        <Button onClick={() => void reload()} disabled={loading}>
          {loading ? "Leyendo…" : "Actualizar historial"}
        </Button>
        <Button onClick={() => setNewestFirst((value) => !value)} aria-pressed={newestFirst}>
          {newestFirst ? "Reciente primero" : "Antiguo primero"}
        </Button>
        <span className="text-sm text-muted">{stats ? `${stats.total} días` : loading ? "Cargando" : "Sin filas"}</span>
      </div>

      {result?.fetchedAt ? <p className="mb-4 text-xs text-muted">Lectura: {fmtWhen(result.fetchedAt)} · {result.source}</p> : null}

      {stats ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Promedio" value={fmt(stats.promedio, 4)} />
          <Stat label="Máximo" value={fmt(stats.maximo, 4)} detail={stats.maxFecha} tone="up" />
          <Stat label="Mínimo" value={fmt(stats.minimo, 4)} detail={stats.minFecha} />
          <Stat label="Variación diaria media" value={fmtPct(stats.variacionMedia)} />
          <Stat label="Última tasa" value={fmt(stats.ultimo, 4)} detail={stats.ultimaFecha} />
          <Stat label="Días publicados" value={String(stats.total)} />
        </div>
      ) : null}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-fg">Serie</h3>
        <div className="mt-3 h-64">
          {chart.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={64} domain={["auto", "auto"]} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="tasa" name="BCV" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">{loading ? "Reuniendo los meses publicados…" : result?.error || "Sin datos para graficar."}</p>
          )}
        </div>
      </Card>

      <div className="max-h-panel overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-surface-2 text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Tasa Bs/USD</th>
              <th className="px-4 py-3 font-semibold">Variación</th>
            </tr>
          </thead>
          <tbody className="bg-surface">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted">
                  {loading ? "Leyendo el historial…" : "No hay filas para este período."}
                </td>
              </tr>
            ) : (
              rows.map((point) => <HistoryRow key={point.iso} point={point} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "up" }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl tabular-nums ${tone === "up" ? "text-up" : "text-fg"}`}>{value}</p>
      {detail ? <p className="text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

function HistoryRow({ point }: { point: BcvPoint }) {
  const up = (point.variacion ?? 0) > 0;
  const down = (point.variacion ?? 0) < 0;
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-2.5">{point.fecha}</td>
      <td className="px-4 py-2.5 font-semibold tabular-nums">{fmt(point.tasa, 4)}</td>
      <td className={`px-4 py-2.5 tabular-nums ${up ? "text-up" : down ? "text-primary" : "text-muted"}`}>
        {fmtPct(point.variacion)}
      </td>
    </tr>
  );
}
