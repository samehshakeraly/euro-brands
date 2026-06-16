import { startOfDay, endOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ok, handleServerError } from "@/lib/api";
import { MOCK_MODE, mockReports, mockListProducts } from "@/lib/mock-store";
import {
  BRANCHES,
  BRANCH_LABELS,
  CATEGORY_LABELS,
  LOW_STOCK_THRESHOLD,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Insight, ReportsData } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Ctx {
  totalSales: number;
  invoicesCount: number;
  itemsSold: number;
  avgInvoice: number;
  byBranch: { branchLabel: string; total: number; count: number }[];
  byCategory: { categoryLabel: string; total: number; qty: number }[];
  topProducts: { name: string; brand: string; qty: number; revenue: number }[];
  lowStock: { name: string; branchLabel: string; size: string; quantity: number }[];
  outOfStockCount: number;
  lowStockCount: number;
  totalProducts: number;
  totalUnits: number;
}

function assemble(
  rep: Pick<
    ReportsData,
    | "totalSales"
    | "invoicesCount"
    | "itemsSold"
    | "avgInvoice"
    | "byBranch"
    | "byCategory"
    | "topProducts"
    | "lowStock"
  >,
  products: { variants: { quantity: number }[] }[]
): Ctx {
  const outOfStockCount = products.reduce(
    (n, p) => n + p.variants.filter((v) => v.quantity === 0).length,
    0
  );
  const totalUnits = products.reduce(
    (n, p) => n + p.variants.reduce((s, v) => s + v.quantity, 0),
    0
  );
  return {
    totalSales: rep.totalSales,
    invoicesCount: rep.invoicesCount,
    itemsSold: rep.itemsSold,
    avgInvoice: rep.avgInvoice,
    byBranch: rep.byBranch.map((b) => ({
      branchLabel: BRANCH_LABELS[b.branch],
      total: b.total,
      count: b.count,
    })),
    byCategory: rep.byCategory.map((c) => ({
      categoryLabel: CATEGORY_LABELS[c.category],
      total: c.total,
      qty: c.qty,
    })),
    topProducts: rep.topProducts.slice(0, 5),
    lowStock: rep.lowStock.slice(0, 15).map((v) => ({
      name: v.productName,
      branchLabel: BRANCH_LABELS[v.branch],
      size: v.size,
      quantity: v.quantity,
    })),
    outOfStockCount,
    lowStockCount: rep.lowStock.length,
    totalProducts: products.length,
    totalUnits,
  };
}

async function buildContext(): Promise<Ctx> {
  const now = new Date();
  const from = subDays(startOfDay(now), 29);
  const to = endOfDay(now);

  if (MOCK_MODE) {
    const sp = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    return assemble(mockReports(sp), mockListProducts(new URLSearchParams()));
  }

  // الوضع الحقيقي: تجميع من قاعدة البيانات
  const [sales, products] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        items: {
          include: { product: { select: { name: true, category: true } } },
        },
      },
    }),
    prisma.product.findMany({ include: { variants: true } }),
  ]);

  const branchMap = new Map<BranchValue, { total: number; count: number }>();
  for (const b of BRANCHES) branchMap.set(b, { total: 0, count: 0 });
  const catMap = new Map<CategoryValue, { total: number; qty: number }>();
  const prodMap = new Map<
    string,
    { name: string; brand: string; qty: number; revenue: number }
  >();
  let totalSales = 0;
  let itemsSold = 0;

  for (const sale of sales) {
    totalSales += sale.finalAmount;
    const b = branchMap.get(sale.branch as BranchValue)!;
    b.total += sale.finalAmount;
    b.count += 1;
    for (const it of sale.items) {
      itemsSold += it.quantity;
      const cat = it.product.category as CategoryValue;
      const c = catMap.get(cat) ?? { total: 0, qty: 0 };
      c.total += it.subtotal;
      c.qty += it.quantity;
      catMap.set(cat, c);
      const p = prodMap.get(it.productId) ?? {
        name: it.product.name,
        brand: "",
        qty: 0,
        revenue: 0,
      };
      p.qty += it.quantity;
      p.revenue += it.subtotal;
      prodMap.set(it.productId, p);
    }
  }

  const lowStock = products
    .flatMap((p) =>
      p.variants
        .filter((v) => v.quantity <= LOW_STOCK_THRESHOLD)
        .map((v) => ({
          productName: p.name,
          brand: p.brand,
          branch: v.branch as BranchValue,
          size: v.size,
          quantity: v.quantity,
        }))
    )
    .sort((a, b) => a.quantity - b.quantity);

  const rep = {
    totalSales,
    invoicesCount: sales.length,
    itemsSold,
    avgInvoice: sales.length ? totalSales / sales.length : 0,
    byBranch: [...branchMap.entries()].map(([branch, v]) => ({
      branch,
      total: v.total,
      count: v.count,
    })),
    byCategory: [...catMap.entries()].map(([category, v]) => ({
      category,
      total: v.total,
      qty: v.qty,
    })),
    topProducts: [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    lowStock,
  };

  return assemble(rep as any, products);
}

