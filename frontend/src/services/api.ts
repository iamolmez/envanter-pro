import axios, { AxiosError } from "axios";
import type {
  ApiResponse,
  Product,
  ProductFormData,
  StockMovement,
  StockMovementFormData,
  ExchangeRate,
  Settings,
  DashboardSummary,
  BatchItem,
  BatchResponse,
  PaginatedResponse,
} from "../types";

// Development'da Vite proxy, production'da Render URL'si
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== HATA YÖNETİMİ ====================
export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string } }>) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Sunucuya bağlanılamadı";
    const statusCode = error.response?.status || 500;
    return Promise.reject(new ApiError(message, statusCode));
  }
);

// ==================== ÜRÜN SERVİSLERİ ====================
export const productService = {
  async getAll(params?: {
    search?: string;
    category?: string;
    isActive?: string;
    lowStock?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Product>>>(
      "/products",
      { params }
    );
    return response.data.data;
  },

  async getById(id: number): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data;
  },

  async create(data: ProductFormData): Promise<Product> {
    const response = await api.post<ApiResponse<Product>>("/products", data);
    return response.data.data;
  },

  async update(id: number, data: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put<ApiResponse<Product>>(
      `/products/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async batchCreate(items: BatchItem[]): Promise<BatchResponse> {
    const response = await api.post<ApiResponse<BatchResponse>>(
      "/products/batch",
      { items }
    );
    return response.data.data;
  },

  async getLowStock(): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(
      "/products/low-stock"
    );
    return response.data.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<ApiResponse<string[]>>(
      "/products/categories"
    );
    return response.data.data;
  },
};

// ==================== STOK HAREKET SERVİSLERİ ====================
export const stockMovementService = {
  async getAll(params?: {
    productId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortOrder?: string;
  }): Promise<PaginatedResponse<StockMovement>> {
    const response = await api.get<
      ApiResponse<PaginatedResponse<StockMovement>>
    >("/stock-movements", { params });
    return response.data.data;
  },

  async stockIn(data: StockMovementFormData): Promise<StockMovement> {
    const response = await api.post<ApiResponse<StockMovement>>(
      "/stock-movements/in",
      data
    );
    return response.data.data;
  },

  async stockOut(data: StockMovementFormData): Promise<StockMovement> {
    const response = await api.post<ApiResponse<StockMovement>>(
      "/stock-movements/out",
      data
    );
    return response.data.data;
  },

  async barcodeOut(data: {
    barcode: string;
    quantity?: number;
    note?: string;
    referenceNo?: string;
  }): Promise<StockMovement> {
    const response = await api.post<ApiResponse<StockMovement>>(
      "/stock-movements/barcode-out",
      data
    );
    return response.data.data;
  },

  async getSummary(): Promise<DashboardSummary> {
    const response = await api.get<ApiResponse<DashboardSummary>>(
      "/stock-movements/summary"
    );
    return response.data.data;
  },

  async getRecent(): Promise<StockMovement[]> {
    const response = await api.get<ApiResponse<StockMovement[]>>(
      "/stock-movements/recent"
    );
    return response.data.data;
  },
};

// ==================== DÖVİZ KURU SERVİSLERİ ====================
export const exchangeRateService = {
  async getCurrent(): Promise<ExchangeRate> {
    const response = await api.get<ApiResponse<ExchangeRate>>(
      "/exchange-rates/current"
    );
    return response.data.data;
  },

  async fetchLive(): Promise<ExchangeRate> {
    const response = await api.post<ApiResponse<ExchangeRate>>(
      "/exchange-rates/fetch"
    );
    return response.data.data;
  },

  async getHistory(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ExchangeRate[]> {
    const response = await api.get<ApiResponse<ExchangeRate[]>>(
      "/exchange-rates/history",
      { params }
    );
    return response.data.data;
  },

  async setManual(rate: number, date?: string): Promise<ExchangeRate> {
    const response = await api.post<ApiResponse<ExchangeRate>>(
      "/exchange-rates",
      { rate, date }
    );
    return response.data.data;
  },
};

// ==================== SİSTEM AYAR SERVİSLERİ ====================
export const settingsService = {
  async getAll(): Promise<Settings> {
    const response = await api.get<ApiResponse<Settings>>("/settings");
    return response.data.data;
  },

  async getByKey(key: string): Promise<{ key: string; value: string }> {
    const response = await api.get<
      ApiResponse<{ key: string; value: string }>
    >(`/settings/${key}`);
    return response.data.data;
  },

  async update(
    key: string,
    value: string,
    group?: string
  ): Promise<{ key: string; value: string }> {
    const response = await api.put<
      ApiResponse<{ key: string; value: string }>
    >(`/settings/${key}`, { value, group });
    return response.data.data;
  },
};

export default api;
