import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import type { Product, ProductFormData } from "../types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  product?: Product | null;
  loading?: boolean;
}

const emptyForm: ProductFormData = {
  name: "",
  barcode: "",
  category: "",
  purchasePriceUSD: 0,
  salePriceUSD: 0,
  currentStock: 0,
  minStockLevel: 5,
};

export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading = false,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        barcode: product.barcode || "",
        category: product.category || "",
        purchasePriceUSD: product.purchasePriceUSD,
        salePriceUSD: product.salePriceUSD,
        currentStock: product.currentStock,
        minStockLevel: product.minStockLevel,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [product, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Ürün adı gerekli";
    if ((form.currentStock ?? 0) < 0) newErrors.currentStock = "Negatif olamaz";
    if ((form.minStockLevel ?? 0) < 0) newErrors.minStockLevel = "Negatif olamaz";
    if (!isEditing && form.salePriceUSD <= form.purchasePriceUSD)
      newErrors.salePriceUSD = "Satış, alıştan büyük olmalı";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      ...form,
      barcode: form.barcode?.trim() || undefined,
      category: form.category?.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Ürün Düzenle" : "Yeni Ürün"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Adı <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ürün adı"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${
              errors.name ? "border-red-300 bg-red-50" : "border-slate-200"
            } focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Barkod / SKU
            </label>
            <input
              type="text"
              name="barcode"
              value={form.barcode || ""}
              onChange={handleChange}
              placeholder="Boş = otomatik"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Kategori
            </label>
            <input
              type="text"
              name="category"
              value={form.category || ""}
              onChange={handleChange}
              placeholder="Örn: Elektronik"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Alış ($)
            </label>
            <input
              type="number"
              name="purchasePriceUSD"
              value={form.purchasePriceUSD}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Satış ($)
            </label>
            <input
              type="number"
              name="salePriceUSD"
              value={form.salePriceUSD}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                errors.salePriceUSD ? "border-red-300 bg-red-50" : "border-slate-200"
              } focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition`}
            />
            {errors.salePriceUSD && (
              <p className="text-xs text-red-500 mt-0.5">{errors.salePriceUSD}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Stok
            </label>
            <input
              type="number"
              name="currentStock"
              value={form.currentStock}
              onChange={handleChange}
              min="0"
              disabled={isEditing}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                errors.currentStock ? "border-red-300 bg-red-50" : "border-slate-200"
              } focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition ${
                isEditing ? "bg-slate-50 text-slate-400" : ""
              }`}
            />
            {errors.currentStock && (
              <p className="text-xs text-red-500 mt-0.5">{errors.currentStock}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Min. Stok
            </label>
            <input
              type="number"
              name="minStockLevel"
              value={form.minStockLevel}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isEditing ? "Kaydet" : "Ekle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
