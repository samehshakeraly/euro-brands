"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { apiPost } from "@/lib/client";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import type { ProductTypeDTO } from "@/lib/types";

// نافذة صغيرة لإضافة نوع منتج جديد للفئة المحددة دون مغادرة الصفحة.
// الكود (البادئة) يدخل في توليد SKU التلقائي لكل صنف.
export function AddProductTypeModal({
  open,
  category,
  onClose,
  onAdded,
}: {
  open: boolean;
  category: CategoryValue;
  onClose: () => void;
  onAdded: (type: ProductTypeDTO) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n) return toast.error("اسم النوع مطلوب");
    if (!c) return toast.error("كود النوع (البادئة) مطلوب");
    if (!/^[A-Z0-9]+$/.test(c))
      return toast.error("كود النوع: حروف لاتينية وأرقام فقط");
    setSaving(true);
    try {
      const t = await apiPost<ProductTypeDTO>("/api/product-types", {
        name: n,
        code: c,
        category,
      });
      toast.success("تمت إضافة النوع");
      onAdded(t);
      setName("");
      setCode("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إضافة النوع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`إضافة نوع منتج — ${CATEGORY_LABELS[category]}`}
      footer={
        <>
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={submit}
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            إضافة
          </button>
          <button
            className="btn btn-secondary w-full sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">اسم النوع</label>
          <input
            autoFocus
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: تيشيرت / حذاء رياضي"
          />
        </div>
        <div>
          <label className="label">الكود (بادئة الـ SKU)</label>
          <input
            className="input nums uppercase"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6))
            }
            placeholder="TSH"
            maxLength={6}
          />
          <p className="mt-1 text-xs text-muted">
            بادئة قصيرة (حتى 6 حروف/أرقام) تظهر في كود SKU التلقائي لكل صنف من
            هذا النوع.
          </p>
        </div>
      </div>
    </Modal>
  );
}
