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
      // Normal sorgu (güvenli - Prisma ORM)
      [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: where as any,
          orderBy: { [orderByField]: orderByDirection },
          skip,
          take: pageSize,
        }),
        prisma.product.count({ where: where as any }),
      ]);

      // imageUrl bilgisini batch raw SQL ile ekle (Prisma client eski olduğu için)
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
        );
        const ids = (products as any[]).map((p: any) => p.id);
        if (ids.length > 0) {
          const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
          const imageRows = await prisma.$queryRawUnsafe<
            Array<{ id: number; imageUrl: string | null }>
          >(
            `SELECT id, "imageUrl" FROM "Product" WHERE id IN (${placeholders})`,
            ...ids
          );
          const imageMap = new Map(
            imageRows.map((r) => [r.id, r.imageUrl])
          );
          products = (products as any[]).map((p: any) => ({
            ...p,
            imageUrl: imageMap.get(p.id) || null,
          }));
        }
      } catch {
        // Kolon henüz eklenmemiş olabilir, sessizce geç
      }
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

// GET /api/products/:id - Tek ürün getir (imageUrl dahil)
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

    // imageUrl'i ayrıca çek (Prisma client eski olduğu için)
    let imageUrl: string | null = null;
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ imageUrl: string | null }>
      >(`SELECT "imageUrl" FROM "Product" WHERE "id" = $1`, id);
      imageUrl = rows[0]?.imageUrl || null;
    } catch {
      // imageUrl kolonu henüz eklenmemiş olabilir
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
        imageUrl,
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
      imageUrl,
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
    }      // imageUrl kolonunu varsa ekle
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
      ).catch(() => {});

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

    // imageUrl varsa raw SQL ile direkt kaydet
    if (imageUrl && typeof imageUrl === "string") {
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "imageUrl" = $1 WHERE "id" = $2`,
        imageUrl,
        product.id
      );
    }

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

// ==================== ÜRÜN RESMİ ====================

// PUT /api/products/:id/image - Ürün resmini yükle/güncelle
router.put(
  "/:id/image",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) throw new AppError("Geçersiz ID", 400);

      const { imageUrl } = req.body;
      if (!imageUrl || typeof imageUrl !== "string") {
        throw new AppError("imageUrl (base64 data URL) gerekli", 400);
      }

      // Maksimum 2MB
      const sizeInBytes = Buffer.byteLength(imageUrl, "utf-8");
      if (sizeInBytes > 2 * 1024 * 1024) {
        throw new AppError("Resim boyutu 2MB'ı geçemez", 400);
      }

      // Önce kolon var mı kontrol et, yoksa ekle
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
      );

      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "imageUrl" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        imageUrl,
        id
      );

      res.json({ success: true, data: { id, imageUrl: imageUrl.slice(0, 50) + "..." } });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/products/:id/image - Ürün resmini sil
router.delete(
  "/:id/image",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) throw new AppError("Geçersiz ID", 400);

      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "imageUrl" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
        id
      );

      res.json({ success: true, message: "Resim silindi" });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CSV İÇE / DIŞA AKTAR ====================

// GET /api/products/export/csv - Tüm ürünleri CSV olarak dışa aktar
router.get(
  "/export/csv",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });

      // CSV başlık satırı
      const headers = [
        "sku",
        "barcode",
        "name",
        "category",
        "purchasePriceUSD",
        "salePriceUSD",
        "currentStock",
        "minStockLevel",
        "unit",
        "description",
      ];

      // CSV satırlarını oluştur
      const escapeCsv = (val: string | null | undefined) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Tırnak veya virgül varsa çift tırnak içine al
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(","),
        ...products.map((p) =>
          [
            escapeCsv(p.sku),
            escapeCsv(p.barcode),
            escapeCsv(p.name),
            escapeCsv(p.category),
            p.purchasePriceUSD.toString(),
            p.salePriceUSD.toString(),
            p.currentStock.toString(),
            p.minStockLevel.toString(),
            escapeCsv(p.unit),
            escapeCsv(p.description),
          ].join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");

      // BOM ile UTF-8 CSV (Excel'de Türkçe karakterler düzgün görünsün diye)
      const bom = "\uFEFF";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="urunler-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`
      );
      res.send(bom + csvContent);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/products/import/csv - CSV'den ürünleri içe aktar
