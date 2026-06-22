import React, { useEffect } from "react";
import { useDashboardStore, useStockStore } from "../store/appStore";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Format helpers (bileşen dışı - her render'da yeniden oluşmaz)
const formatUSD = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatTRY = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

// Renk paleti
const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6"];

// Statik grafik verisi (canlı API olmadığında gösterilecek)
const placeholderChartData = [
  { name: "Hafta 1", giren: 45, cikan: 30 },
  { name: "Hafta 2", giren: 52, cikan: 48 },
  { name: "Hafta 3", giren: 38, cikan: 42 },
  { name: "Hafta 4", giren: 65, cikan: 55 },
];

const placeholderPieData = [
  { name: "Elektronik", value: 35 },
  { name: "Gıda", value: 25 },
  { name: "Tekstil", value: 20 },
  { name: "Diğer", value: 20 },
];

export default function Dashboard() {
  const { summary, loading, error, fetchSummary } = useDashboardStore();
  const { recentMovements, fetchRecent } = useStockStore();

  useEffect(() => {
    fetchSummary();
    fetchRecent();
  }, [fetchSummary, fetchRecent]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sayfa başlığı */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Envanter ve finans durumuna genel bakış
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Ürün */}
        <StatCard
          icon="📦"
          label="Toplam Ürün"
          value={summary?.totalProducts.toString() || "0"}
          subtext="Aktif ürünler"
          color="blue"
        />

        {/* Kritik Stok */}
        <StatCard
          icon="⚠️"
          label="Kritik Stok"
          value={summary?.lowStockCount.toString() || "0"}
          subtext={
            summary?.outOfStockCount
              ? `${summary.outOfStockCount} adet tükenmiş`
              : "Stokta"
          }
          color={
            (summary?.lowStockCount || 0) > 0
              ? "red"
              : "green"
          }
        />

        {/* Envanter Değeri (USD) */}
        <StatCard
          icon="💰"
          label="Envanter Değeri (USD)"
          value={formatUSD(summary?.totalInventoryValueUSD || 0)}
          subtext={`Maliyet: ${formatUSD(
            summary?.totalInventoryCostUSD || 0
          )}`}
          color="emerald"
        />

        {/* Envanter Değeri (TL) */}
        <StatCard
          icon="🇹🇷"
          label="Envanter Değeri (TL)"
          value={formatTRY(summary?.totalInventoryValueTRY || 0)}
          subtext={`Kur: ${summary?.currentExchangeRate?.toFixed(4) || "?"} ₺`}
          color="amber"
        />
      </div>

      {/* Orta bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kâr Marjı Kartı */}
        {summary && (
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Kâr Analizi
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Potansiyel Kâr (USD)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatUSD(summary.totalPotentialProfitUSD)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Potansiyel Kâr (TL)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatTRY(summary.totalPotentialProfitTRY)}
                </p>
              </div>
              {summary.totalInventoryCostUSD > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Kâr Marjı</p>
                  <p className="text-lg font-bold text-blue-600">
                    %{(
                      ((summary.totalInventoryValueUSD -
                        summary.totalInventoryCostUSD) /
                        summary.totalInventoryCostUSD) *
                      100
                    ).toFixed(1)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stok Grafiği */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Stok Hareketleri
            </h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Giriş
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Çıkış
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={placeholderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="giren" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cikan" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alt bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kategori Dağılımı */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Kategori Dağılımı
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={placeholderPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {placeholderPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {placeholderPieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-slate-600">{item.name}</span>
                <span className="font-semibold text-slate-800 ml-auto">
                  %{item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Son Hareketler */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Son Hareketler
            </h3>
            <span className="text-xs text-slate-400">Canlı</span>
          </div>

          {recentMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm">Henüz stok hareketi yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.slice(0, 6).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        movement.type === "IN"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {movement.type === "IN" ? "📥" : "📤"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {movement.product?.name || "Ürün"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {Math.abs(movement.quantity)} adet •{" "}
                        {new Date(movement.createdAt).toLocaleTimeString(
                          "tr-TR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      movement.type === "IN"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {movement.type === "IN" ? "+" : "-"}
                    {Math.abs(movement.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Kur bilgisi */}
          {summary && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>
                Son güncelleme:{" "}
                {summary.exchangeRateSource === "api" ? "🌐 Canlı" : "💾 Önbellek"}
              </span>
              <span>
                USD/TRY:{" "}
                <strong className="text-slate-600">
                  {summary.currentExchangeRate.toFixed(4)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== STAT CARD ====================
interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtext: string;
  color: "blue" | "red" | "green" | "emerald" | "amber";
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorStyles = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
    green: "bg-green-50 border-green-200 text-green-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };

  const iconStyles = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 group ${
        colorStyles[color]
      }`}
    >
      {/* Arka plan gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 opacity-5">
        <div className="w-full h-full rounded-full bg-current" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconStyles[color]}`}
          >
            {icon}
          </span>
        </div>
        <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-xl font-bold mb-1 truncate">{value}</p>
        <p className="text-xs opacity-60 truncate">{subtext}</p>
      </div>
    </div>
  );
}
