import React, { useMemo } from "react";
import { CaretDown } from "@phosphor-icons/react";

type TopDestinationItem = {
  label: string;
  bookings: number;
  percentage: number;
};

interface TopDestinationsProps {
  items?: TopDestinationItem[];
}

const DEFAULT_DESTINATIONS: TopDestinationItem[] = [
  { label: "Tidak ada data", bookings: 0, percentage: 0 },
];

function DonutChart({ items }: { items: TopDestinationItem[] }) {
  const segments = useMemo(() => {
    let accumulated = 0;
    return items.map((item) => {
      const segment = {
        percentage: item.percentage,
        offset: accumulated,
        opacity: 1 - Math.min(item.percentage / 100, 0.7),
      };
      accumulated -= item.percentage;
      return segment;
    });
  }, [items]);

  return (
    <div className="relative h-[100px] w-[100px] shrink-0">
      <svg
        viewBox="0 0 36 36"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="transparent"
          stroke="oklch(95.24% 0.0117 52.55)"
          strokeWidth="3.5"
        />
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx="18"
            cy="18"
            r="15.915"
            fill="transparent"
            stroke="oklch(58.67% 0.118 52.55)"
            strokeWidth="3.5"
            strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
            strokeDashoffset={segment.offset}
            strokeLinecap="butt"
            opacity={segment.opacity}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none text-[var(--foreground)]">
          {items.length}
        </span>
        <span className="mt-0.5 text-[8px] text-[var(--muted)]">Services</span>
      </div>
    </div>
  );
}

function LegendItem({ item }: { item: TopDestinationItem }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="mt-px h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
        aria-hidden="true"
        style={{ opacity: 1 - Math.min(item.percentage / 100, 0.7) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-[10px] font-semibold text-[var(--foreground)]">
            {item.label}
          </span>
          <span className="shrink-0 text-[9px] font-bold text-[var(--muted)]">
            {item.percentage}%
          </span>
        </div>
        <p className="text-[9px] text-[var(--muted)]">
          {item.bookings} bookings
        </p>
      </div>
    </div>
  );
}

export default function TopDestinations({ items }: TopDestinationsProps) {
  const destinations = items && items.length > 0 ? items : DEFAULT_DESTINATIONS;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            Service Favorites
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            Berdasarkan jumlah reservasi
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-foreground)]"
        >
          Periode Saat Ini <CaretDown size={11} weight="bold" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <DonutChart items={destinations} />
        <div className="flex flex-1 flex-col gap-2.5">
          {destinations.map((item, index) => (
            <LegendItem key={index} item={item} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
        {destinations.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-14 shrink-0 truncate text-[9px] text-[var(--muted)]">
              {item.label}
            </span>
            <div
              className="flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]"
              style={{ height: 4 }}
            >
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{
                  width: `${item.percentage}%`,
                  opacity: 1 - Math.min(item.percentage / 100, 0.7),
                }}
              />
            </div>
            <span className="w-7 text-right text-[9px] font-bold text-[var(--foreground)]">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
