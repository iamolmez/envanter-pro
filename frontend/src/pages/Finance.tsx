import React, { useEffect, useState } from "react";
import { stockMovementService, productService } from "../services/api";
import type { StockMovement, DashboardSummary } from "../types";
import toast from "react-hot-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { useThemeStore } from "../store/appStore";

const formatUSD = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const formatTRY = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(v);
const tooltipStyle = (isDark: boolean) => ({
  borderRadius: "12px",
  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  background: isDark ? "#1e293b" : "#fff",
  color: isDark ? "#e2e8f0" : "#1e293b",
  fontSize: "12px",
});

const COLORS = { in: "#22c55e", out: "#ef4444", profit: "#6366f1" };

export default function Finance() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, movData] = await Promise.all([
        stockMovementService.getSummary(),
        stockMovementService.getAll({ limit: 100, sortOrder: "desc" }),
      ]);
      setSummary(sumData);
      setMovements(movData.movements || []);
    } catch {
      toast.error("Finans verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Günlük bazda gelir/gider
  const dailyData = (() => {
    const map = new Map<string, { gelir: number; gider: number; kar: number }>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
      map.set(key, { gelir: 0, gider: 0, kar: 0 });
    }
    movements.forEach((m) => {
      const d = new Date(m.createdAt);
      const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
      if (map.has(key) && m.totalPriceUSD) {
        const entry = map.get(key)!;
        if (m.type === "IN") { entry.gider += m.totalPriceUSD; entry.kar -= m.totalPriceUSD; }
        else if (m.type === "OUT") { entry.gelir += Math.abs(m.totalPriceUSD); entry.kar += Math.abs(m.totalPriceUSD); }
      }
    });
    return [...map.entries()].map(([name, data]) => ({ name, ...data }));
  })();

  const totalIncome = movements.filter(m => m.type === "OUT").reduce((s, m) => s + Math.abs(m.totalPriceUSD || 0), 0);
  const totalExpense = movements.filter(m => m.type === "IN").reduce((s, m) => s + (m.totalPriceUSD || 0), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Finans Yönetimi</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">Gelir, gider ve kârlılık analizi</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !summary ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
          <span className="text-5xl block mb-3">💰</span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Finans verisi bulunamadı</p>
          <p className="text-xs">Stok giriş/çıkışı yaptıkça finans verileriniz oluşacak</p>
        </div>
      ) : (
        <>
          {/* Kartlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Toplam Gelir</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatUSD(totalIncome)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatTRY(totalIncome * (summary?.currentExchangeRate || 1))}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Toplam Gider</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatUSD(totalExpense)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatTRY(totalExpense * (summary?.currentExchangeRate || 1))}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Net Kâr/Zarar</p>
              <p className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {netProfit >= 0 ? "+" : ""}{formatUSD(netProfit)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{netProfit >= 0 ? "+" : ""}{formatTRY(netProfit * (summary?.currentExchangeRate || 1))}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Envanter Değeri</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatUSD(summary.totalInventoryValueUSD)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatTRY(summary.totalInventoryValueTRY)}</p>
            </div>
          </div>

          {/* Grafik */}
          {dailyData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Günlük Gelir/Gider (Son 7 Gün)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={tooltipStyle(isDark)} formatter={(value: number) => [formatUSD(value)]} />
                    <Bar dataKey="gelir" name="Gelir" fill={COLORS.in} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gider" name="Gider" fill={COLORS.out} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Kârlılık */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Kârlılık Analizi</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Envanter Değeri (USD)</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatUSD(summary.totalInventoryValueUSD)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Envanter Maliyeti (USD)</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatUSD(summary.totalInventoryCostUSD)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Potansiyel Kâr (USD)</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatUSD(summary.totalPotentialProfitUSD)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Potansiyel Kâr (TL)</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatTRY(summary.totalPotentialProfitTRY)}</span>
                  </div>
                  {summary.totalInventoryCostUSD > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Kâr Marjı</span>
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          %{(((summary.totalInventoryValueUSD - summary.totalInventoryCostUSD) / summary.totalInventoryCostUSD) * 100).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Güncel Kur</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {summary.currentExchangeRate.toFixed(4)} ₺
                      <span className="text-xs text-slate-400 ml-1">USD/TRY</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Son İşlemler */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Son Finansal İşlemler</h2>
              {movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-sm">Henüz işlem yok</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {movements.slice(0, 15).map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${m.type === "IN" ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-green-100 dark:bg-green-900/30 text-green-600"}`}>
                          {m.type === "IN" ? "📥" : "📤"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{m.product?.name || "Ürün"}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{Math.abs(m.quantity)} adet • {new Date(m.createdAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-semibold ${m.type === "OUT" ? "text-green-600" : "text-red-600"}`}>
                          {m.type === "OUT" ? "+" : "-"}{m.totalPriceUSD ? formatUSD(m.totalPriceUSD) : "—"}
                        </p>
                        {m.totalPriceTRY && <p className="text-[10px] text-slate-400">{formatTRY(m.totalPriceTRY)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
