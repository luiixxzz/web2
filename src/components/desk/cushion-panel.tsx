import { useMarket } from "@/components/desk/market-context";
import { Card, NumberField, SectionIntro } from "@/components/desk/ui";
import { useDesk } from "@/lib/desk-store";
import { fmt } from "@/lib/format";
import { cushionQuote } from "@/lib/pricing";

function CushionBlock({
  title,
  unit,
  tasaId,
  pctId,
  diasId,
  tasa,
  pct,
  dias,
  linked,
  onTasa,
  onPct,
  onDias,
  onFollow,
}: {
  title: string;
  unit: string;
  tasaId: string;
  pctId: string;
  diasId: string;
  tasa: string;
  pct: string;
  dias: string;
  linked: boolean;
  onTasa: (value: string) => void;
  onPct: (value: string) => void;
  onDias: (value: string) => void;
  onFollow: () => void;
}) {
  const quote = cushionQuote(tasa, pct, dias);
  return (
    <Card>
      <h3 className="font-display text-2xl text-fg">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <NumberField id={tasaId} label={`Tasa actual (${unit})`} step="0.0001" value={tasa} onChange={onTasa} />
        <NumberField id={pctId} label="% de devaluación diaria" step="0.01" value={pct} onChange={onPct} />
        <NumberField id={diasId} label="Días a proyectar" step="1" min="1" value={dias} onChange={onDias} />
      </div>
      <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
        <span>{linked ? "Esta tasa sigue al monitor." : "Estás usando una tasa escrita a mano."}</span>
        {!linked ? (
          <button type="button" className="font-semibold text-primary" onClick={onFollow}>
            Volver al monitor
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-surface-2 px-4 py-3">
          <p className="text-sm text-muted">Tasa proyectada</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-fg">{quote ? fmt(quote.projected, 4) : "—"}</p>
          <p className="text-sm text-muted">
            {unit} en {quote ? quote.days : (dias || "7")} días
          </p>
        </div>
        <div className="rounded-md bg-surface-2 px-4 py-3">
          <p className="text-sm text-muted">Colchón total</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-primary">{quote ? `${fmt(quote.cushion)}%` : "—"}</p>
          <p className="text-sm text-muted">Protección acumulada del período</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">
        {quote
          ? `${fmt(quote.rate, 4)} × (1 + ${fmt(quote.pct, 2)} / 100) ^ ${quote.days} = ${fmt(quote.projected, 4)}`
          : "Escribe tasa y porcentaje para ver la fórmula."}
      </p>
    </Card>
  );
}

export function CushionPanel() {
  const { market } = useMarket();
  const settings = useDesk((state) => state.settings);
  const patchSettings = useDesk((state) => state.patchSettings);
  const followBcv = useDesk((state) => state.followBcv);
  const followBnb = useDesk((state) => state.followBnb);

  return (
    <div>
      <SectionIntro title="Colchón">
        Proyección con interés compuesto para no quedarte corto si el bolívar se mueve antes de reponer. La misma tasa proyectada alimenta la división y los precios.
      </SectionIntro>
      <div className="grid gap-4">
        <CushionBlock
          title="BCV"
          unit="Bs/USD"
          tasaId="cBcvTasa"
          pctId="cBcvPct"
          diasId="cBcvDias"
          tasa={settings.cBcvTasa}
          pct={settings.cBcvPct}
          dias={settings.cBcvDias}
          linked={settings.cBcvAuto}
          onTasa={(value) => patchSettings({ cBcvTasa: value, cBcvAuto: false })}
          onPct={(value) => patchSettings({ cBcvPct: value })}
          onDias={(value) => patchSettings({ cBcvDias: value })}
          onFollow={() => followBcv(market)}
        />
        <CushionBlock
          title="Binance P2P"
          unit="Bs/USDT"
          tasaId="cBnbTasa"
          pctId="cBnbPct"
          diasId="cBnbDias"
          tasa={settings.cBnbTasa}
          pct={settings.cBnbPct}
          dias={settings.cBnbDias}
          linked={settings.cBnbAuto}
          onTasa={(value) => patchSettings({ cBnbTasa: value, cBnbAuto: false })}
          onPct={(value) => patchSettings({ cBnbPct: value })}
          onDias={(value) => patchSettings({ cBnbDias: value })}
          onFollow={() => followBnb(market)}
        />
      </div>
    </div>
  );
}
