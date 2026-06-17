// ⚠️ ملاحظة أمنية مهمة:
// هذه الحماية مبنية على localStorage فقط — وهي عقبة بسيطة وليست أمناً فعلياً.
// أي شخص لديه أدوات المطوّر في المتصفح يستطيع تجاوزها في ثوانٍ.
// للأمان الفعلي يلزم تسجيل دخول حقيقي عبر الخادم وكوكيز HttpOnly.

const HASH_KEY = "eb-auth-hash";
const SESSION_KEY = "eb-auth-session";
const SESSION_HOURS = 24;

export const DEFAULT_PASSWORD = "0000";
export const LOGO_PATH = "/logo.svg"; // غيّر لـ "/logo.png" بعد رفع الصورة

// SHA-256 hex عبر Web Crypto API (متاحة في المتصفحات الحديثة)
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// تشفير كلمة المرور الحالية (المخزّنة أو الافتراضية)
export async function getStoredHash(): Promise<string> {
  const stored = localStorage.getItem(HASH_KEY);
  if (stored) return stored;
  return sha256(DEFAULT_PASSWORD);
}

export function setStoredHash(hash: string) {
  localStorage.setItem(HASH_KEY, hash);
}

// إنشاء جلسة لمدة 24 ساعة
export function startSession() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expiresAt }));
}

export function endSession() {
  localStorage.removeItem(SESSION_KEY);
}

// هل توجد جلسة صالحة الآن؟
export function isSessionValid(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { expiresAt: number };
    if (typeof expiresAt !== "number" || Date.now() >= expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// محاولة تسجيل الدخول؛ يعيد true عند نجاح المطابقة
export async function tryLogin(password: string): Promise<boolean> {
  const inputHash = await sha256(password);
  const storedHash = await getStoredHash();
  if (inputHash !== storedHash) return false;
  startSession();
  return true;
}

// تغيير كلمة المرور (يتطلب الحالية)
export async function changePassword(
  current: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  if (!next || next.length < 4)
    return { ok: false, error: "كلمة المرور الجديدة قصيرة جداً (4 أحرف على الأقل)" };
  const currHash = await sha256(current);
  const stored = await getStoredHash();
  if (currHash !== stored)
    return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };
  setStoredHash(await sha256(next));
  startSession();
  return { ok: true };
}
