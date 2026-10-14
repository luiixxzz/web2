import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMarket } from "@/components/desk/market-context";
import { Card, NumberField, SectionIntro } from "@/components/desk/ui";
import { effectiveRates } from "@/lib/effective";
import { useDesk } from "@/lib/desk-store";
import { fmt } from "@/lib/format";
import { cushionPercent, pastRate, projectRate, projectionSeries } from "@/lib/pricing";

function Horizon({
  label,
  value,
  unit,
  estimated,
  emphasis,
}: {
  label: string;
  value: string;
  unit: string;
  estimated?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Card className={emphasis ? "border-primary" : ""}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums text-fg">
        {value}
        {estimated ? <span className="text-muted">*</span> : null}
      </p>
      <p className="text-sm text-muted">{unit}</p>
    </Card>
  );
}

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="text-muted">{label === "Hoy" ? "Hoy" : `Día ${label}`}</p>
      {payload.map((item) => (
        <p key={item.name} className="tabular-nums text-fg">
          {item.name}: {fmt(Number(item.value), 2)}
        </p>
      ))}
    </div>
  );
}

export function ProjectionPanel() {
  const { market } = useMarket();
  const settings = useDesk((state) => state.settings);
  const patchSettings = useDesk((state) => state.patchSettings);
  const eff = effectiveRates(market, settings);
  const bcvPct = Number(settings.hBcvPct) || 0;
  const bnbPct = Number(settings.hBnbPct) || 0;
  const series = projectionSeries(eff.bcvUsd, bcvPct, eff.bnbAvg, bnbPct);
  const yesterdayOfficial = eff.bcvUsdSource !== "manual" && (market?.bcv?.prevUsd ?? 0) > 0;

  return (
    <div>
      <SectionIntro title="Proyección">
        Hacia atrás y hacia adelante con la misma fórmula del colchón. Las cifras con asterisco son estimaciones, no el historial publicado del BCV.
      </SectionIntro>
      <Card className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="hBcvPct" label="% diario BCV" step="0.01" value={settings.hBcvPct} onChange={(value) => patchSettings({ hBcvPct: value })} />
          <NumberField id="hBnbPct" label="% diario P2P" step="0.01" value={settings.hBnbPct} onChange={(value) => patchSettings({ hBnbPct: value })} />
        </div>
      </Card>

      <h3 className="mb-3 text-sm font-semibold text-fg">BCV</h3>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Horizon label="Hace 1 mes" value={eff.bcvUsd > 0 ? fmt(pastRate(eff.bcvUsd, bcvPct, 30), 2) : "—"} unit="Bs/USD" estimated />
        <Horizon label="Hace 1 semana" value={eff.bcvUsd > 0 ? fmt(pastRate(eff.bcvUsd, bcvPct, 7), 2) : "—"} unit="Bs/USD" estimated />
        <Horizon
          label={yesterdayOfficial ? "Ayer" : "Ayer"}
          value={
            eff.bcvUsd > 0
              ? yesterdayOfficial
                ? fmt(market?.bcv?.prevUsd ?? 0, 2)
                : fmt(pastRate(eff.bcvUsd, bcvPct, 1), 2)
              : "—"
          }
          unit="Bs/USD"
          estimated={!yesterdayOfficial && eff.bcvUsd > 0}
        />
        <Horizon label="Hoy" value={eff.bcvUsd > 0 ? fmt(eff.bcvUsd, 2) : "—"} unit="Bs/USD" emphasis />
        <Horizon label="Dentro de 1 semana" value={eff.bcvUsd > 0 ? fmt(projectRate(eff.bcvUsd, bcvPct, 7), 2) : "—"} unit="Bs/USD" />
        <Horizon label="Dentro de 1 mes" value={eff.bcvUsd > 0 ? fmt(projectRate(eff.bcvUsd, bcvPct, 30), 2) : "—"} unit="Bs/USD" />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-fg">Binance P2P</h3>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Horizon label="Hace 1 mes" value={eff.bnbAvg > 0 ? fmt(pastRate(eff.bnbAvg, bnbPct, 30), 2) : "—"} unit="Bs/USDT" estimated />
        <Horizon label="Hace 1 semana" value={eff.bnbAvg > 0 ? fmt(pastRate(eff.bnbAvg, bnbPct, 7), 2) : "—"} unit="Bs/USDT" estimated />
        <Horizon label="Ayer" value={eff.bnbAvg > 0 ? fmt(pastRate(eff.bnbAvg, bnbPct, 1), 2) : "—"} unit="Bs/USDT" estimated />
        <Horizon label="Hoy" value={eff.bnbAvg > 0 ? fmt(eff.bnbAvg, 2) : "—"} unit="Bs/USDT" emphasis />
        <Horizon label="Dentro de 1 semana" value={eff.bnbAvg > 0 ? fmt(projectRate(eff.bnbAvg, bnbPct, 7), 2) : "—"} unit="Bs/USDT" />
        <Horizon label="Dentro de 1 mes" value={eff.bnbAvg > 0 ? fmt(projectRate(eff.bnbAvg, bnbPct, 30), 2) : "—"} unit="Bs/USDT" />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-fg">Incremento acumulado</h3>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Horizon label="BCV en 7 días" value={`${fmt(cushionPercent(bcvPct, 7))}%`} unit="Sobre la tasa de hoy" />
        <Horizon label="BCV en 30 días" value={`${fmt(cushionPercent(bcvPct, 30))}%`} unit="Sobre la tasa de hoy" />
        <Horizon label="P2P en 7 días" value={`${fmt(cushionPercent(bnbPct, 7))}%`} unit="Sobre la tasa de hoy" />
        <Horizon label="P2P en 30 días" value={`${fmt(cushionPercent(bnbPct, 30))}%`} unit="Sobre la tasa de hoy" />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-fg">Curva de 30 días</h3>
        <div className="mt-3 h-64">
          {eff.bcvUsd > 0 || eff.bnbAvg > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
                <Tooltip content={<Tip />} />
                <ReferenceLine x="Hoy" stroke="var(--color-line)" />
                <Line type="monotone" dataKey="bcv" name="BCV" stroke="var(--color-primary)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="p2p" name="P2P" stroke="var(--color-fg)" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Actualiza el monitor para dibujar la curva.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">* Estimado con la fórmula inversa. El historial real del BCV está en su propia pestaña.</p>
      </Card>
    </div>
  );
}
