import React, { useState, useRef } from "react";
import { productService, stockMovementService } from "../services/api";
import toast from "react-hot-toast";

export default function StockOut() {
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
        if (p.currentStock <= 0) { toast.error(`"${p.name}" stokta yok!`); setBarcodeInput(""); return; }
        setSelectedProduct({ id: p.id, name: p.name, barcode: code, currentStock: p.currentStock, salePriceUSD: p.salePriceUSD });
        setQuantity(1);
        toast.success(`✓ ${p.name} (Stok: ${p.currentStock})`);
      } else if (result.found && result.source !== "local") {
        toast.error(`"${result.productName}" henüz kayıtlı değil. Önce stok girişi yapın.`);
      } else { toast.error("Bu barkod ile eşleşen ürün bulunamadı"); }
    } catch { toast.error("Sorgulama başarısız"); }
    finally { setBarcodeLoading(false); setBarcodeInput(""); setTimeout(() => barcodeRef.current?.focus(), 100); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error("Önce bir barkod okutun"); return; }
    if (quantity < 1) { toast.error("Miktar en az 1 olmalı"); return; }
    if (quantity > selectedProduct.currentStock) { toast.error(`Yetersiz stok! Mevcut: ${selectedProduct.currentStock}, İstenen: ${quantity}`); return; }
    setSending(true);
    try {
      await stockMovementService.stockOut({ productId: selectedProduct.id, quantity, note: note.trim() || undefined });
      toast.success(`${selectedProduct.name} → -${quantity} adet`);
      setRecentExits((prev) => [{ id: Date.now(), productName: selectedProduct.name, quantity }, ...prev.slice(0, 9)]);
      setSelectedProduct(null); setQuantity(1); setNote("");
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Hata oluştu"); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !selectedProduct) { e.preventDefault(); handleBarcodeLookup(); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Stok Çıkışı</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">Barkod okutun, miktar girin, stoktan düşün</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">📷 Barkod Okut</label>
        <div className="flex gap-2">
          <input ref={barcodeRef} type="text" value={barcodeInput}
            onChange={(e) => { setBarcodeInput(e.target.value); if (selectedProduct) setSelectedProduct(null); }}
            onKeyDown={handleKeyDown} placeholder="Barkod okutun veya yazın..." autoFocus
            disabled={!!selectedProduct}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono transition" />
          {!selectedProduct && (
            <button onClick={handleBarcodeLookup} disabled={barcodeLoading || !barcodeInput.trim()}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95">
              {barcodeLoading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aranıyor</> : "Sorgula"}
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">Barkod okutun veya numarayı yazıp Enter'a basın</p>
      </div>

      {selectedProduct && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-fade-in">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg px-3 py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedProduct.name}</span>
                {selectedProduct.barcode && <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">📷 {selectedProduct.barcode}</span>}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Mevcut stok: <strong className={selectedProduct.currentStock <= 5 ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}>{selectedProduct.currentStock}</strong>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Birim fiyat: <strong className="text-slate-700 dark:text-slate-300">${selectedProduct.salePriceUSD.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => { setSelectedProduct(null); setTimeout(() => barcodeRef.current?.focus(), 100); }}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded text-xs text-slate-400 hover:text-red-500 transition">✕</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Çıkış Miktarı</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={selectedProduct.currentStock}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400 transition" />
            {quantity > selectedProduct.currentStock && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">⚠️ Mevcut stoktan ({selectedProduct.currentStock}) fazla çıkış yapılamaz</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Çıkış Nedeni (opsiyonel)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Satış, sarf, fire, vb."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition" />
          </div>

          {quantity > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
              Toplam: <strong className="text-slate-700 dark:text-slate-300">${(quantity * selectedProduct.salePriceUSD).toFixed(2)}</strong>
              <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>{quantity} adet
              <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>Kalan stok: <strong className="text-slate-700 dark:text-slate-300">{selectedProduct.currentStock - quantity}</strong>
            </div>
          )}

          <button type="submit" disabled={sending || quantity > selectedProduct.currentStock}
            className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99]">
            {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? "Düşülüyor..." : `Stoktan Düş (${quantity} adet)`}
          </button>
        </form>
      )}

      {!selectedProduct && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <span className="text-5xl block mb-3">📤</span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Barkod okutarak başlayın</p>
          <p className="text-xs">Ürünü bulmak için yukarıdaki alana barkodu okutun veya yazın</p>
        </div>
      )}

      {recentExits.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Son Çıkışlar</p>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentExits.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{e.productName}</span>
                <span className="text-red-500 dark:text-red-400 font-medium">-{e.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
