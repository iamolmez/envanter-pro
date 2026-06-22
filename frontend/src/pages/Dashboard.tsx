import React, { useEffect, useState } from "react";
import { useDashboardStore, useStockStore, useThemeStore } from "../store/appStore";
import { productService, stockMovementService } from "../services/api";
import type { StockMovement } from "../types";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const formatUSD = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

const formatTRY = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(value);

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#f43f5e"];

const tooltipStyle = (isDark: boolean) => ({
  borderRadius: "12px",
  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  background: isDark ? "#1e293b" : "#fff",
  color: isDark ? "#e2e8f0" : "#1e293b",
  fontSize: "12px",
});

interface CategoryCount { name: string; value: number; color: string; }
interface WeeklyData { name: string; giren: number; cikan: number; }

export default function Dashboard() {
  const { summary, loading: summaryLoading, error, fetchSummary } = useDashboardStore();
  const { recentMovements, fetchRecent } = useStockStore();
  const isDark = useThemeStore((s) => s.isDark);

  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    fetchSummary();
    fetchRecent();
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoadingCharts(true);
    try {
      // Tüm ürünleri çekerek kategori dağılımını hesapla
      const productData = await productService.getAll({ limit: 1000, isActive: "true" });
      const catMap = new Map<string, number>();
      productData.products.forEach((p) => {
        const cat = p.category || "Diğer";
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      });
      const sorted = [...catMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
      setCategories(sorted.length > 0 ? sorted : [{ name: "Henüz ürün yok", value: 1, color: "#cbd5e1" }]);

      // Son 200 hareketi çekerek haftalık grafik oluştur
      const movData = await stockMovementService.getAll({ limit: 200, sortOrder: "desc" });
      const movements = movData.movements || [];

      // Son 7 günü grupla
      const dayMap = new Map<string, { giren: number; cikan: number }>();
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
        dayMap.set(key, { giren: 0, cikan: 0 });
      }

      movements.forEach((m) => {
        const d = new Date(m.createdAt);
        const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
        if (dayMap.has(key)) {
          const entry = dayMap.get(key)!;
          if (m.type === "IN") entry.giren += Math.abs(m.quantity);
          else if (m.type === "OUT") entry.cikan += Math.abs(m.quantity);
        }
      });

      setWeeklyData([...dayMap.entries()].map(([name, data]) => ({ name, ...data })));
    } catch {
      // API hatası durumunda sessizce boş geç
    } finally {
      setLoadingCharts(false);
    }
  };

  const loading = summaryLoading || loadingCharts;

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Envanter ve finans durumuna genel bakış</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard icon="📦" label="Toplam Ürün" value={summary?.totalProducts.toString() || "0"} subtext="Aktif ürünler" color="blue" />
        <StatCard icon="⚠️" label="Kritik Stok" value={summary?.lowStockCount.toString() || "0"}
          subtext={summary?.outOfStockCount ? `${summary.outOfStockCount} adet tükenmiş` : "Stokta"}
          color={(summary?.lowStockCount || 0) > 0 ? "red" : "green"} />
        <StatCard icon="💰" label="Envanter Değeri (USD)" value={formatUSD(summary?.totalInventoryValueUSD || 0)}
          subtext={`Maliyet: ${formatUSD(summary?.totalInventoryCostUSD || 0)}`} color="emerald" />
        <StatCard icon="🇹🇷" label="Envanter Değeri (TL)" value={formatTRY(summary?.totalInventoryValueTRY || 0)}
          subtext={`Kur: ${summary?.currentExchangeRate?.toFixed(4) || "?"} ₺`} color="amber" />
      </div>

      {/* Orta bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {summary && (
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Kâr Analizi</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Potansiyel Kâr (USD)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatUSD(summary.totalPotentialProfitUSD)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Potansiyel Kâr (TL)</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatTRY(summary.totalPotentialProfitTRY)}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500">Kâr Marjı</p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.totalInventoryCostUSD > 0
                    ? `%${(((summary.totalInventoryValueUSD - summary.totalInventoryCostUSD) / summary.totalInventoryCostUSD) * 100).toFixed(1)}`
                    : "—"}
                </p>
              </div>
              {/* Mini stok durumu */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Stok Durumu</p>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 rounded-full bg-green-200 dark:bg-green-900/50 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: summary.totalProducts > 0 ? `${((summary.totalProducts - summary.lowStockCount - summary.outOfStockCount) / summary.totalProducts) * 100}%` : "0%" }} />
                  </div>
                  <div className="flex-1 rounded-full bg-amber-200 dark:bg-amber-900/50 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: summary.totalProducts > 0 ? `${(summary.lowStockCount / summary.totalProducts) * 100}%` : "0%" }} />
                  </div>
                  <div className="flex-1 rounded-full bg-red-200 dark:bg-red-900/50 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: summary.totalProducts > 0 ? `${(summary.outOfStockCount / summary.totalProducts) * 100}%` : "0%" }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>Normal</span>
                  <span>Kritik ({summary.lowStockCount})</span>
                  <span>Tükenmiş ({summary.outOfStockCount})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stok Grafiği */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stok Hareketleri (Son 7 Gün)</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Giriş</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Çıkış</span>
            </div>
          </div>
          <div className="h-64">
            {loadingCharts ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Grafik yükleniyor...</div>
            ) : weeklyData.length === 0 || weeklyData.every(d => d.giren === 0 && d.cikan === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <span className="text-3xl mb-2">📊</span>
                <p>Henüz stok hareketi yok</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip contentStyle={tooltipStyle(isDark)} />
                  <Bar dataKey="giren" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cikan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Alt bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kategori */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Kategori Dağılımı</h3>
          <div className="h-64 flex items-center justify-center">
            {loadingCharts ? (
              <p className="text-sm text-slate-400">Yükleniyor...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle(isDark)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {categories.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Son Hareketler */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Son Hareketler</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Canlı</span>
          </div>

          {recentMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">Henüz stok hareketi yok</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentMovements.slice(0, 8).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${movement.type === "IN" ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"}`}>
                      {movement.type === "IN" ? "📥" : "📤"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{movement.product?.name || "Ürün"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {Math.abs(movement.quantity)} adet
                        {movement.note && <span className="ml-1">• {movement.note}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold ${movement.type === "IN" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {movement.type === "IN" ? "+" : "-"}{Math.abs(movement.quantity)}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(movement.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>Son güncelleme: {summary.exchangeRateSource === "api" ? "🌐 Canlı" : "💾 Önbellek"}</span>
              <span>USD/TRY: <strong className="text-slate-600 dark:text-slate-300">{summary.currentExchangeRate.toFixed(4)}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== STAT CARD ====================
interface StatCardProps {
  icon: string; label: string; value: string; subtext: string; color: "blue" | "red" | "green" | "emerald" | "amber";
}
function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const lightBg: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700", red: "bg-red-50 border-red-200 text-red-700",
    green: "bg-green-50 border-green-200 text-green-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  const darkBg: Record<string, string> = {
    blue: "dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300", red: "dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300",
    green: "dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-300", emerald: "dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300",
    amber: "dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300",
  };
  const iconLight: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600", red: "bg-red-100 text-red-600", green: "bg-green-100 text-green-600",
    emerald: "bg-emerald-100 text-emerald-600", amber: "bg-amber-100 text-amber-600",
  };
  const iconDark: Record<string, string> = {
    blue: "dark:bg-blue-500/20 dark:text-blue-400", red: "dark:bg-red-500/20 dark:text-red-400",
    green: "dark:bg-green-500/20 dark:text-green-400", emerald: "dark:bg-emerald-500/20 dark:text-emerald-400",
    amber: "dark:bg-amber-500/20 dark:text-amber-400",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 group ${lightBg[color]} ${darkBg[color]}`}>
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 opacity-5"><div className="w-full h-full rounded-full bg-current" /></div>
      <div className="relative">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${iconLight[color]} ${iconDark[color]}`}>{icon}</span>
        <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-bold mb-1 truncate">{value}</p>
        <p className="text-xs opacity-60 truncate">{subtext}</p>
      </div>
    </div>
  );
}
