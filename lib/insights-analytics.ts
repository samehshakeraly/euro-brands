import { subDays } from "date-fns";
import { round2 } from "./sale-utils";
import { BRANCHES, type BranchValue, type CategoryValue } from "./constants";
import type { InsightsData } from "./types";

// أشكال موحّدة تُغذّي التحليل من وضع المعاينة أو قاعدة البيانات
export interface NormItem {
  productId: string;
  name: string;
  brand: string;
  category: CategoryValue;
  quantity: number;
  subtotal: number;
}
export interface NormSale {
  branch: BranchValue;
  finalAmount: number;
  totalAmount: number;
  createdAt: Date;
  items: NormItem[];
}
export interface NormVariant {
  quantity: number;
  minQuantity: number;
  branch: BranchValue;
  size: string;
}
export interface NormProduct {
  id: string;
  name: string;
  brand: string;
  category: CategoryValue;
  totalQuantity: number;
  variants: NormVariant[];
}

export interface AiContext {
  rangeDays: number;
  totalSales: number;
  invoices: number;
  topProducts: { name: string; brand: string; qty: number; revenue: number }[];
  slowProducts: { name: string; brand: string; stock: number }[];
  lowStockCount: number;
  branches: { branch: string; total: number }[];
  month: number;
}

const AR_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export function computeInsights(
  sales: NormSale[],
  products: NormProduct[],
  now: Date
): {
  alerts: InsightsData["alerts"];
  performance: InsightsData["performance"];
  aiContext: AiContext;
} {
  const wk1Start = subDays(now, 7); // هذا الأسبوع
  const wk2Start = subDays(now, 14); // الأسبوع الماضي
  const d14 = subDays(now, 14);

  // ---- تنبيهات: قلة المخزون ----
  const lowStock = products
    .flatMap((p) =>
      p.variants
        .filter((v) => v.quantity <= v.minQuantity)
        .map((v) => ({
          id: `${p.id}-${v.branch}-${v.size}`,
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          branch: v.branch,
          size: v.size,
          quantity: v.quantity,
          minQuantity: v.minQuantity,
        }))
    )
    .sort((a, b) => a.quantity - a.minQuantity - (b.quantity - b.minQuantity))
    .slice(0, 50);

  // ---- تنبيهات: مخزون راكد (بلا مبيعات في آخر 14 يوماً وبه كمية) ----
  const sold14 = new Set<string>();
  for (const s of sales)
    if (s.createdAt >= d14) for (const it of s.items) sold14.add(it.productId);
  const deadStock = products
    .filter((p) => p.totalQuantity > 0 && !sold14.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      quantity: p.totalQuantity,
    }))
    .slice(0, 50);

  // ---- تنبيهات: تراجع مبيعات فرع > 20% مقارنة بالأسبوع الماضي ----
  const brThis = new Map<BranchValue, number>();
  const brLast = new Map<BranchValue, number>();
  for (const b of BRANCHES) {
    brThis.set(b, 0);
    brLast.set(b, 0);
  }
  for (const s of sales) {
    if (s.createdAt >= wk1Start)
      brThis.set(s.branch, (brThis.get(s.branch) ?? 0) + s.finalAmount);
    else if (s.createdAt >= wk2Start)
      brLast.set(s.branch, (brLast.get(s.branch) ?? 0) + s.finalAmount);
  }
  const branchDrops = BRANCHES.map((b) => {
    const tw = brThis.get(b) ?? 0;
    const lw = brLast.get(b) ?? 0;
    const dropPct = lw > 0 ? ((lw - tw) / lw) * 100 : 0;
    return {
      branch: b,
      thisWeek: round2(tw),
      lastWeek: round2(lw),
      dropPct: Math.round(dropPct),
    };
  }).filter((x) => x.dropPct > 20);

  // ---- الأداء: نمو المنتجات (هذا الأسبوع مقابل الماضي) ----
  const pqThis = new Map<string, { name: string; brand: string; qty: number }>();
  const pqLast = new Map<string, number>();
  for (const s of sales) {
    const isThis = s.createdAt >= wk1Start;
    const isLast = !isThis && s.createdAt >= wk2Start;
    if (!isThis && !isLast) continue;
    for (const it of s.items) {
      if (isThis) {
        const e = pqThis.get(it.productId) ?? {
          name: it.name,
          brand: it.brand,
          qty: 0,
        };
        e.qty += it.quantity;
        pqThis.set(it.productId, e);
      } else {
        pqLast.set(it.productId, (pqLast.get(it.productId) ?? 0) + it.quantity);
      }
    }
  }
  const topGrowth = [...pqThis.entries()]
    .map(([productId, e]) => {
      const lw = pqLast.get(productId) ?? 0;
      const growthPct =
        lw > 0 ? Math.round(((e.qty - lw) / lw) * 100) : e.qty > 0 ? 100 : 0;
      return {
        productId,
        name: e.name,
        brand: e.brand,
        thisWeekQty: e.qty,
        lastWeekQty: lw,
        growthPct,
      };
    })
    .sort((a, b) => b.growthPct - a.growthPct)
    .slice(0, 5);

  // ---- الأداء: أفضل فرع هذا الأسبوع ----
  const branchTotals = BRANCHES.map((b) => ({ branch: b, total: brThis.get(b) ?? 0 }));
  const totalThis = branchTotals.reduce((s, x) => s + x.total, 0);
  const sortedBranch = [...branchTotals].sort((a, b) => b.total - a.total);
  const bestBranch =
    totalThis > 0
      ? {
          branch: sortedBranch[0].branch,
          total: round2(sortedBranch[0].total),
          share: Math.round((sortedBranch[0].total / totalThis) * 100),
        }
      : null;

  // ---- الأداء: ذروة الأيام والساعات ----
  const dayMap = new Map<number, number>();
  const hourMap = new Map<number, number>();
  for (const s of sales) {
    dayMap.set(s.createdAt.getDay(), (dayMap.get(s.createdAt.getDay()) ?? 0) + s.finalAmount);
    hourMap.set(s.createdAt.getHours(), (hourMap.get(s.createdAt.getHours()) ?? 0) + s.finalAmount);
  }
  const peakDays = [...dayMap.entries()]
    .map(([day, total]) => ({ day, label: AR_DAYS[day], total: round2(total) }))
    .sort((a, b) => b.total - a.total);
  const peakHours = [...hourMap.entries()]
    .map(([hour, total]) => ({ hour, total: round2(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  // ---- سياق الذكاء الاصطناعي ----
  const prodRange = new Map<
    string,
    { name: string; brand: string; qty: number; revenue: number }
  >();
  let totalSales = 0;
  for (const s of sales) {
    totalSales += s.finalAmount;
    for (const it of s.items) {
      const e = prodRange.get(it.productId) ?? {
        name: it.name,
        brand: it.brand,
        qty: 0,
        revenue: 0,
      };
      e.qty += it.quantity;
      e.revenue += it.subtotal;
      prodRange.set(it.productId, e);
    }
  }
  const ranked = [...prodRange.values()].sort((a, b) => b.qty - a.qty);

  const aiContext: AiContext = {
    rangeDays: 30,
    totalSales: round2(totalSales),
    invoices: sales.length,
    topProducts: ranked.slice(0, 5).map((p) => ({
      name: p.name,
      brand: p.brand,
      qty: p.qty,
      revenue: round2(p.revenue),
    })),
    slowProducts: deadStock
      .slice(0, 5)
      .map((p) => ({ name: p.name, brand: p.brand, stock: p.quantity })),
    lowStockCount: lowStock.length,
    branches: branchTotals.map((b) => ({
      branch: b.branch,
      total: round2(b.total),
    })),
    month: now.getMonth() + 1,
  };

  return {
    alerts: { lowStock, deadStock, branchDrops },
    performance: { topGrowth, bestBranch, peakDays, peakHours },
    aiContext,
  };
}

function seasonalHint(month: number): string {
  if (month === 3 || month === 4)
    return "اقتراب شهر رمضان والعيد — جهّز تشكيلات الملابس والعطور للمناسبات وزِد المخزون قبل الذروة.";
  if (month === 8 || month === 9)
    return "موسم العودة للمدارس — ركّز على الأحذية والملابس العملية بعروض مخصّصة للطلاب.";
  if (month >= 6 && month <= 8)
    return "ذروة الصيف — روّج للملابس الخفيفة والعطور المنعشة والأحذية الصيفية.";
  if (month >= 11 || month <= 1)
    return "موسم الشتاء والأعياد — أبرِز الهوديز والجاكيتات والأحذية الشتوية في الواجهة.";
  return "تابِع المناسبات القادمة (مهرجانات/مباريات كبرى) وخصّص عروضاً مرتبطة بها.";
}

// تحليلات احتياطية مبنية على القواعد عند تعذّر Gemini
export function fallbackAi(ctx: AiContext): InsightsData["ai"] {
  const promotions = ctx.slowProducts.slice(0, 3).map((p) => ({
    product: `${p.name} — ${p.brand}`,
    reason: `متوفّر بكمية ${p.stock} دون مبيعات تُذكر مؤخراً؛ خصم مناسب قد يُحرّك المخزون.`,
  }));
  if (promotions.length === 0 && ctx.topProducts.length > 1) {
    const weakest = ctx.topProducts[ctx.topProducts.length - 1];
    promotions.push({
      product: `${weakest.name} — ${weakest.brand}`,
      reason: "مبيعاته أقل من بقية المنتجات الرائجة؛ عرض ترويجي قد ينشّطه.",
    });
  }

  const top = ctx.topProducts[0];
  const adIdeas = [
    top
      ? `أبرِز «${top.name}» (الأكثر مبيعاً) في إعلان قصير على إنستغرام مع كود خصم محدود المدة.`
      : "أطلق إعلاناً قصيراً يبرز أكثر منتجاتك رواجاً مع كود خصم.",
    "أنشئ حزمة (Bundle) تجمع منتجاً رائجاً مع آخر بطيء الحركة بسعر مغرٍ لتصريف المخزون.",
  ];

  const pricing = ctx.slowProducts.slice(0, 3).map((p) => ({
    product: `${p.name} — ${p.brand}`,
    suggestion: "خفّض السعر 10–15% أو اعرضه ضمن تخفيضات نهاية الموسم.",
  }));

  return { promotions, adIdeas, seasonal: seasonalHint(ctx.month), pricing };
}
