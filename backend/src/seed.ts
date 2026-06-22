import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSettings = [
  // ========== GENEL AYARLAR ==========
  { key: "company_name", value: "EnvanterPro", group: "general" },
  { key: "company_address", value: "", group: "general" },
  { key: "company_phone", value: "", group: "general" },
  { key: "company_email", value: "", group: "general" },
  { key: "default_unit", value: "Adet", group: "general" },
  { key: "default_currency", value: "USD", group: "general" },
  { key: "language", value: "tr", group: "general" },
  { key: "date_format", value: "DD.MM.YYYY", group: "general" },

  // ========== DÖVİZ AYARLARI ==========
  { key: "auto_fetch_exchange_rate", value: "true", group: "currency" },
  { key: "exchange_rate_cron_schedule", value: "0 */6 * * *", group: "currency" },
  { key: "exchange_rate_margin_percent", value: "0", group: "currency" },
  { key: "default_exchange_rate", value: "30.00", group: "currency" },

  // ========== BİLDİRİM AYARLARI ==========
  { key: "low_stock_warning", value: "true", group: "notification" },
  { key: "low_stock_threshold", value: "5", group: "notification" },
  { key: "out_of_stock_warning", value: "true", group: "notification" },
  { key: "stock_expiry_warning", value: "false", group: "notification" },
  { key: "low_stock_email_notification", value: "", group: "notification" },
];

async function main() {
  console.log("⚙️  Varsayılan ayarlar ekleniyor...");

  let created = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    const existing = await prisma.settings.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.settings.create({ data: setting });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ ${created} yeni ayar eklendi, ${skipped} ayar zaten mevcuttu (atlandı).`);
  console.log("🎉 Seed işlemi tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
