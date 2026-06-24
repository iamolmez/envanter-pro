import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { productService, stockMovementService } from "../services/api";
import type { BarcodeLookupResult } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useI18n";

interface ScannedItem {
  id: string;
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
  quantity: number;
  source?: string;
  imageUrl?: string;
  currentStock?: number;
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

interface HistoryItem {
  id: string;
  barcode: string;
  productName?: string;
  time: string;
}

export default function BarcodeScanner() {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [stockMode, setStockMode] = useState<"IN" | "OUT">("IN");
  const [sending, setSending] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>(emptyForm(""));
  const [lastLookupResult, setLastLookupResult] = useState<BarcodeLookupResult | null>(null);

  // History sheet state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>([]);

  // Scan result sheet state
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    name: string;
    barcode: string;
    price: number;
    stock: number;
  } | null>(null);

  // Quantity input sheet state (from HTML design)
  const [qtySheetOpen, setQtySheetOpen] = useState(false);
  const [qtySheetMode, setQtySheetMode] = useState<"IN" | "OUT">("IN");
  const [qtyInput, setQtyInput] = useState(1);

  // Flash state
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) setSelectedCamera(devices[0].id);
        else setCameraError(t("barcode.noCamera"));
      })
      .catch(() => setCameraError(t("barcode.cameraDenied")));
    return () => { stopScanner(); };
  }, []);

  useEffect(() => {
    if (mode === "camera" && selectedCamera && !scanning) startScanner(selectedCamera);
    else if (mode !== "camera") stopScanner();
  }, [mode, selectedCamera]);

  // Stock mode değişince listeyi temizle
  const switchStockMode = (newMode: "IN" | "OUT") => {
    if (newMode === stockMode) return;
    setStockMode(newMode);
    setItems([]);
    toast(newMode === "IN" ? `📥 ${t("barcode.inModeSwitch")}` : `📤 ${t("barcode.outModeSwitch")}`, { duration: 1500 });
  };

  const startScanner = useCallback(async (cameraId: string) => {
    stopScanner();
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(cameraId, { fps: 10, qrbox: { width: 250, height: 150 } }, (decodedText) => handleBarcodeScannedRef.current?.(decodedText));
      setScanning(true);
      setCameraError("");
    } catch { setCameraError(t("barcode.cameraFailed")); setScanning(false); }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const handleBarcodeScannedRef = useRef<((barcode: string) => Promise<void>) | null>(null);

  const addToHistory = (barcode: string, productName?: string) => {
    setScanHistory(prev => [{
      id: Date.now().toString(),
      barcode,
      productName,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    }, ...prev.slice(0, 19)]);
  };

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === code && now - lastScannedRef.current.time < 2000) return;
    lastScannedRef.current = { code, time: now };

    // Stok çıkışı modu
    if (stockMode === "OUT") {
      setLookupLoading(true);
      try {
        const result = await productService.lookupBarcode(code);
        if (result.found && result.source === "local" && result.product) {
          const p = result.product;
          if (p.currentStock <= 0) {
            toast.error(`"${p.name}" ${t("stock.insufficientStock")}`);
            return;
          }
          const existing = items.find((i) => i.barcode === code);
          if (existing) {              if (existing.quantity + 1 > p.currentStock) {
              toast.error(`${t("stock.insufficientStock")} ${t("stock.currentStock")}: ${p.currentStock}`);
              return;
            }
            setItems((prev) => prev.map((i) => i.barcode === code ? { ...i, quantity: i.quantity + 1 } : i));
          } else {
            setItems((prev) => [...prev, {
              id: Date.now().toString(), barcode: code, productName: p.name,
              quantity: 1, source: "local", currentStock: p.currentStock,
            }]);
          }
          addToHistory(code, p.name);
          toast.success(`📤 ${p.name} (${t("stock.currentStock")}: ${p.currentStock})`, { duration: 1500 });
        } else if (result.found && result.source !== "local") {
          toast.error(`"${result.productName}" ${t("stock.notFoundBarcode")}.`);
        } else {
          toast.error(t("stock.notFoundBarcode"));
        }
      } catch { toast.error(t("common.error")); }
      finally { setLookupLoading(false); }
      return;
    }

    // Stok girişi modu
    const existing = items.find((i) => i.barcode === code);
    if (existing) {
      setItems((prev) => prev.map((i) => i.barcode === code ? { ...i, quantity: i.quantity + 1 } : i));
      toast(`🔁 ${existing.productName || code} → +1`, { icon: "📦", duration: 1000 });
      return;
    }

    setLookupLoading(true);
    try {
      const result = await productService.lookupBarcode(code);
      if (result.found && result.source === "local" && result.product) {
        const p = result.product;
        setItems((prev) => [...prev, { id: Date.now().toString(), barcode: code, productName: p.name, quantity: 1, source: "local", currentStock: p.currentStock }]);
        setLastScannedProduct({ name: p.name, barcode: code, price: p.salePriceUSD, stock: p.currentStock });
        setScanResultOpen(true);
        addToHistory(code, p.name);
        toast.success(`✓ ${p.name}`, { duration: 1500 });
      } else if (result.found && result.source !== "local") {
        setLastLookupResult(result);
        addToHistory(code, result.productName);
        setNewProductForm({ barcode: code, name: result.productName || "", category: result.category || "Genel", purchasePriceUSD: "", salePriceUSD: "", quantity: 1, imageUrl: result.imageUrl });
        setShowNewProduct(true);
      } else {
        addToHistory(code);
        setNewProductForm(emptyForm(code));
        setLastLookupResult(null);
        setShowNewProduct(true);
      }
    } catch {
      setNewProductForm(emptyForm(code));
      setLastLookupResult(null);
      setShowNewProduct(true);
      toast.error(t("common.error"));
    } finally { setLookupLoading(false); }
  }, [items, stockMode]);

  handleBarcodeScannedRef.current = handleBarcodeScanned;

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateQuantity = (id: string, qty: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, qty);
    if (stockMode === "OUT" && item.currentStock !== undefined && newQty > item.currentStock) {
      toast.error(t("stock.insufficientStock"));
      return;
    }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQty } : i));
  };
  const clearAll = () => { setItems([]); toast(t("barcode.clearHistory"), { icon: "🧹", duration: 1500 }); };

  const confirmNewProduct = () => {
    if (!newProductForm.name.trim()) { toast.error(t("common.error")); return; }
    setItems((prev) => [...prev, {
      id: Date.now().toString(), barcode: newProductForm.barcode, productName: newProductForm.name.trim(),
      category: newProductForm.category, quantity: newProductForm.quantity, source: lastLookupResult?.source, imageUrl: newProductForm.imageUrl,
    }]);
    setShowNewProduct(false);
    setLastLookupResult(null);
    toast.success(`${newProductForm.name.trim()} ${t("barcode.addedToList")}`, { duration: 1500 });
  };

  const handleBatchSubmit = async () => {
    if (items.length === 0) { toast.error(t("common.error")); return; }
    setSending(true);
    try {
      if (stockMode === "IN") {
        const result = await productService.batchCreate(items.map((item) => ({ barcode: item.barcode, quantity: item.quantity })));
        toast.success(`📥 ${result.successCount} ürün eklendi, ${result.errorCount} hata`);
        if (result.errorCount === 0) setItems([]);
      } else {
        let success = 0;
        let errors = 0;
        for (const item of items) {
          try {
            await stockMovementService.barcodeOut({ barcode: item.barcode, quantity: item.quantity });
            success++;
          } catch { errors++; }
        }
        toast.success(`📤 ${success} ürün düşüldü, ${errors} hata`);
        if (errors === 0) setItems([]);
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
    finally { setSending(false); }
  };

  const handleManualAdd = (e: React.FormEvent) => { e.preventDefault(); if (!manualInput.trim()) return; handleBarcodeScanned(manualInput.trim()); setManualInput(""); };

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  const triggerScanAnimation = () => {
    const shutter = document.getElementById('barcode-shutter');
    if (shutter) {
      shutter.classList.remove('shutter-effect');
      void shutter.offsetWidth;
      shutter.classList.add('shutter-effect');
    }
    setTimeout(() => {
      shutter?.classList.remove('shutter-effect');
    }, 300);
  };

  const showQuantitySheet = (type: "IN" | "OUT") => {
    setQtySheetMode(type);
    setQtyInput(type === "OUT" && lastScannedProduct ? Math.min(1, lastScannedProduct.stock) : 1);
    setScanResultOpen(false);
    setQtySheetOpen(true);
  };

  const confirmQuantity = () => {
    const code = lastScannedProduct?.barcode || lastScannedProduct?.barcode || "";
    if (code) {
      // Add item with the correct quantity directly
      const existing = items.find((i) => i.barcode === code);
      if (existing) {
        setItems((prev) => prev.map((i) => i.barcode === code ? { ...i, quantity: i.quantity + qtyInput } : i));
      } else {
        setItems((prev) => [...prev, {
          id: Date.now().toString(),
          barcode: code,
          productName: lastScannedProduct?.name,
          quantity: qtyInput,
          source: "local",
        }]);
      }
      addToHistory(code, lastScannedProduct?.name);
    }
    setQtySheetOpen(false);
    toast.success(`${qtyInput} adet ${qtySheetMode === "IN" ? "giriş" : "çıkış"} işleme alındı`);
  };

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-hidden h-screen flex flex-col">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-sm">
          <button aria-label="Geri" onClick={() => window.history.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface" data-icon="arrow_back">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-sm font-bold text-primary">{t("barcode.title")}</h1>
        </div>
        <button onClick={() => setHistoryOpen(!historyOpen)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors text-primary">
          <span className="material-symbols-outlined text-[20px]" data-icon="history">history</span>
          <span className="text-label-md font-label-md">{t("barcode.history")}</span>
        </button>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col pt-touch-min bg-slate-950 relative overflow-hidden">
        {/* Shutter Effect Layer */}
        <div className="absolute inset-0 pointer-events-none z-30 opacity-0" id="barcode-shutter"></div>

        {/* Camera Viewfinder */}
        <div className="flex-1 flex flex-col items-center justify-center p-container-margin-mobile">
          <div className="relative w-full aspect-square max-w-[400px] bg-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            {/* Camera stream */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-900">
              <div id="barcode-reader" className="w-full h-full" />
              {!scanning && !cameraError && mode === "camera" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/60 text-body-md">{t("barcode.cameraStarting")}</div>
              )}
              {cameraError && mode === "camera" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-body-md flex-col gap-2 p-4">
                  <span>⚠️ {cameraError}</span>                    <button onClick={() => setMode("manual")}
                    className="px-4 py-2 rounded-lg bg-white/20 text-label-md hover:bg-white/30 transition">{t("barcode.switchToManual")}</button>
                </div>
              )}
              {lookupLoading && (
                <div className="absolute top-2 right-2 bg-primary text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 z-40">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("barcode.querying")}
                </div>
              )}
            </div>
            {/* Animated Scan Line */}
            {scanning && <div className="scanning-line absolute w-full z-20"></div>}
            {/* Viewfinder Corners */}
            <div className="viewfinder-corner corner-tl"></div>
            <div className="viewfinder-corner corner-tr"></div>
            <div className="viewfinder-corner corner-bl"></div>
            <div className="viewfinder-corner corner-br"></div>
            {/* Central Hint */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
                  <p className="text-white text-label-md font-label-md">{t("barcode.scanHint")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          {mode === "camera" && (
            <div className="mt-stack-lg flex gap-4 w-full max-w-[400px] justify-center">
              <button
                onClick={() => setFlashOn(!flashOn)}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl backdrop-blur-md border transition-all active:scale-95 ${
                  flashOn
                    ? "bg-primary/30 border-primary"
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                <span className={`material-symbols-outlined text-white mb-1 ${flashOn ? "text-primary" : ""}`}>
                  {flashOn ? "flashlight_on" : "flashlight_off"}
                </span>                  <span className="text-white text-[10px] uppercase font-bold tracking-wider">{t("barcode.flash")}</span>
              </button>
              <button onClick={triggerScanAnimation}
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-primary hover:bg-primary-container active:scale-95 transition-all text-white shadow-lg">
                <span className="material-symbols-outlined text-[32px]" data-icon="photo_camera">photo_camera</span>
              </button>
              <button onClick={() => { setMode("manual"); setTimeout(() => document.getElementById('manualBarcode')?.focus(), 100); }}
                className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-white mb-1" data-icon="keyboard">keyboard</span>                  <span className="text-white text-[10px] uppercase font-bold tracking-wider">{t("barcode.manual")}</span>
              </button>
            </div>
          )}

          {/* Kamera seçici (when multiple cameras) */}
          {mode === "camera" && cameras.length > 1 && (
            <select value={selectedCamera} onChange={(e) => { setSelectedCamera(e.target.value); setScanning(false); setTimeout(() => startScanner(e.target.value), 100); }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs border border-white/20 focus:outline-none">
              {cameras.map((c) => (<option key={c.id} value={c.id}>{c.label || `Kamera ${c.id.slice(0, 8)}`}</option>))}
            </select>
          )}
        </div>

        {/* Manual Entry & Overlay Content */}
        <div className="bg-surface rounded-t-3xl px-container-margin-mobile pt-8 pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
          <div className="max-w-[500px] mx-auto space-y-stack-md">
            {/* Stock Mode Toggle (functional addition) */}
            <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
              <button onClick={() => switchStockMode("IN")}
                className={`flex-1 py-1.5 rounded-md text-label-sm font-medium transition flex items-center justify-center gap-1 ${
                  stockMode === "IN" ? "bg-white dark:bg-surface-dim text-emerald-600 shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}>
                <span className="material-symbols-outlined text-[18px]" data-icon="add_circle">add_circle</span>
                {t("barcode.inMode")}
              </button>
              <button onClick={() => switchStockMode("OUT")}
                className={`flex-1 py-1.5 rounded-md text-label-sm font-medium transition flex items-center justify-center gap-1 ${
                  stockMode === "OUT" ? "bg-white dark:bg-surface-dim text-amber-600 shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}>
                <span className="material-symbols-outlined text-[18px]" data-icon="remove_circle">remove_circle</span>
                {t("barcode.outMode")}
              </button>
            </div>

            {mode === "manual" ? (
              <form onSubmit={handleManualAdd} className="space-y-stack-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-widest">{t("barcode.manualEntry")}</h2>
                  <button type="button" onClick={() => setMode("camera")}
                    className="text-primary text-label-sm font-label-sm">{t("barcode.camera")}</button>
                </div>
                <div className="relative">
                  <input id="manualBarcode" type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
                    placeholder={t("barcode.manualPlaceholder")}
                    className="w-full h-touch-min px-4 bg-surface-container-low border border-outline-variant rounded-lg font-mono-data focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface" />
                  <button type="submit"
                    className="absolute right-2 top-1.5 h-8 px-4 bg-primary text-white rounded-md text-label-md font-label-md active:opacity-80">{t("barcode.add")}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-widest">Manuel Giriş</h2>
                  <span className="text-primary text-label-sm font-label-sm">Barkod Okunmuyor mu?</span>
                </div>
                <div className="relative">
                  <input id="manualBarcode" type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualAdd(e); } }}
                    placeholder={t("barcode.manualPlaceholder")}
                    className="w-full h-touch-min px-4 bg-surface-container-low border border-outline-variant rounded-lg font-mono-data focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-on-surface" />
                  <button onClick={handleManualAdd}
                    className="absolute right-2 top-1.5 h-8 px-4 bg-primary text-white rounded-md text-label-md font-label-md active:opacity-80">{t("barcode.add")}</button>
                </div>
              </>
            )}

            {/* Info Tip */}
            <div className="flex items-start gap-3 p-3 bg-secondary-container/30 rounded-xl border border-secondary-container">
              <span className="material-symbols-outlined text-secondary" data-icon="info">info</span>
              <p className="text-body-sm text-on-secondary-container">
                {stockMode === "OUT"
                  ? t("barcode.outTip")
                  : t("barcode.inTip")}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Scanned Items List (functional, shown when items exist) */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-surface-dim rounded-t-2xl shadow-2xl max-h-[40vh] border-t border-outline-variant pb-4" style={{ marginBottom: '88px' }}>
          <div className="w-full flex justify-center py-2">
            <div className="w-12 h-1.5 bg-outline-variant rounded-full"></div>
          </div>
          <div className="px-container-margin-mobile">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-sm font-bold text-on-surface-variant">
                {t("barcode.itemsCount", { count: items.length, total: totalQuantity, mode: stockMode === "OUT" ? t("barcode.willExit") : t("barcode.willEnter") })}
              </span>
              <button onClick={clearAll} className="text-label-sm text-error">{t("barcode.clear")}</button>
            </div>
            <div className="divide-y divide-outline-variant/50 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-surface-container-low" />}
                  <span className="text-body-sm text-on-surface-variant font-mono-data w-24 truncate">{item.barcode}</span>
                  <div className="flex-1 min-w-0">
                    {item.productName ? (
                      <span className="text-body-md text-on-surface truncate block">{item.productName}</span>
                    ) : (<span className="text-body-sm text-tertiary">{t("barcode.newProduct")}</span>)}
                    {stockMode === "OUT" && item.currentStock !== undefined && (
                      <span className={`text-[10px] ml-1 ${item.currentStock <= 5 ? "text-error" : "text-on-surface-variant"}`}>
                        {t("stock.stockInfo")}: {item.currentStock}
                      </span>
                    )}
                  </div>
                  <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} min="1"
                    className="w-14 px-2 py-1 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-xs text-center text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => removeItem(item.id)}
                    className="p-1 rounded text-on-surface-variant hover:text-error transition">✕</button>
                </div>
              ))}
            </div>
            <button onClick={handleBatchSubmit} disabled={sending}
              className={`w-full mt-3 py-3 rounded-xl text-label-md text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-[0.99] ${
                stockMode === "IN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
              }`}>
              {sending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sending ? t("barcode.processing") : stockMode === "IN"
                ? t("barcode.batchIn", { count: items.length })
                : t("barcode.batchOut", { count: items.length, total: totalQuantity })}
            </button>
          </div>
        </div>
      )}

      {/* History Bottom Sheet */}
      <div className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${historyOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setHistoryOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[60] transform transition-transform duration-300 ease-in-out ${historyOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="bg-surface dark:bg-surface-dim h-[70vh] rounded-t-3xl shadow-2xl flex flex-col border-t border-outline-variant">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto my-4 cursor-pointer" onClick={() => setHistoryOpen(false)}></div>
          <div className="px-container-margin-mobile pb-4 flex justify-between items-center border-b border-outline-variant">
            <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">{t("barcode.history")}</h3>
            <button onClick={() => { setScanHistory([]); toast.success(t("barcode.clearHistory")); }}
              className="text-primary font-label-md">{t("barcode.clearHistory")}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-container-margin-mobile space-y-4">
            {scanHistory.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-body-md">
                <span className="material-symbols-outlined text-5xl block mb-3 text-outline" data-icon="history">history</span>
                {t("barcode.noHistory")}
              </div>
            ) : (
              scanHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{h.productName || t("finance.unknownProduct")}</p>
                      <p className="text-body-sm text-on-surface-variant font-mono-data">{h.barcode}</p>
                    </div>
                  </div>
                  <p className="text-label-sm text-outline">{h.time}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Scan Result Bottom Sheet */}
      <div className={`fixed inset-0 bg-black/40 z-[70] transition-opacity duration-300 ${scanResultOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setScanResultOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[70] transform transition-transform duration-300 ease-in-out ${scanResultOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="bg-surface dark:bg-surface-dim h-auto rounded-t-3xl shadow-2xl flex flex-col border-t border-outline-variant pb-12">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto my-4 cursor-pointer" onClick={() => setScanResultOpen(false)}></div>
          <div className="px-container-margin-mobile space-y-6" id="scanResultContent">
            <div className="text-center">
              <h3 className="text-headline-sm font-bold text-on-surface">{t("barcode.productFound")}</h3>
              <p className="text-body-md text-on-surface-variant mt-1">{t("barcode.inOrOut")}</p>
            </div>
            {lastScannedProduct && (
              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant flex items-center justify-between transition-all duration-300" id="productCard">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{lastScannedProduct.name}</p>
                    <p className="text-label-sm text-outline font-mono-data">{lastScannedProduct.barcode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">${lastScannedProduct.price.toFixed(2)}</p>
                  <p className="text-label-sm text-on-surface-variant">{t("stock.stockInfo")}: {lastScannedProduct.stock} {t("stock.quantity")}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => showQuantitySheet("IN")}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-3xl" data-icon="add_circle">add_circle</span>
                <span className="font-bold text-label-md">{t("barcode.inMode")}</span>
              </button>
              <button
                onClick={() => showQuantitySheet("OUT")}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-3xl" data-icon="remove_circle">remove_circle</span>
                <span className="font-bold text-label-md">{t("barcode.outMode")}</span>
              </button>
            </div>
            <div className="pt-2 border-t border-outline-variant/30">
              <button
                onClick={() => { setScanResultOpen(false); setNewProductForm(prev => ({ ...prev, barcode: lastScannedProduct?.barcode || prev.barcode })); setShowNewProduct(true); }}
                className="flex items-center justify-center gap-2 text-primary font-label-md py-2 w-full"
              >
                <span className="material-symbols-outlined" data-icon="add_box">add_box</span>
                {t("barcode.saveNewProduct")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Input Bottom Sheet (from HTML design) */}
      <div className={`fixed inset-0 bg-black/40 z-[80] transition-opacity duration-300 ${qtySheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setQtySheetOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[80] transform transition-transform duration-300 ease-in-out ${qtySheetOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="bg-surface dark:bg-surface-dim rounded-t-3xl shadow-2xl border-t border-outline-variant pb-12">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto my-4 cursor-pointer" onClick={() => setQtySheetOpen(false)}></div>
          <div className="px-container-margin-mobile space-y-6 text-center">              <h3 className="text-headline-sm font-bold text-on-surface">
              {qtySheetMode === "IN" ? t("barcode.howManyIn") : t("barcode.howManyOut")}
            </h3>
            <div className="flex items-center justify-center gap-6 py-4">
              <button
                onClick={() => setQtyInput(Math.max(1, qtyInput - 1))}
                className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined" data-icon="remove">remove</span>
              </button>
              <input
                type="number"
                value={qtyInput}
                onChange={(e) => setQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-24 text-center text-3xl font-bold bg-transparent border-none focus:ring-0 text-on-surface"
              />
              <button
                onClick={() => setQtyInput(qtyInput + 1)}
                className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined" data-icon="add">add</span>
              </button>
            </div>
            <button
              onClick={confirmQuantity}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              {t("barcode.confirm")}
            </button>
            <button
              onClick={() => setQtySheetOpen(false)}
              className="text-secondary font-label-md py-2"
            >
              {t("barcode.cancel")}
            </button>
          </div>
        </div>
      </div>

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-dim rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-3">
              {lastLookupResult?.imageUrl ? (
                <img src={lastLookupResult.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-container-low" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-headline-sm font-bold text-on-surface truncate">{lastLookupResult?.productName ? t("barcode.productFoundOnline") : t("barcode.newProduct")}</h2>
                <p className="text-body-sm text-on-surface-variant font-mono-data truncate">Barkod: {newProductForm.barcode}</p>
              </div>
              {lastLookupResult?.source && (
                <span className="text-[10px] bg-primary-container/20 text-primary px-2 py-0.5 rounded-full">
                  {lastLookupResult.source === "upcitemdb" ? "🌐 UPCitemdb" : lastLookupResult.source === "openfoodfacts" ? "🌐 OpenFood" : ""}
                </span>
              )}
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">{t("barcode.productName")} <span className="text-error">*</span></label>
                <input type="text" value={newProductForm.name} onChange={(e) => setNewProductForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ürün adı..." autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">{t("barcode.category")}</label>
                <input type="text" value={newProductForm.category} onChange={(e) => setNewProductForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Kategori..."
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1">{t("barcode.purchasePrice")}</label>
                  <input type="number" value={newProductForm.purchasePriceUSD} onChange={(e) => setNewProductForm((p) => ({ ...p, purchasePriceUSD: e.target.value }))}
                    step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1">{t("barcode.salePrice")}</label>
                  <input type="number" value={newProductForm.salePriceUSD} onChange={(e) => setNewProductForm((p) => ({ ...p, salePriceUSD: e.target.value }))}
                    step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
                </div>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">{t("barcode.quantity")}</label>
                <input type="number" value={newProductForm.quantity} onChange={(e) => setNewProductForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} min="1"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
              </div>
              {lastLookupResult?.productName && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2 text-body-sm text-emerald-700 dark:text-emerald-400">
                  {t("barcode.onlineInfo")}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-outline-variant flex gap-2">
              <button onClick={() => { setShowNewProduct(false); setLastLookupResult(null); }}
                className="flex-1 py-2 rounded-lg border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container-low transition">{t("barcode.cancelBtn")}</button>
              <button onClick={confirmNewProduct}
                className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-body-md transition font-bold active:scale-[0.99]">{t("barcode.addToList")}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scanning-line {
          height: 2px;
          background: linear-gradient(90deg, transparent, #0ea5e9, transparent);
          box-shadow: 0 0 15px #0ea5e9;
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .viewfinder-corner {
          width: 32px;
          height: 32px;
          border-color: #0ea5e9;
          position: absolute;
        }
        .corner-tl { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 12px; }
        .corner-tr { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 12px; }
        .corner-bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 12px; }
        .corner-br { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 12px; }
        .shutter-effect {
          animation: shutter 0.2s ease-out forwards;
        }
        @keyframes shutter {
          0% { opacity: 0; }
          50% { opacity: 0.8; background-color: white; }
          100% { opacity: 0; }
        }
        .scan-pulse-animation {
          animation: scan-pulse 0.5s ease-out;
        }
        @keyframes scan-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 101, 145, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(0, 101, 145, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 101, 145, 0); }
        }
      `}</style>
    </div>
  );
}
