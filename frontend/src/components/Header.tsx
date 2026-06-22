import React from "react";
import { useSidebarStore, useExchangeRateStore } from "../store/appStore";
import { useEffect } from "react";

export default function Header() {
  const { toggle, isOpen } = useSidebarStore();
  const { currentRate, fetchRate } = useExchangeRateStore();

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return (
    <header
      className={`
        fixed top-0 right-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200
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
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors duration-150 text-slate-600"
            aria-label="Menüyü aç/kapat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

          {/* Sayfa başlığı */}
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {getPageTitle()}
            </h2>
            <p className="text-xs text-slate-400">
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
        <div className="flex items-center gap-3">
          {/* Döviz kuru göstergesi */}
          {currentRate && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-sm">💱</span>
              <div className="text-xs">
                <span className="font-semibold text-amber-700">
                  {currentRate.rate.toFixed(4)} ₺
                </span>
                <span className="text-amber-500 ml-1">USD/TRY</span>
              </div>
            </div>
          )}

          {/* Çevrimdışı göstergesi */}
          {!navigator.onLine && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600">
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
