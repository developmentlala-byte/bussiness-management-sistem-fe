"use client";

import { useMemo, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

type DailyBooking = {
  dow: number;
  count: number;
};

interface WeeklyBookingCardProps {
  data?: DailyBooking[];
  prevWeekTotal?: number;
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const Y_TICKS = 4;
const BAR_HEIGHT = 120;

export default function WeeklyBookingCard({
  data = [],
  prevWeekTotal = 0,
}: WeeklyBookingCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const counts = useMemo(() => {
    if (data.length === 0) return Array(7).fill(0) as number[];
    return data.map((d) => Number(d.count));
  }, [data]);

  const total = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts, 1);
  const maxIndex = counts.indexOf(Math.max(...counts));

  const trendPct =
    prevWeekTotal > 0
      ? Math.round(((total - prevWeekTotal) / prevWeekTotal) * 100)
      : 0;

  const yTicks = useMemo(() => {
    const step = Math.ceil(maxCount / Y_TICKS);
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => i * step).reverse();
  }, [maxCount]);

  return (
    <div className="rounded-lg border bg-surface border-border bg-card p-5 w-full h-full">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-muted-foreground">Booking activity</p>
        <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center">
          <ArrowSquareOut size={14} className="text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-semibold text-foreground">{total}</span>
        {prevWeekTotal > 0 && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
              trendPct >= 0
                ? "bg-blue-500/10 text-blue-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {trendPct >= 0 ? "↑" : "↓"} {Math.abs(trendPct)}%
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Total bookings this week
      </p>

      <div className="flex gap-3 items-end">
        {/* Y-axis ticks */}
        <div
          className="flex flex-col justify-between pb-5 text-right"
          style={{ height: BAR_HEIGHT + 20 }}
        >
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="text-[10px] text-muted-foreground leading-none"
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex items-end justify-between gap-1.5 flex-1">
          {counts.map((count, i) => {
            const heightPx = Math.max(
              Math.round((count / maxCount) * BAR_HEIGHT),
              4,
            );
            const isMax = i === maxIndex;
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-2 flex-1 relative"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-sm pointer-events-none">
                    {count} booking
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </div>
                )}

                <div
                  className={`w-full rounded-lg transition-all duration-150 ${
                    isHovered
                      ? "opacity-100 scale-x-105"
                      : isMax
                        ? "bg-accent opacity-100"
                        : "bg-accent/20"
                  } ${isHovered ? "bg-accent" : ""}`}
                  style={{ height: `${heightPx}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
