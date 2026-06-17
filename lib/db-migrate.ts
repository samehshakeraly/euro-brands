import { PrismaClient } from "@prisma/client";
import { INIT_SQL } from "./init-sql";
import { poolerSafeUrl } from "./db-url";

export interface LogEntry {
  step: string;
  ok: boolean;
  detail?: string;
}

// عميل مخصص للترحيل: pgbouncer=true + connection_limit=1 (آمن عبر pooler 6543)
export function migrationClient(): PrismaClient {
  const url = poolerSafeUrl(process.env.DATABASE_URL, { connectionLimit1: true });
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: ["error"],
  });
}

// أكواد SQLSTATE التي تعني "العنصر موجود مسبقاً" (تُتجاهل بأمان)
const DUPLICATE_CODES = new Set([
  "42P07", // duplicate_table / index
  "42710", // duplicate_object (type / constraint)
  "42P06", // duplicate_schema
  "42P16", // invalid_table_definition (أحياناً للقيود المكررة)
  "42701", // duplicate_column
]);

export function errInfo(e: unknown): { code?: string; message: string } {
  const any = e as { code?: string; meta?: { code?: string; message?: string }; message?: string };
  return {
    code: any?.meta?.code ?? any?.code,
    message: String(any?.meta?.message ?? any?.message ?? e),
  };
}

export function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((raw) =>
      raw
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);
}

export async function productTableExists(client: PrismaClient): Promise<boolean> {
  try {
    const rows = await client.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Product'`
    );
    return (rows?.[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

// تنفيذ كل عبارة DDL على حدة مع تسجيل مفصّل ومعالجة دقيقة للأخطاء
export async function applySchema(
  client: PrismaClient,
  logs: LogEntry[]
): Promise<boolean> {
  const statements = splitStatements(INIT_SQL);
  logs.push({ step: `بدء تنفيذ ${statements.length} عبارة DDL`, ok: true });

  let hardFailure = false;
  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
    try {
      await client.$executeRawUnsafe(stmt);
      logs.push({ step: `✓ ${preview}`, ok: true });
    } catch (e) {
      const { code, message } = errInfo(e);
      if (code && DUPLICATE_CODES.has(code)) {
        logs.push({ step: `↷ موجود مسبقاً [${code}]: ${preview}`, ok: true });
        continue;
      }
      // خطأ حقيقي — نسجّله ونكمل لرؤية كل المشاكل (لا نتجاهله بصمت)
      logs.push({
        step: `✗ فشل [${code ?? "؟"}]: ${preview}`,
        ok: false,
        detail: message,
      });
      hardFailure = true;
    }
  }
  return !hardFailure;
}

const projectRef = (): string | undefined =>
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.DATABASE_URL || "").match(/postgres\.([a-z0-9]+)/i)?.[1];

// احتياطي 1: Supabase Management API (يتطلب Personal Access Token — وليس service_role)
export async function managementApiFallback(logs: LogEntry[]): Promise<boolean> {
  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef();
  if (!pat) {
    logs.push({
      step: "تخطّي Management API: SUPABASE_ACCESS_TOKEN غير مضبوط",
      ok: false,
      detail:
        "هذا الاحتياطي يتطلب Personal Access Token من Supabase (Account → Access Tokens). مفتاح service_role لا يستطيع تنفيذ DDL عبر REST.",
    });
    return false;
  }
  if (!ref) {
    logs.push({ step: "تخطّي Management API: تعذّر استخراج معرّف المشروع (اضبط SUPABASE_PROJECT_REF)", ok: false });
    return false;
  }
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: INIT_SQL }),
      }
    );
    const text = await res.text();
    logs.push({
      step: `Supabase Management API: HTTP ${res.status}`,
      ok: res.ok,
      detail: text.slice(0, 400),
    });
    return res.ok;
  } catch (e) {
    logs.push({ step: "خطأ في Supabase Management API", ok: false, detail: errInfo(e).message });
    return false;
  }
}

// احتياطي 2: PostgREST rpc/exec_sql عبر service_role (يتطلب دالة exec_sql معرّفة مسبقاً)
export async function serviceRoleRpcFallback(logs: LogEntry[]): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ref = projectRef();
  if (!key) {
    logs.push({ step: "تخطّي rpc/exec_sql: SUPABASE_SERVICE_ROLE_KEY غير مضبوط", ok: false });
    return false;
  }
  if (!ref) {
    logs.push({ step: "تخطّي rpc/exec_sql: تعذّر استخراج معرّف المشروع", ok: false });
    return false;
  }
  try {
    const res = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: INIT_SQL }),
    });
    const text = await res.text();
    logs.push({
      step: `PostgREST rpc/exec_sql: HTTP ${res.status}`,
      ok: res.ok,
      detail: res.ok
        ? "تم"
        : `${text.slice(0, 250)} — يتطلب دالة exec_sql(sql text) معرّفة مسبقاً في قاعدة البيانات؛ service_role لا ينفّذ DDL مباشرة عبر REST.`,
    });
    return res.ok;
  } catch (e) {
    logs.push({ step: "خطأ في PostgREST rpc/exec_sql", ok: false, detail: errInfo(e).message });
    return false;
  }
}
