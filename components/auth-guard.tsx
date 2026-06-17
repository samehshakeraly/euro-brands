"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isSessionValid } from "@/lib/auth";

// حارس بسيط من جهة المتصفح — يعيد التوجيه إلى /login عند غياب الجلسة
// (راجع تعليق الأمان في lib/auth.ts)
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (isSessionValid()) {
      setOk(true);
      return;
    }
    const target =
      pathname && pathname !== "/login"
        ? `/login?next=${encodeURIComponent(pathname)}`
        : "/login";
    router.replace(target);
  }, [router, pathname]);

  if (!ok) {
    // شاشة بيضاء قصيرة أثناء فحص الجلسة (لتفادي وميض المحتوى)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg" />
    );
  }
  return <>{children}</>;
}
