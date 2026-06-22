import React from "react";
import { useSidebarStore, useExchangeRateStore, useThemeStore } from "../store/appStore";
import { useEffect } from "react";

export default function Header() {
  const { toggle, isOpen } = useSidebarStore();
  const { currentRate, fetchRate } = useExchangeRateStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return (
    <header
      className={`
        fixed top-0 right-0 z-20 h-16 glass border-b border-slate-200/80
        dark:border-slate-700/50
        transition-all duration-300 ease-in-out
        ${isOpen ? "md:left-64 left-0" : "left-0"}
      `}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Sol taraf */}
        <div className="flex items-center gap-3">
          {/* Hamburger buton */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 text-slate-600 dark:text-slate-400 active:scale-95"
            aria-label="Menüyü aç/kapat"
          >
            <svg
              className="w-5 h-5 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Sayfa başlığı */}
          <div className="animate-fade-in">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {getPageTitle()}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {new Date().toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Sağ taraf */}
        <div className="flex items-center gap-2">
          {/* Döviz kuru */}
          {currentRate && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 transition-colors">
              <span className="text-sm">💱</span>
              <div className="text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {currentRate.rate.toFixed(4)} ₺
                </span>
              </div>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 text-slate-600 dark:text-slate-400 active:scale-90"
            aria-label={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
            title={isDark ? "Aydınlık Mod" : "Karanlık Mod"}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Çevrimdışı göstergesi */}
          {!navigator.onLine && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Çevrimdışı
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function getPageTitle(): string {
  const path = window.location.pathname;
  if (path === "/") return "Dashboard";
  if (path.startsWith("/products")) return "Ürünler";
  if (path.startsWith("/stock/in")) return "Stok Girişi";
  if (path.startsWith("/stock/out")) return "Stok Çıkışı";
  if (path.startsWith("/barcode")) return "Barkod Okuyucu";
  if (path.startsWith("/finance")) return "Finans";
  if (path.startsWith("/exchange-rates")) return "Döviz Kuru";
  if (path.startsWith("/settings")) return "Ayarlar";
  return "Sayfa";
}
