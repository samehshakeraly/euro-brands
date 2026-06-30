"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { apiPost } from "@/lib/client";
import { cn } from "@/lib/cn";
import {
  BRANCHES,
  BRANCH_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { ImportResult, ImportRow, ProductDTO } from "@/lib/types";

// ترتيب أعمدة القالب الجديد (أ→ي): اسم المنتج، البراند، الفئة، النوع، اللون،
// المقاس، الفرع، الكمية، السعر، الكود (SKU).
const HEADERS = [
  "اسم المنتج",
  "البراند",
  "الفئة",
  "النوع",
  "اللون",
  "المقاس",
  "الفرع",
  "الكمية",
  "السعر",
  "الكود (SKU)",
];

const CATEGORY_BY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [CATEGORY_LABELS[c], c])
) as Record<string, CategoryValue>;
const BRANCH_BY_LABEL = Object.fromEntries(
  BRANCHES.map((b) => [BRANCH_LABELS[b], b])
) as Record<string, BranchValue>;

interface PreviewRow {
  name: string;
  brand: string;
  categoryLabel: string;
  productType: string;
  branchLabel: string;
  size: string;
  color: string;
  quantity: string;
  price: string;
  sku: string;
  parsed?: ImportRow;
  valid: boolean;
  error?: string;
  status: string;
}

