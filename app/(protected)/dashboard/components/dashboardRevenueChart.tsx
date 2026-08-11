import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const formatDateLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
    new Date(iso),
  );

export default function RevenueChart({ data = [] }: RevenueChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        date: item.date,
        value: Number(item.total_revenue) || 0,
        isToday: Boolean(item.is_today),
        label: formatDateLabel(item.date),
      })),
    [data],
  );

  const maxValue = useMemo(
    () => Math.max(...chartData.map((d) => d.value), 0) || 1,
    [chartData],
  );

  const totalRevenue = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData],
  );

  // Sama kayak versi lama: kalau titik data > 10, skip label biar sumbu-X
  // gak numpuk, tapi label terakhir selalu ditampilin.
  const labelStep = chartData.length > 10 ? Math.ceil(chartData.length / 8) : 1;

  return (
    <div className="relative h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
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

      {chartData.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Tidak ada data pendapatan untuk rentang tanggal terpilih.
        </p>
      ) : (
        <div className="h-[190px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--accent)"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={({ x, y, index }) => {
                  const show =
                    index % labelStep === 0 || index === chartData.length - 1;
                  if (!show) return null;
                  const point = chartData[index];
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={point.isToday ? 700 : 500}
                      fill={point.isToday ? "var(--accent)" : "var(--muted)"}
                    >
                      {point.label}
                    </text>
                  );
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                width={72}
                domain={[0, maxValue]}
                ticks={[0, maxValue / 3, (maxValue * 2) / 3, maxValue]}
                tickFormatter={(v: number) => formatCurrency(v)}
                tick={{ fontSize: 9, fill: "var(--muted)" }}
              />

              <Tooltip
                cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]
                    .payload as (typeof chartData)[number];
                  return (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] shadow-sm">
                      <p className="font-semibold text-[var(--foreground)]">
                        {point.label}
                        {point.isToday ? " (Hari ini)" : ""}
                      </p>
                      <p className="mt-0.5 text-[var(--accent)]">
                        {formatCurrency(point.value)}
                      </p>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                animationDuration={500}
                // Titik "hari ini" digambar lebih besar & solid, sisanya hollow —
                // sama kayak logic di versi SVG manual sebelumnya.
                dot={({ cx, cy, payload, index }: any) => {
                  if (cx == null || cy == null) return null;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={payload.isToday ? 6 : 4}
                      fill={
                        payload.isToday ? "var(--accent)" : "var(--surface)"
                      }
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
