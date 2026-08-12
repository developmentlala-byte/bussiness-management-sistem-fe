"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@heroui/react";
import {
  FlowerLotus,
  Hand,
  Drop,
  Sparkle,
  UserCircle,
  UsersThree,
  Copy,
  CheckCircle,
  X,
  Clock,
  Wallet,
  CalendarBlank,
  CaretRight,
  CaretLeft,
} from "@phosphor-icons/react";
import {
  SpaBooking,
  isBundlePromoLine,
  getSpaBookingDuration,
  BookingTherapist,
} from "@/app/types/booking";
import { useApiFetch } from "@/app/libs/use-http";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const START_HOUR = 10;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_WIDTH_DAILY = 136;
const HOUR_WIDTH_THERAPIST = 200;
const Y_AXIS_W = 150;
// LANE_H dinaikin dari 82 -> 116 supaya cukup buat 4 baris info
// (jam+durasi, nama client, service, terapis) tanpa ada yang kepotong overflow-hidden.
const LANE_H = 100;
const LANE_PAD = 8;
const DAYS_IN_VIEW = 7;
// MIN_LABEL_WIDTH dinaikin biar teks nggak kepaksa truncate parah di block pendek.
const MIN_LABEL_WIDTH = 150;

// Gantt fetch sendiri (nggak lagi ikut pagination tabel), jadi kita kasih
// limit yang cukup gede biar semua booking dalam window 7 hari kebawa dalam
// satu request. Ini bukan solusi ideal jangka panjang (endpoint /master/bookings
// masih eager-load relasi berat yang Gantt sendiri nggak butuh semua) — tapi
// aman dipakai sekarang tanpa nyentuh backend sama sekali.
const GANTT_FETCH_LIMIT = 500;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ScheduledBooking = SpaBooking & { timeStr: string; isSplitUnit?: boolean };
type BookingMeta = ScheduledBooking & { lane: number; laneCount: number };

type TherapistRecapItem = {
  key: string;
  time: string;
  endTime: string;
  serviceName: string;
  resourceName?: string;
  durationMinutes: number;
  status: string;
};

type TherapistRecapGroup = {
  therapistName: string;
  items: TherapistRecapItem[];
  totalDurationMinutes: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const addDays = (base: Date, amount: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + amount);
  return d;
};

const SCHEDULE_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

const parseSchedule = (raw: string) => {
  const m = SCHEDULE_RE.exec(raw);
  if (!m) {
    const d = new Date(raw);
    return { dateStr: toDateStr(d), timeStr: "00:00" };
  }
  const [, y, mo, da, h, mi] = m;
  return {
    dateStr: `${y}-${mo}-${da}`,
    timeStr: `${h}:${mi}`,
  };
};

