// القيم الثابتة والمسميات العربية المشتركة

export const BRANCHES = ["HADAYEK", "ZAHRAA"] as const;
export type BranchValue = (typeof BRANCHES)[number];

export const BRANCH_LABELS: Record<BranchValue, string> = {
  HADAYEK: "حدائق المعادي",
  ZAHRAA: "زهراء المعادي",
};

export const CATEGORIES = ["CLOTHES", "SHOES", "PERFUMES", "PANTS"] as const;
export type CategoryValue = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  CLOTHES: "ملابس",
  SHOES: "أحذية",
  PERFUMES: "عطور",
  PANTS: "بناطيل",
};

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type DiscountTypeValue = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_LABELS: Record<DiscountTypeValue, string> = {
  PERCENTAGE: "نسبة مئوية %",
  FIXED: "مبلغ ثابت (ج.م)",
};

export const PAYMENT_METHODS = ["CASH", "VISA", "TRANSFER"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  CASH: "كاش",
  VISA: "فيزا",
  TRANSFER: "تحويل",
};

export const TRANSFER_METHODS = ["VODAFONE_CASH", "INSTAPAY"] as const;
export type TransferMethodValue = (typeof TRANSFER_METHODS)[number];

export const TRANSFER_METHOD_LABELS: Record<TransferMethodValue, string> = {
  VODAFONE_CASH: "فودافون كاش",
  INSTAPAY: "انستا باي",
};

export const SALE_STATUSES = ["COMPLETED", "CANCELLED"] as const;
export type SaleStatusValue = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatusValue, string> = {
  COMPLETED: "مكتملة",
  CANCELLED: "ملغية",
};

// طريقة التوصيل
export const DELIVERY_METHODS = ["CUSTOM", "BOSTA"] as const;
export type DeliveryMethodValue = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethodValue, string> = {
  CUSTOM: "عامل خاص",
  BOSTA: "Bosta",
};

// حالة طلب التوصيل
export const DELIVERY_STATUSES = [
  "NEW",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
] as const;
export type DeliveryStatusValue = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusValue, string> = {
  NEW: "جديد",
  PREPARING: "قيد التجهيز",
  READY: "جاهز للشحن",
  OUT_FOR_DELIVERY: "خرج للتوصيل",
  DELIVERED: "تم التوصيل",
  RETURNED: "مرتجع",
};

// مصادر طلب التوصيل — قيم enum ثابتة (الواجهة تعرض التسميات العربية فقط)
export const ORDER_SOURCES = [
  "PHONE",
  "FACEBOOK",
  "INSTAGRAM",
  "WHATSAPP",
  "MESSENGER",
] as const;
export type OrderSourceValue = (typeof ORDER_SOURCES)[number];

export const ORDER_SOURCE_LABELS: Record<OrderSourceValue, string> = {
  PHONE: "تليفون",
  FACEBOOK: "فيسبوك",
  INSTAGRAM: "انستجرام",
  WHATSAPP: "واتساب",
  MESSENGER: "ماسنجر",
};

// المقاسات المتاحة حسب الفئة
export const CLOTHING_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
] as const;

export const SHOE_SIZES = [
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
] as const;

// كل المقاسات المتاحة في القوائم المنسدلة
export const ALL_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES];

// المقاسات المقترحة بناءً على الفئة
export function sizesForCategory(category: CategoryValue): readonly string[] {
  if (category === "SHOES") return SHOE_SIZES;
  return CLOTHING_SIZES;
}

export const CURRENCY = "ج.م";
export const LOW_STOCK_THRESHOLD = 3; // عتبة تحذير قلة المخزون

