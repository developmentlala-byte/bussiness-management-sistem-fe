"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  MagnifyingGlass,
  X,
  CircleNotch,
  Camera,
  ArrowLeft,
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
import { formatLateTime } from "@/app/libs/format-late-time";
import { parseWallClockDate } from "@/app/libs/date-format";

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

// Sheet view: "action" = quick sheet, "detail" = detail with photos
type SheetView = "action" | "detail";

const QUEUE_KEY = "attendance-selfie-queue-v1";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_API_STORAGE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:8000";

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
  if (!datetimeStr) return "—";
  const parsed = parseWallClockDate(datetimeStr);
  if (!parsed) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const getStatusConfig = (attendance?: Attendance) => {
  if (!attendance?.clock_in)
    return {
      label: "Belum masuk",
      badgeCls: "bg-slate-100 text-slate-600",
      dotCls: "bg-slate-400",
      gridLabel: "Absen",
      gridCls: "bg-slate-50 text-slate-500",
    };
  if (!attendance.clock_out)
    return {
      label: "Sudah masuk",
      badgeCls: "bg-amber-50 text-amber-700",
      dotCls: "bg-amber-400",
      gridLabel: "Masuk",
      gridCls: "bg-amber-50 text-amber-700",
    };
  return {
    label: "Selesai",
    badgeCls: "bg-emerald-50 text-emerald-700",
    dotCls: "bg-emerald-400",
    gridLabel: "Selesai",
    gridCls: "bg-emerald-50 text-emerald-700",
  };
};

// --- UNIFIED BOTTOM SHEET ---
interface AttendanceSheetProps {
  selection: { staff: Staff; dateStr: string; attendance?: Attendance } | null;
  view: SheetView;
  onClose: () => void;
  onStartCapture: (action: AttendanceAction) => void;
  onSwitchView: (view: SheetView) => void;
  queueMessage: string | null;
}

