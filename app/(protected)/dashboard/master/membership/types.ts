export interface ServiceVariantOption {
  id: number;
  name: string;
  serviceName: string;
  categoryName: string;
  retail_price: string | number;
  duration_minutes: number;
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
    };
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
