import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { productService } from "../services/api";
import type { BarcodeLookupResult } from "../types";
import toast from "react-hot-toast";

interface ScannedItem {
  id: string;
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
  quantity: number;
  source?: string;
  imageUrl?: string;
}

interface NewProductForm {
  barcode: string;
  name: string;
  category: string;
  purchasePriceUSD: string;
  salePriceUSD: string;
  quantity: number;
  imageUrl?: string;
}

const emptyForm = (barcode: string): NewProductForm => ({
  barcode, name: "", category: "Genel", purchasePriceUSD: "", salePriceUSD: "", quantity: 1,
});

export default function BarcodeScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [sending, setSending] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>(emptyForm(""));
  const [lastLookupResult, setLastLookupResult] = useState<BarcodeLookupResult | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) setSelectedCamera(devices[0].id);
        else setCameraError("Kamera bulunamadı");
      })
      .catch(() => setCameraError("Kamera erişimi reddedildi"));
    return () => { stopScanner(); };
  }, []);

  useEffect(() => {
    if (mode === "camera" && selectedCamera && !scanning) startScanner(selectedCamera);
    else if (mode !== "camera") stopScanner();
  }, [mode, selectedCamera]);

  const startScanner = useCallback(async (cameraId: string) => {
    stopScanner();
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(cameraId, { fps: 10, qrbox: { width: 250, height: 150 } }, (decodedText) => handleBarcodeScanned(decodedText));
      setScanning(true);
      setCameraError("");
    } catch { setCameraError("Kamera başlatılamadı"); setScanning(false); }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === code && now - lastScannedRef.current.time < 2000) return;
    lastScannedRef.current = { code, time: now };

    const existing = items.find((i) => i.barcode === code);
    if (existing) {
      setItems((prev) => prev.map((i) => i.barcode === code ? { ...i, quantity: i.quantity + 1 } : i));
      toast(`🔁 ${existing.productName || code} → +1`, { icon: "📦", duration: 1000 });
      return;
    }

    setLookupLoading(true);
    try {
      const result = await productService.lookupBarcode(code);
      if (result.found && result.source === "local") {
        const product = result.product;
        if (product) {
          setItems((prev) => [...prev, { id: Date.now().toString(), barcode: code, productName: product.name, quantity: 1, source: "local" }]);
          toast.success(`✓ ${product.name}`, { duration: 1500 });
        }
      } else if (result.found && result.source !== "local") {
        setLastLookupResult(result);
        setNewProductForm({ barcode: code, name: result.productName || "", category: result.category || "Genel", purchasePriceUSD: "", salePriceUSD: "", quantity: 1, imageUrl: result.imageUrl });
        setShowNewProduct(true);
      } else {
        setNewProductForm(emptyForm(code));
        setLastLookupResult(null);
        setShowNewProduct(true);
      }
    } catch {
      setNewProductForm(emptyForm(code)); setLastLookupResult(null); setShowNewProduct(true);
      toast.error("İnternet sorgusu başarısız, manuel girin");
    } finally { setLookupLoading(false); }
  }, [items]);

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateQuantity = (id: string, qty: number) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i));
  const clearAll = () => { setItems([]); toast("Liste temizlendi", { icon: "🧹", duration: 1500 }); };

  const confirmNewProduct = () => {
    if (!newProductForm.name.trim()) { toast.error("Ürün adı gerekli"); return; }
    setItems((prev) => [...prev, {
      id: Date.now().toString(), barcode: newProductForm.barcode, productName: newProductForm.name.trim(),
      category: newProductForm.category, quantity: newProductForm.quantity, source: lastLookupResult?.source, imageUrl: newProductForm.imageUrl,
    }]);
    setShowNewProduct(false); setLastLookupResult(null);
    toast.success(`${newProductForm.name.trim()} listeye eklendi${newProductForm.purchasePriceUSD || newProductForm.salePriceUSD ? " 💰" : ""}`, { duration: 1500 });
  };

  const handleBatchSubmit = async () => {
    if (items.length === 0) { toast.error("Listede barkod yok"); return; }
    setSending(true);
    try {
      const result = await productService.batchCreate(items.map((item) => ({ barcode: item.barcode, quantity: item.quantity })));
      toast.success(`${result.successCount} ürün eklendi, ${result.errorCount} hata`);
      if (result.errorCount === 0) setItems([]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "İşlem başarısız"); }
    finally { setSending(false); }
  };

  const handleManualAdd = (e: React.FormEvent) => { e.preventDefault(); if (!manualInput.trim()) return; handleBarcodeScanned(manualInput.trim()); setManualInput(""); };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Barkod Okuyucu</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">Kamera ile okutun veya manuel girin — internetten ürün bilgisi otomatik gelir</p>
      </div>

      {/* Mod seçimi */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button onClick={() => setMode("camera")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${mode === "camera" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
          📷 Kamera
        </button>
        <button onClick={() => setMode("manual")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${mode === "manual" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
          ⌨️ Manuel
        </button>
      </div>

      {/* Kamera */}
      {mode === "camera" && (
        <div>
          {cameras.length > 1 && (
            <select value={selectedCamera} onChange={(e) => { setSelectedCamera(e.target.value); setScanning(false); setTimeout(() => startScanner(e.target.value), 100); }}
              className="w-full mb-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {cameras.map((c) => (<option key={c.id} value={c.id}>{c.label || `Kamera ${c.id.slice(0, 8)}`}</option>))}
            </select>
          )}
          <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
            <div id="barcode-reader" className="w-full h-full" />
            {!scanning && !cameraError && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">Kamera başlatılıyor...</div>}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm flex-col gap-2">
                <span>⚠️ {cameraError}</span>
                <button onClick={() => setMode("manual")} className="px-3 py-1 rounded bg-white/20 text-xs hover:bg-white/30">Manuel girişe geç</button>
              </div>
            )}
            {lookupLoading && (
              <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sorgulanıyor...
              </div>
            )}
          </div>
          {scanning && (
            <div className="flex items-center gap-2 mt-2 text-xs text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Kamera çalışıyor, barkodu gösterin
            </div>
          )}
        </div>
      )}

      {/* Manuel */}
      {mode === "manual" && (
        <form onSubmit={handleManualAdd} className="flex gap-2">
          <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
            placeholder="Barkod numarasını yazın..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs text-white transition font-medium active:scale-95">Ekle</button>
        </form>
      )}

      {/* Liste */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{items.length} ürün</span>
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 transition">Temizle</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-slate-100 dark:bg-slate-700" />}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono w-24 truncate" title={item.barcode}>{item.barcode}</span>
                <div className="flex-1 min-w-0">
                  {item.productName ? (
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate block">{item.productName}</span>
                  ) : (<span className="text-xs text-amber-600 dark:text-amber-400">Yeni ürün</span>)}
                  {item.source && item.source !== "local" && <span className="text-[10px] text-indigo-400 ml-1">🌐 {item.source}</span>}
                </div>
                <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} min="1"
                  className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs text-slate-400 hover:text-red-500 transition">✕</button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <button onClick={handleBatchSubmit} disabled={sending}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99]">
              {sending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sending ? "İşleniyor..." : `${items.length} ürünü stoğa ekle`}
            </button>
          </div>
        </div>
      )}

      {/* Boş */}
      {items.length === 0 && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          <span className="text-3xl block mb-2">📷</span>
          {mode === "camera" ? "Kameraya bir barkod gösterin" : "Barkod numarasını yazıp ekleyin"}
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">İnternetten otomatik ürün bilgisi çekilir</p>
        </div>
      )}

      {/* Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              {lastLookupResult?.imageUrl ? (
                <img src={lastLookupResult.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-lg">📦</div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{lastLookupResult?.productName ? "Ürün Bulundu!" : "Yeni Ürün"}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">Barkod: {newProductForm.barcode}</p>
              </div>
              {lastLookupResult?.source && (
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  {lastLookupResult.source === "upcitemdb" ? "🌐 UPCitemdb" : lastLookupResult.source === "openfoodfacts" ? "🌐 OpenFood" : ""}
                </span>
              )}
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ürün Adı <span className="text-red-400">*</span></label>
                <input type="text" value={newProductForm.name} onChange={(e) => setNewProductForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ürün adı..." autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                <input type="text" value={newProductForm.category} onChange={(e) => setNewProductForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Kategori..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Alış Fiyatı ($)</label>
                  <input type="number" value={newProductForm.purchasePriceUSD} onChange={(e) => setNewProductForm((p) => ({ ...p, purchasePriceUSD: e.target.value }))}
                    step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Satış Fiyatı ($)</label>
                  <input type="number" value={newProductForm.salePriceUSD} onChange={(e) => setNewProductForm((p) => ({ ...p, salePriceUSD: e.target.value }))}
                    step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Miktar</label>
                <input type="number" value={newProductForm.quantity} onChange={(e) => setNewProductForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} min="1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
              </div>
              {lastLookupResult?.productName && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  ✅ İnternetten ürün bilgisi alındı. Lütfen fiyat bilgilerini girin.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              <button onClick={() => { setShowNewProduct(false); setLastLookupResult(null); }}
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">İptal</button>
              <button onClick={confirmNewProduct}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition font-medium active:scale-[0.99]">Listeye Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
