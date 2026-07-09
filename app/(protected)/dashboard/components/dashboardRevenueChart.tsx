import React, { useMemo } from "react";

type RevenueChartPoint = {
  date: string;
  total_revenue: number | string;
  is_today?: boolean;
};

interface RevenueChartProps {
  data?: RevenueChartPoint[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function RevenueChart({ data = [] }: RevenueChartProps) {
  const normalizedData = useMemo(
    () =>
      data.map((item) => ({
        date: item.date,
        value: Number(item.total_revenue) || 0,
        isToday: Boolean(item.is_today),
      })),
    [data],
  );

  const maxValue = useMemo(() => {
    if (normalizedData.length === 0) return 0;
    return Math.max(...normalizedData.map((item) => item.value), 0);
  }, [normalizedData]);

  const points = useMemo(() => {
    if (normalizedData.length === 0) return [];

    const chartWidth = 520;
    const chartHeight = 140;
    const leftPadding = 30;
    const pointCount = normalizedData.length;
    const xStep = pointCount === 1 ? 0 : chartWidth / (pointCount - 1);
    const safeMax = maxValue || 1;

    return normalizedData.map((item, index) => {
      const x = leftPadding + index * xStep;
      const y = chartHeight - (item.value / safeMax) * chartHeight + 10;
      return { ...item, x, y };
    });
  }, [normalizedData, maxValue]);

  const path = useMemo(() => {
    if (!points.length) return "";
    return points
      .map((point, index) =>
        index === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`,
      )
      .join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (!points.length) return "";
    const pathPoints = points
      .map((point, index) =>
        index === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`,
      )
      .join(" ");
    return `${pathPoints} L ${points[points.length - 1].x},170 L ${points[0].x},170 Z`;
  }, [points]);

  const xLabels = normalizedData.map((item) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    }).format(new Date(item.date)),
  );
  const labelStep = xLabels.length > 10 ? Math.ceil(xLabels.length / 8) : 1;

  const totalRevenue = normalizedData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            Ringkasan Pendapatan
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            Total periode ini: {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-2">
        <div className="flex flex-col justify-between pb-6 text-[9px] font-medium text-[var(--muted)] select-none">
          {[3, 2, 1, 0].map((index) => (
            <span key={index} className="flex h-0 items-center leading-none">
              {formatCurrency((index * maxValue) / 3 || 0)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <svg
            viewBox="0 0 560 180"
            className="h-[180px] w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="oklch(58.67% 0.118 52.55)"
                  stopOpacity="0.16"
                />
                <stop
                  offset="100%"
                  stopColor="oklch(58.67% 0.118 52.55)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, 45, 90, 135, 180].map((y, i) => (
              <line
                key={`gh-${i}`}
                x1="0"
                y1={y}
                x2="560"
                y2={y}
                stroke="oklch(90% 0.0146 52.55)"
                strokeWidth="0.5"
                strokeDasharray={i === 0 || i === 4 ? undefined : "3 4"}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}
            {path && (
              <path
                d={path}
                fill="none"
                stroke="oklch(58.67% 0.118 52.55)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {points.map((point, index) => (
              <circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                // titik "hari ini" digambar lebih besar biar keliatan ini data masih berjalan
                r={point.isToday ? 6 : 4}
                fill={
                  point.isToday
                    ? "oklch(58.67% 0.118 52.55)"
                    : "oklch(100% 0.0073 52.55)"
                }
                stroke="oklch(58.67% 0.118 52.55)"
                strokeWidth="2"
              >
                <title>
                  {`${xLabels[index]}${point.isToday ? " (Hari ini)" : ""}: ${formatCurrency(point.value)}`}
                </title>
              </circle>
            ))}
          </svg>

          <div className="mt-2.5 flex justify-between text-[9px] font-medium text-[var(--muted)] select-none">
            {xLabels.map((label, i) =>
              i % labelStep === 0 || i === xLabels.length - 1 ? (
                <span
                  key={i}
                  className={
                    normalizedData[i]?.isToday
                      ? "font-bold text-[var(--accent)]"
                      : undefined
                  }
                >
                  {label}
                </span>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </div>
      </div>

      {points.length === 0 && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Tidak ada data pendapatan untuk rentang tanggal terpilih.
        </p>
      )}
    </div>
  );
}
