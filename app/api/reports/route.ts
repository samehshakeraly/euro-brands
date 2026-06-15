import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  format,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { ok, handleServerError } from "@/lib/api";
import { round2 } from "@/lib/sale-utils";
import {
  BRANCHES,
  LOW_STOCK_THRESHOLD,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";
import type { ReportsData } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/reports?from=&to= — تقارير تفصيلية
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : subDays(startOfDay(now), 29);
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : endOfDay(now);

    const [sales, lowStockVariants] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, brand: true, category: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.productVariant.findMany({
        where: { quantity: { lte: LOW_STOCK_THRESHOLD } },
        include: { product: { select: { name: true, brand: true } } },
        orderBy: { quantity: "asc" },
        take: 100,
      }),
    ]);

    const branchMap = new Map<BranchValue, { total: number; count: number }>();
    for (const b of BRANCHES) branchMap.set(b, { total: 0, count: 0 });

    const categoryMap = new Map<
      CategoryValue,
      { total: number; qty: number }
    >();
    const productMap = new Map<
      string,
      { name: string; brand: string; qty: number; revenue: number }
    >();

    const dayBuckets = new Map<string, number>();
    for (const d of eachDayOfInterval({ start: from, end: to })) {
      dayBuckets.set(format(d, "yyyy-MM-dd"), 0);
    }

    let totalSales = 0;
    let itemsSold = 0;

    for (const sale of sales) {
      totalSales += sale.finalAmount;

      const b = branchMap.get(sale.branch as BranchValue)!;
      b.total += sale.finalAmount;
      b.count += 1;

      const key = format(sale.createdAt, "yyyy-MM-dd");
      if (dayBuckets.has(key))
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + sale.finalAmount);

      for (const item of sale.items) {
        itemsSold += item.quantity;

        const cat = item.product.category as CategoryValue;
        const c = categoryMap.get(cat) ?? { total: 0, qty: 0 };
        c.total += item.subtotal;
        c.qty += item.quantity;
        categoryMap.set(cat, c);

        const p = productMap.get(item.productId) ?? {
          name: item.product.name,
          brand: item.product.brand,
          qty: 0,
          revenue: 0,
        };
        p.qty += item.quantity;
        p.revenue += item.subtotal;
        productMap.set(item.productId, p);
      }
    }

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: round2(p.revenue) }));

    const result: ReportsData = {
      totalSales: round2(totalSales),
      invoicesCount: sales.length,
      itemsSold,
      avgInvoice: sales.length ? round2(totalSales / sales.length) : 0,
      byBranch: [...branchMap.entries()].map(([branch, v]) => ({
        branch,
        total: round2(v.total),
        count: v.count,
      })),
      byCategory: [...categoryMap.entries()].map(([category, v]) => ({
        category,
        total: round2(v.total),
        qty: v.qty,
      })),
      dailySales: [...dayBuckets.entries()].map(([date, total]) => ({
        date,
        total: round2(total),
      })),
      topProducts,
      lowStock: lowStockVariants.map((v) => ({
        id: v.id,
        productName: v.product.name,
        brand: v.product.brand,
        size: v.size,
        branch: v.branch as BranchValue,
        quantity: v.quantity,
      })),
    };

    return ok(result);
  } catch (error) {
    return handleServerError(error);
  }
}
