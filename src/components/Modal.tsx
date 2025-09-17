"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Light overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title ?? "Modal"}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/40"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
          {footer ?? (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}