"use client";

import { useState } from "react";
import {
  Banknote,
  ReceiptText,
  Boxes,
  Calculator,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StockBadge, BranchBadge } from "@/components/ui/badge";
import { SalesLineChart } from "@/components/charts/sales-line-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import type { ReportsData } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange | null>(null);
  const url = range
    ? `/api/reports?from=${encodeURIComponent(
        range.from
      )}&to=${encodeURIComponent(range.to)}`
    : null;
  const { data, loading, error } = useFetch<ReportsData>(url);

  return (
    <div>
      <PageHeader
        title="التقارير"
        description="تحليل تفصيلي للمبيعات والمنتجات والمخزون"
        actions={<DateRangePicker onChange={setRange} />}
      />

      {loading && <PageLoader />}
      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل التقارير: {error}
        </Card>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* بطاقات ملخّصة */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              tone="accent"
              title="إجمالي المبيعات"
              value={formatCurrency(data.totalSales)}
              icon={<Banknote className="h-5 w-5" />}
            />
            <StatCard
              tone="accent"
              title="عدد الفواتير"
              value={formatNumber(data.invoicesCount)}
              icon={<ReceiptText className="h-5 w-5" />}
            />
            <StatCard
              tone="success"
              title="القطع المباعة"
              value={formatNumber(data.itemsSold)}
              icon={<Boxes className="h-5 w-5" />}
            />
            <StatCard
              tone="accent"
              title="متوسط قيمة الفاتورة"
              value={formatCurrency(data.avgInvoice)}
              icon={<Calculator className="h-5 w-5" />}
            />
          </div>

          {/* الرسوم */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-text">
                المبيعات خلال الفترة
              </h2>
              <SalesLineChart data={data.dailySales} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-text">
                المبيعات حسب الفئة
              </h2>
              <CategoryPieChart data={data.byCategory} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* أكثر المنتجات مبيعاً */}
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <Trophy className="h-5 w-5 text-success" />
                أكثر المنتجات مبيعاً
              </h2>
              {data.topProducts.length === 0 ? (
                <EmptyState
                  title="لا توجد مبيعات"
                  description="لم تُسجّل مبيعات في هذه الفترة."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b text-muted">
                        <th className="px-2 py-2 font-medium">المنتج</th>
                        <th className="px-2 py-2 font-medium">الكمية</th>
                        <th className="px-2 py-2 font-medium">الإيراد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => (
                        <tr
                          key={`${p.name}-${i}`}
                          className="border-b border-[var(--border)]"
                        >
                          <td className="px-2 py-2.5">
                            <p className="font-medium text-text">{p.name}</p>
                            <p className="text-xs text-muted">{p.brand}</p>
                          </td>
                          <td className="px-2 py-2.5 text-text nums">
                            {formatNumber(p.qty)}
                          </td>
                          <td className="px-2 py-2.5 font-medium text-text nums">
                            {formatCurrency(p.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* أصناف منخفضة المخزون */}
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <AlertTriangle className="h-5 w-5 text-warning" />
                أصناف تحتاج تزويد
              </h2>
              {data.lowStock.length === 0 ? (
                <EmptyState
                  title="المخزون بحالة جيدة"
                  description="لا توجد أصناف منخفضة أو نافدة الكمية."
                />
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b text-muted">
                        <th className="px-2 py-2 font-medium">المنتج</th>
                        <th className="px-2 py-2 font-medium">الفرع</th>
                        <th className="px-2 py-2 font-medium">المقاس</th>
                        <th className="px-2 py-2 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStock.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-[var(--border)]"
                        >
                          <td className="px-2 py-2.5">
                            <p className="font-medium text-text">
                              {v.productName}
                            </p>
                            <p className="text-xs text-muted">{v.brand}</p>
                          </td>
                          <td className="px-2 py-2.5">
                            <BranchBadge branch={v.branch} />
                          </td>
                          <td className="px-2 py-2.5 text-text nums">
                            {v.size}
                          </td>
                          <td className="px-2 py-2.5">
                            <StockBadge quantity={v.quantity} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
