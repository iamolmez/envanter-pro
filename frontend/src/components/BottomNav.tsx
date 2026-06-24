import React from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../hooks/useI18n";

const navItems = [
  { labelKey: "nav.home", icon: "home", href: "/" },
  { labelKey: "nav.products", icon: "inventory_2", href: "/products" },
  { labelKey: "nav.scan", icon: "qr_code_scanner", href: "/barcode", prominent: true },
  { labelKey: "nav.finance", icon: "bar_chart", href: "/finance" },
  { labelKey: "nav.settings", icon: "settings", href: "/settings" },
];

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const t = useI18n((s) => s.t);

  return (
    <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-around h-[72px] bg-white/90 dark:bg-surface-dim/90 backdrop-blur-md px-2 border border-outline-variant/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl relative overflow-visible">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;

          if (item.prominent) {
            return (
              <div key={item.href} className="flex flex-col items-center justify-center flex-1 -mt-12 group">
                <a
                  href={item.href}
                  className="w-16 h-16 bg-primary dark:bg-primary-container text-white dark:text-on-primary-container rounded-[20px] flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform duration-200"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'wght' 600" }}>
                    {item.icon}
                  </span>
                </a>
                <span className="text-[10px] mt-2 text-on-surface-variant dark:text-outline-variant font-medium">
                  {t(item.labelKey)}
                </span>
              </div>
            );
          }

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 active:scale-90 ${
                isActive
                  ? "text-primary dark:text-primary-fixed-dim"
                  : "text-on-surface-variant dark:text-outline-variant"
              }`}
            >
              <span
                className="material-symbols-outlined mb-1"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {t(item.labelKey)}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
