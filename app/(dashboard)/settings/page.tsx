"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/logo";
import { changePassword, endSession, DEFAULT_PASSWORD } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("كلمة المرور الجديدة لا تطابق التأكيد");
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword(current, next);
      if (!res.ok) {
        toast.error(res.error || "تعذّر تغيير كلمة المرور");
        return;
      }
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    endSession();
    toast.success("تم تسجيل الخروج");
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الإعدادات" description="إدارة كلمة المرور والجلسة" />

      {/* بطاقة المعلومات */}
      <Card className="mb-6 flex items-center gap-4 p-5">
        <Logo size={64} className="shrink-0 rounded-full" />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-text">Euro Brands</h2>
          <p className="mt-1 text-sm text-muted">
            نظام إدارة المخزون والمبيعات — جميع البيانات محمية بكلمة مرور
            مشتركة لكل الموظفين.
          </p>
        </div>
      </Card>

      {/* تغيير كلمة المرور */}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
          <Lock className="h-5 w-5 text-accent" />
          تغيير كلمة المرور
        </h2>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">كلمة المرور الحالية</label>
            <div className="relative">
              <input
                type={showCur ? "text" : "password"}
                className="input pl-10 nums"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder={`الافتراضية: ${DEFAULT_PASSWORD}`}
              />
              <button
                type="button"
                onClick={() => setShowCur((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                aria-label={showCur ? "إخفاء" : "إظهار"}
              >
                {showCur ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="input pl-10 nums"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="4 أحرف على الأقل"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                aria-label={showNew ? "إخفاء" : "إظهار"}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="label">تأكيد كلمة المرور الجديدة</label>
            <input
              type={showNew ? "text" : "password"}
              className="input nums"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="btn btn-primary"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            حفظ كلمة المرور
          </button>

          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-[rgba(201,133,26,0.08)] p-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              كلمة المرور تُحفظ في هذا المتصفح فقط (localStorage)، لكل جهاز
              كلمة مرور مستقلة. هذه ليست حماية كاملة — تكفي لمنع الوصول العابر.
            </p>
          </div>
        </form>
      </Card>

      {/* تسجيل الخروج */}
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-text">
            <LogOut className="h-5 w-5 text-danger" />
            تسجيل الخروج
          </h2>
          <p className="mt-1 text-sm text-muted">
            سيُطلب منك إدخال كلمة المرور مرة أخرى للدخول.
          </p>
        </div>
        <button onClick={logout} className="btn btn-danger">
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </Card>
    </div>
  );
}
