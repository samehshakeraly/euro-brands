"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck,
  X,
  Phone,
  MapPin,
  ExternalLink,
  Package2,
  CheckCircle2,
  ArrowDownLeft,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import toast from "react-hot-toast";
import { useFetch } from "@/lib/use-fetch";
import { apiPost } from "@/lib/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, StatCard } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { BranchBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  BRANCHES,
  BRANCH_LABELS,
  DELIVERY_METHODS,
  DELIVERY_METHOD_LABELS,
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABELS,
  ORDER_SOURCES,
  ORDER_SOURCE_LABELS,
  type DeliveryStatusValue,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatSaleNumber,
} from "@/lib/format";
import type { SaleDTO } from "@/lib/types";

const STATUS_STYLE: Record<DeliveryStatusValue, string> = {
  NEW: "bg-[rgba(79,156,249,0.14)] text-[#4f9cf9]",
  PREPARING: "bg-[rgba(201,133,26,0.14)] text-warning",
  READY: "bg-accent-soft text-accent",
  OUT_FOR_DELIVERY: "bg-[rgba(255,138,40,0.14)] text-[#ff8a28]",
  DELIVERED: "bg-[rgba(59,154,110,0.14)] text-success",
  RETURNED: "bg-[rgba(217,83,79,0.14)] text-danger",
};

const STATUS_ROW: Record<DeliveryStatusValue, string> = {
  NEW: "",
  PREPARING: "bg-[rgba(201,133,26,0.04)]",
  READY: "bg-accent-soft/40",
  OUT_FOR_DELIVERY: "bg-[rgba(255,138,40,0.05)]",
  DELIVERED: "bg-[rgba(59,154,110,0.05)]",
  RETURNED: "bg-[rgba(217,83,79,0.08)]",
};