// ----------------------------------------------------
//  ألوان المنتجات — قائمة ثابتة بالأكواد المختصرة
// ----------------------------------------------------
export const COLORS = [
  { name: "أبيض", code: "WHT", hex: "#ffffff" },
  { name: "أسود", code: "BLK", hex: "#1a1a1a" },
  { name: "رمادي", code: "GRY", hex: "#888888" },
  { name: "أزرق", code: "BLU", hex: "#3b82f6" },
  { name: "أحمر", code: "RED", hex: "#ef4444" },
  { name: "أخضر", code: "GRN", hex: "#22c55e" },
  { name: "بيج", code: "BEG", hex: "#d2b48c" },
  { name: "بني", code: "BRN", hex: "#92400e" },
  { name: "وردي", code: "PNK", hex: "#ec4899" },
  { name: "أصفر", code: "YLW", hex: "#eab308" },
  { name: "برتقالي", code: "ORG", hex: "#f97316" },
  { name: "بنفسجي", code: "PUR", hex: "#a855f7" },
] as const;

export type ColorName = (typeof COLORS)[number]["name"];

export const COLOR_NAMES: readonly string[] = COLORS.map((c) => c.name);

export function colorMeta(
  name: string | null | undefined
): { name: string; code: string; hex: string } | null {
  if (!name) return null;
  return COLORS.find((c) => c.name === name) ?? null;
}

// ----------------------------------------------------
//  أنواع المنتجات الافتراضية حسب الفئة
// ----------------------------------------------------
export const DEFAULT_PRODUCT_TYPES: Record<
  CategoryValue,
  { name: string; code: string }[]
> = {
  CLOTHES: [
    { name: "تيشرت", code: "TSHIRT" },
    { name: "بولو", code: "POLO" },
    { name: "هودي", code: "HOOD" },
    { name: "سويت شيرت", code: "SWEAT" },
    { name: "جاكيت", code: "JKT" },
    { name: "بليزر", code: "BLZR" },
    { name: "قميص", code: "SHIRT" },
    { name: "اخرى", code: "OTHER" },
  ],
  PANTS: [
    { name: "جينز", code: "JEANS" },
    { name: "سوت بانتس", code: "SWEATP" },
    { name: "شورت", code: "SHORT" },
    { name: "كارجو", code: "CARGO" },
    { name: "ميوه", code: "MIO" },
    { name: "اخرى", code: "OTHER" },
  ],
  SHOES: [
    { name: "سنيكرز", code: "SNK" },
    { name: "صندل", code: "SNDL" },
    { name: "بوت", code: "BOOT" },
    { name: "كلاسيك", code: "CLSC" },
    { name: "شبشب", code: "SHIB" },
    { name: "سليبر", code: "SLPR" },
    { name: "اخرى", code: "OTHER" },
  ],
  PERFUMES: [
    { name: "عطر رجالي", code: "MEN" },
    { name: "عطر حريمي", code: "WOM" },
    { name: "عطر مشترك", code: "UNI" },
    { name: "اخرى", code: "OTHER" },
  ],
};

// ----------------------------------------------------
//  مولّد كود SKU للمتغيّر
//  الشكل: [BRAND]-[TYPE]-[COLOR]-[SIZE]-[BRANCH]
//  مثال: NIK-HOOD-BLK-M-HAD
// ----------------------------------------------------
export const BRANCH_SKU_CODES: Record<BranchValue, string> = {
  HADAYEK: "HAD",
  ZAHRAA: "ZAH",
};

export function brandSkuCode(brand: string): string {
  const cleaned = brand.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  return cleaned || "BRD";
}

export function sizeSkuCode(size: string): string {
  return (
    String(size ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") || "U"
  );
}

export function generateVariantSku(parts: {
  brand: string;
  typeCode?: string | null;
  colorCode?: string | null;
  size: string;
  branch: BranchValue;
}): string {
  return [
    brandSkuCode(parts.brand),
    (parts.typeCode || "GEN").toUpperCase(),
    (parts.colorCode || "DEF").toUpperCase(),
    sizeSkuCode(parts.size),
    BRANCH_SKU_CODES[parts.branch],
  ].join("-");
}
