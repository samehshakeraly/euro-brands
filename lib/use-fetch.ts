"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "./client";

// خطّاف بسيط لجلب البيانات مع حالات التحميل والخطأ وإعادة الجلب.
// عند تغيّر الرابط: تُصفَّر البيانات/الخطأ فوراً ويُضبط التحميل=true قبل بدء
// الطلب، وتُلغى أي استجابة متأخرة من رابط سابق حتى لا تكتب فوق بيانات أحدث.
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!url) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(url);
      if (requestIdRef.current !== requestId) return; // استجابة متأخرة من طلب سابق
      setData(result);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // تصفير فوري عند تغيّر الرابط لمنع ظهور بيانات الرابط السابق قبل وصول الجديدة
    setData(null);
    setError(null);
    setLoading(!!url);
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
