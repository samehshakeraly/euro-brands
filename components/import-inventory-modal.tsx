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

const HEADERS = [
  "المنتج",
  "البراند",
  "الفئة",
  "الفرع",
  "المقاس",
  "الكمية",
  "السعر",
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
  branchLabel: string;
  size: string;
  quantity: string;
  price: string;
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
      (vr) => vr.size === row.size && vr.branch === row.branch
    );
    return v ? "تحديث الكمية" : "مقاس جديد";
  }

  function buildRow(obj: Record<string, unknown>): PreviewRow {
    const name = norm(pick(obj, "المنتج"));
    const brand = norm(pick(obj, "البراند"));
    const categoryLabel = norm(pick(obj, "الفئة"));
    const branchLabel = norm(pick(obj, "الفرع"));
    const size = norm(pick(obj, "المقاس"));
    const quantity = norm(pick(obj, "الكمية"));
    const price = norm(pick(obj, "السعر"));

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
          quantity: Math.floor(qty),
          price: prc,
        }
      : undefined;

    return {
      name,
      brand,
      categoryLabel,
      branchLabel,
      size,
      quantity,
      price,
      parsed,
      valid,
      error,
      status: valid ? classify(parsed!) : "—",
    };
  }

  async function handleDownloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const aoa = [
        HEADERS,
        ["تيشيرت قطن كلاسيك", "Zara", "ملابس", "حدائق المعادي", "M", 20, 350],
        ["حذاء رياضي خفيف", "Nike", "أحذية", "زهراء المعادي", "42", 8, 1450],
        ["عطر شرقي فاخر", "Lattafa", "عطور", "حدائق المعادي", "100ml", 15, 600],
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 26 },
        { wch: 14 },
        { wch: 10 },
        { wch: 16 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
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
        `تم الاستيراد: ${res.updatedVariants} تحديث · ${res.newVariants} مقاس جديد · ${res.newProducts} منتج جديد`
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
            نزّل القالب، املأ الصفوف بالأعمدة: المنتج، البراند، الفئة، الفرع،
            المقاس، الكمية، السعر، ثم ارفع الملف لتحديث المخزون بالجملة.
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
            الصفوف المطابقة (نفس المنتج والمقاس والفرع) ستُحدَّث كميتها وسعرها،
            والجديدة ستُضاف تلقائياً.
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
            <table className="w-full min-w-[640px] text-right text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b text-muted">
                  <th className="px-2 py-2 font-medium">المنتج</th>
                  <th className="px-2 py-2 font-medium">البراند</th>
                  <th className="px-2 py-2 font-medium">الفئة</th>
                  <th className="px-2 py-2 font-medium">الفرع</th>
                  <th className="px-2 py-2 font-medium">المقاس</th>
                  <th className="px-2 py-2 font-medium">الكمية</th>
                  <th className="px-2 py-2 font-medium">السعر</th>
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
                      {r.branchLabel || "—"}
                    </td>
                    <td className="px-2 py-2 text-text nums">{r.size || "—"}</td>
                    <td className="px-2 py-2 text-text nums">{r.quantity}</td>
                    <td className="px-2 py-2 text-text nums">{r.price}</td>
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
