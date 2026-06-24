export interface ServiceItem {
  id: string;
  name: string;
  duration: string;
  price: number | string;
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
