// مساعد تسجيل النشاط من جهة المتصفح.
// يقرأ المستخدم الحالي من الجلسة ويرسل سجلاً إلى /api/activity.
// أخطاء التسجيل تُتجاهل حتى لا تعطّل العملية الأساسية.
import { apiPost } from "./client";
import { getCurrentUser } from "./auth";

export const ACTIVITY_ACTIONS = {
  LOGIN: "تسجيل دخول",
  CREATE_SALE: "إنشاء فاتورة",
  CANCEL_SALE: "إلغاء فاتورة",
  ADD_PRODUCT: "إضافة منتج",
  EDIT_PRODUCT: "تعديل منتج",
  DELETE_PRODUCT: "حذف منتج",
  DELIVERY_STATUS: "تغيير حالة توصيل",
} as const;

export async function logActivity(
  action: string,
  details?: string | null,
  // اختياري: تمرير المستخدم صراحةً (مفيد فور تسجيل الدخول قبل تحديث الحالة)
  user?: { name: string; role: string } | null
): Promise<void> {
  const actor = user ?? getCurrentUser();
  if (!actor) return;
  try {
    await apiPost("/api/activity", {
      userName: actor.name,
      userRole: actor.role,
      action,
      details: details ?? null,
    });
  } catch {
    // تجاهل
  }
}
