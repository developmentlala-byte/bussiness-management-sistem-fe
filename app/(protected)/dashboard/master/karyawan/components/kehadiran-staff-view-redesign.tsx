"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  MagnifyingGlass,
  X,
  CircleNotch,
  Camera,
} from "@phosphor-icons/react";
import {
  Dropdown,
  TextField,
  InputGroup,
  Avatar,
  RangeCalendar,
} from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import NextImage from "next/image";

import { useApiFetch } from "@/app/libs/use-http";
import { apiPost } from "@/app/services/api";
import { Staff } from "@/app/types/staff";
import { AttendanceSelfieModal } from "@/app/components/modal/attendance-selfie-modal";
import { calculateLateMinutes } from "@/app/libs/calculate-late-minute";
import { formatLateTime } from "@/app/libs/format-late-time";

// --- TYPES & CONSTANTS ---
interface Attendance {
  id: number;
  bms_ms_staff_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "present" | "late" | "absent" | "half_day" | "on_leave";
  late_minutes: number;
  ip_address: string | null;
  clock_in_photo_path?: string | null;
  clock_out_photo_path?: string | null;
  staff?: Staff;
}

type AttendanceAction = "clock_in" | "clock_out";
type QueueItem = {
  id: string;
  staffId: number;
  date: string;
  action: AttendanceAction;
  imageDataUrl: string;
  attempts: number;
  createdAt: string;
};

const QUEUE_KEY = "attendance-selfie-queue-v1";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_API_STORAGE_URL ?? "http://localhost:8000";

// --- HELPER FUNCTIONS ---
const resolvePhotoUrl = (path?: string | null) =>
  path ? `${APP_BASE_URL}${path}` : null;

const readQueue = (): QueueItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeQueue = (items: QueueItem[]) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  }
};

const enqueueQueueItem = (item: QueueItem) =>
  writeQueue([...readQueue(), item]);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
};

const submitSelfie = async (
  staffId: number,
  date: string,
  action: AttendanceAction,
  file: File,
) => {
  const formData = new FormData();
  formData.append("bms_ms_staff_id", String(staffId));
  formData.append("date", date);
  formData.append("photo", file);

  const endpoint =
    action === "clock_in"
      ? "/master/attendances/clock-in"
      : "/master/attendances/clock-out";
  return apiPost(endpoint, formData);
};