const addMin = (time: string, min: number) => {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(
    t % 60,
  ).padStart(2, "0")}`;
};

const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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
const RANGE_DAY_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
});

function formatRange(start: Date, end: Date) {
  const startLabel = RANGE_DAY_FMT.format(start);
  const endLabel = RANGE_DAY_FMT.format(end);
  const year = end.getFullYear();
  if (start.getFullYear() !== year) {
    return `${startLabel} ${start.getFullYear()} – ${endLabel} ${year}`;
  }
  return `${startLabel} – ${endLabel} ${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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

const trim = (s: string) => s.trim();

const getTherapistNames = (event: SpaBooking): string => {
  const therapists = event.therapists ?? [];

  if (therapists.length > 0) {
    const joined = therapists
      .map((t) => {
        if (typeof t === "string") return t;
        const name =
          (t as any).name ||
          (t as any).first_name ||
          (t as any).staff?.first_name ||
          "";
        const lastName =
          (t as any).last_name || (t as any).staff?.last_name || "";
        if (name) return trim(`${name} ${lastName}`);
        return null;
      })
      .filter(Boolean)
      .join(", ");
    return joined || "Belum Ditugaskan";
  }

  return event.therapist_name || "Belum Ditugaskan";
};

/**
 * Cari 1 line layanan spesifik berdasarkan ID varian — termasuk item di
 * dalam bundle promo (bukan cuma line bundle-nya). Dipakai saat memecah
 * booking per-terapis, supaya tiap potongan nampilin layanan yang BENAR
 * dikerjakan terapis itu, bukan gabungan semua layanan / nama bundle-nya.
 */
const findServiceVariantById = (
  serviceVariants: SpaBooking["service_variants"],
  variantId?: number | null,
) => {
  if (!variantId) return null;

  for (const line of serviceVariants ?? []) {
    if (isBundlePromoLine(line)) {
      const item = line.items?.find((i) => i.id === variantId);
      if (item) return item;
      continue;
    }
    if (line.id === variantId) return line;
  }

  return null;
};

const getEventServiceName = (event: SpaBooking, isSplit = false): string => {
  const parts: string[] = [];

  // Jika ini event hasil split (per terapis/item), kita tidak ingin menampilkan
  // nama bundle-nya lagi supaya tidak redundant dan tidak membingungkan.
  if (
    !isSplit &&
    event.booking_bundle_promos &&
    event.booking_bundle_promos.length > 0
  ) {
    event.booking_bundle_promos.forEach((b) => {
      parts.push(b.bundle_name || b.name || "Bundle Promo");
    });
  }

  event.service_variants?.forEach((line) => {
    if (isBundlePromoLine(line)) {
      const name = line.bundle_name || line.name;
      if (name && !parts.includes(name) && !isSplit) {
        parts.push(name);
      }
    } else {
      const qty = line?.quantity ?? 1;
      parts.push(`${line?.name}${!isSplit ? ` (${qty}x)` : ""}`);
    }
  });

  if (parts.length > 0) {
    return Array.from(new Set(parts)).join(", ");
  }

  if (event.service_name) return event.service_name;

  return "Spa Service";
};

/**
 * Mencari nama resource (ruangan/bed) yang sesuai untuk event tertentu.
 * Digunakan baik di timeline chart maupun di rekap modal.
 */
const getResourceName = (event: ScheduledBooking): string => {
  const firstVariant = event?.service_variants?.[0] as any;
  const firstTherapist = event?.therapists?.[0] as any;
  const assignments = event.resource_assignments ?? [];

  // 1. Match presisi pakai client_key therapist (kalau therapist udah ke-assign)
  const therapistClientKey = firstTherapist?.client_key;
  if (therapistClientKey) {
    const matchByKey = assignments.find(
      (r) => r.client_key === therapistClientKey,
    );
    if (matchByKey)
      return matchByKey.resource_code || matchByKey.resource_name || "";

    const parts = therapistClientKey.split(":");
    if (parts.length >= 3) {
      const vId = parseInt(parts[1], 10);
      const pIdx = parseInt(parts[2], 10);
      const matchByVariantAndPax = assignments.find((r) => {
        if (r.service_variant_id !== vId) return false;
        const rParts = r.client_key?.split(":") ?? [];
        return rParts.length >= 3 && parseInt(rParts[2], 10) === pIdx;
      });
      if (matchByVariantAndPax) {
        return (
          matchByVariantAndPax.resource_code ||
          matchByVariantAndPax.resource_name ||
          ""
        );
      }
    }
  }

  // 2. Belum ada therapist (client_key kosong) — pakai group_id dari
  // service_variant itu sendiri. Nolongin booking yang resource-nya
  // udah di-assign duluan sebelum staff-nya (therapists masih []).
  if (firstVariant?.group_id && firstVariant?.id) {
    const prefix = `${firstVariant.group_id}:${firstVariant.id}:`;
    const matchByGroupId = assignments.find((r) =>
      r.client_key?.startsWith(prefix),
    );
    if (matchByGroupId) {
      return matchByGroupId.resource_code || matchByGroupId.resource_name || "";
    }
  }

  // 3. Fallback paling kasar: assignment pertama yang service_variant_id-nya sama.
  if (firstVariant?.id) {
    const sameVariantAssignments = assignments.filter(
      (r) => r.service_variant_id === firstVariant.id,
    );
    if (sameVariantAssignments.length > 0) {
      return (
        sameVariantAssignments[0].resource_code ||
        sameVariantAssignments[0].resource_name ||
        ""
      );
    }
  }

  return "";
};

// Fallback nama client — kalau data kosong, tetep tampilkan label yang jelas
// daripada block-nya keliatan "kosong"/blank.
const getClientDisplayName = (event: SpaBooking): string =>
  event.customer_name?.trim() || "Tanpa Nama";

const isBonusChildBooking = (event: SpaBooking) =>
  event.booking_type === "bonus_child" || Boolean(event.parent_booking_id);

const addBookingToMap = (
  map: Map<string, ScheduledBooking[]>,
  booking: SpaBooking,
) => {
  const { dateStr, timeStr } = parseSchedule(booking.schedule_date);
  const list = map.get(dateStr) ?? [];
  list.push({
    ...booking,
    timeStr,
    duration_minutes: getSpaBookingDuration(booking),
  });
  map.set(dateStr, list);
};

// ─────────────────────────────────────────────────────────────────────────────
// THERAPIST RECAP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function buildTherapistRecap(
  events: ScheduledBooking[],
  isSplit = false,
): TherapistRecapGroup[] {
  const groups = new Map<string, TherapistRecapItem[]>();

  events.forEach((event) => {
    const therapistName = getTherapistNames(event);
    const list = groups.get(therapistName) ?? [];

    list.push({
      key: String(event.id),
      time: event.timeStr,
      endTime: addMin(event.timeStr, event.duration_minutes),
      serviceName: getEventServiceName(event, isSplit),
      resourceName: getResourceName(event),
      durationMinutes: event.duration_minutes,
      status: event.status,
    });

    groups.set(therapistName, list);
  });

  return Array.from(groups.entries())
    .map(([therapistName, items]) => ({
      therapistName,
      items: [...items].sort((a, b) => a.time.localeCompare(b.time)),
      totalDurationMinutes: items.reduce(
        (sum, i) => sum + i.durationMinutes,
        0,
      ),
    }))
    .sort((a, b) => a.therapistName.localeCompare(b.therapistName));
}

