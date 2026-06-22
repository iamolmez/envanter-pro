import React, { useEffect, useState } from "react";
import { exchangeRateService } from "../services/api";
import type { ExchangeRate } from "../types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { useThemeStore } from "../store/appStore";

const tooltipStyle = (isDark: boolean) => ({
  borderRadius: "12px",
  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  background: isDark ? "#1e293b" : "#fff",
  color: isDark ? "#e2e8f0" : "#1e293b",
  fontSize: "12px",
});

export default function ExchangeRates() {
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rate, hist] = await Promise.all([
        exchangeRateService.getCurrent(),
        exchangeRateService.getHistory({ limit: 30 }),
      ]);
      setCurrentRate(rate);
      setHistory(hist); // API'den son 90 gün, en yeni tarih önce gelir
    } catch {
      toast.error("Kur bilgisi yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFetchLive = async () => {
    setFetchingLive(true);
    try {
      const result = await exchangeRateService.fetchLive();
      setCurrentRate(result);
      toast.success(`Canlı kur çekildi: ${result.rate.toFixed(4)} ₺`);
      loadData();
    } catch {
      toast.error("Canlı kur çekilemedi");
    } finally {
      setFetchingLive(false);
    }
  };

  const handleSetManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRate || parseFloat(manualRate) <= 0) {
      toast.error("Geçerli bir kur girin");
      return;
    }
    setSaving(true);
    try {
      await exchangeRateService.setManual(parseFloat(manualRate), manualDate);
      toast.success(`Kur kaydedildi: ${parseFloat(manualRate).toFixed(4)} ₺`);
      setManualRate("");
      loadData();
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  // Grafik: en eski → en yeni (soldan sağa), Tablo: en yeni üstte (API zaten desc)
  const chartData = [...history].reverse().map((r) => ({
    date: r.date.slice(5),
    rate: r.rate,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Döviz Kuru</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">USD/TRY kuru yönetimi ve geçmişi</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Güncel Kur Kartı */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Güncel Kur</h2>
              <button onClick={handleFetchLive} disabled={fetchingLive}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs text-white transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95">
                {fetchingLive ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Çekiliyor</>
                ) : "🔄 Canlı Çek"}
              </button>
            </div>
            {currentRate && (
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{currentRate.rate.toFixed(4)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    ₺ / USD • {currentRate.date}
                  </p>
                </div>
                <div className="mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    currentRate.source === "api" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                    currentRate.source === "manual" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                    "bg-slate-100 dark:bg-slate-700 text-slate-500"
                  }`}>
                    {currentRate.source === "api" ? "🌐 Canlı" : currentRate.source === "manual" ? "✏️ Manuel" : "💾 Önbellek"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grafik */}
          {chartData.length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Kur Geçmişi (Son 30 Gün)</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.toFixed(2)} />
                    <Tooltip contentStyle={tooltipStyle(isDark)} formatter={(value: number) => [value.toFixed(4), "USD/TRY"]} />
                    <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Manuel Kur Ekle */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">✏️ Manuel Kur Ekle</h2>
            <form onSubmit={handleSetManual} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kur Değeri</label>
                <input type="number" value={manualRate} onChange={(e) => setManualRate(e.target.value)}
                  step="0.0001" min="0" placeholder="Örn: 30.50"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tarih</label>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
              </div>
              <button type="submit" disabled={saving || !manualRate}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs text-white transition disabled:opacity-50 active:scale-95">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </form>
          </div>

          {/* Geçmiş Tablosu */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kur Geçmişi</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
                {history.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-6 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <span className="text-slate-600 dark:text-slate-400 font-mono">{r.date}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.rate.toFixed(4)} ₺</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.source === "api" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                      r.source === "manual" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                      "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    }`}>
                      {r.source === "api" ? "Canlı" : r.source === "manual" ? "Manuel" : "Önbellek"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
