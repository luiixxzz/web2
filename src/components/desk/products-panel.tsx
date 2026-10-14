import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMarket } from "@/components/desk/market-context";
import { Button, Card, SectionIntro, TextField, fieldClass } from "@/components/desk/ui";
import { productDivision } from "@/lib/effective";
import { useDesk } from "@/lib/desk-store";
import { fmt } from "@/lib/format";
import type { Product } from "@/lib/model";
import { num, priceBs, priceCop } from "@/lib/pricing";

function Cell({
  value,
  onCommit,
  type = "text",
  label,
}: {
  value: string;
  onCommit: (value: string) => void;
  type?: "text" | "number";
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <input
      aria-label={label}
      className={fieldClass}
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      min={type === "number" ? "0" : undefined}
      step={type === "number" ? "0.1" : undefined}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

export function ProductsPanel() {
  const { market } = useMarket();
  const products = useDesk((state) => state.products);
  const settings = useDesk((state) => state.settings);
  const patchSettings = useDesk((state) => state.patchSettings);
  const addProduct = useDesk((state) => state.addProduct);
  const updateProduct = useDesk((state) => state.updateProduct);
  const deleteProduct = useDesk((state) => state.deleteProduct);
  const clearProducts = useDesk((state) => state.clearProducts);
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState("");
  const [ganancia, setGanancia] = useState("");
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const tasa = productDivision(settings, market);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => product.nombre.toLowerCase().includes(needle));
  }, [products, query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = nombre.trim();
    const cost = num(costo);
    const margin = num(ganancia);
    if (!name || cost <= 0) {
      toast.error("Escribe nombre y costo en COP");
      return;
    }
    addProduct({ nombre: name, costo: cost, ganancia: margin });
    setNombre("");
    setCosto("");
    setGanancia("");
    toast.success("Producto agregado");
  }

  return (
    <div>
      <SectionIntro title="Productos">
        Costo en pesos y margen. El precio en bolívares usa la tasa de división{" "}
        {settings.pTasaTipo === "bcv" ? "BCV" : "Binance"} con colchón
        {tasa > 0 ? `: ${fmt(tasa, 4)}` : ""}.
      </SectionIntro>

      <Card className="mb-4">
        <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end" onSubmit={submit}>
          <TextField id="pNombre" label="Nombre" value={nombre} onChange={setNombre} placeholder="Aceite 1L" />
          <label className="grid gap-1.5" htmlFor="pCosto">
            <span className="text-sm font-semibold text-fg">Costo (COP)</span>
            <input id="pCosto" className={fieldClass} type="number" min="0" step="0.01" inputMode="decimal" placeholder="3200" value={costo} onChange={(event) => setCosto(event.target.value)} />
          </label>
          <label className="grid gap-1.5" htmlFor="pGanancia">
            <span className="text-sm font-semibold text-fg">% de ganancia</span>
            <input id="pGanancia" className={fieldClass} type="number" min="0" step="0.1" inputMode="decimal" placeholder="15" value={ganancia} onChange={(event) => setGanancia(event.target.value)} />
          </label>
          <Button type="submit" variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            Agregar
          </Button>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted" htmlFor="pTasaTipo">
            Tasa
          </label>
          <select
            id="pTasaTipo"
            className={`${fieldClass} w-auto`}
            value={settings.pTasaTipo}
            onChange={(event) => patchSettings({ pTasaTipo: event.target.value === "bnb" ? "bnb" : "bcv" })}
          >
            <option value="bcv">BCV con colchón</option>
            <option value="bnb">Binance con colchón</option>
          </select>
          <input className={`${fieldClass} w-36`} readOnly aria-label="Tasa de división" value={tasa > 0 ? fmt(tasa, 4) : ""} placeholder="Sin tasa" />
          <input
            className={`${fieldClass} w-44`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            aria-label="Buscar producto"
          />
        </div>
        {products.length > 0 ? (
          confirmClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-fg">¿Borrar {products.length} productos?</span>
              <Button
                variant="danger"
                onClick={() => {
                  clearProducts();
                  setConfirmClear(false);
                  toast.success("Catálogo borrado");
                }}
              >
                Sí, borrar
              </Button>
              <Button onClick={() => setConfirmClear(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Borrar todos
            </Button>
          )
        ) : null}
      </div>

      {products.length === 0 ? (
        <Card>
          <p className="font-display text-2xl text-fg">Todavía no hay productos</p>
          <p className="mt-2 max-w-md text-sm text-muted">Agrega el primero con su costo en pesos. El precio en bolívares se calcula solo.</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Ningún producto coincide con “{query.trim()}”.</p>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} tasa={tasa} onUpdate={updateProduct} onDelete={deleteProduct} />
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2 text-left text-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">Producto</th>
                  <th className="px-3 py-3 font-semibold">Costo COP</th>
                  <th className="px-3 py-3 font-semibold">% ganancia</th>
                  <th className="px-3 py-3 font-semibold">Precio COP</th>
                  <th className="px-3 py-3 font-semibold">Precio Bs</th>
                  <th className="px-3 py-3 font-semibold">
                    <span className="sr-only">Quitar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {visible.map((product) => {
                  const cop = priceCop(product.costo, product.ganancia);
                  const bs = priceBs(product.costo, product.ganancia, tasa);
                  return (
                    <tr key={product.id} className="border-t border-line">
                      <td className="px-3 py-2">
                        <Cell label={`Nombre de ${product.nombre}`} value={product.nombre} onCommit={(value) => updateProduct(product.id, { nombre: value })} />
                      </td>
                      <td className="px-3 py-2">
                        <Cell label={`Costo de ${product.nombre}`} type="number" value={String(product.costo)} onCommit={(value) => updateProduct(product.id, { costo: num(value) })} />
                      </td>
                      <td className="px-3 py-2">
                        <Cell label={`Ganancia de ${product.nombre}`} type="number" value={String(product.ganancia)} onCommit={(value) => updateProduct(product.id, { ganancia: num(value) })} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{fmt(cop)}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-primary">{tasa > 0 ? fmt(bs) : "—"}</td>
                      <td className="px-3 py-2">
                        <Button className="w-11 px-0" variant="danger" aria-label={`Quitar ${product.nombre}`} onClick={() => deleteProduct(product.id)}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ProductCard({
  product,
  tasa,
  onUpdate,
  onDelete,
}: {
  product: Product;
  tasa: number;
  onUpdate: (id: number, patch: Partial<Omit<Product, "id">>) => void;
  onDelete: (id: number) => void;
}) {
  const cop = priceCop(product.costo, product.ganancia);
  const bs = priceBs(product.costo, product.ganancia, tasa);
  return (
    <Card>
      <Cell label={`Nombre de ${product.nombre}`} value={product.nombre} onCommit={(value) => onUpdate(product.id, { nombre: value })} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-xs text-muted">
          Costo COP
          <Cell label={`Costo de ${product.nombre}`} type="number" value={String(product.costo)} onCommit={(value) => onUpdate(product.id, { costo: num(value) })} />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          % ganancia
          <Cell label={`Ganancia de ${product.nombre}`} type="number" value={String(product.ganancia)} onCommit={(value) => onUpdate(product.id, { ganancia: num(value) })} />
        </label>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Precio</p>
          <p className="tabular-nums text-fg">{fmt(cop)} COP</p>
          <p className="font-display text-2xl tabular-nums text-primary">{tasa > 0 ? `${fmt(bs)} Bs` : "—"}</p>
        </div>
        <Button variant="danger" aria-label={`Quitar ${product.nombre}`} onClick={() => onDelete(product.id)}>
          Quitar
        </Button>
      </div>
    </Card>
  );
}