router.post(
  "/import/csv",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { csv } = req.body;

      if (!csv || typeof csv !== "string" || csv.trim().length === 0) {
        throw new AppError("CSV içeriği gerekli", 400);
      }

      // BOM karakterini temizle
      let cleanCsv = csv.replace(/^\uFEFF/, "").trim();

      // Satırlara ayır
      const lines = cleanCsv.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        throw new AppError("CSV en az bir başlık ve bir veri satırı içermeli", 400);
      }

      // Basit CSV ayrıştırıcı (tırnak içindeki virgülleri dikkate alır)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === "," && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current);
        return result;
      };

      // Başlıkları al
      const headerLine = parseCSVLine(lines[0]);
      const headerMap = new Map<string, number>();
      const expectedHeaders = [
        "name", "barcode", "category", "purchasePriceUSD",
        "salePriceUSD", "currentStock", "minStockLevel", "unit", "description",
      ];

      headerLine.forEach((h, i) => headerMap.set(h.trim().toLowerCase(), i));

      // En azından name sütunu olmalı
      if (!headerMap.has("name")) {
        throw new AppError("CSV'de 'name' sütunu zorunludur", 400);
      }

      const currentRate = await getCurrentExchangeRate();
      const results: Array<{
        row: number;
        name: string;
        status: "created" | "updated" | "skipped" | "error";
        error?: string;
      }> = [];

      let created = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const rowNum = i + 1;

        const getVal = (key: string): string | undefined => {
          const idx = headerMap.get(key.toLowerCase());
          if (idx === undefined || idx >= row.length) return undefined;
          return row[idx].trim();
        };

        try {
          const name = getVal("name");
          if (!name) {
            results.push({
              row: rowNum,
              name: `Satır ${rowNum}`,
              status: "error",
              error: "Ürün adı boş",
            });
            errors++;
            continue;
          }

          const barcode = getVal("barcode");
          const category = getVal("category") || "Genel";
          const purchasePriceUSD = parseFloat(getVal("purchasePriceUSD") || "0");
          const salePriceUSD = parseFloat(getVal("salePriceUSD") || "0");
          const currentStock = parseInt(getVal("currentStock") || "0");
          const minStockLevel = parseInt(getVal("minStockLevel") || "5");
          const unit = getVal("unit") || "Adet";
          const description = getVal("description") || null;

          if (barcode) {
            // Barkod varsa mevcut ürünü güncelle
            const existing = await prisma.product.findUnique({
              where: { barcode },
            });

            if (existing) {
              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  name,
                  category,
                  purchasePriceUSD,
                  salePriceUSD,
                  currentStock,
                  minStockLevel,
                  unit,
                  description,
                  isActive: true,
                },
              });
              updated++;
              results.push({ row: rowNum, name, status: "updated" });
            } else {
              // Yeni ürün oluştur
              await prisma.product.create({
                data: {
                  sku: barcode,
                  barcode,
                  name,
                  category,
                  purchasePriceUSD,
                  salePriceUSD,
                  currentStock,
                  minStockLevel,
                  unit,
                  description,
                },
              });
              created++;
              results.push({ row: rowNum, name, status: "created" });

              // Stok hareketi oluştur
              if (currentStock > 0) {
                await prisma.stockMovement.create({
                  data: {
                    productId: (
                      await prisma.product.findUnique({ where: { barcode } })
                    )!.id,
                    type: "IN",
                    quantity: currentStock,
                    unitPriceUSD: purchasePriceUSD,
                    exchangeRateTRY: currentRate.rate,
                    totalPriceUSD: currentStock * purchasePriceUSD,
                    totalPriceTRY:
                      currentStock * purchasePriceUSD * currentRate.rate,
                    note: "CSV toplu içe aktarım",
                  },
                });
              }
            }
          } else {
            // Barkod yok, isimle kontrol et (SKU oluşturarak ekle)
            const now = new Date();
            const dateStr =
              now.getFullYear().toString().slice(-2) +
              (now.getMonth() + 1).toString().padStart(2, "0") +
              now.getDate().toString().padStart(2, "0") +
              now.getHours().toString().padStart(2, "0") +
              now.getMinutes().toString().padStart(2, "0") +
              now.getSeconds().toString().padStart(2, "0");
            const categoryPrefix = category.substring(0, 3).toUpperCase();
            const sku = `${categoryPrefix}-${dateStr}-${String(i).padStart(3, "0")}`;

            await prisma.product.create({
              data: {
                sku,
                name,
                category,
                purchasePriceUSD,
                salePriceUSD,
                currentStock,
                minStockLevel,
                unit,
                description,
              },
            });
            created++;
            results.push({ row: rowNum, name, status: "created" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
          errors++;
          results.push({
            row: rowNum,
            name: getVal("name") || `Satır ${rowNum}`,
            status: "error",
            error: msg,
          });
        }
      }

      res.json({
        success: true,
        data: {
          results,
          totalProcessed: results.length,
          created,
          updated,
          errors,
        },
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
