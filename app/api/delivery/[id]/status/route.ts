import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";
import { parseDeliveryStatus, ValidationError } from "@/lib/validate";
import { MOCK_MODE, mockUpdateDeliveryStatus } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

const saleInclude = {
  items: {
    include: {
      product: { select: { name: true, brand: true } },
      variant: { select: { size: true, color: true } },
    },
  },
} satisfies Prisma.SaleInclude;

// POST /api/delivery/[id]/status — تحديث حالة طلب التوصيل
// عند التحويل إلى «مرتجع» تُعاد الكميات تلقائياً إلى المخزون (داخل معاملة).
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const newStatus = parseDeliveryStatus(body);

    if (MOCK_MODE) {
      const res = mockUpdateDeliveryStatus(params.id, newStatus);
      return res.ok ? ok(res.sale) : fail(res.error, res.status);
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: params.id },
        include: { items: true },
      });
      if (!sale)
        return { ok: false as const, error: "الطلب غير موجود", status: 404 };
      if (!sale.isDelivery)
        return {
          ok: false as const,
          error: "هذه ليست فاتورة توصيل",
          status: 422,
        };

      const oldStatus = sale.deliveryStatus;
      if (oldStatus === newStatus) {
        const unchanged = await tx.sale.findUnique({
          where: { id: params.id },
          include: saleInclude,
        });
        return { ok: true as const, sale: unchanged! };
      }

      // إذا انتقلنا إلى «مرتجع» من حالة أخرى، أعد الكميات للمخزون
      if (newStatus === "RETURNED" && oldStatus !== "RETURNED") {
        for (const it of sale.items) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { quantity: { increment: it.quantity } },
          });
        }
      } else if (oldStatus === "RETURNED" && newStatus !== "RETURNED") {
        // تراجع عن المرتجع: اخصم الكميات مجدداً
        for (const it of sale.items) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { quantity: { decrement: it.quantity } },
          });
        }
      }

      const updated = await tx.sale.update({
        where: { id: params.id },
        data: { deliveryStatus: newStatus },
        include: saleInclude,
      });
      return { ok: true as const, sale: updated };
    });

    if (!result.ok) return fail(result.error, result.status);
    return ok(toSaleDTO(result.sale));
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return handleServerError(error);
  }
}
