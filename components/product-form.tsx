"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Plus,
  Trash2,
  Save,
  Link2,
  Copy,
  RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AddBrandModal } from "@/components/add-brand-modal";
import { AddTypeModal } from "@/components/add-type-modal";
import { apiPost, apiPut, uploadImage } from "@/lib/client";
import { useFetch } from "@/lib/use-fetch";
import type {
  BrandDTO,
  ProductDTO,
  ProductInput,
  ProductTypeDTO,
} from "@/lib/types";
import {
  BRANCHES,
  BRANCH_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  COLORS,
  colorMeta,
  generateVariantSku,
  sizesForCategory,
  type BranchValue,
  type CategoryValue,
} from "@/lib/constants";

interface VariantRow {
  clientId: string;
  id?: string;
  branch: BranchValue;
  size: string;
  color: string; // الاسم العربي، فارغ = بلا لون
  sku: string;
  skuOverridden: boolean; // إذا كان المستخدم عدّل SKU يدوياً
  quantity: string;
  minQuantity: string;
  price: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyRow(branch: BranchValue = "HADAYEK"): VariantRow {
  return {
    clientId: uid(),
    branch,
    size: "",
    color: "",
    sku: "",
    skuOverridden: false,
    quantity: "0",
    minQuantity: "5",
    price: "0",
  };
}

function VariantField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted sm:hidden">
        {label}
      </span>
      {children}
    </div>
  );
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
  const [productTypeId, setProductTypeId] = useState<string>(
    initial?.productTypeId ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.length
      ? initial.variants.map((v) => ({
          clientId: uid(),
          id: v.id,
          branch: v.branch,
          size: v.size,
          color: v.color ?? "",
          sku: v.sku ?? "",
          skuOverridden: !!v.sku,
          quantity: String(v.quantity),
          minQuantity: String(v.minQuantity ?? 5),
          price: String(v.price),
        }))
      : [emptyRow()]
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  const sizeOptions = sizesForCategory(category);

  const { data: brandsData, refetch: refetchBrands } = useFetch<BrandDTO[]>(
    `/api/brands?category=${category}`
  );
  const brandOptions = (brandsData ?? []).map((b) => b.name);

  const { data: typesData, refetch: refetchTypes } = useFetch<ProductTypeDTO[]>(
    `/api/product-types?category=${category}`
  );
  const typeOptions = typesData ?? [];

  const selectedType = useMemo(
    () => typeOptions.find((t) => t.id === productTypeId) ?? null,
    [typeOptions, productTypeId]
  );

  function autoSkuFor(row: VariantRow): string {
    if (!row.size || !brand) return "";
    return generateVariantSku({
      brand,
      typeCode: selectedType?.code ?? null,
      colorCode: colorMeta(row.color)?.code ?? null,
      size: row.size,
      branch: row.branch,
    });
  }

  async function uploadFiles(files: File[]) {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (images.length >= 3) {
        toast.error("الحد الأقصى 3 صور للمنتج");
        break;
      }
      setUploading(true);
      try {
        const { url } = await uploadImage(file);
        setImages((prev) => (prev.length < 3 ? [...prev, url] : prev));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
      } finally {
        setUploading(false);
      }
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length >= 3) return toast.error("الحد الأقصى 3 صور للمنتج");
    setImages((prev) => [...prev, url]);
    setUrlInput("");
  }

  function updateRow(clientId: string, patch: Partial<VariantRow>) {
    setVariants((rows) =>
      rows.map((r) => {
        if (r.clientId !== clientId) return r;
        const merged = { ...r, ...patch };
        // أعد توليد SKU إذا تغيّر أي حقل مرتبط ولم يَتدخّل المستخدم يدوياً
        const touchedAutoField =
          "size" in patch ||
          "branch" in patch ||
          "color" in patch;
        if (touchedAutoField && !merged.skuOverridden) {
          merged.sku = generateVariantSku({
            brand,
            typeCode: selectedType?.code ?? null,
            colorCode: colorMeta(merged.color)?.code ?? null,
            size: merged.size,
            branch: merged.branch,
          });
        }
        return merged;
      })
    );
  }

  function regenerateSku(row: VariantRow) {
    const sku = autoSkuFor(row);
    setVariants((rows) =>
      rows.map((r) =>
        r.clientId === row.clientId ? { ...r, sku, skuOverridden: false } : r
      )
    );
  }

  // إعادة توليد جميع أكواد SKU عند تغيير البراند أو النوع (للصفوف غير المخصصة)
  function regenerateAllAutoSkus(updatedBrand: string, updatedTypeId: string) {
    setVariants((rows) =>
      rows.map((r) => {
        if (r.skuOverridden) return r;
        const t = typeOptions.find((x) => x.id === updatedTypeId);
        return {
          ...r,
          sku:
            r.size && updatedBrand
              ? generateVariantSku({
                  brand: updatedBrand,
                  typeCode: t?.code ?? null,
                  colorCode: colorMeta(r.color)?.code ?? null,
                  size: r.size,
                  branch: r.branch,
                })
              : "",
        };
      })
    );
  }

  function copyToOtherBranch() {
    setVariants((rows) => {
      const additions: VariantRow[] = [];
      for (const r of rows) {
        const other: BranchValue =
          r.branch === "HADAYEK" ? "ZAHRAA" : "HADAYEK";
        const exists = rows.some(
          (x) =>
            x.size === r.size && x.color === r.color && x.branch === other
        );
        const willAdd = additions.some(
          (x) =>
            x.size === r.size && x.color === r.color && x.branch === other
        );
        if (r.size && !exists && !willAdd) {
          const cloned: VariantRow = {
            ...r,
            clientId: uid(),
            id: undefined,
            branch: other,
            skuOverridden: false,
            sku: r.size
              ? generateVariantSku({
                  brand,
                  typeCode: selectedType?.code ?? null,
                  colorCode: colorMeta(r.color)?.code ?? null,
                  size: r.size,
                  branch: other,
                })
              : "",
          };
          additions.push(cloned);
        }
      }
      if (additions.length === 0) {
        toast("لا توجد صفوف لنسخها للفرع الآخر");
        return rows;
      }
      toast.success(`تم نسخ ${additions.length} صف للفرع الآخر`);
      return [...rows, ...additions];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("اسم المنتج مطلوب");
    if (!brand.trim()) return toast.error("يجب اختيار البراند");
    if (variants.length === 0) return toast.error("أضف صفاً واحداً على الأقل");

    const seen = new Set<string>();
    const seenSkus = new Set<string>();
    for (const r of variants) {
      if (!r.size) return toast.error("يجب اختيار المقاس في كل الصفوف");
      const key = `${r.size}__${r.branch}__${r.color}`;
      if (seen.has(key))
        return toast.error(
          `تكرار: ${r.size}${r.color ? ` (${r.color})` : ""} في ${BRANCH_LABELS[r.branch]}`
        );
      seen.add(key);
      const trimmedSku = r.sku.trim();
      if (trimmedSku) {
        if (seenSkus.has(trimmedSku))
          return toast.error(`تكرار لكود SKU: ${trimmedSku}`);
        seenSkus.add(trimmedSku);
      }
    }

    const payload: ProductInput = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      productTypeId: productTypeId || null,
      description: description.trim() || null,
      barcode: barcode.trim() || null,
      images,
      variants: variants.map((r) => ({
        id: r.id,
        branch: r.branch,
        size: r.size,
        color: r.color || null,
        sku: r.sku.trim() || null,
        quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)),
        minQuantity: Math.max(0, Math.floor(Number(r.minQuantity) || 0)),
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
            <label className="label">الفئة *</label>
            <select
              className="input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as CategoryValue);
                setBrand("");
                setProductTypeId("");
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* النوع: قائمة منسدلة حسب الفئة + زر إضافة */}
          <div>
            <label className="label">النوع</label>
            <div className="flex gap-2">
              <select
                className="input"
                value={productTypeId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setProductTypeId(newId);
                  regenerateAllAutoSkus(brand, newId);
                }}
              >
                <option value="">اختر النوع</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTypeModalOpen(true)}
                className="btn btn-secondary flex-shrink-0"
                title="إضافة نوع جديد"
              >
                <Plus className="h-4 w-4" />
                نوع جديد
              </button>
            </div>
            {typeOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                لا توجد أنواع لهذه الفئة — أضف واحداً عبر زر «نوع جديد».
              </p>
            )}
          </div>

          {/* البراند */}
          <div>
            <label className="label">البراند *</label>
            <div className="flex gap-2">
              <select
                className="input"
                value={brand}
                onChange={(e) => {
                  const newBrand = e.target.value;
                  setBrand(newBrand);
                  regenerateAllAutoSkus(newBrand, productTypeId);
                }}
              >
                <option value="">اختر البراند</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                {brand && !brandOptions.includes(brand) && (
                  <option value={brand}>{brand}</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => setBrandModalOpen(true)}
                className="btn btn-secondary flex-shrink-0"
                title="إضافة براند جديد"
              >
                <Plus className="h-4 w-4" />
                جديد
              </button>
            </div>
            {brandOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                لا توجد براندات لهذه الفئة — أضف واحداً عبر زر «جديد».
              </p>
            )}
          </div>

          <div>
            <label className="label">الباركود</label>
            <input
              className="input nums"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="امسح أو أدخل الباركود"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">الوصف</label>
            <textarea
              className="input min-h-[80px] resize-y"
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
        <p className="mb-4 text-xs text-muted">حتى 3 صور — اسحب وأفلت أو اختر ملفاً</p>

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
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                uploadFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-24 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted transition-colors hover:border-accent hover:text-accent ${
                dragging ? "border-accent bg-accent-soft text-accent" : ""
              }`}
            >
              {uploading ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-xs">اسحب الصورة هنا أو اضغط</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            uploadFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

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
            <button type="button" className="btn btn-secondary h-[42px]" onClick={addUrl}>
              إضافة
            </button>
          </div>
        )}
      </Card>

      {/* المقاسات والكميات والألوان */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-text">
            المقاسات والألوان والكميات
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary h-9 text-xs"
              onClick={copyToOtherBranch}
              title="نسخ كل الصفوف إلى الفرع الآخر"
            >
              <Copy className="h-4 w-4" />
              نسخ للفرع الآخر
            </button>
            <button
              type="button"
              className="btn btn-secondary h-9 text-xs"
              onClick={() =>
                setVariants((rows) => [
                  ...rows,
                  emptyRow(rows[rows.length - 1]?.branch ?? "HADAYEK"),
                ])
              }
            >
              <Plus className="h-4 w-4" />
              إضافة صف
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {variants.map((row) => {
            const meta = colorMeta(row.color);
            return (
              <div
                key={row.clientId}
                className="rounded-lg border p-3"
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.1fr_0.7fr_1fr_0.7fr_0.7fr_0.9fr_auto]">
                  <VariantField label="الفرع">
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
                  </VariantField>

                  <VariantField label="المقاس">
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
                      {row.size && !sizeOptions.includes(row.size) && (
                        <option value={row.size}>{row.size}</option>
                      )}
                    </select>
                  </VariantField>

                  <VariantField label="اللون">
                    <div className="flex items-center gap-2">
                      {meta && (
                        <span
                          className="inline-block h-5 w-5 shrink-0 rounded-full border"
                          style={{ backgroundColor: meta.hex }}
                          aria-label={meta.name}
                        />
                      )}
                      <select
                        className="input"
                        value={row.color}
                        onChange={(e) =>
                          updateRow(row.clientId, { color: e.target.value })
                        }
                      >
                        <option value="">بلا لون</option>
                        {COLORS.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </VariantField>

                  <VariantField label="الكمية">
                    <input
                      type="number"
                      min={0}
                      className="input nums"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.clientId, { quantity: e.target.value })
                      }
                    />
                  </VariantField>

                  <VariantField label="الحد الأدنى">
                    <input
                      type="number"
                      min={0}
                      className="input nums"
                      value={row.minQuantity}
                      onChange={(e) =>
                        updateRow(row.clientId, {
                          minQuantity: e.target.value,
                        })
                      }
                    />
                  </VariantField>

                  <VariantField label="السعر (ج.م)">
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
                  </VariantField>

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
                    className="btn btn-ghost col-span-2 h-11 w-full gap-2 text-danger hover:bg-[rgba(217,83,79,0.12)] disabled:opacity-30 sm:col-span-1 sm:h-[38px] sm:w-[38px] sm:!px-0"
                    aria-label="حذف الصف"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">حذف الصف</span>
                  </button>
                </div>

                {/* SKU للمتغيّر — قابل للتعديل وقابل لإعادة التوليد */}
                <div className="mt-3 flex items-center gap-2 border-t pt-3">
                  <label className="text-xs font-medium text-muted shrink-0">
                    كود SKU
                  </label>
                  <input
                    className="input nums flex-1"
                    value={row.sku}
                    onChange={(e) => {
                      const v = e.target.value;
                      setVariants((rows) =>
                        rows.map((r) =>
                          r.clientId === row.clientId
                            ? { ...r, sku: v, skuOverridden: true }
                            : r
                        )
                      );
                    }}
                    placeholder={autoSkuFor(row) || "—"}
                  />
                  <button
                    type="button"
                    onClick={() => regenerateSku(row)}
                    className="btn btn-ghost h-9 w-9 !px-0 text-accent hover:bg-accent-soft"
                    aria-label="إعادة توليد"
                    title="إعادة توليد تلقائياً"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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

      <AddBrandModal
        open={brandModalOpen}
        category={category}
        onClose={() => setBrandModalOpen(false)}
        onAdded={(b) => {
          setBrand(b.name);
          regenerateAllAutoSkus(b.name, productTypeId);
          refetchBrands();
        }}
      />

      <AddTypeModal
        open={typeModalOpen}
        category={category}
        onClose={() => setTypeModalOpen(false)}
        onAdded={(t) => {
          setProductTypeId(t.id);
          regenerateAllAutoSkus(brand, t.id);
          refetchTypes();
        }}
      />
    </form>
  );
}
