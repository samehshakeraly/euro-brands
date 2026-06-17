"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { canAccessPath, getSession } from "@/lib/auth";

// حارس من جهة المتصفح — يتحقق من الجلسة والدور (راجع تعليق الأمان في lib/auth.ts)
// - بلا جلسة → /login
// - كاشير يحاول صفحة غير مسموحة → /pos مع رسالة
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const deniedToast = useRef(false);

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

    if (pathname && !canAccessPath(session.role, pathname)) {
      if (!deniedToast.current) {
        deniedToast.current = true;
        toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
      }
      setOk(false);
      router.replace("/pos");
      return;
    }

    deniedToast.current = false;
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
