"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { BRANCH_LABELS, type BranchValue } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/format";

interface BranchDatum {
  branch: BranchValue;
  total: number;
  count: number;
}

const COLORS = ["#6c63ff", "#3b9a6e"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-text">{d.name}</p>
      <p className="text-accent nums">{formatCurrency(d.total)}</p>
      <p className="text-xs text-muted nums">{formatNumber(d.count)} فاتورة</p>
    </div>
  );
}

export function BranchBarChart({ data }: { data: BranchDatum[] }) {
  const chartData = data.map((b) => ({
    name: BRANCH_LABELS[b.branch],
    total: b.total,
    count: b.count,
  }));

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={(v) => formatNumber(v)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={90}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
