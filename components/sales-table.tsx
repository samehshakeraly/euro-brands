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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-right text-sm">
        <thead>
          <tr className="border-b text-muted">
            <th className="px-3 py-3 font-medium">رقم الفاتورة</th>
            <th className="px-3 py-3 font-medium">التاريخ</th>
            <th className="px-3 py-3 font-medium">الفرع</th>
            <th className="px-3 py-3 font-medium">العميل</th>
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
  );
}
