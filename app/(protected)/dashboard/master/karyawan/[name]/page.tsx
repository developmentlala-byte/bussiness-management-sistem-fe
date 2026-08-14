"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApiFetch } from "@/app/libs/use-http";
import {
  today,
  getLocalTimeZone,
  startOfMonth,
  endOfMonth,
  CalendarDate,
} from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import {} from "@heroui/react";
import {
  CalendarBlank as CalendarIcon,
  CaretLeft,
} from "@phosphor-icons/react";
import { EditStaffModal } from "../modal/edit-staff-modal";
import { EditSalaryModal } from "../modal/edit-salary-modal";
import { CreateWarningModal } from "../modal/create-warning-modal";
import { CreateContractModal } from "../modal/create-contract-modal";
import { resolvePhotoUrl } from "@/app/libs/resolve-url";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Separator,
  Table,
  Label,
  Accordion,
  RangeCalendar,
  Select,
  ListBox,
  Dropdown,
} from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CaretRight,
  ClockCounterClockwise,
  FileText,
  Lock,
  Paperclip,
  Sparkle,
  Star,
  Trophy,
  UploadSimple,
  Warning,
  UserGear,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const CURRENT_USER_ROLE: "owner" | "hr" | "staff" = "owner"; // dari session/auth lo

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const tanggalPanjang = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const tanggalPendek = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name: string) => {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
};

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<
  string,
  { color: "success" | "warning" | "danger" | "default"; label: string }
> = {
  selesai: { color: "success", label: "Selesai" },
  completed: { color: "success", label: "Selesai" },
  dibatalkan: { color: "default", label: "Dibatalkan" },
  cancelled: { color: "default", label: "Dibatalkan" },
  berlangsung: { color: "warning", label: "Berlangsung" },
  confirmed: { color: "warning", label: "Dikonfirmasi" },
  pending: { color: "default", label: "Menunggu" },
  terlambat: { color: "warning", label: "Terlambat" },
  absen: { color: "danger", label: "Absen" },
  aktif: { color: "success", label: "Aktif" },
  active: { color: "success", label: "Aktif" },
  nonaktif: { color: "default", label: "Nonaktif" },
  inactive: { color: "default", label: "Nonaktif" },
  cuti: { color: "warning", label: "Cuti" },
  on_leave: { color: "warning", label: "Cuti" },
  sakit: { color: "danger", label: "Sakit" },
  sick: { color: "danger", label: "Sakit" },
  hadir: { color: "success", label: "Hadir" },
  libur: { color: "default", label: "Libur" },
  terminated: { color: "danger", label: "Berhenti" },
};

function StatusChip({ status }: { status: string }) {
  const entry = STATUS_MAP[status?.toLowerCase()] ?? {
    color: "default",
    label: status,
  };
  return (
    <Chip color={entry.color} variant="soft" size="sm">
      {entry.label}
    </Chip>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sublabel: string;
  tone?: "default" | "accent" | "danger";
}) {
  const toneClasses =
    tone === "accent"
      ? "bg-accent/10 text-accent"
      : tone === "danger"
        ? "bg-danger/10 text-danger"
        : "bg-muted/10 text-muted";

  return (
    <Card className="shadow-none border border-border">
      <Card.Content className="gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}
          >
            {icon}
          </span>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none text-foreground">
            {value}
          </p>
          <p className="mt-1.5 text-xs text-muted">{sublabel}</p>
        </div>
      </Card.Content>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName = "p-0",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={`shadow-none border border-border ${className ?? ""}`}>
      <Card.Header className="flex-row items-center justify-between gap-3 px-5 py-4">
        <div>
          <Card.Title className="text-base font-semibold">{title}</Card.Title>
          {description && (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          )}
        </div>
        {action}
      </Card.Header>
      <Separator />
      <Card.Content className={bodyClassName}>{children}</Card.Content>
    </Card>
  );
}