const syncQueuedUploads = async (onSynced?: () => void) => {
  const queue = readQueue();
  if (!queue.length) return;

  const remaining: QueueItem[] = [];
  for (const item of queue) {
    try {
      const file = await dataUrlToFile(
        item.imageDataUrl,
        `attendance-${item.staffId}-${item.date}-${item.action}.jpg`,
      );
      await submitSelfie(item.staffId, item.date, item.action, file);
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  writeQueue(remaining);
  onSynced?.();
};

const formatTime = (datetimeStr: string | null) => {
  if (!datetimeStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(datetimeStr));
};

const getCompactBadge = (attendance?: Attendance) => {
  if (!attendance?.clock_in) {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-500/10 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-700">
        Absen
      </span>
    );
  }
  if (attendance.clock_in && !attendance.clock_out) {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-500/10 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-amber-700">
        Masuk
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-emerald-500/10 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-700">
      Selesai
    </span>
  );
};

// --- SUB-COMPONENTS ---
interface DetailModalProps {
  selection: { staff: Staff; dateStr: string; attendance?: Attendance } | null;
  onClose: () => void;
  onStartCapture: (action: AttendanceAction) => void;
  queueMessage: string | null;
}

const DetailModal = ({
  selection,
  onClose,
  onStartCapture,
  queueMessage,
}: DetailModalProps) => {
  if (!selection) return null;

  const { attendance, staff, dateStr } = selection;
  const clockInPhoto = resolvePhotoUrl(attendance?.clock_in_photo_path);
  const clockOutPhoto = resolvePhotoUrl(attendance?.clock_out_photo_path);

  const action: AttendanceAction | null = !attendance?.clock_in
    ? "clock_in"
    : !attendance.clock_out
      ? "clock_out"
      : null;

  const badgeProps = !attendance?.clock_in
    ? {
        label: "Belum masuk",
        className: "bg-slate-500/10 text-slate-700 border-slate-500/20",
      }
    : !attendance.clock_out
      ? {
          label: "Sudah masuk",
          className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        }
      : {
          label: "Selesai",
          className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        };

  return (
    // FIX: z-[9999] agar tidak ketimpa navbar/sidebar
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* FIX: max-h-[90svh] menyesuaikan dengan dynamic viewport mobile. flex-col penting untuk scroll area. */}
      <div className="relative flex w-full max-w-3xl max-h-[90svh] flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] border border-border bg-surface shadow-2xl">
        {/* Modal Header - shrink-0 memastikan header tidak ikut mengecil saat scroll */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 bg-linear-to-r from-accent/15 via-accent/8 to-transparent px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.28em] text-accent">
              Detail Kehadiran
            </p>
            <h3 className="mt-1 text-lg sm:text-xl font-black text-foreground">
              {staff.first_name} {staff.last_name || ""}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              {staff.job_title} · {dateStr}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-background/70 p-2 text-muted transition-colors hover:text-foreground active:scale-95"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* FIX: Modal Body - flex-1 dan min-h-0 adalah KUNCI agar scrollbar muncul dan konten tidak kebablasan */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-hide min-h-0">
          {/* md:grid-cols-2 untuk mengatur layout di Tablet agar tidak menumpuk panjang */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Kolom Kiri: Info Waktu & Aksi */}
            <div className="space-y-4 rounded-[20px] sm:rounded-[24px] border border-border bg-background/40 p-4 sm:p-5 h-fit">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 ring-1 ring-border/50 bg-border/20">
                  <Avatar.Image
                    src={resolvePhotoUrl(staff.avatar_path) ?? ""}
                  />
                  <Avatar.Fallback className="text-muted font-bold">
                    {staff.first_name?.charAt(0) || "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-bold ${badgeProps.className}`}
                  >
                    {badgeProps.label}
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted leading-tight">
                    Klik aksi di bawah untuk membuka kamera.
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:gap-3 grid-cols-2">
                <div className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted">
                    Masuk
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-foreground">
                    {formatTime(attendance?.clock_in || null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted">
                    Pulang
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-foreground">
                    {formatTime(attendance?.clock_out || null)}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted">
                    Terlambat
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-foreground">
                    {attendance?.clock_in
                      ? formatLateTime(attendance.clock_in)
                      : "-"}
                  </p>
                </div>
              </div>

              {queueMessage && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs sm:text-sm font-medium text-amber-800">
                  {queueMessage}
                </div>
              )}

              {action && (
                <button
                  onClick={() => onStartCapture(action)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
                >
                  <Camera weight="bold" className="h-4 w-4 shrink-0" />
                  Buka Kamera
                </button>
              )}
            </div>

            {/* Kolom Kanan: Foto (bisa memanjang sesuai gambar, scroll akan aktif) */}
            <div className="space-y-4 rounded-[20px] sm:rounded-[24px] border border-border bg-background/50 p-4 sm:p-5 h-fit">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted">
                  Foto Tersimpan
                </p>
                <p className="mt-1 text-xs text-muted">
                  Preview foto yang berhasil dikirim.
                </p>
              </div>

              <div className="grid gap-3">
                {clockInPhoto && (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                    <NextImage
                      src={clockInPhoto}
                      alt="Foto clock in"
                      width={800}
                      height={600}
                      unoptimized
                      style={{
                        transform: "scaleX(-1)",
                        WebkitTransform: "scaleX(-1)",
                      }}
                      className="h-36 sm:h-44 w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 text-[10px] font-bold text-muted">
                      <span>Clock In</span>
                      <span>{formatTime(attendance?.clock_in || null)}</span>
                    </div>
                  </div>
                )}

                {clockOutPhoto && (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                    <NextImage
                      src={clockOutPhoto}
                      alt="Foto clock out"
                      width={800}
                      height={600}
                      unoptimized
                      style={{
                        transform: "scaleX(-1)",
                        WebkitTransform: "scaleX(-1)",
                      }}
                      className="h-36 sm:h-44 w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 text-[10px] font-bold text-muted">
                      <span>Clock Out</span>
                      <span>{formatTime(attendance?.clock_out || null)}</span>
                    </div>
                  </div>
                )}

                {!clockInPhoto && !clockOutPhoto && (
                  <div className="flex flex-col min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary/40 px-4 text-center">
                    <Camera
                      className="w-6 h-6 text-muted/50 mb-2"
                      weight="duotone"
                    />
                    <span className="text-xs text-muted">
                      Belum ada foto tersimpan.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function KehadiranStaffView() {
  const timeZone = getLocalTimeZone();
  const currentDateObj = today(timeZone);

  const [dateRange, setDateRange] = useState({
    start: currentDateObj.subtract({ days: 6 }),
    end: currentDateObj,
  });
  const [search, setSearch] = useState("");
  const [selectedCell, setSelectedCell] = useState<{
    staff: Staff;
    dateStr: string;
    attendance?: Attendance;
  } | null>(null);

  const [cameraAction, setCameraAction] = useState<AttendanceAction | null>(
    null,
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const startDateStr = dateRange.start.toString();
  const endDateStr = dateRange.end.toString();
  const rangeDuration = dateRange.end.compare(dateRange.start) + 1;

  const {
    data: responseData,
    isLoading,
    refetch,
  } = useApiFetch<{ data: Attendance[] }>(
    ["attendances", startDateStr, endDateStr],
    "/master/attendances",
    { start_date: startDateStr, end_date: endDateStr },
  );
  const { data: staffResponse, isLoading: isStaffLoading } = useApiFetch<{
    data: Staff[];
  }>(["staffs"], "/master/staffs");

  const attendances = useMemo(
    () => responseData?.data ?? [],
    [responseData?.data],
  );
  const staffs = useMemo(
    () => staffResponse?.data ?? [],
    [staffResponse?.data],
  );

  const gridDays = useMemo(() => {
    const days = [];
    let curr = dateRange.start;
    const todayStr = currentDateObj.toString();
    const shortFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    });

    while (curr.compare(dateRange.end) <= 0) {
      const dateStr = curr.toString();
      days.push({
        dateStr,
        name: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(
          curr.toDate(timeZone),
        ),
        shortDate: shortFormatter.format(curr.toDate(timeZone)),
        isToday: dateStr === todayStr,
      });
      curr = curr.add({ days: 1 });
    }
    return days;
  }, [dateRange, currentDateObj, timeZone]);

  const attendanceMap = useMemo(() => {
    const attMap: Record<number, Record<string, Attendance>> = {};
    attendances.forEach((att) => {
      const dateKey = att.date.split("T")[0];
      if (!attMap[att.bms_ms_staff_id]) attMap[att.bms_ms_staff_id] = {};
      attMap[att.bms_ms_staff_id][dateKey] = att;
    });
    return attMap;
  }, [attendances]);

  const displayStaffs = useMemo(() => {
    if (!search) return staffs;
    const lower = search.toLowerCase();
    return staffs.filter(
      (staff) =>
        staff.first_name?.toLowerCase().includes(lower) ||
        staff.last_name?.toLowerCase().includes(lower) ||
        staff.employee_code?.toLowerCase().includes(lower),
    );
  }, [staffs, search]);

  useEffect(() => {
    const runQueueSync = async () =>
      await syncQueuedUploads(() => void refetch());
    void runQueueSync();

    const onFocus = () => void runQueueSync();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refetch]);

  const handleDateChange = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -rangeDuration : rangeDuration;
    setDateRange({
      start: dateRange.start.add({ days: offset }),
      end: dateRange.end.add({ days: offset }),
    });
    setSelectedCell(null);
    setQueueMessage(null);
  };

  const rangeFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  });
  const startYear = dateRange.start.year;
  const endYear = dateRange.end.year;
  const displayDateText =
    startYear === endYear
      ? `${rangeFormatter.format(dateRange.start.toDate(timeZone))} - ${rangeFormatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`
      : `${rangeFormatter.format(dateRange.start.toDate(timeZone))}, ${startYear} - ${rangeFormatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`;

  const handleSelfieCaptured = async (file: File) => {
    if (!selectedCell || !cameraAction) return;
    setIsUploading(true);
    setCameraStatus("Menyimpan foto ke server...");

    try {
      await submitSelfie(
        selectedCell.staff.id,
        selectedCell.dateStr,
        cameraAction,
        file,
      );
      setQueueMessage(null);
      void refetch();
    } catch {
      try {
        const imageDataUrl = await fileToDataUrl(file);
        enqueueQueueItem({
          id: `${selectedCell.staff.id}-${selectedCell.dateStr}-${cameraAction}-${Date.now()}`,
          staffId: selectedCell.staff.id,
          date: selectedCell.dateStr,
          action: cameraAction,
          imageDataUrl,
          attempts: 0,
          createdAt: new Date().toISOString(),
        });
        setQueueMessage(
          "Foto tersimpan lokal dan akan dicoba lagi otomatis saat koneksi kembali.",
        );
      } catch {
        setQueueMessage(
          "Foto gagal dikirim dan tidak bisa disimpan ke antrean lokal.",
        );
      }
    } finally {
      setCameraStatus(null);
      setIsUploading(false);
      setCameraOpen(false);
      setSelectedCell(null);
      setCameraAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Filter Header */}
      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <TextField aria-label="Cari staf" className="w-full md:w-80">
          <InputGroup className="h-11 overflow-hidden rounded-full border border-border bg-transparent shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <InputGroup.Prefix className="flex items-center bg-transparent pl-4 pr-2 text-muted">
              <MagnifyingGlass weight="bold" className="h-4 w-4" />
            </InputGroup.Prefix>
            <InputGroup.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staf..."
              className="h-full w-full bg-transparent px-2 text-sm font-semibold outline-none"
            />
          </InputGroup>
        </TextField>

        <div className="flex h-11 w-full items-center justify-between overflow-visible rounded-full border border-border shadow-sm transition-colors md:w-auto md:justify-center">
          <button
            onClick={() => handleDateChange("prev")}
            className="flex h-full w-12 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent md:w-auto md:px-5 active:scale-95"
          >
            <CaretLeft weight="bold" className="h-4 w-4" />
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-[13px] sm:text-sm font-bold text-foreground outline-none transition-colors hover:bg-surface-secondary/50 md:min-w-55 md:px-6">
                <CalendarBlank
                  weight="bold"
                  className="h-4 w-4 shrink-0 text-muted"
                />
                <span className="truncate">{displayDateText}</span>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom"
              className="z-[100] w-[calc(100vw-2rem)] sm:w-auto min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl"
            >
              <RangeCalendar
                aria-label="Pilih rentang jadwal"
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val);
                  setSelectedCell(null);
                }}
                className="w-full"
              >
                <RangeCalendar.Header>
                  <RangeCalendar.Heading />
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => (
                      <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
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
            onClick={() => handleDateChange("next")}
            className="flex h-full w-12 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent md:w-auto md:px-5 active:scale-95"
          >
            <CaretRight weight="bold" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. DESKTOP VIEW: Matrix Table */}
      <div className="hidden md:block relative w-full overflow-hidden rounded-[24px] border border-border bg-background shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] scrollbar-hide">
          <table className="w-full min-w-max border-collapse whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md shadow-[0_1px_0_0_var(--color-border)]">
              <tr>
                <th className="sticky left-0 z-40 min-w-[240px] max-w-[240px] border-r border-border/50 bg-background/95 px-5 py-6 text-xs font-bold uppercase tracking-wider text-muted shadow-[1px_0_0_0_var(--color-border)] align-middle">
                  Anggota Staf
                </th>
                {gridDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className={`min-w-[120px] border-r border-border/30 px-3 py-5 text-center align-middle transition-colors last:border-r-0 ${day.isToday ? "bg-accent/5" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider ${day.isToday ? "text-accent" : "text-muted"}`}
                      >
                        {day.name}
                      </span>
                      <span
                        className={`text-[13px] font-bold ${day.isToday ? "text-accent" : "text-foreground"}`}
                      >
                        {day.shortDate}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || isStaffLoading ? (
                <tr>
                  <td
                    colSpan={gridDays.length + 1}
                    className="py-16 text-center text-sm font-medium text-muted"
                  >
                    <CircleNotch className="h-4 w-4 animate-spin inline mr-2" />
                    Memuat...
                  </td>
                </tr>
              ) : displayStaffs.length === 0 ? (
                <tr>
                  <td
                    colSpan={gridDays.length + 1}
                    className="py-16 text-center text-sm font-medium text-muted"
                  >
                    Tidak ada data staf.
                  </td>
                </tr>
              ) : (
                displayStaffs.map((staff) => (
                  <tr
                    key={staff.id}
                    className="group/row border-b border-border transition-colors hover:bg-border/10"
                  >
                    <td className="sticky left-0 z-20 min-w-[240px] max-w-[240px] border-r border-border/50 bg-background px-5 py-4 shadow-[1px_0_0_0_var(--color-border)] group-hover/row:bg-surface/90">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50 bg-border/20">
                          <Avatar.Image
                            src={resolvePhotoUrl(staff.avatar_path) ?? ""}
                          />
                          <Avatar.Fallback className="text-sm font-bold text-muted">
                            {staff.first_name?.charAt(0) || "U"}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex w-full min-w-0 flex-col overflow-hidden">
                          <span className="truncate text-sm font-bold text-foreground">
                            {staff.first_name} {staff.last_name || ""}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-muted">
                            {staff.job_title}
                          </span>
                        </div>
                      </div>
                    </td>
                    {gridDays.map((day) => {
                      const attendance = attendanceMap[staff.id]?.[day.dateStr];
                      const isSelected =
                        selectedCell?.staff.id === staff.id &&
                        selectedCell.dateStr === day.dateStr;
                      return (
                        <td
                          key={day.dateStr}
                          onClick={() => {
                            setSelectedCell({
                              staff,
                              dateStr: day.dateStr,
                              attendance,
                            });
                            setQueueMessage(null);
                          }}
                          className={`cursor-pointer border-r border-border/30 p-2.5 align-middle transition-colors last:border-r-0 ${isSelected ? "bg-accent/10" : day.isToday ? "bg-accent/5" : "bg-transparent"} hover:bg-accent/5`}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all hover:bg-surface-secondary/50">
                            {getCompactBadge(attendance)}
                            <span className="text-[10px] font-semibold text-muted">
                              {attendance?.clock_in
                                ? `${formatTime(attendance.clock_in)} / ${attendance.clock_out ? formatTime(attendance.clock_out) : "..."}`
                                : "Klik untuk foto"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MOBILE VIEW: Stacked List */}
      <div className="md:hidden flex flex-col gap-4 pb-10">
        {isLoading || isStaffLoading ? (
          <div className="py-16 text-center text-sm font-medium text-muted flex items-center justify-center gap-2">
            <CircleNotch className="h-4 w-4 animate-spin" />
            Memuat data absensi...
          </div>
        ) : displayStaffs.length === 0 ? (
          <div className="py-16 text-center text-sm font-medium text-muted rounded-2xl border border-dashed border-border/60">
            Tidak ada data staf.
          </div>
        ) : (
          displayStaffs.map((staff) => (
            <div
              key={staff.id}
              className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/50">
                <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50 bg-border/20">
                  <Avatar.Image
                    src={resolvePhotoUrl(staff.avatar_path) ?? ""}
                  />
                  <Avatar.Fallback className="text-xs font-bold text-muted">
                    {staff.first_name?.charAt(0) || "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    {staff.first_name} {staff.last_name || ""}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {staff.job_title}
                  </span>
                </div>
              </div>
              <div className="flex flex-col px-4 py-1.5">
                {gridDays.map((day, idx) => {
                  const attendance = attendanceMap[staff.id]?.[day.dateStr];
                  const isSelected =
                    selectedCell?.staff.id === staff.id &&
                    selectedCell.dateStr === day.dateStr;
                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedCell({
                          staff,
                          dateStr: day.dateStr,
                          attendance,
                        });
                        setQueueMessage(null);
                      }}
                      className={`flex items-center justify-between py-3 cursor-pointer transition-colors active:opacity-60 ${idx !== gridDays.length - 1 ? "border-b border-border/40" : ""} ${isSelected ? "bg-accent/5 -mx-4 px-4" : day.isToday ? "bg-surface-secondary/30 -mx-4 px-4" : ""}`}
                    >
                      <span className="text-xs font-medium text-muted">
                        {day.name}, {day.shortDate}
                      </span>
                      <div className="flex items-center gap-2.5 text-right">
                        <span className="text-xs font-bold text-foreground">
                          {formatTime(attendance?.clock_in || null) +
                            " / " +
                            formatTime(attendance?.clock_out || null)}
                        </span>
                        {getCompactBadge(attendance)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <DetailModal
        selection={selectedCell}
        onClose={() => setSelectedCell(null)}
        onStartCapture={(a) => {
          setCameraAction(a);
          setCameraOpen(true);
        }}
        queueMessage={queueMessage}
      />

      <AttendanceSelfieModal
        isOpen={cameraOpen && Boolean(selectedCell && cameraAction)}
        title={
          cameraAction === "clock_out"
            ? "Selfie Absen Pulang"
            : "Selfie Absen Masuk"
        }
        description={
          selectedCell
            ? `${selectedCell.staff.first_name} · ${selectedCell.dateStr}`
            : ""
        }
        actionLabel={
          cameraAction === "clock_out"
            ? "Ambil Foto Pulang"
            : "Ambil Foto Masuk"
        }
        isUploading={isUploading}
        statusMessage={cameraStatus}
        onClose={() => {
          setCameraOpen(false);
          setCameraAction(null);
        }}
        onCapture={(f) => void handleSelfieCaptured(f)}
      />
    </div>
  );
}
