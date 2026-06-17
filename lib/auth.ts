// ⚠️ ملاحظة أمنية مهمة:
// هذه الحماية مبنية على localStorage فقط — وهي عقبة بسيطة وليست أمناً فعلياً.
// أي شخص لديه أدوات المطوّر في المتصفح يستطيع تجاوزها في ثوانٍ.
// للأمان الفعلي يلزم تسجيل دخول حقيقي عبر الخادم وكوكيز HttpOnly.

const SESSION_KEY = "eb-auth-session";
const SESSION_HOURS = 24;

export const LOGO_PATH = "/logo.svg"; // غيّر لـ "/logo.png" بعد رفع الصورة

// ----------------------------------------------------
//  الأدوار وكلمات المرور
// ----------------------------------------------------
export type Role = "ADMIN" | "CASHIER";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مدير",
  CASHIER: "كاشير",
};

// كلمة المرور الثابتة لكل دور
const ROLE_PASSWORDS: Record<string, Role> = {
  "2021": "ADMIN",
  "0000": "CASHIER",
};

export function roleForPassword(password: string): Role | null {
  return ROLE_PASSWORDS[password.trim()] ?? null;
}

// الصفحات المسموح بها للكاشير (الباقي للمدير فقط)
export const CASHIER_ALLOWED_PATHS = ["/pos"];

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "ADMIN") return true;
  return CASHIER_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// ----------------------------------------------------
//  الجلسة
// ----------------------------------------------------
export interface Session {
  name: string;
  role: Role;
  expiresAt: number;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (
      !s ||
      typeof s.expiresAt !== "number" ||
      Date.now() >= s.expiresAt ||
      (s.role !== "ADMIN" && s.role !== "CASHIER")
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function isSessionValid(): boolean {
  return getSession() !== null;
}

export function getCurrentUser(): { name: string; role: Role } | null {
  const s = getSession();
  return s ? { name: s.name, role: s.role } : null;
}

export function endSession() {
  localStorage.removeItem(SESSION_KEY);
}

// تسجيل الدخول: يعيد الدور عند نجاح كلمة المرور، وإلا null
export function login(name: string, password: string): Role | null {
  const role = roleForPassword(password);
  if (!role) return null;
  const session: Session = {
    name: name.trim() || ROLE_LABELS[role],
    role,
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return role;
}
