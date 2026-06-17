import {
  Prisma,
  type Branch,
  type DiscountType,
  type PaymentMethod,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toSaleDTO } from "@/lib/serializers";
import { parseSaleInput, ValidationError } from "@/lib/validate";
import { calcDiscount, round2 } from "@/lib/sale-utils";
import { MOCK_MODE, mockListSales, mockCreateSale } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

const saleInclude = {
  items: {
    include: {
      product: { select: { name: true, brand: true } },
      variant: { select: { size: true } },
    },
  },
} satisfies Prisma.SaleInclude;

// GET /api/sales — سجل الفواتير مع الفلاتر
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (MOCK_MODE) return ok(mockListSales(searchParams));
    const branch = searchParams.get("branch");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);

    const where: Prisma.SaleWhereInput = {};
    if (branch) where.branch = branch as Branch;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (search) {
      const or: Prisma.SaleWhereInput[] = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
      ];
      const asNumber = Number(search.replace(/[#\s]/g, ""));
      if (Number.isInteger(asNumber)) or.push({ saleNumber: asNumber });
      where.OR = or;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: saleInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok(sales.map(toSaleDTO));
  } catch (error) {
    return handleServerError(error);
  }
}

// POST /api/sales — تأكيد بيعة جديدة وخصم المخزون
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = parseSaleInput(body);

    if (MOCK_MODE) return ok(mockCreateSale(input), 201);

    // دمج الكميات المكررة لنفس المقاس
    const merged = new Map<string, number>();
    for (const it of input.items) {
      merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + it.quantity);
    }
    const variantIds = [...merged.keys()];

    // محاولة الإنشاء مع إعادة المحاولة عند تعارض رقم الفاتورة (نادر)
    let attempts = 0;
    while (true) {
      try {
        const sale = await prisma.$transaction(async (tx) => {
          const variants = await tx.productVariant.findMany({
            where: { id: { in: variantIds } },
            include: { product: { select: { name: true } } },
          });
          const vmap = new Map(variants.map((v) => [v.id, v]));

          let totalAmount = 0;
          const itemsData = [];
          for (const [variantId, qty] of merged.entries()) {
            const v = vmap.get(variantId);
            if (!v)
              throw new ValidationError("أحد المنتجات لم يعد متاحاً في المخزون");
            if (v.branch !== (input.branch as Branch))
              throw new ValidationError(
                `المنتج "${v.product.name}" لا ينتمي للفرع المحدد`
              );
            if (v.quantity < qty)
              throw new ValidationError(
                `الكمية غير كافية من "${v.product.name}" مقاس ${v.size} (المتاح: ${v.quantity})`
              );

            const subtotal = round2(v.price * qty);
            totalAmount += subtotal;
            itemsData.push({
              productId: v.productId,
              variantId: v.id,
              quantity: qty,
              unitPrice: v.price,
              subtotal,
            });
          }

          totalAmount = round2(totalAmount);
          const { finalAmount } = calcDiscount(
            totalAmount,
            input.discountType,
            input.discountValue
          );

          // الدفع الجزئي: المبلغ المدفوع والمتبقي
          const paidAmount =
            input.paidAmount == null
              ? finalAmount
              : Math.min(Math.max(input.paidAmount, 0), finalAmount);
          const remainingAmount = round2(finalAmount - paidAmount);

          // خصم الكميات من مخزون الفرع
          for (const [variantId, qty] of merged.entries()) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: { quantity: { decrement: qty } },
            });
          }

          // رقم فاتورة تصاعدي عام
          const last = await tx.sale.findFirst({
            orderBy: { saleNumber: "desc" },
            select: { saleNumber: true },
          });
          const saleNumber = (last?.saleNumber ?? 0) + 1;

          return tx.sale.create({
            data: {
              saleNumber,
              branch: input.branch as Branch,
              totalAmount,
              discountType: (input.discountType as DiscountType | null) ?? null,
              discountValue: input.discountValue,
              finalAmount,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              customerNotes: input.customerNotes,
              paymentMethod: input.paymentMethod as PaymentMethod,
              transferMethod: input.transferMethod ?? null,
              invoiceNotes: input.invoiceNotes ?? null,
              paidAmount: round2(paidAmount),
              remainingAmount,
              items: { create: itemsData },
            },
            include: saleInclude,
          });
        });

        return ok(toSaleDTO(sale), 201);
      } catch (err) {
        // تعارض رقم الفاتورة — أعد المحاولة
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempts < 4
        ) {
          attempts++;
          continue;
        }
        throw err;
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return handleServerError(error);
  }
}
