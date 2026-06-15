import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  format,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { ok, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";
import {
  BRANCHES,
  LOW_STOCK_THRESHOLD,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";
import type { DashboardStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/dashboard?from=&to= — إحصائيات لوحة التحكم
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();

    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : subDays(startOfDay(now), 6);
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : endOfDay(now);

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [rangeSales, todayAgg, lowStockCount, recent] = await Promise.all([
      // كل فواتير الفترة مع عناصرها (لحساب معظم الإحصائيات)
      prisma.sale.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          items: {
            include: { product: { select: { name: true, category: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // مبيعات اليوم
      prisma.sale.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { finalAmount: true },
        _count: true,
      }),
      // أصناف منخفضة/نافدة المخزون
      prisma.productVariant.count({
        where: { quantity: { lte: LOW_STOCK_THRESHOLD } },
      }),
      // أحدث 10 فواتير
      prisma.sale.findMany({
        include: {
          items: {
            include: {
              product: { select: { name: true, brand: true } },
              variant: { select: { size: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // مقارنة الفرعين
    const branchMap = new Map<BranchValue, { total: number; count: number }>();
    for (const b of BRANCHES) branchMap.set(b, { total: 0, count: 0 });

    // المبيعات اليومية
    const dayBuckets = new Map<string, number>();
    for (const d of eachDayOfInterval({ start: from, end: to })) {
      dayBuckets.set(format(d, "yyyy-MM-dd"), 0);
    }

    // توزيع الفئات + أكثر منتج مبيعاً
    const categoryMap = new Map<CategoryValue, number>();
    const productQty = new Map<string, { name: string; quantity: number }>();

    let rangeTotal = 0;
    for (const sale of rangeSales) {
      rangeTotal += sale.finalAmount;

      const b = branchMap.get(sale.branch as BranchValue)!;
      b.total += sale.finalAmount;
      b.count += 1;

      const key = format(sale.createdAt, "yyyy-MM-dd");
      if (dayBuckets.has(key))
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + sale.finalAmount);

      for (const item of sale.items) {
        const cat = item.product.category as CategoryValue;
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + item.subtotal);

        const cur = productQty.get(item.productId) ?? {
          name: item.product.name,
          quantity: 0,
        };
        cur.quantity += item.quantity;
        productQty.set(item.productId, cur);
      }
    }

    // أكثر منتج مبيعاً (بالكمية)
    let topProduct: DashboardStats["topProduct"] = null;
    let topQty = 0;
    for (const [, v] of productQty) {
      if (v.quantity > topQty) {
        topQty = v.quantity;
        topProduct = { name: v.name, brand: "", quantity: v.quantity };
      }
    }

    const stats: DashboardStats = {
      todaySales: todayAgg._sum.finalAmount ?? 0,
      todaySalesCount: todayAgg._count,
      rangeSales: rangeTotal,
      rangeSalesCount: rangeSales.length,
      branchComparison: [...branchMap.entries()].map(([branch, v]) => ({
        branch,
        total: v.total,
        count: v.count,
      })),
      topProduct,
      lowStockCount,
      dailySales: [...dayBuckets.entries()].map(([date, total]) => ({
        date,
        total,
      })),
      categoryBreakdown: [...categoryMap.entries()].map(([category, total]) => ({
        category,
        total,
      })),
      recentSales: recent.map(toSaleDTO),
    };

    return ok(stats);
  } catch (error) {
    return handleServerError(error);
  }
}
