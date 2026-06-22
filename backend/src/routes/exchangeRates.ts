import { Router, Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { AppError } from "../middleware/errorHandler";
import {
  fetchAndSaveExchangeRate,
  getCurrentExchangeRate,
} from "../services/exchangeRateService";

const router = Router();

// ==================== DÖVİZ KURU İŞLEMLERİ ====================

// GET /api/exchange-rates/current - Güncel kuru getir
router.get(
  "/current",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const currentRate = await getCurrentExchangeRate();
      res.json({
        success: true,
        data: currentRate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/exchange-rates/fetch - Canlı kuru manuel çek
router.post(
  "/fetch",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fetchAndSaveExchangeRate();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/exchange-rates/history - Kur geçmişini getir
router.get(
  "/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, limit } = req.query;

      const where: Record<string, unknown> = {};

      if (startDate || endDate) {
        where.date = {};
        if (startDate && typeof startDate === "string") {
          (where.date as Record<string, unknown>).gte = startDate;
        }
        if (endDate && typeof endDate === "string") {
          (where.date as Record<string, unknown>).lte = endDate;
        }
      }

      const takeLimit = parseInt(limit as string) || 90; // Varsayılan son 90 gün

      const rates = await prisma.exchangeRate.findMany({
        where: where as any,
        orderBy: { date: "desc" },
        take: takeLimit,
      });

      res.json({
        success: true,
        data: rates,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/exchange-rates - Manuel kur ekle/güncelle
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rate, date } = req.body;

      if (!rate || rate <= 0) {
        throw new AppError("Geçerli bir kur değeri giriniz", 400);
      }

      const rateDate = date || new Date().toISOString().split("T")[0];

      const savedRate = await prisma.exchangeRate.upsert({
        where: { date: rateDate },
        update: { rate: parseFloat(rate), source: "manual" },
        create: {
          rate: parseFloat(rate),
          date: rateDate,
          source: "manual",
        },
      });

      res.json({
        success: true,
        data: savedRate,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
