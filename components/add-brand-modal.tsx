"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { apiPost } from "@/lib/client";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import type { BrandDTO } from "@/lib/types";

// نافذة صغيرة لإضافة براند جديد للفئة المحددة دون مغادرة الصفحة
export function AddBrandModal({
  open,
  category,
  onClose,
  onAdded,
}: {
  open: boolean;
  category: CategoryValue;
  onClose: () => void;
  onAdded: (brand: BrandDTO) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("اسم البراند مطلوب");
      return;
    }
    setSaving(true);
    try {
      const brand = await apiPost<BrandDTO>("/api/brands", {
        name: trimmed,
        category,
      });
      toast.success("تمت إضافة البراند");
      onAdded(brand);
      setName("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إضافة البراند");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`إضافة براند — ${CATEGORY_LABELS[category]}`}
      footer={
        <>
          <button className="btn btn-primary w-full sm:w-auto" onClick={submit} disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            إضافة
          </button>
          <button className="btn btn-secondary w-full sm:w-auto" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
        </>
      }
    >
      <label className="label">اسم البراند</label>
      <input
        autoFocus
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="مثال: Adidas"
      />
      <p className="mt-2 text-xs text-muted">
        سيُضاف هذا البراند إلى فئة «{CATEGORY_LABELS[category]}» فقط.
      </p>
    </Modal>
  );
}
