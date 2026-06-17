import { type Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, handleServerError } from "@/lib/api";
import { DEFAULT_PRODUCT_TYPES } from "@/lib/constants";
import { MOCK_MODE, mockSeedProductTypes } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// POST /api/seed/product-types — زرع أنواع المنتجات الافتراضية
// عمل idempotent: يُضيف الأنواع المفقودة ويُحدّث الكود إذا تغيّر، بلا حذف.
export async function POST() {
  try {
    if (MOCK_MODE) {
      const result = mockSeedProductTypes();
      return ok({ ...result, mode: "mock" });
    }

    let added = 0;
    let updated = 0;
    for (const cat of Object.keys(DEFAULT_PRODUCT_TYPES) as Category[]) {
      for (const t of DEFAULT_PRODUCT_TYPES[cat]) {
        const before = await prisma.productType.findUnique({
          where: { name_category: { name: t.name, category: cat } },
          select: { code: true },
        });
        if (!before) {
          await prisma.productType.create({
            data: { name: t.name, code: t.code, category: cat },
          });
          added++;
        } else if (before.code !== t.code) {
          await prisma.productType.update({
            where: { name_category: { name: t.name, category: cat } },
            data: { code: t.code },
          });
          updated++;
        }
      }
    }

    const total = await prisma.productType.count();
    return ok({ added, updated, total, mode: "db" });
  } catch (error) {
    return handleServerError(error);
  }
}
