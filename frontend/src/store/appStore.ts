import { create } from "zustand";
import type {
  Product,
  StockMovement,
  DashboardSummary,
  ExchangeRate,
} from "../types";
import { productService, stockMovementService, exchangeRateService } from "../services/api";

// ==================== SİDEBAR DURUMU ====================
interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setMobile: (mobile: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  isMobile: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setMobile: (mobile) =>
    set({ isMobile: mobile, isOpen: mobile ? false : true }),
}));

// ==================== ÜRÜN DURUMU ====================
interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  fetchProducts: (params?: {
    search?: string;
    category?: string;
    lowStock?: string;
  }) => Promise<void>;
  fetchProduct: (id: number) => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  selectedProduct: null,
  loading: false,
  error: null,

  fetchProducts: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await productService.getAll({
        ...params,
        limit: 100,
      });
      set({ products: response.products, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ürünler yüklenemedi";
      set({ error: message, loading: false });
    }
  },

  fetchProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      const product = await productService.getById(id);
      set({ selectedProduct: product, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ürün yüklenemedi";
      set({ error: message, loading: false });
    }
  },

  setSelectedProduct: (product) => set({ selectedProduct: product }),
}));

// ==================== STOK HAREKET DURUMU ====================
interface StockState {
  recentMovements: StockMovement[];
  loading: boolean;
  error: string | null;
  fetchRecent: () => Promise<void>;
}

export const useStockStore = create<StockState>((set) => ({
  recentMovements: [],
  loading: false,
  error: null,

  fetchRecent: async () => {
    set({ loading: true, error: null });
    try {
      const movements = await stockMovementService.getRecent();
      set({ recentMovements: movements, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Hareketler yüklenemedi";
      set({ error: message, loading: false });
    }
  },
}));

// ==================== DASHBOARD DURUMU ====================
interface DashboardState {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  fetchSummary: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  loading: false,
  error: null,

  fetchSummary: async () => {
    set({ loading: true, error: null });
    try {
      const summary = await stockMovementService.getSummary();
      set({ summary, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Dashboard yüklenemedi";
      set({ error: message, loading: false });
    }
  },
}));

// ==================== DÖVİZ KURU DURUMU ====================
interface ExchangeRateState {
  currentRate: ExchangeRate | null;
  loading: boolean;
  error: string | null;
  fetchRate: () => Promise<void>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set) => ({
  currentRate: null,
  loading: false,
  error: null,

  fetchRate: async () => {
    set({ loading: true, error: null });
    try {
      const rate = await exchangeRateService.getCurrent();
      set({ currentRate: rate, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kur bilgisi alınamadı";
      set({ error: message, loading: false });
    }
  },
}));
