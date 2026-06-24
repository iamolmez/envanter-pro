import React, { useEffect, useState, useCallback, useRef } from "react";
import { productService } from "../services/api";
import ProductFormModal from "../components/ProductFormModal";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import type { Product, ProductFormData } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useI18n";

type SortField = "name" | "currentStock" | "salePriceUSD" | "createdAt";

interface ImportResult {
  row: number;
  name: string;
  status: "created" | "updated" | "error";
  error?: string;
}

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState("");

  // Ctrl/Cmd+K ile arama kutusuna odaklan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [showImportResult, setShowImportResult] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importStats, setImportStats] = useState<{
    created: number;
    updated: number;
    errors: number;
  } | null>(null);

  // Filter bottom sheet state
  const [filterOpen, setFilterOpen] = useState(false);

  // Ürün detay bottom sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getAll({
        search: search || undefined,
        isActive: "true",
        sortBy: sortField,
        sortOrder: sortDir,
        page,
        limit: 30,
      });
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [search, sortField, sortDir, page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const handleAdd = async (data: ProductFormData) => {
    setFormLoading(true);
    try {
      await productService.create(data);
      toast.success(t("products.created"));
      setFormOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally { setFormLoading(false); }
  };

  const handleEdit = async (data: ProductFormData) => {
    if (!editing) return;
    setFormLoading(true);
    try {
      await productService.update(editing.id, data);
      toast.success(t("products.updated"));
      setFormOpen(false);
      setEditing(null);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata");
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await productService.delete(deleting.id);
      toast.success(t("products.deleted"));
      setDeleting(null);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata");
    } finally { setDeleteLoading(false); }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await productService.exportCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `urunler-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("products.exportSuccess", { count: products.length }));
    } catch {
      toast.error(t("products.exportError"));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error(t("products.csvRequired"));
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const result = await productService.importCSV(text);
      setImportResults(result.results as ImportResult[]);
      setImportStats({
        created: result.created,
        updated: result.updated,
        errors: result.errors,
      });
      setShowImportResult(true);
      toast.success(t("products.importSuccess", { created: result.created, updated: result.updated }));
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("products.importError"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleShowDetail = async (product: Product) => {
    setDetailLoading(true);
    setSelectedProduct(product);
    setDetailOpen(true);
    try {
      const full = await productService.getById(product.id);
      setSelectedProduct(full);
    } catch {
      // Mevcut bilgiyle devam et
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleFilter = (open: boolean) => {
    const sheet = document.getElementById("filterSheet");
    const overlay = document.getElementById("filterOverlay");
    if (open) {
      sheet?.classList.remove("translate-y-full");
      sheet?.classList.add("translate-y-0");
      overlay?.classList.remove("pointer-events-none", "opacity-0");
      overlay?.classList.add("opacity-100");
      document.body.style.overflow = "hidden";
    } else {
      sheet?.classList.add("translate-y-full");
      sheet?.classList.remove("translate-y-0");
      overlay?.classList.add("pointer-events-none", "opacity-0");
      overlay?.classList.remove("opacity-100");
      document.body.style.overflow = "";
    }
    setFilterOpen(open);
  };

  const fmt = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
  const fmtTL = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(v);

  // Pagination helper
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(page - 1, page, page + 1);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased overflow-x-hidden min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-sm">
          <span className="material-symbols-outlined text-primary" data-icon="inventory_2">inventory_2</span>
          <h1 className="text-headline-sm font-headline-sm font-bold text-primary">{t("products.title")}</h1>
        </div>
        <div className="flex items-center">
          <button className="w-touch-min h-touch-min flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
            <span className="material-symbols-outlined" data-icon="search">search</span>
          </button>
        </div>
      </header>

      <main className="pt-20 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-screen-2xl mx-auto">
        {/* Action Row */}
        <div className="flex flex-row gap-stack-sm mb-stack-md">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container h-[36px] rounded px-3 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="upload">upload</span>
            <span className="text-label-sm">{importing ? t("products.importing") : t("products.import")}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container h-[36px] rounded px-3 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
            <span className="text-label-sm">{t("products.export")}</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* Filter Trigger */}
        <button
          onClick={() => toggleFilter(true)}
          className="w-full mb-stack-md flex items-center justify-between px-stack-md py-stack-sm bg-white dark:bg-surface-dim border border-outline-variant rounded-xl shadow-sm h-touch-min transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          id="openFilter"
        >
          <div className="flex items-center gap-stack-sm">
            <span className="material-symbols-outlined text-primary" data-icon="filter_list">filter_list</span>
            <span className="text-label-md">{t("products.filter")}</span>
          </div>
          <span className="text-body-sm text-on-surface-variant">
            {search ? `🔍 ${search}` : `${products.length} ürün`}
          </span>
        </button>

        {/* Arama */}
        <div className="relative mb-stack-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl" data-icon="search">search</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("products.search")}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-dim text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-on-surface-variant pointer-events-none">
            <kbd className="px-1 py-0.5 rounded border border-outline-variant bg-surface-container-low font-mono-data">⌘K</kbd>
          </div>
        </div>

        {error && (
          <div className="text-body-sm text-error bg-error-container border border-error/20 rounded-lg px-3 py-2 mb-stack-md">{error}</div>
        )}

        {/* Product Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant text-body-md">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />                    <span>{t("products.loading")}</span>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-body-md">
            <span className="material-symbols-outlined text-5xl mb-3 block text-outline" data-icon="inventory_2">inventory_2</span>
            {search ? t("products.noResults") : t("products.empty")}
            {!search && (
              <div className="mt-4">
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md transition active:scale-95">
                  📥 {t("products.batchImport")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3" id="productGrid">
            {products.map((p, index) => {
              const critical = p.currentStock <= p.minStockLevel;
              const stockDisplay = p.totalValueTRY && p.salePriceUSD > 0;
              return (
                <div
                  key={p.id}
                  className="reveal-card bg-white dark:bg-surface-dim rounded-xl border border-outline-variant p-3 flex gap-3 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[1.02] hover:shadow-lg active:shadow-lg transition-all duration-300 cursor-pointer is-visible"
                  role="button"
                  style={{
                    borderLeft: critical ? "4px solid #f43f5e" : "4px solid #10b981",
                    transitionDelay: `${index * 0.05}s`,
                  }}
                  onClick={() => handleShowDetail(p)}
                  onTouchStart={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = "scale(0.98)";
                  }}
                  onTouchEnd={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = "";
                  }}
                >
                  {/* Ürün resmi */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-3xl" data-icon="inventory_2">inventory_2</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between flex-1 py-1">
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface leading-tight">{p.name}</h3>
                      <p className="text-label-sm font-mono-data text-on-surface-variant mt-0.5">SKU: {p.sku}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-headline-sm text-primary leading-none">{fmt(p.salePriceUSD)}</span>
                        {stockDisplay && (
                          <span className="text-body-sm text-on-surface-variant font-normal">
                            {fmtTL(p.totalValueTRY!)}
                          </span>
                        )}
                      </div>
                      <div className={`px-2 py-0.5 text-label-sm rounded-full font-bold ${
                        critical
                          ? "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300"
                          : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                      }`}>
                        {critical                        ? `${t("products.lowStock")}: ${p.currentStock}`
                        : `${t("products.inStock")}: ${p.currentStock}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-stack-lg flex items-center justify-center gap-2 overflow-x-auto hide-scrollbar py-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-touch-min h-touch-min flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant disabled:opacity-30"
            >
              <span className="material-symbols-outlined" data-icon="chevron_left">chevron_left</span>
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-on-surface-variant text-body-sm">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-touch-min h-touch-min flex items-center justify-center rounded-lg font-bold text-label-md ${
                    page === p
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-touch-min h-touch-min flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant disabled:opacity-30"
            >
              <span className="material-symbols-outlined" data-icon="chevron_right">chevron_right</span>
            </button>
          </div>
        )}
      </main>

      {/* Filter Bottom Sheet Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] opacity-0 pointer-events-none transition-opacity duration-300"
        id="filterOverlay"
        onClick={() => toggleFilter(false)}
      />

      {/* Filter Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 w-full z-[70] bg-white dark:bg-surface-dim rounded-t-2xl shadow-2xl bottom-sheet-transition touch-none translate-y-full"
        id="filterSheet"
      >
        {/* Handle */}
        <div className="w-full flex justify-center py-3 cursor-grab" id="sheetHandle">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full"></div>
        </div>
        <div className="px-container-margin-mobile pb-12">
          <div className="flex items-center justify-between mb-stack-md">              <h2 className="text-headline-sm font-bold text-on-surface dark:text-on-surface">{t("products.filters")}</h2>
            <button
              onClick={() => toggleFilter(false)}
              className="text-primary text-label-md py-2 px-4 hover:bg-primary-container/10 rounded-lg transition-colors"
              id="closeFilter"
            >                {t("common.done")}
            </button>
          </div>
          <div className="space-y-stack-lg">
            {/* Sıralama */}
            <div>
              <label className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-stack-sm block">{t("products.sorting")}</label>
              <div className="flex flex-wrap gap-2">
                {(["name", "currentStock", "salePriceUSD", "createdAt"] as SortField[]).map((field) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`px-4 py-2 rounded-full text-label-md font-bold transition-all active:scale-95 ${
                      sortField === field
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-slate-100 dark:bg-slate-800 text-on-surface-variant border border-outline-variant"
                    }`}
                  >
                    {field === "name" ? t("products.sortName") : field === "currentStock" ? t("products.sortStock") : field === "salePriceUSD" ? t("products.sortPrice") : t("products.sortDate")}
                    {sortField === field && (sortDir === "asc" ? " ↑" : " ↓")}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-stack-sm block">{t("products.category")}</label>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-label-md font-bold">Aletler</span>
                <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-full text-label-md border border-outline-variant">Hırdavat</span>
                <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-full text-label-md border border-outline-variant">Elektrik</span>
              </div>
            </div>

            {/* Marka */}
            <div>
              <label className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-stack-sm block">{t("products.brand")}</label>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-full text-label-md border border-outline-variant">Ölmez Endüstriyel</span>
                <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-full text-label-md border border-outline-variant">SafeTech</span>
              </div>
            </div>

            {/* Stok Durumu */}
            <div>
              <label className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-stack-sm block">{t("products.stockStatus")}</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between p-3 border border-outline-variant rounded-xl h-touch-min active:bg-slate-50 dark:active:bg-slate-800">
                  <span className="text-body-md text-on-surface">{t("products.inStockOnly")}</span>
                  <input className="w-6 h-6 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
                </label>
                <label className="flex items-center justify-between p-3 border border-outline-variant rounded-xl h-touch-min active:bg-slate-50 dark:active:bg-slate-800">
                  <span className="text-body-md text-on-surface">{t("products.outOfStock")}</span>
                  <input className="w-6 h-6 rounded border-outline text-primary focus:ring-primary" type="checkbox" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Bottom Sheet */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300"
        style={{ opacity: detailOpen ? 1 : 0, pointerEvents: detailOpen ? "auto" : "none" }}
        onClick={() => setDetailOpen(false)}
      />
      <div
        className={`fixed bottom-0 left-0 w-full z-[70] bg-white dark:bg-surface-dim rounded-t-2xl shadow-2xl bottom-sheet-transition touch-none max-h-[85vh] overflow-y-auto ${
          detailOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full flex justify-center py-3 cursor-grab" onClick={() => setDetailOpen(false)}>
          <div className="w-12 h-1.5 bg-outline-variant rounded-full"></div>
        </div>
        {selectedProduct && (
          <div className="flex flex-col gap-stack-lg px-container-margin-mobile pb-12">
            {/* Ürün resmi (full-width aspect-square) */}
            <div className="w-full aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-700 shadow-sm">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <span className="material-symbols-outlined text-6xl" data-icon="inventory_2">inventory_2</span>
                </div>
              )}
            </div>

            {/* Ürün bilgileri */}
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-headline-md font-bold text-on-surface">{selectedProduct.name}</h2>
                  <p className="text-body-md font-mono-data text-on-surface-variant">SKU: {selectedProduct.sku}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(selectedProduct); setFormOpen(true); setDetailOpen(false); }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant" data-icon="edit">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(selectedProduct); setDetailOpen(false); }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-error" data-icon="delete">delete</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-primary">{fmt(selectedProduct.salePriceUSD)}</span>
                  {selectedProduct.totalValueTRY && (
                    <span className="text-body-md text-on-surface-variant">{fmtTL(selectedProduct.totalValueTRY)}</span>
                  )}
                </div>
                <div className={`px-4 py-2 rounded-xl flex flex-col items-center ${
                  selectedProduct.currentStock <= selectedProduct.minStockLevel
                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300"
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                }`}>
                  <span className="text-label-sm font-bold">
                    {selectedProduct.currentStock <= selectedProduct.minStockLevel ? "Düşük Stok" : "Stokta Var"}
                  </span>
                  <span className="text-headline-sm">{selectedProduct.currentStock} {selectedProduct.unit || t("products.unit")}</span>
                </div>
              </div>
            </div>

            {/* Ürün Detayları card */}
            <div className="p-4 bg-white dark:bg-surface-dim border border-outline-variant rounded-2xl shadow-sm">
              <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{t("products.details")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-label-sm text-on-surface-variant">{t("products.category")}</span>
                  <span className="text-body-md font-medium text-on-surface">{selectedProduct.category || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-on-surface-variant">{t("products.barcode")}</span>
                  <span className="text-body-md font-medium font-mono-data text-on-surface">{selectedProduct.barcode || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-on-surface-variant">{t("products.purchasePrice")}</span>
                  <span className="text-body-md font-medium text-on-surface">{fmt(selectedProduct.purchasePriceUSD)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-on-surface-variant">{t("products.profitPerUnit")}</span>
                  <span className="text-body-md font-medium text-emerald-600">
                    +{fmt(selectedProduct.salePriceUSD - selectedProduct.purchasePriceUSD)}
                  </span>
                </div>
              </div>
            </div>

            {/* Depo Konumu card */}
            <div className="p-4 bg-white dark:bg-surface-dim border border-outline-variant rounded-2xl shadow-sm">
              <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{t("products.warehouseLocation")}</h3>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" data-icon="location_on">location_on</span>
                <div>
                  <p className="text-body-md font-medium text-on-surface">{t("products.location")}</p>
                  <p className="text-body-sm text-on-surface-variant">{t("products.locationDesc")}</p>
                </div>
              </div>
            </div>

            {/* Hızlı aksiyonlar */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { window.location.href = "/stock/in"; }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-3xl" data-icon="add_circle">add_circle</span>
                <span className="font-bold text-label-md">{t("products.stockEntry")}</span>
              </button>
              <button
                onClick={() => { window.location.href = "/stock/out"; }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-3xl" data-icon="remove_circle">remove_circle</span>
                <span className="font-bold text-label-md">{t("products.stockExit")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Result Modal */}
      {showImportResult && importStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowImportResult(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-surface-dim rounded-2xl border border-outline-variant shadow-xl animate-scale-in max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">{t("products.importResult")}</h3>
              <button onClick={() => setShowImportResult(false)}
                className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-600">{importStats.created}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{t("products.created")}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">{importStats.updated}</p>
                  <p className="text-xs text-blue-600 mt-0.5">{t("products.updated")}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{importStats.errors}</p>
                  <p className="text-xs text-red-600 mt-0.5">{t("common.error")}</p>
                </div>
              </div>
              {importResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs bg-surface-container-low dark:bg-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          r.status === "created" ? "bg-emerald-100 text-emerald-600" :
                          r.status === "updated" ? "bg-blue-100 text-blue-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {r.status === "created" ? "+" : r.status === "updated" ? "↵" : "!"}
                        </span>
                        <span className="text-on-surface truncate">{r.name}</span>
                      </div>
                      {r.error && <span className="text-error ml-2 shrink-0">{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end">
              <button onClick={() => setShowImportResult(false)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md transition active:scale-95">{t("products.close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB - Yeni Ürün Ekle (matches HTML design: bottom-28 right-6) */}
      <div className="fixed bottom-28 right-6 z-50">
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform duration-200 hover:shadow-primary/40"
        >
          <span className="material-symbols-outlined text-3xl" data-icon="add">add</span>
        </button>
      </div>

      <ProductFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={editing ? handleEdit : handleAdd}
        product={editing}
        loading={formLoading}
      />
      <DeleteConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        productName={deleting?.name || ""}
        loading={deleteLoading}
      />
    </div>
  );
}
