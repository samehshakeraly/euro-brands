import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE } from "@/lib/mock-store";
import { runSeed } from "@/lib/seed-data";
import {
  migrationClient,
  applySchema,
  productTableExists,
  errInfo,
  type LogEntry,
} from "@/lib/db-migrate";

export const dynamic = "force-dynamic";

// تهيئة قاعدة البيانات: إنشاء المخطط (إن لزم) ثم تعبئة البيانات التجريبية.
// محمي برمز SEED_TOKEN. يُفضّل إزالة الرمز بعد الاستخدام.
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

    const logs: LogEntry[] = [];
    const client = migrationClient();
    try {
      await applySchema(client, logs);
      const exists = await productTableExists(client);
      logs.push({ step: `وجود جدول Product: ${exists}`, ok: exists });

      if (!exists) {
        return ok({
          ok: false,
          message:
            "تعذّر إنشاء الجداول. استخدم /api/migrate لمزيد من التشخيص والاحتياطيات.",
          logs,
        });
      }

      const result = await runSeed(client);
      logs.push({ step: `تم البذر: ${result.products} منتجات و ${result.sales} فاتورتان`, ok: true });
      return ok({
        ok: true,
        message: `تمت التهيئة بنجاح: ${result.products} منتجات و ${result.sales} فاتورتان. يُنصح الآن بإزالة SEED_TOKEN.`,
        ...result,
        logs,
      });
    } catch (e) {
      const { code, message } = errInfo(e);
      logs.push({ step: "خطأ أثناء التهيئة", ok: false, detail: `[${code ?? "؟"}] ${message}` });
      return ok({ ok: false, message: `فشلت التهيئة: ${message}`, logs });
    } finally {
      await client.$disconnect().catch(() => {});
    }
  } catch (error) {
    return handleServerError(error);
  }
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
