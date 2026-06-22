import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { productService, stockMovementService } from "../services/api";
import toast from "react-hot-toast";

interface ScannedItem {
  id: string;
  barcode: string;
  productName?: string;
  quantity: number;
}

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

  // Kamerayı başlat
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          setSelectedCamera(devices[0].id);
        } else {
          setCameraError("Kamera bulunamadı");
        }
      })
      .catch(() => setCameraError("Kamera erişimi reddedildi"));

    return () => {
      stopScanner();
    };
  }, []);

  // Scanner'ı başlat/durdur
  useEffect(() => {
    if (mode === "camera" && selectedCamera && !scanning) {
      startScanner(selectedCamera);
    } else if (mode !== "camera") {
      stopScanner();
    }
  }, [mode, selectedCamera]);

  const startScanner = useCallback(async (cameraId: string) => {
    stopScanner();
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          addItem(decodedText);
        }
      );
      setScanning(true);
      setCameraError("");
    } catch {
      setCameraError("Kamera başlatılamadı");
      setScanning(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Barkod ekle
  const addItem = useCallback(async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    // Zaten listede var mı kontrol et
    const existing = items.find((i) => i.barcode === code);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.barcode === code ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
      toast(`🔁 ${code} → +1`, { icon: "📦", duration: 1000 });
      return;
    }

    // Veritabanında var mı kontrol et
    let productName: string | undefined;
    try {
      const data = await productService.getAll({ search: code, limit: 1 });
      const found = data.products.find(
        (p) => p.barcode === code || p.sku === code
      );
      if (found) productName = found.name;
    } catch { /* ignore */ }

    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), barcode: code, productName, quantity: 1 },
    ]);
    toast.success(productName || code);
  }, [items]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  };

  const clearAll = () => {
    setItems([]);
    toast("Liste temizlendi", { icon: "🧹", duration: 1500 });
  };

  // Toplu gönder (stok girişi)
  const handleBatchSubmit = async () => {
    if (items.length === 0) {
      toast.error("Listede barkod yok");
      return;
    }

    setSending(true);
    try {
      const batchItems = items.map((item) => ({
        barcode: item.barcode,
        quantity: item.quantity,
      }));
      const result = await productService.batchCreate(batchItems);
      toast.success(
        `${result.successCount} ürün eklendi, ${result.errorCount} hata`
      );
      if (result.errorCount === 0) setItems([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setSending(false);
    }
  };

  // Manuel barkod ekle
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    addItem(manualInput.trim());
    setManualInput("");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Barkod Okuyucu</h1>
        <p className="text-xs text-slate-400">
          Kamera ile okutun veya manuel girin
        </p>
      </div>

      {/* Mod seçimi */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
            mode === "camera"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          📷 Kamera
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
            mode === "manual"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          ⌨️ Manuel
        </button>
      </div>

      {/* Kamera görünümü */}
      {mode === "camera" && (
        <div>
          {/* Kamera seçimi */}
          {cameras.length > 1 && (
            <select
              value={selectedCamera}
              onChange={(e) => {
                setSelectedCamera(e.target.value);
                setScanning(false);
                setTimeout(() => startScanner(e.target.value), 100);
              }}
              className="w-full mb-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Kamera ${c.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}

          {/* Barkod okuyucu alanı */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
            <div id="barcode-reader" className="w-full h-full" />
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                Kamera başlatılıyor...
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm flex-col gap-2">
                <span>⚠️ {cameraError}</span>
                <button
                  onClick={() => setMode("manual")}
                  className="px-3 py-1 rounded bg-white/20 text-xs hover:bg-white/30"
                >
                  Manuel girişe geç
                </button>
              </div>
            )}
          </div>

          {/* Tarama durumu */}
          {scanning && (
            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Kamera çalışıyor, barkodu gösterin
            </div>
          )}
        </div>
      )}

      {/* Manuel giriş */}
      {mode === "manual" && (
        <form onSubmit={handleManualAdd} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Barkod numarasını yazın..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-xs text-white hover:bg-blue-700 transition font-medium"
          >
            Ekle
          </button>
        </form>
      )}

      {/* Batch liste */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-medium text-slate-500">
              {items.length} ürün
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-600 transition"
            >
              Temizle
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <span className="text-xs text-slate-400 font-mono w-28 truncate" title={item.barcode}>
                  {item.barcode}
                </span>
                <div className="flex-1 min-w-0">
                  {item.productName ? (
                    <span className="text-sm text-slate-700 truncate block">
                      {item.productName}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">Yeni ürün</span>
                  )}
                </div>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(item.id, parseInt(e.target.value) || 1)
                  }
                  min="1"
                  className="w-14 px-2 py-1 rounded border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 hover:bg-slate-100 rounded text-xs text-slate-400 hover:text-red-500 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button
              onClick={handleBatchSubmit}
              disabled={sending}
              className="w-full py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {sending && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {sending
                ? "İşleniyor..."
                : `${items.length} ürünü stoktan düş`}
            </button>
          </div>
        </div>
      )}

      {/* Boş liste mesajı */}
      {items.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          <span className="text-3xl block mb-2">📷</span>
          {mode === "camera"
            ? "Kameraya bir barkod gösterin"
            : "Barkod numarasını yazıp ekleyin"}
        </div>
      )}
    </div>
  );
}