function norm(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

// قراءة قيمة العمود مع تجاهل الفراغات في رؤوس الأعمدة
function pick(obj: Record<string, unknown>, header: string): unknown {
  if (header in obj) return obj[header];
  const key = Object.keys(obj).find((k) => k.trim() === header);
  return key ? obj[key] : "";
}

// قراءة العمود مع دعم أكثر من اسم رأس (الجديد + القديم) لإبقاء الملفات القديمة قابلة للاستيراد
function pickAny(obj: Record<string, unknown>, ...headers: string[]): unknown {
  for (const h of headers) {
    const v = pick(obj, h);
    if (norm(v) !== "") return v;
  }
  return "";
}

export function ImportInventoryModal({
  open,
  onClose,
  onImported,
  products,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  products: ProductDTO[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  function classify(row: ImportRow): string {
    const k = (s: string) => s.trim().toLowerCase();
    const p = products.find(
      (x) => k(x.name) === k(row.name) && k(x.brand) === k(row.brand)
    );
    if (!p) return "منتج جديد";
    const v = p.variants.find(
      (vr) =>
        vr.size === row.size &&
        vr.branch === row.branch &&
        (vr.color ?? null) === (row.color ?? null)
    );
    return v ? "تحديث الكمية" : "صنف جديد";
  }

  function buildRow(obj: Record<string, unknown>): PreviewRow {
    // "اسم المنتج" هو الرأس الجديد، و"المنتج" رأس قديم نبقي عليه للملفات السابقة
    const name = norm(pickAny(obj, "اسم المنتج", "المنتج"));
    const brand = norm(pick(obj, "البراند"));
    const categoryLabel = norm(pick(obj, "الفئة"));
    const productType = norm(pick(obj, "النوع"));
    const branchLabel = norm(pick(obj, "الفرع"));
    const size = norm(pick(obj, "المقاس"));
    const color = norm(pick(obj, "اللون"));
    const quantity = norm(pick(obj, "الكمية"));
    const price = norm(pick(obj, "السعر"));
    // "الكود (SKU)" هو الرأس الجديد، و"SKU" رأس قديم نبقي عليه للملفات السابقة
    const sku = norm(pickAny(obj, "الكود (SKU)", "SKU"));

    const category =
      CATEGORY_BY_LABEL[categoryLabel] ??
      (CATEGORIES.includes(categoryLabel as CategoryValue)
        ? (categoryLabel as CategoryValue)
        : undefined);
    const branch =
      BRANCH_BY_LABEL[branchLabel] ??
      (BRANCHES.includes(branchLabel as BranchValue)
        ? (branchLabel as BranchValue)
        : undefined);
    const qty = Number(quantity);
    const prc = Number(price);

    let error: string | undefined;
    if (!name) error = "اسم المنتج مفقود";
    else if (!brand) error = "البراند مفقود";
    else if (!category) error = "فئة غير معروفة";
    else if (!branch) error = "فرع غير معروف";
    else if (!size) error = "المقاس مفقود";
    else if (!Number.isFinite(qty) || qty < 0) error = "كمية غير صحيحة";
    else if (!Number.isFinite(prc) || prc < 0) error = "سعر غير صحيح";

    const valid = !error;
    const parsed: ImportRow | undefined = valid
      ? {
          name,
          brand,
          category: category!,
          branch: branch!,
          size,
          color: color || null,
          quantity: Math.floor(qty),
          price: prc,
          sku: sku || null,
          productType: productType || null,
        }
      : undefined;

    return {
      name,
      brand,
      categoryLabel,
      productType,
      branchLabel,
      size,
      color,
      quantity,
      price,
      sku,
      parsed,
      valid,
      error,
      status: valid ? classify(parsed!) : "—",
    };
  }

  async function handleDownloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      // صف الرؤوس فقط — بدون أي بيانات تجريبية
      const ws = XLSX.utils.aoa_to_sheet([HEADERS]);

      // عرض كل عمود مضبوط حسب نوع الحقل (بالترتيب الجديد)
      ws["!cols"] = [
        { wch: 26 }, // A اسم المنتج
        { wch: 14 }, // B البراند
        { wch: 12 }, // C الفئة
        { wch: 14 }, // D النوع
        { wch: 12 }, // E اللون
        { wch: 8 }, // F المقاس
        { wch: 16 }, // G الفرع
        { wch: 8 }, // H الكمية
        { wch: 10 }, // I السعر
        { wch: 18 }, // J الكود (SKU)
      ];

      // تثبيت صف الرؤوس (الصف الأول) عند التمرير
      ws["!view"] = { freeze: { xSplit: 0, ySplit: 1, topLeftCell: "A2" } };

      // قوائم تحقّق منسدلة على الأعمدة المرتبطة بقيم محددة بعد إعادة الترتيب:
      //   C = الفئة، E = اللون، G = الفرع.
      // ملاحظة: نسخة SheetJS المجتمعية (xlsx 0.18.5) تتجاهل هذه الخاصية عند
      // الكتابة، لذا لن تظهر القوائم فعلياً إلا بترقية SheetJS Pro. نتركها هنا
      // لتوثيق النية وتفعيلها تلقائياً عند الترقية. اللون حر فلا قائمة قيم له.
      const catList = `"${CATEGORIES.map((c) => CATEGORY_LABELS[c]).join(",")}"`;
      const branchList = `"${BRANCHES.map((b) => BRANCH_LABELS[b]).join(",")}"`;
      ws["!dataValidation"] = [
        { sqref: "C2:C1000", type: "list", formula1: catList },
        { sqref: "G2:G1000", type: "list", formula1: branchList },
      ];

      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      XLSX.utils.book_append_sheet(wb, ws, "الجرد");
      XLSX.writeFile(wb, "euro-brands-inventory-template.xlsx");
    } catch {
      toast.error("تعذّر إنشاء القالب");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });
      if (json.length === 0) {
        toast.error("الملف لا يحتوي على بيانات");
        return;
      }
      setPreview(json.map(buildRow));
    } catch {
      toast.error("تعذّر قراءة ملف Excel");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    const rows = (preview ?? []).filter((r) => r.valid).map((r) => r.parsed!);
    if (rows.length === 0) {
      toast.error("لا توجد صفوف صالحة للاستيراد");
      return;
    }
    setImporting(true);
    try {
      const res = await apiPost<ImportResult>("/api/products/import", { rows });
      toast.success(
        `تم الاستيراد: ${res.updatedVariants} تحديث · ${res.newVariants} صنف جديد · ${res.newProducts} منتج جديد`
      );
      onImported();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الاستيراد");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setPreview(null);
    onClose();
  }

  const validCount = preview?.filter((r) => r.valid).length ?? 0;
  const invalidCount = (preview?.length ?? 0) - validCount;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="استيراد الجرد من Excel"
      size="xl"
    >
      {!preview ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            نزّل القالب، املأ الصفوف بالأعمدة: اسم المنتج، البراند، الفئة،
            النوع، اللون، المقاس، الفرع، الكمية، السعر، الكود (SKU)، ثم ارفع
            الملف لتحديث المخزون بالجملة. «النوع» و«اللون» و«الكود (SKU)»
            اختيارية — لو تركت الكود فارغاً سيُولَّد تلقائياً.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary h-11 flex-1"
            >
              <Download className="h-4 w-4" />
              تنزيل القالب
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="btn btn-primary h-11 flex-1"
            >
              {parsing ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              رفع ملف Excel
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            الصفوف المطابقة (نفس المنتج والفرع والمقاس واللون) ستُحدَّث
            كميتها وسعرها، والجديدة ستُضاف تلقائياً مع توليد SKU إن لم يكن
            معبَّأ. أنواع المنتجات الجديدة المذكورة في عمود «النوع» تُنشأ
            تلقائياً.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" />
              {formatNumber(validCount)} صف صالح
            </span>
            {invalidCount > 0 && (
              <span className="flex items-center gap-1.5 text-danger">
                <AlertTriangle className="h-4 w-4" />
                {formatNumber(invalidCount)} صف به أخطاء (سيتم تجاهله)
              </span>
            )}
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-right text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b text-muted">
                  <th className="px-2 py-2 font-medium">المنتج</th>
                  <th className="px-2 py-2 font-medium">البراند</th>
                  <th className="px-2 py-2 font-medium">الفئة</th>
                  <th className="px-2 py-2 font-medium">النوع</th>
                  <th className="px-2 py-2 font-medium">الفرع</th>
                  <th className="px-2 py-2 font-medium">المقاس</th>
                  <th className="px-2 py-2 font-medium">اللون</th>
                  <th className="px-2 py-2 font-medium">الكمية</th>
                  <th className="px-2 py-2 font-medium">السعر</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-[var(--border)]",
                      !r.valid && "bg-[rgba(217,83,79,0.08)]"
                    )}
                  >
                    <td className="px-2 py-2 text-text">{r.name || "—"}</td>
                    <td className="px-2 py-2 text-muted">{r.brand || "—"}</td>
                    <td className="px-2 py-2 text-muted">
                      {r.categoryLabel || "—"}
                    </td>
                    <td className="px-2 py-2 text-muted">
                      {r.productType || "—"}
                    </td>
                    <td className="px-2 py-2 text-muted">
                      {r.branchLabel || "—"}
                    </td>
                    <td className="px-2 py-2 text-text nums">{r.size || "—"}</td>
                    <td className="px-2 py-2 text-muted">{r.color || "—"}</td>
                    <td className="px-2 py-2 text-text nums">{r.quantity}</td>
                    <td className="px-2 py-2 text-text nums">{r.price}</td>
                    <td className="px-2 py-2 text-muted nums">{r.sku || "—"}</td>
                    <td className="px-2 py-2">
                      {r.valid ? (
                        <span className="text-success">{r.status}</span>
                      ) : (
                        <span className="text-danger">{r.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 200 && (
            <p className="text-xs text-muted">
              يتم عرض أول 200 صف فقط في المعاينة، وسيُستورد الجميع.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleConfirm}
              disabled={importing || validCount === 0}
              className="btn btn-primary h-11 sm:w-auto"
            >
              {importing ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              تأكيد الاستيراد ({formatNumber(validCount)})
            </button>
            <button
              onClick={() => setPreview(null)}
              disabled={importing}
              className="btn btn-secondary h-11 sm:w-auto"
            >
              اختيار ملف آخر
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
