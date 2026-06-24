import React, { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      />

      {/* Modal içeriği */}
      <div
        className={`
          relative w-full ${sizeClasses[size]} bg-surface dark:bg-surface-dim rounded-2xl shadow-2xl
          animate-scale-in max-h-[90vh] flex flex-col
          border border-outline-variant
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-on-surface-variant hidden sm:inline">ESC</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container-low transition-all duration-150 text-on-surface-variant hover:text-on-surface active:scale-90"
              aria-label="Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-body-md text-on-surface-variant">{children}</div>
      </div>
    </div>
  );
}
