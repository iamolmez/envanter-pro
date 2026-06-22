import React, { useState, useEffect, useCallback, useRef } from "react";
import { productService, stockMovementService } from "../services/api";
import type { Product } from "../types";
import toast from "react-hot-toast";

export default function StockIn() {
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
      toast.error("Arama yapılamadı");
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
        toast.success(`✓ ${p.name} (Stok: ${p.currentStock})`);
      } else if (result.found && result.source !== "local") {
        toast((t) => (
          <div className="text-sm">
            <p className="font-medium mb-1">🌐 {result.productName}</p>
            <p className="text-xs text-slate-500 mb-2">İnternette bulundu. Ürün listesine ekleyelim mi?</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const np = await productService.create({ name: result.productName || code, barcode: code, category: result.category || "Genel", purchasePriceUSD: 0, salePriceUSD: 0 });
                  setSelected(np); setSearch(np.name); setUnitPrice(""); setQuantity(1);
                  toast.success(`✓ ${np.name} oluşturuldu`);
                } catch (err) { toast.error(err instanceof Error ? err.message : "Hata"); }
              }} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">Oluştur ve Seç</button>
              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs hover:bg-slate-300 dark:hover:bg-slate-600">İptal</button>
            </div>
          </div>
        ), { duration: 8000 });
      } else {
        toast.error("Bu barkod ile eşleşen ürün bulunamadı");
      }
    } catch { toast.error("Sorgulama başarısız"); }
    finally { setLookupLoading(false); setBarcodeLookup(""); }
  };

  const selectProduct = (p: Product) => {
    setSelected(p); setSearch(p.name); setUnitPrice(p.purchasePriceUSD.toString()); setShowResults(false); setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { toast.error("Önce bir ürün seçin"); return; }
    if (quantity < 1) { toast.error("Miktar en az 1 olmalı"); return; }
    setSending(true);
    try {
      await stockMovementService.stockIn({ productId: selected.id, quantity, unitPriceUSD: parseFloat(unitPrice) || undefined, note: note.trim() || undefined });
      toast.success(`${selected.name} → +${quantity} adet`);
      setRecentEntries((prev) => [{ id: Date.now(), productName: selected.name, quantity }, ...prev.slice(0, 9)]);
      setSelected(null); setSearch(""); setQuantity(1); setUnitPrice(""); setNote("");
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Hata oluştu"); }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Stok Girişi</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">Ürün seçin, miktar girin, stoğa ekleyin</p>
      </div>

      {/* Barkod sorgulama */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">🔍 Barkod ile Hızlı Bul</label>
        <div className="flex gap-2">
          <input ref={barcodeInputRef} type="text" value={barcodeLookup}
            onChange={(e) => setBarcodeLookup(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeLookup(); } }}
            placeholder="Barkod numarasını okutun veya yazın..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono transition" />
          <button onClick={handleBarcodeLookup} disabled={lookupLoading || !barcodeLookup.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95">
            {lookupLoading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aranıyor</> : "Bul"}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">Barkod okutun veya yazın. İnternetten otomatik ürün bilgisi çekilir.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <div className="relative">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ürün Ara</label>
          <input type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            onFocus={() => search && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Ürün adı yazın..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
          {showResults && products.length > 0 && !selected && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button key={p.id} type="button" onMouseDown={() => selectProduct(p)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{p.currentStock} stok • {p.category || "—"}</span>
                </button>
              ))}
            </div>
          )}
          {showResults && search && !selected && products.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 p-3 text-xs text-slate-400 dark:text-slate-500 text-center">Ürün bulunamadı — barkod ile hızlı bul kutucuğunu kullanın</div>
          )}
        </div>

        {selected && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{selected.name}</span>
              {selected.barcode && <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">📷 {selected.barcode}</span>}
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">{selected.sku}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mevcut stok: <strong className="text-slate-700 dark:text-slate-300">{selected.currentStock}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Miktar</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Birim Fiyat ($)</label>
            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} step="0.01" min="0" placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Not (opsiyonel)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fatura no, irsaliye no, vb."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
        </div>

        {selected && unitPrice && parseFloat(unitPrice) > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
            Toplam: <strong className="text-slate-700 dark:text-slate-300">${(quantity * parseFloat(unitPrice)).toFixed(2)}</strong>
            <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>Kur otomatik loglanacak
          </div>
        )}

        <button type="submit" disabled={!selected || sending}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99]">
          {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {sending ? "Ekleniyor..." : selected ? `Stoğa Ekle (${quantity} adet)` : "Önce ürün seçin"}
        </button>
      </form>

      {recentEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Son Girişler</p>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{e.productName}</span>
                <span className="text-green-600 dark:text-green-400 font-medium">+{e.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
