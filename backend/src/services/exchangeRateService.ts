import prisma from "../prisma/client";

// Frankfurter API (ücretsiz, ECB verisi, anahtar gerekmez)
const FRANKFURTER_URL = "https://api.frankfurter.dev/v2";
// Yedek API (Frankfurter çalışmazsa)
const FALLBACK_URL = "https://latest.currency-api.pages.dev/v1/currencies/usd.json";

/**
 * Güncel döviz kurunu dener: Frankfurter → currency-api → önbellek → varsayılan
 */
export async function fetchAndSaveExchangeRate(): Promise<{
  rate: number;
  date: string;
  source: string;
}> {
  const today = new Date().toISOString().split("T")[0];

  // Sırayla dene
  const apis = [
    { url: `${FRANKFURTER_URL}/latest?base=USD&symbols=TRY`, label: "frankfurter" as const },
    { url: FALLBACK_URL, label: "currency-api" as const },
  ];

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;
      let rate: number | undefined;

      if (api.label === "frankfurter") {
        const d = data as { rates?: Record<string, number> };
        rate = d.rates?.TRY;
      } else {
        const d = data as { usd?: Record<string, number> };
        rate = d.usd?.try;
      }

      if (!rate || rate <= 0) continue;

      await prisma.exchangeRate.upsert({
        where: { date: today },
        update: { rate, source: "api" },
        create: { rate, date: today, source: "api" },
      });

      console.log(`[DÖVİZ] USD/TRY: ${rate} (${today}, ${api.label})`);
      return { rate, date: today, source: "api" };
    } catch (err) {
      console.warn(`[DÖVİZ] ${api.label} başarısız:`, (err as Error).message);
    }
  }

  // Tüm API'ler başarısız — önbellekteki son kuru dene
  console.error("[DÖVİZ] Tüm API'ler başarısız, önbellek kullanılıyor");

  const lastRate = await prisma.exchangeRate.findFirst({
    orderBy: { date: "desc" },
  });

  if (lastRate) {
    console.log(`[DÖVİZ] Son bilinen kur: ${lastRate.rate} (${lastRate.date})`);
    return { rate: lastRate.rate, date: lastRate.date, source: "cached" };
  }

  // Hiç kur yoksa varsayılan
  const fallbackRate = 30.0;
  console.warn(`[DÖVİZ] Varsayılan kur: ${fallbackRate}`);

  await prisma.exchangeRate.upsert({
    where: { date: today },
    update: { rate: fallbackRate, source: "manual" },
    create: { rate: fallbackRate, date: today, source: "manual" },
  });

  return { rate: fallbackRate, date: today, source: "manual" };
}

/**
 * Belirli bir tarihteki dolar kurunu döndürür (en yakın kaydı da dener).
 */
export async function getExchangeRateForDate(
  date: Date
): Promise<{ rate: number; date: string } | null> {
  const dateStr = date.toISOString().split("T")[0];

  const exact = await prisma.exchangeRate.findUnique({ where: { date: dateStr } });
  if (exact) return { rate: exact.rate, date: exact.date };

  const closest = await prisma.exchangeRate.findFirst({
    where: { date: { lte: dateStr } },
    orderBy: { date: "desc" },
  });

  return closest ? { rate: closest.rate, date: closest.date } : null;
}

/**
 * Bugünün kurunu döndürür (varsa önbellekten, yoksa API'den çeker).
 */
export async function getCurrentExchangeRate(): Promise<{
  rate: number;
  date: string;
  source: string;
}> {
  const today = new Date().toISOString().split("T")[0];

  const cached = await prisma.exchangeRate.findUnique({ where: { date: today } });
  if (cached) return { rate: cached.rate, date: cached.date, source: cached.source };

  return await fetchAndSaveExchangeRate();
}