// ---- التحليلات المبنية على القواعد (احتياطي) ----
function ruleBasedInsights(ctx: Ctx): Insight[] {
  const out: Insight[] = [];

  if (ctx.totalSales === 0) {
    out.push({
      type: "warning",
      category: "المبيعات",
      title: "لا توجد مبيعات في آخر 30 يوماً",
      description: "لم تُسجَّل أي فاتورة خلال الفترة. تأكد من تشغيل نقطة البيع وتسجيل العمليات.",
    });
  } else {
    out.push({
      type: "success",
      category: "المبيعات",
      title: "ملخّص أداء آخر 30 يوماً",
      description: `إجمالي المبيعات ${formatCurrency(ctx.totalSales)} من ${formatNumber(ctx.invoicesCount)} فاتورة، بمتوسط ${formatCurrency(ctx.avgInvoice)} للفاتورة.`,
    });
  }

  if (ctx.outOfStockCount > 0) {
    out.push({
      type: "danger",
      category: "المخزون",
      title: "أصناف نفدت من المخزون",
      description: `يوجد ${formatNumber(ctx.outOfStockCount)} مقاس نفدت كميته بالكامل. أعد تزويدها لتفادي خسارة مبيعات.`,
    });
  }
  if (ctx.lowStockCount > 0) {
    out.push({
      type: "warning",
      category: "المخزون",
      title: "أصناف قاربت على النفاد",
      description: `${formatNumber(ctx.lowStockCount)} صنف وصل إلى حد التنبيه (${LOW_STOCK_THRESHOLD} أو أقل). خطّط لإعادة الطلب قريباً.`,
    });
  }

  if (ctx.topProducts[0] && ctx.topProducts[0].qty > 0) {
    const tp = ctx.topProducts[0];
    out.push({
      type: "success",
      category: "المنتجات",
      title: `الأكثر مبيعاً: ${tp.name}`,
      description: `تم بيع ${formatNumber(tp.qty)} قطعة بإيراد ${formatCurrency(tp.revenue)}. حافظ على توفّره باستمرار.`,
    });
  }

  const branches = [...ctx.byBranch].sort((a, b) => b.total - a.total);
  if (branches.length && branches[0].total > 0) {
    out.push({
      type: "success",
      category: "الفروع",
      title: `الفرع الأعلى أداءً: ${branches[0].branchLabel}`,
      description: `حقّق ${formatCurrency(branches[0].total)} من ${formatNumber(branches[0].count)} فاتورة. قارن بأداء بقية الفروع لتحسين التوزيع.`,
    });
  }

  const cats = [...ctx.byCategory].sort((a, b) => b.total - a.total);
  if (cats.length && cats[0].total > 0) {
    out.push({
      type: "success",
      category: "الفئات",
      title: `الفئة الأعلى مبيعاً: ${cats[0].categoryLabel}`,
      description: `ساهمت بإيراد ${formatCurrency(cats[0].total)}. ركّز على تنويع معروضاتها.`,
    });
  }

  return out;
}

// ---- استدعاء Gemini ----
async function geminiInsights(ctx: Ctx): Promise<Insight[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];

  const prompt = `أنت محلل بيانات خبير لمتجر تجزئة للملابس والأحذية والعطور في مصر اسمه "Euro Brands" بفرعين.
حلّل بيانات آخر 30 يوماً ومستويات المخزون الحالية التالية، وقدّم رؤى عملية ومحددة باللغة العربية تساعد الإدارة على اتخاذ قرارات.
أعد فقط مصفوفة JSON (دون أي نص إضافي) من 4 إلى 6 عناصر، كل عنصر بالحقول:
- "title": عنوان قصير
- "description": شرح عملي بجملة أو جملتين
- "type": واحدة من "success" أو "warning" أو "danger"
- "category": فئة قصيرة مثل: المبيعات، المخزون، المنتجات، الفروع
البيانات:
${JSON.stringify(ctx)}`;

  // gemini-1.5-flash تم إيقافه؛ نستخدم نموذج Flash حديثاً (قابل للتهيئة)
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseInsights(text);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseInsights(text?: string): Insight[] {
  if (!text) return [];
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let arr: unknown;
  try {
    arr = JSON.parse(t);
  } catch {
    const m = t.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        arr = JSON.parse(m[0]);
      } catch {
        return [];
      }
    }
  }
  if (!Array.isArray(arr)) return [];
  const types = new Set(["success", "warning", "danger"]);
  return arr
    .filter(
      (x): x is Record<string, unknown> =>
        !!x &&
        typeof x === "object" &&
        typeof (x as any).title === "string" &&
        typeof (x as any).description === "string"
    )
    .map((x) => ({
      title: String(x.title).slice(0, 140),
      description: String(x.description).slice(0, 400),
      type: (types.has(x.type as string) ? x.type : "success") as Insight["type"],
      category:
        typeof x.category === "string" ? String(x.category).slice(0, 40) : "عام",
    }))
    .slice(0, 8);
}

// GET /api/insights — رؤى ذكية (Gemini مع احتياطي القواعد)
export async function GET() {
  try {
    const ctx = await buildContext();
    const ai = await geminiInsights(ctx);
    const insights = ai.length > 0 ? ai : ruleBasedInsights(ctx);
    return ok({
      insights,
      source: ai.length > 0 ? "ai" : "rules",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleServerError(error);
  }
}
