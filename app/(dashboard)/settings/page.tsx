"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  UserCircle,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { startOfDay, endOfDay } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useFetch } from "@/lib/use-fetch";
import {
  endSession,
  getCurrentUser,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { ActivityLogDTO } from "@/lib/types";

function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  function logout() {
    endSession();
    toast.success("تم تسجيل الخروج");
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="الإعدادات" description="بيانات المستخدم وسجل النشاط" />

      {/* بطاقة المستخدم الحالي */}
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5" tone="accent">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <UserCircle className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text">
              {user?.name ?? "—"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              الصلاحية:{" "}
              <span className="font-medium text-text">
                {user ? roleLabel(user.role) : "—"}
              </span>
            </p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-danger">
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </Card>

      {/* سجل النشاط — للمدير فقط */}
      {user?.role === "ADMIN" ? (
        <ActivityLogSection />
      ) : (
        <Card className="flex items-center gap-3 p-5 text-sm text-muted">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
          سجل النشاط متاح للمدير فقط.
        </Card>
      )}
    </div>
  );
}

function ActivityLogSection() {
  const { data, loading, error } = useFetch<ActivityLogDTO[]>(
    "/api/activity?limit=1000"
  );
  const logs = useMemo(() => data ?? [], [data]);

  const [filterUser, setFilterUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const users = useMemo(
    () => [...new Set(logs.map((l) => l.userName))].sort((a, b) => a.localeCompare(b, "ar")),
    [logs]
  );

  const filtered = useMemo(() => {
    const fromTs = from ? startOfDay(new Date(from)).getTime() : null;
    const toTs = to ? endOfDay(new Date(to)).getTime() : null;
    return logs.filter((l) => {
      if (filterUser && l.userName !== filterUser) return false;
      const ts = new Date(l.createdAt).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }, [logs, filterUser, from, to]);

  const hasFilters = !!(filterUser || from || to);

  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
        <ScrollText className="h-5 w-5 text-accent" />
        سجل النشاط
      </h2>

      {/* الفلاتر */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">المستخدم</label>
          <select
            className="input"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">كل المستخدمين</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">من تاريخ</label>
          <input
            type="date"
            className="input"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">إلى تاريخ</label>
          <input
            type="date"
            className="input"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      {hasFilters && (
        <button
          className="btn btn-ghost mb-3 h-8 px-2 text-xs"
          onClick={() => {
            setFilterUser("");
            setFrom("");
            setTo("");
          }}
        >
          <X className="h-4 w-4" />
          مسح الفلاتر
        </button>
      )}

      {loading && <PageLoader />}
      {error && (
        <p className="rounded-lg border border-danger/40 bg-[rgba(217,83,79,0.08)] p-3 text-sm text-danger">
          تعذّر تحميل سجل النشاط: {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<ScrollText className="h-7 w-7" />}
          title="لا توجد سجلات"
          description={
            hasFilters
              ? "لا توجد سجلات مطابقة للفلاتر المحددة."
              : "ستظهر هنا إجراءات المستخدمين فور حدوثها."
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b text-muted">
                <th className="px-3 py-2 font-medium">التاريخ</th>
                <th className="px-3 py-2 font-medium">المستخدم</th>
                <th className="px-3 py-2 font-medium">الصلاحية</th>
                <th className="px-3 py-2 font-medium">الإجراء</th>
                <th className="px-3 py-2 font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)]">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted nums">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-text">
                    {l.userName}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        l.userRole === "ADMIN"
                          ? "badge bg-accent-soft text-accent"
                          : "badge bg-[var(--surface-2)] text-muted"
                      }
                    >
                      {roleLabel(l.userRole)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text">{l.action}</td>
                  <td className="px-3 py-2.5 text-muted">{l.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
