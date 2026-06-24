import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import prisma from "./prisma/client";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { fetchAndSaveExchangeRate } from "./services/exchangeRateService";

// Çevre değişkenlerini yükle
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// ==================== MIDDLEWARE ====================

// CORS yapılandırması
app.use(
  cors({
    origin: function (origin, callback) {
      // İzin verilen originler
      const allowedOrigins = CORS_ORIGIN.split(",").map((o) => o.trim());
      
      // Sunucu-sunucu isteklerinde origin undefined olabilir
      if (!origin) return callback(null, true);
      
      // Tam eşleşme kontrolü
      if (allowedOrigins.includes(origin)) return callback(null, true);
      
      // Vercel preview domain'leri (*.vercel.app)
      if (origin.endsWith(".vercel.app") || origin === "https://envanter-pro-seven.vercel.app") {
        return callback(null, true);
      }
      
      // localhost (geliştirme)
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://192.168.")) {
        return callback(null, true);
      }
      
      callback(null, true); // Gelişmiş güvenlik için false yapılabilir
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// JSON body parser (limit: 10MB - barkod görselleri için)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// İstek loglama (geliştirme ortamı)
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleString("tr-TR")}] ${req.method} ${req.url}`);
    next();
  });
}

// ==================== ROUTES ====================

// Ana sayfa (API durum kontrolü)
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Envanter Yönetim Sistemi API çalışıyor",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Route'ları
app.use("/api", routes);

// 404 handler
app.use(notFoundHandler);

// Global hata handler
app.use(errorHandler);

// ==================== CRON JOB ====================

// Döviz kurunu belirli aralıklarla güncelle
const cronSchedule = process.env.EXCHANGE_RATE_CRON_SCHEDULE || "0 */6 * * *";

cron.schedule(cronSchedule, async () => {
  console.log("[CRON] Döviz kuru güncelleme başladı...");
  try {
    const result = await fetchAndSaveExchangeRate();
    console.log(
      `[CRON] Döviz kuru güncellendi: ${result.rate} (${result.date})`
    );
  } catch (error) {
    console.error("[CRON] Döviz kuru güncelleme hatası:", error);
  }
});

// ==================== OTOMATİK SEED (İLK ÇALIŞTIRMADA DEFAULT AYARLAR) ====================

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

async function seedDefaults() {
  try {
    // Hızlı kontrol: settings tablosunda kayıt var mı?
    const count = await prisma.settings.count();
    if (count === 0) {
      console.log("⚙️  Varsayılan ayarlar oluşturuluyor...");
      for (const s of defaultSettings) {
        await prisma.settings.create({ data: s });
      }
      console.log(`✅ ${defaultSettings.length} varsayılan ayar oluşturuldu.`);
    } else {
      // Eksik ayarları tamamla (yeni eklenenler varsa)
      let added = 0;
      for (const s of defaultSettings) {
        const existing = await prisma.settings.findUnique({ where: { key: s.key } });
        if (!existing) {
          await prisma.settings.create({ data: s });
          added++;
        }
      }
      if (added > 0) console.log(`➕ ${added} yeni varsayılan ayar eklendi.`);
    }
  } catch (e) {
    console.warn("⚠️  Seed kontrolü yapılamadı (tablo henüz hazır olmayabilir):", (e as Error).message);
  }
}

// Sunucu başlayınca seed'i çalıştır (biraz gecikmeli, DB'nin hazır olması için)
setTimeout(() => { seedDefaults(); }, 2000);

// Uygulama ilk açıldığında da kuru çek
if (process.env.NODE_ENV !== "production") {
  setTimeout(async () => {
    console.log("[BAŞLANGIÇ] İlk döviz kuru çekiliyor...");
    try {
      const result = await fetchAndSaveExchangeRate();
      console.log(
        `[BAŞLANGIÇ] Döviz kuru: ${result.rate} (${result.date})`
      );
    } catch (error) {
      console.warn(
        "[BAŞLANGIÇ] Döviz kuru çekilemedi, manuel giriş yapılabilir."
      );
    }
  }, 3000);
}

// ==================== SUNUCU BAŞLAT ====================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     Envanter Yönetim Sistemi API Sunucusu           ║
╠══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                        ║
║  Ortam: ${(process.env.NODE_ENV || "development").padEnd(35)} ║
║  API: http://localhost:${PORT}/api                    ║
║  Sağlık: http://localhost:${PORT}/api/health          ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
