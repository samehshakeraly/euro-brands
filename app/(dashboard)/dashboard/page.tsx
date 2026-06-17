"use client";

import { useState } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Award,
  AlertTriangle,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { StatCard, Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { SalesTable } from "@/components/sales-table";
import { BranchBadge, StockBadge } from "@/components/ui/badge";
import { SalesLineChart } from "@/components/charts/sales-line-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import type { DashboardStats, LowStockResponse } from "@/lib/types";
import { BRANCH_LABELS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange | null>(null);
  const url = range
    ? `/api/dashboard?from=${encodeURIComponent(
        range.from
      )}&to=${encodeURIComponent(range.to)}`
    : null;
  const { data, loading, error } = useFetch<DashboardStats>(url);
  const { data: lowStock } = useFetch<LowStockResponse>("/api/low-stock");

  return (
    <div>
      <PageHeader
        title="الرئيسية"
        description="نظرة عامة على أداء المبيعات والمخزون"
        actions={<DateRangePicker onChange={setRange} />}
      />

      {loading && <PageLoader />}

      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل البيانات: {error}
        </Card>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* البطاقات */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              tone="accent"
              title="مبيعات اليوم"
              value={formatCurrency(data.todaySales)}
              subtitle={`${formatNumber(data.todaySalesCount)} فاتورة`}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <StatCard
              tone="accent"
              title="مبيعات الفترة المحددة"
              value={formatCurrency(data.rangeSales)}
              subtitle={`${formatNumber(data.rangeSalesCount)} فاتورة`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              tone="success"
              title="أكثر منتج مبيعاً"
              value={
                data.topProduct ? (
                  <span className="text-lg">{data.topProduct.name}</span>
                ) : (
                  "—"
                )
              }
              subtitle={
                data.topProduct
                  ? `${formatNumber(data.topProduct.quantity)} قطعة مباعة`
                  : "لا توجد مبيعات في الفترة"
              }
              icon={<Award className="h-5 w-5" />}
            />
            <StatCard
              tone="warning"
              title="أصناف تحتاج تزويد"
              value={formatNumber(lowStock?.count ?? data.lowStockCount)}
              subtitle="الكمية ≤ الحد الأدنى"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          {/* تنبيه قلة المخزون */}
          {lowStock && lowStock.count > 0 && (
            <Card className="p-5" tone="warning">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-text">
                <AlertTriangle className="h-5 w-5 text-warning" />
                تنبيه قلة المخزون
                <span className="badge bg-[rgba(201,133,26,0.14)] text-warning nums">
                  {formatNumber(lowStock.count)}
                </span>
              </h2>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {lowStock.items.slice(0, 30).map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">
                        {it.productName}
                        <span className="mr-1 text-xs text-muted">
                          ({it.brand})
                        </span>
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <BranchBadge branch={it.branch} />
                        <span className="badge bg-[var(--surface-2)] text-muted nums">
                          مقاس {it.size}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted nums">
                        الحد الأدنى: {formatNumber(it.minQuantity)}
                      </span>
                      <StockBadge quantity={it.quantity} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-text">
                المبيعات اليومية
              </h2>
              <SalesLineChart data={data.dailySales} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-text">
                توزيع المبيعات حسب الفئة
              </h2>
              <CategoryPieChart data={data.categoryBreakdown} />
            </Card>
          </div>

          {/* مقارنة الفرعين + أحدث الفواتير */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-text">
                مقارنة مبيعات الفرعين
              </h2>
              <BranchComparison data={data.branchComparison} />
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-text">
                أحدث الفواتير
              </h2>
              {data.recentSales.length === 0 ? (
                <EmptyState
                  title="لا توجد فواتير بعد"
                  description="ستظهر هنا أحدث عمليات البيع فور تسجيلها."
                />
              ) : (
                <SalesTable sales={data.recentSales} />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchComparison({
  data,
}: {
  data: DashboardStats["branchComparison"];
}) {
  const max = Math.max(...data.map((b) => b.total), 1);
  return (
    <div className="space-y-5">
      {data.map((b) => (
        <div key={b.branch}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-text">
              {BRANCH_LABELS[b.branch]}
            </span>
            <span className="text-muted nums">{b.count} فاتورة</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(b.total / max) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm font-bold text-text nums">
            {formatCurrency(b.total)}
          </p>
        </div>
      ))}
    </div>
  );
}
