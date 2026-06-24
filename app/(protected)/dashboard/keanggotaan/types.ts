export interface MembershipPackageVariant {
  id: number;
  membership_package_id: number;
  service_variant_id: number;
  quota: number;
  service_variant?: {
    id: number;
    name: string;
  };
}

export interface MembershipPackage {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants?: MembershipPackageVariant[];
}

export interface ServiceVariant {
  id: number;
  name: string;
  service?: {
    id: number;
    name: string;
  };
}

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
}

export interface MembershipQuotaUsage {
  id: number;
  customer_membership_id: number;
  service_variant_id: number;
  booking_id?: number | null;
  usage_count: number;
  created_at: string;
  service_variant?: ServiceVariant;
  booking?: {
    id: number;
    booking_code: string;
  };
}

export interface BookingPayment {
  id: number;
  booking_id?: number | null;
  member_id?: number | null;
  reference_id: string;
  status: string;
  amount?: number;
  paid_at?: string;
  // Add other fields as needed
}

export interface CustomerMembership {
  id: number;
  customer_id: number;
  membership_package_id: number;
  start_date: string;
  end_date: string;
  status: string;
  booking_id?: number | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  membership_package?: MembershipPackage;
  quota_usages?: MembershipQuotaUsage[];
  remaining_quota?: Record<number, number>;
  is_expired?: boolean;
  is_paid?: boolean;
  payments?: BookingPayment[];
}
