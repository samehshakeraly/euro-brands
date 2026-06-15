"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, ReceiptText } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { useFetch } from "@/lib/use-fetch";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { SalesTable } from "@/components/sales-table";
import type { SaleDTO } from "@/lib/types";
import { BRANCHES, BRANCH_LABELS } from "@/lib/constants";

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [branch, setBranch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (debounced) params.set("search", debounced);
    if (from) params.set("from", startOfDay(new Date(from)).toISOString());
    if (to) params.set("to", endOfDay(new Date(to)).toISOString());
    const qs = params.toString();
    return `/api/sales${qs ? `?${qs}` : ""}`;
  }, [branch, debounced, from, to]);

  const { data, loading, error } = useFetch<SaleDTO[]>(url);
  const sales = data ?? [];
  const hasFilters = !!(search || branch || from || to);

  function clearFilters() {
    setSearch("");
    setBranch("");
    setFrom("");
    setTo("");
  }

  return (
    <div>
      <PageHeader
        title="سجل الفواتير"
        description="جميع الفواتير مرتبة من الأحدث للأقدم"
      />

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input pr-9"
              placeholder="رقم الفاتورة / اسم أو رقم العميل"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
          <div>
            <input
              type="date"
              className="input"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="من تاريخ"
            />
          </div>
          <div>
            <input
              type="date"
              className="input"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label="إلى تاريخ"
            />
          </div>
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

      {loading && <PageLoader />}
      {error && (
        <Card className="p-6 text-center text-danger">
          تعذّر تحميل الفواتير: {error}
        </Card>
      )}

      {!loading && !error && sales.length === 0 && (
        <EmptyState
          icon={<ReceiptText className="h-7 w-7" />}
          title="لا توجد فواتير"
          description={
            hasFilters
              ? "لا توجد فواتير مطابقة للفلاتر المحددة."
              : "ستظهر الفواتير هنا بعد تسجيل أول عملية بيع."
          }
        />
      )}

      {!loading && sales.length > 0 && (
        <Card className="p-2 sm:p-4">
          <SalesTable sales={sales} />
        </Card>
      )}
    </div>
  );
}
