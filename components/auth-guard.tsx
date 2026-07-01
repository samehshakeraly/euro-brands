"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { getSession } from "@/lib/auth";

// مسارات يُسمح للكاشير بالوصول إليها (الفاتورة فقط)
function cashierAllowed(pathname: string): boolean {
  return pathname === "/pos" || pathname.startsWith("/pos/");
}

// حارس من جهة المتصفح: يفرض الجلسة والدور.
// لا جلسة → /login. كاشير خارج /pos → /pos مع رسالة. المدير: وصول كامل.
// (راجع تعليق الأمان في lib/auth.ts)
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      const target =
        pathname && pathname !== "/login"
          ? `/login?next=${encodeURIComponent(pathname)}`
          : "/login";
      router.replace(target);
      return;
    }

    // فرض صلاحية الكاشير: يُسمح له بصفحة الفاتورة فقط
    if (session.role === "CASHIER" && pathname && !cashierAllowed(pathname)) {
      toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
      router.replace("/pos");
      return;
    }

    setOk(true);
  }, [router, pathname]);

  if (!ok) {
    // شاشة بيضاء قصيرة أثناء فحص الجلسة (لتفادي وميض المحتوى)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg" />
    );
  }
  return <>{children}</>;
}
