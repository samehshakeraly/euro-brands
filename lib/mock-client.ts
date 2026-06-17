// موجّه وضع المعاينة من جهة المتصفح:
// يحاكي مسارات الـ API بالكامل اعتماداً على المتجر التجريبي في الذاكرة،
// بحيث تعمل الواجهة دون أي خادم أو قاعدة بيانات.
import {
  mockListProducts,
  mockGetProduct,
  mockCreateProduct,
  mockUpdateProduct,
  mockDeleteProduct,
  mockImportInventory,
  mockLowStock,
  mockHomeStats,
  mockListBrands,
  mockCreateBrand,
  mockListSales,
  mockGetSale,
  mockCreateSale,
  mockCancelSale,
  mockDashboard,
  mockReports,
  mockUploadUrl,
} from "./mock-store";
import {
  parseBrandInput,
  parseImportRows,
  parseProductInput,
  parseSaleInput,
} from "./validate";

type Method = "GET" | "POST" | "PUT" | "DELETE";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function mockApi<T>(
  method: Method,
  url: string,
  body?: unknown
): Promise<T> {
  await delay(); // محاكاة زمن استجابة بسيط لإظهار حالات التحميل

  const parsed = new URL(url, "http://mock.local");
  const path = parsed.pathname;
  const sp = parsed.searchParams;

  // /api/preview-mode
  if (path === "/api/preview-mode") return { mock: true } as T;

  // /api/products
  if (path === "/api/products") {
    if (method === "GET") return mockListProducts(sp) as T;
    if (method === "POST")
      return mockCreateProduct(parseProductInput(body)) as T;
  }

  // /api/products/import (قبل مطابقة المعرّف لأن "import" يطابق النمط)
  if (path === "/api/products/import" && method === "POST")
    return mockImportInventory(parseImportRows(body)) as T;

  // /api/products/[id]
  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    if (method === "GET") {
      const dto = mockGetProduct(id);
      if (!dto) throw new Error("المنتج غير موجود");
      return dto as T;
    }
    if (method === "PUT") {
      const dto = mockUpdateProduct(id, parseProductInput(body));
      if (!dto) throw new Error("المنتج غير موجود");
      return dto as T;
    }
    if (method === "DELETE") {
      const res = mockDeleteProduct(id);
      if (!res.ok) throw new Error(res.error);
      return { success: true } as T;
    }
  }

  // /api/brands
  if (path === "/api/brands") {
    if (method === "GET") return mockListBrands(sp.get("category")) as T;
    if (method === "POST") return mockCreateBrand(parseBrandInput(body)) as T;
  }

  // /api/sales
  if (path === "/api/sales") {
    if (method === "GET") return mockListSales(sp) as T;
    if (method === "POST") return mockCreateSale(parseSaleInput(body)) as T;
  }

  // /api/sales/[id]/cancel
  const cancelMatch = path.match(/^\/api\/sales\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    const res = mockCancelSale(
      decodeURIComponent(cancelMatch[1]),
      String((body as { reason?: string })?.reason ?? "")
    );
    if (!res.ok) throw new Error(res.error);
    return res.sale as T;
  }

  // /api/sales/[id]
  const saleMatch = path.match(/^\/api\/sales\/([^/]+)$/);
  if (saleMatch) {
    const dto = mockGetSale(decodeURIComponent(saleMatch[1]));
    if (!dto) throw new Error("الفاتورة غير موجودة");
    return dto as T;
  }

  // /api/low-stock
  if (path === "/api/low-stock") return mockLowStock() as T;

  // /api/home-stats
  if (path === "/api/home-stats") return mockHomeStats() as T;

  // /api/dashboard
  if (path === "/api/dashboard") return mockDashboard(sp) as T;

  // /api/reports
  if (path === "/api/reports") return mockReports(sp) as T;

  // /api/upload
  if (path === "/api/upload") return { url: mockUploadUrl() } as T;

  throw new Error(`وضع المعاينة: مسار غير مدعوم (${method} ${path})`);
}
