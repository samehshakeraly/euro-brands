import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// GET /api/sales/[id] — تفاصيل فاتورة كاملة
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, brand: true } },
            variant: { select: { size: true } },
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
