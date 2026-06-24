import React, { useState, useRef } from "react";
import { productService, stockMovementService } from "../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useI18n";

export default function StockOut() {
  const { t } = useTranslation();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number; name: string; barcode: string | null;
    currentStock: number; salePriceUSD: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [recentExits, setRecentExits] = useState<Array<{ id: number; productName: string; quantity: number }>>([]);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const handleBarcodeLookup = async () => {
    const code = barcodeInput.trim();
    if (!code) return;
    setBarcodeLoading(true);
    try {
      const result = await productService.lookupBarcode(code);
      if (result.found && result.source === "local" && result.product) {
        const p = result.product;
        if (p.currentStock <= 0) { toast.error(`"${p.name}" ${t("stock.outOfStock")}!`); setBarcodeInput(""); return; }
        setSelectedProduct({ id: p.id, name: p.name, barcode: code, currentStock: p.currentStock, salePriceUSD: p.salePriceUSD });
        setQuantity(1);
        toast.success(`✓ ${p.name} (${t("stock.currentStock")}: ${p.currentStock})`);
      } else if (result.found && result.source !== "local") {
        toast.error(`"${result.productName}" ${t("stock.notFoundBarcode")}.`);
      } else { toast.error(t("stock.notFoundBarcode")); }
    } catch { toast.error(t("common.error")); }
    finally { setBarcodeLoading(false); setBarcodeInput(""); setTimeout(() => barcodeRef.current?.focus(), 100); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error(t("stock.selectProduct")); return; }
    if (quantity < 1) { toast.error(t("common.error")); return; }
    if (quantity > selectedProduct.currentStock) { toast.error(`${t("stock.insufficientStock")} ${t("stock.currentStock")}: ${selectedProduct.currentStock}, ${t("stock.quantity")}: ${quantity}`); return; }
    setSending(true);
    try {
      await stockMovementService.stockOut({ productId: selectedProduct.id, quantity, note: note.trim() || undefined });
      toast.success(`${selectedProduct.name} → -${quantity} adet`);
      setRecentExits((prev) => [{ id: Date.now(), productName: selectedProduct.name, quantity }, ...prev.slice(0, 9)]);
      setSelectedProduct(null); setQuantity(1); setNote("");
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !selectedProduct) { e.preventDefault(); handleBarcodeLookup(); }
  };

  return (
    <div className="bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-sm">
          <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-bold text-primary">{t("stockOut.title")}</h1>
        </div>
      </header>

      <main className="pt-20 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-xl mx-auto space-y-6">
        {/* Barkod */}
        <div className="bg-white dark:bg-surface-dim rounded-xl border border-outline-variant p-4">
          <label className="block text-label-sm text-on-surface-variant mb-2">{t("stock.barcodeStockOut")}</label>
          <div className="flex gap-2">
            <input ref={barcodeRef} type="text" value={barcodeInput}
              onChange={(e) => { setBarcodeInput(e.target.value); if (selectedProduct) setSelectedProduct(null); }}
              onKeyDown={handleKeyDown}              placeholder={t("stock.barcodePlaceholder")} autoFocus
              disabled={!!selectedProduct}
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent font-mono-data transition" />
            {!selectedProduct && (
              <button onClick={handleBarcodeLookup} disabled={barcodeLoading || !barcodeInput.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-label-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95">
                {barcodeLoading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("stock.searching")}</> : t("stock.query")}
              </button>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1.5">{t("stock.barcodeEnterHint")}</p>
        </div>

        {selectedProduct && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dim rounded-xl border border-outline-variant p-5 space-y-4 animate-fade-in">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-medium text-on-surface">{selectedProduct.name}</span>
                  {selectedProduct.barcode && <span className="text-body-sm text-on-surface-variant ml-2 font-mono-data">📷 {selectedProduct.barcode}</span>}
                  <div className="flex gap-3 mt-1">
                    <span className="text-body-sm text-on-surface-variant">
                      {t("stock.currentStock")}: <strong className={selectedProduct.currentStock <= 5 ? "text-error" : "text-on-surface"}>{selectedProduct.currentStock}</strong>
                    </span>
                    <span className="text-body-sm text-on-surface-variant">
                      {t("stock.unitPrice")}: <strong className="text-on-surface">${selectedProduct.salePriceUSD.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedProduct(null); setTimeout(() => barcodeRef.current?.focus(), 100); }}
                  className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded text-on-surface-variant hover:text-error transition">✕</button>
              </div>
            </div>

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.exitQuantity")}</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={selectedProduct.currentStock}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
              {quantity > selectedProduct.currentStock && (
                <p className="text-body-sm text-error mt-1">⚠️ {t("stock.insufficientStock")}</p>
              )}
            </div>

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">{t("stock.exitReason")}</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}              placeholder={t("stock.reasonPlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
            </div>

            {quantity > 0 && (
              <div className="text-body-sm text-on-surface-variant text-right">
                Toplam: <strong className="text-on-surface">${(quantity * selectedProduct.salePriceUSD).toFixed(2)}</strong>
                <span className="text-outline mx-1">•</span>{t("stock.remainingStock")}: <strong className="text-on-surface">{selectedProduct.currentStock - quantity}</strong>
              </div>
            )}

            <button type="submit" disabled={sending || quantity > selectedProduct.currentStock}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-label-md font-bold text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99]">
              {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sending ? t("stock.deducting") : t("stock.deduct", { qty: quantity })}
            </button>
          </form>
        )}

        {!selectedProduct && (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block mb-3 text-outline">remove_circle</span>
            <p className="text-body-md font-medium text-on-surface-variant mb-1">{t("stock.scanBarcode")}</p>
            <p className="text-body-sm">{t("stock.scanHint")}</p>
          </div>
        )}

        {recentExits.length > 0 && (
          <div>
            <p className="text-label-sm text-on-surface-variant mb-2">{t("stock.recentExits")}</p>
            <div className="bg-white dark:bg-surface-dim rounded-lg border border-outline-variant divide-y divide-outline-variant/50">
              {recentExits.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 text-body-md">
                  <span className="text-on-surface">{e.productName}</span>
                  <span className="text-error font-medium">-{e.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
