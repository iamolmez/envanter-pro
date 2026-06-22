import { Router, Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { AppError } from "../middleware/errorHandler";
import { getCurrentExchangeRate } from "../services/exchangeRateService";

const router = Router();

// Güvenli sıralama alanları whitelist'i (SQL injection önlemi)
const ALLOWED_SORT_FIELDS = [
  "name", "sku", "barcode", "category",
  "purchasePriceUSD", "salePriceUSD",
  "currentStock", "minStockLevel",
  "createdAt", "updatedAt", "id",
];

// ==================== ÜRÜN CRUD İŞLEMLERİ ====================

// GET /api/products - Tüm ürünleri listele (filtreleme ve arama ile)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      category,
      isActive,
      lowStock,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const where: Record<string, unknown> = {};

    // Arama filtresi (barkod, SKU veya ürün adına göre)
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    // Kategori filtresi
    if (category && typeof category === "string") {
      where.category = category;
    }

    // Aktif/Pasif filtresi (varsayılan: sadece aktif ürünler)
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    } else {
      // Kullanıcı özellikle istemediği sürece pasif ürünleri gösterme
      where.isActive = true;
    }

    // Sıralama - SQL injection koruması: sadece whitelist'teki alanlara izin ver
    const rawSortField = (sortBy as string) || "name";
    const orderByField = ALLOWED_SORT_FIELDS.includes(rawSortField)
      ? rawSortField
      : "name";
    const orderByDirection = sortOrder === "desc" ? "desc" : "asc";

    // Sayfalama
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 50;
    const skip = (pageNumber - 1) * pageSize;

    let products;
    let totalCount: number;

    if (lowStock === "true") {
      // Kritik stoktaki ürünleri getir - parametreize güvenli sorgu
      const searchTerm = search && typeof search === "string" ? search : null;
      const isActiveFilter = isActive !== undefined ? (isActive === "true" ? 1 : 0) : null;
      const categoryFilter = category && typeof category === "string" ? category : null;

      // PostgreSQL uyumlu parametreize sorgu ($1, $2, ... formatı)
      let whereClause = 'WHERE "currentStock" <= "minStockLevel"';
      const params: Array<string | number | boolean> = [];

      if (isActiveFilter !== null) {
        whereClause += ` AND "isActive" = $${params.length + 1}`;
        params.push(isActiveFilter === 1);
      }

      if (searchTerm !== null) {
        whereClause += ` AND ("name" LIKE $${params.length + 1} OR "barcode" LIKE $${params.length + 2} OR "sku" LIKE $${params.length + 3})`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }

      if (categoryFilter !== null) {
        whereClause += ` AND "category" = $${params.length + 1}`;
        params.push(categoryFilter);
      }

      // orderByField whitelist'ten geldiği için güvenli
      const productRows = await prisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(
        `SELECT * FROM "Product" ${whereClause} ORDER BY "${orderByField}" ${orderByDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        ...params,
        pageSize,
        skip
      );
      products = productRows;

      const countRows = await prisma.$queryRawUnsafe<
        Array<{ count: number }>
      >(
        `SELECT COUNT(*)::int as "count" FROM "Product" ${whereClause}`,
        ...params
      );
      totalCount = Number(countRows[0]?.count) || 0;
    } else {
      // Normal sorgu (güvenli - Prisma ORM parametreize sorgu kullanır)
      [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: where as any,
          orderBy: { [orderByField]: orderByDirection },
          skip,
          take: pageSize,
        }),
        prisma.product.count({ where: where as any }),
      ]);
    }

    res.json({
      success: true,
      data: {
        products,
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

// GET /api/products/low-stock - Kritik stoktaki ürünler
router.get(
  "/low-stock",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Sabit SQL - hiçbir kullanıcı girdisi yok, güvenli
      const products = await prisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(
        'SELECT * FROM "Product" WHERE "currentStock" <= "minStockLevel" AND "isActive" = true ORDER BY "currentStock" ASC'
      );

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/products/categories - Tüm kategorileri listele
router.get(
  "/categories",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await prisma.product.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      res.json({
        success: true,
        data: categories.map((c) => c.category),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/products/:id - Tek ürün getir
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      throw new AppError("Geçersiz ürün ID'si", 400);
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product) {
      throw new AppError("Ürün bulunamadı", 404);
    }

    // TL cinsinden hesaplamalar
    const currentRate = await getCurrentExchangeRate();
    const totalValueUSD = product.currentStock * product.salePriceUSD;
    const totalValueTRY = totalValueUSD * currentRate.rate;
    const potentialProfitUSD =
      product.currentStock * (product.salePriceUSD - product.purchasePriceUSD);
    const potentialProfitTRY = potentialProfitUSD * currentRate.rate;

    res.json({
      success: true,
      data: {
        ...product,
        currentExchangeRate: currentRate.rate,
        totalValueUSD,
        totalValueTRY,
        potentialProfitUSD,
        potentialProfitTRY,
        isLowStock: product.currentStock <= product.minStockLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Yeni ürün oluştur
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      barcode,
      name,
      description,
      category,
      purchasePriceUSD,
      salePriceUSD,
      currentStock,
      minStockLevel,
      unit,
    } = req.body;

    // Zorunlu alan kontrolleri
    if (!name || name.trim() === "") {
      throw new AppError("Ürün adı zorunludur", 400);
    }
    if (purchasePriceUSD === undefined || purchasePriceUSD < 0) {
      throw new AppError("Geçerli bir alış fiyatı giriniz", 400);
    }
    if (salePriceUSD === undefined || salePriceUSD < 0) {
      throw new AppError("Geçerli bir satış fiyatı giriniz", 400);
    }

    // Barkod kontrolü (varsa benzersiz olmalı)
    if (barcode && barcode.trim() !== "") {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode },
      });
      if (existingBarcode) {
        throw new AppError("Bu barkod zaten kayıtlı", 409);
      }
    }

    // SKU oluşturma (barkod yoksa otomatik üret)
    let sku = "";
    if (barcode && barcode.trim() !== "") {
      sku = barcode;
    } else {
      // Otomatik SKU: CA-YYMMDDHHMMSS formatında (Category-YılAyGünSaatDakikaSaniye)
      const now = new Date();
      const dateStr =
        now.getFullYear().toString().slice(-2) +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        now.getDate().toString().padStart(2, "0") +
        now.getHours().toString().padStart(2, "0") +
        now.getMinutes().toString().padStart(2, "0") +
        now.getSeconds().toString().padStart(2, "0");
      const categoryPrefix = (category || "GEN").substring(0, 3).toUpperCase();
      sku = `${categoryPrefix}-${dateStr}`;
    }

    const product = await prisma.product.create({
      data: {
        sku,
        barcode: barcode?.trim() || null,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || "Genel",
        purchasePriceUSD: parseFloat(purchasePriceUSD),
        salePriceUSD: parseFloat(salePriceUSD),
        currentStock: parseInt(currentStock) || 0,
        minStockLevel: parseInt(minStockLevel) || 5,
        unit: unit || "Adet",
      },
    });

    // İlk stok girişi varsa stok hareketi oluştur
    if (product.currentStock > 0) {
      const currentRate = await getCurrentExchangeRate();
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: product.currentStock,
          unitPriceUSD: product.purchasePriceUSD,
          exchangeRateTRY: currentRate.rate,
          totalPriceUSD: product.currentStock * product.purchasePriceUSD,
          totalPriceTRY:
            product.currentStock * product.purchasePriceUSD * currentRate.rate,
          note: "İlk stok girişi",
        },
      });
    }

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/products/batch - Toplu ürün girişi (barkod okutma ile)
router.post(
  "/batch",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError("En az bir ürün girmelisiniz", 400);
      }

      const currentRate = await getCurrentExchangeRate();
      const results: Array<{
        barcode: string;
        status: "created" | "updated" | "error";
        product?: unknown;
        error?: string;
      }> = [];

      // İşlemleri sırayla yap (barkod çakışmalarını önlemek için)
      for (const item of items) {
        try {
          const { barcode, name, purchasePriceUSD, salePriceUSD, quantity } =
            item;

          if (!barcode && !name) {
            results.push({
              barcode: barcode || "unknown",
              status: "error",
              error: "Barkod veya ürün adı gerekli",
            });
            continue;
          }

          // Barkod varsa mevcut ürünü güncelle
          if (barcode) {
            const existingProduct = await prisma.product.findUnique({
              where: { barcode },
            });

            if (existingProduct) {
              // Mevcut ürünün stoğunu artır
              await prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                  currentStock: existingProduct.currentStock + (quantity || 1),
                },
              });

              // Stok hareketini logla
              await prisma.stockMovement.create({
                data: {
                  productId: existingProduct.id,
                  type: "IN",
                  quantity: quantity || 1,
                  unitPriceUSD: existingProduct.purchasePriceUSD,
                  exchangeRateTRY: currentRate.rate,
                  totalPriceUSD:
                    (quantity || 1) * existingProduct.purchasePriceUSD,
                  totalPriceTRY:
                    (quantity || 1) *
                    existingProduct.purchasePriceUSD *
                    currentRate.rate,
                  note: `Toplu barkod girişi - ${new Date().toLocaleString(
                    "tr-TR"
                  )}`,
                },
              });

              results.push({
                barcode,
                status: "updated",
                product: existingProduct,
              });
            } else {
              // Yeni ürün oluştur
              const newProduct = await prisma.product.create({
                data: {
                  sku: barcode,
                  barcode,
                  name: name || `Ürün-${barcode}`,
                  purchasePriceUSD: parseFloat(purchasePriceUSD) || 0,
                  salePriceUSD: parseFloat(salePriceUSD) || 0,
                  currentStock: quantity || 1,
                },
              });

              await prisma.stockMovement.create({
                data: {
                  productId: newProduct.id,
                  type: "IN",
                  quantity: quantity || 1,
                  unitPriceUSD: newProduct.purchasePriceUSD,
                  exchangeRateTRY: currentRate.rate,
                  totalPriceUSD:
                    (quantity || 1) * newProduct.purchasePriceUSD,
                  totalPriceTRY:
                    (quantity || 1) *
                    newProduct.purchasePriceUSD *
                    currentRate.rate,
                  note: "Toplu barkod girişi - yeni ürün",
                },
              });

              results.push({
                barcode,
                status: "created",
                product: newProduct,
              });
            }
          } else {
            // Barkod yok, isimle ürün oluştur
            const now = new Date();
            const dateStr =
              now.getFullYear().toString().slice(-2) +
              (now.getMonth() + 1).toString().padStart(2, "0") +
              now.getDate().toString().padStart(2, "0") +
              now.getHours().toString().padStart(2, "0") +
              now.getMinutes().toString().padStart(2, "0") +
              now.getSeconds().toString().padStart(2, "0");

            const newProduct = await prisma.product.create({
              data: {
                sku: `MAN-${dateStr}`,
                name: name,
                purchasePriceUSD: parseFloat(purchasePriceUSD) || 0,
                salePriceUSD: parseFloat(salePriceUSD) || 0,
                currentStock: quantity || 1,
              },
            });

            await prisma.stockMovement.create({
              data: {
                productId: newProduct.id,
                type: "IN",
                quantity: quantity || 1,
                unitPriceUSD: newProduct.purchasePriceUSD,
                exchangeRateTRY: currentRate.rate,
                totalPriceUSD:
                  (quantity || 1) * newProduct.purchasePriceUSD,
                totalPriceTRY:
                  (quantity || 1) *
                  newProduct.purchasePriceUSD *
                  currentRate.rate,
                note: "Manuel ürün girişi",
              },
            });

            results.push({
              barcode: "N/A",
              status: "created",
              product: newProduct,
            });
          }
        } catch (itemError) {
          const errMsg =
            itemError instanceof Error
              ? itemError.message
              : "İşlem sırasında hata";
          results.push({
            barcode: item.barcode || "unknown",
            status: "error",
            error: errMsg,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          results,
          totalProcessed: results.length,
          successCount: results.filter((r) => r.status !== "error").length,
          errorCount: results.filter((r) => r.status === "error").length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/products/:id - Ürün güncelle
router.put(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        throw new AppError("Geçersiz ürün ID'si", 400);
      }

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });
      if (!existingProduct) {
        throw new AppError("Ürün bulunamadı", 404);
      }

      const {
        barcode,
        name,
        description,
        category,
        purchasePriceUSD,
        salePriceUSD,
        minStockLevel,
        unit,
        isActive,
      } = req.body;

      // Barkod değişiyorsa benzersizlik kontrolü
      if (barcode && barcode !== existingProduct.barcode) {
        const barcodeExists = await prisma.product.findUnique({
          where: { barcode },
        });
        if (barcodeExists) {
          throw new AppError("Bu barkod başka bir ürün tarafından kullanılıyor", 409);
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...(barcode !== undefined && { barcode: barcode?.trim() || null }),
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && {
            description: description?.trim() || null,
          }),
          ...(category !== undefined && { category }),
          ...(purchasePriceUSD !== undefined && {
            purchasePriceUSD: parseFloat(purchasePriceUSD),
          }),
          ...(salePriceUSD !== undefined && {
            salePriceUSD: parseFloat(salePriceUSD),
          }),
          ...(minStockLevel !== undefined && {
            minStockLevel: parseInt(minStockLevel),
          }),
          ...(unit !== undefined && { unit }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/products/:id - Ürün sil (pasif yap - soft delete)
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        throw new AppError("Geçersiz ürün ID'si", 400);
      }

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });
      if (!existingProduct) {
        throw new AppError("Ürün bulunamadı", 404);
      }

      // Soft delete - ürünü pasif yap
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "Ürün pasif duruma getirildi",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
