import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import { useThemeStore } from "./store/appStore";

// Lazy-loaded pages
const Products = lazy(() => import("./pages/Products"));
const StockIn = lazy(() => import("./pages/StockIn"));
const StockOut = lazy(() => import("./pages/StockOut"));
const BarcodeScanner = lazy(() => import("./pages/BarcodeScanner"));
const Finance = lazy(() => import("./pages/Finance"));
const ExchangeRates = lazy(() => import("./pages/ExchangeRates"));
const Settings = lazy(() => import("./pages/Settings"));

// Lazy loading için yükleniyor bileşeni
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 dark:text-slate-500">Yükleniyor...</p>
      </div>
    </div>
  );
}

// Sayfa geçiş animasyonu sarmalayıcısı
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}

function ToastContainer() {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "12px",
          fontSize: "14px",
          padding: "12px 16px",
          background: isDark ? "#1e293b" : "#fff",
          color: isDark ? "#e2e8f0" : "#1e293b",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
        },
        success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
        error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <ErrorBoundary>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/products" element={<PageTransition><Products /></PageTransition>} />
            <Route path="/stock/in" element={<PageTransition><StockIn /></PageTransition>} />
            <Route path="/stock/out" element={<PageTransition><StockOut /></PageTransition>} />
            <Route path="/barcode" element={<PageTransition><BarcodeScanner /></PageTransition>} />
            <Route path="/finance" element={<PageTransition><Finance /></PageTransition>} />
            <Route path="/exchange-rates" element={<PageTransition><ExchangeRates /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          </Routes>
        </Suspense>
      </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