function TrendArrow({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-success" : "text-danger"
      }`}
    >
      {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value)}%
    </span>
  );
}

const STATUS_RING: Record<string, string> = {
  aktif: "ring-success/30",
  active: "ring-success/30",
  nonaktif: "ring-border",
  inactive: "ring-border",
  cuti: "ring-warning/30",
  on_leave: "ring-warning/30",
  sakit: "ring-danger/30",
  sick: "ring-danger/30",
  terminated: "ring-danger/30",
};

// Timeline — dipake buat Riwayat Peringatan & Kontrak Kerja, karena
// keduanya historikal (bisa lebih dari satu entri sepanjang masa kerja).
type TimelineTone = "success" | "warning" | "danger" | "default";

const TIMELINE_DOT_TONE: Record<TimelineTone, string> = {
  success: "border-success bg-success",
  warning: "border-warning bg-warning",
  danger: "border-danger bg-danger",
  default: "border-border bg-muted",
};

function Timeline({
  items,
}: {
  items: { id: string; tone?: TimelineTone; content: React.ReactNode }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={item.id} className="relative flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                  TIMELINE_DOT_TONE[item.tone ?? "default"]
                }`}
              />
              {!isLast && (
                <span className="w-px flex-1 bg-border" aria-hidden />
              )}
            </div>
            <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-4"}`}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type DateRange = { start: DateValue; end: DateValue } | null;

