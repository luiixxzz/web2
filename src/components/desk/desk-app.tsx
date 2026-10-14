import { Activity, Divide, Download, Landmark, Package, RefreshCw, Shield, TrendingUp, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useState, type KeyboardEvent } from "react";
import { toast, Toaster } from "sonner";
import { CushionPanel } from "@/components/desk/cushion-panel";
import { DivisionPanel } from "@/components/desk/division-panel";
import { HistoryPanel } from "@/components/desk/history-panel";
import { MarketProvider } from "@/components/desk/market-context";
import { MonitorPanel } from "@/components/desk/monitor-panel";
import { ProductsPanel } from "@/components/desk/products-panel";
import { ProjectionPanel } from "@/components/desk/projection-panel";
import { Button } from "@/components/desk/ui";
import { parseBackup } from "@/lib/backup";
import { useDesk } from "@/lib/desk-store";
import { fmtWhen } from "@/lib/format";
import { getMarket } from "@/lib/market.functions";
import type { MarketResult } from "@/lib/market-types";

const TABS = [
  { id: "monitor", label: "Monitor", icon: Activity },
  { id: "cushion", label: "Colchón", icon: Shield },
  { id: "division", label: "División", icon: Divide },
  { id: "products", label: "Productos", icon: Package },
  { id: "projection", label: "Proyección", icon: TrendingUp },
  { id: "history", label: "Historial BCV", icon: Landmark },
] as const;

type SectionId = (typeof TABS)[number]["id"];

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path d="M4 7h16M4 12h10M4 17h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DeskApp({ initialMarket }: { initialMarket: MarketResult }) {
  const [section, setSection] = useState<SectionId>("monitor");
  const [market, setMarket] = useState(initialMarket);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const fileId = useId();
  const productCount = useDesk((state) => state.products.length);
  const autoRefresh = useDesk((state) => state.settings.autoRefresh);
  const setSetting = useDesk((state) => state.setSetting);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await useDesk.persist.rehydrate();
      } catch {
        /* keep the defaults already on screen */
      }
      if (cancelled) return;
      useDesk.getState().absorbMarket(initialMarket);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialMarket]);

  const refresh = useCallback(async (announce: boolean) => {
    setRefreshing(true);
    try {
      const data = await getMarket({ data: { fresh: true } });
      setMarket(data);
      useDesk.getState().absorbMarket(data);
      if (announce) {
        toast.success(data.ok ? "Tasas actualizadas" : "Las fuentes no respondieron. Usa el ajuste manual.");
      }
    } catch {
      if (announce) toast.error("No se pudo actualizar");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !autoRefresh) return;
    const id = window.setInterval(() => {
      void refresh(false);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, ready, refresh]);

  function toggleAuto() {
    const next = !autoRefresh;
    setSetting("autoRefresh", next);
    toast(next ? "Actualización cada 60 segundos" : "Actualización automática detenida");
    if (next) void refresh(false);
  }

  function exportBackup() {
    const { settings, products } = useDesk.getState();
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      settings,
      products,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `gestion-puerto-ayacucho-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Respaldo descargado");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseBackup(JSON.parse(await file.text()) as unknown);
      if (!parsed) {
        toast.error("Ese archivo no es un respaldo de este sistema");
        return;
      }
      useDesk.getState().replaceDesk(parsed.settings, parsed.products);
      useDesk.getState().absorbMarket(market);
      toast.success("Respaldo importado en este navegador");
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === section);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    if (next) setSection(next.id);
  }

  const sources = [market.bcv?.source, market.p2p?.source, market.cop?.source].filter(Boolean);

  return (
    <MarketProvider value={{ market, refreshing, refresh }}>
      <div className="flex min-h-screen flex-col bg-bg text-fg">
        <div className="h-1 bg-primary" />
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
                <Mark />
              </span>
              <div className="min-w-0">
                <p className="font-display text-2xl leading-none text-fg">Sistema de Gestión</p>
                <p className="mt-1 text-sm text-muted">Puerto Ayacucho · tasas, colchón y precios</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              <p className="mr-1 text-sm text-muted">{market.fetchedAt ? fmtWhen(market.fetchedAt) : "Sin lectura"}</p>
              <Button variant="primary" onClick={() => void refresh(true)} disabled={refreshing}>
                <RefreshCw className={`size-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
                Actualizar
              </Button>
              <Button onClick={toggleAuto} aria-pressed={autoRefresh}>
                Auto {autoRefresh ? "on" : "off"}
              </Button>
              <Button onClick={exportBackup} aria-label="Exportar respaldo">
                <Download className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button onClick={() => document.getElementById(fileId)?.click()} aria-label="Importar respaldo">
                <Upload className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
              <input
                id={fileId}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void importBackup(file);
                }}
              />
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 border-b border-line bg-bg">
          <div
            role="tablist"
            aria-label="Secciones"
            className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6"
            onKeyDown={onTabKey}
          >
            {TABS.map((tab) => {
              const selected = tab.id === section;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${selected ? "border-primary text-fg" : "border-transparent text-muted"}`}
                  onClick={() => setSection(tab.id)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {tab.label}
                  {tab.id === "products" ? (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-fg">{productCount}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          <div role="tabpanel" id={`panel-${section}`} aria-labelledby={`tab-${section}`}>
            {section === "monitor" ? <MonitorPanel /> : null}
            {section === "cushion" ? <CushionPanel /> : null}
            {section === "division" ? <DivisionPanel /> : null}
            {section === "products" ? <ProductsPanel /> : null}
            {section === "projection" ? <ProjectionPanel /> : null}
            {section === "history" ? <HistoryPanel /> : null}
          </div>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-muted sm:px-6">
            <p>Los datos viven solo en este navegador.</p>
            <p>{sources.length ? sources.join(" · ") : "Fuentes no disponibles"}</p>
          </div>
        </footer>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-line)",
            },
          }}
        />
      </div>
    </MarketProvider>
  );
}
