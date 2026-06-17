"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  ReceiptText,
  Boxes,
  Calculator,
  AlertTriangle,
  Trophy,
  FileDown,
  FileSpreadsheet,
  Tag,
  Users,
  PackageX,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { useFetch } from "@/lib/use-fetch";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StockBadge, BranchBadge } from "@/components/ui/badge";
import { SalesLineChart } from "@/components/charts/sales-line-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { BranchBarChart } from "@/components/charts/branch-bar-chart";
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
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const avgDaily = useMemo(() => {
    if (!data || data.dailySales.length === 0) return 0;
    return data.totalSales / data.dailySales.length;
  }, [data]);

  const discountPct = data?.grossSales
    ? (data.discountTotal / data.grossSales) * 100
    : 0;

  async function exportPdf() {
    if (!data || !range) return;
    setExporting("pdf");
    try {
      const { generateReportPdf } = await import("@/lib/pdf/report-pdf");
      await generateReportPdf(data, range);
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setExporting(null);
    }
  }

  async function exportExcel() {
    if (!data || !range) return;
    setExporting("excel");
    try {
      const { generateReportExcel } = await import("@/lib/excel-report");
      await generateReportExcel(data, range);
    } catch {
      toast.error("تعذّر إنشاء ملف Excel");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="التقارير"
        description="تحليل تفصيلي للمبيعات والمنتجات والمخزون"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker onChange={setRange} />
            <button
              onClick={exportExcel}
              disabled={!data || exporting !== null}
              className="btn btn-secondary"
            >
              {exporting === "excel" ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              تصدير Excel
            </button>
            <button
              onClick={exportPdf}
              disabled={!data || exporting !== null}
              className="btn btn-secondary"
            >
              {exporting === "pdf" ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              تصدير PDF
            </button>
          </div>
        }
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
              subtitle={`متوسط يومي ${formatCurrency(avgDaily)}`}
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

          {/* إحصائيات الخصومات */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              tone="warning"
              title="إجمالي الخصومات"
              value={formatCurrency(data.discountTotal)}
              subtitle={`من إجمالي ${formatCurrency(data.grossSales)} قبل الخصم`}
              icon={<Tag className="h-5 w-5" />}
            />
            <StatCard
              tone="warning"
              title="فواتير عليها خصم"
              value={formatNumber(data.discountedCount)}
              subtitle={`من ${formatNumber(data.invoicesCount)} فاتورة`}
              icon={<ReceiptText className="h-5 w-5" />}
            />
            <StatCard
              tone="warning"
              title="نسبة الخصم من المبيعات"
              value={`${formatNumber(Math.round(discountPct * 100) / 100)}%`}
              icon={<Calculator className="h-5 w-5" />}
            />
          </div>

          {/* الرسوم: المبيعات اليومية + الفئة */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-1 text-base font-bold text-text">
                المبيعات خلال الفترة
              </h2>
              <p className="mb-3 text-xs text-muted nums">
                الخط المتقطع = المتوسط اليومي ({formatCurrency(avgDaily)})
              </p>
              <SalesLineChart data={data.dailySales} avg={avgDaily} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-text">
                المبيعات حسب الفئة
              </h2>
              <CategoryPieChart data={data.byCategory} />
            </Card>
          </div>

          {/* مقارنة الفروع (أعمدة) */}
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold text-text">
              مقارنة مبيعات الفروع
            </h2>
            <BranchBarChart data={data.byBranch} />
          </Card>

          {/* أفضل المنتجات + أصناف منخفضة */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <Trophy className="h-5 w-5 text-success" />
                أفضل 5 منتجات مبيعاً
              </h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="لا توجد مبيعات" description="لم تُسجّل مبيعات في هذه الفترة." />
              ) : (
                <div className="space-y-2">
                  {data.topProducts.slice(0, 5).map((p, i) => (
                    <div
                      key={`${p.name}-${i}`}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--surface-2)]">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text">{p.name}</p>
                        <p className="text-xs text-muted">{p.brand}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="font-bold text-text nums">
                          {formatNumber(p.qty)} قطعة
                        </p>
                        <p className="text-xs text-muted nums">
                          {formatCurrency(p.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <AlertTriangle className="h-5 w-5 text-warning" />
                أصناف تحتاج تزويد
              </h2>
              {data.lowStock.length === 0 ? (
                <EmptyState title="المخزون بحالة جيدة" description="لا توجد أصناف منخفضة الكمية." />
              ) : (
                <div className="max-h-[330px] space-y-2 overflow-y-auto">
                  {data.lowStock.map((v) => (
                    <div key={v.id} className="rounded-lg border p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {v.productName}
                          </p>
                          <p className="text-xs text-muted">{v.brand}</p>
                        </div>
                        <StockBadge quantity={v.quantity} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <BranchBadge branch={v.branch} />
                        <span className="badge bg-[var(--surface-2)] text-muted nums">
                          مقاس {v.size}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* أفضل العملاء + منتجات راكدة */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <Users className="h-5 w-5 text-accent" />
                أفضل 5 عملاء
              </h2>
              {data.topCustomers.length === 0 ? (
                <EmptyState
                  title="لا توجد بيانات عملاء"
                  description="ستظهر هنا أعلى العملاء شراءً ممن أدخلوا بياناتهم."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b text-muted">
                        <th className="px-2 py-2 font-medium">العميل</th>
                        <th className="px-2 py-2 font-medium">الفواتير</th>
                        <th className="px-2 py-2 font-medium">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers.map((c, i) => (
                        <tr key={i} className="border-b border-[var(--border)]">
                          <td className="px-2 py-2.5">
                            <p className="font-medium text-text">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted nums">{c.phone}</p>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-text nums">
                            {formatNumber(c.count)}
                          </td>
                          <td className="px-2 py-2.5 font-bold text-text nums">
                            {formatCurrency(c.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <PackageX className="h-5 w-5 text-muted" />
                منتجات راكدة (بلا مبيعات في الفترة)
              </h2>
              {data.slowMoving.length === 0 ? (
                <EmptyState
                  title="لا توجد منتجات راكدة"
                  description="جميع المنتجات المتوفرة سُجّلت لها مبيعات."
                />
              ) : (
                <div className="max-h-[330px] space-y-2 overflow-y-auto">
                  {data.slowMoving.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">{p.name}</p>
                        <p className="text-xs text-muted">{p.brand}</p>
                      </div>
                      <span className="badge bg-[var(--surface-2)] text-muted nums">
                        المخزون: {formatNumber(p.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
