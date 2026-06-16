import { prisma } from "@/lib/prisma";
import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE } from "@/lib/mock-store";
import { runSeed } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

// تهيئة البيانات التجريبية في قاعدة البيانات الحقيقية (محمي برمز SEED_TOKEN).
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

    const result = await runSeed(prisma);
    return ok({
      message: `تمت تهيئة قاعدة البيانات بنجاح: ${result.products} منتجات و ${result.sales} فاتورتان. يُنصح الآن بإزالة SEED_TOKEN.`,
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
