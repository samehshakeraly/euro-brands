import {
  type PrismaClient,
  Category,
  Branch,
  DiscountType,
} from "@prisma/client";
import { DEFAULT_PRODUCT_TYPES, generateVariantSku } from "./constants";

// منطق تعبئة البيانات التجريبية — مشترك بين سكربت CLI ومسار /api/seed.
// يحذف البيانات السابقة ثم ينشئ 5 منتجات على الفرعين + فاتورتين.
export async function runSeed(
  prisma: PrismaClient
): Promise<{ products: number; sales: number }> {
  // تنظيف بالترتيب الصحيح للعلاقات
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.productType.deleteMany();

  // أنواع المنتجات الافتراضية
  for (const cat of Object.keys(DEFAULT_PRODUCT_TYPES) as Category[]) {
    for (const t of DEFAULT_PRODUCT_TYPES[cat]) {
      await prisma.productType.create({
        data: { name: t.name, code: t.code, category: cat },
      });
    }
  }

  const products = [
    {
      name: "تيشيرت قطن كلاسيك",
      brand: "Zara",
      category: Category.CLOTHES,
      typeName: "تيشرت",
      description: "تيشيرت قطني مريح بقصة كلاسيكية مناسب للارتداء اليومي.",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
      ],
      variants: [
        { size: "S", color: "أبيض", quantity: 12, branch: Branch.HADAYEK, price: 350 },
        { size: "M", color: "أبيض", quantity: 18, branch: Branch.HADAYEK, price: 350 },
        { size: "L", color: "أسود", quantity: 9, branch: Branch.HADAYEK, price: 350 },
        { size: "M", color: "أبيض", quantity: 7, branch: Branch.ZAHRAA, price: 350 },
        { size: "XL", color: "أزرق", quantity: 4, branch: Branch.ZAHRAA, price: 350 },
      ],
    },
    {
      name: "بنطلون جينز سليم",
      brand: "Levi's",
      category: Category.PANTS,
      typeName: "جينز",
      description: "بنطلون جينز بقصة سليم عصرية وخامة متينة.",
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600",
      ],
      variants: [
        { size: "M", color: "أزرق", quantity: 6, branch: Branch.HADAYEK, price: 720 },
        { size: "L", color: "أزرق", quantity: 10, branch: Branch.HADAYEK, price: 720 },
        { size: "XL", color: "أسود", quantity: 2, branch: Branch.HADAYEK, price: 720 },
        { size: "L", color: "أزرق", quantity: 8, branch: Branch.ZAHRAA, price: 720 },
        { size: "2XL", color: "أسود", quantity: 3, branch: Branch.ZAHRAA, price: 720 },
      ],
    },
    {
      name: "حذاء رياضي خفيف",
      brand: "Nike",
      category: Category.SHOES,
      typeName: "سنيكرز",
      description: "حذاء رياضي خفيف الوزن مناسب للجري والمشي.",
      images: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
      ],
      variants: [
        { size: "41", color: "أبيض", quantity: 5, branch: Branch.HADAYEK, price: 1450 },
        { size: "42", color: "أبيض", quantity: 8, branch: Branch.HADAYEK, price: 1450 },
        { size: "43", color: "أسود", quantity: 3, branch: Branch.HADAYEK, price: 1450 },
        { size: "42", color: "أبيض", quantity: 6, branch: Branch.ZAHRAA, price: 1450 },
        { size: "44", color: "أسود", quantity: 0, branch: Branch.ZAHRAA, price: 1450 },
      ],
    },
    {
      name: "حذاء كلاسيك جلد",
      brand: "Clarks",
      category: Category.SHOES,
      typeName: "كلاسيك",
      description: "حذاء جلد طبيعي بتصميم كلاسيكي أنيق للمناسبات الرسمية.",
      images: [
        "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600",
      ],
      variants: [
        { size: "40", color: "بني", quantity: 4, branch: Branch.HADAYEK, price: 1850 },
        { size: "41", color: "بني", quantity: 6, branch: Branch.HADAYEK, price: 1850 },
        { size: "42", color: "أسود", quantity: 2, branch: Branch.ZAHRAA, price: 1850 },
        { size: "43", color: "بني", quantity: 5, branch: Branch.ZAHRAA, price: 1850 },
      ],
    },
    {
      name: "عطر شرقي فاخر",
      brand: "Lattafa",
      category: Category.PERFUMES,
      typeName: "عطر مشترك",
      description: "عطر شرقي فاخر بمزيج من العود والمسك يدوم طويلاً.",
      images: [
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600",
      ],
      variants: [
        { size: "100ml", color: null as string | null, quantity: 20, branch: Branch.HADAYEK, price: 600 },
        { size: "100ml", color: null as string | null, quantity: 15, branch: Branch.ZAHRAA, price: 600 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, typeName, ...productData } = p;
    const pt = await prisma.productType.findUnique({
      where: { name_category: { name: typeName, category: p.category } },
    });
    await prisma.product.create({
      data: {
        ...productData,
        productTypeId: pt?.id ?? null,
        variants: {
          create: variants.map((v) => ({
            ...v,
            sku: generateVariantSku({
              brand: p.brand,
              typeCode: pt?.code ?? null,
              colorCode: null,
              size: v.size,
              branch: v.branch,
            }),
          })),
        },
      },
    });
  }

  // سجل البراندات لكل فئة (مشتق من المنتجات)
  const brandSeen = new Set<string>();
  for (const p of products) {
    const key = `${p.brand}|${p.category}`;
    if (brandSeen.has(key)) continue;
    brandSeen.add(key);
    await prisma.brand.create({
      data: { name: p.brand, category: p.category },
    });
  }

  // فاتورتان تجريبيتان لإظهار بيانات لوحة التحكم
  const all = await prisma.product.findMany({ include: { variants: true } });
  const tshirt = all.find((x) => x.name === "تيشيرت قطن كلاسيك")!;
  const perfume = all.find((x) => x.name === "عطر شرقي فاخر")!;
  const tshirtVariant = tshirt.variants.find(
    (v) => v.branch === Branch.HADAYEK && v.size === "M"
  )!;
  const perfumeVariant = perfume.variants.find(
    (v) => v.branch === Branch.HADAYEK
  )!;

  await prisma.$transaction(async (tx) => {
    const total1 = tshirtVariant.price * 2;
    await tx.sale.create({
      data: {
        saleNumber: 1,
        branch: Branch.HADAYEK,
        totalAmount: total1,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        finalAmount: total1 * 0.9,
        customerName: "أحمد محمد",
        customerPhone: "01001234567",
        paymentMethod: "CASH",
        paidAmount: total1 * 0.9,
        remainingAmount: 0,
        items: {
          create: [
            {
              productId: tshirt.id,
              variantId: tshirtVariant.id,
              quantity: 2,
              unitPrice: tshirtVariant.price,
              subtotal: total1,
            },
          ],
        },
      },
    });
    await tx.productVariant.update({
      where: { id: tshirtVariant.id },
      data: { quantity: { decrement: 2 } },
    });

    const total2 = perfumeVariant.price;
    await tx.sale.create({
      data: {
        saleNumber: 2,
        branch: Branch.HADAYEK,
        totalAmount: total2,
        discountValue: 0,
        finalAmount: total2,
        paymentMethod: "TRANSFER",
        transferMethod: "INSTAPAY",
        paidAmount: total2,
        remainingAmount: 0,
        items: {
          create: [
            {
              productId: perfume.id,
              variantId: perfumeVariant.id,
              quantity: 1,
              unitPrice: perfumeVariant.price,
              subtotal: total2,
            },
          ],
        },
      },
    });
    await tx.productVariant.update({
      where: { id: perfumeVariant.id },
      data: { quantity: { decrement: 1 } },
    });
  });

  return { products: products.length, sales: 2 };
}