function buildTherapistRecapText(
  date: Date,
  groups: TherapistRecapGroup[],
): string {
  const lines: string[] = [];
  lines.push(`Rekap Terapis — ${DATE_LONG_FMT.format(date)}`);
  lines.push("");

  if (groups.length === 0) {
    lines.push("Tidak ada jadwal terapis pada tanggal ini.");
    return lines.join("\n");
  }

  groups.forEach((g) => {
    lines.push(
      `${g.therapistName} — ${g.items.length} layanan (${fmtDur(g.totalDurationMinutes)})`,
    );
    g.items.forEach((item) => {
      const statusTag = item.status !== "Confirmed" ? ` [${item.status}]` : "";
      const resourceTag = item.resourceName ? ` (${item.resourceName})` : "";
      lines.push(
        `  ${item.time}–${item.endTime}  ${item.serviceName}${resourceTag}${statusTag}`,
      );
    });
    lines.push("");
  });

  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS THEME
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
// LANE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
function assignLanes(events: ScheduledBooking[]): BookingMeta[] {
  const sorted = [...events].sort((a, b) => a.timeStr.localeCompare(b.timeStr));
  const laneEnds: string[] = [];
  const bookingLanes = new Map<string, Set<number>>();

  const assigned = sorted.map((ev) => {
    const end = addMin(ev.timeStr, ev.duration_minutes);
    const bCode = ev.booking_code || ev.id || "unknown";

    if (!bookingLanes.has(bCode)) {
      bookingLanes.set(bCode, new Set());
    }
    const usedLanesForThisBooking = bookingLanes.get(bCode)!;

    let lane = 0;
    while (true) {
      const isFree = !laneEnds[lane] || laneEnds[lane] <= ev.timeStr;
      const isUnusedByBooking = !usedLanesForThisBooking.has(lane);

      if (isFree && isUnusedByBooking) {
        break;
      }
      lane++;
    }

    laneEnds[lane] = end;
    usedLanesForThisBooking.add(lane);

    return { ...ev, lane };
  });

  const laneCount = Math.max(laneEnds.length, 1);
  return assigned.map((ev) => ({ ...ev, laneCount }));
}

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
// DAY NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function DayNavControl({
  isAtToday,
  rangeLabel,
  onPrev,
  onNext,
  onToday,
  isLoading,
}: {
  isAtToday: boolean;
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Mundur 1 hari"
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          "text-[var(--muted)] hover:text-[var(--foreground)]",
          "hover:bg-[var(--surface-secondary)] active:scale-95",
          "transition-all duration-100",
        )}
      >
        <CaretLeft weight="bold" className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onToday}
        className={cn(
          "px-2.5 h-7 rounded-md flex items-center justify-center shrink-0",
          "text-[11px] font-medium tabular-nums whitespace-nowrap",
          "transition-colors duration-100",
          isAtToday
            ? "text-[var(--foreground)] cursor-default"
            : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]",
        )}
      >
        {isAtToday ? (
          "Hari Ini"
        ) : (
          <span className="flex items-center gap-1.5">
            {rangeLabel}
            <span className="text-[var(--accent)] text-[9px] font-semibold uppercase tracking-wide">
              Kembali
            </span>
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        aria-label="Maju 1 hari"
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          "text-[var(--muted)] hover:text-[var(--foreground)]",
          "hover:bg-[var(--surface-secondary)] active:scale-95",
          "transition-all duration-100",
        )}
      >
        <CaretRight weight="bold" className="size-3.5" />
      </button>

      {/* Indikator halus pas lagi fetch window tanggal baru — biar user tau
          timeline lagi update, bukan macet/freeze. */}
      {isLoading && (
        <span
          className="ml-1 size-1.5 rounded-full bg-[var(--accent)] animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING HOVER CARD
// ─────────────────────────────────────────────────────────────────────────────
interface HoverCardData {
  event: BookingMeta;
  rect: DOMRect;
}

function BookingHoverCard({ event, rect }: HoverCardData) {
  const CARD_W = 260;
  const GAP = 10;

  const openUpward = rect.top > 220;

  let left = rect.left + rect.width / 2 - CARD_W / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));

  const top = openUpward ? rect.top - GAP : rect.bottom + GAP;

  const endTime = addMin(event.timeStr, event.duration_minutes);
  const isSplit = Boolean(event.isSplitUnit);
  const displayServiceName = getEventServiceName(event, isSplit);
  const therapistName = getTherapistNames(event);
  const clientName = getClientDisplayName(event);
  const th = STATUS[event.status] ?? STATUS.Confirmed;
  const isBonus = isBonusChildBooking(event);

  return createPortal(
    <div
      className="fixed z-[200] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left,
        top,
        width: CARD_W,
        transform: openUpward ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="rounded-xl border border-[var(--border)] bg-background overflow-hidden shadow-xl shadow-black/20">
        <div className={cn("h-[3px] w-full", th.dot)} />

        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                th.badge,
              )}
            >
              {event.status}
            </span>
            <span className="text-[10.5px] font-bold tabular-nums text-[var(--muted)]">
              {event.timeStr}&thinsp;—&thinsp;{endTime}
            </span>
          </div>

          <p className="text-[13.5px] font-bold leading-tight text-[var(--foreground)] truncate">
            {clientName}
          </p>

          <div className="flex items-start gap-1.5">
            <span className="shrink-0 mt-[1px] text-[var(--muted)]">
              {CAT_ICONS[toCat(displayServiceName)]}
            </span>
            <span className="text-[11.5px] leading-snug text-[var(--muted)]">
              {displayServiceName}
              {isBonus && (
                <span className="ml-1.5 rounded-full bg-[var(--accent)]/10 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Bonus
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <UserCircle
              weight="duotone"
              className="size-3.5 shrink-0 text-[var(--muted)]"
            />
            <span className="text-[11.5px] text-[var(--muted)] truncate">
              {therapistName}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
            <div className="flex items-center gap-1">
              <Clock
                weight="duotone"
                className="size-3 shrink-0 text-[var(--muted)]"
              />
              <span className="text-[10px] font-semibold text-[var(--muted)]">
                {fmtDur(event.duration_minutes)}
              </span>
            </div>
            <span className="text-[12px] font-extrabold text-[var(--foreground)]">
              {fmtIDR(event.total_amount)}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE ROW
// PERUBAHAN UTAMA: dulu ada showService/showTherapist/showDurBadge yang
// nyembunyiin baris kalau widthPx kekecilan — itu penyebab info (nama client,
// nama terapis) ilang total di block yang sempit. Sekarang SEMUA baris info
// selalu dirender (pakai truncate biar tetep rapi kalau kepanjangan), jadi
// info paling parah cuma "..." dipotong, bukan hilang sama sekali.
// ─────────────────────────────────────────────────────────────────────────────
function TimelineRow({
  laneEvents,
  rowH,
  isToday,
  nowPx,
  onBlockClick,
  mode = "daily",
}: {
  laneEvents: BookingMeta[];
  rowH: number;
  isToday: boolean;
  nowPx: { px: number; show: boolean };
  onBlockClick: (event: BookingMeta) => void;
  mode?: "daily" | "therapist";
}) {
  const isTherapistMode = mode === "therapist";
  const hourWidth = isTherapistMode ? HOUR_WIDTH_THERAPIST : HOUR_WIDTH_DAILY;
  const minWidth = hourWidth / 60;

  const [hovered, setHovered] = useState<HoverCardData | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    event: BookingMeta,
  ) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    openTimer.current = setTimeout(() => setHovered({ event, rect }), 250);
  };

  const handleLeave = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setHovered(null), 120);
  };

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const findNextInLane = (currentIdx: number, lane: number) => {
    for (let i = currentIdx + 1; i < laneEvents.length; i++) {
      if (laneEvents[i].lane === lane) return laneEvents[i];
    }
    return null;
  };

  return (
    <div
      className={cn(
        "relative",
        isToday ? "bg-[var(--background)]" : "bg-[var(--surface)]",
      )}
      style={{ width: TOTAL_HOURS * hourWidth, minHeight: rowH }}
    >
      {/* Alternating hour bands */}
      {Array.from({ length: TOTAL_HOURS }).map((_, i) =>
        i % 2 === 1 ? (
          <div
            key={`band-${i}`}
            className="absolute inset-y-0 bg-[var(--surface-secondary)]/40"
            style={{ left: i * hourWidth, width: hourWidth }}
          />
        ) : null,
      )}

      {/* Hour vertical lines */}
      {Array.from({ length: TOTAL_HOURS - 1 }).map((_, i) => (
        <div
          key={`vl-${i}`}
          className="absolute inset-y-0 border-r-[0.5px] border-[var(--border)]"
          style={{ left: (i + 1) * hourWidth }}
        />
      ))}

      {/* Half-hour dashed ticks */}
      {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
        <div
          key={`hl-${i}`}
          className="absolute inset-y-0 border-r-[0.5px] border-dashed border-[var(--border)]/50"
          style={{ left: i * hourWidth + hourWidth / 2 }}
        />
      ))}

      {/* "Now" indicator */}
      {isToday && nowPx.show && (
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: nowPx.px * (minWidth / (HOUR_WIDTH_DAILY / 60)) }}
        >
          <div className="absolute top-0 bottom-0 w-px bg-[var(--accent)]/55" />
          <div className="absolute -top-px -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--accent)]" />
        </div>
      )}

      {/* Booking blocks — lane-positioned, zero overlap */}
      {laneEvents.map((event, idx) => {
        const [hStr, mStr] = event.timeStr.split(":");
        const minFromStart =
          (parseInt(hStr) - START_HOUR) * 60 + parseInt(mStr);
        if (minFromStart < 0 || minFromStart >= TOTAL_HOURS * 60) {
          return null;
        }

        const leftPx = minFromStart * minWidth;
        const naturalWidthPx = event.duration_minutes * minWidth;

        const nextInLane = findNextInLane(idx, event.lane);
        const nextStartMin = nextInLane
          ? (parseInt(nextInLane.timeStr.split(":")[0]) - START_HOUR) * 60 +
            parseInt(nextInLane.timeStr.split(":")[1])
          : TOTAL_HOURS * 60;
        const maxAvailablePx = Math.max(
          naturalWidthPx,
          (nextStartMin - minFromStart) * minWidth - 4,
        );

        const widthPx = Math.min(
          Math.max(naturalWidthPx, MIN_LABEL_WIDTH),
          maxAvailablePx,
        );

        const topPx = event.lane * LANE_H + LANE_PAD;
        const blockH = LANE_H - LANE_PAD * 2;

        const endTime = addMin(event.timeStr, event.duration_minutes);
        const displayServiceName = getEventServiceName(event, isTherapistMode);
        const cat = toCat(displayServiceName);
        const th = STATUS[event.status] ?? STATUS.Confirmed;
        const isBonus = isBonusChildBooking(event);
        const clientName = getClientDisplayName(event);
        const therapistName = getTherapistNames(event);
        const resourceName = getResourceName(event);

        const serviceName = displayServiceName;

        return (
          <div
            key={`${event.id}-${idx}`}
            className="absolute z-10 cursor-pointer hover:z-30"
            style={{
              left: leftPx + 2,
              width: widthPx - 4,
              top: topPx,
              height: blockH,
            }}
            onClick={() => onBlockClick(event)}
            onMouseEnter={(e) => handleEnter(e, event)}
            onMouseLeave={handleLeave}
          >
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
              {/* Row 1: Time range + duration badge — selalu tampil */}
              <div className="flex items-center justify-between gap-1 min-w-0">
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-tight shrink-0 whitespace-nowrap",
                    th.metaTx,
                  )}
                >
                  {event.timeStr}&thinsp;—&thinsp;{endTime}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 leading-none",
                    "text-[9px] font-bold uppercase tracking-wide",
                    th.badge,
                  )}
                >
                  {fmtDur(event.duration_minutes)}
                </span>
              </div>

              {/* Row 2: Title — nama client (daily) / nama service (therapist mode) */}
              <p
                className={cn(
                  "truncate text-[12px] font-bold leading-none",
                  th.clientTx,
                )}
              >
                {isTherapistMode ? serviceName : clientName}
              </p>

              {/* Row 3: Subtitle — selalu tampil, ga lagi digantung sama width */}
              <div className="flex items-center gap-1 min-w-0">
                {isTherapistMode ? (
                  <UserCircle
                    weight="duotone"
                    className={cn("shrink-0 size-3", th.metaTx)}
                  />
                ) : (
                  <span className={cn("shrink-0", th.metaTx)}>
                    {CAT_ICONS[cat]}
                  </span>
                )}
                <p
                  className={cn("truncate text-[10px] leading-none", th.metaTx)}
                >
                  {isTherapistMode ? therapistName : displayServiceName}
                </p>
                {isBonus && (
                  <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                    Bonus
                  </span>
                )}
              </div>

              {/* Row 4: Nama terapis — cuma di daily mode (therapist mode udah
                  nampilin nama terapis di Row 3), sekarang selalu tampil */}
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
                  {!isTherapistMode ? therapistName : clientName}
                  {isTherapistMode ? ` | ${resourceName}` : ""}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {hovered && (
        <BookingHoverCard event={hovered.event} rect={hovered.rect} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface DayDetailModalProps {
  date: Date;
  events: ScheduledBooking[];
  onClose: () => void;
}

function DayDetailModal({ date, events, onClose }: DayDetailModalProps) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
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
      .reduce((sum, e) => sum + Number(e.total_amount), 0);
    return { confirmed, pending, completed, cancelled, totalRevenue };
  }, [events]);

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />

      <div
        className={cn(
          "relative z-10 w-full sm:max-w-[520px] max-h-[90dvh] flex flex-col",
          "rounded-t-3xl sm:rounded-2xl",
          "bg-background border border-border",
          "shadow-2xl shadow-black/30",
          "animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out",
        )}
      >
        <div className="sm:hidden flex justify-center pt-3 shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-[var(--muted)]/25" />
        </div>

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
              const displayServiceName = getEventServiceName(event);
              const cat = toCat(displayServiceName);
              const th = STATUS[event.status] ?? STATUS.Confirmed;
              const therapists = getTherapistNames(event);
              const clientName = getClientDisplayName(event);
              const isBonus = isBonusChildBooking(event);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex gap-3.5 rounded-xl border border-[var(--border)]/60 border-l-[3px] p-3.5",
                    "hover:shadow-sm hover:shadow-black/5 transition-shadow duration-150",
                    th.block,
                  )}
                >
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

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13px] font-bold leading-tight truncate",
                            th.clientTx,
                          )}
                        >
                          {clientName}
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
                        {displayServiceName}
                      </span>
                      {isBonus && (
                        <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                          Bonus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UserCircle
                        weight="duotone"
                        className={cn("size-3 shrink-0", th.metaTx)}
                      />
                      <span className={cn("text-[11px] truncate", th.metaTx)}>
                        {therapists}
                      </span>
                    </div>

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
// THERAPIST RECAP MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface TherapistRecapModalProps {
  date: Date;
  groups: TherapistRecapGroup[];
  onClose: () => void;
}

function TherapistRecapModal({
  date,
  groups,
  onClose,
}: TherapistRecapModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const totalServices = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  const handleCopy = async () => {
    const text = buildTherapistRecapText(date, groups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked — fail silently, no crash.
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />

      <div
        className={cn(
          "relative z-10 w-full sm:max-w-[560px] max-h-[90dvh] flex flex-col",
          "rounded-t-3xl sm:rounded-2xl",
          "bg-background border border-border",
          "shadow-2xl shadow-black/30",
          "animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out",
        )}
      >
        <div className="sm:hidden flex justify-center pt-3 shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-[var(--muted)]/25" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <UsersThree
                weight="duotone"
                className="size-[22px] text-[var(--accent)]"
              />
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)] mb-0.5">
                Rekap Terapis
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

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0">
          <span className="text-[11px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">
              {groups.length}
            </span>{" "}
            terapis ·{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {totalServices}
            </span>{" "}
            layanan
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold shrink-0",
              "bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/70",
              "text-[var(--foreground)] transition-colors",
            )}
          >
            {copied ? (
              <>
                <CheckCircle
                  weight="fill"
                  className="size-3.5 text-[var(--success)]"
                />
                Tersalin
              </>
            ) : (
              <>
                <Copy weight="bold" className="size-3.5" />
                Copy Rekap
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar)_transparent]">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <UsersThree
                weight="duotone"
                className="size-12 text-[var(--muted)]/30 mb-3"
              />
              <p className="text-sm font-medium text-[var(--muted)]">
                Tidak ada jadwal terapis
              </p>
              <p className="text-xs text-[var(--muted)]/60 mt-1">
                Belum ada reservasi untuk tanggal ini
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g.therapistName}
                className="rounded-xl border border-[var(--border)]/60 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 bg-[var(--surface-secondary)]/50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCircle
                      weight="duotone"
                      className="size-4 text-[var(--accent)] shrink-0"
                    />
                    <span className="text-[13px] font-bold text-[var(--foreground)] truncate">
                      {g.therapistName}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-[var(--muted)]">
                    {g.items.length} layanan · {fmtDur(g.totalDurationMinutes)}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border)]/40">
                  {g.items.map((item) => {
                    const th = STATUS[item.status] ?? STATUS.Confirmed;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 px-3.5 py-2"
                      >
                        <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-[var(--foreground)] w-[92px]">
                          {item.time}–{item.endTime}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-[11px] text-[var(--muted)]">
                          {item.serviceName}
                          {item.resourceName && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--muted)] text-[9px] font-medium">
                              {item.resourceName}
                            </span>
                          )}
                        </span>
                        {item.status !== "Confirmed" && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-wide",
                              th.badge,
                            )}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
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
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    events: ScheduledBooking[];
  } | null>(null);

  const [therapistRecapDay, setTherapistRecapDay] = useState<{
    date: Date;
    groups: TherapistRecapGroup[];
  } | null>(null);

  const [viewMode, setViewMode] = useState<"daily" | "therapist">("daily");

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const [dayOffset, setDayOffset] = useState(0);
  const isAtToday = dayOffset === 0;

  const viewStart = useMemo(
    () => addDays(today, dayOffset),
    [today, dayOffset],
  );
  const viewEnd = useMemo(
    () => addDays(viewStart, DAYS_IN_VIEW - 1),
    [viewStart],
  );

  const days = useMemo(
    () => Array.from({ length: DAYS_IN_VIEW }, (_, i) => addDays(viewStart, i)),
    [viewStart],
  );

  const rangeLabel = useMemo(
    () => formatRange(viewStart, viewEnd),
    [viewStart, viewEnd],
  );

  const goPrevDay = () => setDayOffset((o) => o - 1);
  const goNextDay = () => setDayOffset((o) => o + 1);
  const goToday = () => setDayOffset(0);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const startDateStr = useMemo(() => toDateStr(viewStart), [viewStart]);
  const endDateStr = useMemo(() => toDateStr(viewEnd), [viewEnd]);

  const ganttQueryParams = useMemo(
    () => ({
      start_date: startDateStr,
      end_date: endDateStr,
      limit: GANTT_FETCH_LIMIT,
    }),
    [startDateStr, endDateStr],
  );

  const { data: ganttResponse, isFetching: isGanttFetching } = useApiFetch<{
    data: SpaBooking[];
  }>(
    ["gantt-bookings", startDateStr, endDateStr],
    "/master/bookings",
    ganttQueryParams,
    true,
  );

  const [displayBookings, setDisplayBookings] = useState<SpaBooking[]>([]);
  useEffect(() => {
    if (ganttResponse?.data) {
      setDisplayBookings(ganttResponse.data);
    }
  }, [ganttResponse]);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduledBooking[]>();
    displayBookings.forEach((booking) => {
      addBookingToMap(map, booking);
      (booking.child_bookings ?? []).forEach((child) =>
        addBookingToMap(map, child),
      );
    });
    return map;
  }, [displayBookings]);

  const byDateSplit = useMemo(() => {
    const map = new Map<string, ScheduledBooking[]>();

    const addSplitEvent = (booking: SpaBooking) => {
      const { dateStr, timeStr } = parseSchedule(booking.schedule_date);
      const list = map.get(dateStr) ?? [];

      const therapistsList = (booking.therapists ?? []).filter(
        (t): t is BookingTherapist => typeof t !== "string",
      );

      const isParallel = booking.is_parallel ?? false;
      const usedTherapistIds = new Set<number>();

      const hasPreciseTiming =
        therapistsList.length > 0 &&
        therapistsList.every((t) => t.start_time && t.end_time);

      // Kasus paling umum: tiap terapis sudah punya jam mulai/selesai sendiri
      // (hasil staff/resource assignment). Cocokkan tiap terapis ke layanan
      // spesifik yang dia kerjakan lewat service_variant_id.
      if (hasPreciseTiming) {
        therapistsList.forEach((t, idx) => {
          const variant = findServiceVariantById(
            booking.service_variants,
            t.service_variant_id,
          );

          const startMin = parseTimeToMinutes(t.start_time!);
          const endMin = parseTimeToMinutes(t.end_time!);
          const duration = endMin - startMin;

          list.push({
            ...booking,
            timeStr: t.start_time!,
            duration_minutes: duration,
            service_variants: variant
              ? [{ ...variant, quantity: 1 }]
              : booking.service_variants,
            therapists: [t],
            isSplitUnit: true,
            id: `${booking.id}-split-${t.id}-${idx}`,
          });
        });

        map.set(dateStr, list);
        return;
      }

      // Fallback: therapist belum punya start_time/end_time presisi per unit
      // (booking lama / belum lewat resource assignment). Rekonstruksi jam
      // per unit dari urutan quantity per varian/item bundle.
      const processUnits = (
        variantId: number,
        qty: number,
        variantData: any,
        startTime: string,
        groupId?: string,
      ): { events: ScheduledBooking[]; nextStartTime: string } => {
        const events: ScheduledBooking[] = [];
        let currentSequentialStart = startTime;

        const findTherapistForUnit = (unitIndex: number) => {
          const targetKey = `${groupId ?? variantId}:${variantId}:${unitIndex}`;
          return (
            therapistsList.find((t) => t.client_key === targetKey) ??
            therapistsList.find(
              (t) =>
                t.service_variant_id === variantId &&
                !usedTherapistIds.has(t.id),
            ) ??
            therapistsList.find((t) => t.service_variant_id === variantId) ??
            ({ name: booking.therapist_name } as BookingTherapist)
          );
        };

        if (isParallel) {
          for (let unitIdx = 1; unitIdx <= qty; unitIdx++) {
            const assignedT = findTherapistForUnit(unitIdx);
            if (assignedT?.id) usedTherapistIds.add(assignedT.id);

            events.push({
              ...booking,
              timeStr: startTime,
              duration_minutes: variantData.duration_minutes ?? 0,
              service_variants: [{ ...variantData, quantity: 1 }],
              therapists: assignedT ? [assignedT] : [],
              isSplitUnit: true,
              id: `${booking.id}-v${variantId}-u${unitIdx}-${Math.random().toString(36).slice(2, 5)}`,
            });
          }
          return { events, nextStartTime: startTime };
        }

        let unitIndex = 0;
        while (unitIndex < qty) {
          const currentT = findTherapistForUnit(unitIndex + 1);
          const currentStaffId = currentT?.staff_id ?? -1;
          if (currentT?.id) usedTherapistIds.add(currentT.id);

          // Gabungkan unit berurutan yang dikerjakan terapis yang sama jadi
          // satu blok, biar nggak kepecah-pecah kecil kalau berturut-turut.
          let consecutiveUnits = 1;
          while (unitIndex + consecutiveUnits < qty) {
            const nextT = findTherapistForUnit(
              unitIndex + consecutiveUnits + 1,
            );
            if (!nextT || nextT.staff_id !== currentStaffId) break;
            consecutiveUnits++;
          }

          const blockDur =
            (variantData.duration_minutes ?? 0) * consecutiveUnits;
          events.push({
            ...booking,
            timeStr: currentSequentialStart,
            duration_minutes: blockDur,
            service_variants: [{ ...variantData, quantity: consecutiveUnits }],
            therapists: [currentT],
            isSplitUnit: true,
            id: `${booking.id}-v${variantId}-t${currentStaffId}-${unitIndex}-${Math.random().toString(36).slice(2, 5)}`,
          });

          currentSequentialStart = addMin(currentSequentialStart, blockDur);
          unitIndex += consecutiveUnits;
        }

        return { events, nextStartTime: currentSequentialStart };
      };

      if (booking.service_variants && booking.service_variants.length > 0) {
        let currentStartTime = timeStr;

        booking.service_variants.forEach((variant) => {
          if (isBundlePromoLine(variant)) {
            variant.items.forEach((item) => {
              const res = processUnits(
                item.id,
                item.quantity ?? 1,
                item,
                currentStartTime,
                variant.group_id,
              );
              list.push(...res.events);
              if (!isParallel) currentStartTime = res.nextStartTime;
            });
          } else {
            const qty = variant.quantity ?? variant.pivot?.quantity ?? 1;
            const res = processUnits(
              variant.id,
              qty,
              variant,
              currentStartTime,
              variant.group_id,
            );
            list.push(...res.events);
            if (!isParallel) currentStartTime = res.nextStartTime;
          }
        });
      } else {
        const therapists = booking.therapists ?? [booking.therapist_name];
        therapists.forEach((t, idx) => {
          list.push({
            ...booking,
            timeStr,
            duration_minutes: getSpaBookingDuration(booking),
            therapists: [t],
            isSplitUnit: true,
            id: `${booking.id}-fallback-${idx}`,
          });
        });
      }

      map.set(dateStr, list);
    };

    displayBookings.forEach((booking) => {
      addSplitEvent(booking);
      (booking.child_bookings ?? []).forEach((child) => addSplitEvent(child));
    });

    return map;
  }, [displayBookings]);

  const nowPx = useMemo(() => {
    const now = new Date();
    const minutesFromStart =
      (now.getHours() - START_HOUR) * 60 + now.getMinutes();
    return {
      px: minutesFromStart * HOUR_WIDTH_DAILY,
      show: minutesFromStart > 0 && minutesFromStart < TOTAL_HOURS * 60,
    };
  }, []);

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-2xl bg-background border border-border shadow-sm text-[var(--foreground)] mb-8">
        <div
          className="pointer-events-none absolute inset-0 z-50 opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)"/%3E%3C/svg%3E')`,
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b-[0.5px] border-border bg-muted/40">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-wide text-[var(--foreground)]">
              Schedule Overview
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[var(--surface-secondary)] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("daily")}
                  className={cn(
                    "px-3 py-1 text-[11px] font-medium rounded-md transition-colors",
                    viewMode === "daily"
                      ? "bg-background text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  Per Hari
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("therapist")}
                  className={cn(
                    "px-3 py-1 text-[11px] font-medium rounded-md transition-colors",
                    viewMode === "therapist"
                      ? "bg-background text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  Per Terapis
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {viewMode === "daily"
                  ? "Timeline reservasi 7 hari berjalan (satu booking utuh)."
                  : "Klik tanggal atau blok untuk lihat rekap tiap terapis: jumlah layanan & jam kerjanya."}
              </p>
            </div>
          </div>

          <DayNavControl
            isAtToday={isAtToday}
            rangeLabel={rangeLabel}
            onPrev={goPrevDay}
            onNext={goNextDay}
            onToday={goToday}
            isLoading={isGanttFetching}
          />

          <div className="flex flex-wrap items-center gap-4">
            <LegendItem label="Confirmed" status="Confirmed" />
            <LegendItem label="Pending" status="Pending" />
            <LegendItem label="Completed" status="Completed" />
            <LegendItem label="Cancelled" status="Cancelled" />
          </div>
        </div>

        <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--scrollbar)_transparent]">
          <div
            style={{
              minWidth:
                Y_AXIS_W +
                TOTAL_HOURS *
                  (viewMode === "therapist"
                    ? HOUR_WIDTH_THERAPIST
                    : HOUR_WIDTH_DAILY),
            }}
          >
            <div className="flex border-b-[0.5px] border-border bg-background/40 sticky top-0 z-30">
              <div
                className="shrink-0 border-r-[0.5px] border-border"
                style={{ width: Y_AXIS_W }}
              />
              <div className="relative flex flex-1">
                {hours.map((h, i) => {
                  const currentHourWidth =
                    viewMode === "therapist"
                      ? HOUR_WIDTH_THERAPIST
                      : HOUR_WIDTH_DAILY;
                  return (
                    <div
                      key={h}
                      className="shrink-0 relative py-2.5"
                      style={{
                        width: i < hours.length - 1 ? currentHourWidth : 0,
                      }}
                    >
                      <span className="absolute -left-4 text-[10px]/[14px] font-semibold text-[var(--muted)] whitespace-nowrap">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {days.map((dayDate) => {
              const dateStr = toDateStr(dayDate);
              const isToday = dateStr === todayStr;

              const originalEvents = byDate.get(dateStr) ?? [];

              const rawEvents =
                viewMode === "daily"
                  ? originalEvents
                  : (byDateSplit.get(dateStr) ?? []);

              const laneEvents = assignLanes(rawEvents);
              const laneCount = laneEvents[0]?.laneCount ?? 1;
              // Minimum row tinggi juga dinaikin biar row kosong ga terlalu
              // mepet dibanding row yang isinya card 4-baris.
              const rowH = Math.max(laneCount * LANE_H, 140);

              const activeCount = originalEvents.filter(
                (e) => e.status !== "Cancelled",
              ).length;

              const openDayDetail = () => {
                if (viewMode === "therapist") {
                  setTherapistRecapDay({
                    date: dayDate,
                    groups: buildTherapistRecap(rawEvents, true),
                  });
                } else {
                  setSelectedDay({ date: dayDate, events: originalEvents });
                }
              };

              // Handler baru khusus klik card (block) — cuma bawa 1 booking
              const openBlockDetail = (event: BookingMeta) => {
                if (viewMode === "therapist") {
                  setTherapistRecapDay({ 
                    date: dayDate,
                    groups: buildTherapistRecap([event], true),
                  });
                } else {
                  setSelectedDay({ date: dayDate, events: [event] });
                }
              };

              return (
                <div
                  key={dateStr}
                  className="flex border-b-[0.5px] border-border last:border-b-0 group/row"
                >
                  <button
                    type="button"
                    onClick={openDayDetail}
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
                    <span className="mt-2 flex items-center gap-0.5 opacity-0 group-hover/datebtn:opacity-100 transition-opacity duration-150 text-[var(--accent)]">
                      <span className="text-[8px] font-bold uppercase tracking-widest">
                        {viewMode === "therapist" ? "Rekap Terapis" : "Detail"}
                      </span>
                      <CaretRight weight="bold" className="size-2.5" />
                    </span>
                  </button>

                  <TimelineRow
                    laneEvents={laneEvents}
                    rowH={rowH}
                    isToday={isToday}
                    nowPx={nowPx}
                    mode={viewMode}
                    onBlockClick={openBlockDetail}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDay && (
        <DayDetailModal
          date={selectedDay.date}
          events={selectedDay.events}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {therapistRecapDay && (
        <TherapistRecapModal
          date={therapistRecapDay.date}
          groups={therapistRecapDay.groups}
          onClose={() => setTherapistRecapDay(null)}
        />
      )}
    </>
  );
}
