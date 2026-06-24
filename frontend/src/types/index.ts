// ==================== ÜRÜN TİPLERİ ====================
export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string;
  purchasePriceUSD: number;
  salePriceUSD: number;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockMovements?: StockMovement[];
  // Hesaplanan alanlar
  currentExchangeRate?: number;
  totalValueUSD?: number;
  totalValueTRY?: number;
  potentialProfitUSD?: number;
  potentialProfitTRY?: number;
  isLowStock?: boolean;
}

export interface ProductFormData {
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  purchasePriceUSD: number;
  salePriceUSD: number;
  currentStock?: number;
  minStockLevel?: number;
  unit?: string;
  imageUrl?: string | null;
}

// ==================== STOK HAREKET TİPLERİ ====================
export interface StockMovement {
  id: number;
  productId: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unitPriceUSD: number | null;
  exchangeRateTRY: number | null;
  totalPriceUSD: number | null;
  totalPriceTRY: number | null;
  note: string | null;
  referenceNo: string | null;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
  };
}

export interface StockMovementFormData {
  productId: number;
  quantity: number;
  unitPriceUSD?: number;
  note?: string;
  referenceNo?: string;
}

// ==================== DÖVİZ KURU TİPLERİ ====================
export interface ExchangeRate {
  id: number;
  rate: number;
  date: string;
  source: "api" | "manual" | "cached";
  createdAt: string;
}

// ==================== SİSTEM AYAR TİPLERİ ====================
export interface Settings {
  all: Array<{
    id: number;
    key: string;
    value: string;
    group: string;
  }>;
  grouped: Record<string, Array<{ key: string; value: string }>>;
}

// ==================== BARKOD LOOKUP TİPLERİ ====================
export interface BarcodeLookupResult {
  found: boolean;
  source?: "local" | "openfoodfacts" | "upcitemdb";
  barcode: string;
  productName?: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    category: string;
    purchasePriceUSD: number;
    salePriceUSD: number;
    currentStock: number;
    unit: string;
  };
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  quantity?: string;
}

// ==================== API YANIT TİPLERİ ====================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  products: T[];
  movements?: T[];
}

// ==================== DASHBOARD TİPLERİ ====================
export interface DashboardSummary {
  totalProducts: number;
  totalStockQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryCostUSD: number;
  totalInventoryValueUSD: number;
  totalInventoryValueTRY: number;
  totalPotentialProfitUSD: number;
  totalPotentialProfitTRY: number;
  monthlyRevenueUSD: number;
  monthlyRevenueTRY: number;
  currentExchangeRate: number;
  exchangeRateDate: string;
  exchangeRateSource: string;
}

// ==================== BATCH İŞLEM TİPLERİ ====================
export interface BatchItem {
  barcode?: string;
  name?: string;
  purchasePriceUSD?: number;
  salePriceUSD?: number;
  quantity?: number;
}

export interface BatchResult {
  barcode: string;
  status: "created" | "updated" | "error";
  product?: Product;
  error?: string;
}

export interface BatchResponse {
  results: BatchResult[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}
