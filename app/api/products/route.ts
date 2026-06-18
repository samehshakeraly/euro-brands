import { Prisma, type Branch, type Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { toProductDTO } from "@/lib/serializers";
import { parseProductInput, ValidationError } from "@/lib/validate";
import { MOCK_MODE, mockListProducts, mockCreateProduct } from "@/lib/mock-store";
import { generateVariantSku } from "@/lib/constants";

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
    const withSales = searchParams.get("withSales") === "1";

    // مطابقة دقيقة لكود SKU → نعيد متغيّراً واحداً فقط مع منتجه
    if (search) {
      const exactSku = await prisma.productVariant.findUnique({
        where: { sku: search },
        include: { product: { include: { productType: true } } },
      });
      if (exactSku) {
        const product = exactSku.product;
        const dto = toProductDTO({ ...product, variants: [exactSku] });
        return ok([dto]);
      }
    }

    const where: Prisma.ProductWhereInput = {};

    if (category) where.category = category as Category;
    if (brand) where.brand = brand;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search } },
        {
          variants: {
            some: { sku: { contains: search, mode: "insensitive" } },
          },
        },
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
        productType: true,
        variants: {
          where: hasVariantFilter ? variantWhere : undefined,
          orderBy: [{ branch: "asc" }, { size: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let soldMap: Map<string, number> | null = null;
    if (withSales) {
      const grouped = await prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
      });
      soldMap = new Map(grouped.map((g) => [g.productId, g._sum.quantity ?? 0]));
    }

    return ok(
      products.map((p) =>
        toProductDTO(p, soldMap ? soldMap.get(p.id) ?? 0 : undefined)
      )
    );
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

    const pt = input.productTypeId
      ? await prisma.productType.findUnique({ where: { id: input.productTypeId } })
      : null;

    const product = await prisma.product.create({
      data: {
        name: input.name,
        brand: input.brand,
        category: input.category as Category,
        description: input.description,
        productTypeId: pt?.id ?? null,
        barcode: input.barcode ?? null,
        images: input.images,
        variants: {
          create: input.variants.map((v) => ({
            size: v.size,
            color: v.color ?? null,
            sku:
              v.sku ??
              generateVariantSku({
                brand: input.brand,
                typeCode: pt?.code ?? null,
                colorCode: null,
                size: v.size,
                branch: v.branch,
              }),
            branch: v.branch as Branch,
            quantity: v.quantity,
            minQuantity: v.minQuantity,
            price: v.price,
          })),
        },
      },
      include: { variants: true, productType: true },
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

    return ok(toProductDTO(product), 201);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("يوجد تكرار في كود SKU", 422);
    }
    return handleServerError(error);
  }
}
