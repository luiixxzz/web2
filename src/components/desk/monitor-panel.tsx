import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMarket } from "@/components/desk/market-context";
import { Card, NumberField, Pill, SectionIntro } from "@/components/desk/ui";
import { effectiveRates, type SideSource } from "@/lib/effective";
import { fmt, fmtPct } from "@/lib/format";
import { useDesk } from "@/lib/desk-store";
import { gapPercent } from "@/lib/pricing";

function sourceTone(source: SideSource): "manual" | "api" | "none" {
  return source;
}

function Change({ pct, versus }: { pct: number | null; versus: string }) {
  if (pct == null) return <p className="mt-3 text-sm text-muted">Sin variación de la fuente</p>;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-3 flex flex-wrap items-center gap-1 text-sm font-semibold ${up ? "text-up" : "text-primary"}`}>
      <Icon className="size-4" aria-hidden="true" />
      <span>{fmtPct(pct)}</span>
      <span className="font-normal text-muted">vs {versus || "el cierre anterior"}</span>
    </p>
  );
}

function Quote({
  label,
  value,
  digits,
  unit,
  source,
  sourceName,
  testId,
  children,
}: {
  label: string;
  value: number;
  digits?: number;
  unit: string;
  source: SideSource;
  sourceName?: string;
  testId?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <Pill tone={sourceTone(source)}>{source === "manual" ? "Manual" : source === "api" ? sourceName || "API" : "Sin dato"}</Pill>
      </div>
      <p data-testid={testId} className="mt-3 font-display text-4xl leading-none tabular-nums text-fg">
        {value > 0 ? fmt(value, digits ?? 2) : "—"}
      </p>
      <p className="mt-2 text-sm text-muted">{unit}</p>
      {children}
    </Card>
  );
}

export function MonitorPanel() {
  const { market } = useMarket();
  const settings = useDesk((state) => state.settings);
  const patchSettings = useDesk((state) => state.patchSettings);
  const eff = effectiveRates(market, settings);
  const gap = gapPercent(eff.bcvUsd, eff.bnbAvg);
  const gapWidth = gap == null ? 0 : Math.min(Math.abs(gap) * 2, 100);

  return (
    <div>
      <SectionIntro title="Monitor">
        Tasas vigentes para cotizar. Un número escrito en el ajuste manual reemplaza a la fuente automática; déjalo vacío para volver a la API.
      </SectionIntro>

      {market && market.notes.length > 0 ? (
        <p className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-fg" role="status">
          Alguna fuente no respondió. El ajuste manual cubre el hueco. {market.notes.join(" · ")}
        </p>
      ) : null}

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-fg">Ajuste manual</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField id="manualBcv" label="BCV (Bs/USD)" step="0.0001" value={settings.manualBcv} onChange={(value) => patchSettings({ manualBcv: value })} />
          <NumberField id="manualBnbBuy" label="Binance compra" step="0.01" value={settings.manualBnbBuy} onChange={(value) => patchSettings({ manualBnbBuy: value })} />
          <NumberField id="manualBnbSell" label="Binance venta" step="0.01" value={settings.manualBnbSell} onChange={(value) => patchSettings({ manualBnbSell: value })} />
          <NumberField id="manualCop" label="COP por USD" step="0.01" value={settings.manualCop} onChange={(value) => patchSettings({ manualCop: value })} />
        </div>
      </Card>

      <h3 className="mb-3 text-sm font-semibold text-fg">Banco Central de Venezuela</h3>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Quote testId="bcv-usd" label="Dólar oficial" value={eff.bcvUsd} digits={4} unit="Bs por USD" source={eff.bcvUsdSource} sourceName={eff.bcvName}>
          <Change pct={eff.usdChangePct} versus={eff.prevDate} />
          {eff.bcvDate ? <p className="mt-1 text-xs text-muted">Fecha de la fuente: {eff.bcvDate}</p> : null}
        </Quote>
        <Quote label="Euro oficial" value={eff.bcvEur} digits={4} unit="Bs por EUR" source={eff.bcvEurSource} sourceName={eff.bcvName}>
          <Change pct={eff.eurChangePct} versus={eff.prevDate} />
        </Quote>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-fg">Mercado P2P</h3>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Quote label="Binance compra" value={eff.bnbBuy} unit="Bs por USDT" source={eff.bnbBuySource} sourceName={eff.p2pName} />
        <Quote label="Binance venta" value={eff.bnbSell} unit="Bs por USDT" source={eff.bnbSellSource} sourceName={eff.p2pName} />
        <Quote label="Bybit compra" value={eff.bybBuy} unit="Bs por USDT" source={eff.bybitSource} sourceName={eff.p2pName} />
        <Quote label="Bybit venta" value={eff.bybSell} unit="Bs por USDT" source={eff.bybitSource} sourceName={eff.p2pName} />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Quote testId="p2p-avg" label="Promedio Binance" value={eff.bnbAvg} unit="Compra y venta" source={eff.bnbBuySource === "manual" || eff.bnbSellSource === "manual" ? "manual" : eff.bnbAvg > 0 ? "api" : "none"} sourceName={eff.p2pName} />
        <Card>
          <p className="text-sm font-semibold text-muted">Brecha BCV contra P2P</p>
          <p className="mt-3 font-display text-4xl leading-none tabular-nums text-fg">{gap == null ? "—" : fmtPct(gap)}</p>
          <p className="mt-2 text-sm text-muted">Cuánto más caro está el paralelo frente al oficial</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className={`h-full ${gap != null && gap > 15 ? "bg-up" : "bg-primary"}`} style={{ width: `${gapWidth}%` }} />
          </div>
        </Card>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-fg">Peso colombiano</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Quote testId="cop-usd" label="COP por dólar" value={eff.cop} unit="Pesos por 1 USD" source={eff.copSource} sourceName={eff.copName} />
        <Quote label="Dólar en pesos" value={eff.cop > 0 ? 1 / eff.cop : 0} digits={6} unit="USD por 1 COP" source={eff.copSource} sourceName={eff.copName} />
      </div>
    </div>
  );
}
