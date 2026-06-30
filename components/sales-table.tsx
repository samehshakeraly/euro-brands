import Link from "next/link";
import { Eye } from "lucide-react";
import type { SaleDTO } from "@/lib/types";
import { BranchBadge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime, formatSaleNumber } from "@/lib/format";

export function SalesTable({
  sales,
  showActions = true,
}: {
  sales: SaleDTO[];
  showActions?: boolean;
}) {
  return (
    <>
      {/* جدول لسطح المكتب */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead>
            <tr className="border-b text-muted">
              <th className="px-3 py-3 font-medium">رقم الفاتورة</th>
              <th className="px-3 py-3 font-medium">التاريخ</th>
              <th className="px-3 py-3 font-medium">الفرع</th>
              <th className="px-3 py-3 font-medium">العميل</th>
              <th className="px-3 py-3 font-medium">الكاشير</th>
              <th className="px-3 py-3 font-medium">الإجمالي</th>
              <th className="px-3 py-3 font-medium">الخصم</th>
              <th className="px-3 py-3 font-medium">الصافي</th>
              {showActions && <th className="px-3 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const discount = sale.totalAmount - sale.finalAmount;
              return (
                <tr
                  key={sale.id}
                  className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="px-3 py-3 font-bold text-accent nums">
                    {formatSaleNumber(sale.saleNumber)}
                  </td>
                  <td className="px-3 py-3 text-muted nums whitespace-nowrap">
                    {formatDateTime(sale.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <BranchBadge branch={sale.branch} />
                  </td>
                  <td className="px-3 py-3 text-text">
                    {sale.customerName || (
                      <span className="text-muted">عميل عابر</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-text">
                    {sale.cashierName || <span className="text-muted">—</span>}
                  </td>
                  <td className="px-3 py-3 text-text nums">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="px-3 py-3 nums">
                    {discount > 0 ? (
                      <span className="text-warning">
                        {formatCurrency(discount)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-bold text-text nums">
                    {formatCurrency(sale.finalAmount)}
                  </td>
                  {showActions && (
                    <td className="px-3 py-3">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="btn btn-ghost h-8 gap-1 px-2 text-xs"
                      >
                        <Eye className="h-4 w-4" />
                        عرض
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* قائمة بطاقات للموبايل */}
      <div className="space-y-3 sm:hidden">
        {sales.map((sale) => {
          const discount = sale.totalAmount - sale.finalAmount;
          return (
            <div key={sale.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-accent nums">
                    {formatSaleNumber(sale.saleNumber)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted nums">
                    {formatDateTime(sale.createdAt)}
                  </p>
                </div>
                <BranchBadge branch={sale.branch} />
              </div>

              <p className="mt-3 text-sm text-text">
                {sale.customerName || (
                  <span className="text-muted">عميل عابر</span>
                )}
                {sale.customerPhone && (
                  <span className="text-muted nums"> · {sale.customerPhone}</span>
                )}
              </p>
              {sale.cashierName && (
                <p className="mt-1 text-xs text-muted">
                  الكاشير: {sale.cashierName}
                </p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-sm">
                <div>
                  <p className="text-xs text-muted">الإجمالي</p>
                  <p className="mt-0.5 text-text nums">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">الخصم</p>
                  <p className="mt-0.5 nums">
                    {discount > 0 ? (
                      <span className="text-warning">
                        {formatCurrency(discount)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">الصافي</p>
                  <p className="mt-0.5 font-bold text-text nums">
                    {formatCurrency(sale.finalAmount)}
                  </p>
                </div>
              </div>

              {showActions && (
                <Link
                  href={`/sales/${sale.id}`}
                  className="btn btn-secondary mt-3 h-11 w-full"
                >
                  <Eye className="h-4 w-4" />
                  عرض التفاصيل
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
