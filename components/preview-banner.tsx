"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

// شريط يوضح أن التطبيق يعمل ببيانات تجريبية (بدون قاعدة بيانات)
export function PreviewBanner() {
  const [mock, setMock] = useState(false);

  useEffect(() => {
    fetch("/api/preview-mode")
      .then((r) => r.json())
      .then((d) => setMock(!!d?.mock))
      .catch(() => {});
  }, []);

  if (!mock) return null;

  return (
    <div className="no-print border-b border-warning/30 bg-[rgba(201,133,26,0.12)]">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-warning sm:px-6">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-bold">وضع المعاينة:</span> يتم عرض بيانات تجريبية
          بدون قاعدة بيانات. أي تعديلات (مبيعات أو منتجات) مؤقتة وتُفقد عند إعادة
          تشغيل الخادم.
        </span>
      </div>
    </div>
  );
}
