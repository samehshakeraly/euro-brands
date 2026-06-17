"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  ReceiptText,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { apiGet } from "@/lib/client";
import type { LowStockResponse } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/pos", label: "الفاتورة", icon: ShoppingCart },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/insights", label: "الذكاء", icon: Sparkles },
  { href: "/sales", label: "سجل الفواتير", icon: ReceiptText },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lowStock, setLowStock] = useState(0);

  useEffect(() => {
    apiGet<LowStockResponse>("/api/low-stock")
      .then((r) => setLowStock(r.count))
      .catch(() => {});
    // يُعاد الجلب عند تغيّر الصفحة (مثلاً بعد تعديل المخزون)
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* الشعار + الروابط (يمين في RTL) */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-base font-extrabold text-white">
              EB
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight text-text sm:block">
              Euro Brands
            </span>
          </Link>

          {/* روابط سطح المكتب */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-16 items-center gap-2 border-b-[3px] px-2.5 text-sm font-medium transition-colors lg:px-3",
                    active
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-text"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.href === "/" && lowStock > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white nums">
                      {lowStock}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* مبدّل الوضع (يسار في RTL) + زر القائمة للموبايل */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="btn btn-ghost h-11 w-11 !px-0 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="القائمة"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* قائمة الموبايل */}
      {mobileOpen && (
        <nav className="border-t md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 border-r-[3px] px-5 py-4 text-base font-medium",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-transparent text-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.href === "/dashboard" && lowStock > 0 && (
                  <span className="mr-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white nums">
                    {lowStock}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
