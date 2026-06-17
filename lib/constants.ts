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
