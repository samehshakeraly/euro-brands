import {
  BRANCHES,
  CATEGORIES,
  DISCOUNT_TYPES,
  type BranchValue,
  type CategoryValue,
} from "./constants";
import type {
  BrandInput,
  ImportRow,
  ProductInput,
  SaleInput,
  VariantInput,
} from "./types";

export class ValidationError extends Error {}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// التحقق من مدخلات المنتج
export function parseProductInput(body: any): ProductInput {
  const name = asString(body?.name);
  const brand = asString(body?.brand);
  const category = asString(body?.category);

  if (!name) throw new ValidationError("اسم المنتج مطلوب");
  if (!brand) throw new ValidationError("البراند مطلوب");
  if (!CATEGORIES.includes(category as CategoryValue))
    throw new ValidationError("الفئة غير صحيحة");

  const images: string[] = Array.isArray(body?.images)
    ? body.images.filter((x: unknown) => typeof x === "string").slice(0, 3)
    : [];

  const rawVariants = Array.isArray(body?.variants) ? body.variants : [];
  if (rawVariants.length === 0)
    throw new ValidationError("يجب إضافة صف واحد على الأقل للمقاسات والكميات");

  const seen = new Set<string>();
  const variants: VariantInput[] = rawVariants.map((v: any, i: number) => {
    const size = asString(v?.size);
    const branch = asString(v?.branch);
    const quantity = Number(v?.quantity);
    const price = Number(v?.price);
    const minRaw = Number(v?.minQuantity);
    const minQuantity =
      Number.isFinite(minRaw) && minRaw >= 0 ? Math.floor(minRaw) : 5;

    if (!size) throw new ValidationError(`المقاس مطلوب في الصف ${i + 1}`);
    if (!BRANCHES.includes(branch as BranchValue))
      throw new ValidationError(`الفرع غير صحيح في الصف ${i + 1}`);
    if (!Number.isFinite(quantity) || quantity < 0)
      throw new ValidationError(`الكمية غير صحيحة في الصف ${i + 1}`);
    if (!Number.isFinite(price) || price < 0)
      throw new ValidationError(`السعر غير صحيح في الصف ${i + 1}`);

    const key = `${size}__${branch}`;
    if (seen.has(key))
      throw new ValidationError(
        `لا يمكن تكرار نفس المقاس في نفس الفرع (${size})`
      );
    seen.add(key);

    const id = asString(v?.id) || undefined;

    return {
      id,
      size,
      branch: branch as BranchValue,
      quantity: Math.floor(quantity),
      minQuantity,
      price,
    };
  });

  return {
    name,
    brand,
    category: category as CategoryValue,
    description: asString(body?.description) || null,
    sku: asString(body?.sku) || null,
    barcode: asString(body?.barcode) || null,
    images,
    variants,
  };
}

// التحقق من صفوف استيراد الجرد
export function parseImportRows(body: any): ImportRow[] {
  const raw = Array.isArray(body?.rows) ? body.rows : [];
  if (raw.length === 0)
    throw new ValidationError("لا توجد صفوف صالحة للاستيراد");

  return raw.map((r: any, i: number) => {
    const name = asString(r?.name);
    const brand = asString(r?.brand);
    const category = asString(r?.category);
    const branch = asString(r?.branch);
    const size = asString(r?.size);
    const quantity = Number(r?.quantity);
    const price = Number(r?.price);
    const at = `الصف ${i + 1}`;

    if (!name) throw new ValidationError(`اسم المنتج مطلوب (${at})`);
    if (!brand) throw new ValidationError(`البراند مطلوب (${at})`);
    if (!CATEGORIES.includes(category as CategoryValue))
      throw new ValidationError(`الفئة غير صحيحة (${at})`);
    if (!BRANCHES.includes(branch as BranchValue))
      throw new ValidationError(`الفرع غير صحيح (${at})`);
    if (!size) throw new ValidationError(`المقاس مطلوب (${at})`);
    if (!Number.isFinite(quantity) || quantity < 0)
      throw new ValidationError(`الكمية غير صحيحة (${at})`);
    if (!Number.isFinite(price) || price < 0)
      throw new ValidationError(`السعر غير صحيح (${at})`);

    return {
      name,
      brand,
      category: category as CategoryValue,
      branch: branch as BranchValue,
      size,
      quantity: Math.floor(quantity),
      price,
    };
  });
}

// التحقق من مدخلات البراند
export function parseBrandInput(body: any): BrandInput {
  const name = asString(body?.name);
  const category = asString(body?.category);
  if (!name) throw new ValidationError("اسم البراند مطلوب");
  if (!CATEGORIES.includes(category as CategoryValue))
    throw new ValidationError("الفئة غير صحيحة");
  return { name, category: category as CategoryValue };
}

// التحقق من مدخلات الفاتورة
export function parseSaleInput(body: any): SaleInput {
  const branch = asString(body?.branch);
  if (!BRANCHES.includes(branch as BranchValue))
    throw new ValidationError("يجب اختيار الفرع");

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0)
    throw new ValidationError("الفاتورة فارغة — أضف منتجات أولاً");

  const items = rawItems.map((it: any, i: number) => {
    const variantId = asString(it?.variantId);
    const quantity = Number(it?.quantity);
    if (!variantId)
      throw new ValidationError(`عنصر غير صحيح في الفاتورة (الصف ${i + 1})`);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new ValidationError(`الكمية غير صحيحة (الصف ${i + 1})`);
    return { variantId, quantity: Math.floor(quantity) };
  });

  let discountType = body?.discountType ?? null;
  if (discountType !== null && !DISCOUNT_TYPES.includes(discountType))
    throw new ValidationError("نوع الخصم غير صحيح");

  const discountValue = Number(body?.discountValue) || 0;
  if (discountValue < 0) throw new ValidationError("قيمة الخصم غير صحيحة");
  if (discountValue === 0) discountType = null;

  return {
    branch: branch as BranchValue,
    items,
    discountType,
    discountValue,
    customerName: asString(body?.customerName) || null,
    customerPhone: asString(body?.customerPhone) || null,
    customerNotes: asString(body?.customerNotes) || null,
  };
}
