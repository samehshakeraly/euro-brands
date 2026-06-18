import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";
import { MOCK_MODE, mockCancelSale } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

const saleInclude = {
  items: {
    include: {
      product: { select: { name: true, brand: true } },
      variant: { select: { size: true, color: true } },
    },
  },
} satisfies Prisma.SaleInclude;

// POST /api/sales/[id]/cancel — إلغاء الفاتورة وإعادة الكميات للمخزون
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "—";

    if (MOCK_MODE) {
      const res = mockCancelSale(params.id, reason);
      return res.ok ? ok(res.sale) : fail(res.error, res.status);
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: params.id },
        include: { items: true },
      });
      if (!sale)
        return { ok: false as const, error: "الفاتورة غير موجودة", status: 404 };
      if (sale.status === "CANCELLED")
        return { ok: false as const, error: "الفاتورة ملغية بالفعل", status: 409 };

      // إعادة الكميات للمخزون
      for (const it of sale.items) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { quantity: { increment: it.quantity } },
        });
      }

      const updated = await tx.sale.update({
        where: { id: params.id },
        data: { status: "CANCELLED", cancellationReason: reason },
        include: saleInclude,
      });
      return { ok: true as const, sale: updated };
    });

    if (!result.ok) return fail(result.error, result.status);
    return ok(toSaleDTO(result.sale));
  } catch (error) {
    return handleServerError(error);
  }
}
