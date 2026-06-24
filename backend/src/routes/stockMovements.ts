import { Router, Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { AppError } from "../middleware/errorHandler";
import { getCurrentExchangeRate } from "../services/exchangeRateService";

const router = Router();

// ==================== STOK HAREKET İŞLEMLERİ ====================

// GET /api/stock-movements - Tüm stok hareketlerini getir
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      page,
      limit,
      sortOrder,
    } = req.query;

    const where: Record<string, unknown> = {};

    if (productId) {
      where.productId = parseInt(productId as string);
    }
    if (type && typeof type === "string") {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && typeof startDate === "string") {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate && typeof endDate === "string") {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 50;
    const skip = (pageNumber - 1) * pageSize;
    const orderDirection = sortOrder === "asc" ? "asc" : "desc";

    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
        where: where as any,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
            },
          },
        },
        orderBy: { createdAt: orderDirection },
        skip,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where: where as any }),
    ]);

    res.json({
      success: true,
      data: {
        movements,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/stock-movements/in - Stok girişi (IN)
router.post(
  "/in",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, quantity, unitPriceUSD, note, referenceNo } = req.body;

      if (!productId) {
        throw new AppError("Ürün ID'si zorunludur", 400);
      }
      if (!quantity || quantity <= 0) {
        throw new AppError("Geçerli bir miktar giriniz", 400);
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
      });
      if (!product) {
        throw new AppError("Ürün bulunamadı", 404);
      }

      const currentRate = await getCurrentExchangeRate();
      const unitPrice = unitPriceUSD || product.purchasePriceUSD;
      const totalPriceUSD = quantity * unitPrice;
      const totalPriceTRY = totalPriceUSD * currentRate.rate;

      // Stok hareketini oluştur
      const movement = await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity,
          unitPriceUSD: unitPrice,
          exchangeRateTRY: currentRate.rate,
          totalPriceUSD,
          totalPriceTRY,
          note: note?.trim() || null,
          referenceNo: referenceNo?.trim() || null,
        },
      });

      // Ürün stoğunu güncelle
      await prisma.product.update({
        where: { id: product.id },
        data: {
          currentStock: product.currentStock + quantity,
        },
      });

      res.status(201).json({
        success: true,
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/stock-movements/out - Stok çıkışı (OUT - satış/sarf)
router.post(
  "/out",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, quantity, unitPriceUSD, note, referenceNo } = req.body;

      if (!productId) {
        throw new AppError("Ürün ID'si zorunludur", 400);
      }
      if (!quantity || quantity <= 0) {
        throw new AppError("Geçerli bir miktar giriniz", 400);
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
      });
      if (!product) {
        throw new AppError("Ürün bulunamadı", 404);
      }

      // Stok yeterli mi kontrol et
      if (product.currentStock < quantity) {
        throw new AppError(
          `Yetersiz stok! Mevcut: ${product.currentStock}, İstenen: ${quantity}`,
          400
        );
      }

      const currentRate = await getCurrentExchangeRate();
      const unitPrice = unitPriceUSD || product.salePriceUSD;
      const totalPriceUSD = quantity * unitPrice;
      const totalPriceTRY = totalPriceUSD * currentRate.rate;

      // Stok hareketini oluştur
      const movement = await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "OUT",
          quantity: -quantity, // Çıkış negatif olarak kaydedilir
          unitPriceUSD: unitPrice,
          exchangeRateTRY: currentRate.rate,
          totalPriceUSD,
          totalPriceTRY,
          note: note?.trim() || null,
          referenceNo: referenceNo?.trim() || null,
        },
      });

      // Ürün stoğunu düş
      await prisma.product.update({
        where: { id: product.id },
        data: {
          currentStock: product.currentStock - quantity,
        },
      });

      res.status(201).json({
        success: true,
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/stock-movements/barcode-out - Barkodla stoktan çıkarma
router.post(
  "/barcode-out",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { barcode, quantity, note, referenceNo } = req.body;

      if (!barcode) {
        throw new AppError("Barkod zorunludur", 400);
      }

      const product = await prisma.product.findUnique({
        where: { barcode },
      });
      if (!product) {
        throw new AppError("Bu barkoda sahip ürün bulunamadı", 404);
      }
      if (!product.isActive) {
        throw new AppError("Bu ürün pasif durumda", 400);
      }

      const qty = quantity || 1;

      if (product.currentStock < qty) {
        throw new AppError(
          `Yetersiz stok! "${product.name}" - Mevcut: ${product.currentStock}, İstenen: ${qty}`,
          400
        );
      }

      const currentRate = await getCurrentExchangeRate();
      const totalPriceUSD = qty * product.salePriceUSD;
      const totalPriceTRY = totalPriceUSD * currentRate.rate;

      const movement = await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "OUT",
          quantity: -qty,
          unitPriceUSD: product.salePriceUSD,
          exchangeRateTRY: currentRate.rate,
          totalPriceUSD,
          totalPriceTRY,
          note: note?.trim() || "Barkod okuyucu ile satış",
          referenceNo: referenceNo?.trim() || null,
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: {
          currentStock: product.currentStock - qty,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          movement,
          product: {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            remainingStock: product.currentStock - qty,
            salePriceUSD: product.salePriceUSD,
            totalPriceUSD,
            totalPriceTRY,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/stock-movements/summary - Stok özeti (dashboard için)
router.get(
  "/summary",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const currentRate = await getCurrentExchangeRate();

      // Toplam ürün sayısı ve stok değerleri
      const products = await prisma.product.findMany({
        where: { isActive: true },
      });

      const totalProducts = products.length;
      const totalStockQuantity = products.reduce(
        (sum, p) => sum + p.currentStock,
        0
      );
      const lowStockCount = products.filter(
        (p) => p.currentStock <= p.minStockLevel
      ).length;
      const outOfStockCount = products.filter(
        (p) => p.currentStock === 0
      ).length;

      // Finansal hesaplamalar
      let totalInventoryCostUSD = 0;
      let totalInventoryValueUSD = 0;
      let totalPotentialProfitUSD = 0;

      for (const product of products) {
        const costUSD = product.currentStock * product.purchasePriceUSD;
        const valueUSD = product.currentStock * product.salePriceUSD;
        totalInventoryCostUSD += costUSD;
        totalInventoryValueUSD += valueUSD;
        totalPotentialProfitUSD += valueUSD - costUSD;
      }

      const totalInventoryValueTRY = totalInventoryValueUSD * currentRate.rate;
      const totalProfitTRY = totalPotentialProfitUSD * currentRate.rate;

      // Bu ayki gelir (OUT hareketleri)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyOutMovements = await prisma.stockMovement.findMany({
        where: {
          type: "OUT",
          createdAt: { gte: startOfMonth },
        },
      });
      const monthlyRevenueUSD = monthlyOutMovements.reduce(
        (sum, m) => sum + (m.totalPriceUSD || 0),
        0
      );

      res.json({
        success: true,
        data: {
          totalProducts,
          lowStockCount,
          outOfStockCount,
          totalStockQuantity,
          totalInventoryCostUSD,
          totalInventoryValueUSD,
          totalInventoryValueTRY,
          totalPotentialProfitUSD,
          totalPotentialProfitTRY: totalProfitTRY,
          monthlyRevenueUSD,
          monthlyRevenueTRY: monthlyRevenueUSD * currentRate.rate,
          currentExchangeRate: currentRate.rate,
          exchangeRateDate: currentRate.date,
          exchangeRateSource: currentRate.source,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/stock-movements/recent - Son 20 hareket
router.get(
  "/recent",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const movements = await prisma.stockMovement.findMany({
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      res.json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