export default function StaffDetailPage() {
  const params = useParams();
  const name = params.name as string;

  const tz = getLocalTimeZone();
  const currentYear = today(tz).year;
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new CalendarDate(currentYear, 1, 1),
    end: new CalendarDate(currentYear, 12, 31),
  });

  const onShiftPeriod = (dir: number) => {
    if (!dateRange) return;
    setDateRange({
      start: dateRange.start.add({ years: dir }),
      end: dateRange.end.add({ years: dir }),
    });
  };

  const dateParams = useMemo(() => {
    if (!dateRange) return undefined;
    const pad2 = (value: number) => String(value).padStart(2, "0");
    const formatApiDate = (date: DateValue) =>
      `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
    return {
      start_date: formatApiDate(dateRange.start),
      end_date: formatApiDate(dateRange.end),
    };
  }, [dateRange]);

  // Mengambil data staf berdasarkan first_name
  const { data: staffList, isLoading: isStaffLoading } = useApiFetch<any>(
    ["staff-detail", name, dateParams?.start_date, dateParams?.end_date],
    "/master/staffs",
    { "filter[first_name]": name, ...dateParams },
  );

  const staffData = staffList?.data?.[0];
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showAllMastery, setShowAllMastery] = useState(false);

  // Mengambil data peringatan asli
  const { data: warningsResponse } = useApiFetch<any>(
    ["staff-warnings", staffData?.id],
    `/master/staffs/${staffData?.id}/warnings`,
    undefined,
    !!staffData?.id,
  );

  const realWarnings = warningsResponse?.data || [];

  // Mengambil data kontrak asli
  const { data: contractsResponse } = useApiFetch<any>(
    ["staff-contracts", staffData?.id],
    `/master/staffs/${staffData?.id}/contracts`,
    undefined,
    !!staffData?.id,
  );

  const currentContract = contractsResponse?.data?.current;
  const contractHistory = contractsResponse?.data?.history || [];

  // Hitung peringatan aktif (1 tahun terakhir)
  const activeWarningsCount = useMemo(() => {
    if (!warningsResponse?.data) return 0;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return warningsResponse.data.filter(
      (w: any) => new Date(w.date) >= oneYearAgo,
    ).length;
  }, [warningsResponse?.data]);

  // const { data: staff, isLoading } = useApiFetch<StaffDetail>(`/staff/${params.id}`);

  const [bookingRange, setBookingRange] = useState("all-time");
  const [bookingStatus, setBookingStatus] = useState("semua");
  const [attendanceMonth, setAttendanceMonth] = useState(
    new Date().toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
  );

  // Reset "Lihat Semua" saat filter berubah
  useEffect(() => {
    setShowAllBookings(false);
  }, [bookingRange, bookingStatus]);

  useEffect(() => {
    setShowAllAttendance(false);
  }, [attendanceMonth]);

  const canSeeFinancials =
    CURRENT_USER_ROLE === "owner" || CURRENT_USER_ROLE === "hr";

  const filteredBookings = useMemo(() => {
    let history = staffData?.booking_history || [];

    // Filter by Range
    if (bookingRange === "last-30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      history = history.filter((b: any) => new Date(b.date) >= thirtyDaysAgo);
    } else if (bookingRange === "last-90") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      history = history.filter((b: any) => new Date(b.date) >= ninetyDaysAgo);
    } else if (bookingRange === "this-year") {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      history = history.filter((b: any) => new Date(b.date) >= startOfYear);
    }

    // Filter by Status
    if (bookingStatus !== "semua") {
      history = history.filter(
        (b: any) => b.status?.toLowerCase() === bookingStatus.toLowerCase(),
      );
    }

    return history;
  }, [staffData?.booking_history, bookingStatus, bookingRange]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <Card className="shadow-none border border-border">
        <Card.Content className="flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <Avatar
              size="lg"
              className={`ring-4 ${STATUS_RING[staffData?.status || ""] ?? "ring-border"}`}
            >
              {staffData?.avatar_path && (
                <Avatar.Image
                  src={resolvePhotoUrl(staffData?.avatar_path)}
                  alt={staffData?.first_name || "staff"}
                />
              )}
              <Avatar.Fallback className="bg-accent/10 font-semibold text-accent">
                {initials(
                  staffData
                    ? `${staffData.first_name} ${staffData.last_name || ""}`
                    : "staff",
                )}
              </Avatar.Fallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">
                  {staffData
                    ? `${staffData.first_name} ${staffData.last_name || ""}`
                    : "staff"}
                </h1>
                <StatusChip status={staffData?.status || ""} />
              </div>
              <p className="text-sm text-muted">
                {(staffData?.job_title || "").toUpperCase()} &middot;{" "}
                {staffData?.employee_code || ""} &middot; Bergabung sejak{" "}
                {tanggalPanjang(staffData?.join_date || null)}
              </p>
              <p className="text-sm text-muted">
                {staffData?.phone_number || ""} &middot;{" "}
                {staffData?.email || ""}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {/* Date Range Navigator */}
            <div className="flex h-10 items-center overflow-visible rounded-full border border-border shadow-sm">
              <button
                onClick={() => onShiftPeriod(-1)}
                className="flex h-full w-10 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
                aria-label="Periode sebelumnya"
              >
                <CaretLeft weight="bold" className="h-4 w-4" />
              </button>

              <Dropdown>
                <Dropdown.Trigger>
                  <div className="flex h-full cursor-pointer items-center gap-2 px-3 text-[13px] font-bold text-foreground outline-none transition-colors hover:bg-surface-secondary/50 sm:text-sm">
                    <CalendarIcon
                      weight="bold"
                      className="h-4 w-4 shrink-0 text-muted"
                    />
                    <span className="whitespace-nowrap">
                      {dateRange ? (
                        <>
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(
                            new Date(
                              dateRange.start.year,
                              dateRange.start.month - 1,
                              dateRange.start.day,
                            ),
                          )}
                          {" – "}
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(
                            new Date(
                              dateRange.end.year,
                              dateRange.end.month - 1,
                              dateRange.end.day,
                            ),
                          )}
                        </>
                      ) : (
                        "Pilih Tanggal"
                      )}
                    </span>
                  </div>
                </Dropdown.Trigger>
                <Dropdown.Popover
                  placement="bottom start"
                  className="z-[100] w-[calc(100vw-2rem)] min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl sm:w-auto"
                >
                  <RangeCalendar
                    aria-label="Pilih rentang tanggal"
                    value={dateRange}
                    onChange={(val) => setDateRange(val as DateRange)}
                    className="w-full"
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
                </Dropdown.Popover>
              </Dropdown>

              <button
                onClick={() => onShiftPeriod(1)}
                className="flex h-full w-10 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
                aria-label="Periode berikutnya"
              >
                <CaretRight weight="bold" className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="outline"
              className="flex-1 border-warning/30 text-warning hover:bg-warning/10 sm:flex-none"
              onPress={() => setIsWarningModalOpen(true)}
            >
              <Warning size={16} />
              Peringatan
            </Button>
            <Button
              variant="primary"
              className="flex-1 sm:flex-none"
              onPress={() => setIsEditModalOpen(true)}
            >
              Edit Profil
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          icon={<FileText size={16} weight="fill" />}
          label="Total Booking"
          value={staffData?.booking_stats?.total_bookings ?? 0}
          sublabel="Nota transaksi unik"
        />
        <StatCard
          icon={<Trophy size={16} weight="fill" />}
          label="Total Item Layanan"
          value={staffData?.booking_stats?.total_services ?? 0}
          sublabel="Assignment layanan (mslh multi-therapist)"
          tone="accent"
        />
        <StatCard
          icon={<ClockCounterClockwise size={16} weight="fill" />}
          label="Total Jam Kerja"
          value={`${staffData?.booking_stats?.total_hours ?? 0}j`}
          sublabel="Handle layanan"
          tone="accent"
        />
        <StatCard
          icon={<Sparkle size={16} weight="fill" />}
          label="Jenis Service Dikuasai"
          value={staffData?.capabilities_summary?.bisa ?? 0}
          sublabel={`dari ${staffData?.capabilities_summary?.total_variants ?? 0} service aktif`}
        />
        <StatCard
          icon={<FileText size={16} weight="fill" />}
          label="Status Kontrak"
          value={currentContract ? "Aktif" : "Tidak Ada"}
          sublabel={
            currentContract
              ? `Berakhir ${tanggalPendek(currentContract.endDate)}`
              : "Belum ada kontrak"
          }
          tone={currentContract ? "accent" : "default"}
        />
        <StatCard
          icon={<Warning size={16} weight="fill" />}
          label="Peringatan Aktif"
          value={activeWarningsCount}
          sublabel="1 tahun terakhir"
          tone={activeWarningsCount > 0 ? "danger" : "default"}
        />
      </div>

      {/* Main 2-column layout: konten utama (kiri) + sidebar administratif (kanan) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ---- Kolom kiri (2/3): aktivitas & kinerja ---- */}
        <div className="space-y-5 lg:col-span-2">
          <Accordion
            variant="surface"
            className="bg-transparent px-0"
            allowsMultipleExpanded
          >
            {/* Service yang Dikuasai */}
            <Card className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-none">
              <Card.Header className="flex-row items-center justify-between gap-3 p-2">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground">
                    Service yang Dikuasai
                  </span>
                  <span className="text-xs text-muted">
                    Statistik performa layanan yang dikerjakan oleh staf ini
                  </span>
                </div>
              </Card.Header>
              <Separator />
              <Card.Content className="p-0">
                <Table variant="secondary" className="border-none shadow-none">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Service yang dikuasai">
                      <Table.Header>
                        <Table.Column id="name" isRowHeader>
                          Nama Service
                        </Table.Column>
                        <Table.Column id="category">Kategori</Table.Column>
                        <Table.Column id="total_done">
                          Total Dikerjakan
                        </Table.Column>
                        <Table.Column id="hours">Jam Kerja</Table.Column>
                        <Table.Column id="revenue">Total Revenue</Table.Column>
                        <Table.Column id="last_done">
                          Terakhir Dikerjakan
                        </Table.Column>
                      </Table.Header>
                      <Table.Body
                        items={
                          showAllMastery
                            ? (staffData?.service_mastery_stats || []).sort(
                                (a: any, b: any) =>
                                  b.totalDikerjakan - a.totalDikerjakan,
                              )
                            : (staffData?.service_mastery_stats || [])
                                .sort(
                                  (a: any, b: any) =>
                                    b.totalDikerjakan - a.totalDikerjakan,
                                )
                                .slice(0, 5)
                        }
                        renderEmptyState={() => (
                          <p className="py-8 text-center text-sm text-muted">
                            Belum ada layanan yang dikerjakan.
                          </p>
                        )}
                      >
                        {(service: any) => (
                          <Table.Row id={service.id}>
                            <Table.Cell className="font-medium text-foreground">
                              {service.name}
                            </Table.Cell>
                            <Table.Cell>{service.category}</Table.Cell>
                            <Table.Cell>{service.totalDikerjakan}x</Table.Cell>
                            <Table.Cell>{service.totalJam}j</Table.Cell>
                            <Table.Cell className="font-semibold text-success">
                              {rupiah(service.totalRevenue)}
                            </Table.Cell>
                            <Table.Cell>
                              {service.terakhirDikerjakan
                                ? tanggalPendek(service.terakhirDikerjakan)
                                : "-"}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                {(staffData?.service_mastery_stats?.length ?? 0) > 5 && (
                  <div className="border-t border-border bg-surface-secondary/20 p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllMastery((v) => !v)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {showAllMastery
                        ? "Tampilkan lebih sedikit"
                        : `Lihat semua ${staffData.service_mastery_stats.length} layanan`}
                    </button>
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Riwayat Booking */}
            <Card className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-none">
              <Card.Header className="flex-row items-center justify-between gap-3 p-2">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground">
                    Riwayat Booking
                  </span>
                  <span className="text-xs text-muted">
                    Histori layanan yang ditangani staf ini
                  </span>
                </div>
                <div className="flex gap-2">
                  <Select
                    aria-label="Rentang tanggal"
                    selectedKey={bookingRange}
                    onSelectionChange={(k) => setBookingRange(String(k))}
                    className="w-[170px]"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="all-time" textValue="Semua Waktu">
                          Semua Waktu
                        </ListBox.Item>
                        <ListBox.Item id="this-year" textValue="Tahun Ini">
                          Tahun Ini
                        </ListBox.Item>
                        <ListBox.Item id="last-30" textValue="30 hari terakhir">
                          30 hari terakhir
                        </ListBox.Item>
                        <ListBox.Item id="last-90" textValue="90 hari terakhir">
                          90 hari terakhir
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    aria-label="Status"
                    selectedKey={bookingStatus}
                    onSelectionChange={(k) => setBookingStatus(String(k))}
                    className="w-[140px]"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="semua" textValue="Semua Status">
                          Semua Status
                        </ListBox.Item>
                        <ListBox.Item id="selesai" textValue="Selesai">
                          Selesai
                        </ListBox.Item>
                        <ListBox.Item id="berlangsung" textValue="Berlangsung">
                          Berlangsung
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Card.Header>
              <Separator />
              <Card.Content className="p-0">
                <Table variant="secondary" className="border-none shadow-none">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Riwayat booking">
                      <Table.Header>
                        <Table.Column id="date" isRowHeader>
                          Tanggal
                        </Table.Column>
                        <Table.Column id="customer">Customer</Table.Column>
                        <Table.Column id="service">Service</Table.Column>
                        <Table.Column id="status">Status</Table.Column>
                        <Table.Column id="value">Nilai Booking</Table.Column>
                      </Table.Header>
                      <Table.Body
                        items={
                          showAllBookings
                            ? filteredBookings
                            : filteredBookings.slice(0, 5)
                        }
                        renderEmptyState={() => (
                          <p className="py-8 text-center text-sm text-muted">
                            Tidak ada booking pada rentang ini.
                          </p>
                        )}
                      >
                        {(booking: any) => (
                          <Table.Row id={booking.id}>
                            <Table.Cell>
                              {tanggalPendek(booking.date)}
                            </Table.Cell>
                            <Table.Cell className="font-medium text-foreground">
                              {booking.customer}
                            </Table.Cell>
                            <Table.Cell>{booking.service}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={booking.status} />
                            </Table.Cell>
                            <Table.Cell>
                              {booking.value ? rupiah(booking.value) : "—"}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                {filteredBookings.length > 5 && (
                  <div className="border-t border-border bg-surface-secondary/20 p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllBookings((v) => !v)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {showAllBookings
                        ? "Tampilkan lebih sedikit"
                        : `Lihat semua ${filteredBookings.length} booking`}
                    </button>
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Kehadiran */}
            <Card className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-none">
              <Card.Header className="flex-row items-center justify-between gap-3 p-2">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground">
                    Kehadiran
                  </span>
                  <span className="text-xs text-muted">
                    Statistik dan riwayat absen staf
                  </span>
                </div>
                <Select
                  aria-label="Bulan"
                  selectedKey={attendanceMonth}
                  onSelectionChange={(k) => setAttendanceMonth(String(k))}
                  className="w-[150px]"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id={new Date().toLocaleDateString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                        textValue={new Date().toLocaleDateString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                      >
                        {new Date().toLocaleDateString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Card.Header>
              <Separator />
              <Card.Content className="p-0">
                <div className="grid grid-cols-2 gap-4 border-b border-border p-5 sm:grid-cols-5">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted">
                      Tingkat Kehadiran
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {staffData?.attendance_summary?.tingkatKehadiran ?? 0}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted">
                      Hadir
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {staffData?.attendance_summary?.hadir ?? 0} hari
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted">
                      Telat
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {staffData?.attendance_summary?.telat ?? 0} hari
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted">
                      Absen
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {staffData?.attendance_summary?.absen ?? 0} hari
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted">
                      Rata-rata Check-in
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {staffData?.attendance_summary?.rataRataCheckIn ??
                        "--:--"}
                    </p>
                  </div>
                </div>

                <Table variant="secondary" className="border-none shadow-none">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Riwayat kehadiran">
                      <Table.Header>
                        <Table.Column id="date" isRowHeader>
                          Tanggal
                        </Table.Column>
                        <Table.Column id="status">Status</Table.Column>
                        <Table.Column id="checkin">
                          Check-in / Check-out
                        </Table.Column>
                        <Table.Column id="note">Keterangan</Table.Column>
                      </Table.Header>
                      <Table.Body
                        items={
                          showAllAttendance
                            ? staffData?.attendance_summary?.records || []
                            : (
                                staffData?.attendance_summary?.records || []
                              ).slice(0, 5)
                        }
                        renderEmptyState={() => (
                          <p className="py-8 text-center text-sm text-muted">
                            Belum ada riwayat kehadiran.
                          </p>
                        )}
                      >
                        {(rec: any) => (
                          <Table.Row id={rec.date}>
                            <Table.Cell>{tanggalPendek(rec.date)}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={rec.status} />
                            </Table.Cell>
                            <Table.Cell>
                              {rec.checkIn && rec.checkOut
                                ? `${rec.checkIn} / ${rec.checkOut}`
                                : rec.checkIn
                                  ? `${rec.checkIn} / —`
                                  : "—"}
                            </Table.Cell>
                            <Table.Cell>
                              <span
                                className={`text-xs font-medium ${
                                  rec.isLate
                                    ? "text-danger"
                                    : rec.lateMinutes > 0 ||
                                        rec.earlyMinutes > 0
                                      ? "text-success"
                                      : "text-muted"
                                }`}
                              >
                                {rec.note || "—"}
                              </span>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                {(staffData?.attendance_summary?.records?.length ?? 0) > 5 && (
                  <div className="border-t border-border bg-surface-secondary/20 p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllAttendance((v) => !v)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {showAllAttendance
                        ? "Tampilkan lebih sedikit"
                        : `Lihat semua ${staffData.attendance_summary.records.length} riwayat`}
                    </button>
                  </div>
                )}
              </Card.Content>
            </Card>
          </Accordion>

          {/* Tren & Perbandingan Tim */}
          <SectionCard title="Tren & Perbandingan Tim" bodyClassName="p-5">
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Jumlah Booking per Bulan (12 Bulan Terakhir)
                  </p>
                  <Chip color="success" variant="soft" size="sm">
                    <ArrowUp size={12} />+
                    {staffData?.performance?.growthVsPrev3Months}% vs 3 bulan
                    lalu
                  </Chip>
                </div>
                <div className="h-[190px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={staffData?.performance?.monthlyBookings}
                      margin={{ top: 24, right: 8, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="bookingTrend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--accent)"
                            stopOpacity={0.32}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--accent)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fontSize: 11, fill: "var(--muted)" }}
                      />
                      <RTooltip
                        cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [
                          `${value} booking`,
                          "Total",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        fill="url(#bookingTrend)"
                        dot={{ r: 3, strokeWidth: 0, fill: "var(--accent)" }}
                        activeDot={{ r: 5 }}
                      >
                        <LabelList
                          dataKey="total"
                          position="top"
                          offset={10}
                          style={{ fontSize: 10, fill: "var(--muted)" }}
                        />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">
                  Dibanding Rata-rata Tim Therapist
                </p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Booking / Bulan
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold text-foreground">
                        {staffData?.performance?.vsTeam?.bookingPerMonth?.value}
                      </span>
                      <TrendArrow
                        value={
                          staffData?.performance?.vsTeam?.bookingPerMonth?.delta
                        }
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Tim:{" "}
                      {staffData?.performance?.vsTeam?.bookingPerMonth?.teamAvg}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Rating Rata-rata
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold text-foreground">
                        {staffData?.performance?.vsTeam?.avgRating?.value}
                      </span>
                      <TrendArrow
                        value={staffData?.performance?.vsTeam?.avgRating?.delta}
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Tim: {staffData?.performance?.vsTeam?.avgRating?.teamAvg}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Utilisasi Jadwal
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold text-foreground">
                        {
                          staffData?.performance?.vsTeam?.scheduleUtilization
                            ?.value
                        }
                        %
                      </span>
                      <TrendArrow
                        value={
                          staffData?.performance?.vsTeam?.scheduleUtilization
                            ?.delta
                        }
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Tim:{" "}
                      {
                        staffData?.performance?.vsTeam?.scheduleUtilization
                          ?.teamAvg
                      }
                      %
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Retensi Customer
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold text-foreground">
                        {
                          staffData?.performance?.vsTeam?.customerRetention
                            ?.value
                        }
                        %
                      </span>
                      <TrendArrow
                        value={
                          staffData?.performance?.vsTeam?.customerRetention
                            ?.delta
                        }
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Tim:{" "}
                      {
                        staffData?.performance?.vsTeam?.customerRetention
                          ?.teamAvg
                      }
                      %
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="text-xs font-medium text-foreground">
                  Catatan Kinerja:
                </p>
                <p className="text-xs text-muted">
                  {staffData?.performance?.note}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ---- Kolom kanan (1/3): administratif ---- */}
        <div className="space-y-5">
          {/* Peringatan — ditampilkan sebagai timeline, urut dari terbaru */}
          <SectionCard
            title="Riwayat Peringatan"
            description={
              realWarnings.length > 0
                ? `${realWarnings.length} peringatan sepanjang masa kerja`
                : undefined
            }
            bodyClassName="p-5"
            action={
              <Button
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/10"
                onPress={() => setIsWarningModalOpen(true)}
              >
                +
              </Button>
            }
          >
            {realWarnings.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                Belum ada peringatan.
              </p>
            ) : (
              <Timeline
                items={[...realWarnings].map((w) => ({
                  id: String(w.id),
                  tone:
                    w.level === "berat"
                      ? "danger"
                      : w.level === "sedang"
                        ? "warning"
                        : "default",
                  content: (
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <Chip
                          color={
                            w.level === "berat"
                              ? "danger"
                              : w.level === "sedang"
                                ? "warning"
                                : "default"
                          }
                          variant="soft"
                          size="sm"
                        >
                          {w.level.charAt(0).toUpperCase() + w.level.slice(1)}
                        </Chip>
                        <span className="text-xs text-muted">
                          {tanggalPendek(w.date)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{w.note}</p>
                      <p className="mt-1 text-xs text-muted">
                        Diberikan oleh: {w.givenBy}.
                      </p>
                      {w.attachmentName && (
                        <a
                          href={resolvePhotoUrl(w.attachmentUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <Paperclip size={12} />
                          {w.attachmentName}
                        </a>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </SectionCard>

          {/* Kontrak — kontrak aktif + riwayat perpanjangan sebagai timeline */}
          <SectionCard
            title="Kontrak Kerja"
            description={`${contractHistory.length + (currentContract ? 1 : 0)} versi kontrak tercatat`}
            bodyClassName="p-5"
            action={
              <Button
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/10"
                onPress={() => setIsContractModalOpen(true)}
              >
                <UploadSimple size={14} />
              </Button>
            }
          >
            {!currentContract && contractHistory.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                Belum ada data kontrak.
              </p>
            ) : (
              <Timeline
                items={[
                  ...(currentContract
                    ? [
                        {
                          id: "current",
                          tone: "success" as TimelineTone,
                          content: (
                            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                              <div className="mb-1 flex items-center gap-2">
                                <Chip color="success" variant="soft" size="sm">
                                  Aktif
                                </Chip>
                                <span className="text-xs text-muted">
                                  {tanggalPendek(currentContract.startDate)} —{" "}
                                  {tanggalPendek(currentContract.endDate)}
                                </span>
                              </div>
                              {currentContract.note && (
                                <p className="text-sm text-foreground">
                                  {currentContract.note}
                                </p>
                              )}
                              <a
                                href={resolvePhotoUrl(currentContract.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                              >
                                <Paperclip size={12} />
                                {currentContract.fileName}
                              </a>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  ...contractHistory.map((c: any) => ({
                    id: String(c.id),
                    tone: "default" as TimelineTone,
                    content: (
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <Chip color="default" variant="soft" size="sm">
                            Berakhir
                          </Chip>
                          <span className="text-xs text-muted">
                            {tanggalPendek(c.startDate)} —{" "}
                            {tanggalPendek(c.endDate)}
                          </span>
                        </div>
                        {c.note && (
                          <p className="text-sm text-foreground">{c.note}</p>
                        )}
                        <a
                          href={resolvePhotoUrl(c.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <Paperclip size={12} />
                          {c.fileName}
                        </a>
                      </div>
                    ),
                  })),
                ]}
              />
            )}
          </SectionCard>

          {/* Kinerja & Finansial — Owner/HR only */}
          {canSeeFinancials && (
            <SectionCard
              title="Kinerja & Finansial"
              bodyClassName="p-5"
              action={
                <Chip color="warning" variant="soft" size="sm">
                  <Lock size={12} />
                  Owner &amp; HR
                </Chip>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        weight={
                          i <
                          Math.round(staffData?.rating_stats?.avg_rating ?? 0)
                            ? "fill"
                            : "regular"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {(staffData?.rating_stats?.avg_rating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted">
                    ({staffData?.rating_stats?.review_count ?? 0} review)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Kontribusi Revenue
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {rupiah(
                        staffData?.financial_summary?.revenueThisMonth || 0,
                      )}
                    </p>
                    <p className="text-xs text-muted">Gross, bulan ini</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Total Tip Diterima
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {rupiah(staffData?.financial_summary?.tipThisMonth || 0)}
                    </p>
                    <p className="text-xs text-muted">Bulan ini</p>
                  </div>
                  <div className="relative rounded-lg border border-border p-3 group">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-muted">
                        Gaji Bulan Ini
                      </p>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onPress={() => setIsSalaryModalOpen(true)}
                      >
                        <UserGear size={14} />
                      </Button>
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {rupiah(
                        staffData?.financial_summary?.salaryThisMonth || 0,
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      Base{" "}
                      {rupiah(staffData?.financial_summary?.baseSalary || 0)} +
                      komisi
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Riwayat gaji lengkap ada di menu Penggajian.
                </p>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staffData={staffData}
      />

      <CreateWarningModal
        staffId={staffData?.id}
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
      />

      <CreateContractModal
        staffId={staffData?.id}
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
      />

      <EditSalaryModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        staffId={staffData?.id}
        currentSalary={staffData?.salary || 0}
      />
    </div>
  );
}
