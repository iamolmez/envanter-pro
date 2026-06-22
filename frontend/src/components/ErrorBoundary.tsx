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
        <div className="max-w-lg mx-auto mt-20 p-6 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Bir hata oluştu
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {this.state.error?.message || "Beklenmeyen bir hata oluştu."}
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Backend henüz yayında değilse normaldir. Önce Render'a backend'i
            deploy edin.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
