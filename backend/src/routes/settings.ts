import { Router, Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { AppError } from "../middleware/errorHandler";

const router = Router();

// ==================== SİSTEM AYARLARI ====================

// GET /api/settings - Tüm ayarları getir
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    // Gruplara göre düzenle
    const groupedSettings: Record<string, Array<{ key: string; value: string }>> = {};
    for (const setting of settings) {
      if (!groupedSettings[setting.group]) {
        groupedSettings[setting.group] = [];
      }
      groupedSettings[setting.group].push({
        key: setting.key,
        value: setting.value,
      });
    }

    res.json({
      success: true,
      data: {
        all: settings,
        grouped: groupedSettings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/:key - Tek ayar getir
router.get(
  "/:key",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key as string;
      const setting = await prisma.settings.findUnique({
        where: { key },
      });

      if (!setting) {
        throw new AppError("Ayar bulunamadı", 404);
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/seed - Varsayılan ayarları oluştur
router.post(
  "/seed",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const defaultSettings = [
        { key: "company_name", value: "OlmezEnvanter", group: "general" },
        { key: "company_address", value: "", group: "general" },
        { key: "company_phone", value: "", group: "general" },
        { key: "company_email", value: "", group: "general" },
        { key: "default_unit", value: "Adet", group: "general" },
        { key: "default_currency", value: "USD", group: "general" },
        { key: "language", value: "tr", group: "general" },
        { key: "date_format", value: "DD.MM.YYYY", group: "general" },
        { key: "auto_fetch_exchange_rate", value: "true", group: "currency" },
        { key: "exchange_rate_cron_schedule", value: "0 */6 * * *", group: "currency" },
        { key: "exchange_rate_margin_percent", value: "0", group: "currency" },
        { key: "default_exchange_rate", value: "30.00", group: "currency" },
        { key: "low_stock_warning", value: "true", group: "notification" },
        { key: "low_stock_threshold", value: "5", group: "notification" },
        { key: "out_of_stock_warning", value: "true", group: "notification" },
        { key: "stock_expiry_warning", value: "false", group: "notification" },
        { key: "low_stock_email_notification", value: "", group: "notification" },
      ];

      let created = 0;
      for (const s of defaultSettings) {
        const existing = await prisma.settings.findUnique({ where: { key: s.key } });
        if (!existing) {
          await prisma.settings.create({ data: s });
          created++;
        }
      }

      res.json({
        success: true,
        data: { created, message: `${created} varsayılan ayar oluşturuldu.` },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/:key - Ayar güncelle
router.put(
  "/:key",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { value, group } = req.body;

      if (value === undefined) {
        throw new AppError("Değer zorunludur", 400);
      }

      const key = req.params.key as string;
      const updatedSetting = await prisma.settings.upsert({
        where: { key },
        update: {
          value: String(value),
          ...(group !== undefined && { group }),
        },
        create: {
          key,
          value: String(value),
          group: group || "general",
        },
      });

      res.json({
        success: true,
        data: updatedSetting,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
