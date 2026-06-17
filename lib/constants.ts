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

// مصادر الطلب الافتراضية (قابلة للإضافة في الواجهة)
export const DEFAULT_ORDER_SOURCES = [
  "تليفون",
  "فيسبوك",
  "انستجرام",
  "واتساب",
  "ماسنجر",
] as const;

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
