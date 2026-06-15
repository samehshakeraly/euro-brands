"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Printer, User, Phone, FileText } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { BranchBadge } from "@/components/ui/badge";
import type { SaleDTO } from "@/lib/types";
import {
  DISCOUNT_TYPE_LABELS,
  type DiscountTypeValue,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatSaleNumber,
} from "@/lib/format";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useFetch<SaleDTO>(`/api/sales/${params.id}`);

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Card className="p-6 text-center text-danger">
        {error || "الفاتورة غير موجودة"}
      </Card>
    );

  const discount = data.totalAmount - data.finalAmount;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع إلى السجل
        </Link>
        <button
          onClick={() => window.print()}
          className="btn btn-secondary h-9 text-sm"
        >
          <Printer className="h-4 w-4" />
          طباعة
        </button>
      </div>

      <Card className="p-6" tone="accent">
        {/* الترويسة */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-extrabold text-white">
                EB
              </span>
              <span className="text-lg font-extrabold text-text">
                Euro Brands
              </span>
            </div>
            <p className="mt-2 text-sm text-muted nums">
              {formatDateTime(data.createdAt)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-extrabold text-accent nums">
              {formatSaleNumber(data.saleNumber)}
            </p>
            <div className="mt-1">
              <BranchBadge branch={data.branch} />
            </div>
          </div>
        </div>

        {/* بيانات العميل */}
        {(data.customerName || data.customerPhone || data.customerNotes) && (
          <div className="grid grid-cols-1 gap-2 border-b py-4 text-sm sm:grid-cols-3">
            {data.customerName && (
              <p className="flex items-center gap-1.5 text-text">
                <User className="h-4 w-4 text-muted" />
                {data.customerName}
              </p>
            )}
            {data.customerPhone && (
              <p className="flex items-center gap-1.5 text-text nums">
                <Phone className="h-4 w-4 text-muted" />
                {data.customerPhone}
              </p>
            )}
            {data.customerNotes && (
              <p className="flex items-center gap-1.5 text-text sm:col-span-3">
                <FileText className="h-4 w-4 text-muted" />
                {data.customerNotes}
              </p>
            )}
          </div>
        )}

        {/* عناصر الفاتورة */}
        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[480px] text-right text-sm">
            <thead>
              <tr className="border-b text-muted">
                <th className="px-2 py-2 font-medium">المنتج</th>
                <th className="px-2 py-2 font-medium">المقاس</th>
                <th className="px-2 py-2 font-medium">السعر</th>
                <th className="px-2 py-2 font-medium">الكمية</th>
                <th className="px-2 py-2 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)]">
                  <td className="px-2 py-3">
                    <p className="font-medium text-text">{item.productName}</p>
                    <p className="text-xs text-muted">{item.brand}</p>
                  </td>
                  <td className="px-2 py-3 text-text nums">{item.size}</td>
                  <td className="px-2 py-3 text-muted nums">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-2 py-3 text-text nums">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-2 py-3 font-medium text-text nums">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الإجماليات */}
        <div className="mr-auto max-w-xs space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>الإجمالي قبل الخصم</span>
            <span className="nums">{formatCurrency(data.totalAmount)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-warning">
              <span>
                الخصم
                {data.discountType && (
                  <span className="mr-1 text-xs">
                    (
                    {data.discountType === "PERCENTAGE"
                      ? `${formatNumber(data.discountValue)}%`
                      : DISCOUNT_TYPE_LABELS[
                          data.discountType as DiscountTypeValue
                        ]}
                    )
                  </span>
                )}
              </span>
              <span className="nums">- {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-lg font-extrabold text-text">
            <span>الصافي</span>
            <span className="nums">{formatCurrency(data.finalAmount)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
