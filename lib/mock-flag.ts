// مفتاح وضع المعاينة من جهة المتصفح:
// - NEXT_PUBLIC_MOCK=1 / true  → تفعيل البيانات التجريبية (بدون أي طلبات API)
// - NEXT_PUBLIC_MOCK=0 / false → استخدام الـ API الحقيقي
// - غير محدد → مفعّل تلقائياً في التطوير، ومعطّل في الإنتاج
const flag = process.env.NEXT_PUBLIC_MOCK;

export const USE_CLIENT_MOCK =
  flag === "1" || flag === "true"
    ? true
    : flag === "0" || flag === "false"
      ? false
      : process.env.NODE_ENV !== "production";
