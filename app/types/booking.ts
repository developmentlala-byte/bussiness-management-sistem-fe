// types/booking.ts

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Paid" | "Refunded" | "Expired";

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
  staff_id: number;
  service_variant_id: number;
  name: string;
  staff?: {
    id: number;
    first_name: string;
    last_name?: string | null;
  };
}

export interface BookingStaffAssignment {
  service_variant_id: number;
  staff_id: number;
}

export interface AvailableTherapist {
  id: number;
  name: string;
}

export interface AvailableSlot {
  slot_time: string;
  available_therapists: AvailableTherapist[];
  available_therapists_by_category: Record<number, number[]>;
  is_available: boolean;
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
    return line.name;
  }
  return line.name;
}

export interface SpaBooking {
  id: number | string;
  booking_code: string;
  booking_bundle_promos?: BookingBundlePromoLine[];
  customer_name: string;
  customer_phone: string;
  service_name?: string;
  therapist_name?: string;
  therapists?: Array<string | BookingTherapist>;
  staff_assignments?: BookingStaffAssignment[];
  schedule_date: string;
  duration_minutes: number;
  service_variants: BookingLineSnapshot[];
  total_amount?: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount?: number;
  service_variant?: {
    id: number;
  }[];
}
