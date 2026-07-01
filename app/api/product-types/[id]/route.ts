import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE, mockDeleteProductType } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// DELETE /api/product-types/[id] — حذف نوع المنتج (FK على المنتجات: SET NULL تلقائياً)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (MOCK_MODE) {
      const removed = mockDeleteProductType(params.id);
      return removed ? ok({ id: params.id }) : fail("النوع غير موجود", 404);
    }
    await prisma.productType.delete({ where: { id: params.id } });
    return ok({ id: params.id });
  } catch (error) {
    return handleServerError(error);
  }
}
