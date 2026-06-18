"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./client";

// خطّاف بسيط لجلب البيانات مع حالات التحميل والخطأ وإعادة الجلب.
// يُصفّر البيانات تلقائياً عند تغيّر الرابط حتى لا تختلط بيانات قديمة بفلتر
// جديد (مثلاً عند تبديل الفئة بينما النتائج القديمة ما زالت في الحالة).
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(url);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, [url]);

  // إعادة الضبط عند تغيّر الرابط ثم بدء جلب جديد، مع إلغاء أي استجابة متأخرة
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const result = await apiGet<T>(url);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "حدث خطأ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error, refetch, setData };
}
