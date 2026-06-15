"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Plus,
  Trash2,
  Save,
  ImageIcon,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiPost, apiPut, uploadImage } from "@/lib/client";
import type { ProductDTO, ProductInput } from "@/lib/types";
import {
  BRANCHES,
  BRANCH_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  sizesForCategory,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";

interface VariantRow {
  clientId: string;
  id?: string;
  branch: BranchValue;
  size: string;
  quantity: string;
  price: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyRow(): VariantRow {
  return {
    clientId: uid(),
    branch: "HADAYEK",
    size: "",
    quantity: "0",
    price: "0",
  };
}

export function ProductForm({ initial }: { initial?: ProductDTO }) {
  const router = useRouter();
  const isEdit = !!initial;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [category, setCategory] = useState<CategoryValue>(
    initial?.category ?? "CLOTHES"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.length
      ? initial.variants.map((v) => ({
          clientId: uid(),
          id: v.id,
          branch: v.branch,
          size: v.size,
          quantity: String(v.quantity),
          price: String(v.price),
        }))
      : [emptyRow()]
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sizeOptions = sizesForCategory(category);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= 3) {
      toast.error("الحد الأقصى 3 صور للمنتج");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setImages((prev) => [...prev, url]);
      toast.success("تم رفع الصورة");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length >= 3) {
      toast.error("الحد الأقصى 3 صور للمنتج");
      return;
    }
    setImages((prev) => [...prev, url]);
    setUrlInput("");
  }

  function updateRow(clientId: string, patch: Partial<VariantRow>) {
    setVariants((rows) =>
      rows.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return toast.error("اسم المنتج مطلوب");
    if (!brand.trim()) return toast.error("البراند مطلوب");
    if (variants.length === 0) return toast.error("أضف صفاً واحداً على الأقل");

    const seen = new Set<string>();
    for (const r of variants) {
      if (!r.size) return toast.error("يجب اختيار المقاس في كل الصفوف");
      const key = `${r.size}__${r.branch}`;
      if (seen.has(key))
        return toast.error(`تكرار للمقاس ${r.size} في نفس الفرع`);
      seen.add(key);
    }

    const payload: ProductInput = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      description: description.trim() || null,
      images,
      variants: variants.map((r) => ({
        id: r.id,
        branch: r.branch,
        size: r.size,
        quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)),
        price: Math.max(0, Number(r.price) || 0),
      })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await apiPut(`/api/products/${initial!.id}`, payload);
        toast.success("تم حفظ التعديلات");
      } else {
        await apiPost("/api/products", payload);
        toast.success("تمت إضافة المنتج");
      }
      router.push("/inventory");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* البيانات الأساسية */}
      <Card className="p-5">
        <h2 className="mb-4 text-base font-bold text-text">بيانات المنتج</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">اسم المنتج *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: تيشيرت قطن كلاسيك"
            />
          </div>
          <div>
            <label className="label">البراند *</label>
            <input
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="مثال: Zara"
            />
          </div>
          <div>
            <label className="label">الفئة *</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryValue)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">الوصف</label>
            <textarea
              className="input min-h-[90px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف اختياري للمنتج..."
            />
          </div>
        </div>
      </Card>

      {/* الصور */}
      <Card className="p-5">
        <h2 className="mb-1 text-base font-bold text-text">صور المنتج</h2>
        <p className="mb-4 text-xs text-muted">حتى 3 صور كحد أقصى</p>

        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div
              key={img + i}
              className="relative h-24 w-24 overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() =>
                  setImages((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="حذف الصورة"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {images.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {uploading ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-xs">رفع صورة</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        {/* إضافة عبر رابط (بديل عند عدم تهيئة Blob) */}
        {images.length < 3 && (
          <div className="mt-3 flex max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input pr-9"
                placeholder="أو ألصق رابط صورة..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary h-[38px]"
              onClick={addUrl}
            >
              إضافة
            </button>
          </div>
        )}
      </Card>

      {/* المقاسات والكميات */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-text">المقاسات والكميات</h2>
          <button
            type="button"
            className="btn btn-secondary h-9 text-xs"
            onClick={() => setVariants((rows) => [...rows, emptyRow()])}
          >
            <Plus className="h-4 w-4" />
            إضافة صف
          </button>
        </div>

        <div className="space-y-3">
          {/* رؤوس الأعمدة (سطح المكتب) */}
          <div className="hidden gap-3 px-1 text-xs font-medium text-muted sm:grid sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]">
            <span>الفرع</span>
            <span>المقاس</span>
            <span>الكمية</span>
            <span>السعر (ج.م)</span>
            <span></span>
          </div>

          {variants.map((row) => (
            <div
              key={row.clientId}
              className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto] sm:border-0 sm:p-0"
            >
              <select
                className="input"
                value={row.branch}
                onChange={(e) =>
                  updateRow(row.clientId, {
                    branch: e.target.value as BranchValue,
                  })
                }
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={row.size}
                onChange={(e) =>
                  updateRow(row.clientId, { size: e.target.value })
                }
              >
                <option value="">المقاس</option>
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {/* الحفاظ على مقاس قديم خارج قائمة الفئة الحالية */}
                {row.size && !sizeOptions.includes(row.size) && (
                  <option value={row.size}>{row.size}</option>
                )}
              </select>

              <input
                type="number"
                min={0}
                className="input nums"
                value={row.quantity}
                onChange={(e) =>
                  updateRow(row.clientId, { quantity: e.target.value })
                }
              />

              <input
                type="number"
                min={0}
                step="0.01"
                className="input nums"
                value={row.price}
                onChange={(e) =>
                  updateRow(row.clientId, { price: e.target.value })
                }
              />

              <button
                type="button"
                onClick={() =>
                  setVariants((rows) =>
                    rows.length === 1
                      ? rows
                      : rows.filter((r) => r.clientId !== row.clientId)
                  )
                }
                disabled={variants.length === 1}
                className="btn btn-ghost h-[38px] w-full text-danger hover:bg-[rgba(217,83,79,0.12)] disabled:opacity-30 sm:w-[38px] sm:!px-0"
                aria-label="حذف الصف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* أزرار الحفظ */}
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isEdit ? "حفظ التعديلات" : "إضافة المنتج"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/inventory")}
          disabled={saving}
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
