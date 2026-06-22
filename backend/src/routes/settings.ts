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
