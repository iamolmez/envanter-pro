import React, { useState } from "react";
import { useThemeStore } from "../store/appStore";
import { useNotificationStore } from "../store/notificationStore";
import { useI18n, type Language } from "../hooks/useI18n";
import Modal from "../components/Modal";

// ==================== TOGGLE SWITCH COMPONENT ====================
function ToggleSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-outline-variant peer-checked:bg-primary rounded-full transition-colors duration-200 relative">
        <div className="absolute top-1 left-1 bg-white dark:bg-surface-dim w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

// ==================== SETTINGS CARD COMPONENT ====================
function SettingsCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface dark:bg-surface-dim border border-outline-variant rounded-xl overflow-hidden">
      <div className="px-stack-md py-4 bg-surface-container-low border-b border-outline-variant">
        <h3 className="text-label-md font-label-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="divide-y divide-outline-variant">{children}</div>
    </div>
  );
}

// ==================== SETTINGS ROW COMPONENT ====================
function SettingsRow({
  icon,
  label,
  right,
  onClick,
  hoverable = true,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`px-stack-md flex items-center justify-between h-touch-min ${
        hoverable ? "hover:bg-surface-container-low cursor-pointer" : ""
      } transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center gap-stack-md">
        <span className="material-symbols-outlined text-outline">{icon}</span>
        <span className="text-body-md text-on-surface">{label}</span>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export default function Settings() {
  const { isDark, setDark } = useThemeStore();
  const { t, language, setLanguage } = useI18n();
  const { stockAlertsEnabled, financialAlertsEnabled, setStockAlertsEnabled, setFinancialAlertsEnabled } = useNotificationStore();

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Language dropdown state
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLangPicker(false);
  };

  return (
    <div className="bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-container-margin-mobile md:px-container-margin-desktop h-touch-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-md">
          <span className="material-symbols-outlined text-primary">settings</span>
          <h1 className="text-headline-sm font-bold text-primary">{t("settings.title")}</h1>
        </div>
        <div className="flex items-center">
          <button className="w-touch-min h-touch-min flex items-center justify-center hover:bg-surface-container-low transition-colors rounded-full">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
        </div>
      </header>

      <main className="pt-[64px] px-container-margin-mobile md:px-container-margin-desktop max-w-[1440px] mx-auto pb-32">
        {/* ====== Settings Grid ====== */}
        <div className="mt-stack-lg grid grid-cols-1 md:grid-cols-2 gap-gutter pb-stack-lg">
          {/* Genel */}
          <SettingsCard title={t("settings.general")} icon="tune">
            {/* Dil / Language */}
            <SettingsRow
              icon="language"
              label={t("settings.language")}
              right={
                <div className="flex items-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowLangPicker(!showLangPicker)}
                    className="flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span>{language === "tr" ? t("settings.turkish") : t("settings.english")}</span>
                    <span className="material-symbols-outlined text-outline text-[18px]">
                      {showLangPicker ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {/* Language picker dropdown */}
                  {showLangPicker && (
                    <div className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-dim border border-outline-variant rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px] animate-fade-in">
                      <button
                        onClick={() => handleLanguageChange("tr")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-body-md transition-colors ${
                          language === "tr"
                            ? "bg-primary-container/20 text-on-primary-container font-bold"
                            : "text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="text-lg">🇹🇷</span>
                        <span>Türkçe</span>
                        {language === "tr" && <span className="material-symbols-outlined text-primary ml-auto text-[18px]">check</span>}
                      </button>
                      <button
                        onClick={() => handleLanguageChange("en")}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-body-md transition-colors ${
                          language === "en"
                            ? "bg-primary-container/20 text-on-primary-container font-bold"
                            : "text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="text-lg">🇬🇧</span>
                        <span>English</span>
                        {language === "en" && <span className="material-symbols-outlined text-primary ml-auto text-[18px]">check</span>}
                      </button>
                    </div>
                  )}
                </div>
              }
              hoverable={false}
            />
            {/* Tema / Theme */}
            <SettingsRow
              icon="dark_mode"
              label={t("settings.theme")}
              right={
                <div className="flex items-center gap-2 p-1 bg-surface-variant dark:bg-surface-container-highest rounded-full">
                  <button
                    onClick={() => setDark(false)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                      !isDark ? "bg-white dark:bg-surface-dim shadow-sm text-primary" : "text-outline"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">light_mode</span>
                  </button>
                  <button
                    onClick={() => setDark(true)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                      isDark ? "bg-white dark:bg-surface-dim shadow-sm text-primary" : "text-outline"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                  </button>
                </div>
              }
              hoverable={false}
            />
          </SettingsCard>

          {/* Bildirimler / Notifications */}
          <SettingsCard title={t("settings.notifications")} icon="notifications">
            <SettingsRow
              icon="inventory_2"
              label={t("settings.stockAlerts")}
              right={<ToggleSwitch checked={stockAlertsEnabled} onChange={setStockAlertsEnabled} id="stock-alerts" />}
              hoverable={false}
            />
            <SettingsRow
              icon="monitoring"
              label={t("settings.financialReports")}
              right={<ToggleSwitch checked={financialAlertsEnabled} onChange={setFinancialAlertsEnabled} id="financial-reports" />}
              hoverable={false}
            />
          </SettingsCard>

          {/* Destek / Support */}
          <SettingsCard title={t("settings.support")} icon="support_agent">
            <SettingsRow
              icon="help"
              label={t("settings.helpCenter")}
              right={<span className="material-symbols-outlined text-outline">open_in_new</span>}
              onClick={() => window.open("https://wa.me/905397481640", "_blank")}
            />
            <SettingsRow
              icon="info"
              label={t("settings.about")}
              right={<span className="material-symbols-outlined text-outline">chevron_right</span>}
              onClick={() => setOpenModal("about")}
            />
            <SettingsRow
              icon="policy"
              label={t("settings.privacy")}
              right={<span className="material-symbols-outlined text-outline">chevron_right</span>}
              onClick={() => setOpenModal("privacy")}
            />
          </SettingsCard>
        </div>

        {/* ====== Hakkımızda Modal ====== */}
        <Modal isOpen={openModal === "about"} onClose={() => setOpenModal(null)} title={t("settings.about")} size="lg">
          <div className="space-y-6">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary/10 to-primary-container/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">inventory_2</span>
              </div>
              <h2 className="text-headline-sm font-bold text-on-surface mb-1">{t("app.name")}</h2>
              <p className="text-body-sm text-on-surface-variant">{t("app.tagline")}</p>
            </div>

            {/* About Content */}
            <div className="space-y-4">
              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.about.vision")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.about.vision.desc")}
                </p>
              </div>
              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.about.why.title")}</h4>
                <ul className="space-y-2">
                  {[
                    { icon: "qr_code_scanner", titleKey: "settings.about.feature.barcode.title", descKey: "settings.about.feature.barcode.desc" },
                    { icon: "currency_exchange", titleKey: "settings.about.feature.rate.title", descKey: "settings.about.feature.rate.desc" },
                    { icon: "analytics", titleKey: "settings.about.feature.report.title", descKey: "settings.about.feature.report.desc" },
                    { icon: "notifications", titleKey: "settings.about.feature.alert.title", descKey: "settings.about.feature.alert.desc" },
                    { icon: "cloud_sync", titleKey: "settings.about.feature.sync.title", descKey: "settings.about.feature.sync.desc" },
                  ].map((item) => (
                    <li key={item.titleKey} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-primary mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{t(item.titleKey)}</p>
                        <p className="text-body-sm text-on-surface-variant">{t(item.descKey)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.about.version.title")}</h4>
                <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between">
                  <span className="text-body-md text-on-surface-variant">{t("settings.about.version.label")}</span>
                  <span className="text-label-md font-bold text-on-surface font-mono-data">{t("settings.about.version.value")}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-outline-variant text-center">
              <p className="text-body-sm text-on-surface-variant">
                {t("settings.about.footer")}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                {t("settings.about.footer.contact")}
              </p>
            </div>
          </div>
        </Modal>

        {/* ====== Privacy Policy Modal ====== */}
        <Modal isOpen={openModal === "privacy"} onClose={() => setOpenModal(null)} title={t("settings.privacy")} size="lg">
          <div className="space-y-6">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary/10 to-primary-container/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">policy</span>
              </div>
              <h2 className="text-headline-sm font-bold text-on-surface mb-1">{t("settings.privacy")}</h2>
              <p className="text-body-sm text-on-surface-variant">{t("settings.privacy.lastUpdate")}</p>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section1.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section1.desc")}
                </p>
              </div>

              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section2.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section2.desc")}
                </p>
                <ul className="mt-2 space-y-2">
                  {[
                    "settings.privacy.section2.item1",
                    "settings.privacy.section2.item2",
                    "settings.privacy.section2.item3",
                    "settings.privacy.section2.item4",
                    "settings.privacy.section2.item5",
                  ].map((key) => (
                    <li key={key} className="flex items-start gap-3 p-2">
                      <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                      <span className="text-body-md text-on-surface-variant">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section3.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section3.desc")}
                </p>
              </div>

              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section4.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section4.desc")}
                </p>
              </div>

              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section5.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section5.desc")}
                </p>
                <ul className="mt-2 space-y-2">
                  {[
                    "settings.privacy.section5.item1",
                    "settings.privacy.section5.item2",
                    "settings.privacy.section5.item3",
                    "settings.privacy.section5.item4",
                    "settings.privacy.section5.item5",
                  ].map((key) => (
                    <li key={key} className="flex items-start gap-3 p-2">
                      <span className="material-symbols-outlined text-primary text-sm mt-0.5">verified</span>
                      <span className="text-body-md text-on-surface-variant">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-label-md font-bold text-on-surface mb-2">{t("settings.privacy.section6.title")}</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {t("settings.privacy.section6.desc")}
                </p>
                <div className="mt-3 bg-surface-container-low rounded-xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">whatsapp</span>
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{t("settings.privacy.section6.support.title")}</p>
                    <p className="text-body-sm text-primary">{t("settings.privacy.section6.support.number")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant text-center">
              <p className="text-body-sm text-on-surface-variant">
                {t("settings.privacy.footer")}
              </p>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
