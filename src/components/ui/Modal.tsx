"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** rộng hơn cho nội dung lớn (vd DraftEditor) */
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-400"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {/* Sheet tràn đáy trên điện thoại — đệm thêm cho vạch home của iPhone. */}
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
