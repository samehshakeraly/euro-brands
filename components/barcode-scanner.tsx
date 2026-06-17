"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";

// ماسح باركود يستخدم كاميرا الجهاز عبر html5-qrcode.
// يتطلب HTTPS (أو localhost) وإذن الكاميرا.
export function BarcodeScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const instance = new Html5Qrcode("eb-barcode-region");
        scannerRef.current = instance as unknown as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decodedText: string) => {
            if (cancelled) return;
            cancelled = true;
            onScan(decodedText);
            onClose();
          },
          () => {}
        );
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "تعذّر تشغيل الكاميرا — تأكد من منح الإذن واستخدام HTTPS."
          );
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="مسح الباركود" size="sm">
      <div
        id="eb-barcode-region"
        className="min-h-[220px] w-full overflow-hidden rounded-lg bg-black"
      />
      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">
          وجّه الكاميرا نحو باركود المنتج…
        </p>
      )}
    </Modal>
  );
}
