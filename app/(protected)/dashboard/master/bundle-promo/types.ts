import {
  getLocalTimeZone,
  parseDate,
  today,
  type CalendarDate,
} from "@internationalized/date";

export type BundleType = "percentage" | "nominal";

export type DateRangeValue = {
  start: CalendarDate;
  end: CalendarDate;
};

export interface ServiceVariantOption {
  id: number;
  name: string;
  serviceName: string;
  categoryName: string;
  retail_price: string | number;
  duration_minutes: number;
}

export interface BundlePromoItem {
  id: number;
  bms_ms_bundle_promo_id: number;
  bms_ms_service_variant_id: number;
  quantity: number;
  duration_minutes: number;
  price: string | number;
  sort_order: number;
  service_variant?: {
    id: number;
    name: string;
    duration_minutes: number;
    retail_price: string | number;
    service?: { id: number; name: string };
  };
}

export interface BundleDiscount {
  id: number;
  bms_ms_bundle_promo_id: number;
  discount_type: BundleType;
  discount_value: string | number;
  min_quantity: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description: string | null;
}

export interface BundlePromo {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  bundle_type: BundleType;
  discount_value: string | number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_quantity: number | null;
  used_count: number;
  bundle_items?: BundlePromoItem[];
  discounts?: BundleDiscount[];
}

export interface BundleItemInput {
  bms_ms_service_variant_id: number;
  quantity: number;
  duration_minutes: number;
  price: number;
  sort_order?: number;
}

export type BundleStatus = "active" | "coming_soon" | "expired" | "inactive";

export function getBundleStatus(bundle: BundlePromo): BundleStatus {
  if (!bundle.is_active) return "inactive";

  const now = new Date();
  const start = new Date(bundle.start_date);
  const end = new Date(bundle.end_date);

  if (end < now) return "expired";
  if (start > now) return "coming_soon";
  return "active";
}

export function formatBundleDiscount(bundle: BundlePromo): string {
  const value = Number(bundle.discount_value);
  if (bundle.bundle_type === "percentage") {
    return `${value}%`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} mnt`;
}

export function formatVariantOptionLabel(
  variant: ServiceVariantOption,
): string {
  return `${variant.name} · ${formatDuration(variant.duration_minutes)}`;
}

export function formatVariantOptionSublabel(
  variant: ServiceVariantOption,
): string {
  const price = Number(variant.retail_price).toLocaleString("id-ID");
  return `${variant.categoryName} · ${variant.serviceName} · Rp ${price}`;
}

export function formatVariantOptionSearchText(
  variant: ServiceVariantOption,
): string {
  return `${variant.categoryName} ${variant.serviceName} ${variant.name} ${formatDuration(variant.duration_minutes)}`;
}

export function parseApiTime(
  dateStr?: string | null,
  fallback = "00:00",
): string {
  if (!dateStr) return fallback;

  const timePart = dateStr.includes("T")
    ? dateStr.split("T")[1]
    : dateStr.split(" ")[1];

  if (!timePart) return fallback;

  const [hours, minutes] = timePart.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function toDateTime(date: string, time: string): string {
  const [hours, minutes] = (time || "00:00").split(":");
  return `${date} ${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

export function formatDateTimePreview(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const value = new Date(year, month - 1, day, hours, minutes);

  return value.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateTimeStart(date: string, time = "00:00"): string {
  return toDateTime(date, time);
}

export function toDateTimeEnd(date: string, time = "23:59"): string {
  return toDateTime(date, time);
}

export function parseApiDate(dateStr: string): CalendarDate {
  // Ambil hanya bagian YYYY-MM-DD saja, abaikan sisa string waktu/zona T...Z
  // agar tidak terpengaruh offset waktu lokal komputer (WIB/GMT)
  const datePart = dateStr.split("T")[0].split(" ")[0];
  return parseDate(datePart);
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "—";

  // Pisahkan manual komponennya untuk menghindari bug instansiasi Date di cross-browser
  const parts = dateStr.split("T");
  const datePart = parts[0]; // "2026-06-30"
  const timePart = parts[1] ? parts[1].substring(0, 5) : "00:00"; // "23:59"

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Buat objek date murni berdasarkan waktu lokal tanpa bias UTC
  const localDate = new Date(year, month - 1, day, hours, minutes);

  return localDate
    .toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Memastikan format 24 jam di browser
    })
    .replace(/\./g, ":"); // Mengubah separator titik bawaan id-ID menjadi titik dua untuk jam
}

export function buildDateRange(
  startDate?: string | null,
  endDate?: string | null,
  defaultDays = 30,
): DateRangeValue {
  const now = today(getLocalTimeZone());

  return {
    // Gunakan parseApiDate yang sudah kita bersihkan dari format ISO waktu
    start: startDate ? parseApiDate(startDate) : now,
    end: endDate ? parseApiDate(endDate) : now.add({ days: defaultDays }),
  };
}
