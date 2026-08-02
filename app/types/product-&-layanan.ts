export interface ServiceVariantDetail {
  id?: number;
  bms_ms_service_variant_id: number;
  description?: string;
  benefits?: string[];
  how_to_use?: string;
  images?: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  duration?: string;
  duration_minutes?: number;
  price: number | string;
  retail_price?: number | string;
  pivot?: {
    status: "bisa" | "training" | "tidak_bisa";
  };
  capable_staff?: any[];
  detail?: ServiceVariantDetail;
}

export interface Service {
  id: string;
  name: string;
  slug?: string;
  description: string;
  badge?: React.ReactNode;
  image_path: string;
  is_active: boolean;
  items: ServiceItem[];
  variants?: ServiceItem[];
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon: string;
  services: Service[];
  order_column: number;
  description: string;
  is_active: boolean;
  target_audience: "Semua" | "Pria" | "Wanita" | undefined;
}

export interface FilteredService extends Service {
  categoryName: string;
}
