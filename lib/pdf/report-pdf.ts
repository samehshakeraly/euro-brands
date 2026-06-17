import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { BRANCH_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import type { ReportsData } from "@/lib/types";

// عرض الأرقام والعملة بالعربية (المتصفح يرسمها بشكل صحيح داخل html2canvas)
const num = (x: number) =>
  (x ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const money = (x: number) => `${num(x)} ج.م`;

function row(cells: string[], opts: { head?: boolean; strong?: number } = {}) {
  const tag = opts.head ? "th" : "td";
  const base = opts.head
    ? "padding:8px 10px;background:#6c63ff;color:#fff;font-weight:700;text-align:right;"
    : "padding:7px 10px;border-bottom:1px solid #e2e4ec;text-align:right;";
  return `<tr>${cells
    .map(
      (c, i) =>
        `<${tag} style="${base}${
          opts.strong === i ? "font-weight:700;" : ""
        }">${c}</${tag}>`
    )
    .join("")}</tr>`;
}

function table(headers: string[], rows: string[][]): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
    <thead>${row(headers, { head: true })}</thead>
    <tbody>${rows.map((r) => row(r)).join("")}</tbody>
  </table>`;
}

function summaryCard(label: string, value: string, color: string): string {
  return `<div style="flex:1;min-width:140px;border:1px solid #e2e4ec;border-top:3px solid ${color};border-radius:10px;padding:12px 14px;">
    <div style="font-size:11px;color:#9295a8;">${label}</div>
    <div style="font-size:18px;font-weight:800;color:#1a1d2e;margin-top:4px;">${value}</div>
  </div>`;
}

function sectionTitle(t: string): string {
  return `<h2 style="font-size:15px;font-weight:800;color:#1a1d2e;margin:22px 0 4px;border-right:4px solid #6c63ff;padding-right:8px;">${t}</h2>`;
}

function buildReportHtml(data: ReportsData, range: { from: string; to: string }) {
  const el = document.createElement("div");
  el.setAttribute("dir", "rtl");
  el.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;color:#1a1d2e;" +
    "font-family:var(--font-tajawal),Tajawal,'Segoe UI',sans-serif;padding:34px;box-sizing:border-box;";

  const fromD = format(new Date(range.from), "yyyy/MM/dd");
  const toD = format(new Date(range.to), "yyyy/MM/dd");
  const discountPct = data.grossSales
    ? (data.discountTotal / data.grossSales) * 100
    : 0;

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #6c63ff;padding-bottom:14px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:42px;height:42px;border-radius:10px;background:#6c63ff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">EB</div>
        <div>
          <div style="font-size:20px;font-weight:800;color:#6c63ff;">Euro Brands</div>
          <div style="font-size:12px;color:#9295a8;">تقرير المبيعات والمخزون</div>
        </div>
      </div>
      <div style="text-align:left;font-size:12px;color:#9295a8;">
        <div>الفترة: ${fromD} — ${toD}</div>
        <div>تاريخ التقرير: ${format(new Date(), "yyyy/MM/dd HH:mm")}</div>
      </div>
    </div>

    ${sectionTitle("الملخّص")}
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
      ${summaryCard("إجمالي المبيعات (الصافي)", money(data.totalSales), "#6c63ff")}
      ${summaryCard("قبل الخصم", money(data.grossSales), "#6c63ff")}
      ${summaryCard("عدد الفواتير", num(data.invoicesCount), "#3b9a6e")}
      ${summaryCard("القطع المباعة", num(data.itemsSold), "#3b9a6e")}
      ${summaryCard("متوسط الفاتورة", money(data.avgInvoice), "#6c63ff")}
    </div>

    ${sectionTitle("ملخّص الخصومات")}
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
      ${summaryCard("إجمالي الخصومات", money(data.discountTotal), "#c9851a")}
      ${summaryCard("فواتير عليها خصم", num(data.discountedCount), "#c9851a")}
      ${summaryCard("نسبة الخصم من المبيعات", `${num(discountPct)}%`, "#c9851a")}
    </div>

    ${sectionTitle("مقارنة الفروع")}
    ${table(
      ["الفرع", "عدد الفواتير", "الإجمالي"],
      data.byBranch.map((b) => [BRANCH_LABELS[b.branch], num(b.count), money(b.total)])
    )}

    ${
      data.byCategory.length
        ? sectionTitle("المبيعات حسب الفئة") +
          table(
            ["الفئة", "الكمية", "الإيراد"],
            data.byCategory.map((c) => [
              CATEGORY_LABELS[c.category],
              num(c.qty),
              money(c.total),
            ])
          )
        : ""
    }

    ${sectionTitle("أفضل 5 منتجات مبيعاً")}
    ${
      data.topProducts.length
        ? table(
            ["المنتج", "البراند", "الكمية", "الإيراد"],
            data.topProducts
              .slice(0, 5)
              .map((p) => [p.name, p.brand, num(p.qty), money(p.revenue)])
          )
        : `<p style="font-size:12px;color:#9295a8;">لا توجد مبيعات في الفترة.</p>`
    }

    ${sectionTitle("أصناف تحتاج تزويد")}
    ${
      data.lowStock.length
        ? table(
            ["المنتج", "الفرع", "المقاس", "الكمية"],
            data.lowStock
              .slice(0, 25)
              .map((v) => [
                v.productName,
                BRANCH_LABELS[v.branch],
                v.size,
                num(v.quantity),
              ])
          )
        : `<p style="font-size:12px;color:#9295a8;">لا توجد أصناف منخفضة الكمية.</p>`
    }

    <div style="margin-top:26px;border-top:1px solid #e2e4ec;padding-top:10px;font-size:10px;color:#9295a8;text-align:center;">
      Euro Brands — تم إنشاء هذا التقرير آلياً
    </div>
  `;

  document.body.appendChild(el);
  return el;
}

export async function generateReportPdf(
  data: ReportsData,
  range: { from: string; to: string }
) {
  const el = buildReportHtml(data, range);
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    let position = 0;
    let remaining = imgH;
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    remaining -= pageH;
    while (remaining > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      remaining -= pageH;
    }

    pdf.save(`euro-brands-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}
