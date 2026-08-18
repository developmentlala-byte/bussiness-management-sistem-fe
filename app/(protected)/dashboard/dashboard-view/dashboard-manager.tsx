"use client";

import { cn } from "@heroui/styles";
import {
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  SquaresFour,
  Calendar,
} from "@phosphor-icons/react";

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
import { IDR } from "@/app/libs/idr";
import { formatNumber } from "@/app/libs/formatNumber";
import { formatWallClockDate } from "@/app/libs/date-format";
import { resolvePhotoUrl } from "@/app/libs/resolve-url";

import { useApiFetch } from "@/app/libs/use-http";
import TargetOmzetCard from "../components/targetOmzetCard";
import RevenueChart from "../components/dashboardRevenueChart";
import TopDestinations from "../components/dashboardTopDestinations";
import WeeklyBookingCard from "../components/dashboardWeeklyBooking";
import { RecentBookingsTable } from "../components/RecentBookingsTable";
import { StaffAttendanceWidget } from "../components/StaffAttendanceWidget";
import { ActivityFeed } from "../components/ActivityFeed";

type DateRange = { start: DateValue; end: DateValue } | null;

type BookingSummaryResponse = {
  data: {
    total_bookings: {
      value: number;
      trend: { value: number; is_new: boolean };
    };
    total_service_items: {
      value: number;
      trend: { value: number; is_new: boolean };
    };
    total_paid_bookings: {
      value: number;
      trend: { value: number; is_new: boolean };
    };
    total_unpaid_bookings: {
      value: number;
      trend: { value: number; is_new: boolean };
    };
    total_cancelled_bookings: {
      value: number;
      trend: { value: number; is_new: boolean };
    };
  };
  meta: { compared_days: number };
};

type TotalCustomerResponse = {
  value: number;
  trend: {
    value: number;
    is_new: boolean;
  };
};

type RevenueReportResponse = {
  summary: {
    total_revenue: number;
    difference: number;
    trend: {
      value: number;
      is_new: boolean;
    };
  };
  chart_data: Array<{
    date: string;
    total_revenue: number | string;
    is_today?: boolean;
  }>;
  meta: {
    compared_days: number;
    is_partial_period?: boolean;
  };
};

