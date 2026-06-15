import { put } from "@vercel/blob";
import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE, mockUploadUrl } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB (حد جسم الطلب على Vercel)

// POST /api/upload — رفع صورة منتج إلى Vercel Blob
export async function POST(req: Request) {
  try {
    // وضع المعاينة: نعيد صورة بديلة دون رفع فعلي
    if (MOCK_MODE) return ok({ url: mockUploadUrl() });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return fail(
        "خدمة رفع الصور غير مهيأة (BLOB_READ_WRITE_TOKEN غير موجود). يمكنك إدخال رابط صورة يدوياً.",
        503
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return fail("لم يتم اختيار ملف صورة");
    if (!file.type.startsWith("image/"))
      return fail("الملف المرفوع يجب أن يكون صورة");
    if (file.size > MAX_SIZE)
      return fail("حجم الصورة كبير جداً (الحد الأقصى 4 ميجابايت)");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`products/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return ok({ url: blob.url });
  } catch (error) {
    return handleServerError(error);
  }
}
