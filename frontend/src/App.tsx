import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";

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
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Sayfa yükleniyor...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            fontSize: "14px",
            padding: "12px 16px",
          },
        }}
      />
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock/in" element={<StockIn />} />
            <Route path="/stock/out" element={<StockOut />} />
            <Route path="/barcode" element={<BarcodeScanner />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/exchange-rates" element={<ExchangeRates />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