type TopServicesResponse = Array<{
  label: string;
  quantity: number;
  revenue: number;
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

type CompanyTargetResponse = {
  target_amount: number | null;
  note: string | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");
const formatApiDate = (date: DateValue) =>
  `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;

const PRESETS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "Month to date" },
  { id: "ytd", label: "Year to date" },
];

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
      className="flex flex-col justify-between min-w-0 sas"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding-md)",
        flex: 1,
      }}
    >
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

      {trend && (
        <div
          className="flex items-center flex-wrap"
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

export default function DashboardManager() {
  const tz = getLocalTimeZone();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(today(tz)), // 1 Agustus 2026
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
    { refetchInterval: 10000 },
  );

  const { data: attendanceResponse } = useApiFetch<{
    data: AttendanceRecord[];
  }>(["attendance_today", todayKey], "/master/attendances", {
    start_date: todayKey,
    end_date: todayKey,
  });

  const { data: staffsResponse } = useApiFetch<{ data: any[] }>(
    ["staffs", dateParams?.start_date, dateParams?.end_date],
    "/master/staffs",
    dateParams,
  );

  const { data: weeklyBookingResponse } = useApiFetch<{
    data: PaginatedApiResponse<{ dow: number; count: number }[]>;
  }>(["weekly-booking"], "/booking/weekly-booking");

  const stats = useMemo(() => {
    const bookingDays = Math.round(
      totalBookingsResponse?.data?.meta?.compared_days ?? 30,
    );

    // const customerDays = Math.round(
    //   totalCustomersResponse?.data?.meta?.compared_days ?? 30,
    // );

    const revenueDays = Math.round(
      totalRevenueResponse?.data?.meta?.compared_days ?? 30,
    );
    const isPartialRevenuePeriod =
      totalRevenueResponse?.data?.meta?.is_partial_period ?? false;

    return [
      {
        label: "Total Booking",
        value: formatNumber(
          totalBookingsResponse?.data?.total_bookings?.value ?? 0,
        ),
        trend: `${Math.abs(totalBookingsResponse?.data?.total_bookings?.trend.value ?? 0)}%`,
        trendDirection:
          (totalBookingsResponse?.data?.total_bookings?.trend.value ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${bookingDays} Hari`,
      },
      {
        label: "Pelanggan Baru",
        value: formatNumber(totalCustomersResponse?.data?.value ?? 0),
        trend: `${Math.abs(totalCustomersResponse?.data?.trend.value ?? 0)}%`,
        trendDirection:
          (totalCustomersResponse?.data?.trend.value ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${bookingDays} Hari`,
      },
      {
        label: "Layanan dilakukan",
        value: formatNumber(
          totalBookingsResponse?.data?.total_service_items?.value ?? 0,
        ),
        trend: `${Math.abs(totalBookingsResponse?.data?.total_service_items?.trend.value ?? 0)}%`,
        trendDirection:
          (totalBookingsResponse?.data?.total_service_items?.trend.value ??
            0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${bookingDays} Hari`,
      },
      {
        label: "Pendapatan",
        value: IDR(totalRevenueResponse?.data?.summary?.total_revenue ?? 0),
        trend: `${Math.abs(totalRevenueResponse?.data?.summary?.trend.value ?? 0)}%`,
        trendDirection:
          (totalRevenueResponse?.data?.summary?.trend.value ?? 0) >= 0
            ? ("up" as const)
            : ("down" as const),
        context: `vs last ${revenueDays} Hari${isPartialRevenuePeriod ? " (bulan berjalan)" : ""}`,
      },
    ];
  }, [totalBookingsResponse, totalCustomersResponse, totalRevenueResponse]);

  const rawStaffs = useMemo(() => {
    const list = staffsResponse?.data ?? [];
    return [...list].sort(
      (a, b) =>
        (b.financial_summary?.revenueThisMonth ?? 0) -
        (a.financial_summary?.revenueThisMonth ?? 0),
    );
  }, [staffsResponse]);
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
      rawStaffs.map((staff) => {
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
          img: resolvePhotoUrl(staff.avatar_path) ?? undefined,
          color: isPresent ? "var(--accent)" : "var(--danger)",
        };
      }),
    [rawStaffs, attendanceMap],
  );

  const hadir = staffAttendance.filter((k) => k.status === "H").length;
  const absen = staffAttendance.filter((k) => k.status === "A").length;

  const [preset, setPreset] = useState<string>("mtd");
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
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)"/%3E%3C/svg%3E')`,
        }}
      />

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

      <div
        className="grid"
        style={{
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(12, 1fr)",
        }}
      >
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

        <div className="col-span-12 lg:col-span-7 min-w-0">
          <RevenueChart data={totalRevenueResponse?.data?.chart_data ?? []} />
        </div>

        <div className="col-span-12 lg:col-span-5 min-w-0">
          <TopDestinations
            items={topServicesResponse?.data ?? []}
            startDate={dateParams?.start_date}
            endDate={dateParams?.end_date}
          />
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4 min-w-0">
          <StaffAttendanceWidget
            staff={staffAttendance}
            hadir={hadir}
            absen={absen}
          />
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4 min-w-0">
          <WeeklyBookingCard
            data={weeklyBookingResponse?.data?.data ?? []}
            prevWeekTotal={
              weeklyBookingResponse?.data?.meta?.total_prev_week ?? 0
            }
          />
        </div>

        <div className="col-span-12 md:col-span-12 lg:col-span-4 min-w-0">
          <ActivityFeed items={recentBookingsResponse?.data ?? []} />
        </div>

        <div className="col-span-12 min-w-0">
          <RecentBookingsTable bookings={recentBookingsResponse?.data ?? []} />
        </div>
      </div>
    </div>
  );
}
