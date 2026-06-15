"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import { formatCurrency, formatNumber } from "@/lib/format";

interface Point {
  date: string;
  total: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-text">
        {format(new Date(label), "yyyy/MM/dd")}
      </p>
      <p className="text-accent nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function SalesLineChart({ data }: { data: Point[] }) {
  return (
    <div dir="ltr" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), "dd/MM")}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={(v) => formatNumber(v)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#6c63ff"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#6c63ff" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
