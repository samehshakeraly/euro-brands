// مساعدات التحقق من المدخلات في النماذج
// تمنع الكتابة غير الصالحة لحظياً وتُنظّف ما يُلصَق

// ----------------------------------------------------
//  بادئات الموبايل المصري
// ----------------------------------------------------
export const EGY_MOBILE_PREFIXES = [
  { code: "010", name: "فودافون" },
  { code: "011", name: "اتصالات" },
  { code: "012", name: "أورنج" },
  { code: "015", name: "وي" },
] as const;

export type PhonePrefixCode = (typeof EGY_MOBILE_PREFIXES)[number]["code"];

export function networkName(prefix: PhonePrefixCode): string {
  return (
    EGY_MOBILE_PREFIXES.find((p) => p.code === prefix)?.name ?? prefix
  );
}

// ----------------------------------------------------
//  مفاتيح التنقّل والتحرير المسموح بها
// ----------------------------------------------------
const NAV_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

// ----------------------------------------------------
//  حقول الأرقام
// ----------------------------------------------------
export interface NumericGuardOpts {
  allowDecimal?: boolean;
}

export function isNumericKeyAllowed(
  e: React.KeyboardEvent<HTMLInputElement>,
  opts: NumericGuardOpts = {}
): boolean {
  // اختصارات النسخ/اللصق/التراجع
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (NAV_KEYS.has(e.key)) return true;
  // مفاتيح طولها أكبر من 1 (F1, Shift, ...) مسموحة
  if (e.key.length > 1) return true;
  if (/^[0-9]$/.test(e.key)) return true;
  if (
    opts.allowDecimal &&
    e.key === "." &&
    !e.currentTarget.value.includes(".")
  )
    return true;
  return false;
}

export interface NumericSanitizeOpts {
  allowDecimal?: boolean;
  maxLength?: number;
  max?: number;
}

export function sanitizeNumeric(
  raw: string,
  opts: NumericSanitizeOpts = {}
): string {
  let v = raw.replace(/[^0-9.]/g, "");
  if (!opts.allowDecimal) {
    v = v.replace(/\./g, "");
  } else {
    const firstDot = v.indexOf(".");
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  if (opts.maxLength != null) v = v.slice(0, opts.maxLength);
  if (opts.max != null && v !== "" && !v.endsWith(".")) {
    const n = Number(v);
    if (Number.isFinite(n) && n > opts.max) v = String(opts.max);
  }
  return v;
}

// ----------------------------------------------------
//  حقول النص العادي (تمنع الأرقام والرموز الخاصة)
// ----------------------------------------------------
// مسموح: حروف عربية، حروف لاتينية، مسافة، شرطة، فاصلة عُليا، نقطة، &
const TEXT_CHAR_RE = /^[؀-ۿݐ-ݿA-Za-z\s\-'.&]$/;
const TEXT_FILTER_RE = /[^؀-ۿݐ-ݿA-Za-z\s\-'.&]/g;

export function isTextKeyAllowed(
  e: React.KeyboardEvent<HTMLInputElement>
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (NAV_KEYS.has(e.key)) return true;
  if (e.key.length > 1) return true;
  return TEXT_CHAR_RE.test(e.key);
}

export function sanitizeText(raw: string): string {
  return raw.replace(TEXT_FILTER_RE, "");
}

// ----------------------------------------------------
//  مساعدات رقم الهاتف
// ----------------------------------------------------
export function splitEgyPhone(full: string | null | undefined): {
  prefix: PhonePrefixCode;
  digits: string;
} {
  const cleaned = (full ?? "").replace(/\D/g, "");
  if (cleaned.length === 0) return { prefix: "010", digits: "" };
  // إذا بدأ برمز الدولة 20، أزِله
  const normalized =
    cleaned.startsWith("20") && cleaned.length >= 12 ? cleaned.slice(2) : cleaned;
  const first3 = normalized.slice(0, 3);
  const found = EGY_MOBILE_PREFIXES.find((p) => p.code === first3);
  if (found) return { prefix: found.code, digits: normalized.slice(3, 11) };
  return { prefix: "010", digits: normalized.slice(0, 8) };
}

export function joinEgyPhone(prefix: PhonePrefixCode, digits: string): string {
  const cleaned = digits.replace(/\D/g, "").slice(0, 8);
  if (!cleaned) return "";
  return `${prefix}${cleaned}`;
}

// رقم هاتف كامل صالح: 11 رقم بصيغة 01[0125]xxxxxxxx
export function isValidEgyPhone(full: string | null | undefined): boolean {
  if (!full) return false;
  const cleaned = full.replace(/\D/g, "");
  return /^01[0125][0-9]{8}$/.test(cleaned);
}
