import type {
  BundlePromo,
  BundlePromoItem,
  BundleType,
} from "@/app/(protected)/dashboard/master/bundle-promo/types";
import type { CalendarDate } from "@internationalized/date";
import { parseDate } from "@internationalized/date";

export interface BundlePricing {
  subtotal: number;
  discountAmount: number;
  finalPrice: number;
  totalDuration: number;
  itemCount: number;
}

export function normalizeBundleItems(
  bundle: BundlePromo & { bundleItems?: BundlePromoItem[] },
): BundlePromoItem[] {
  return bundle.bundle_items ?? bundle.bundleItems ?? [];
}

export function calcBundlePricing(bundle: BundlePromo): BundlePricing {
  const items = normalizeBundleItems(bundle);

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.service_variant?.retail_price ?? 0);
    return sum + price * item.quantity;
  }, 0);

  const discountValue = Number(bundle.discount_value);
  const discountAmount =
    bundle.bundle_type === "percentage"
      ? subtotal * (discountValue / 100)
      : Math.min(discountValue, subtotal);

  const finalPrice = Math.max(0, subtotal - discountAmount);
  const totalDuration = items.reduce((sum, item) => {
    const duration = item.service_variant?.duration_minutes ?? 0;
    return sum + duration * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    discountAmount,
    finalPrice,
    totalDuration,
    itemCount,
  };
}

export function formatBundleDiscountLabel(
  bundleType: BundleType,
  discountValue: number | string,
): string {
  const value = Number(discountValue);
  return bundleType === "percentage"
    ? `Diskon ${value}%`
    : `Diskon Rp ${value.toLocaleString("id-ID")}`;
}

export function formatDurationShort(minutes: number): string {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function toDateParts(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

function toTimeString(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getBundleCalendarBounds(bundle: BundlePromo): {
  minValue: CalendarDate;
  maxValue: CalendarDate;
} {
  const start = toDateParts(bundle.start_date);
  const end = toDateParts(bundle.end_date);

  return {
    minValue: parseDate(
      `${start.year}-${String(start.month).padStart(2, "0")}-${String(start.day).padStart(2, "0")}`,
    ),
    maxValue: parseDate(
      `${end.year}-${String(end.month).padStart(2, "0")}-${String(end.day).padStart(2, "0")}`,
    ),
  };
}

export function getBundleTimeBounds(
  bundle: BundlePromo,
  dateStr: string,
): { minTime: string; maxTime: string } | null {
  if (!dateStr) return null;

  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);
  const [year, month, day] = dateStr.split("-").map(Number);
  const selected = new Date(year, month - 1, day);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startParts = toDateParts(bundle.start_date);
  const endParts = toDateParts(bundle.end_date);

  return {
    minTime: sameDay(selected, start)
      ? toTimeString(startParts.hours, startParts.minutes)
      : "00:00",
    maxTime: sameDay(selected, end)
      ? toTimeString(endParts.hours, endParts.minutes)
      : "23:59",
  };
}

export function isDateTimeWithinBundle(
  bundle: BundlePromo,
  dateStr: string,
  timeStr: string,
): boolean {
  if (!dateStr || !timeStr) return false;

  const at = new Date(`${dateStr}T${timeStr}:00`);
  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);

  return at >= start && at <= end;
}

export function getBundleScheduleHint(bundle: BundlePromo): string {
  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);
  return `Jadwal hanya dalam periode bundle: ${start.toLocaleString("id-ID")} – ${end.toLocaleString("id-ID")}`;
}

export function isBundleAvailableAt(
  bundle: BundlePromo,
  scheduleAt: Date | null,
): boolean {
  if (!bundle.is_active) return false;
  if (!scheduleAt) return false;

  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);

  return scheduleAt >= start && scheduleAt <= end;
}

export function getBundleAvailabilityMessage(
  bundle: BundlePromo,
  scheduleAt: Date | null,
): string | null {
  if (!scheduleAt) {
    return "Pilih tanggal & waktu jadwal terlebih dahulu";
  }

  if (!bundle.is_active) {
    return "Bundle tidak aktif";
  }

  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);

  if (scheduleAt < start) {
    return `Berlaku mulai ${start.toLocaleString("id-ID")}`;
  }

  if (scheduleAt > end) {
    return `Berakhir ${end.toLocaleString("id-ID")}`;
  }

  return null;
}
