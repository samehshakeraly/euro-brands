import { PrismaClient } from "@prisma/client";
import { runSeed } from "../lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 جاري تهيئة البيانات التجريبية...");
  const result = await runSeed(prisma);
  console.log(
    `✅ اكتملت التهيئة: ${result.products} منتجات و ${result.sales} فاتورتان.`
  );
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء التهيئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
