import React, { useState, useEffect, useRef } from "react";
import { useNotificationStore, type AppNotification } from "../store/notificationStore";
import { useI18n } from "../hooks/useI18n";

function timeAgo(timestamp: number, t: (key: string) => string): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("notifications.justNow");
  if (minutes < 60) return `${minutes} ${t("notifications.minutesAgo")}`;
  if (hours < 24) return `${hours} ${t("notifications.hoursAgo")}`;
  return `${days} ${t("notifications.daysAgo")}`;
}

const typeStyles: Record<string, { bg: string; icon: string; color: string }> = {
  stock_alert: { bg: "bg-error-container/20", icon: "warning", color: "text-error" },
  stock_out: { bg: "bg-error-container/30", icon: "dangerous", color: "text-error" },
  movement_in: { bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: "add_task", color: "text-emerald-600" },
  movement_out: { bg: "bg-amber-100 dark:bg-amber-900/30", icon: "outbound", color: "text-amber-600" },
  system: { bg: "bg-surface-container-low", icon: "info", color: "text-primary" },
  financial: { bg: "bg-secondary-container/30", icon: "payments", color: "text-secondary" },
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const t = useI18n((s) => s.t);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const getIcon = (type: string) => typeStyles[type]?.icon || "notifications";
  const getColor = (type: string) => typeStyles[type]?.color || "text-primary";
  const getBg = (type: string) => typeStyles[type]?.bg || "bg-surface-container-low";

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"
        aria-label={t("notifications.title")}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1 border-2 border-surface dark:border-surface-dim">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Dropdown - fixed positioned to overlay sidebar */}
      {isOpen && (
        <div className="hidden lg:block">
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            className="fixed left-72 top-[88px] ml-3 w-[400px] max-h-[70vh] bg-surface dark:bg-surface-dim border border-outline-variant rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in"
            style={{ maxHeight: "calc(100dvh - 160px)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
              <h3 className="text-headline-sm font-bold text-on-surface">{t("notifications.title")}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-label-sm text-primary hover:underline px-2 py-1">
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 text-outline">notifications_off</span>
                  <p className="text-body-md font-medium">{t("notifications.empty")}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/50">
                  {notifications.map((n: AppNotification) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-surface-container-low ${
                        !n.read ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getBg(n.type)}`}>
                        <span className={`material-symbols-outlined text-[20px] ${getColor(n.type)}`}>{getIcon(n.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-body-sm font-medium leading-tight ${!n.read ? "text-on-surface" : "text-on-surface-variant"}`}>
                          {n.title}
                        </p>
                        <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-[11px] text-outline mt-1">{timeAgo(n.timestamp, t)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-outline-variant shrink-0">
                <button onClick={clearAll} className="w-full py-2 text-center text-label-sm text-on-surface-variant hover:text-error transition-colors">
                  {t("common.delete")} ({t("notifications.title").toLowerCase()})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet - slides up from bottom */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto" onClick={() => setIsOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dim rounded-t-3xl shadow-2xl pointer-events-auto max-h-[85vh] flex flex-col border-t border-outline-variant"
            style={{ animation: "slide-up-from-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards" }}
          >
            <div className="w-full flex justify-center py-3 cursor-grab" onClick={() => setIsOpen(false)}>
              <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-outline-variant">
              <h3 className="text-headline-sm font-bold text-on-surface">{t("notifications.title")}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-label-sm text-primary hover:underline">
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pb-8">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 text-outline">notifications_off</span>
                  <p className="text-body-md font-medium">{t("notifications.empty")}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/50">
                  {notifications.map((n: AppNotification) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getBg(n.type)}`}>
                        <span className={`material-symbols-outlined text-[20px] ${getColor(n.type)}`}>{getIcon(n.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-on-surface">{n.title}</p>
                        <p className="text-body-sm text-on-surface-variant mt-0.5">{n.description}</p>
                        <p className="text-[11px] text-outline mt-1">{timeAgo(n.timestamp, t)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
