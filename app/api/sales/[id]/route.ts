import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";
import { MOCK_MODE, mockGetSale } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET /api/sales/[id] — تفاصيل فاتورة كاملة
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (MOCK_MODE) {
      const dto = mockGetSale(params.id);
      return dto ? ok(dto) : fail("الفاتورة غير موجودة", 404);
    }
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, brand: true } },
            variant: { select: { size: true, color: true } },
          },
        },
      },
    });
    if (!sale) return fail("الفاتورة غير موجودة", 404);
    return ok(toSaleDTO(sale));
  } catch (error) {
    return handleServerError(error);
  }
}