export default function DeliveryPage() {
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (source) params.set("source", source);
    if (from) params.set("from", startOfDay(new Date(from)).toISOString());
    if (to) params.set("to", endOfDay(new Date(to)).toISOString());
    const qs = params.toString();
    return `/api/delivery${qs ? `?${qs}` : ""}`;
  }, [branch, status, method, source, from, to]);

  const { data, loading, error, refetch } = useFetch<SaleDTO[]>(url);
  const orders = data ?? [];

  const summary = useMemo(() => {
    const total = orders.length;
    let inTransit = 0;
    let delivered = 0;
    let returned = 0;
    for (const o of orders) {
      const s = o.deliveryStatus;
      if (s === "DELIVERED") delivered++;
      else if (s === "RETURNED") returned++;
      else if (s) inTransit++;
    }
    return { total, inTransit, delivered, returned };
  }, [orders]);

  const hasFilters = !!(branch || status || method || source || from || to);

  function clearFilters() {
    setBranch("");
    setStatus("");
    setMethod("");
    setSource("");
    setFrom("");
    setTo("");
  }

  async function changeStatus(id: string, newStatus: DeliveryStatusValue) {
    setUpdating(id);
    try {
      await apiPost(`/api/delivery/${id}/status`, { status: newStatus });
      toast.success(
        `تم تحديث الحالة إلى ${DELIVERY_STATUS_LABELS[newStatus]}`
      );
      if (newStatus === "RETURNED")
        toast.success("تم إعادة الكميات للمخزون", { id: "restore" });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحديث الحالة");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="الطلبات"
        description="إدارة طلبات التوصيل وتتبّع حالتها"
      />

      {/* الفلاتر */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            className="input"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">كل الفروع</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {BRANCH_LABELS[b]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {DELIVERY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DELIVERY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">كل طرق التوصيل</option>
            {DELIVERY_METHODS.map((m) => (
              <option key={m} value={m}>
                {DELIVERY_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">كل مصادر الطلب</option>
            {ORDER_SOURCES.map((s) => (
              <option key={s} value={s}>
                {ORDER_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="من تاريخ"
          />
          <input
            type="date"
            className="input"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label="إلى تاريخ"
          />
        </div>
        {hasFilters && (
          <button
            className="btn btn-ghost mt-3 h-8 px-2 text-xs"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
            مسح الفلاتر
          </button>
        )}
      </Card>

      {/* بطاقات الملخّص */}
      {!loading && !error && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            tone="accent"
            title="إجمالي الطلبات"
            value={formatNumber(summary.total)}
            icon={<Package2 className="h-5 w-5" />}
          />
          <StatCard
            tone="accent"
            title="قيد التوصيل"
            value={formatNumber(summary.inTransit)}
            icon={<Truck className="h-5 w-5" />}
          />
          <StatCard
            tone="success"
            title="تم التوصيل"
            value={formatNumber(summary.delivered)}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            tone="warning"
            title="مرتجع"
            value={formatNumber(summary.returned)}
            icon={<ArrowDownLeft className="h-5 w-5" />}
          />
        </div>
      )}

      {loading && <PageLoader />}
      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل الطلبات: {error}
        </Card>
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title="لا توجد طلبات توصيل"
          description={
            hasFilters
              ? "لا توجد طلبات مطابقة للفلاتر المحددة."
              : "ستظهر هنا الطلبات عند تفعيل خيار التوصيل في الفاتورة."
          }
        />
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              updating={updating === o.id}
              onChange={(s) => changeStatus(o.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  updating,
  onChange,
}: {
  order: SaleDTO;
  updating: boolean;
  onChange: (s: DeliveryStatusValue) => void;
}) {
  const status = order.deliveryStatus ?? "NEW";
  return (
    <Card className={cn("p-4", STATUS_ROW[status])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sales/${order.id}`}
              className="font-bold text-accent nums hover:underline"
            >
              {formatSaleNumber(order.saleNumber)}
            </Link>
            <BranchBadge branch={order.branch} />
            <span
              className={cn(
                "badge",
                STATUS_STYLE[status]
              )}
            >
              {DELIVERY_STATUS_LABELS[status]}
            </span>
            {order.orderSource && (
              <span className="badge bg-[var(--surface-2)] text-muted">
                {ORDER_SOURCE_LABELS[order.orderSource]}
              </span>
            )}
            {order.deliveryMethod && (
              <span className="badge bg-[var(--surface-2)] text-muted">
                {DELIVERY_METHOD_LABELS[order.deliveryMethod]}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted nums">
            {formatDateTime(order.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            className="input h-9 w-auto py-1.5 text-sm"
            disabled={updating}
            value={status}
            onChange={(e) => onChange(e.target.value as DeliveryStatusValue)}
          >
            {DELIVERY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DELIVERY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Link
            href={`/sales/${order.id}`}
            className="btn btn-ghost h-9 w-9 !px-0"
            aria-label="عرض الفاتورة"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t pt-3 text-sm sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-text">
            <span className="text-muted">العميل: </span>
            {order.customerName || (
              <span className="text-muted">عميل عابر</span>
            )}
          </div>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1.5 text-accent nums"
            >
              <Phone className="h-3.5 w-3.5" />
              {order.customerPhone}
            </a>
          )}
          {order.deliveryAddress && (
            <p className="flex items-start gap-1.5 text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{order.deliveryAddress}</span>
            </p>
          )}
          {order.addressNotes && (
            <p className="text-xs text-muted">📝 {order.addressNotes}</p>
          )}
          {order.trackingNumber && (
            <p className="text-xs text-muted nums">
              Bosta: {order.trackingNumber}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs text-muted">المنتجات</p>
          <ul className="space-y-1 text-xs">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2 text-text">
                <span className="min-w-0 truncate">
                  {it.productName}{" "}
                  <span className="text-muted nums">
                    ({it.size}) ×{it.quantity}
                  </span>
                </span>
                <span className="shrink-0 nums">
                  {formatCurrency(it.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-bold text-text nums">
            الإجمالي: {formatCurrency(order.finalAmount)}
            {order.remainingAmount > 0 && (
              <span className="mr-2 text-xs font-medium text-warning">
                (متبقٍ {formatCurrency(order.remainingAmount)})
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
