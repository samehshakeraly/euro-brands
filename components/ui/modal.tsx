"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizeClass;
}) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "card relative z-10 max-h-[90vh] w-full animate-fade-in overflow-y-auto rounded-b-none sm:rounded-xl",
          sizeClass[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-bold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost h-9 w-9 !px-0"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-start">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
