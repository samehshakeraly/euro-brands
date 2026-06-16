// طبقة الاتصال بالـ API من جهة المتصفح.
// في وضع المعاينة (USE_CLIENT_MOCK) تُستبدل كل الطلبات ببيانات تجريبية
// في الذاكرة، فتعمل الواجهة بالكامل دون أي خادم أو قاعدة بيانات.
import { USE_CLIENT_MOCK } from "./mock-flag";

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && data.error) ||
      "حدث خطأ غير متوقع";
    throw new Error(String(message));
  }
  return data as T;
}

async function call<T>(
  method: Method,
  url: string,
  body?: unknown
): Promise<T> {
  if (USE_CLIENT_MOCK) {
    const { mockApi } = await import("./mock-client");
    return mockApi<T>(method, url, body);
  }

  const init: RequestInit =
    method === "GET"
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const res = await fetch(url, init);
  return parseResponse<T>(res);
}

export function apiGet<T>(url: string): Promise<T> {
  return call<T>("GET", url);
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return call<T>("POST", url, body);
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return call<T>("PUT", url, body);
}

export function apiDelete<T>(url: string): Promise<T> {
  return call<T>("DELETE", url);
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  if (USE_CLIENT_MOCK) {
    const { mockApi } = await import("./mock-client");
    return mockApi<{ url: string }>("POST", "/api/upload");
  }

  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  return parseResponse<{ url: string }>(res);
}
