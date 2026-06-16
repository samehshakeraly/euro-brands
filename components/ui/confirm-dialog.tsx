"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Spinner } from "./spinner";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button
            className="btn btn-danger w-full sm:w-auto"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
          <button
            className="btn btn-secondary w-full sm:w-auto"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(217,83,79,0.14)] text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-text">{title}</h3>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
