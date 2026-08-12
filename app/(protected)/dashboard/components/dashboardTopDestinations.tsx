"use client";

import React, { useMemo, useState } from "react";
import type { Selection } from "@heroui/react";
import { Button, Dropdown, Header, Label, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  CaretDown,
  FileCsv,
  Check,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { IDR } from "@/app/libs/idr";

type TopDestinationItem = {
  label: string;
  quantity: number;
  revenue: number;
  percentage?: number; // Calculated locally
};

type MetricKey = "booking" | "revenue";

interface TopDestinationsProps {
  items?: TopDestinationItem[];
  startDate?: string;
  endDate?: string;
  onMetricChange?: (metric: MetricKey) => void;
}

const DEFAULT_DESTINATIONS: TopDestinationItem[] = [
  { label: "Tidak ada data", quantity: 0, revenue: 0 },
];

const VISIBLE_LIMIT = 4;

const METRIC_OPTIONS: { id: MetricKey; label: string }[] = [
  { id: "booking", label: "Booking" },
  { id: "revenue", label: "Revenue" },
];

function DonutChart({
  items,
  total,
}: {
  items: TopDestinationItem[];
  total: number;
}) {
  const segments = useMemo(() => {
    let accumulated = 0;
    return items.map((item) => {
      const percentage = total > 0 ? item.percentage || 0 : 0;
      const segment = {
        percentage,
        offset: accumulated,
        opacity: 1 - Math.min(percentage / 100, 0.7),
      };
      accumulated -= percentage;
      return segment;
    });
  }, [items, total]);

  return (
    <div className="relative h-[110px] w-[110px] xl:w-1/2 shrink-0">
      <svg
        viewBox="0 0 36 36"
        className="h-full w-full -rotate-90 drop-shadow-sm"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="transparent"
          stroke="var(--surface-secondary)"
          strokeWidth="3.5"
        />
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx="18"
            cy="18"
            r="15.915"
            fill="transparent"
            stroke="var(--accent)"
            strokeWidth="3.5"
            strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
            strokeDashoffset={segment.offset}
            strokeLinecap="butt"
            opacity={segment.opacity}
            className="transition-all duration-500 ease-in-out"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black leading-none text-[var(--foreground)]">
          {items.length}
        </span>
        <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Items
        </span>
      </div>
    </div>
  );
}

function LegendItem({
  item,
  metric,
}: {
  item: TopDestinationItem;
  metric: MetricKey;
}) {
  const displayValue =
    metric === "booking" ? `${item.quantity}x` : IDR(item.revenue);

  return (
    <div className="flex items-center gap-2.5 group">
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] shadow-sm"
        aria-hidden="true"
        style={{ opacity: 1 - Math.min((item.percentage || 0) / 100, 0.7) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[10px] font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors lg:max-w-[100px] xl:max-w-full">
            {item.label}
          </span>
          <span className="shrink-0 text-[10px] font-black text-[var(--foreground)]">
            {item.percentage}%
          </span>
        </div>
        <p className="text-[9px] font-medium text-[var(--muted)]">
          {displayValue}
        </p>
      </div>
    </div>
  );
}

export default function TopDestinations({
  items,
  startDate,
  endDate,
  onMetricChange,
}: TopDestinationsProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<Selection>(
    new Set<MetricKey>(["booking"]),
  );

  const metricKey = (Array.from(selectedMetric)[0] as MetricKey) ?? "booking";
  const metricLabel =
    METRIC_OPTIONS.find((m) => m.id === metricKey)?.label ?? "Booking";

  const rawDestinations =
    items && items.length > 0 ? items : DEFAULT_DESTINATIONS;

  const destinations = useMemo(() => {
    // 1. Sort based on metric
    const sorted = [...rawDestinations].sort((a, b) => {
      if (metricKey === "booking") return b.quantity - a.quantity;
      return b.revenue - a.revenue;
    });

    // 2. Calculate total for percentage
    const total = sorted.reduce(
      (acc, item) =>
        acc + (metricKey === "booking" ? item.quantity : item.revenue),
      0,
    );

    // 3. Assign percentages
    return sorted.map((item) => ({
      ...item,
      percentage:
        total > 0
          ? Math.round(
              ((metricKey === "booking" ? item.quantity : item.revenue) /
                total) *
                100,
            )
          : 0,
    }));
  }, [rawDestinations, metricKey]);

  const handleMetricChange = (keys: Selection) => {
    setSelectedMetric(keys);
    const key = Array.from(keys)[0] as MetricKey;
    if (key) onMetricChange?.(key);
  };

  const visibleDestinations = showAll
    ? destinations
    : destinations.slice(0, VISIBLE_LIMIT);
  const hasMore = destinations.length > VISIBLE_LIMIT;

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const url = `${baseUrl}/payment/reports/top-services/export?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute(
        "download",
        `service-favorites-${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal mengekspor data Excel");
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
            Service Favorites
          </h3>
          <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">
            Berdasarkan {metricLabel.toLowerCase()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Dropdown Metric */}
     <Dropdown>
  <Dropdown.Trigger>
    <Button
      variant="secondary"
      size="sm"
      className="h-8 gap-2 rounded-xl px-3 text-[10px] font-bold"
    >
      {metricLabel}
      <CaretDown size={12} weight="bold" />
    </Button>
  </Dropdown.Trigger>

  <Dropdown.Popover placement="bottom end" className="min-w-[160px] rounded-xl">
    <Dropdown.Menu
      selectedKeys={selectedMetric}
      selectionMode="single"
      onSelectionChange={handleMetricChange}
    >
      <Dropdown.Section>
        <Header>Metrik</Header>

        {METRIC_OPTIONS.map((option) => (
          <Dropdown.Item
            key={option.id}
            id={option.id}
            textValue={option.label}
          >
            <Label>{option.label}</Label>
            <Dropdown.ItemIndicator />
          </Dropdown.Item>
        ))}
      </Dropdown.Section>
    </Dropdown.Menu>
  </Dropdown.Popover>
</Dropdown>

          {/* Show All Toggle */}
          {hasMore && (
            <Tooltip content={showAll ? "Sembunyikan" : "Tampilkan Semua"}>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setShowAll(!showAll)}
                className={cn(
                  "h-8 w-8 min-w-0 rounded-xl p-0",
                  showAll && "bg-accent text-accent-foreground",
                )}
              >
                {showAll ? (
                  <EyeSlash size={16} weight="bold" />
                ) : (
                  <Eye size={16} weight="bold" />
                )}
              </Button>
            </Tooltip>
          )}

          {/* Export */}
          <Tooltip content="Export ke Excel">
            <Button
              variant="primary"
              size="sm"
              onPress={handleExport}
              className="h-8 w-8 min-w-0 rounded-xl p-0 bg-accent text-accent-foreground"
            >
              <FileCsv size={18} weight="bold" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center flex-col md:flex-row gap-8 justify-between">
        <DonutChart items={destinations} total={100} />
        <div className="flex flex-1 flex-col gap-3.5 md:w-auto w-full xl:w-1/2">
          {visibleDestinations.map((item, index) => (
            <LegendItem key={index} item={item} metric={metricKey} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-separator pt-5">
        {visibleDestinations.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-16 shrink-0 truncate text-[9px] font-bold text-[var(--muted)]">
              {item.label}
            </span>
            <div
              className="flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]"
              style={{ height: 6 }}
            >
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-700 ease-out"
                style={{
                  width: `${item.percentage}%`,
                  opacity: 1 - Math.min((item.percentage || 0) / 100, 0.7),
                }}
              />
            </div>
            <span className="w-8 text-right text-[10px] font-black text-[var(--foreground)]">
              {item.percentage}%
            </span>
          </div>
        ))}

        {!showAll && hasMore && (
          <Button
            variant="link"
            size="sm"
            onPress={() => setShowAll(true)}
            className="mt-2 self-center text-[10px] font-bold text-accent hover:underline"
          >
            Lihat Semua ({destinations.length})
          </Button>
        )}
        {showAll && hasMore && (
          <Button
            variant="link"
            size="sm"
            onPress={() => setShowAll(false)}
            className="mt-2 self-center text-[10px] font-bold text-muted hover:underline"
          >
            Sembunyikan
          </Button>
        )}
      </div>
    </div>
  );
}
