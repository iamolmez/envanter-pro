import React, { useState, useEffect, useRef } from "react";
import type { Product, ProductFormData } from "../types";
import { productService } from "../services/api";
import toast from "react-hot-toast";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setImageUrl(product.imageUrl || null);
    } else {
      setForm(emptyForm);
      setImageUrl(null);
    }
    setErrors({});
  }, [product, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      imageUrl: imageUrl || undefined,
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Resim boyutu 2MB'ı geçemez");
      return;
    }

    setImageUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setImageUrl(base64);

      if (product?.id) {
        await productService.uploadImage(product.id, base64);
        toast.success("Resim yüklendi");
      }
    } catch {
      toast.error("Resim yüklenemedi");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImageSelect(fakeEvent);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-surface dark:bg-surface-dim rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Handle (mobile) */}
        <div className="sm:hidden w-full flex justify-center py-3">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-container-margin-mobile pb-2">
          <div className="flex items-center gap-stack-sm">
            <span className="material-symbols-outlined text-primary" data-icon="inventory_2">inventory_2</span>
            <h2 className="text-headline-sm font-headline-sm font-bold text-primary">
              {isEditing ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-touch-min h-touch-min flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined" data-icon="close">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-stack-lg px-container-margin-mobile pb-6">
            {/* Fotoğraf Ekle */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest relative overflow-hidden cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Ürün resmi" className="w-full h-40 object-contain rounded-xl" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImageUrl(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center text-xs transition-all"
                    title="Resmi Kaldır">✕</button>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-outline mb-2" data-icon="add_a_photo">add_a_photo</span>
                  <span className="text-label-md text-on-surface-variant">Ürün Fotoğrafı Ekle</span>
                </>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

            {/* Fotoğraf butonları */}
            {!imageUrl && (
              <div className="flex gap-2 -mt-3 justify-center">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container-low transition active:scale-95 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]" data-icon="upload">upload</span>
                  Dosya Seç
                </button>
                <button type="button" onClick={handleCameraCapture}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container-low transition active:scale-95 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]" data-icon="photo_camera">photo_camera</span>
                  Kamera
                </button>
              </div>
            )}

            {/* Ürün Adı */}
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">
                Ürün Adı <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Örn: Pro-Drill 500X"
                className={`w-full h-touch-min px-4 rounded-xl border ${
                  errors.name
                    ? "border-error bg-error-container/10"
                    : "border-outline-variant"
                } focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface placeholder-on-surface-variant text-body-md outline-none transition`}
              />
              {errors.name && <p className="text-label-sm text-error mt-1">{errors.name}</p>}
            </div>

            {/* SKU / Barkod */}
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">SKU / Barkod</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="barcode"
                  value={form.barcode || ""}
                  onChange={handleChange}
                  placeholder="Barkod girin veya tarayın"
                  className="flex-1 h-touch-min px-4 rounded-xl border border-outline-variant focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface placeholder-on-surface-variant text-body-md outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => window.location.href = "/barcode"}
                  className="h-touch-min px-4 bg-secondary-container text-on-secondary-container rounded-xl flex items-center gap-2 font-bold active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]" data-icon="qr_code_scanner">qr_code_scanner</span>
                  <span className="text-label-sm">Tara</span>
                </button>
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Kategori</label>
              <select
                name="category"
                value={form.category || ""}
                onChange={handleChange}
                className="w-full h-touch-min px-4 rounded-xl border border-outline-variant focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface text-body-md outline-none transition"
              >
                <option value="">Kategori seçin</option>
                <option value="Aletler">Aletler</option>
                <option value="Hırdavat">Hırdavat</option>
                <option value="Elektrik">Elektrik</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            {/* Stok + Fiyat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">
                  {isEditing ? "Mevcut Stok" : "Başlangıç Stoğu"}
                </label>
                <input
                  type="number"
                  name="currentStock"
                  value={form.currentStock}
                  onChange={handleChange}
                  min="0"
                  disabled={isEditing}
                  placeholder="0"
                  className={`w-full h-touch-min px-4 rounded-xl border border-outline-variant focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface text-body-md outline-none transition ${
                    isEditing ? "opacity-60" : ""
                  }`}
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Birim Fiyat (USD)</label>
                <input
                  type="number"
                  name="salePriceUSD"
                  value={form.salePriceUSD}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full h-touch-min px-4 rounded-xl border ${
                    errors.salePriceUSD
                      ? "border-error bg-error-container/10"
                      : "border-outline-variant"
                  } focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface text-body-md outline-none transition`}
                />
                {errors.salePriceUSD && <p className="text-label-sm text-error mt-1">{errors.salePriceUSD}</p>}
              </div>
            </div>

            {/* Alış Fiyatı + Min Stok (only in edit mode or always) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Alış Fiyatı (USD)</label>
                <input
                  type="number"
                  name="purchasePriceUSD"
                  value={form.purchasePriceUSD}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full h-touch-min px-4 rounded-xl border border-outline-variant focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface text-body-md outline-none transition"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Min. Stok Seviyesi</label>
                <input
                  type="number"
                  name="minStockLevel"
                  value={form.minStockLevel}
                  onChange={handleChange}
                  min="0"
                  placeholder="5"
                  className="w-full h-touch-min px-4 rounded-xl border border-outline-variant focus:ring-primary focus:border-primary bg-white dark:bg-surface-dim text-on-surface text-body-md outline-none transition"
                />
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-touch-min bg-primary text-on-primary rounded-xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isEditing ? "Değişiklikleri Kaydet" : "Ürünü Kaydet"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full h-touch-min bg-surface-container-high text-on-surface-variant rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
