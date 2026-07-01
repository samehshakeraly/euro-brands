import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toCustomerDTO, toSaleDTO } from "@/lib/serializers";
import { parseCustomerUpdateInput, ValidationError } from "@/lib/validate";
import {
  MOCK_MODE,
  mockGetCustomer,
  mockUpdateCustomer,
} from "@/lib/mock-store";
import type { CustomerDetailDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

const saleInclude = {
  items: {
    include: {
      product: { select: { name: true, brand: true } },
      variant: { select: { size: true, color: true, sku: true } },
    },
  },
} satisfies Prisma.SaleInclude;

// GET /api/customers/[id] — عميل واحد مع كامل تاريخ مشترياته
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (MOCK_MODE) {
      const dto = mockGetCustomer(params.id);
      return dto ? ok(dto) : fail("العميل غير موجود", 404);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });
    if (!customer) return fail("العميل غير موجود", 404);

    const sales = await prisma.sale.findMany({
      where: { customerPhone: customer.phone },
      include: saleInclude,
      orderBy: { createdAt: "desc" },
    });

    const response: CustomerDetailDTO = {
      ...toCustomerDTO(customer),
      sales: sales.map(toSaleDTO),
    };
    return ok(response);
  } catch (error) {
    return handleServerError(error);
  }
}

// PUT /api/customers/[id] — تعديل الاسم/الملاحظات/الفرع
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const input = parseCustomerUpdateInput(body);

    if (MOCK_MODE) {
      const dto = mockUpdateCustomer(params.id, input);
      return dto ? ok(dto) : fail("العميل غير موجود", 404);
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.branch !== undefined ? { branch: input.branch } : {}),
      },
    });
    return ok(toCustomerDTO(updated));
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return fail("العميل غير موجود", 404);
    }
    return handleServerError(error);
  }
}
