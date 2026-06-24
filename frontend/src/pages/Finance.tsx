import React, { useEffect, useState, useRef } from "react";
import { stockMovementService, productService, exchangeRateService } from "../services/api";
import type { StockMovement, DashboardSummary, ExchangeRate, Product } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "../hooks/useI18n";

const formatUSD = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const formatTRY = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(v);

interface DailyFinance { name: string; gelir: number; gider: number; kar: number; }

// ==================== BOTTOM SHEET COMPONENT ====================
function BottomSheet({
  id,
  isOpen,
  onClose,
  title,
  icon,
  iconColor,
  children,
  large,
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-surface-dim rounded-t-3xl p-6 shadow-2xl transition-transform duration-400 ease-out ${
          large ? "h-[80vh]" : ""
        } ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-6" />
        {icon ? (
          <div className="flex items-center gap-2 mb-4">
            <span className={`material-symbols-outlined ${iconColor || "text-primary"}`}>{icon}</span>
            <h3 className="text-headline-sm font-bold text-on-surface">{title}</h3>
          </div>
        ) : (
          <h3 className="text-headline-sm font-bold text-on-surface mb-6">{title}</h3>
        )}
        {children}
      </div>
    </>
  );
}

// ==================== ACTION BUTTON COMPONENT ====================
function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button className="flex flex-col items-center gap-2 group" onClick={onClick}>
      <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary-container group-active:scale-90 hover:shadow-md transition-all">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <span className="text-label-sm font-medium text-center">{label}</span>
    </button>
  );
}

