import { type Branch, type Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { parseImportRows, ValidationError } from "@/lib/validate";
import { MOCK_MODE, mockImportInventory } from "@/lib/mock-store";
import type { ImportResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/products/import — تحديث المخزون بالجملة من ملف Excel
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = parseImportRows(body);

    if (MOCK_MODE) return ok(mockImportInventory(rows));

    const result: ImportResult = {
      totalRows: rows.length,
      newProducts: 0,
      newVariants: 0,
      updatedVariants: 0,
    };

    await prisma.$transaction(
      async (tx) => {
        for (const row of rows) {
          let product = await tx.product.findFirst({
            where: {
              name: { equals: row.name, mode: "insensitive" },
              brand: { equals: row.brand, mode: "insensitive" },
            },
            select: { id: true },
          });

          if (!product) {
            product = await tx.product.create({
              data: {
                name: row.name,
                brand: row.brand,
                category: row.category as Category,
                images: [],
              },
              select: { id: true },
            });
            result.newProducts++;
          }

          const existing = await tx.productVariant.findUnique({
            where: {
              productId_size_branch: {
                productId: product.id,
                size: row.size,
                branch: row.branch as Branch,
              },
            },
            select: { id: true },
          });

          if (existing) {
            await tx.productVariant.update({
              where: { id: existing.id },
              data: { quantity: row.quantity, price: row.price },
            });
            result.updatedVariants++;
          } else {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                size: row.size,
                branch: row.branch as Branch,
                quantity: row.quantity,
                price: row.price,
              },
            });
            result.newVariants++;
          }
        }
      },
      { timeout: 30000 }
    );

    return ok(result);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return handleServerError(error);
  }
}
