import type { PrismaClient, Category } from "@prisma/client";
import {
  DEFAULT_PRODUCT_TYPES,
  RENAMED_PRODUCT_TYPES,
} from "./constants";

// نتيجة مزامنة الأنواع الافتراضية
export interface SeedProductTypesResult {
  added: number; // أنواع جديدة أُضيفت
  updated: number; // أنواع موجودة حُدِّث كودها اللاتيني
  total: number; // إجمالي الأنواع بعد المزامنة
  mode: "db" | "mock";
}

// مزامنة أنواع المنتجات مع القائمة الافتراضية الموحّدة (idempotent):
//  - تُضاف الأنواع الناقصة.
//  - يُحدَّث الكود اللاتيني إن تغيّر فقط.
//  - لا تُحذف أبداً الأنواع التي أضافها المستخدم.
//  - الأنواع المُعاد تسميتها (مثل «بلوزة» → «قميص») تُهاجَر منتجاتها ثم تُحذف.
export async function seedProductTypes(
  prisma: PrismaClient
): Promise<SeedProductTypesResult> {
  let added = 0;
  let updated = 0;

  // 1) upsert الأنواع الافتراضية (يضمن وجود الأنواع البديلة مثل «قميص» قبل الهجرة)
  for (const def of DEFAULT_PRODUCT_TYPES) {
    const existing = await prisma.productType.findUnique({
      where: {
        name_category: {
          name: def.name,
          category: def.category as Category,
        },
      },
      select: { id: true, code: true },
    });

    if (!existing) {
      await prisma.productType.create({
        data: {
          name: def.name,
          code: def.code,
          category: def.category as Category,
        },
      });
      added++;
    } else if (existing.code !== def.code) {
      await prisma.productType.update({
        where: { id: existing.id },
        data: { code: def.code },
      });
      updated++;
    }
  }

  // 2) هجرة الأنواع المُعاد تسميتها: إعادة ربط المنتجات بالنوع البديل ثم حذف القديم
  for (const ren of RENAMED_PRODUCT_TYPES) {
    const fromType = await prisma.productType.findUnique({
      where: {
        name_category: {
          name: ren.from,
          category: ren.category as Category,
        },
      },
      select: { id: true },
    });
    if (!fromType) continue;

    const target = await prisma.productType.findUnique({
      where: {
        name_category: {
          name: ren.to,
          category: ren.category as Category,
        },
      },
      select: { id: true },
    });
    if (target) {
      await prisma.product.updateMany({
        where: { productTypeId: fromType.id },
        data: { productTypeId: target.id },
      });
    }
    await prisma.productType.delete({ where: { id: fromType.id } });
  }

  const total = await prisma.productType.count();
  return { added, updated, total, mode: "db" };
}
