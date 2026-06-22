import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Hata:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Bir hata oluştu
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              {this.state.error?.message || "Beklenmeyen bir hata oluştu."}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
              Backend henüz yayında değilse normaldir. Önce Render'a backend'i deploy edin.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition active:scale-95 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition active:scale-95"
              >
                Tarayıcıyı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
