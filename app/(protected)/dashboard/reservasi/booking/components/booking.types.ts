import type {
  SpaBooking,
  AppliedVoucherSnapshot,
  AvailableSlot,
  BookingStaffAssignment,
  BookingResourceAssignment,
} from "@/app/types/booking";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import type { BundlePricing } from "@/app/libs/bundle-pricing";

export interface Variant {
  id: number;
  catKey: string;
  subCat: string;
  name: string;
  duration: number;
  price: number;
  originalPrice?: number;
  categoryId: number;
}

export interface Resource {
  id: number;
  room_name: string;
  resource_code: string;
  resource_type: string;
  is_active: boolean;
}

export interface BogoEligibleService {
  id: number;
  name: string;
  duration_minutes: number;
  retail_price: number;
}

export interface MembershipVariantEligibility {
  eligible: boolean;
  benefit_id: number | null;
  scope: "variant" | "service" | "category" | null;
  quota: number;
  used: number;
  remaining: number;
}

export interface BookingMembershipEligibility {
  customer_id: number | null;
  membership: {
    id: number;
    package_name: string | null;
    start_date: string;
    end_date: string;
  } | null;
  variants: Record<string, MembershipVariantEligibility>;
}

export type CartLine =
  | {
      kind: "service";
      variant: Variant;
      qty: number;
      membershipQty?: number;
      membershipId?: number;
      isFree?: boolean;
      groupId?: string;
    }
  | {
      kind: "bundle";
      bundle: BundlePromo;
      pricing: BundlePricing;
      groupId?: string;
    };

export interface ExistingTherapist {
  id: number;
  name: string;
  service_variant_id: number;
}

export type LocalStaffAssignment = BookingStaffAssignment & {
  client_key: string;
};

export interface FormState {
  name: string;
  phone: string;
  staffAssignments: LocalStaffAssignment[];
  resourceAssignments: BookingResourceAssignment[];
  date: string;
  slotTime: string;
  voucherCode: string;
  isParallel?: boolean;
}

export interface BonusBookingFormState {
  scheduleMode: "same_date" | "custom_date";
  date: string;
  slotTime: string;
  staffAssignments: BookingStaffAssignment[];
  resourceAssignments: BookingResourceAssignment[];
}

export type BookingStep = "customer" | "services" | "datetime" | "confirm";

export interface CreatedBooking {
  id: number;
  booking_code: string;
  total_amount?: number;
  subtotal_amount?: number;
  discount_amount?: number;
  applied_voucher?: AppliedVoucherSnapshot | null;
}

export interface VoucherPreview {
  code: string;
  lineItemsKey?: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  appliedVoucher: AppliedVoucherSnapshot | null;
  eligibleFreeServices: BogoEligibleService[];
  bogoCapAmount: number | null;
}
