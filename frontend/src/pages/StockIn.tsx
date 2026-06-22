import React, { useState, useEffect, useCallback } from "react";
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

  // Ürünleri ara
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

  const selectProduct = (p: Product) => {
    setSelected(p);
    setSearch(p.name);
    setUnitPrice(p.purchasePriceUSD.toString());
    setShowResults(false);
    setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { toast.error("Önce bir ürün seçin"); return; }
    if (quantity < 1) { toast.error("Miktar en az 1 olmalı"); return; }

    setSending(true);
    try {
      await stockMovementService.stockIn({
        productId: selected.id,
        quantity,
        unitPriceUSD: parseFloat(unitPrice) || undefined,
        note: note.trim() || undefined,
      });
      toast.success(`${selected.name} → +${quantity} adet`);
      setRecentEntries((prev) => [
        { id: Date.now(), productName: selected.name, quantity },
        ...prev.slice(0, 9),
      ]);
      // Formu sıfırla
      setSelected(null);
      setSearch("");
      setQuantity(1);
      setUnitPrice("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Stok Girişi</h1>
        <p className="text-xs text-slate-400">Ürün seçin, miktar girin, stoğa ekleyin</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* Ürün arama */}
        <div className="relative">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Ürün Ara
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            onFocus={() => search && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Ürün adı veya barkod yazın..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
          />
          {/* Arama sonuçları */}
          {showResults && products.length > 0 && !selected && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => selectProduct(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition flex items-center justify-between"
                >
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-xs text-slate-400">
                    {p.currentStock} stok • {p.category || "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showResults && search && !selected && products.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-3 text-xs text-slate-400 text-center">
              Ürün bulunamadı
            </div>
          )}
        </div>

        {/* Seçili ürün bilgisi */}
        {selected && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-800">{selected.name}</span>
              <span className="text-xs text-slate-500 ml-2 font-mono">{selected.sku}</span>
            </div>
            <span className="text-xs text-slate-500">
              Mevcut stok: <strong>{selected.currentStock}</strong>
            </span>
          </div>
        )}

        {/* Miktar ve fiyat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Miktar
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Birim Fiyat ($)
            </label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
        </div>

        {/* Not */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Not (opsiyonel)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Fatura no, irsaliye no, vb."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
          />
        </div>

        {/* Toplam bilgisi */}
        {selected && unitPrice && parseFloat(unitPrice) > 0 && (
          <div className="text-xs text-slate-500 text-right">
            Toplam: <strong className="text-slate-700">
              ${(quantity * parseFloat(unitPrice)).toFixed(2)}
            </strong>
            <span className="text-slate-300 mx-1">•</span>
            Kur otomatik loglanacak
          </div>
        )}

        {/* Gönder butonu */}
        <button
          type="submit"
          disabled={!selected || sending}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {sending ? "Ekleniyor..." : selected ? `Stoğa Ekle (${quantity} adet)` : "Önce ürün seçin"}
        </button>
      </form>

      {/* Son girişler */}
      {recentEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Son Girişler</p>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {recentEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700">{e.productName}</span>
                <span className="text-green-600 font-medium">+{e.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
