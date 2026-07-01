// توليد كود SKU التلقائي لكل صنف.
// الصيغة: {TYPE_CODE}-{PRODUCT_SHORT}-{SIZE}-{BRANCH}-{COLOR?}
//   TYPE_CODE      : code من ProductType (مثلاً TSH, SNK)؛ "GEN" إن لم يكن محدداً.
//   PRODUCT_SHORT  : آخر 6 حروف من معرف المنتج بحروف كبيرة.
//   SIZE           : المقاس كما هو، مع إزالة الفراغات.
//   BRANCH         : H للحدائق، Z لزهراء.
//   COLOR          : 3 حروف مختصرة من اللون (اختياري، يُحذف الجزء كلياً عند غياب اللون).
//
// ملاحظة: الـ SKU يجب أن يكون فريداً عالمياً (قيد @unique على Variant.sku).
// لو نتج تكرار (مثلاً عند تكرار اللون نفسه في فرع آخر بعد إعادة الترميز)،
// نلحق رقم تسلسلي قصير `-2`, `-3` ... حتى يصير فريداً (يُمَرَّر set الحالي).

import type { BranchValue } from "./constants";

const BRANCH_LETTER: Record<BranchValue, string> = {
  HADAYEK: "H",
  ZAHRAA: "Z",
};

function slugifyShort(value: string, max = 3): string {
  // نحتفظ بالحروف اللاتينية والأرقام فقط، ونحوّل لمكتوبة كبيرة. لو ما فيش حروف لاتينية (مثلاً اسم عربي)،
  // نستخدم HEX قصير من رمز Unicode للأحرف الأولى عشان يبقى ASCII-safe في الـ SKU.
  const clean = value.trim();
  if (!clean) return "";
  const asciiOnly = clean.replace(/[^A-Za-z0-9]/g, "");
  if (asciiOnly) return asciiOnly.toUpperCase().slice(0, max);
  // عربي/Unicode → نأخذ مجموع نقاط أول حرفين كـ hex قصير
  const c1 = clean.charCodeAt(0) || 0;
  const c2 = clean.charCodeAt(1) || 0;
  return (
    (c1.toString(16) + c2.toString(16))
      .toUpperCase()
      .slice(0, Math.max(2, max))
  );
}

export function buildVariantSku(args: {
  productId: string;
  typeCode: string | null | undefined;
  size: string;
  branch: BranchValue;
  color: string | null | undefined;
}): string {
  const typeCode = (args.typeCode || "GEN").toUpperCase().replace(/\s+/g, "");
  const productShort = args.productId.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase();
  const sizeClean = args.size.replace(/\s+/g, "");
  const branchLetter = BRANCH_LETTER[args.branch];
  const parts = [typeCode, productShort, sizeClean, branchLetter];
  if (args.color && args.color.trim()) {
    const colorShort = slugifyShort(args.color, 3);
    if (colorShort) parts.push(colorShort);
  }
  return parts.join("-");
}

// يضمن عدم تكرار الـ SKU داخل مجموعة معطاة (مثلاً ضمن نفس المنتج عند الإنشاء).
// لا يُغني عن فحص قاعدة البيانات، لكنه يمنع التكرار داخل نفس الطلب.
export function uniquifySku(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  const out = `${base}-${n}`;
  taken.add(out);
  return out;
}
