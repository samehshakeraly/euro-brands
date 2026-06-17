import { Prisma, type Branch, type Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toProductDTO } from "@/lib/serializers";
import { parseProductInput, ValidationError } from "@/lib/validate";
import {
  MOCK_MODE,
  mockGetProduct,
  mockUpdateProduct,
  mockDeleteProduct,
} from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET /api/products/[id] — منتج واحد بتفاصيله
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (MOCK_MODE) {
      const dto = mockGetProduct(params.id);
      return dto ? ok(dto) : fail("المنتج غير موجود", 404);
    }
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: { orderBy: [{ branch: "asc" }, { size: "asc" }] },
      },
    });
    if (!product) return fail("المنتج غير موجود", 404);
    return ok(toProductDTO(product));
  } catch (error) {
    return handleServerError(error);
  }
}

// PUT /api/products/[id] — تعديل منتج ومقاساته
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const input = parseProductInput(body);
    const id = params.id;

    if (MOCK_MODE) {
      const dto = mockUpdateProduct(id, input);
      return dto ? ok(dto) : fail("المنتج غير موجود", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));
      const keptIds = new Set(
        input.variants
          .map((v) => v.id)
          .filter((vid): vid is string => !!vid && existingIds.has(vid))
      );

      // المقاسات المحذوفة من النموذج
      const removedIds = [...existingIds].filter((eid) => !keptIds.has(eid));
      if (removedIds.length > 0) {
        // لا يمكن حذف مقاس مرتبط بفواتير سابقة — نصفّر كميته بدلاً من ذلك
        const referenced = await tx.saleItem.findMany({
          where: { variantId: { in: removedIds } },
          select: { variantId: true },
          distinct: ["variantId"],
        });
        const referencedIds = new Set(referenced.map((r) => r.variantId));
        const deletable = removedIds.filter((rid) => !referencedIds.has(rid));
        const zeroable = removedIds.filter((rid) => referencedIds.has(rid));

        if (deletable.length > 0)
          await tx.productVariant.deleteMany({
            where: { id: { in: deletable } },
          });
        if (zeroable.length > 0)
          await tx.productVariant.updateMany({
            where: { id: { in: zeroable } },
            data: { quantity: 0 },
          });
      }

      // تحديث/إضافة المقاسات
      for (const v of input.variants) {
        if (v.id && existingIds.has(v.id)) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              size: v.size,
              branch: v.branch as Branch,
              quantity: v.quantity,
              minQuantity: v.minQuantity,
              price: v.price,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              size: v.size,
              branch: v.branch as Branch,
              quantity: v.quantity,
              minQuantity: v.minQuantity,
              price: v.price,
            },
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          name: input.name,
          brand: input.brand,
          category: input.category as Category,
          description: input.description,
          sku: input.sku ?? null,
          barcode: input.barcode ?? null,
          images: input.images,
        },
        include: { variants: { orderBy: [{ branch: "asc" }, { size: "asc" }] } },
      });
    });

    // تسجيل البراند ضمن سجل البراندات للفئة
    await prisma.brand.upsert({
      where: {
        name_category: {
          name: input.brand,
          category: input.category as Category,
        },
      },
      update: {},
      create: { name: input.brand, category: input.category as Category },
    });

    return ok(toProductDTO(updated));
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return fail("المنتج غير موجود", 404);
      if (error.code === "P2002")
        return fail("يوجد تكرار في نفس المقاس والفرع", 422);
    }
    return handleServerError(error);
  }
}

// DELETE /api/products/[id] — حذف منتج
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (MOCK_MODE) {
      const res = mockDeleteProduct(params.id);
      return res.ok ? ok({ success: true }) : fail(res.error, res.status);
    }

    // منع الحذف إذا كان المنتج مرتبطاً بفواتير (للحفاظ على سجل المبيعات)
    const salesCount = await prisma.saleItem.count({
      where: { productId: params.id },
    });
    if (salesCount > 0) {
      return fail(
        "لا يمكن حذف منتج مرتبط بفواتير سابقة. يمكنك تصفير كمياته بدلاً من ذلك.",
        409
      );
    }

    await prisma.product.delete({ where: { id: params.id } });
    return ok({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return fail("المنتج غير موجود", 404);
    }
    return handleServerError(error);
  }
}
