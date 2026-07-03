"use client";

import { cn } from "@heroui/styles";
import {
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  SquaresFour,
  Calendar,
  CreditCard,
  User,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react";
import TopDestinations from "./components/dashboardTopDestinations";
import RevenueChart from "./components/dashboardRevenueChart";
import { useMemo, useRef, useState } from "react";
import { Popover, RangeCalendar, Select, ListBox } from "@heroui/react";
import {
  today,
  getLocalTimeZone,
  startOfMonth,
  endOfMonth,
} from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { CalendarBlank as CalendarIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import { PaginatedApiResponse, SingleApiResponse } from "@/app/types/api";
import { useApiFetch } from "@/app/libs/use-http";
import { IDR } from "@/app/libs/idr";
import { formatNumber } from "@/app/libs/formatNumber";
import { formatWallClockDate } from "@/app/libs/date-format";
import WeeklyBookingCard from "./components/dashboardWeeklyBooking";

type DateRange = { start: DateValue; end: DateValue } | null;

type BookingSummaryResponse = {
  data: {
    total_bookings: { value: number; trend: number };
    total_paid_bookings: { value: number; trend: number };
    total_unpaid_bookings: { value: number; trend: number };
    total_cancelled_bookings: { value: number; trend: number };
  };

  meta: { compared_days: number };
};

type TotalCustomerResponse = {
  value: number;
  trend: number;
};

type RevenueReportResponse = {
  summary: { total_revenue: number; difference: number; trend: number };
  chart_data: Array<{ date: string; total_revenue: number | string }>;
  meta: { compared_days: number };
};

type TopServicesResponse = Array<{
  label: string;
  bookings: number;
  percentage: number;
}>;

type BookingLineItem = {
  type: "bundle_promo" | "service_variant";
  name: string;
  bundle_name?: string;
  duration_minutes?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type BookingItem = {
  id: number;
  booking_code: string;
  customer_name: string;
  customer_phone?: string;
  duration_minutes?: number;
  booking_bundle_promos?: BookingLineItem[];
  service_variants?: BookingLineItem[];
  schedule_date: string;
  total_amount?: number;
  therapists?: Array<{ id: number; name: string } | string>;
  status?: string;
  payment_status?: string;
};

type AttendanceRecord = {
  bms_ms_staff_id: number;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  status?: string;
};

type StaffRecord = {
  id: number;
  first_name: string;
  last_name?: string | null;
  avatar_path?: string | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");
const formatApiDate = (date: DateValue) =>
  `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;

// ─── Dummy Data for Presets ───────────────────────────────────────────────────

const PRESETS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "Month to date" },
  { id: "ytd", label: "Year to date" },
];

const QUICK_STATS = [
  { label: "Avg Trip Value", value: "$1,840" },
  { label: "Conversion Rate", value: "68.4%" },
  { label: "Repeat Customers", value: "42%" },
  { label: "Active Packages", value: "24" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed: "bg-(--success)/10 text-success",
    Pending: "bg-[var(--warning)]/15 text-[var(--warning)]",
    Canceled: "bg-(--danger)/10 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[9px] font-bold tracking-wide uppercase",
        map[status] ?? "bg-surface-secondary text-muted",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-md bg-current" />
      {status}
    </span>
  );
}

// ============================================================
// TIPE A: DASHBOARD (Analytics Grid) — Following UI Rules
// ============================================================
function TrendBadge({
  direction,
  value,
}: {
  direction: "up" | "down";
  value: string;
}) {
  const isUp = direction === "up";
  return (
    <span
      className="inline-flex items-center font-semibold"
      style={{
        gap: "var(--space-1)",
        padding: "var(--space-1) var(--space-2)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-xs)",
        backgroundColor: isUp
          ? "color-mix(in oklch, var(--success) 15%, transparent)"
          : "color-mix(in oklch, var(--danger) 15%, transparent)",
        color: isUp ? "var(--success)" : "var(--danger)",
      }}
    >
      {isUp ? (
        <ArrowUpRight
          style={{ width: "var(--icon-xs)", height: "var(--icon-xs)" }}
          weight="bold"
        />
      ) : (
        <ArrowDownRight
          style={{ width: "var(--icon-xs)", height: "var(--icon-xs)" }}
          weight="bold"
        />
      )}
      {value}
    </span>
  );
}

// ─── Stat Card — SAMA STYLE, tidak ada background berbeda ────────────────────
function StatCard({
  label,
  value,
  trend,
  trendDirection,
  context,
}: {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  context: string;
}) {
  return (
    <div
      className="flex flex-col justify-between min-w-0"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding-md)",
        flex: 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <span
          className="uppercase tracking-widest font-semibold"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>

      {/* Value — tidak boleh terpotong */}
      <div
        className="font-bold leading-none truncate"
        style={{
          fontSize: "var(--text-2xl)",
          color: "var(--foreground)",
          marginTop: "var(--space-2)",
        }}
        title={value}
      >
        {value}
      </div>

      {/* Trend */}
      {trend && (
        <div
          className="flex items-center"
          style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}
        >
          <TrendBadge direction={trendDirection} value={trend} />
          {context && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
              {context}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Feed Widget ─────────────────────────────────────────────────────
function ActivityFeed({
  items,
}: {
  items: BookingItem[];
}) {
  const getServiceLabel = (booking: BookingItem) => {
    const isBundle =
      booking.booking_bundle_promos && booking.booking_bundle_promos.length > 0;

    if (isBundle) {
      return booking.booking_bundle_promos?.[0]?.bundle_name ?? "Spa Service";
    }

    if (booking.service_variants && booking.service_variants.length > 0) {
      return booking.service_variants.map((item) => item.name).join(", ");
    }

    return "Spa Service";
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "var(--card-padding-md)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--foreground)",
          }}
        >
          Booking Activity
        </h3>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Today
        </p>
      </div>
      <div className="flex flex-col" style={{ padding: "var(--space-3) 0" }}>
        {items.slice(0, 5).map((item, i) => (
          <div
            key={item.id}
            className="flex"
            style={{
              gap: "var(--space-3)",
              padding: `var(--space-3) var(--card-padding-md)`,
            }}
          >
            {/* Icon indicator */}
            <div
              className="flex flex-col items-center"
              style={{ gap: "var(--space-1)", flexShrink: 0 }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "var(--icon-md)",
                  height: "var(--icon-md)",
                  backgroundColor: "var(--accent-100)",
                  color: "var(--accent)",
                  marginTop: "4px",
                }}
              >
                <Calendar size={14} />
              </div>
              {i < items.slice(0, 5).length - 1 && (
                <div
                  style={{
                    width: "1px",
                    flex: 1,
                    backgroundColor: "var(--separator)",
                    minHeight: "16px",
                  }}
                />
              )}
            </div>
            {/* Content */}
            <div
              className="flex flex-col min-w-0"
              style={{ gap: "var(--space-1)", paddingBottom: "var(--space-3)" }}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--foreground)",
                  lineHeight: 1.5,
                }}
              >
                {item.customer_name} - {getServiceLabel(item)}
              </p>
              <span
                style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}
              >
                {formatWallClockDate(item.schedule_date, { withTime: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Staff Attendance Widget ─────────────────────────────────────────────────
function StaffAttendanceWidget({
  staff,
  hadir,
  absen,
}: {
  staff: Array<{
    name: string;
    attand_in: string;
    attand_out: string;
    status: string;
    color: string;
    img?: string;
  }>;
  hadir: number;
  absen: number;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "var(--card-padding-md)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--foreground)",
          }}
        >
          Staff Attendance
        </h3>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Today
        </p>
      </div>
      <div style={{ padding: "var(--card-padding-md)" }}>
        <div className="flex flex-col gap-3">
          {staff.map((k, i) => (
            <div key={i} className="flex items-center gap-3">
              {k.img ? (
                <Image
                  src={k.img}
                  alt={k.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-md border border-border object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-surface"
                  style={{ backgroundColor: k.color }}
                >
                  {k.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-xs font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {k.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {k.attand_in !== "—"
                    ? `${k.attand_in} – ${k.attand_out}`
                    : "Not clocked in"}
                </div>
              </div>
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase"
                style={{
                  fontSize: "var(--text-xs)",
                  backgroundColor:
                    k.status === "H"
                      ? "color-mix(in oklch, var(--success) 15%, transparent)"
                      : "color-mix(in oklch, var(--danger) 15%, transparent)",
                  color: k.status === "H" ? "var(--success)" : "var(--danger)",
                }}
              >
                {k.status === "H" ? "Hadir" : "Absen"}
              </span>
            </div>
          ))}
        </div>
        <div
          className="mt-4 border-t border-border pt-3"
          style={{ borderColor: "var(--separator)" }}
        >
          <div className="flex justify-between text-xs font-medium">
            <span style={{ color: "var(--success)" }}>{hadir} hadir</span>
            <span style={{ color: "var(--danger)" }}>{absen} absen</span>
            <span style={{ color: "var(--muted)" }}>{staff.length} total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Bookings Table ────────────────────────────────────────────────────
function RecentBookingsTable({ bookings }: { bookings: BookingItem[] }) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--card-padding-md)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Booking Terbaru
          </h3>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            30 Hari Terakhir
          </p>
        </div>
        <button
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-secondary)",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          View All
        </button>
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            minWidth: "600px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "var(--surface-secondary)" }}>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Customer
              </th>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Package
              </th>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Duration
              </th>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Dates
              </th>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "right",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Amount
              </th>
              <th
                style={{
                  padding: "var(--table-cell-py) var(--table-cell-px)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "right",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, i) => {
              const isBundle =
                booking.booking_bundle_promos &&
                booking.booking_bundle_promos.length > 0;
              const serviceName =
                !isBundle &&
                booking.service_variants &&
                booking.service_variants.length > 0
                  ? booking.service_variants.map((item) => item.name).join(", ")
                  : null;
              return (
                <tr
                  key={booking.id ?? i}
                  style={{ borderBottom: "1px solid var(--separator)" }}
                >
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {booking.customer_name}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--muted)",
                        }}
                      >
                        {booking.customer_phone}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div className="flex flex-col">
                      <span>
                        {isBundle
                          ? booking.booking_bundle_promos?.[0]?.bundle_name
                          : (serviceName ?? "Spa Service")}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--muted)",
                        }}
                      >
                        by{" "}
                        {booking.therapists
                          ?.map((t) => (typeof t === "string" ? t : t.name))
                          .join(", ") || "—"}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    {booking.duration_minutes
                      ? `${booking.duration_minutes} mins`
                      : "-"}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    {formatWallClockDate(booking.schedule_date)}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                  >
                    {IDR(Number(booking.total_amount ?? 0))}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                  >
                    <StatusBadge
                      status={
                        booking.status ?? booking.payment_status ?? "Pending"
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardOverviewPage() {
  const tz = getLocalTimeZone();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(today(tz)),
    end: endOfMonth(today(tz)),
  });

  const dateParams = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      start_date: formatApiDate(dateRange.start),
      end_date: formatApiDate(dateRange.end),
    };
  }, [dateRange]);

  const todayKey = formatApiDate(today(tz));

  const { data: totalBookingsResponse } = useApiFetch<BookingSummaryResponse>(
    [
      "total_bookings",
      dateParams?.start_date ?? "",
      dateParams?.end_date ?? "",
    ],
    "/booking/total-booking",
    dateParams,
  );

  const { data: totalCustomersResponse } = useApiFetch<
    SingleApiResponse<TotalCustomerResponse>
  >(
    [
      "total_customers",
      dateParams?.start_date ?? "",
      dateParams?.end_date ?? "",
    ],
    "/customer/total-customers",
    dateParams,
  );

  const { data: totalRevenueResponse } = useApiFetch<
    SingleApiResponse<RevenueReportResponse>
  >(
    ["total_revenue", dateParams?.start_date ?? "", dateParams?.end_date ?? ""],
    "/payment/reports/revenue",
    dateParams,
  );

  const { data: topServicesResponse } = useApiFetch<
    SingleApiResponse<TopServicesResponse>
  >(
    ["top_services", dateParams?.start_date ?? "", dateParams?.end_date ?? ""],
    "/payment/reports/top-services",
    dateParams,
  );

  const { data: recentBookingsResponse } = useApiFetch<{ data: BookingItem[] }>(
    [
      "recent_bookings",
      dateParams?.start_date ?? "",
      dateParams?.end_date ?? "",
    ],
    "/master/bookings",
    { ...dateParams, per_page: 6, limit: 5 },
    undefined,
    {
      refetchInterval: 10000, // 10 detik
    },
  );

  const { data: attendanceResponse } = useApiFetch<{
    data: AttendanceRecord[];
  }>(["attendance_today", todayKey], "/master/attendances", {
    start_date: todayKey,
    end_date: todayKey,
  });

  const { data: staffsResponse } = useApiFetch<{ data: StaffRecord[] }>(
    ["staffs"],
    "/master/staffs",
  );

  const { data: weeklyBookingResponse } = useApiFetch<{
    data: PaginatedApiResponse<{ dow: number; count: number }[]>;
  }>(["weekly-booking"], "/booking/weekly-booking");

  const stats = useMemo(() => {
    const comparedDays = Math.round(
      totalBookingsResponse?.meta?.compared_days ??
        totalRevenueResponse?.data?.meta?.compared_days ??
        30,
    );
    const subLabel = `${comparedDays} Hari`;
    return [
      {
        label: "Total Booking",
        value: formatNumber(
          totalBookingsResponse?.data?.total_bookings?.value ?? 0,
        ),
        trend: `${Math.abs(totalBookingsResponse?.data?.total_bookings?.trend ?? 0)}%`,
        trendDirection:
          (totalBookingsResponse?.data?.total_bookings?.trend ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${subLabel}`,
      },
      {
        label: "Pelanggan Baru",
        value: formatNumber(totalCustomersResponse?.data?.value ?? 0),
        trend: `${Math.abs(totalCustomersResponse?.data?.trend ?? 0)}%`,
        trendDirection:
          (totalCustomersResponse?.data?.trend ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${subLabel}`,
      },
      {
        label: "Pendapatan",
        value: IDR(totalRevenueResponse?.data?.summary?.total_revenue ?? 0),
        trend: `${Math.abs(totalRevenueResponse?.data?.summary?.trend ?? 0)}%`,
        trendDirection:
          (totalRevenueResponse?.data?.summary?.trend ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${subLabel}`,
      },
    ];
  }, [totalBookingsResponse, totalCustomersResponse, totalRevenueResponse]);

  const rawStaffs = useMemo(() => staffsResponse?.data ?? [], [staffsResponse]);
  const rawAttendances = useMemo(
    () => attendanceResponse?.data ?? [],
    [attendanceResponse],
  );

  const attendanceMap = useMemo(() => {
    const map: Record<number, AttendanceRecord> = {};
    rawAttendances.forEach((att) => {
      map[att.bms_ms_staff_id] = att;
    });
    return map;
  }, [rawAttendances]);

  const staffAttendance = useMemo(
    () =>
      rawStaffs.slice(0, 5).map((staff) => {
        const attendance = attendanceMap[staff.id];
        const isPresent = Boolean(
          attendance?.clock_in || attendance?.clock_out,
        );
        return {
          name: `${staff.first_name} ${staff.last_name ?? ""}`.trim(),
          attand_in: attendance?.clock_in
            ? new Date(attendance.clock_in).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          attand_out: attendance?.clock_out
            ? new Date(attendance.clock_out).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          status: isPresent ? "H" : "A",
          img: undefined,
          color: isPresent ? "var(--accent)" : "var(--danger)",
        };
      }),
    [rawStaffs, attendanceMap],
  );

  const hadir = staffAttendance.filter((k) => k.status === "H").length;
  const absen = staffAttendance.filter((k) => k.status === "A").length;

  const [preset, setPreset] = useState<string>("30d");
  const [calOpen, setCalOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: "dashboard_mahalu_spa",
    pageStyle: `
      @page { size: A4 landscape; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const formatDate = (d: DateValue) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(d.year, d.month - 1, d.day));

  const handlePresetChange = (val: string | number | null) => {
    if (!val || typeof val !== "string") return;
    setPreset(val);
    const end = today(tz);
    if (val === "7d") setDateRange({ start: end.subtract({ days: 6 }), end });
    if (val === "30d") setDateRange({ start: end.subtract({ days: 29 }), end });
    if (val === "90d") setDateRange({ start: end.subtract({ days: 89 }), end });
    if (val === "mtd") setDateRange({ start: startOfMonth(end), end });
    if (val === "ytd")
      setDateRange({ start: end.set({ month: 1, day: 1 }), end });
  };

  console.log(
    "🚀 ~ DashboardOverviewPage ~ weeklyBookingResponse:",
    weeklyBookingResponse,
  );
  return (
    <div
      ref={contentRef}
      className="relative bg-background print:w-[1280px]"
      style={{
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        minHeight: "100%",
      }}
    >
      {/* Background pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)"/%3E%3C/svg%3E')`,
        }}
      />

      {/* Page Header */}
      <div
        className="flex flex-wrap items-center justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "bold",
              color: "var(--foreground)",
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Overview & analytics
          </p>
        </div>

        <div
          className="flex flex-wrap items-center"
          style={{ gap: "var(--space-2)" }}
        >
          {/* Date Range Selector */}
          <div
            className="flex items-center overflow-hidden divide-x divide-border bg-surface shadow-sm max-sm:w-full"
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
            }}
          >
            <Popover isOpen={calOpen} onOpenChange={setCalOpen}>
              <Popover.Trigger>
                <button
                  className="flex items-center font-medium transition-colors hover:bg-surface-secondary max-sm:w-full"
                  style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: "var(--text-xs)",
                    color: "var(--foreground)",
                  }}
                >
                  <CalendarIcon
                    style={{
                      width: "var(--icon-sm)",
                      height: "var(--icon-sm)",
                      color: "var(--muted)",
                    }}
                  />
                  {dateRange
                    ? `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`
                    : "Select dates"}
                </button>
              </Popover.Trigger>
              <Popover.Content
                className="bg-surface shadow-xl"
                style={{
                  borderRadius: "var(--radius-2xl)",
                  border: "1px solid var(--border)",
                  padding: "var(--space-3)",
                }}
              >
                <Popover.Dialog>
                  <RangeCalendar
                    aria-label="Date range"
                    value={dateRange}
                    onChange={(v) => {
                      setDateRange(v);
                      setCalOpen(false);
                    }}
                    firstDayOfWeek="mon"
                  >
                    <RangeCalendar.Header>
                      <RangeCalendar.NavButton slot="previous" />
                      <RangeCalendar.Heading />
                      <RangeCalendar.NavButton slot="next" />
                    </RangeCalendar.Header>
                    <RangeCalendar.Grid>
                      <RangeCalendar.GridHeader>
                        {(day) => (
                          <RangeCalendar.HeaderCell>
                            {day}
                          </RangeCalendar.HeaderCell>
                        )}
                      </RangeCalendar.GridHeader>
                      <RangeCalendar.GridBody>
                        {(date) => <RangeCalendar.Cell date={date} />}
                      </RangeCalendar.GridBody>
                    </RangeCalendar.Grid>
                  </RangeCalendar>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>

            <Select
              value={preset}
              onChange={handlePresetChange}
              className="max-sm:w-[50%]"
            >
              <Select.Trigger
                className="flex items-center font-medium transition-colors hover:bg-surface-secondary max-sm:w-full"
                style={{
                  gap: "var(--space-1)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--text-xs)",
                  backgroundColor: "transparent",
                  border: "none",
                }}
              >
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PRESETS.map((p) => (
                    <ListBox.Item key={p.id} id={p.id} textValue={p.label}>
                      {p.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <button
            className="flex items-center font-medium shadow-sm transition-colors hover:bg-surface-secondary print:hidden"
            style={{
              gap: "var(--space-2)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-xs)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            <SquaresFour
              style={{
                width: "var(--icon-sm)",
                height: "var(--icon-sm)",
                color: "var(--muted)",
              }}
            />
            Add Widget
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center font-semibold shadow-sm transition-opacity hover:opacity-90 print:hidden"
            style={{
              gap: "var(--space-2)",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--accent)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-xs)",
              color: "var(--accent-foreground)",
              cursor: "pointer",
              border: "none",
            }}
          >
            <Printer
              style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
              weight="bold"
            />
            Export
          </button>
        </div>
      </div>

      {/* Main Layout — Analytics Grid */}
      <div
        className="grid"
        style={{
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(12, 1fr)",
        }}
      >
        {/* Stat Cards Row — 4 cards equal width */}
        <div
          className="flex"
          style={{
            gap: "var(--space-4)",
            gridColumn: "span 12",
            flexWrap: "wrap",
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex"
              style={{ flex: 1, minWidth: "200px" }}
            >
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* Chart Widget — span 7 */}
        <div className="col-span-12 lg:col-span-7 min-w-0">
          <RevenueChart data={totalRevenueResponse?.data?.chart_data ?? []} />
        </div>

        {/* Top Destinations — span 5 */}
        <div className="col-span-12 lg:col-span-5 min-w-0">
          <TopDestinations items={topServicesResponse?.data ?? []} />
        </div>

        {/* Staff Attendance — span 4 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 min-w-0">
          <StaffAttendanceWidget
            staff={staffAttendance}
            hadir={hadir}
            absen={absen}
          />
        </div>

        {/* Weekly Booking — span 4 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 min-w-0">
          <WeeklyBookingCard
            data={weeklyBookingResponse?.data?.data ?? []}
            prevWeekTotal={
              weeklyBookingResponse?.data?.meta?.total_prev_week ?? 0
            }
          />
        </div>

        {/* Activity Feed — span 4 */}
        <div className="col-span-12 md:col-span-12 lg:col-span-4 min-w-0">
          <ActivityFeed items={recentBookingsResponse?.data ?? []} />
        </div>

        {/* Recent Bookings Table — span 12 */}
        <div className="col-span-12 min-w-0">
          <RecentBookingsTable bookings={recentBookingsResponse?.data ?? []} />
        </div>
      </div>
    </div>
  );
}
