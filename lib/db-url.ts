// تهيئة رابط الاتصال ليعمل بأمان عبر pooler الخاص بـ Supabase.
// عبر pooler المعاملات (المنفذ 6543) يجب تعطيل الـ prepared statements في Prisma
// عبر pgbouncer=true، وإلا تظهر أخطاء "prepared statement already exists".
// آمن أيضاً مع pooler الجلسات (5432).
export function poolerSafeUrl(
  url: string | undefined,
  opts: { connectionLimit1?: boolean } = {}
): string | undefined {
  if (!url) return url;
  // يُطبّق فقط على مضيفات pooler الخاصة بـ Supabase
  if (!/pooler\.supabase\.com/i.test(url)) return url;

  let out = url;
  if (!/[?&]pgbouncer=/i.test(out)) {
    out += (out.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  if (opts.connectionLimit1 && !/[?&]connection_limit=/i.test(out)) {
    out += "&connection_limit=1";
  }
  return out;
}
