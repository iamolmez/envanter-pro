import React, { useEffect, useState } from "react";
import { exchangeRateService } from "../services/api";
import type { ExchangeRate } from "../types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { useThemeStore } from "../store/appStore";
import { useTranslation } from "../hooks/useI18n";

const tooltipStyle = (isDark: boolean) => ({
  borderRadius: "12px",
  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  background: isDark ? "#1e293b" : "#fff",
  color: isDark ? "#e2e8f0" : "#1e293b",
  fontSize: "12px",
});

export default function ExchangeRates() {
  const { t } = useTranslation();
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
      setHistory(hist);
    } catch { toast.error(t("exchange.loadError")); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleFetchLive = async () => {
    setFetchingLive(true);
    try {
      const result = await exchangeRateService.fetchLive();
      setCurrentRate(result);
      toast.success(t("exchange.saveSuccess", { rate: result.rate.toFixed(4) }));
      loadData();
    } catch { toast.error(t("exchange.fetchError")); }
    finally { setFetchingLive(false); }
  };

  const handleSetManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRate || parseFloat(manualRate) <= 0) { toast.error(t("exchange.validRate")); return; }
    setSaving(true);
    try {
      await exchangeRateService.setManual(parseFloat(manualRate), manualDate);
      toast.success(t("exchange.saveSuccess", { rate: parseFloat(manualRate).toFixed(4) }));
      setManualRate("");
      loadData();
    } catch { toast.error(t("exchange.saveError")); }
    finally { setSaving(false); }
  };

  const chartData = [...history].reverse().map((r) => ({ date: r.date.slice(5), rate: r.rate }));

  return (
    <div className="bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-sm">
          <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-bold text-primary">{t("exchange.title")}</h1>
        </div>
      </header>

      <main className="pt-20 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-3xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Güncel Kur Kartı */}
            <div className="bg-white dark:bg-surface-dim rounded-2xl border border-outline-variant p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">{t("exchange.current")}</h2>
                <button onClick={handleFetchLive} disabled={fetchingLive}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm transition disabled:opacity-50 flex items-center gap-1.5 active:scale-95">
                  {fetchingLive ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("exchange.fetching")}</>
                  ) : `🔄 ${t("exchange.fetchLive")}`}
                </button>
              </div>
              {currentRate && (
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-4xl font-bold text-on-surface">{currentRate.rate.toFixed(4)}</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      ₺ / USD • {currentRate.date}
                    </p>
                  </div>
                  <div className="mb-1">
                    <span className={`text-label-sm px-2 py-0.5 rounded-full ${
                      currentRate.source === "api" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                      currentRate.source === "manual" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                      "bg-surface-container-low text-on-surface-variant"
                    }`}>
                      {currentRate.source === "api" ? t("exchange.live") : currentRate.source === "manual" ? t("exchange.manual") : t("exchange.cached")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Grafik */}
            {chartData.length > 1 && (
              <div className="bg-white dark:bg-surface-dim rounded-2xl border border-outline-variant p-6">
                <h2 className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold mb-4">{t("exchange.last30Days")}</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#bec8d2" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.toFixed(2)} />
                      <Tooltip contentStyle={tooltipStyle(isDark)} formatter={(value: number) => [value.toFixed(4), "USD/TRY"]} />
                      <Line type="monotone" dataKey="rate" stroke="#006591" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#006591" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Manuel Kur Ekle */}
            <div className="bg-white dark:bg-surface-dim rounded-2xl border border-outline-variant p-6">
              <h2 className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold mb-4">{t("exchange.manualRate")}</h2>
              <form onSubmit={handleSetManual} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-label-sm text-on-surface-variant mb-1">{t("exchange.rateValue")}</label>
                  <input type="number" value={manualRate} onChange={(e) => setManualRate(e.target.value)}
                    step="0.0001" min="0" placeholder={t("exchange.ratePlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-label-sm text-on-surface-variant mb-1">{t("exchange.date")}</label>
                  <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition" />
                </div>
                <button type="submit" disabled={saving || !manualRate}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-sm transition disabled:opacity-50 active:scale-95">
                  {saving ? `${t("exchange.save")}...` : t("exchange.save")}
                </button>
              </form>
            </div>

            {/* Geçmiş Tablosu */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-surface-dim rounded-2xl border border-outline-variant overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant">
                  <h2 className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">{t("exchange.history")}</h2>
                </div>
                <div className="divide-y divide-outline-variant/50 max-h-64 overflow-y-auto">
                  {history.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-6 py-2.5 text-body-md hover:bg-surface-container-low transition">
                      <span className="text-on-surface-variant font-mono-data">{r.date}</span>
                      <span className="font-semibold text-on-surface">{r.rate.toFixed(4)} ₺</span>
                      <span className={`text-label-sm px-2 py-0.5 rounded-full ${
                        r.source === "api" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                        r.source === "manual" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                        "bg-surface-container-low text-on-surface-variant"
                      }`}>
                        {r.source === "api" ? t("exchange.live").replace("🌐 ", "") : r.source === "manual" ? t("exchange.manual").replace("✏️ ", "") : t("exchange.cached").replace("💾 ", "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
