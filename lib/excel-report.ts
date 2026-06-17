import { format } from "date-fns";
import { BRANCH_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import type { ReportsData } from "@/lib/types";

// تصدير التقرير إلى Excel بأوراق منفصلة: ملخص، المنتجات، العملاء، المخزون
export async function generateReportExcel(
  data: ReportsData,
  range: { from: string; to: string }
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  const fromD = format(new Date(range.from), "yyyy/MM/dd");
  const toD = format(new Date(range.to), "yyyy/MM/dd");
  const discountPct = data.grossSales
    ? Math.round((data.discountTotal / data.grossSales) * 10000) / 100
    : 0;

  // ---- ملخص ----
  const summary: (string | number)[][] = [
    ["تقرير Euro Brands"],
    ["الفترة", `${fromD} - ${toD}`],
    ["تاريخ التقرير", format(new Date(), "yyyy/MM/dd HH:mm")],
    [],
    ["البيان", "القيمة"],
    ["إجمالي المبيعات (الصافي)", data.totalSales],
    ["قبل الخصم", data.grossSales],
    ["إجمالي الخصومات", data.discountTotal],
    ["فواتير عليها خصم", data.discountedCount],
    ["نسبة الخصم %", discountPct],
    ["عدد الفواتير", data.invoicesCount],
    ["القطع المباعة", data.itemsSold],
    ["متوسط الفاتورة", data.avgInvoice],
    [],
    ["مقارنة الفروع"],
    ["الفرع", "عدد الفواتير", "الإجمالي"],
    ...data.byBranch.map((b) => [BRANCH_LABELS[b.branch], b.count, b.total]),
    [],
    ["المبيعات حسب الفئة"],
    ["الفئة", "الكمية", "الإيراد"],
    ...data.byCategory.map((c) => [CATEGORY_LABELS[c.category], c.qty, c.total]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص");

  // ---- المنتجات ----
  const products: (string | number)[][] = [
    ["أفضل المنتجات مبيعاً"],
    ["المنتج", "البراند", "الكمية المباعة", "الإيراد"],
    ...data.topProducts.map((p) => [p.name, p.brand, p.qty, p.revenue]),
    [],
    ["منتجات راكدة (في المخزون بلا مبيعات في الفترة)"],
    ["المنتج", "البراند", "المخزون"],
    ...data.slowMoving.map((p) => [p.name, p.brand, p.quantity]),
  ];
  const wsProducts = XLSX.utils.aoa_to_sheet(products);
  wsProducts["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsProducts, "المنتجات");

  // ---- العملاء ----
  const customers: (string | number)[][] = [
    ["أفضل العملاء حسب قيمة الشراء"],
    ["العميل", "الهاتف", "عدد الفواتير", "إجمالي الشراء"],
    ...data.topCustomers.map((c) => [
      c.name,
      c.phone ?? "",
      c.count,
      c.total,
    ]),
  ];
  const wsCustomers = XLSX.utils.aoa_to_sheet(customers);
  wsCustomers["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCustomers, "العملاء");

  // ---- المخزون ----
  const inventory: (string | number)[][] = [
    ["أصناف تحتاج تزويد"],
    ["المنتج", "البراند", "الفرع", "المقاس", "الكمية"],
    ...data.lowStock.map((v) => [
      v.productName,
      v.brand,
      BRANCH_LABELS[v.branch],
      v.size,
      v.quantity,
    ]),
  ];
  const wsInv = XLSX.utils.aoa_to_sheet(inventory);
  wsInv["!cols"] = [
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInv, "المخزون");

  XLSX.writeFile(wb, `euro-brands-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}
