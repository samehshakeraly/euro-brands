"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { apiPost } from "@/lib/client";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import type { ProductTypeDTO } from "@/lib/types";

// نافذة صغيرة لإضافة نوع منتج جديد للفئة المحددة
export function AddTypeModal({
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
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!trimmedName) return toast.error("اسم النوع مطلوب");
    if (!trimmedCode) return toast.error("كود النوع مطلوب (حروف إنجليزية)");

    setSaving(true);
    try {
      const type = await apiPost<ProductTypeDTO>("/api/product-types", {
        name: trimmedName,
        code: trimmedCode,
        category,
      });
      toast.success("تمت إضافة النوع");
      onAdded(type);
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
      title={`إضافة نوع — ${CATEGORY_LABELS[category]}`}
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
            placeholder="مثال: تيشرت بولو"
          />
        </div>
        <div>
          <label className="label">كود مختصر (لاتيني)</label>
          <input
            className="input"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="مثال: POLO"
          />
          <p className="mt-1 text-xs text-muted">
            يُستخدم في توليد كود SKU للمتغيّرات.
          </p>
        </div>
      </div>
    </Modal>
  );
}
