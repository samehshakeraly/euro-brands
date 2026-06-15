import { PrismaClient, Category, Branch, DiscountType } from "@prisma/client";

const prisma = new PrismaClient();

// بيانات تجريبية: 5 منتجات موزعة على الفرعين
async function main() {
  console.log("🌱 جاري تهيئة البيانات التجريبية...");

  // تنظيف البيانات السابقة (بالترتيب الصحيح للعلاقات)
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  const products = [
    {
      name: "تيشيرت قطن كلاسيك",
      brand: "Zara",
      category: Category.CLOTHES,
      description: "تيشيرت قطني مريح بقصة كلاسيكية مناسب للارتداء اليومي.",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
      ],
      variants: [
        { size: "S", quantity: 12, branch: Branch.HADAYEK, price: 350 },
        { size: "M", quantity: 18, branch: Branch.HADAYEK, price: 350 },
        { size: "L", quantity: 9, branch: Branch.HADAYEK, price: 350 },
        { size: "M", quantity: 7, branch: Branch.ZAHRAA, price: 350 },
        { size: "XL", quantity: 4, branch: Branch.ZAHRAA, price: 350 },
      ],
    },
    {
      name: "بنطلون جينز سليم",
      brand: "Levi's",
      category: Category.PANTS,
      description: "بنطلون جينز بقصة سليم عصرية وخامة متينة.",
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600",
      ],
      variants: [
        { size: "M", quantity: 6, branch: Branch.HADAYEK, price: 720 },
        { size: "L", quantity: 10, branch: Branch.HADAYEK, price: 720 },
        { size: "XL", quantity: 2, branch: Branch.HADAYEK, price: 720 },
        { size: "L", quantity: 8, branch: Branch.ZAHRAA, price: 720 },
        { size: "2XL", quantity: 3, branch: Branch.ZAHRAA, price: 720 },
      ],
    },
    {
      name: "حذاء رياضي خفيف",
      brand: "Nike",
      category: Category.SHOES,
      description: "حذاء رياضي خفيف الوزن مناسب للجري والمشي.",
      images: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
      ],
      variants: [
        { size: "41", quantity: 5, branch: Branch.HADAYEK, price: 1450 },
        { size: "42", quantity: 8, branch: Branch.HADAYEK, price: 1450 },
        { size: "43", quantity: 3, branch: Branch.HADAYEK, price: 1450 },
        { size: "42", quantity: 6, branch: Branch.ZAHRAA, price: 1450 },
        { size: "44", quantity: 0, branch: Branch.ZAHRAA, price: 1450 },
      ],
    },
    {
      name: "حذاء كلاسيك جلد",
      brand: "Clarks",
      category: Category.SHOES,
      description: "حذاء جلد طبيعي بتصميم كلاسيكي أنيق للمناسبات الرسمية.",
      images: [
        "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600",
      ],
      variants: [
        { size: "40", quantity: 4, branch: Branch.HADAYEK, price: 1850 },
        { size: "41", quantity: 6, branch: Branch.HADAYEK, price: 1850 },
        { size: "42", quantity: 2, branch: Branch.ZAHRAA, price: 1850 },
        { size: "43", quantity: 5, branch: Branch.ZAHRAA, price: 1850 },
      ],
    },
    {
      name: "عطر شرقي فاخر",
      brand: "Lattafa",
      category: Category.PERFUMES,
      description: "عطر شرقي فاخر بمزيج من العود والمسك يدوم طويلاً.",
      images: [
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600",
      ],
      variants: [
        { size: "M", quantity: 20, branch: Branch.HADAYEK, price: 600 },
        { size: "M", quantity: 15, branch: Branch.ZAHRAA, price: 600 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, ...productData } = p;
    await prisma.product.create({
      data: {
        ...productData,
        variants: { create: variants },
      },
    });
    console.log(`  ✓ ${p.name} (${p.brand})`);
  }

  // فاتورتان تجريبيتان لإظهار بيانات لوحة التحكم
  const allProducts = await prisma.product.findMany({
    include: { variants: true },
  });

  const tshirt = allProducts.find((x) => x.name === "تيشيرت قطن كلاسيك")!;
  const perfume = allProducts.find((x) => x.name === "عطر شرقي فاخر")!;

  const tshirtVariant = tshirt.variants.find(
    (v) => v.branch === Branch.HADAYEK && v.size === "M"
  )!;
  const perfumeVariant = perfume.variants.find(
    (v) => v.branch === Branch.HADAYEK
  )!;

  await prisma.$transaction(async (tx) => {
    // فاتورة 1
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

    // فاتورة 2
    const total2 = perfumeVariant.price * 1;
    await tx.sale.create({
      data: {
        saleNumber: 2,
        branch: Branch.HADAYEK,
        totalAmount: total2,
        discountValue: 0,
        finalAmount: total2,
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

  console.log("  ✓ تم إنشاء فاتورتين تجريبيتين");
  console.log("✅ اكتملت تهيئة البيانات بنجاح!");
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء التهيئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
