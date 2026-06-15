"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface Slice {
  category: CategoryValue;
  total: number;
}

const COLORS: Record<CategoryValue, string> = {
  CLOTHES: "#6c63ff",
  SHOES: "#3b9a6e",
  PERFUMES: "#c9851a",
  PANTS: "#4f9cf9",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-card">
      <p className="font-medium text-text">{item.name}</p>
      <p className="text-accent nums">{formatCurrency(item.value)}</p>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: Slice[] }) {
  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      name: CATEGORY_LABELS[d.category],
      value: d.total,
      category: d.category,
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
              <Cell key={entry.category} fill={COLORS[entry.category]} />
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