const AttendanceSheet = ({
  selection,
  view,
  onClose,
  onStartCapture,
  onSwitchView,
  queueMessage,
}: AttendanceSheetProps) => {
  if (!selection) return null;

  const { attendance, staff, dateStr } = selection;
  const statusConfig = getStatusConfig(attendance);
  const clockInPhoto = resolvePhotoUrl(attendance?.clock_in_photo_path);
  const clockOutPhoto = resolvePhotoUrl(attendance?.clock_out_photo_path);

  const action: AttendanceAction | null = !attendance?.clock_in
    ? "clock_in"
    : !attendance?.clock_out
      ? "clock_out"
      : null;

  const actionLabel =
    action === "clock_in" ? "Foto absen masuk" : "Foto absen pulang";

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet container */}
      <div className="relative w-full max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border/60 shadow-xl animate-in slide-in-from-bottom-2 sm:zoom-in-95 duration-150 overflow-hidden">
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-8 h-[3px] rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          {view === "detail" && (
            <button
              onClick={() => onSwitchView("action")}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-secondary transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/40">
              <Avatar.Image src={resolvePhotoUrl(staff.avatar_path) ?? ""} />
              <Avatar.Fallback className="text-xs font-bold text-muted">
                {staff.first_name?.charAt(0) || "U"}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">
                  {staff.first_name} {staff.last_name || ""}
                </span>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.badgeCls}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotCls}`}
                  />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-[11px] text-muted truncate">
                {staff.job_title} · {dateStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-secondary transition-colors"
            aria-label="Tutup"
          >
            <X weight="bold" className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 mx-4" />

        {/* === VIEW: ACTION === */}
        {view === "action" && (
          <div className="p-4 space-y-3">
            {/* Time row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Masuk
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${attendance?.clock_in ? "text-foreground" : "text-muted"}`}
                >
                  {formatTime(attendance?.clock_in || null)}
                </p>
              </div>
              <div className="col-span-1 rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Pulang
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${attendance?.clock_out ? "text-foreground" : "text-muted"}`}
                >
                  {formatTime(attendance?.clock_out || null)}
                </p>
              </div>
              <div className="col-span-1 rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Telat
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {attendance?.clock_in
                    ? formatLateTime(attendance.clock_in)
                    : "—"}
                </p>
              </div>
            </div>

            {/* Queue message */}
            {queueMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 leading-relaxed">
                {queueMessage}
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-2 pt-1">
              {action ? (
                <>
                  <button
                    onClick={() => onStartCapture(action)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <Camera weight="bold" className="h-4 w-4 shrink-0" />
                    {actionLabel}
                  </button>
                  <button
                    onClick={() => onSwitchView("detail")}
                    className="w-full rounded-xl border border-border/60 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground hover:bg-surface-secondary"
                  >
                    Lihat detail & foto
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSwitchView("detail")}
                  className="w-full rounded-xl border border-border/60 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
                >
                  Lihat detail & foto
                </button>
              )}
            </div>
          </div>
        )}

        {/* === VIEW: DETAIL === */}
        {view === "detail" && (
          <div className="p-4 space-y-3 max-h-[70dvh] overflow-y-auto">
            {/* Time grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Masuk
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${attendance?.clock_in ? "text-foreground" : "text-muted"}`}
                >
                  {formatTime(attendance?.clock_in || null)}
                </p>
              </div>
              <div className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Pulang
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${attendance?.clock_out ? "text-foreground" : "text-muted"}`}
                >
                  {formatTime(attendance?.clock_out || null)}
                </p>
              </div>
              <div className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">
                  Telat
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {attendance?.clock_in
                    ? formatLateTime(attendance.clock_in)
                    : "—"}
                </p>
              </div>
            </div>

            {/* Photos */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                Foto Kehadiran
              </p>
              <div className="grid grid-cols-2 gap-2">
                {clockInPhoto ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <NextImage
                      src={clockInPhoto}
                      alt="Foto masuk"
                      width={400}
                      height={300}
                      unoptimized
                      style={{ transform: "scaleX(-1)" }}
                      className="h-28 w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-muted">
                        Masuk
                      </span>
                      <span className="text-[10px] font-bold text-foreground tabular-nums">
                        {formatTime(attendance?.clock_in || null)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary/30">
                    <Camera
                      className="h-5 w-5 text-muted/40 mb-1"
                      weight="duotone"
                    />
                    <span className="text-[10px] text-muted">
                      Belum ada foto
                    </span>
                    <span className="text-[9px] text-muted/60">masuk</span>
                  </div>
                )}
                {clockOutPhoto ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <NextImage
                      src={clockOutPhoto}
                      alt="Foto pulang"
                      width={400}
                      height={300}
                      unoptimized
                      style={{ transform: "scaleX(-1)" }}
                      className="h-28 w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-muted">
                        Pulang
                      </span>
                      <span className="text-[10px] font-bold text-foreground tabular-nums">
                        {formatTime(attendance?.clock_out || null)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary/30">
                    <Camera
                      className="h-5 w-5 text-muted/40 mb-1"
                      weight="duotone"
                    />
                    <span className="text-[10px] text-muted">
                      Belum ada foto
                    </span>
                    <span className="text-[9px] text-muted/60">pulang</span>
                  </div>
                )}
              </div>
            </div>

            {/* Queue message */}
            {queueMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 leading-relaxed">
                {queueMessage}
              </div>
            )}

            {/* CTA jika masih ada aksi */}
            {action && (
              <button
                onClick={() => onStartCapture(action)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Camera weight="bold" className="h-4 w-4 shrink-0" />
                {actionLabel}
              </button>
            )}
          </div>
        )}

        {/* Safe area bottom padding for mobile */}
        <div className="h-safe-area-inset-bottom sm:hidden" />
      </div>
    </div>
  );
};

// --- GRID BADGE ---
const getCompactBadge = (attendance?: Attendance) => {
  const config = getStatusConfig(attendance);
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${config.gridCls}`}
    >
      {config.gridLabel}
    </span>
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
  const [sheetView, setSheetView] = useState<SheetView>("action");

  // Camera state — terpisah dari selectedCell agar tidak null saat kamera terbuka
  const [pendingCapture, setPendingCapture] = useState<{
    staff: Staff;
    dateStr: string;
    action: AttendanceAction;
  } | null>(null);
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
    const shortFmt = new Intl.DateTimeFormat("id-ID", {
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
        shortDate: shortFmt.format(curr.toDate(timeZone)),
        isToday: dateStr === todayStr,
      });
      curr = curr.add({ days: 1 });
    }
    return days;
  }, [dateRange, currentDateObj, timeZone]);

  const attendanceMap = useMemo(() => {
    const map: Record<number, Record<string, Attendance>> = {};
    attendances.forEach((att) => {
      const key = att.date.split("T")[0];
      if (!map[att.bms_ms_staff_id]) map[att.bms_ms_staff_id] = {};
      map[att.bms_ms_staff_id][key] = att;
    });
    return map;
  }, [attendances]);

  const displayStaffs = useMemo(() => {
    if (!search) return staffs;
    const q = search.toLowerCase();
    return staffs.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.employee_code?.toLowerCase().includes(q),
    );
  }, [staffs, search]);

  useEffect(() => {
    const run = async () => await syncQueuedUploads(() => void refetch());
    void run();
    const onFocus = () => void run();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refetch]);

  const handleDateChange = (dir: "prev" | "next") => {
    const offset = dir === "prev" ? -rangeDuration : rangeDuration;
    setDateRange({
      start: dateRange.start.add({ days: offset }),
      end: dateRange.end.add({ days: offset }),
    });
    setSelectedCell(null);
    setQueueMessage(null);
  };

  const handleCellClick = useCallback(
    (staff: Staff, dateStr: string, attendance?: Attendance) => {
      setSelectedCell({ staff, dateStr, attendance });
      setSheetView("action");
      setQueueMessage(null);
    },
    [],
  );

  // FIX: simpan pending capture DULU, baru tutup sheet, baru buka kamera
  const handleStartCapture = useCallback(
    (action: AttendanceAction) => {
      if (!selectedCell) return;
      const capture = {
        staff: selectedCell.staff,
        dateStr: selectedCell.dateStr,
        action,
      };
      setPendingCapture(capture);
      setSelectedCell(null); // tutup sheet
      setCameraOpen(true); // buka kamera — pakai pendingCapture, bukan selectedCell
    },
    [selectedCell],
  );

  const handleSelfieCaptured = async (file: File) => {
    if (!pendingCapture) return;
    setIsUploading(true);
    setCameraStatus("Menyimpan foto ke server...");

    try {
      await submitSelfie(
        pendingCapture.staffId ?? pendingCapture.staff.id,
        pendingCapture.dateStr,
        pendingCapture.action,
        file,
      );
      setQueueMessage(null);
      void refetch();
    } catch {
      try {
        const imageDataUrl = await fileToDataUrl(file);
        enqueueQueueItem({
          id: `${pendingCapture.staff.id}-${pendingCapture.dateStr}-${pendingCapture.action}-${Date.now()}`,
          staffId: pendingCapture.staff.id,
          date: pendingCapture.dateStr,
          action: pendingCapture.action,
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
      setPendingCapture(null);
    }
  };

  const rangeFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  });
  const startYear = dateRange.start.year;
  const endYear = dateRange.end.year;
  const displayDateText =
    startYear === endYear
      ? `${rangeFormatter.format(dateRange.start.toDate(timeZone))} – ${rangeFormatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`
      : `${rangeFormatter.format(dateRange.start.toDate(timeZone))}, ${startYear} – ${rangeFormatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`;

  return (
    <div className="space-y-5">
      {/* FILTER HEADER */}
      <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
        <TextField aria-label="Cari staf" className="w-full md:w-72">
          <InputGroup className="h-10 overflow-hidden rounded-full border border-border bg-transparent shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <InputGroup.Prefix className="flex items-center bg-transparent pl-4 pr-2 text-muted">
              <MagnifyingGlass weight="bold" className="h-4 w-4" />
            </InputGroup.Prefix>
            <InputGroup.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staf..."
              className="h-full w-full bg-transparent px-2 text-sm outline-none"
            />
          </InputGroup>
        </TextField>

        <div className="flex h-10 w-full items-center justify-between overflow-visible rounded-full border border-border shadow-sm md:w-auto">
          <button
            onClick={() => handleDateChange("prev")}
            className="flex h-full w-10 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent active:scale-95"
          >
            <CaretLeft weight="bold" className="h-3.5 w-3.5" />
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-[13px] font-semibold text-foreground outline-none hover:bg-surface-secondary/50 md:min-w-52">
                <CalendarBlank
                  weight="bold"
                  className="h-3.5 w-3.5 shrink-0 text-muted"
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
            className="flex h-full w-10 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent active:scale-95"
          >
            <CaretRight weight="bold" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* DESKTOP: Matrix Table */}
      <div className="hidden md:block relative w-full overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="w-full min-w-max border-collapse whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md shadow-[0_1px_0_0_var(--color-border)]">
              <tr>
                <th className="sticky left-0 z-40 min-w-[220px] max-w-[220px] border-r border-border/50 bg-background/95 px-4 py-5 text-[11px] font-bold uppercase tracking-wider text-muted shadow-[1px_0_0_0_var(--color-border)] align-middle">
                  Staf
                </th>
                {gridDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className={`min-w-[110px] border-r border-border/30 px-2 py-4 text-center align-middle last:border-r-0 ${day.isToday ? "bg-accent/5" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${day.isToday ? "text-accent" : "text-muted"}`}
                      >
                        {day.name}
                      </span>
                      <span
                        className={`text-[13px] font-semibold ${day.isToday ? "text-accent" : "text-foreground"}`}
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
                    className="py-16 text-center text-sm text-muted"
                  >
                    <CircleNotch className="h-4 w-4 animate-spin inline mr-2" />
                    Memuat...
                  </td>
                </tr>
              ) : displayStaffs.length === 0 ? (
                <tr>
                  <td
                    colSpan={gridDays.length + 1}
                    className="py-16 text-center text-sm text-muted"
                  >
                    Tidak ada data staf.
                  </td>
                </tr>
              ) : (
                displayStaffs.map((staff) => (
                  <tr
                    key={staff.id}
                    className="group/row border-b border-border transition-colors hover:bg-surface-secondary/30"
                  >
                    <td className="sticky left-0 z-20 min-w-[220px] max-w-[220px] border-r border-border/50 bg-background px-4 py-3 shadow-[1px_0_0_0_var(--color-border)] group-hover/row:bg-surface/90">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/40">
                          <Avatar.Image
                            src={resolvePhotoUrl(staff.avatar_path) ?? ""}
                          />
                          <Avatar.Fallback className="text-xs font-bold text-muted">
                            {staff.first_name?.charAt(0) || "U"}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {staff.first_name} {staff.last_name || ""}
                          </span>
                          <span className="block truncate text-[10px] font-medium text-muted">
                            {staff.job_title}
                          </span>
                        </div>
                      </div>
                    </td>
                    {gridDays.map((day) => {
                      const att = attendanceMap[staff.id]?.[day.dateStr];
                      const isSelected =
                        selectedCell?.staff.id === staff.id &&
                        selectedCell.dateStr === day.dateStr;
                      return (
                        <td
                          key={day.dateStr}
                          onClick={() =>
                            handleCellClick(staff, day.dateStr, att)
                          }
                          className={`cursor-pointer border-r border-border/30 p-2 align-middle last:border-r-0 transition-colors ${isSelected ? "bg-accent/10" : day.isToday ? "bg-accent/5" : ""} hover:bg-accent/5`}
                        >
                          <div className="flex flex-col items-center gap-1 rounded-lg px-1 py-2">
                            {getCompactBadge(att)}
                            <span className="text-[10px] text-muted">
                              {att?.clock_in
                                ? `${formatTime(att.clock_in)} / ${att.clock_out ? formatTime(att.clock_out) : "..."}`
                                : "—"}
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

      {/* MOBILE: Stacked List */}
      <div className="md:hidden flex flex-col gap-3 pb-10">
        {isLoading || isStaffLoading ? (
          <div className="py-16 text-center text-sm text-muted flex items-center justify-center gap-2">
            <CircleNotch className="h-4 w-4 animate-spin" />
            Memuat data...
          </div>
        ) : displayStaffs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted rounded-2xl border border-dashed border-border/60">
            Tidak ada data staf.
          </div>
        ) : (
          displayStaffs.map((staff) => (
            <div
              key={staff.id}
              className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/50">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/40">
                  <Avatar.Image
                    src={resolvePhotoUrl(staff.avatar_path) ?? ""}
                  />
                  <Avatar.Fallback className="text-xs font-bold text-muted">
                    {staff.first_name?.charAt(0) || "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div>
                  <span className="block text-sm font-semibold text-foreground">
                    {staff.first_name} {staff.last_name || ""}
                  </span>
                  <span className="text-[10px] font-medium text-muted">
                    {staff.job_title}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border/40 px-4">
                {gridDays.map((day) => {
                  const att = attendanceMap[staff.id]?.[day.dateStr];
                  const isSelected =
                    selectedCell?.staff.id === staff.id &&
                    selectedCell.dateStr === day.dateStr;
                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => handleCellClick(staff, day.dateStr, att)}
                      className={`flex items-center justify-between py-2.5 cursor-pointer transition-colors active:opacity-60 ${isSelected ? "bg-accent/5 -mx-4 px-4" : day.isToday ? "bg-surface-secondary/30 -mx-4 px-4" : ""}`}
                    >
                      <span className="text-xs text-muted">
                        {day.name}, {day.shortDate}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          {formatTime(att?.clock_in || null)} /{" "}
                          {formatTime(att?.clock_out || null)}
                        </span>
                        {getCompactBadge(att)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* UNIFIED SHEET */}
      <AttendanceSheet
        selection={selectedCell}
        view={sheetView}
        onClose={() => setSelectedCell(null)}
        onStartCapture={handleStartCapture}
        onSwitchView={setSheetView}
        queueMessage={queueMessage}
      />

      {/* CAMERA MODAL */}
      <AttendanceSelfieModal
        isOpen={cameraOpen}
        title={
          pendingCapture?.action === "clock_out"
            ? "Selfie Absen Pulang"
            : "Selfie Absen Masuk"
        }
        description={
          pendingCapture
            ? `${pendingCapture.staff.first_name} · ${pendingCapture.dateStr}`
            : ""
        }
        actionLabel={
          pendingCapture?.action === "clock_out"
            ? "Ambil Foto Pulang"
            : "Ambil Foto Masuk"
        }
        isUploading={isUploading}
        statusMessage={cameraStatus}
        onClose={() => {
          setCameraOpen(false);
          setPendingCapture(null);
        }}
        onCapture={(f) => void handleSelfieCaptured(f)}
      />
    </div>
  );
}
