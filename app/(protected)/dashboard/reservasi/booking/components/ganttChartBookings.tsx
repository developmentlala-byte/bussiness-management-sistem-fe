"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@heroui/react";
import {
  FlowerLotus,
  Hand,
  Drop,
  Sparkle,
  UserCircle,
  X,
  Clock,
  Wallet,
  CalendarBlank,
  CaretRight,
} from "@phosphor-icons/react";
import { useApiFetch } from "@/app/libs/use-http";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_WIDTH = 136; // px per hour
const MIN_WIDTH = HOUR_WIDTH / 60;
const Y_AXIS_W = 150;
const LANE_H = 82; // px per overlap lane
const LANE_PAD = 8; // top & bottom padding within a lane

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface SpaBooking {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  therapist_name: string;
  therapists?: string[];
  schedule_date: string;
  duration_minutes: number;
  service_variants: {
    id: number;
    duration_minutes: number;
    name: string;
    retail_price: number;
  }[];
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  payment_status: string;
  total_amount: number;
}

type BookingMeta = SpaBooking & {
  timeStr: string;
  lane: number;
  laneCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const parseISO = (iso: string) => {
  const d = new Date(iso);
  return {
    dateStr: toDateStr(d),
    timeStr: `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`,
  };
};

const addMin = (time: string, min: number) => {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(
    t % 60,
  ).padStart(2, "0")}`;
};

const fmtDur = (min: number) => {
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60),
    r = min % 60;
  return r ? `${h}j ${r}m` : `${h} jam`;
};

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

type Cat = "massage" | "nail" | "facial" | "spa";
const toCat = (name: string): Cat => {
  const s = name?.toLowerCase() ?? "";
  if (s.includes("nail")) return "nail";
  if (s.includes("facial") || s.includes("brightening")) return "facial";
  if (s.includes("stone") || s.includes("himalayan")) return "spa";
  return "massage";
};

const CAT_ICONS: Record<Cat, React.ReactNode> = {
  massage: <FlowerLotus weight="duotone" className="size-3" />,
  nail: <Hand weight="duotone" className="size-3" />,
  facial: <Sparkle weight="duotone" className="size-3" />,
  spa: <Drop weight="duotone" className="size-3" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS THEME  — follows globals.css CSS variables
// ─────────────────────────────────────────────────────────────────────────────
type Theme = {
  block: string;
  clientTx: string;
  metaTx: string;
  badge: string;
  dot: string;
};

const STATUS: Record<string, Theme> = {
  Confirmed: {
    block: "bg-[var(--surface)] border-l-[var(--accent)]",
    clientTx: "text-[var(--foreground)]",
    metaTx: "text-[var(--muted)]",
    badge: "bg-[var(--surface-secondary)] text-[var(--accent)]",
    dot: "bg-[var(--accent)]",
  },
  Pending: {
    block: "bg-[var(--warning)]/10 border-l-[var(--warning)]",
    clientTx: "text-[var(--foreground)]",
    metaTx: "text-[var(--warning)]",
    badge: "bg-[var(--warning)]/20 text-[var(--warning)]",
    dot: "bg-[var(--warning)]",
  },
  Completed: {
    block: "bg-[var(--success)]/10 border-l-[var(--success)]",
    clientTx: "text-[var(--foreground)]",
    metaTx: "text-[var(--success)]",
    badge: "bg-[var(--success)]/20 text-[var(--success)]",
    dot: "bg-[var(--success)]",
  },
  Cancelled: {
    block: "bg-[var(--danger)]/10 border-l-[var(--danger)] opacity-60",
    clientTx: "text-[var(--danger)]",
    metaTx: "text-[var(--danger)]",
    badge: "bg-[var(--danger)]/20 text-[var(--danger)]",
    dot: "bg-[var(--danger)]",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LANE ASSIGNMENT  (greedy interval scheduling — O(n log n))
//
// Bookings sorted by start time. Each booking is placed in the first
// available lane whose last occupant has already ended. If none is free,
// a new lane is opened. This prevents any visual overlap.
// ─────────────────────────────────────────────────────────────────────────────
function assignLanes(
  events: (SpaBooking & { timeStr: string })[],
): BookingMeta[] {
  const sorted = [...events].sort((a, b) => a.timeStr.localeCompare(b.timeStr));
  const laneEnds: string[] = []; // last end-time per lane

  const assigned = sorted.map((ev) => {
    const end = addMin(ev.timeStr, ev.duration_minutes);
    let lane = laneEnds.findIndex((e) => e <= ev.timeStr);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { ...ev, lane };
  });

  const laneCount = Math.max(laneEnds.length, 1);
  return assigned.map((ev) => ({ ...ev, laneCount }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
const DAY_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "long" });
const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const DATE_LONG_FMT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND BADGE
// ─────────────────────────────────────────────────────────────────────────────
function LegendItem({ label, status }: { label: string; status: string }) {
  const t = STATUS[status];
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-sm border border-border border-l-2",
          t.block,
        )}
      />
      <span className="text-[10px] text-[var(--muted)]">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY DETAIL MODAL
// Rendered via createPortal so it sits outside the scrollable Gantt container.
// Opens as a bottom sheet on mobile, centered card on sm+.
// ─────────────────────────────────────────────────────────────────────────────
interface DayDetailModalProps {
  date: Date;
  events: (SpaBooking & { timeStr: string })[];
  onClose: () => void;
}

function DayDetailModal({ date, events, onClose }: DayDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ESC to dismiss
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.timeStr.localeCompare(b.timeStr)),
    [events],
  );

  const stats = useMemo(() => {
    const confirmed = events.filter((e) => e.status === "Confirmed").length;
    const pending = events.filter((e) => e.status === "Pending").length;
    const completed = events.filter((e) => e.status === "Completed").length;
    const cancelled = events.filter((e) => e.status === "Cancelled").length;
    const totalRevenue = events
      .filter((e) => e.status !== "Cancelled")
      .reduce((s, e) => s + e.total_amount, 0);
    return { confirmed, pending, completed, cancelled, totalRevenue };
  }, [events]);

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />

      {/* Modal card */}
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-[520px] max-h-[90dvh] flex flex-col",
          "rounded-t-3xl sm:rounded-2xl",
          "bg-background border border-border",
          "shadow-2xl shadow-black/30",
          "animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out",
        )}
      >
        {/* ── Mobile drag handle ── */}
        <div className="sm:hidden flex justify-center pt-3 shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-[var(--muted)]/25" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <CalendarBlank
                weight="duotone"
                className="size-[22px] text-[var(--accent)]"
              />
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)] mb-0.5">
                Jadwal Harian
              </p>
              <h3 className="text-[15px] font-semibold text-[var(--foreground)] leading-tight capitalize">
                {DATE_LONG_FMT.format(date)}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
              "bg-[var(--surface)] hover:bg-[var(--surface-secondary)]",
              "text-[var(--muted)] hover:text-[var(--foreground)]",
              "transition-colors",
            )}
          >
            <X weight="bold" className="size-3.5" />
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 divide-x divide-border border-b border-border shrink-0">
          {[
            { label: "Confirmed", value: stats.confirmed, status: "Confirmed" },
            { label: "Pending", value: stats.pending, status: "Pending" },
            { label: "Selesai", value: stats.completed, status: "Completed" },
            { label: "Batal", value: stats.cancelled, status: "Cancelled" },
          ].map((s) => {
            const t = STATUS[s.status];
            return (
              <div
                key={s.status}
                className="flex flex-col items-center py-3 gap-0.5"
              >
                <span
                  className={cn(
                    "text-[18px] font-bold tabular-nums",
                    t.clientTx,
                  )}
                >
                  {s.value}
                </span>
                <span className="text-[8.5px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Booking list ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar)_transparent]">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <CalendarBlank
                weight="duotone"
                className="size-12 text-[var(--muted)]/30 mb-3"
              />
              <p className="text-sm font-medium text-[var(--muted)]">
                Tidak ada jadwal
              </p>
              <p className="text-xs text-[var(--muted)]/60 mt-1">
                Belum ada reservasi untuk tanggal ini
              </p>
            </div>
          ) : (
            sorted.map((event) => {
              const endTime = addMin(event.timeStr, event.duration_minutes);
              const cat = toCat(event.service_name);
              const th = STATUS[event.status] ?? STATUS.Confirmed;
              const therapists =
                (event.therapists ?? [event.therapist_name])
                  .filter(Boolean)
                  .join(", ") || "—";

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex gap-3.5 rounded-xl border border-[var(--border)]/60 border-l-[3px] p-3.5",
                    "hover:shadow-sm hover:shadow-black/5 transition-shadow duration-150",
                    th.block,
                  )}
                >
                  {/* Time spine */}
                  <div className="flex flex-col items-center shrink-0 min-w-[48px] pt-0.5">
                    <span
                      className={cn(
                        "text-[11px] font-extrabold tabular-nums",
                        th.metaTx,
                      )}
                    >
                      {event.timeStr}
                    </span>
                    <div
                      className={cn(
                        "w-[1.5px] flex-1 my-1.5 rounded-full min-h-[20px] opacity-20",
                        th.dot,
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] tabular-nums opacity-75",
                        th.metaTx,
                      )}
                    >
                      {endTime}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Name + booking code + status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13px] font-bold leading-tight truncate",
                            th.clientTx,
                          )}
                        >
                          {event.customer_name}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]/60 font-mono mt-0.5 tracking-tight">
                          {event.booking_code}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-[3px]",
                          "text-[8.5px] font-extrabold uppercase tracking-widest leading-none mt-0.5",
                          th.badge,
                        )}
                      >
                        {event.status}
                      </span>
                    </div>

                    {/* Service */}
                    <div className="flex items-center gap-1.5">
                      <span className={cn("shrink-0", th.metaTx)}>
                        {CAT_ICONS[cat]}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] truncate font-medium",
                          th.metaTx,
                        )}
                      >
                        {event.service_name}
                      </span>
                    </div>

                    {/* Therapist */}
                    <div className="flex items-center gap-1.5">
                      <UserCircle
                        weight="duotone"
                        className={cn("size-3 shrink-0", th.metaTx)}
                      />
                      <span className={cn("text-[11px] truncate", th.metaTx)}>
                        {therapists}
                      </span>
                    </div>

                    {/* Duration + Amount */}
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/40">
                      <div className="flex items-center gap-1">
                        <Clock
                          weight="duotone"
                          className={cn("size-3 shrink-0", th.metaTx)}
                        />
                        <span
                          className={cn("text-[10px] font-semibold", th.metaTx)}
                        >
                          {fmtDur(event.duration_minutes)}
                        </span>
                      </div>
                      <span
                        className={cn("text-[11px] font-extrabold", th.metaTx)}
                      >
                        {fmtIDR(event.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 border-t border-border bg-[var(--surface)]/60 rounded-b-[inherit] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">
              {sorted.length}
            </span>{" "}
            reservasi total
          </span>
          <div className="flex items-center gap-1.5">
            <Wallet
              weight="duotone"
              className="size-3.5 text-[var(--accent)]"
            />
            <span className="text-[12px] font-bold text-[var(--foreground)]">
              {fmtIDR(stats.totalRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GanttChartBookings() {
  const { data } = useApiFetch<{ data: SpaBooking[] }>(
    ["bookings"],
    "/master/bookings",
  );
  const bookings = data?.data ?? [];

  // Tracks which day's detail modal is open
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    events: (SpaBooking & { timeStr: string })[];
  } | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [today],
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, (SpaBooking & { timeStr: string })[]>();
    bookings.forEach((b) => {
      const { dateStr, timeStr } = parseISO(b.schedule_date);
      const list = map.get(dateStr) ?? [];
      list.push({ ...b, timeStr });
      map.set(dateStr, list);
    });
    return map;
  }, [bookings]);

  const nowPx = useMemo(() => {
    const n = new Date();
    const min = (n.getHours() - START_HOUR) * 60 + n.getMinutes();
    return { px: min * MIN_WIDTH, show: min > 0 && min < TOTAL_HOURS * 60 };
  }, []);

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-2xl bg-background border border-border shadow-sm text-[var(--foreground)] mb-8">
        {/* ── Grain overlay ── */}
        <div
          className="pointer-events-none absolute inset-0 z-50 opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)"/%3E%3C/svg%3E')`,
          }}
        />

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b-[0.5px] border-border bg-muted/40">
          <div>
            <h2 className="text-2xl font-semibold tracking-wide text-[var(--foreground)]">
              Schedule Overview
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Timeline reservasi untuk 7 hari ke depan.{" "}
              <span className="opacity-60">
                Klik tanggal untuk lihat detail.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <LegendItem label="Confirmed" status="Confirmed" />
            <LegendItem label="Pending" status="Pending" />
            <LegendItem label="Completed" status="Completed" />
            <LegendItem label="Cancelled" status="Cancelled" />
          </div>
        </div>

        {/* ── Scrollable timeline ── */}
        <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--scrollbar)_transparent]">
          <div style={{ minWidth: Y_AXIS_W + TOTAL_HOURS * HOUR_WIDTH }}>
            {/* ── Hour header (sticky top) ── */}
            <div className="flex border-b-[0.5px] border-border bg-background/40 sticky top-0 z-30">
              <div
                className="shrink-0 border-r-[0.5px] border-border"
                style={{ width: Y_AXIS_W }}
              />
              <div className="relative flex flex-1">
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="shrink-0 relative py-2.5"
                    style={{ width: i < hours.length - 1 ? HOUR_WIDTH : 0 }}
                  >
                    <span className="absolute -left-4 text-[10px]/[14px] font-semibold text-[var(--muted)] whitespace-nowrap">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Day rows ── */}
            {days.map((dayDate) => {
              const dateStr = toDateStr(dayDate);
              const isToday = dateStr === todayStr;
              const rawEvents = byDate.get(dateStr) ?? [];

              // Assign overlap lanes — this is the core fix
              const events = assignLanes(rawEvents);
              const laneCount = events[0]?.laneCount ?? 1;
              const rowH = Math.max(laneCount * LANE_H, 104);

              const activeCount = rawEvents.filter(
                (e) => e.status !== "Cancelled",
              ).length;

              return (
                <div
                  key={dateStr}
                  className="flex border-b-[0.5px] border-border last:border-b-0 group/row"
                >
                  {/* ── Date label — clickable button ── */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDay({ date: dayDate, events: rawEvents })
                    }
                    className={cn(
                      "sticky left-0 z-20 shrink-0 flex flex-col justify-center gap-0.5",
                      "border-r-[0.5px] border-border px-5 py-4 text-left",
                      "transition-colors duration-150 group/datebtn",
                      "ring-inset focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 outline-none",
                      isToday
                        ? "bg-background/95 hover:bg-[var(--accent)]/5"
                        : "bg-background/95 hover:bg-muted/50",
                    )}
                    style={{ width: Y_AXIS_W, minHeight: rowH }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
                      {DAY_FMT.format(dayDate)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tracking-wide mt-0.5",
                        isToday
                          ? "text-[var(--accent)]"
                          : "text-[var(--foreground)]",
                      )}
                    >
                      {DATE_FMT.format(dayDate)}
                    </span>
                    {isToday && (
                      <span className="mt-1.5 self-start rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-[var(--accent)]">
                        Hari Ini
                      </span>
                    )}
                    {activeCount > 0 && (
                      <span className="mt-1 text-[9px] text-[var(--muted)]">
                        {activeCount} sesi aktif
                      </span>
                    )}
                    {/* Hover cue — appears on hover */}
                    <span className="mt-2 flex items-center gap-0.5 opacity-0 group-hover/datebtn:opacity-100 transition-opacity duration-150 text-[var(--accent)]">
                      <span className="text-[8px] font-bold uppercase tracking-widest">
                        Detail
                      </span>
                      <CaretRight weight="bold" className="size-2.5" />
                    </span>
                  </button>

                  {/* ── Timeline area ── */}
                  <div
                    className={cn(
                      "relative",
                      isToday
                        ? "bg-[var(--background)]"
                        : "bg-[var(--surface)]",
                    )}
                    style={{ width: TOTAL_HOURS * HOUR_WIDTH, minHeight: rowH }}
                  >
                    {/* Alternating hour bands */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) =>
                      i % 2 === 1 ? (
                        <div
                          key={`band-${i}`}
                          className="absolute inset-y-0 bg-[var(--surface-secondary)]/40"
                          style={{ left: i * HOUR_WIDTH, width: HOUR_WIDTH }}
                        />
                      ) : null,
                    )}

                    {/* Hour vertical lines */}
                    {Array.from({ length: TOTAL_HOURS - 1 }).map((_, i) => (
                      <div
                        key={`vl-${i}`}
                        className="absolute inset-y-0 border-r-[0.5px] border-[var(--border)]"
                        style={{ left: (i + 1) * HOUR_WIDTH }}
                      />
                    ))}

                    {/* Half-hour dashed ticks */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div
                        key={`hl-${i}`}
                        className="absolute inset-y-0 border-r-[0.5px] border-dashed border-[var(--border)]/50"
                        style={{ left: i * HOUR_WIDTH + HOUR_WIDTH / 2 }}
                      />
                    ))}

                    {/* "Now" indicator */}
                    {isToday && nowPx.show && (
                      <div
                        className="absolute top-0 bottom-0 z-20 pointer-events-none"
                        style={{ left: nowPx.px }}
                      >
                        <div className="absolute top-0 bottom-0 w-px bg-[var(--accent)]/55" />
                        <div className="absolute -top-px -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--accent)]" />
                      </div>
                    )}

                    {/* ── Booking blocks — lane-positioned, zero overlap ── */}
                    {events.map((event) => {
                      const [hStr, mStr] = event.timeStr.split(":");
                      const minFromStart =
                        (parseInt(hStr) - START_HOUR) * 60 + parseInt(mStr);
                      if (minFromStart < 0 || minFromStart >= TOTAL_HOURS * 60)
                        return null;

                      const leftPx = minFromStart * MIN_WIDTH;
                      const widthPx = event.duration_minutes * MIN_WIDTH;

                      // Vertical position from lane assignment
                      const topPx = event.lane * LANE_H + LANE_PAD;
                      const blockH = LANE_H - LANE_PAD * 2;

                      const endTime = addMin(
                        event.timeStr,
                        event.duration_minutes,
                      );
                      const cat = toCat(event.service_name);
                      const th = STATUS[event.status] ?? STATUS.Confirmed;

                      const serviceName =
                        event?.service_variants?.length >= 2
                          ? event.service_variants[0].name
                          : event.service_name;

                      const showService = widthPx >= 100;
                      const showTherapist = widthPx >= 155;
                      const showDurBadge = widthPx >= 125;

                      return (
                        <div
                          key={event.id}
                          title={[
                            event.customer_name,
                            event.service_name,
                            `Therapist: ${
                              (event.therapists ?? [event.therapist_name]).join(
                                ", ",
                              ) || "—"
                            }`,
                            `${event.timeStr} – ${endTime}`,
                            `Durasi: ${fmtDur(event.duration_minutes)}`,
                            `Status: ${event.status}`,
                          ].join("\n")}
                          className="absolute z-10 cursor-pointer hover:z-30"
                          style={{
                            left: leftPx + 2,
                            width: widthPx - 4,
                            top: topPx,
                            height: blockH,
                          }}
                          onClick={() =>
                            setSelectedDay({
                              date: dayDate,
                              events: rawEvents,
                            })
                          }
                        >
                          {/* ─── Card ─── */}
                          <div
                            className={cn(
                              "absolute inset-0 flex flex-col gap-[3px] rounded-lg overflow-hidden",
                              "border border-[var(--border)]/80 border-l-[3px]",
                              "px-2.5 py-2",
                              "transition-all duration-150",
                              "hover:shadow-md hover:shadow-black/10 hover:-translate-y-px",
                              th.block,
                            )}
                          >
                            {/* Row 1: Time range + duration badge */}
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <span
                                className={cn(
                                  "text-[9px] font-bold tracking-tight shrink-0 whitespace-nowrap",
                                  th.metaTx,
                                )}
                              >
                                {event.timeStr}&thinsp;—&thinsp;{endTime}
                              </span>
                              {showDurBadge && (
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-1.5 py-0.5 leading-none",
                                    "text-[9px] font-bold uppercase tracking-wide",
                                    th.badge,
                                  )}
                                >
                                  {fmtDur(event.duration_minutes)}
                                </span>
                              )}
                            </div>

                            {/* Row 2: Client name */}
                            <p
                              className={cn(
                                "truncate text-[12px] font-bold leading-none",
                                th.clientTx,
                              )}
                            >
                              {event.customer_name}
                            </p>

                            {/* Row 3: Service + icon */}
                            {showService && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={cn("shrink-0", th.metaTx)}>
                                  {CAT_ICONS[cat]}
                                </span>
                                <p
                                  className={cn(
                                    "truncate text-[10px] leading-none",
                                    th.metaTx,
                                  )}
                                >
                                  {serviceName}
                                </p>
                              </div>
                            )}

                            {/* Row 4: Therapist */}
                            {showTherapist && (
                              <div className="flex items-center gap-1 min-w-0">
                                <UserCircle
                                  weight="duotone"
                                  className={cn("shrink-0 size-3", th.metaTx)}
                                />
                                <span
                                  className={cn(
                                    "truncate text-[10px] leading-none opacity-80",
                                    th.metaTx,
                                  )}
                                >
                                  {(
                                    event.therapists ?? [event.therapist_name]
                                  ).join(", ") || "—"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Detail Modal — portal-rendered, outside scroll container */}
      {selectedDay && (
        <DayDetailModal
          date={selectedDay.date}
          events={selectedDay.events}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
