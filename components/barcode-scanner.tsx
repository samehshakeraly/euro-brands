"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";

// ماسح باركود: يفضّل BarcodeDetector المدمج في المتصفح (أسرع وبلا مكتبة إضافية)،
// ويتراجع تلقائياً لمكتبة html5-qrcode عند غياب الدعم أو فشل التشغيل.
// يتطلب HTTPS (أو localhost) وإذن الكاميرا.

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "codabar",
  "itf",
  "qr_code",
];

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector ?? null
  );
}

type FallbackInstance = { stop: () => Promise<void>; clear: () => void };

export function BarcodeScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fallbackRef = useRef<FallbackInstance | null>(null);

  const stopNative = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopFallback = useCallback(() => {
    const s = fallbackRef.current;
    fallbackRef.current = null;
    if (s) {
      s.stop()
        .then(() => s.clear())
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setUsingFallback(false);

    async function runFallback() {
      if (cancelled) return;
      setUsingFallback(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const instance = new Html5Qrcode("eb-barcode-region");
        fallbackRef.current = instance as unknown as FallbackInstance;
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
    }

    async function runNative(Ctor: BarcodeDetectorCtor) {
      let stream: MediaStream;
      try {
        const detector = new Ctor({ formats: BARCODE_FORMATS });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !cancelled) {
              cancelled = true;
              const value = codes[0].rawValue;
              stopNative();
              onScan(value);
              onClose();
              return;
            }
          } catch {
            // تجاهل خطأ فحص إطار واحد واستمر في المحاولة
          }
          if (!cancelled) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // فشل BarcodeDetector (كاميرا أو صيغ غير مدعومة) — جرّب المكتبة البديلة
        if (!cancelled) await runFallback();
      }
    }

    const Ctor = getBarcodeDetectorCtor();
    if (Ctor) void runNative(Ctor);
    else void runFallback();

    return () => {
      cancelled = true;
      stopNative();
      stopFallback();
    };
  }, [open, onClose, onScan, stopNative, stopFallback]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="مسح الباركود" size="sm">
      <div className="relative min-h-[220px] w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={usingFallback ? "hidden" : "h-full w-full object-cover"}
        />
        <div
          id="eb-barcode-region"
          className={usingFallback ? "min-h-[220px] w-full" : "hidden"}
        />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-60 rounded-lg border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">
          وجّه الكاميرا نحو باركود المنتج…
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="btn btn-secondary mt-3 h-11 w-full"
      >
        <X className="h-4 w-4" />
        إلغاء
      </button>
    </Modal>
  );
}
