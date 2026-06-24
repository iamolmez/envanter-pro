import React, { useState, useEffect, useCallback, useRef } from "react";
import { productService, stockMovementService } from "../services/api";
import type { Product } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useI18n";

export default function StockIn() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentEntries, setRecentEntries] = useState<Array<{ id: number; productName: string; quantity: number }>>([]);
  const [barcodeLookup, setBarcodeLookup] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    try {
      const data = await productService.getAll({ search: q, limit: 10 });
      setProducts(data.products);
      setShowResults(true);
    } catch {
      setProducts([]);
      toast.error(t("common.error"));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(search), 300);
    return () => clearTimeout(t);
  }, [search, searchProducts]);

  const handleBarcodeLookup = async () => {
    const code = barcodeLookup.trim();
    if (!code) return;
    setLookupLoading(true);
    try {
      const result = await productService.lookupBarcode(code);
      if (result.found && result.source === "local" && result.product) {
        const p = result.product;
        setSelected({
          id: p.id, name: p.name, sku: p.sku, barcode: code, category: p.category,
          purchasePriceUSD: p.purchasePriceUSD, salePriceUSD: p.salePriceUSD,
          currentStock: p.currentStock, unit: p.unit, description: null,
          minStockLevel: 5, isActive: true, createdAt: "", updatedAt: "",
        });
        setSearch(p.name);
        setUnitPrice(p.purchasePriceUSD.toString());
        setQuantity(1);
        toast.success(`✓ ${p.name} (${t("stock.currentStock")}: ${p.currentStock})`);
      } else if (result.found && result.source !== "local") {
        toast((toastId) => (
          <div className="text-body-md">
            <p className="font-medium mb-1">🌐 {result.productName}</p>
            <p className="text-body-sm text-on-surface-variant mb-2">{t("barcode.onlineInfo")}</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                toast.dismiss(toastId.id);
                try {
                  const np = await productService.create({ name: result.productName || code, barcode: code, category: result.category || "Genel", purchasePriceUSD: 0, salePriceUSD: 0 });
                  setSelected(np); setSearch(np.name); setUnitPrice(""); setQuantity(1);
                  toast.success(`✓ ${np.name} ${t("products.created")}`);
                } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
              }} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm hover:bg-primary/90 transition">{t("barcode.saveProduct")}</button>
              <button onClick={() => toast.dismiss(toastId.id)} className="px-3 py-1.5 rounded-lg border border-outline-variant text-label-sm hover:bg-surface-container-low transition">{t("common.cancel")}</button>
            </div>
          </div>
        ), { duration: 8000 });
      } else {
        toast.error(t("stock.notFoundBarcode"));
      }
    } catch { toast.error(t("common.error")); }
    finally { setLookupLoading(false); setBarcodeLookup(""); }
  };

  const selectProduct = (p: Product) => {
    setSelected(p); setSearch(p.name); setUnitPrice(p.purchasePriceUSD.toString()); setShowResults(false); setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { toast.error(t("stock.selectProduct")); return; }
    if (quantity < 1) { toast.error(t("common.error")); return; }
    setSending(true);
    try {
      await stockMovementService.stockIn({ productId: selected.id, quantity, unitPriceUSD: parseFloat(unitPrice) || undefined, note: note.trim() || undefined });
      toast.success(`${selected.name} → +${quantity} ${t("dashboard.items")}`);
      setRecentEntries((prev) => [{ id: Date.now(), productName: selected.name, quantity }, ...prev.slice(0, 9)]);
      setSelected(null); setSearch(""); setQuantity(1); setUnitPrice(""); setNote("");
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-sm">
          <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-bold text-primary">{t("stockIn.title")}</h1>
        </div>
      </header>

      <main className="pt-20 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-xl mx-auto space-y-6">
        {/* Barkod ile hızlı bul */}
        <div className="bg-white dark:bg-surface-dim rounded-xl border border-outline-variant p-4">
          <label className="block text-label-sm text-on-surface-variant mb-2">🔍 {t("stock.barcodeLookup")}</label>
          <div className="flex gap-2">
            <input ref={barcodeInputRef} type="text" value={barcodeLookup}
              onChange={(e) => setBarcodeLookup(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeLookup(); } }}
              placeholder={t("stock.barcodePlaceholder")}
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono-data transition" />
            <button onClick={handleBarcodeLookup} disabled={lookupLoading || !barcodeLookup.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95">
              {lookupLoading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("stock.searching")}</> : t("stock.find")}
            </button>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1.5">{t("stock.barcodeHint")}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dim rounded-xl border border-outline-variant p-5 space-y-4">
          <div className="relative">
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.productSearch")}</label>
            <input type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              onFocus={() => search && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder={t("stock.searchHint")}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
            {showResults && products.length > 0 && !selected && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-dim border border-outline-variant rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {products.map((p) => (
                  <button key={p.id} type="button" onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-3 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-body-sm text-on-surface-variant">{p.currentStock} {t("stock.stockInfo")} • {p.category || "—"}</span>
                  </button>
                ))}
              </div>
            )}
            {showResults && search && !selected && products.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-dim border border-outline-variant rounded-lg shadow-lg z-10 p-3 text-body-sm text-on-surface-variant text-center">{t("stock.notFoundBarcode")}</div>
            )}
          </div>

          {selected && (
            <div className="bg-primary-container/10 border border-primary/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-body-md font-medium text-on-surface">{selected.name}</span>
                {selected.barcode && <span className="text-body-sm text-on-surface-variant ml-2 font-mono-data">📷 {selected.barcode}</span>}
                <span className="text-body-sm text-on-surface-variant ml-2 font-mono-data">{selected.sku}</span>
              </div>
              <span className="text-body-sm text-on-surface-variant">{t("stock.currentStock")}: <strong className="text-on-surface">{selected.currentStock}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.quantity")}</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.unitPrice")}</label>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} step="0.01" min="0" placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
            </div>
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.note")}</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("stock.note")}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
          </div>

          {selected && unitPrice && parseFloat(unitPrice) > 0 && (
            <div className="text-body-sm text-on-surface-variant text-right">
              {t("stock.totalCalc")}: <strong className="text-on-surface">${(quantity * parseFloat(unitPrice)).toFixed(2)}</strong>
            </div>
          )}

          <button type="submit" disabled={!selected || sending}
            className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99]">
            {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? t("stock.adding") : selected ? t("stock.submit", { qty: quantity }) : t("stock.selectFirst")}
          </button>
        </form>

        {recentEntries.length > 0 && (
          <div>
            <p className="text-label-sm text-on-surface-variant mb-2">{t("stock.recentEntries")}</p>
            <div className="bg-white dark:bg-surface-dim rounded-lg border border-outline-variant divide-y divide-outline-variant/50">
              {recentEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 text-body-md">
                  <span className="text-on-surface">{e.productName}</span>
                  <span className="text-emerald-600 font-medium">+{e.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
