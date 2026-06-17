import { ok, fail, handleServerError } from "@/lib/api";
import { MOCK_MODE } from "@/lib/mock-store";
import { runSeed } from "@/lib/seed-data";
import {
  migrationClient,
  applySchema,
  productTableExists,
  managementApiFallback,
  serviceRoleRpcFallback,
  errInfo,
  type LogEntry,
} from "@/lib/db-migrate";

export const dynamic = "force-dynamic";

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
      return fail("مسار الترحيل معطّل: SEED_TOKEN غير مضبوط في البيئة.", 403);
    if (state === "bad") return fail("رمز الترحيل غير صحيح أو مفقود.", 401);

    if (MOCK_MODE)
      return ok({
        mock: true,
        message: "وضع المعاينة مفعّل — لا توجد قاعدة بيانات حقيقية للترحيل.",
        logs: [],
      });

    const url = new URL(req.url);
    const alsoSeed = ["1", "true", "yes"].includes(
      (url.searchParams.get("seed") || "").toLowerCase()
    );

    const logs: LogEntry[] = [];
    const client = migrationClient();

    try {
      // 1) تشخيص الاتصال
      try {
        const info = await client.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema, version() AS version`
        );
        logs.push({ step: "الاتصال بقاعدة البيانات ناجح", ok: true, detail: JSON.stringify(info?.[0]) });
      } catch (e) {
        const { code, message } = errInfo(e);
        logs.push({ step: "فشل الاتصال بقاعدة البيانات", ok: false, detail: `[${code ?? "؟"}] ${message}` });
        return ok({ ok: false, productExists: false, logs });
      }

      // 2) فحص صلاحيات schema public (هل يحتاج المشروع منحها صراحةً؟)
      try {
        const perm = await client.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_public,
                  has_schema_privilege(current_user, 'public', 'USAGE')  AS can_use_public`
        );
        logs.push({ step: "صلاحيات schema public", ok: true, detail: JSON.stringify(perm?.[0]) });
      } catch (e) {
        logs.push({ step: "تعذّر فحص صلاحيات public", ok: false, detail: errInfo(e).message });
      }

      // 3) اختبار DDL مباشر بجدول مؤقت (بدون اعتماد على الأنواع)
      try {
        await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_eb_ddl_test" ("id" TEXT PRIMARY KEY)`);
        await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "_eb_ddl_test"`);
        logs.push({ step: "اختبار DDL المباشر (CREATE/DROP) ناجح", ok: true });
      } catch (e) {
        const { code, message } = errInfo(e);
        logs.push({
          step: "فشل اختبار DDL المباشر — لا يمكن إنشاء الجداول",
          ok: false,
          detail: `[${code ?? "؟"}] ${message}`,
        });
      }

      // 4) تنفيذ المخطط الكامل عبر Prisma
      const prismaOk = await applySchema(client, logs);
      let exists = await productTableExists(client);
      logs.push({ step: `وجود جدول Product بعد Prisma: ${exists}`, ok: exists });

      // 5) احتياطي: Supabase Management API (PAT)
      if (!exists) {
        logs.push({ step: "محاولة الاحتياطي عبر Supabase Management API…", ok: true });
        await managementApiFallback(logs);
        exists = await productTableExists(client);
        logs.push({ step: `وجود جدول Product بعد Management API: ${exists}`, ok: exists });
      }

      // 6) احتياطي: PostgREST rpc/exec_sql (service_role)
      if (!exists) {
        logs.push({ step: "محاولة الاحتياطي عبر rpc/exec_sql (service_role)…", ok: true });
        await serviceRoleRpcFallback(logs);
        exists = await productTableExists(client);
        logs.push({ step: `وجود جدول Product بعد rpc/exec_sql: ${exists}`, ok: exists });
      }

      // 7) بذر اختياري بعد إنشاء المخطط
      let seeded = false;
      if (exists && alsoSeed) {
        try {
          const r = await runSeed(client);
          seeded = true;
          logs.push({ step: `تم البذر: ${r.products} منتجات و ${r.sales} فاتورتان`, ok: true });
        } catch (e) {
          const { code, message } = errInfo(e);
          logs.push({ step: "فشل البذر", ok: false, detail: `[${code ?? "؟"}] ${message}` });
        }
      }

      return ok({
        ok: exists,
        productExists: exists,
        prismaOk,
        seeded,
        hint: exists
          ? undefined
          : "لم تُنشأ الجداول. راجع السجلات أعلاه: تحقق من can_create_public، أو اضبط SUPABASE_ACCESS_TOKEN للاحتياطي.",
        logs,
      });
    } finally {
      await client.$disconnect().catch(() => {});
    }
  } catch (error) {
    return handleServerError(error);
  }
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
