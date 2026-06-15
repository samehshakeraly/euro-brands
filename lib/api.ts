import { NextResponse } from "next/server";

// مساعدات موحّدة لاستجابات الـ API
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// تغليف المعالج لالتقاط الأخطاء غير المتوقعة
export function handleServerError(error: unknown) {
  console.error("[API ERROR]", error);
  const message =
    error instanceof Error ? error.message : "حدث خطأ غير متوقع في الخادم";
  return fail(message, 500);
}
