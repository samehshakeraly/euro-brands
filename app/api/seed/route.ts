import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE } from "@/lib/mock-store";
import { runSeed } from "@/lib/seed-data";
import { INIT_SQL } from "@/lib/init-sql";

export const dynamic = "force-dynamic";

// تهيئة قاعدة البيانات الحقيقية (محمي برمز SEED_TOKEN):
// ينشئ المخطط إن لم يكن موجوداً، ثم يعبّئ البيانات التجريبية.
// يُستخدم مرة واحدة بعد النشر، ثم يُفضّل إزالة SEED_TOKEN لتعطيل المسار.
function tokenState(req: Request): "missing-env" | "bad" | "ok" {
  const expected = process.env.SEED_TOKEN;
  if (!expected) return "missing-env";
  const url = new URL(req.url);
  const provided =
    url.searchParams.get("token") ||
    req.headers.get("x-seed-token") ||
    (req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  return provided && provided === expected ? "ok" : "bad";
}

// إنشاء المخطط دائماً وبشكل غير حسّاس للتكرار (idempotent) — بديل موثوق عن
// prisma db push يعمل عبر اتصال التشغيل. يتجاهل أخطاء "موجود مسبقاً".
const DUPLICATE = /already exists|duplicate/i;

async function ensureSchema(): Promise<boolean> {
  const statements = INIT_SQL.split(";")
    .map((raw) =>
      raw
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  let executed = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      executed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const metaMsg = String((e as { meta?: { message?: string } })?.meta?.message ?? "");
      if (DUPLICATE.test(msg) || DUPLICATE.test(metaMsg)) continue; // الجدول/النوع موجود — تجاهل
      throw e;
    }
  }
  return executed > 0; // true إذا أُنشئ شيء جديد
}

async function handle(req: Request) {
  try {
    const state = tokenState(req);
    if (state === "missing-env")
      return fail("مسار التهيئة معطّل: SEED_TOKEN غير مضبوط في البيئة.", 403);
    if (state === "bad") return fail("رمز التهيئة غير صحيح أو مفقود.", 401);

    if (MOCK_MODE)
      return ok({
        mock: true,
        message:
          "وضع المعاينة مفعّل — البيانات التجريبية محمّلة في الذاكرة مسبقاً، لا حاجة للتهيئة.",
      });

    const schemaCreated = await ensureSchema();
    const result = await runSeed(prisma);
    return ok({
      message: `تمت التهيئة بنجاح${schemaCreated ? " (تم إنشاء الجداول)" : ""}: ${result.products} منتجات و ${result.sales} فاتورتان. يُنصح الآن بإزالة SEED_TOKEN.`,
      schemaCreated,
      ...result,
    });
  } catch (error) {
    return handleServerError(error);
  }
}

export async function POST(req: Request) {
  return handle(req);
}

// متاح أيضاً عبر GET لتسهيل الاستدعاء من المتصفح بعد النشر
export async function GET(req: Request) {
  return handle(req);
}
