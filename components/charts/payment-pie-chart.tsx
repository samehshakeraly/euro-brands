"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";

interface Slice {
  key: "CASH" | "VISA" | "VODAFONE_CASH" | "INSTAPAY";
  label: string;
  total: number;
  count: number;
}

const COLORS: Record<Slice["key"], string> = {
  CASH: "#3b9a6e",
  VISA: "#6c63ff",
  VODAFONE_CASH: "#d9534f",
  INSTAPAY: "#4f9cf9",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const d = item.payload;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-card">
      <p className="font-medium text-text">{item.name}</p>
      <p className="text-accent nums">{formatCurrency(item.value)}</p>
      <p className="text-xs text-muted nums">{formatNumber(d.count)} فاتورة</p>
    </div>
  );
}

export function PaymentPieChart({ data }: { data: Slice[] }) {
  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      name: d.label,
      value: d.total,
      count: d.count,
      key: d.key,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted">
        لا توجد مبيعات في هذه الفترة
      </div>
    );
  }

  return (
    <div dir="ltr" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: "var(--text)", fontSize: 13 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
