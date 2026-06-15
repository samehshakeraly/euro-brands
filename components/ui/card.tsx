import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardTone = "accent" | "success" | "warning" | "none";

const toneClass: Record<CardTone, string> = {
  accent: "card-accent",
  success: "card-success",
  warning: "card-warning",
  none: "",
};

export function Card({
  children,
  className,
  tone = "none",
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
}) {
  return (
    <div className={cn("card", toneClass[tone], className)}>{children}</div>
  );
}

// بطاقة إحصائية بإطار علوي ملوّن
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "accent",
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: CardTone;
}) {
  const iconBg: Record<CardTone, string> = {
    accent: "bg-accent-soft text-accent",
    success: "bg-[rgba(59,154,110,0.12)] text-success",
    warning: "bg-[rgba(201,133,26,0.12)] text-warning",
    none: "bg-[var(--surface-2)] text-muted",
  };

  return (
    <Card tone={tone} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 text-2xl font-extrabold text-text nums">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted nums">{subtitle}</p>
          )}
        </div>
        {icon && (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              iconBg[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}
