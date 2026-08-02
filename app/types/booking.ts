// types/booking.ts

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type PaymentStatus =
  | "Unpaid"
  | "Paid"
  | "Refunded"
  | "Expired"
  | "Pending";

export type BookingLineType = "service_variant" | "bundle_promo";

export interface BookingBundleItemSnapshot {
  id: number;
  name: string;
  duration_minutes: number;
  retail_price: number;
  quantity: number;
  slug?: string | null;
}

export interface BookingServiceVariantLine {
  type?: "service_variant";
  id: number;
  duration_minutes: number;
  name: string;
  retail_price: number;
  slug: string;
  quantity?: number;
  is_free?: boolean;
  pivot?: {
    quantity: number;
    bms_ms_bundle_promo_id?: number | null;
    unit_price?: number;
    is_free?: boolean;
  };
}

export interface BookingBundlePromoLine {
  type: "bundle_promo";
  id: number;
  bundle_promo_id: number;
  name: string;
  bundle_name?: string;
  slug: string;
  bundle_type: "percentage" | "nominal";
  discount_value: number;
  subtotal: number;
  discount_amount: number;
  retail_price: number;
  duration_minutes: number;
  items: BookingBundleItemSnapshot[];
}

export type BookingLineSnapshot =
  | BookingServiceVariantLine
  | BookingBundlePromoLine;

export interface BookingTherapist {
  id: number;
  booking_id: number;
  bms_ms_staff_id: number;
  bms_ms_service_variant_id: number;
  client_key?: string | null;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  staff?: {
    id: number;
    first_name: string;
    last_name?: string | null;
  };
}

export interface BookingStaffAssignment {
  service_variant_id: number;
  staff_id: number;
  client_key?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface BookingResourceAssignment {
  service_variant_id: number;
  resource_id: number;
  client_key?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface AppliedVoucherSnapshot {
  id: number;
  code: string;
  name: string;
  discount_type: "percentage" | "nominal";
  discount_value: number;
  min_booking_amount?: number | null;
  max_discount_amount?: number | null;
  promo_type?: "bogo" | null;
  discount_amount: number;
}

export interface AvailableTherapist {
  id: number;
  name: string;
  last_assigned_at?: string | null;
  available_unit_indices?: number[];
}

export interface AvailableSlot {
  slot_time: string;
  available_therapists: AvailableTherapist[];
  available_therapists_by_category: Record<number, number[]>;
  available_therapists_by_variant: Record<number, number[]>;
  available_resources_by_variant?: Record<number, number[]>;
  suggested_assignments?: BookingStaffAssignment[];
  suggested_resource_assignments?: BookingResourceAssignment[];
  is_available: boolean;
  fail_reason?: string | null;
}

export interface AvailableSlotsResponseData {
  date: string;
  total_duration: number;
  required_category_ids: number[];
  slots: AvailableSlot[];
}

export interface AvailableSlotsResponse {
  data: AvailableSlotsResponseData;
}

export interface AvailableDatesResponseData {
  available_dates: string[];
}

export interface AvailableDatesResponse {
  data: AvailableDatesResponseData;
}

export function isBundlePromoLine(
  line: BookingLineSnapshot,
): line is BookingBundlePromoLine {
  return line.type === "bundle_promo";
}

export function getBookingLineLabel(line: BookingLineSnapshot): string {
  if (isBundlePromoLine(line)) {
    return line.bundle_name || line.name || "Bundle Promo";
  }
  return line.name;
}

/**
 * Menghitung durasi untuk satu baris booking (bisa variant atau bundle).
 */
export function getBookingLineDuration(line: BookingLineSnapshot): number {
  const baseDur = line.duration_minutes ?? 0;
  if (baseDur > 0) return baseDur;

  if (isBundlePromoLine(line)) {
    // Jika durasi bundle 0, totalin durasi item di dalamnya (sekuensial sebagai fallback)
    return (line.items ?? []).reduce(
      (s, item) => s + (item.duration_minutes ?? 0) * (item.quantity ?? 1),
      0,
    );
  }
  return 0;
}

/**
 * Menghitung total durasi booking.
 * Jika durasi bundle 0, akan menjumlahkan (sekuensial) atau mengambil max (paralel) dari item di dalamnya.
 */
export function getSpaBookingDuration(booking: SpaBooking): number {
  const isParallel = booking.is_parallel ?? false;

  if (
    Array.isArray(booking.service_variants) &&
    booking.service_variants.length > 0
  ) {
    // Jika paralel, kita gunakan Greedy Partition (2 therapist stack) agar match backend
    if (isParallel) {
      const durations: number[] = [];
      booking.service_variants.forEach((variant) => {
        if (isBundlePromoLine(variant)) {
          const bundleBaseDur = variant.duration_minutes ?? 0;
          if (bundleBaseDur > 0) {
            durations.push(bundleBaseDur);
          } else {
            (variant.items ?? []).forEach((item) => {
              const q = item.quantity || 1;
              for (let i = 0; i < q; i++) {
                durations.push(item.duration_minutes ?? 0);
              }
            });
          }
        } else {
          const q = variant.quantity ?? variant.pivot?.quantity ?? 1;
          for (let i = 0; i < q; i++) {
            durations.push(variant.duration_minutes ?? 0);
          }
        }
      });

      if (durations.length === 0) return 0;
      durations.sort((a, b) => b - a);

      let s1 = 0;
      let s2 = 0;
      for (const d of durations) {
        if (s1 <= s2) s1 += d;
        else s2 += d;
      }
      return Math.max(s1, s2);
    }

    // Default: Sekuensial (Sum)
    return booking.service_variants.reduce((sum, variant) => {
      let variantDur = 0;
      if (isBundlePromoLine(variant)) {
        const bundleBaseDur = variant.duration_minutes ?? 0;
        if (bundleBaseDur > 0) {
          variantDur = bundleBaseDur;
        } else {
          variantDur = (variant.items ?? []).reduce(
            (s, item) =>
              s + (item.duration_minutes ?? 0) * (item.quantity ?? 1),
            0,
          );
        }
      } else {
        const qty = variant.quantity ?? 1;
        const dur = variant.duration_minutes ?? 0;
        variantDur = dur * qty;
      }
      return sum + variantDur;
    }, 0);
  }

  return booking.duration_minutes || 0;
}

export interface BookingRating {
  id: number;
  booking_id: number;
  care_concern: number;
  comfort: number;
  friendliness_communication: number;
  cleanliness_neatness: number;
  treatment_suitability: number;
  overall_score: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SpaBooking {
  id: number | string;
  booking_code: string;
  source?: "ads" | "direct";
  booking_type?: "standard" | "bonus_child";
  parent_booking_id?: number | null;
  booking_bundle_promos?: BookingBundlePromoLine[];
  customer_name: string;
  customer_phone: string;
  service_name?: string;
  therapist_name?: string;
  therapists?: Array<string | BookingTherapist>;
  staff_assignments?: BookingStaffAssignment[];
  resource_assignments?: BookingResourceAssignment[];
  schedule_date: string;
  duration_minutes: number;
  service_variants: BookingLineSnapshot[];
  subtotal_amount?: number;
  discount_amount?: number;
  applied_voucher?: AppliedVoucherSnapshot | null;
  total_amount?: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  is_parallel?: boolean;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount?: number;
  voucher_snapshot?: AppliedVoucherSnapshot | null;
  child_bookings?: SpaBooking[];
  service_variant?: {
    id: number;
  }[];
  rating?: BookingRating | null;
}
