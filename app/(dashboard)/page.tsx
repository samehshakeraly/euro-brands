"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Pencil,
  Check,
  LayoutDashboard,
  ShoppingCart,
  Package,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { HomeStats } from "@/lib/types";

const TARGET_KEY = "eb-daily-target";
const DEFAULT_TARGET = 5000;

export default function HomePage() {
  const { data, loading } = useFetch<HomeStats>("/api/home-stats");
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const stored = Number(localStorage.getItem(TARGET_KEY));
    if (Number.isFinite(stored) && stored > 0) setTarget(stored);
  }, []);

  function saveTarget() {
    const v = Math.max(0, Number(draft) || 0);
    if (v > 0) {
      setTarget(v);
      localStorage.setItem(TARGET_KEY, String(v));
    }
    setEditing(false);
  }

  return (
    <div>
      <PageHeader
        title="الرئيسية"
        description="نظرة سريعة على أداء اليوم"
        actions={
          <Link href="/dashboard" className="btn btn-secondary">
            <LayoutDashboard className="h-4 w-4" />
            لوحة التحكم التفصيلية
          </Link>
        }
      />

      {loading && <PageLoader />}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TodayVsYesterday data={data} />
            <DailyTarget
              todaySales={data.today.sales}
              target={target}
              editing={editing}
              draft={draft}
              onEdit={() => {
                setDraft(String(target));
                setEditing(true);
              }}
              onDraft={setDraft}
              onSave={saveTarget}
            />
          </div>

          {/* روابط سريعة */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <QuickLink href="/pos" icon={<ShoppingCart className="h-6 w-6" />} label="نقطة البيع" />
            <QuickLink href="/inventory" icon={<Package className="h-6 w-6" />} label="المخزون" />
            <QuickLink href="/dashboard" icon={<LayoutDashboard className="h-6 w-6" />} label="لوحة التحكم" />
            <QuickLink href="/sales" icon={<ReceiptText className="h-6 w-6" />} label="سجل الفواتير" />
            <QuickLink href="/insights" icon={<Sparkles className="h-6 w-6" />} label="الذكاء" />
          </div>
        </div>
      )}
    </div>
  );
}

function TodayVsYesterday({ data }: { data: HomeStats }) {
  const diff = data.today.sales - data.yesterday.sales;
  const pct =
    data.yesterday.sales > 0
      ? (diff / data.yesterday.sales) * 100
      : data.today.sales > 0
        ? 100
        : 0;
  const up = diff >= 0;

  return (
    <Card className="p-5" tone="accent">
      <h2 className="mb-4 text-base font-bold text-text">اليوم مقابل الأمس</h2>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">مبيعات اليوم</p>
          <p className="mt-1 text-3xl font-extrabold text-text nums">
            {formatCurrency(data.today.sales)}
          </p>
          <p className="mt-1 text-xs text-muted nums">
            {formatNumber(data.today.count)} فاتورة
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold nums",
            up
              ? "bg-[rgba(59,154,110,0.14)] text-success"
              : "bg-[rgba(217,83,79,0.14)] text-danger"
          )}
        >
          {up ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          {formatNumber(Math.abs(Math.round(pct)))}%
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div>
          <p className="text-xs text-muted">الفرق عن الأمس</p>
          <p
            className={cn(
              "mt-0.5 font-bold nums",
              up ? "text-success" : "text-danger"
            )}
          >
            {up ? "+" : "-"} {formatCurrency(Math.abs(diff))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">مبيعات الأمس</p>
          <p className="mt-0.5 text-text nums">
            {formatCurrency(data.yesterday.sales)}
          </p>
          <p className="text-xs text-muted nums">
            {formatNumber(data.yesterday.count)} فاتورة
          </p>
        </div>
      </div>
    </Card>
  );
}

function DailyTarget({
  todaySales,
  target,
  editing,
  draft,
  onEdit,
  onDraft,
  onSave,
}: {
  todaySales: number;
  target: number;
  editing: boolean;
  draft: string;
  onEdit: () => void;
  onDraft: (v: string) => void;
  onSave: () => void;
}) {
  const pct = target > 0 ? (todaySales / target) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const color =
    pct >= 100
      ? "bg-accent"
      : pct >= 80
        ? "bg-success"
        : pct >= 50
          ? "bg-warning"
          : "bg-danger";

  return (
    <Card className="p-5" tone="success">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-text">
          <Target className="h-5 w-5 text-success" />
          هدف اليوم
        </h2>
        {!editing ? (
          <button onClick={onEdit} className="btn btn-ghost h-8 w-8 !px-0" aria-label="تعديل الهدف">
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              autoFocus
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSave()}
              className="input h-9 w-28 nums"
            />
            <button onClick={onSave} className="btn btn-primary h-9 w-9 !px-0" aria-label="حفظ">
              <Check className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-2xl font-extrabold text-text nums">
          {formatCurrency(todaySales)}
        </span>
        <span className="text-muted nums">الهدف: {formatCurrency(target)}</span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-muted nums">
        {formatNumber(Math.round(pct))}% من الهدف
      </p>

      {pct >= 100 && (
        <p className="mt-3 rounded-lg bg-accent-soft p-3 text-center text-sm font-bold text-accent">
          🎉 تهانينا! تجاوزت هدف اليوم — استمر في التألق!
        </p>
      )}
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-surface p-4 text-center text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </Link>
  );
}
