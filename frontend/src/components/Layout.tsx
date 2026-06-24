import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import NotificationCenter from "./NotificationCenter";
import { useThemeStore } from "../store/appStore";
import { useI18n } from "../hooks/useI18n";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: "dashboard" },
  { href: "/products", labelKey: "nav.products", icon: "inventory" },
  { href: "/stock/in", labelKey: "nav.orders", icon: "shopping_cart" },
  { href: "/barcode", labelKey: "nav.barcodes", icon: "barcode_scanner" },
  { href: "/finance", labelKey: "nav.finance", icon: "analytics" },
  { href: "/settings", labelKey: "nav.settings", icon: "settings" },
];

export default function Layout({ children }: LayoutProps) {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const t = useI18n((s) => s.t);

  // Dark mode'u HTML elementine uygula
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased overflow-x-hidden theme-transition">
      {/* ====== DESKTOP SIDEBAR (lg+) - shared across all pages ====== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 bg-surface dark:bg-surface-dim border-r border-outline-variant dark:border-outline w-72 theme-transition">
        {/* Brand */}
        <div className="px-stack-lg py-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            <span className="text-headline-md font-headline-md font-bold text-primary">{t("app.name")}</span>
          </div>
          {/* Desktop notification bell in sidebar */}
          <NotificationCenter />
        </div>
        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <a
                key={item.href}
                className={`group relative flex items-center gap-3 px-4 h-touch-min rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary font-bold"
                    : "text-on-surface-variant dark:text-outline-variant hover:bg-surface-container"
                }`}
                href={item.href}
              >
                {isActive && (
                  <span className="absolute right-0 top-[15%] h-[70%] w-1 bg-primary rounded-l-md transition-colors duration-200" />
                )}
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-label-md font-label-md">{t(item.labelKey)}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* ====== MAIN CONTENT (offset for desktop sidebar) ====== */}
      <main className="lg:ml-72 pb-32 lg:pb-0 min-h-screen theme-transition">
        {children}
      </main>

      {/* Mobile floating notification button (visible on mobile only) */}
      <div className="lg:hidden fixed top-[10px] right-4 z-50">
        <NotificationCenter />
      </div>

      {/* Bottom Navigation (mobile only) */}
      <BottomNav />
    </div>
  );
}
