import React, { useEffect, useState } from "react";
import { settingsService } from "../services/api";
import toast from "react-hot-toast";

interface SettingItem {
  id: number;
  key: string;
  value: string;
  group: string;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="skeleton h-3 w-24" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[1, 2, 3].map((j) => (
              <div key={j} className="px-5 py-3 space-y-2">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-48" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SettingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Yeni ayar ekleme
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newGroup, setNewGroup] = useState("general");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAll();
      const items: SettingItem[] = data.all.map((s: { id: number; key: string; value: string; group: string }) => ({
        id: s.id,
        key: s.key,
        value: s.value,
        group: s.group,
      }));
      setSettings(items);

      const groupedMap: Record<string, SettingItem[]> = {};
      for (const item of items) {
        if (!groupedMap[item.group]) groupedMap[item.group] = [];
        groupedMap[item.group].push(item);
      }
      setGrouped(groupedMap);
    } catch {
      toast.error("Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const result = await settingsService.seed();
      toast.success(`✅ ${result.message}`);
      loadSettings();
    } catch {
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setSeeding(false);
    }
  };

  const handleEdit = async (key: string) => {
    if (!editValue.trim()) { toast.error("Değer boş olamaz"); return; }
    setSaving(true);
    try {
      await settingsService.update(key, editValue.trim());
      toast.success("Ayar güncellendi");
      setEditingKey(null);
      loadSettings();
    } catch {
      toast.error("Güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) { toast.error("Anahtar ve değer gerekli"); return; }
    setSaving(true);
    try {
      await settingsService.update(newKey.trim(), newValue.trim(), newGroup);
      toast.success("Ayar eklendi");
      setShowAddForm(false);
      setNewKey(""); setNewValue(""); setNewGroup("general");
      loadSettings();
    } catch {
      toast.error("Eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  const groupLabels: Record<string, string> = {
    general: "Genel Ayarlar",
    currency: "Döviz Ayarları",
    notification: "Bildirim Ayarları",
  };

  const groupIcons: Record<string, string> = {
    general: "🏢",
    currency: "💱",
    notification: "🔔",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ayarlar</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {Object.keys(grouped).length > 0
              ? `${settings.length} ayar • ${Object.keys(grouped).length} kategori`
              : "Sistem ayarlarını görüntüleyin ve yönetin"}
          </p>
        </div>
        {Object.keys(grouped).length > 0 && (
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition active:scale-95">
            + Yeni Ayar
          </button>
        )}
      </div>

      {/* Yeni Ayar Formu */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Anahtar</label>
              <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                placeholder="ayar_adi"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Değer</label>
              <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                placeholder="Değer..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Grup</label>
              <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition">
                <option value="general">🏢 Genel</option>
                <option value="currency">💱 Döviz</option>
                <option value="notification">🔔 Bildirim</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">İptal</button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs text-white transition disabled:opacity-50 active:scale-95">
              {saving ? "Kaydediliyor..." : "Ekle"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <SettingsSkeleton />
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Henüz Ayar Yok</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Varsayılan ayarları tek tıkla oluşturun veya manuel olarak ekleyin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleSeedDefaults} disabled={seeding}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
              {seeding ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Oluşturuluyor...</>
              ) : "⚡ Varsayılan Ayarları Oluştur"}
            </button>
            <button onClick={() => { setShowAddForm(true); setNewGroup("general"); }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition active:scale-95">
              + Manuel Ekle
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Varsayılan ayarlar:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">🏢 Genel</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Firma adı, iletişim, birim, dil</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">💱 Döviz</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Kur çekme, marj, varsayılan kur</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">🔔 Bildirim</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Kritik stok, tükenme, e-posta</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-sm">{groupIcons[group] || "📋"}</span>
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {groupLabels[group] || group}
              </h2>
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">{items.length} ayar</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {items.map((item) => (
                <div key={item.key} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">{item.key}</p>
                      {editingKey === item.key ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            className="flex-1 px-2 py-1 rounded border border-indigo-400 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          <button onClick={() => handleEdit(item.key)} disabled={saving}
                            className="px-2 py-1 rounded bg-indigo-600 text-xs text-white hover:bg-indigo-700 transition disabled:opacity-50">Kaydet</button>
                          <button onClick={() => setEditingKey(null)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition">İptal</button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 break-all">{item.value || <span className="italic opacity-50">boş</span>}</p>
                      )}
                    </div>
                    {editingKey !== item.key && (
                      <button onClick={() => { setEditingKey(item.key); setEditValue(item.value); }}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition shrink-0 active:scale-95">
                        ✏️ Düzenle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {Object.keys(grouped).length > 0 && (
        <div className="text-center">
          <button onClick={handleSeedDefaults} disabled={seeding}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition disabled:opacity-50 active:scale-95">
            {seeding ? "Ekleniyor..." : "➕ Eksik Varsayılan Ayarları Ekle"}
          </button>
        </div>
      )}
    </div>
  );
}
