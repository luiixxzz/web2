import { useMarket } from "@/components/desk/market-context";
import { Button, Card, NumberField, SectionIntro } from "@/components/desk/ui";
import { effectiveRates } from "@/lib/effective";
import { useDesk } from "@/lib/desk-store";
import { fmt } from "@/lib/format";
import { cushionQuote, divisionRate, num, roundTo } from "@/lib/pricing";

export function DivisionPanel() {
  const { market } = useMarket();
  const settings = useDesk((state) => state.settings);
  const patchSettings = useDesk((state) => state.patchSettings);
  const eff = effectiveRates(market, settings);
  const bcvQuote = cushionQuote(settings.cBcvTasa, settings.cBcvPct, settings.cBcvDias);
  const bnbQuote = cushionQuote(settings.cBnbTasa, settings.cBnbPct, settings.cBnbDias);
  const dBcv = settings.dBcvAuto ? (bcvQuote ? String(roundTo(bcvQuote.projected, 4)) : "") : settings.dBcv;
  const dBnb = settings.dBnbAuto ? (bnbQuote ? String(roundTo(bnbQuote.projected, 4)) : "") : settings.dBnb;
  const cop = num(settings.dCop);
  const bcvDiv = divisionRate(cop, num(dBcv));
  const bnbDiv = divisionRate(cop, num(dBnb));

  return (
    <div>
      <SectionIntro title="División">
        La tasa de división es cuántos pesos colombianos equivalen a un bolívar. Los productos dividen su precio en COP entre esta tasa para obtener bolívares.
      </SectionIntro>
      <Card className="mb-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <NumberField
            id="dCop"
            label="COP por 1 USD"
            step="0.01"
            value={settings.dCop}
            onChange={(value) => patchSettings({ dCop: value })}
            hint={eff.cop > 0 ? `Monitor: ${fmt(eff.cop)}` : "Usada para precios, independiente del monitor"}
          />
          <NumberField
            id="dBcv"
            label="BCV con colchón (Bs/USD)"
            step="0.0001"
            value={dBcv}
            onChange={(value) => patchSettings({ dBcv: value, dBcvAuto: false })}
            hint={settings.dBcvAuto ? "Sigue la proyección del colchón" : "Valor fijo"}
          />
          <NumberField
            id="dBnb"
            label="Binance con colchón (Bs/USDT)"
            step="0.0001"
            value={dBnb}
            onChange={(value) => patchSettings({ dBnb: value, dBnbAuto: false })}
            hint={settings.dBnbAuto ? "Sigue la proyección del colchón" : "Valor fijo"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {eff.cop > 0 ? (
            <Button onClick={() => patchSettings({ dCop: String(roundTo(eff.cop, 4)) })}>Usar COP del monitor</Button>
          ) : null}
          {!settings.dBcvAuto ? (
            <Button onClick={() => patchSettings({ dBcvAuto: true })}>Enlazar BCV al colchón</Button>
          ) : null}
          {!settings.dBnbAuto ? (
            <Button onClick={() => patchSettings({ dBnbAuto: true })}>Enlazar Binance al colchón</Button>
          ) : null}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Result title="División BCV" rate={bcvDiv} cop={cop} />
        <Result title="División Binance" rate={bnbDiv} cop={cop} />
      </div>
    </div>
  );
}

function Result({ title, rate, cop }: { title: string; rate: number; cop: number }) {
  const example = rate > 0 && cop > 0 ? cop / rate : 0;
  return (
    <Card>
      <p className="text-sm font-semibold text-muted">{title}</p>
      <p className="mt-3 font-display text-4xl tabular-nums text-fg">{rate > 0 ? fmt(rate, 4) : "—"}</p>
      <p className="mt-2 text-sm text-muted">COP por cada bolívar</p>
      <p className="mt-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg">
        {example > 0
          ? `1 USD (${fmt(cop)} COP) queda en ${fmt(example)} Bs.`
          : "Completa COP y la tasa en bolívares."}
      </p>
    </Card>
  );
}
