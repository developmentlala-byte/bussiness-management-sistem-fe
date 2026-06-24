// types/booking.ts

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

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
  therapists?: string[];
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
