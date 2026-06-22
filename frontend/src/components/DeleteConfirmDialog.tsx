import React from "react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  loading?: boolean;
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
  loading = false,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-scale-in p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Ürünü Sil
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            <strong className="text-slate-700 dark:text-slate-300">"{productName}"</strong> ürününü
            pasif duruma getirmek istediğinize emin misiniz? Bu işlem
            geri alınamaz.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 dark:bg-red-500 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
