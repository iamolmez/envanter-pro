import React, { useEffect } from "react";
import { useSidebarStore } from "../store/appStore";

const menuItems = [
  {
    label: "Dashboard",
    icon: "📊",
    href: "/",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    label: "Ürünler",
    icon: "📦",
    href: "/products",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    label: "Stok Girişi",
    icon: "📥",
    href: "/stock/in",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    label: "Stok Çıkışı",
    icon: "📤",
    href: "/stock/out",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    label: "Barkod Okut",
    icon: "📷",
    href: "/barcode",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    label: "Finans",
    icon: "💰",
    href: "/finance",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    label: "Döviz Kuru",
    icon: "💱",
    href: "/exchange-rates",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    label: "Ayarlar",
    icon: "⚙️",
    href: "/settings",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  },
];

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

  // Mobile overlay click
  const handleOverlayClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Mobil overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out
          ${isOpen ? (isMobile ? "w-72" : "w-64") : "w-0 -translate-x-full"}
          ${isMobile ? "shadow-xl" : "shadow-sm"}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-lg font-bold shadow-md">
              E
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-800 truncate">
                EnvanterPro
              </h1>
              <p className="text-xs text-slate-400">Envanter Yönetimi</p>
            </div>
          </div>

          {/* Menü */}
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Menü
            </p>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150
                      ${
                        isActive
                          ? `${item.bgColor} ${item.color} shadow-sm`
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }
                    `}
                    onClick={() => isMobile && setOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Alt bilgi */}
          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-400 text-center">
              v1.0.0 • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
