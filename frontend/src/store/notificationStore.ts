import { create } from "zustand";

export type NotificationType = "stock_alert" | "stock_out" | "movement_in" | "movement_out" | "system" | "financial";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  data?: {
    productId?: number;
    productName?: string;
    quantity?: number;
    movementId?: number;
  };
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  stockAlertsEnabled: boolean;
  financialAlertsEnabled: boolean;

  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  setStockAlertsEnabled: (enabled: boolean) => void;
  setFinancialAlertsEnabled: (enabled: boolean) => void;
}

// Load saved preferences
const loadPrefs = () => {
  try {
    const saved = localStorage.getItem("notification_prefs");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { stockAlerts: true, financialAlerts: false };
};

// Load saved notifications
const loadNotifications = (): AppNotification[] => {
  try {
    const saved = localStorage.getItem("notifications");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
};

const prefs = loadPrefs();

export const useNotificationStore = create<NotificationState>((set, get) => {
  const saved = loadNotifications();
  return {
    notifications: saved,
    unreadCount: saved.filter((n) => !n.read).length,
    stockAlertsEnabled: prefs.stockAlerts,
    financialAlertsEnabled: prefs.financialAlerts,

    addNotification: (notification) => {
      const newNotification: AppNotification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        read: false,
      };
      set((state) => {
        const updated = [newNotification, ...state.notifications].slice(0, 50);
        // Persist to localStorage
        localStorage.setItem("notifications", JSON.stringify(updated));
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    markAsRead: (id) => {
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem("notifications", JSON.stringify(updated));
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    markAllAsRead: () => {
      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem("notifications", JSON.stringify(updated));
        return { notifications: updated, unreadCount: 0 };
      });
    },

    clearAll: () => {
      localStorage.setItem("notifications", JSON.stringify([]));
      set({ notifications: [], unreadCount: 0 });
    },

    removeNotification: (id) => {
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        localStorage.setItem("notifications", JSON.stringify(updated));
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    },

    setStockAlertsEnabled: (enabled) => {
      const newPrefs = { ...loadPrefs(), stockAlerts: enabled };
      localStorage.setItem("notification_prefs", JSON.stringify(newPrefs));
      set({ stockAlertsEnabled: enabled });
    },

    setFinancialAlertsEnabled: (enabled) => {
      const newPrefs = { ...loadPrefs(), financialAlerts: enabled };
      localStorage.setItem("notification_prefs", JSON.stringify(newPrefs));
      set({ financialAlertsEnabled: enabled });
    },
  };
});
