"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Insight, InsightsResponse } from "@/lib/types";

const TYPE_META = {
  success: {
    border: "border-r-success",
    bg: "bg-[rgba(59,154,110,0.12)]",
    text: "text-success",
    icon: CheckCircle2,
  },
  warning: {
    border: "border-r-warning",
    bg: "bg-[rgba(201,133,26,0.12)]",
    text: "text-warning",
    icon: AlertTriangle,
  },
  danger: {
    border: "border-r-danger",
    bg: "bg-[rgba(217,83,79,0.12)]",
    text: "text-danger",
    icon: AlertOctagon,
  },
} as const;

export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // استدعاء مباشر للخادم (التحليل الذكي يتم في الخادم وليس عبر طبقة المعاينة)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "تعذّر إجراء التحليل");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="الذكاء"
        description="تحليلات ذكية لمبيعاتك ومخزونك خلال آخر 30 يوماً"
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            تحديث التحليل
          </button>
        }
      />

      {loading && (
        <Card className="flex flex-col items-center justify-center gap-3 py-20">
          <Sparkles className="h-10 w-10 animate-pulse text-accent" />
          <p className="text-sm font-medium text-text">
            الذكاء يحلّل بياناتك...
          </p>
          <p className="text-xs text-muted">قد يستغرق الأمر بضع ثوانٍ</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-6 text-center text-danger">
          تعذّر إجراء التحليل: {error}
        </Card>
      )}

      {data && !loading && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span
              className={cn(
                "badge",
                data.source === "ai"
                  ? "bg-accent-soft text-accent"
                  : "bg-[var(--surface-2)] text-muted"
              )}
            >
              {data.source === "ai" ? "✦ تحليل Gemini" : "تحليل تلقائي"}
            </span>
            <span className="nums">
              آخر تحديث: {formatDateTime(data.generatedAt)}
            </span>
          </div>

          {data.insights.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-7 w-7" />}
              title="لا توجد رؤى بعد"
              description="ستظهر التحليلات بعد توفّر بيانات مبيعات كافية."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const meta = TYPE_META[insight.type] ?? TYPE_META.success;
  const Icon = meta.icon;
  return (
    <Card className={cn("border-r-4 p-5", meta.border)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            meta.bg,
            meta.text
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-text">{insight.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {insight.description}
          </p>
          <span className="badge mt-3 bg-[var(--surface-2)] text-muted">
            {insight.category}
          </span>
        </div>
      </div>
    </Card>
  );
}
