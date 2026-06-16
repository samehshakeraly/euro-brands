"use client";

import { useEffect, useState } from "react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { cn } from "@/lib/cn";

export interface DateRange {
  from: string; // ISO
  to: string; // ISO
}

type Preset = "daily" | "weekly" | "monthly" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "daily", label: "يومي" },
  { key: "weekly", label: "أسبوعي" },
  { key: "monthly", label: "شهري" },
  { key: "custom", label: "مخصص" },
];

function computeRange(preset: Preset, cFrom: string, cTo: string): DateRange {
  const now = new Date();
  let from: Date;
  let to: Date = endOfDay(now);
  if (preset === "daily") from = startOfDay(now);
  else if (preset === "weekly") from = startOfDay(subDays(now, 6));
  else if (preset === "monthly") from = startOfDay(subDays(now, 29));
  else {
    from = cFrom ? startOfDay(new Date(cFrom)) : startOfDay(subDays(now, 6));
    to = cTo ? endOfDay(new Date(cTo)) : endOfDay(now);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function DateRangePicker({
  onChange,
}: {
  onChange: (range: DateRange) => void;
}) {
  const [preset, setPreset] = useState<Preset>("weekly");
  const [customFrom, setCustomFrom] = useState(
    format(subDays(new Date(), 6), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    onChange(computeRange(preset, customFrom, customTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border bg-surface p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
              preset === p.key
                ? "bg-accent text-white"
                : "text-muted hover:text-text"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="input w-auto"
          />
          <span className="text-muted">إلى</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            className="input w-auto"
          />
        </div>
      )}
    </div>
  );
}
