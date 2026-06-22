import React, { useEffect } from "react";
import { useSidebarStore } from "../store/appStore";

const menuItems = [
  {
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    href: "/",
    activeColor: "text-indigo-600 dark:text-indigo-400",
    activeBg: "bg-indigo-50 dark:bg-indigo-900/30",
  },
  {
    label: "Ürünler",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    href: "/products",
    activeColor: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  {
    label: "Stok Girişi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
    href: "/stock/in",
    activeColor: "text-green-600 dark:text-green-400",
    activeBg: "bg-green-50 dark:bg-green-900/30",
  },
  {
    label: "Stok Çıkışı",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
      </svg>
    ),
    href: "/stock/out",
    activeColor: "text-orange-600 dark:text-orange-400",
    activeBg: "bg-orange-50 dark:bg-orange-900/30",
  },
  {
    label: "Barkod Okut",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
    href: "/barcode",
    activeColor: "text-purple-600 dark:text-purple-400",
    activeBg: "bg-purple-50 dark:bg-purple-900/30",
  },
];

const bottomItems = [
  {
    label: "Finans",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: "/finance",
    activeColor: "text-yellow-600 dark:text-yellow-400",
    activeBg: "bg-yellow-50 dark:bg-yellow-900/30",
  },
  {
    label: "Döviz Kuru",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: "/exchange-rates",
    activeColor: "text-indigo-600 dark:text-indigo-400",
    activeBg: "bg-indigo-50 dark:bg-indigo-900/30",
  },
  {
    label: "Ayarlar",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: "/settings",
    activeColor: "text-slate-600 dark:text-slate-400",
    activeBg: "bg-slate-50 dark:bg-slate-800/50",
  },
];

const allItems = [...menuItems, ...bottomItems];

export default function Sidebar() {
  const { isOpen, isMobile, setMobile, setOpen } = useSidebarStore();
  const currentPath = window.location.pathname;

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setMobile]);

  const handleOverlayClick = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <>
      {/* Mobil overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-700/50
          transition-all duration-300 ease-in-out
          ${isMobile ? "shadow-2xl" : "shadow-sm"}
          ${isOpen ? (isMobile ? "w-72" : "w-64") : "w-0 -translate-x-full"}
          flex flex-col
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Alanı */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                EnvanterPro
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Envanter Yönetim Sistemi</p>
            </div>
          </div>

          {/* Menü */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">
              Ana Menü
            </p>
            <div className="space-y-0.5">
              {menuItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150 active:scale-[0.98]
                      ${isActive
                        ? `${item.activeBg} ${item.activeColor} shadow-sm`
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                      }
                    `}
                    onClick={() => isMobile && setOpen(false)}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                  </a>
                );
              })}
            </div>

            {/* Alt menü */}
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2 mt-4">
              Sistem
            </p>
            <div className="space-y-0.5">
              {bottomItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150 active:scale-[0.98]
                      ${isActive
                        ? `${item.activeBg} ${item.activeColor} shadow-sm`
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                      }
                    `}
                    onClick={() => isMobile && setOpen(false)}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Alt bilgi */}
          <div className="border-t border-slate-100 dark:border-slate-700/50 p-4 shrink-0">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
              EnvanterPro v1.0.0 &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobil Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/50 safe-area-bottom animate-slide-up md:hidden">
          <div className="flex items-center justify-around px-2 py-1">
            {allItems.slice(0, 5).map((item) => {
              const isActive = currentPath === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-medium
                    transition-all duration-150 min-w-[56px]
                    ${isActive
                      ? `${item.activeBg} ${item.activeColor}`
                      : "text-slate-400 dark:text-slate-500"
                    }
                  `}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate max-w-full">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
