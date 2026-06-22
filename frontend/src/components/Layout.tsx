import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSidebarStore } from "../store/appStore";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isOpen } = useSidebarStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <Header />

      {/* Ana içerik */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300 ease-in-out
          ${isOpen ? "md:ml-64 ml-0" : "ml-0"}
        `}
      >
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
