import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSidebarStore, useThemeStore } from "../store/appStore";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isOpen } = useSidebarStore();
  const { isDark } = useThemeStore();

  // Dark mode'u HTML elementine uygula
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar />
      <Header />

      {/* Ana içerik */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300 ease-in-out
          ${isOpen ? "md:ml-64 ml-0" : "ml-0"}
          md:pb-0 pb-16
        `}
      >
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
