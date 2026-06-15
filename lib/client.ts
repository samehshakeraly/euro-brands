// طبقة الاتصال بالـ API من جهة المتصفح

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

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: "no-store" }).then((r) => parseResponse<T>(r));
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => parseResponse<T>(r));
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => parseResponse<T>(r));
}

export function apiDelete<T>(url: string): Promise<T> {
  return fetch(url, { method: "DELETE" }).then((r) => parseResponse<T>(r));
}

export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return fetch("/api/upload", { method: "POST", body: form }).then((r) =>
    parseResponse<{ url: string }>(r)
  );
}
