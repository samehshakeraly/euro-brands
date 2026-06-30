import { ok, handleServerError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { MOCK_MODE, mockSeedProductTypes } from "@/lib/mock-store";
import { seedProductTypes } from "@/lib/product-types-seed";

export const dynamic = "force-dynamic";

// POST /api/seed/product-types — مزامنة أنواع المنتجات مع القائمة الافتراضية.
// عملية idempotent وغير مدمّرة: تُضيف الناقص وتُحدّث الأكواد المتغيّرة فقط،
// ولا تحذف الأنواع التي أضافها المستخدم. تُرجع { added, updated, total, mode }.
export async function POST() {
  try {
    if (MOCK_MODE) return ok(mockSeedProductTypes());
    return ok(await seedProductTypes(prisma));
  } catch (error) {
    return handleServerError(error);
  }
}
