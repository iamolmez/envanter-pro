import { Router, Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import prisma from "../prisma/client";

const router = Router();

interface BarcodeLookupResult {
  found: boolean;
  source?: string;
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  quantity?: string;
}

// Open Food Facts API'sinden ürün ara
async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          "User-Agent": "EnvanterYonetimSistemi/1.0 (https://envanter-pro.vercel.app)",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      status: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        categories?: string;
        categories_tags?: string[];
        generic_name?: string;
        image_url?: string;
        image_small_url?: string;
        quantity?: string;
      };
    };

    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    const productName =
      product.product_name ||
      product.product_name_en ||
      product.generic_name ||
      null;

    if (!productName) return null;

    // Kategoriyi al (ilk kategori)
    let category: string | undefined;
    if (product.categories_tags && product.categories_tags.length > 0) {
      const raw = product.categories_tags[0];
      category = raw
        .replace(/^[a-z]{2}:/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (product.categories) {
      category = product.categories.split(",")[0]?.trim();
    }

    return {
      found: true,
      source: "openfoodfacts",
      barcode,
      productName,
      brand: product.brands || undefined,
      category: category || "Genel",
      description: product.generic_name || product.product_name_en || undefined,
      imageUrl: product.image_small_url || product.image_url || undefined,
      quantity: product.quantity || undefined,
    };
  } catch {
    return null;
  }
}

// UPCitemdb API'sinden ürün ara (günde 100 sorgu limiti)
async function lookupUPCitemdb(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      items?: Array<{
        title?: string;
        brand?: string;
        category?: string;
        description?: string;
        images?: string[];
        ean?: string;
        upc?: string;
        lowest_recorded_price?: number;
        highest_recorded_price?: number;
      }>;
    };

    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const productName = item.title || null;

    if (!productName) return null;

    return {
      found: true,
      source: "upcitemdb",
      barcode,
      productName,
      brand: item.brand || undefined,
      category: item.category || "Genel",
      description: item.description || undefined,
      imageUrl: item.images?.[0] || undefined,
    };
  } catch {
    return null;
  }
}

// GET /api/products/lookup/:barcode - Barkod ile ürün bilgisi ara
router.get("/:barcode", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barcodeParam = req.params.barcode;
    const barcode = Array.isArray(barcodeParam) ? barcodeParam[0] : barcodeParam;

    if (!barcode || barcode.trim() === "") {
      res.status(400).json({
        success: false,
        error: { message: "Barkod numarası gerekli" },
      });
      return;
    }

    const code = barcode.trim();
    let localFound = false;

    // 1. Önce kendi veritabanımızda ara (hata olursa extern API'lere geç)
    try {
      const localProduct = await prisma.product.findUnique({
        where: { barcode: code },
        select: {
          id: true,
          name: true,
          barcode: true,
          sku: true,
          category: true,
          purchasePriceUSD: true,
          salePriceUSD: true,
          currentStock: true,
          unit: true,
        },
      });

      if (localProduct) {
        localFound = true;
        res.json({
          success: true,
          data: {
            found: true,
            source: "local",
            barcode: code,
            product: {
              id: localProduct.id,
              name: localProduct.name,
              sku: localProduct.sku,
              category: localProduct.category,
              purchasePriceUSD: localProduct.purchasePriceUSD,
              salePriceUSD: localProduct.salePriceUSD,
              currentStock: localProduct.currentStock,
              unit: localProduct.unit,
            },
          },
        });
        return;
      }
    } catch {
      // Veritabanı hatası -> extern API'lere geç
      console.warn(`[BARCODE] DB erişilemedi, extern API deneniyor: ${code}`);
    }

    if (localFound) return;

    // 2. Kendi veritabanımızda yoksa UPCitemdb'de ara (elektronik dahil genel ürünler)
    const upcResult = await lookupUPCitemdb(code);

    if (upcResult) {
      res.json({
        success: true,
        data: upcResult,
      });
      return;
    }

    // 3. UPCitemdb'de de yoksa Open Food Facts'te ara (gıda ürünleri için son çare)
    const offResult = await lookupOpenFoodFacts(code);

    if (offResult) {
      res.json({
        success: true,
        data: offResult,
      });
      return;
    }

    // 4. Hiçbir yerde bulunamadı
    res.json({
      success: true,
      data: {
        found: false,
        barcode: code,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
