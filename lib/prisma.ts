import { PrismaClient } from "@prisma/client";
import { poolerSafeUrl } from "./db-url";

// نمط Singleton لتجنب إنشاء اتصالات متعددة أثناء التطوير (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  // يضمن pgbouncer=true تلقائياً عند الاتصال عبر pooler المعاملات (Supabase)
  const url = poolerSafeUrl(process.env.DATABASE_URL);
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// إنشاء كسول: لا يُنشأ العميل إلا عند أول استخدام فعلي.
// هذا يسمح بتشغيل التطبيق في "وضع المعاينة" بدون DATABASE_URL،
// حيث تتجاوز مسارات الـ API استخدام Prisma بالكامل.
function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
