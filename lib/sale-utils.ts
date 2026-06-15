import type { DiscountTypeValue } from "./constants";

// حساب قيمة الخصم والمبلغ النهائي — مصدر واحد للحقيقة (الواجهة + الـ API)
export function calcDiscount(
  totalAmount: number,
  discountType: DiscountTypeValue | null,
  discountValue: number
): { discountAmount: number; finalAmount: number } {
  let discountAmount = 0;

  if (discountType === "PERCENTAGE") {
    const pct = Math.min(Math.max(discountValue, 0), 100);
    discountAmount = (totalAmount * pct) / 100;
  } else if (discountType === "FIXED") {
    discountAmount = Math.max(discountValue, 0);
  }

  // لا يتجاوز الخصم قيمة الفاتورة
  discountAmount = Math.min(discountAmount, totalAmount);
  const finalAmount = Math.max(totalAmount - discountAmount, 0);

  return {
    discountAmount: round2(discountAmount),
    finalAmount: round2(finalAmount),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
