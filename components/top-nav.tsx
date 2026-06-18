"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  LayoutDashboard,
  Package,
  ShoppingCart,
  ReceiptText,
  Sparkles,
  Truck,
  Settings,
  Menu,
  X,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { apiGet } from "@/lib/client";
import type { LowStockResponse } from "@/lib/types";
import {
  canAccessPath,
  endSession,
  getCurrentUser,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/pos", label: "الفاتورة", icon: ShoppingCart },
  { href: "/insights", label: "الذكاء", icon: Sparkles },
  { href: "/delivery", label: "الطلبات", icon: Truck },
  { href: "/sales", label: "سجل الفواتير", icon: ReceiptText },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lowStock, setLowStock] = useState(0);
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  useEffect(() => {
    apiGet<LowStockResponse>("/api/low-stock")
      .then((r) => setLowStock(r.count))
      .catch(() => {});
  }, [pathname]);

  // روابط مرئية حسب دور المستخدم
  const navItems = user
    ? NAV_ITEMS.filter((item) => canAccessPath(user.role, item.href))
    : [];

  function logout() {
    endSession();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* الشعار + الروابط (يمين في RTL) */}
        <div className="flex items-center gap-8">
          <Link
            href={user?.role === "CASHIER" ? "/pos" : "/"}
            className="flex items-center gap-2"
          >
            <Logo size={36} className="rounded-full" />
            <span className="hidden text-lg font-extrabold tracking-tight text-text sm:block">
              Euro Brands
            </span>
          </Link>

          {/* روابط سطح المكتب */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
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

        {/* المستخدم + مبدّل الوضع (يسار في RTL) + زر القائمة للموبايل */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2 rounded-lg border bg-bg px-2.5 py-1.5 sm:flex">
              <UserCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-text">{user.name}</span>
              <span
                className={cn(
                  "badge text-[11px]",
                  user.role === "ADMIN"
                    ? "bg-accent-soft text-accent"
                    : "bg-[var(--surface-2)] text-muted"
                )}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          )}
          <ThemeToggle />
          <button
            onClick={logout}
            className="btn btn-ghost hidden h-9 gap-1.5 px-2.5 text-xs text-danger hover:bg-[rgba(217,83,79,0.12)] sm:inline-flex"
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </button>
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
          {user && (
            <div className="flex items-center gap-2 border-b bg-bg px-5 py-3">
              <UserCircle className="h-5 w-5 text-accent" />
              <span className="font-medium text-text">{user.name}</span>
              <span
                className={cn(
                  "badge text-[11px]",
                  user.role === "ADMIN"
                    ? "bg-accent-soft text-accent"
                    : "bg-[var(--surface-2)] text-muted"
                )}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          )}
          {navItems.map((item) => {
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
          <button
            onClick={() => {
              setMobileOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-3 border-r-[3px] border-transparent px-5 py-4 text-base font-medium text-danger"
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </nav>
      )}
    </header>
  );
}
