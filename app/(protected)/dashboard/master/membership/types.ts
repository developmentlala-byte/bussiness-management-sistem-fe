export interface ServiceVariantOption {
  id: number;
  name: string;
  serviceName: string;
  categoryName: string;
  retail_price: string | number;
  duration_minutes: number;
}

export interface MembershipCategoryOption {
  id: number;
  name: string;
}

export interface MembershipServiceOption {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
}

export interface MembershipPackageVariant {
  id: number;
  membership_package_id: number;
  service_variant_id: number;
  quota: number;
  service_variant?: {
    id: number;
    name: string;
    service?: {
      id: number;
      name: string;
      bms_ms_service_category_id?: number;
    };
  };
}

export interface MembershipPackageBenefit {
  id?: number;
  membership_package_id?: number;
  service_category_id?: number | null;
  service_id?: number | null;
  service_variant_id?: number | null;
  quota: number;
  service_category?: {
    id: number;
    name: string;
  } | null;
  service?: {
    id: number;
    name: string;
    bms_ms_service_category_id?: number;
  } | null;
  service_variant?: {
    id: number;
    name: string;
    service?: {
      id: number;
      name: string;
      bms_ms_service_category_id?: number;
    };
  } | null;
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
  benefits?: MembershipPackageBenefit[];
}