// ==================== REPORT BUTTON COMPONENT ====================
function ReportButton({ icon, label, bgClass, borderClass, textClass, onClick }: {
  icon: string; label: string; bgClass: string; borderClass: string; textClass: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 ${bgClass} border ${borderClass} rounded-xl hover:bg-opacity-80 transition-all active:scale-95 group shadow-sm`}
    >
      <span className={`material-symbols-outlined ${textClass} text-3xl mb-2`}>{icon}</span>
      <span className={`text-label-md font-bold ${textClass}`}>{label}</span>
    </button>
  );
}

// ==================== TRANSACTION ITEM ====================
function TransactionItem({ movement, index, currentRate }: { movement: StockMovement; index: number; currentRate: number | null }) {
  const { t } = useTranslation();
  const isIncome = movement.type === "OUT";
  const totalTRY = movement.totalPriceUSD && currentRate ? movement.totalPriceUSD * currentRate : null;

  return (
    <div
      className={`bg-surface border border-outline-variant p-4 rounded-xl flex items-center justify-between ${
        isIncome ? "status-emerald" : "status-rose"
      } reveal-item`}
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        }`}>
          <span className="material-symbols-outlined">{isIncome ? "call_received" : "call_made"}</span>
        </div>
        <div className="min-w-0">
          <p className="text-body-md font-bold text-on-surface truncate">
            {            movement.product?.name || t("finance.unknownProduct")}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {movement.type === "OUT" ? t("finance.income") : t("finance.expense")} • {new Date(movement.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className={`text-body-md font-bold ${isIncome ? "text-emerald-600" : "text-error"}`}>
          {isIncome ? "+" : "-"}
          {totalTRY ? formatTRY(Math.abs(totalTRY)) : (movement.totalPriceUSD ? formatUSD(Math.abs(movement.totalPriceUSD)) : "—")}
        </p>
        <p className="text-label-sm text-on-surface-variant">{isIncome ? t("finance.income") : t("finance.expense")}</p>
      </div>
    </div>
  );
}

// ==================== CHART BARS ====================
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end justify-between h-48 gap-2">
      {data.map((val, i) => {
        const opacity = 0.2 + (i / data.length) * 0.6;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-lg transition-all duration-700"
            style={{ height: `${(val / max) * 100}%`, backgroundColor: color, opacity }}
          />
        );
      })}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function Finance() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  // Bottom sheet states
  const [openSheet, setOpenSheet] = useState<string | null>(null);

  // Form states
  const [formOdeme, setFormOdeme] = useState({ name: "", description: "", amount: "" });
  const [formFatura, setFormFatura] = useState({ no: "", description: "", amount: "" });
  const [formTransfer, setFormTransfer] = useState({ recipient: "", description: "", amount: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, movData, rateData] = await Promise.all([
        stockMovementService.getSummary(),
        stockMovementService.getAll({ limit: 200, sortOrder: "desc" }),
        exchangeRateService.getCurrent(),
      ]);
      setSummary(sumData);
      setMovements(movData.movements || []);
      setCurrentRate(rateData);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // Daily finance data for charts
  const dailyData: DailyFinance[] = (() => {
    const map = new Map<string, { gelir: number; gider: number; kar: number }>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
      map.set(key, { gelir: 0, gider: 0, kar: 0 });
    }
    movements.forEach((m) => {
      const d = new Date(m.createdAt);
      const key = d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
      if (map.has(key) && m.totalPriceUSD) {
        const entry = map.get(key)!;
        if (m.type === "OUT") { entry.gelir += Math.abs(m.totalPriceUSD); entry.kar += Math.abs(m.totalPriceUSD); }
        else if (m.type === "IN") { entry.gider += Math.abs(m.totalPriceUSD); entry.kar -= Math.abs(m.totalPriceUSD); }
      }
    });
    return [...map.entries()].map(([name, data]) => ({ name, ...data }));
  })();

  // Monthly totals
  const monthlyGelirTRY = dailyData.reduce((s, d) => s + d.gelir, 0) * (currentRate?.rate || 1);
  const monthlyGiderTRY = dailyData.reduce((s, d) => s + d.gider, 0) * (currentRate?.rate || 1);
  const monthlyKarTRY = dailyData.reduce((s, d) => s + d.kar, 0) * (currentRate?.rate || 1);

  // Chart data for bottom sheets (last 5 months simulated)
  const karChartData = [40, 65, 50, 85, 95];
  const giderChartData = [70, 45, 80, 60, 40];

  const openSheetFn = (id: string) => setOpenSheet(id);
  const closeSheet = () => setOpenSheet(null);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        if (window.scrollY > 10) {
          headerRef.current.classList.add("shadow-md", "bg-white");
        } else {
          headerRef.current.classList.remove("shadow-md", "bg-white");
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Body scroll lock when sheet is open
  useEffect(() => {
    if (openSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [openSheet]);

  const handleFormSubmit = (type: string, e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`${type} başarıyla kaydedildi!`);
    setOpenSheet(null);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-body-sm text-on-surface-variant">{t("finance.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      {/* Top AppBar */}
      <header
        ref={headerRef}
        className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile h-touch-min bg-surface border-b border-outline-variant transition-shadow duration-300"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          <h1 className="text-headline-sm font-bold text-primary">{t("app.name")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-surface-container-low transition-colors rounded-full">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
          <button className="p-2 hover:bg-surface-container-low transition-colors rounded-full">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
        </div>
      </header>

      <main className="pt-16 px-container-margin-mobile pb-16">
        {/* ====== Summary Section: Toplam Bakiye ====== */}
        <section className="mt-stack-lg">
          <div className="bg-primary p-6 rounded-xl shadow-lg relative overflow-hidden">
            {/* Premium Shimmer Layer */}
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            {/* Abstract Pattern Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                <path d="M0 100 C 20 0 50 0 100 100" fill="transparent" stroke="white" strokeWidth="0.5" />
                <path d="M0 80 C 30 20 60 20 100 80" fill="transparent" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            <p className="text-white/80 text-label-md font-label-md">{t("finance.totalBalance")}</p>
            <h2 className="text-white text-display-lg-mobile font-display-lg-mobile mt-1">
              {summary ? formatTRY(summary.totalInventoryValueTRY) : "₺0,00"}
            </h2>
            <div className="flex gap-4 mt-6">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-lg p-3 transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer overflow-hidden relative group">
                <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-white/70 text-label-sm font-label-sm">{t("finance.monthlyIncome")}</p>
                <p className="text-white font-bold text-label-md">{formatTRY(monthlyGelirTRY)}</p>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-lg p-3 transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer overflow-hidden relative group">
                <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-white/70 text-label-sm font-label-sm">{t("finance.monthlyExpense")}</p>
                <p className="text-white font-bold text-label-md">{formatTRY(monthlyGiderTRY)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ====== Action Buttons: Kâr Raporu & Gider Raporu ====== */}
        <section className="mt-stack-lg grid grid-cols-2 gap-4">
          <ReportButton
            icon="trending_up"
            label={t("finance.profitReport")}
            bgClass="bg-emerald-50"
            borderClass="border-emerald-100"
            textClass="text-emerald-700"
            onClick={() => openSheetFn("sheet-kar")}
          />
          <ReportButton
            icon="trending_down"
            label={t("finance.expenseReport")}
            bgClass="bg-rose-50"
            borderClass="border-rose-100"
            textClass="text-rose-700"
            onClick={() => openSheetFn("sheet-gider")}
          />
        </section>

        {/* ====== Quick Actions Grid ====== */}
        <section className="mt-stack-lg grid grid-cols-3 gap-4">
          <ActionButton icon="payments" label={t("finance.payment")} onClick={() => openSheetFn("sheet-odeme")} />
          <ActionButton icon="receipt_long" label={t("finance.invoice")} onClick={() => openSheetFn("sheet-fatura")} />
          <ActionButton icon="account_balance_wallet" label={t("finance.transfer")} onClick={() => openSheetFn("sheet-transfer")} />
        </section>

        {/* ====== Transactions List ====== */}
        {movements.length > 0 && (
          <section className="mt-stack-lg pb-4">
            <div className="flex items-center justify-between mb-stack-md">
              <h3 className="text-headline-sm font-bold text-on-surface">{t("finance.transactions")}</h3>
              <button className="text-primary text-label-md font-label-md">{t("finance.viewAll")}</button>
            </div>
            <div className="space-y-3">
              {movements.slice(0, 10).map((m, i) => (
                <TransactionItem key={m.id} movement={m} index={i} currentRate={currentRate?.rate || null} />
              ))}
            </div>
          </section>
        )}

        {movements.length === 0 && !loading && (
          <section className="mt-stack-lg pb-4">
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-4 text-outline">receipt_long</span>
              <p className="text-body-md font-medium">{t("finance.noTransactions")}</p>
              <p className="text-body-sm mt-1">{t("finance.noTransactionsHint")}</p>
            </div>
          </section>
        )}
      </main>

      {/* ====== SHEET OVERLAY ====== */}

      {/* ====== BOTTOM SHEETS ====== */}

      {/* Ödeme Sheet */}
      <BottomSheet id="sheet-odeme" isOpen={openSheet === "sheet-odeme"} onClose={closeSheet} title={t("finance.newPayment")}>
        <form onSubmit={(e) => handleFormSubmit("Ödeme", e)} className="space-y-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.paymentName")}</label>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder={t("finance.paymentPlaceholder")}
              value={formOdeme.name}
              onChange={(e) => setFormOdeme((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.description")}</label>
            <textarea
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all resize-none"
              placeholder={t("finance.descPlaceholder")}
              rows={2}
              value={formOdeme.description}
              onChange={(e) => setFormOdeme((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.amount")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₺</span>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 pl-8 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formOdeme.amount}
                onChange={(e) => setFormOdeme((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 active:scale-[0.98] transition-transform shadow-md hover:shadow-lg"
          >
            {t("finance.savePayment")}
          </button>
        </form>
      </BottomSheet>

      {/* Fatura Sheet */}
      <BottomSheet id="sheet-fatura" isOpen={openSheet === "sheet-fatura"} onClose={closeSheet} title={t("finance.invoiceAdd")}>
        <form onSubmit={(e) => handleFormSubmit("Fatura", e)} className="space-y-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.invoiceNo")}</label>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder={t("finance.invoicePlaceholder")}
              value={formFatura.no}
              onChange={(e) => setFormFatura((p) => ({ ...p, no: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.description")}</label>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder={t("finance.invoiceContent")}
              value={formFatura.description}
              onChange={(e) => setFormFatura((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.amount")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₺</span>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 pl-8 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formFatura.amount}
                onChange={(e) => setFormFatura((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 active:scale-[0.98] transition-transform shadow-md hover:shadow-lg"
          >
            {t("finance.createInvoice")}
          </button>
        </form>
      </BottomSheet>

      {/* Transfer Sheet */}
      <BottomSheet id="sheet-transfer" isOpen={openSheet === "sheet-transfer"} onClose={closeSheet} title={t("finance.transferTitle")}>
        <form onSubmit={(e) => handleFormSubmit("Transfer", e)} className="space-y-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.recipientIban")}</label>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder={t("finance.ibanPlaceholder")}
              value={formTransfer.recipient}
              onChange={(e) => setFormTransfer((p) => ({ ...p, recipient: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.description")}</label>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder={t("finance.transferReason")}
              value={formTransfer.description}
              onChange={(e) => setFormTransfer((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">{t("finance.amount")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₺</span>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 pl-8 text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formTransfer.amount}
                onChange={(e) => setFormTransfer((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 active:scale-[0.98] transition-transform shadow-md hover:shadow-lg"
          >
            {t("finance.startTransfer")}
          </button>
        </form>
      </BottomSheet>

      {/* Kâr Raporu Sheet */}
      <BottomSheet id="sheet-kar" isOpen={openSheet === "sheet-kar"} onClose={closeSheet} title={t("finance.profitAnalysis")} icon="trending_up" iconColor="text-emerald-600" large>
        <div className="overflow-y-auto pr-1">
          <div className="bg-surface-container-low p-4 rounded-xl mb-6">
            <MiniChart data={karChartData} color="#10b981" />
            <div className="flex justify-between mt-2 text-label-sm text-on-surface-variant">
              <span>Oca</span>
              <span>Şub</span>
              <span>Mar</span>
              <span>Nis</span>
              <span>May</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 border-b border-outline-variant">
              <span className="text-body-md">{t("finance.netProfit")}</span>
              <span className="text-body-md font-bold text-emerald-600">{formatTRY(monthlyKarTRY)}</span>
            </div>
            <div className="flex justify-between p-3 border-b border-outline-variant">
              <span className="text-body-md">{t("finance.growthRate")}</span>
              <span className="text-body-md font-bold text-emerald-600">%12.4</span>
            </div>
            {summary && (
              <>
                <div className="flex justify-between p-3 border-b border-outline-variant">
                  <span className="text-body-md">{t("finance.potentialProfitUSD")}</span>
                  <span className="text-body-md font-bold text-on-surface">{formatUSD(summary.totalPotentialProfitUSD)}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-outline-variant">
                  <span className="text-body-md">{t("finance.potentialProfitTRY")}</span>
                  <span className="text-body-md font-bold text-on-surface">{formatTRY(summary.totalPotentialProfitTRY)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Gider Raporu Sheet */}
      <BottomSheet id="sheet-gider" isOpen={openSheet === "sheet-gider"} onClose={closeSheet} title={t("finance.expenseAnalysis")} icon="trending_down" iconColor="text-rose-600" large>
        <div className="overflow-y-auto pr-1">
          <div className="bg-surface-container-low p-4 rounded-xl mb-6">
            <MiniChart data={giderChartData} color="#f43f5e" />
            <div className="flex justify-between mt-2 text-label-sm text-on-surface-variant">
              <span>Oca</span>
              <span>Şub</span>
              <span>Mar</span>
              <span>Nis</span>
              <span>May</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 border-b border-outline-variant">
              <span className="text-body-md">{t("finance.totalExpense")}</span>
              <span className="text-body-md font-bold text-rose-600">{formatTRY(monthlyGiderTRY)}</span>
            </div>
            <div className="flex justify-between p-3 border-b border-outline-variant">
              <span className="text-body-md">{t("finance.incomeExpenseRatio")}</span>
              <span className="text-body-md font-bold text-on-surface">
                {monthlyGiderTRY > 0 ? `%${((monthlyGelirTRY / monthlyGiderTRY) * 100).toFixed(1)}` : "—"}
              </span>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
