import prisma from "../prisma/client";
import fetch from "node-fetch";

const EXCHANGE_RATE_API_URL =
  process.env.EXCHANGE_RATE_API_URL || "https://api.exchangerate.host/latest";
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || "";

/**
 * Güncel döviz kurunu çeker ve ExchangeRate tablosuna kaydeder.
 * API: exchangerate.host (ücretsiz plan - günde 1000 istek)
 * Fallback: exchangerate-api.com alternatif olarak kullanılabilir.
 */
export async function fetchAndSaveExchangeRate(): Promise<{
  rate: number;
  date: string;
  source: string;
}> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // API'den canlı kur çek
    const apiUrl = EXCHANGE_RATE_API_KEY
      ? `${EXCHANGE_RATE_API_URL}?access_key=${EXCHANGE_RATE_API_KEY}&base=USD&symbols=TRY`
      : `${EXCHANGE_RATE_API_URL}?base=USD&symbols=TRY`;

    const response = await fetch(apiUrl, {
      timeout: 10000, // 10 saniye timeout
    });

    if (!response.ok) {
      throw new Error(`API yanıt vermedi: ${response.status}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      rates?: { TRY: number };
      error?: { info: string };
    };

    if (!data.success || !data.rates) {
      throw new Error(
        `API hatası: ${data.error?.info || "Bilinmeyen hata"}`
      );
    }

    const rate = data.rates.TRY;
    const source = "api";

    // Veritabanına kaydet (bugün için kayıt varsa güncelle, yoksa oluştur)
    await prisma.exchangeRate.upsert({
      where: { date: today },
      update: { rate, source },
      create: { rate, date: today, source },
    });

    console.log(`[DÖVİZ] USD/TRY kuru güncellendi: ${rate} (${today})`);

    return { rate, date: today, source: "api" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error(`[DÖVİZ] Kur çekme hatası: ${errorMessage}`);

    // API başarısız olursa, daha önce kaydedilmiş son kuru dene
    const lastRate = await prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
    });

    if (lastRate) {
      console.log(
        `[DÖVİZ] Son bilinen kur kullanılıyor: ${lastRate.rate} (${lastRate.date})`
      );
      return {
        rate: lastRate.rate,
        date: lastRate.date,
        source: "cached",
      };
    }

    // Hiç kur yoksa varsayılan değer (30.00 TL - gerçek API bağlanana kadar)
    const fallbackRate = 30.0;
    console.warn(`[DÖVİZ] Varsayılan kur kullanılıyor: ${fallbackRate}`);

    await prisma.exchangeRate.upsert({
      where: { date: today },
      update: { rate: fallbackRate, source: "manual" },
      create: { rate: fallbackRate, date: today, source: "manual" },
    });

    return {
      rate: fallbackRate,
      date: today,
      source: "manual",
    };
  }
}

/**
 * Belirli bir tarihteki dolar kurunu döndürür.
 * Eğer o tarihe ait kur yoksa, en yakın geçmiş kuru döndürür.
 */
export async function getExchangeRateForDate(
  date: Date
): Promise<{ rate: number; date: string } | null> {
  const dateStr = date.toISOString().split("T")[0];

  // Önce tam tarihi dene
  const exactRate = await prisma.exchangeRate.findUnique({
    where: { date: dateStr },
  });

  if (exactRate) {
    return { rate: exactRate.rate, date: exactRate.date };
  }

  // Yoksa en yakın geçmiş kaydı bul
  const closestRate = await prisma.exchangeRate.findFirst({
    where: { date: { lte: dateStr } },
    orderBy: { date: "desc" },
  });

  if (closestRate) {
    return { rate: closestRate.rate, date: closestRate.date };
  }

  return null;
}

/**
 * İşlem anındaki kuru loglamak için yardımcı fonksiyon.
 * Stok hareketi oluşturulurken çağrılır.
 */
export async function getCurrentExchangeRate(): Promise<{
  rate: number;
  date: string;
  source: string;
}> {
  const today = new Date().toISOString().split("T")[0];

  // Bugün için kayıt var mı kontrol et
  const todayRecord = await prisma.exchangeRate.findUnique({
    where: { date: today },
  });

  if (todayRecord) {
    return {
      rate: todayRecord.rate,
      date: todayRecord.date,
      source: todayRecord.source,
    };
  }

  // Yoksa canlı çekmeyi dene
  return await fetchAndSaveExchangeRate();
}
