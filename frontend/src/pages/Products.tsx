import React, { useEffect, useState, useCallback, useRef } from "react";
import { productService } from "../services/api";
import ProductFormModal from "../components/ProductFormModal";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import type { Product, ProductFormData } from "../types";
import toast from "react-hot-toast";

type SortField = "name" | "currentStock" | "salePriceUSD" | "createdAt";

export default function Products() {
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
      setError(err instanceof Error ? err.message : "Yüklenemedi");
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
      toast.success("Eklendi");
      setFormOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata");
    } finally { setFormLoading(false); }
  };

  const handleEdit = async (data: ProductFormData) => {
    if (!editing) return;
    setFormLoading(true);
    try {
      await productService.update(editing.id, data);
      toast.success("Güncellendi");
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
      toast.success("Silindi");
      setDeleting(null);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata");
    } finally { setDeleteLoading(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-300 dark:text-slate-600 ml-1 text-xs">↕</span>;
    return <span className="text-blue-500 dark:text-blue-400 ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const fmt = (v: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD" }).format(v);

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ürünler</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {products.length} kayıt {lowStockCount > 0 && <>• <span className="text-red-500 dark:text-red-400">{lowStockCount} kritik</span></>}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition shadow-sm active:scale-95">
          + Yeni
        </button>
      </div>

      {/* Arama */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input ref={searchInputRef} type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Ürün ara... (⌘K)"
          className="w-full pl-8 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition" />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none">
          <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono">⌘K</kbd>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Tablo */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            {search ? "Eşleşen ürün yok" : "Henüz ürün yok"}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {/* Header */}
            <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 dark:text-slate-400">
              <button onClick={() => toggleSort("name")} className="flex-1 text-left hover:text-slate-700 dark:hover:text-slate-300">Ürün <SortIcon field="name" /></button>
              <div className="w-24 text-left">Kategori</div>
              <button onClick={() => toggleSort("currentStock")} className="w-16 text-right hover:text-slate-700 dark:hover:text-slate-300">Stok <SortIcon field="currentStock" /></button>
              <button onClick={() => toggleSort("salePriceUSD")} className="w-24 text-right hover:text-slate-700 dark:hover:text-slate-300">Satış <SortIcon field="salePriceUSD" /></button>
              <div className="w-20 text-right">Kâr</div>
              <div className="w-16" />
            </div>

            {products.map((p) => {
              const critical = p.currentStock <= p.minStockLevel;
              const profit = p.salePriceUSD - p.purchasePriceUSD;
              return (
                <div key={p.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  {/* Desktop */}
                  <div className="hidden md:flex items-center">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">{p.sku}</span>
                    </div>
                    <div className="w-24 text-sm text-slate-600 dark:text-slate-400">{p.category || "—"}</div>
                    <div className="w-16 text-right">
                      <span className={`text-sm font-medium ${critical ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{p.currentStock}</span>
                      {critical && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" />}
                    </div>
                    <div className="w-24 text-right text-sm text-slate-700 dark:text-slate-300">{fmt(p.salePriceUSD)}</div>
                    <div className={`w-20 text-right text-xs font-medium ${profit >= 0 ? "text-green-500 dark:text-green-400" : "text-red-400 dark:text-red-400"}`}>{fmt(profit)}</div>
                    <div className="w-16 flex justify-end gap-1">
                      <button onClick={() => { setEditing(p); setFormOpen(true); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition" title="Düzenle">✏️</button>
                      <button onClick={() => setDeleting(p)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition" title="Sil">🗑️</button>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 font-mono">{p.sku}</span>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button onClick={() => { setEditing(p); setFormOpen(true); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition">✏️</button>
                        <button onClick={() => setDeleting(p)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition">🗑️</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{p.category || "—"}</span>
                      <span className={`font-medium ${critical ? "text-red-500 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>{p.currentStock} stok</span>
                      <span className="text-slate-600 dark:text-slate-300">{fmt(p.salePriceUSD)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 text-xs">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition">←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)}
              className={`w-7 h-7 rounded transition ${n === page ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{n}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition">→</button>
        </div>
      )}

      <ProductFormModal isOpen={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} product={editing} loading={formLoading} />
      <DeleteConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} productName={deleting?.name || ""} loading={deleteLoading} />
    </div>
  );
}
