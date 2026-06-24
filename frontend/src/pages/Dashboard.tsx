import React, { useEffect, useState } from "react";
import { useDashboardStore, useStockStore, useExchangeRateStore } from "../store/appStore";
import { productService, stockMovementService } from "../services/api";
import { useTranslation } from "../hooks/useI18n";

const formatUSD = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

const formatTRY = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(value);

interface WeeklyData { name: string; giren: number; cikan: number; }

const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const weekDaysShort = ["PZT", "SALI", "ÇAR", "PER", "CUM", "CMT", "PAZ"];

export default function Dashboard() {
  const { summary, loading: summaryLoading, fetchSummary } = useDashboardStore();
  const { recentMovements, fetchRecent } = useStockStore();
  const { currentRate, fetchRate } = useExchangeRateStore();
  const { t } = useTranslation();

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const [lowStockProducts, setLowStockProducts] = useState<Array<{
    id: number; sku: string; name: string; category: string;
    currentStock: number; minStockLevel: number;
  }>>([]);



  useEffect(() => {
    fetchSummary();
    fetchRecent();
    fetchRate();
    loadChartData();
    loadLowStockProducts();
  }, []);

  const loadChartData = async () => {
    setLoadingCharts(true);
    try {
      const movData = await stockMovementService.getAll({ limit: 200, sortOrder: "desc" });
      const movements = movData.movements || [];
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
      // sessiz
    } finally {
      setLoadingCharts(false);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      const data = await productService.getAll({ limit: 100, isActive: "true", lowStock: "true" });
      setLowStockProducts(data.products.map((p) => ({
        id: p.id, sku: p.sku, name: p.name, category: p.category,
        currentStock: p.currentStock, minStockLevel: p.minStockLevel,
      })));
    } catch {
      // sessiz
    }
  };

  const loading = summaryLoading || loadingCharts;

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-body-sm text-on-surface-variant">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  const lowStockCount = summary?.lowStockCount || 0;
  const totalStockQty = summary?.totalStockQuantity || 0;
  const dailySales = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1]?.cikan || 0 : 0;
  const maxVal = Math.max(...weeklyData.flatMap((w) => [w.giren, w.cikan]), 1);
  const allChartsEmpty = weeklyData.length === 0 || weeklyData.every((d) => d.giren === 0 && d.cikan === 0);

  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-hidden h-dvh flex flex-col">
        {/* ====== MOBILE TOPAPPBAR (lg:hidden) ====== */}
        <header className="lg:hidden fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile h-touch-min bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            <h1 className="text-headline-sm font-headline-sm font-bold text-primary dark:text-primary-fixed-dim">OlmezEnvanter</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentRate && (
              <div className="bg-surface-container-low px-2 py-1 rounded-full flex items-center gap-1 border border-outline-variant">
                <span className="text-label-sm font-label-sm text-secondary">USD:</span>
                <span className="text-label-md font-label-md text-on-surface">{currentRate.rate.toFixed(2)}</span>
              </div>
            )}
            <button className="w-touch-min h-touch-min flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors active:opacity-80 duration-100">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </button>
          </div>
        </header>

        {/* ====== DESKTOP TOPAPPBAR (hidden lg) ====== */}
        <header className="hidden lg:flex h-touch-min min-h-[64px] items-center justify-between px-container-margin-desktop bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline sticky top-0 w-full z-30">
          <div className="flex items-center gap-gutter w-1/3">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="w-full pl-10 pr-4 h-10 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Ürün, barkod veya sipariş ara..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              {lowStockCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface" />
              )}
            </button>
          </div>
        </header>

        {/* ====== SCROLLABLE BODY ====== */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile top padding (account for fixed mobile header) */}
          <div className="lg:hidden pt-16" />

          <div className="px-container-margin-mobile md:px-container-margin-desktop py-4 space-y-6">
            {/* ====== MOBILE: Pull to Refresh Indicator (lg:hidden) ====== */}
            <div className="lg:hidden flex justify-center -mt-2 mb-2 opacity-60">
              <span className="material-symbols-outlined ptr-animate text-secondary">refresh</span>
            </div>

            {/* ====== MOBILE TITLE + DESKTOP HEADER ====== */}
            {/* Mobile title */}
            <div className="lg:hidden flex flex-col gap-1">
              <h2 className="text-headline-md font-headline-md text-on-surface">{t("dashboard.title")}</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{t("dashboard.sync")}</p>
            </div>

            {/* Desktop header with actions */}
            <div className="hidden lg:flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-display-lg font-display-lg text-on-surface tracking-tight">{t("dashboard.title")}</h1>
                <p className="text-body-md text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}</span>
                </p>
              </div>
              <div className="flex gap-stack-md">
                <button className="h-touch-min px-6 flex items-center gap-2 bg-surface border border-outline-variant text-on-surface font-label-md hover:bg-surface-container-low transition-colors rounded-lg shadow-sm">
                  <span className="material-symbols-outlined">download</span>
                  {t("dashboard.exportReport")}
                </button>
                <button className="h-touch-min px-6 flex items-center gap-2 bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 transition-all rounded-lg shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                  {t("dashboard.newStockEntry")}
                </button>
              </div>
            </div>

            {/* ====== MOBILE: 2x2 METRIC GRID (lg:hidden) ====== */}
            <section className="lg:hidden grid grid-cols-2 gap-4">
              {/* Total Stock */}
              <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <div className="flex justify-between items-start">
                  <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">{t("dashboard.totalStock")}</span>
                  <span className="material-symbols-outlined text-primary text-sm opacity-50">inventory_2</span>
                </div>
                <div>
                  <div className="text-headline-sm font-headline-sm text-on-surface">{totalStockQty.toLocaleString()}</div>
                  <div className="text-label-sm font-label-sm text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">trending_up</span>
                    +2.4%
                  </div>
                </div>
              </div>

              {/* Low Stock */}
              <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
                <div className="flex justify-between items-start">
                  <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">{t("dashboard.criticalStock")}</span>
                  <span className="material-symbols-outlined text-error text-sm opacity-50">warning</span>
                </div>
                <div>
                  <div className="text-headline-sm font-headline-sm text-on-surface">{lowStockCount}</div>
                  <div className="text-label-sm font-label-sm text-error flex items-center gap-1">{t("dashboard.criticalCount")}</div>
                </div>
              </div>

              {/* Daily Sales */}
              <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary" />
                <div className="flex justify-between items-start">
                  <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">{t("dashboard.dailySales")}</span>
                  <span className="material-symbols-outlined text-tertiary text-sm opacity-50">shopping_bag</span>
                </div>
                <div>
                  <div className="text-headline-sm font-headline-sm text-on-surface">{dailySales}</div>
                  <div className="text-label-sm font-label-sm text-tertiary flex items-center gap-1">{t("dashboard.todayCount")}</div>
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-on-primary-container" />
                <div className="flex justify-between items-start">
                  <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">{t("dashboard.revenue")}</span>
                  <span className="material-symbols-outlined text-on-primary-container text-sm opacity-50">payments</span>
                </div>
                <div>
                  <div className="text-headline-sm font-headline-sm text-on-surface">{summary ? formatUSD(summary.monthlyRevenueUSD) : "$0"}</div>
                  <div className="text-label-sm font-label-sm text-on-primary-container flex items-center gap-1">{t("dashboard.thisMonth")}</div>
                </div>
              </div>
            </section>

            {/* ====== DESKTOP: 4-COL STAT CARDS (hidden lg) ====== */}
            <section className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              <div className="bg-surface p-stack-md rounded-lg border border-outline-variant flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <span className="p-2 bg-primary-container/10 text-primary rounded-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">inventory_2</span>
                  </span>
                  <span className="text-emerald-600 text-label-sm flex items-center gap-1 font-bold">+12%</span>
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-label-sm uppercase tracking-wider">{t("dashboard.totalStock")}</p>
                  <h3 className="text-headline-md font-headline-md font-bold mt-1">
                    {totalStockQty.toLocaleString()} <span className="text-label-md font-normal text-on-surface-variant">{t("dashboard.unit")}</span>
                  </h3>
                </div>
              </div>

              <div className="bg-surface p-stack-md rounded-lg border-l-4 border-l-error border border-outline-variant flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <span className="p-2 bg-error-container/20 text-error rounded-lg animate-pulse">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </span>
                  <span className="text-error text-label-sm font-bold">{t("dashboard.criticalStock")}</span>
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-label-sm uppercase tracking-wider">{t("dashboard.criticalStock")}</p>
                  <h3 className="text-headline-md font-headline-md font-bold mt-1 text-error">
                    {lowStockCount} <span className="text-label-md font-normal text-on-surface-variant">SKU</span>
                  </h3>
                </div>
              </div>

              <div className="bg-surface p-stack-md rounded-lg border border-outline-variant flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <span className="p-2 bg-secondary-container/10 text-secondary rounded-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">point_of_sale</span>
                  </span>
                  <span className="text-on-surface-variant text-label-sm">{t("dashboard.today")}</span>
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-label-sm uppercase tracking-wider">{t("dashboard.dailySales")}</p>
                  <h3 className="text-headline-md font-headline-md font-bold mt-1">
                    {dailySales.toLocaleString()} <span className="text-label-md font-normal text-on-surface-variant">{t("dashboard.items")}</span>
                  </h3>
                </div>
              </div>

              <div className="bg-surface p-stack-md rounded-lg border border-outline-variant flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <span className="p-2 bg-tertiary-container/10 text-tertiary rounded-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">payments</span>
                  </span>
                  <span className="text-emerald-600 text-label-sm flex items-center gap-1 font-bold">+5.4%</span>
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-label-sm uppercase tracking-wider">{t("dashboard.dailyRevenue")}</p>
                  <h3 className="text-headline-md font-headline-md font-bold mt-1">
                    {summary ? formatTRY(summary.monthlyRevenueTRY) : "₺0"} <span className="text-label-md font-normal text-on-surface-variant">TRY</span>
                  </h3>
                </div>
              </div>
            </section>

            {/* ====== MOBILE: KÂR ANALİZİ (lg:hidden) ====== */}
            <section className="lg:hidden bg-surface-container-lowest border border-outline-variant p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-label-md font-label-md text-on-surface">{t("dashboard.profitAnalysis")}</h3>
                <span className="text-label-sm font-label-sm text-primary">{t("dashboard.thisWeek")}</span>
              </div>
              {allChartsEmpty ? (
                <div className="h-[250px] w-full flex flex-col items-center justify-center text-on-surface-variant text-body-sm">
                  <span className="text-3xl mb-2">📊</span>
                  <p>{t("dashboard.noMovements")}</p>
                </div>
              ) : (
                <div className="h-[250px] w-full flex items-end justify-between gap-2 px-2 pt-8 relative border-l border-b border-outline-variant">
                  {weeklyData.map((d, i) => {
                    const pct = Math.max((d.cikan / maxVal) * 80, 3);
                    const val = d.cikan;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div className="bg-primary/20 w-full rounded-t-sm relative h-24">
                          <div className="bg-primary w-full chart-bar-fill absolute bottom-0 rounded-t-sm active" style={{ height: `${pct}%`, animationDelay: `${0.1 + i * 0.1}s` }} />
                          <div className="absolute -top-6 w-full text-center fade-label active" style={{ animationDelay: `${0.8 + i * 0.1}s` }}>
                            <span className="text-[9px] font-mono-data text-primary">{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-mono-data">{weekDaysShort[i]}</span>
                      </div>
                    );
                  })}
                  <div className="absolute left-0 top-0 flex flex-col justify-between h-full -ml-8 text-[10px] text-on-surface-variant opacity-60">
                    <span>{Math.round(maxVal * 1.25)}</span>
                    <span>{Math.round(maxVal)}</span>
                    <span>{Math.round(maxVal * 0.75)}</span>
                    <span>{Math.round(maxVal * 0.5)}</span>
                    <span>{Math.round(maxVal * 0.25)}</span>
                    <span>0</span>
                  </div>
                </div>
              )}
            </section>

            {/* ====== DESKTOP: CHART + MOVEMENTS SPLIT (hidden lg) ====== */}
            <section className="hidden lg:grid grid-cols-1 lg:grid-cols-10 gap-gutter">
              <div className="lg:col-span-7 bg-surface rounded-lg border border-outline-variant p-stack-lg shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-headline-sm font-headline-sm text-on-surface">{t("dashboard.profitAnalysis")}</h2>
                    <p className="text-body-sm text-on-surface-variant">{t("dashboard.last7Days")}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-3 h-3 bg-primary rounded-full" /> {t("dashboard.income")}</span>
                    <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-3 h-3 bg-primary-container rounded-full" /> {t("dashboard.expense")}</span>
                  </div>
                </div>
                {allChartsEmpty ? (
                  <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant text-body-sm">
                    <span className="text-3xl mb-2">📊</span>
                    <p>{t("dashboard.noMovements")}</p>
                  </div>
                ) : (
                  <div className="h-64 flex items-end justify-between gap-4 px-4">
                    {weeklyData.map((d, i) => {
                      const gelirPct = (d.cikan / maxVal) * 100;
                      const giderPct = (d.giren / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex items-end gap-1 h-full max-h-56">
                            <div className="bg-primary w-full rounded-t-sm transition-all duration-700 ease-out hover:brightness-110" style={{ height: `${Math.max(gelirPct, 2)}%` }} />
                            <div className="bg-primary-container w-full rounded-t-sm transition-all duration-700 ease-out hover:brightness-110" style={{ height: `${Math.max(giderPct, 2)}%` }} />
                          </div>
                          <span className="text-label-sm text-on-surface-variant">{weekDays[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-3 bg-surface rounded-lg border border-outline-variant p-stack-lg shadow-sm flex flex-col">
                <h2 className="text-headline-sm font-headline-sm text-on-surface mb-6">{t("dashboard.recent")}</h2>
                <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                  {recentMovements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl mb-2 text-outline">receipt_long</span>
                      <p className="text-body-sm">{t("dashboard.noMovements")}</p>
                    </div>
                  ) : (
                    recentMovements.slice(0, 10).map((m) => {
                      const isIn = m.type === "IN";
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIn ? "bg-emerald-100 text-emerald-600" : "bg-error-container/20 text-error"}`}>
                            <span className="material-symbols-outlined text-[20px]">{isIn ? "add_task" : "outbound"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-label-md font-label-md leading-none">{isIn ? t("dashboard.stockEntry") : t("dashboard.saleExit")}</p>
                            <p className="text-body-sm text-on-surface-variant mt-1 truncate">{m.product?.name || t("dashboard.unknown")} - {Math.abs(m.quantity)} {t("dashboard.items")}</p>
                          </div>
                          <span className="text-label-sm text-on-surface-variant shrink-0">{new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <button className="mt-auto pt-4 text-center text-primary text-label-md font-label-md hover:underline">{t("dashboard.viewAll")}</button>
              </div>
            </section>

            {/* ====== MOBILE: SON HAREKETLER (lg:hidden) ====== */}
            <section className="lg:hidden space-y-3 pb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-label-md font-label-md text-on-surface">{t("dashboard.recent")}</h3>
                <button
                  onClick={() => setShowAllActivities(!showAllActivities)}
                  className="text-label-sm font-label-sm text-primary hover:underline transition-all"
                >
                  {showAllActivities ? t("dashboard.showLess") : t("dashboard.showAll")}
                </button>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant">
                {recentMovements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                    <span className="text-3xl mb-2">📭</span>
                    <p className="text-body-sm">{t("dashboard.noMovements")}</p>
                  </div>
                ) : (
                  recentMovements.slice(0, showAllActivities ? 12 : 4).map((m) => {
                    const isIn = m.type === "IN";
                    return (
                      <div key={m.id} className="p-4 flex items-center justify-between active:bg-surface-container transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIn ? "bg-secondary-container text-primary" : "bg-error-container/20 text-error"}`}>
                            <span className="material-symbols-outlined">{isIn ? "add_box" : "remove_done"}</span>
                          </div>
                          <div>
                            <p className="text-label-md font-label-md text-on-surface">{m.product?.name || t("dashboard.unknown")}</p>
                            <p className="text-[11px] text-on-surface-variant font-mono-data">{Math.abs(m.quantity)} {t("dashboard.items")}{m.note && <span className="ml-1">• {m.note}</span>}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-label-md font-label-md ${isIn ? "text-on-surface" : "text-error"}`}>{isIn ? "+" : "-"}{Math.abs(m.quantity)}</p>
                          <p className="text-[10px] text-on-surface-variant">{new Date(m.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ====== DESKTOP: CRITICAL STOCK TABLE (hidden lg) ====== */}
            {lowStockProducts.length > 0 && (
              <section className="hidden lg:block bg-surface rounded-lg border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-stack-lg border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-error-container/20 text-error rounded-lg">
                      <span className="material-symbols-outlined">report_problem</span>
                    </span>
                    <h2 className="text-headline-sm font-headline-sm text-on-surface">{t("dashboard.criticalStockTracking")}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-surface border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container transition-colors">{t("dashboard.filter")}</button>
                    <button className="px-4 py-2 bg-surface border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container transition-colors">{t("common.export")}</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.sku")}</th>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.productName")}</th>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.category")}</th>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.currentStock")}</th>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.minLevel")}</th>
                        <th className="px-6 py-4 font-semibold">{t("dashboard.status")}</th>
                        <th className="px-6 py-4 font-semibold text-right">{t("dashboard.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {lowStockProducts.slice(0, 10).map((p) => {
                        const ratio = p.minStockLevel > 0 ? (p.currentStock / p.minStockLevel) * 100 : 0;
                        const statusLabel = ratio <= 40 ? t("dashboard.criticalLevel") : t("dashboard.orderNeeded");
                        const statusBg = ratio <= 40 ? "bg-error-container text-on-error-container" : "bg-tertiary-container text-white";
                        const stockColor = ratio <= 40 ? "text-error" : "text-tertiary";
                        return (
                          <tr key={p.id} className="hover:bg-surface-container-low transition-colors group">
                            <td className="px-6 py-4 font-mono-data text-on-surface text-sm">{p.sku}</td>
                            <td className="px-6 py-4 text-body-sm font-semibold">{p.name}</td>
                            <td className="px-6 py-4 text-body-sm">{p.category || "—"}</td>
                            <td className={`px-6 py-4 font-bold ${stockColor}`}>{p.currentStock} {t("dashboard.items")}</td>
                            <td className="px-6 py-4 text-body-sm">{p.minStockLevel} {t("dashboard.items")}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 ${statusBg} text-label-sm rounded-full`}>{statusLabel}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 hover:bg-primary-container/20 text-primary rounded-lg transition-colors">
                                <span className="material-symbols-outlined">shopping_cart_checkout</span>
                              </button>
                              <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Mobile bottom spacing for BottomNav */}
            <div className="lg:hidden h-16" />
          </div>
        </div>
    </div>
  );
}
