import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "./arabic";
import { TAJAWAL_REGULAR_BASE64, TAJAWAL_BOLD_BASE64 } from "./tajawal-font";
import { BRANCH_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import type { ReportsData } from "@/lib/types";

const ACCENT: [number, number, number] = [108, 99, 255];
const MUTED: [number, number, number] = [120, 124, 140];
const DARK: [number, number, number] = [26, 29, 46];

// أرقام بالخانات الغربية لتفادي مشاكل الاتجاه في PDF
function num(x: number): string {
  return (Math.round(x * 100) / 100).toLocaleString("en-US");
}
const money = (x: number) => `${num(x)} ج.م`;

// عكس ترتيب الأعمدة (لـ RTL) مع تشكيل كل خلية
const R = (cells: string[]) => cells.slice().reverse().map((c) => ar(c));

export function generateReportPdf(
  data: ReportsData,
  range: { from: string; to: string }
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // تسجيل خط Tajawal (عادي + عريض)
  doc.addFileToVFS("Tajawal-Regular.ttf", TAJAWAL_REGULAR_BASE64);
  doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
  doc.addFileToVFS("Tajawal-Bold.ttf", TAJAWAL_BOLD_BASE64);
  doc.addFont("Tajawal-Bold.ttf", "Tajawal", "bold");
  doc.setFont("Tajawal", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const right = pageW - margin;

  // ---- الترويسة ----
  doc.setFont("Tajawal", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...ACCENT);
  doc.text(ar("تقرير Euro Brands"), right, 50, { align: "right" });

  doc.setFont("Tajawal", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const fromD = format(new Date(range.from), "yyyy/MM/dd");
  const toD = format(new Date(range.to), "yyyy/MM/dd");
  doc.text(ar(`الفترة: من ${fromD} إلى ${toD}`), right, 70, { align: "right" });
  doc.text(
    ar(`تاريخ التقرير: ${format(new Date(), "yyyy/MM/dd HH:mm")}`),
    right,
    86,
    { align: "right" }
  );

  let y = 110;

  const sectionTitle = (title: string, atY: number) => {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(ar(title), right, atY, { align: "right" });
    return atY + 8;
  };

  const tableFont = {
    font: "Tajawal",
    halign: "right" as const,
    fontSize: 10,
    cellPadding: 5,
  };
  const headStyle = {
    font: "Tajawal",
    fontStyle: "bold" as const,
    fillColor: ACCENT,
    textColor: [255, 255, 255] as [number, number, number],
    halign: "right" as const,
  };
  const finalY = () => (doc as any).lastAutoTable.finalY as number;

  // ---- ملخّص ----
  y = sectionTitle("الملخّص", y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    styles: tableFont,
    headStyles: headStyle,
    head: [R(["البيان", "القيمة"])],
    body: [
      R(["إجمالي المبيعات", money(data.totalSales)]),
      R(["عدد الفواتير", num(data.invoicesCount)]),
      R(["القطع المباعة", num(data.itemsSold)]),
      R(["متوسط قيمة الفاتورة", money(data.avgInvoice)]),
    ],
  });
  y = finalY() + 22;

  // ---- مقارنة الفروع ----
  y = sectionTitle("مقارنة الفروع", y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    styles: tableFont,
    headStyles: headStyle,
    head: [R(["الفرع", "عدد الفواتير", "الإجمالي"])],
    body: data.byBranch.map((b) =>
      R([BRANCH_LABELS[b.branch], num(b.count), money(b.total)])
    ),
  });
  y = finalY() + 22;

  // ---- المبيعات حسب الفئة ----
  if (data.byCategory.length) {
    y = sectionTitle("المبيعات حسب الفئة", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: tableFont,
      headStyles: headStyle,
      head: [R(["الفئة", "الكمية", "الإيراد"])],
      body: data.byCategory.map((c) =>
        R([CATEGORY_LABELS[c.category], num(c.qty), money(c.total)])
      ),
    });
    y = finalY() + 22;
  }

  // ---- أكثر المنتجات مبيعاً ----
  if (data.topProducts.length) {
    y = sectionTitle("أكثر المنتجات مبيعاً", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: tableFont,
      headStyles: headStyle,
      head: [R(["المنتج", "البراند", "الكمية", "الإيراد"])],
      body: data.topProducts.map((p) =>
        R([p.name, p.brand, num(p.qty), money(p.revenue)])
      ),
    });
    y = finalY() + 22;
  }

  // ---- تنبيهات نقص المخزون ----
  y = sectionTitle("أصناف تحتاج تزويد", y);
  if (data.lowStock.length === 0) {
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(ar("لا توجد أصناف منخفضة أو نافدة الكمية."), right, y + 14, {
      align: "right",
    });
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: tableFont,
      headStyles: { ...headStyle, fillColor: [201, 133, 26] },
      head: [R(["المنتج", "البراند", "الفرع", "المقاس", "الكمية"])],
      body: data.lowStock
        .slice(0, 40)
        .map((v) =>
          R([
            v.productName,
            v.brand,
            BRANCH_LABELS[v.branch],
            v.size,
            num(v.quantity),
          ])
        ),
    });
  }

  // ---- ترقيم الصفحات ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text(ar(`صفحة ${i} من ${pages}`), pageW / 2, h - 20, {
      align: "center",
    });
  }

  doc.save(`euro-brands-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
