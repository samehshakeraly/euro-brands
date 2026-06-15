import { Prisma, type Branch, type Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toProductDTO } from "@/lib/serializers";
import { parseProductInput, ValidationError } from "@/lib/validate";
import { MOCK_MODE, mockListProducts, mockCreateProduct } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

// GET /api/products — قائمة المنتجات مع الفلاتر
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (MOCK_MODE) return ok(mockListProducts(searchParams));
    const search = searchParams.get("search")?.trim();
    const branch = searchParams.get("branch");
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const size = searchParams.get("size");

    const where: Prisma.ProductWhereInput = {};

    if (category) where.category = category as Category;
    if (brand) where.brand = brand;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    // فلترة على مستوى المقاسات (الفرع/المقاس)
    const variantWhere: Prisma.ProductVariantWhereInput = {};
    if (branch) variantWhere.branch = branch as Branch;
    if (size) variantWhere.size = size;
    const hasVariantFilter = Object.keys(variantWhere).length > 0;

    if (hasVariantFilter) {
      where.variants = { some: variantWhere };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          where: hasVariantFilter ? variantWhere : undefined,
          orderBy: [{ branch: "asc" }, { size: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(products.map(toProductDTO));
  } catch (error) {
    return handleServerError(error);
  }
}

// POST /api/products — إنشاء منتج جديد
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = parseProductInput(body);

    if (MOCK_MODE) return ok(mockCreateProduct(input), 201);

    const product = await prisma.product.create({
      data: {
        name: input.name,
        brand: input.brand,
        category: input.category as Category,
        description: input.description,
        images: input.images,
        variants: {
          create: input.variants.map((v) => ({
            size: v.size,
            branch: v.branch as Branch,
            quantity: v.quantity,
            price: v.price,
          })),
        },
      },
      include: { variants: true },
    });

    return ok(toProductDTO(product), 201);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return handleServerError(error);
  }
}
