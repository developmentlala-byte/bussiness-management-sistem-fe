import { Category, Service } from "./product-&-layanan";

export interface Staff {
  id: number;
  user_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  avatar_path: string;
  job_title: string;
  status: "active" | "inactive" | "on_leave" | "terminated";
  join_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  capabilityCategories?: Category[];
  capability_categories?: Category[];
  serviceCapabilities?: Service[];
  service_capabilities?: Service[];
  variantCapabilities?: ServiceItem[];
  variant_capabilities?: ServiceItem[];
  capabilities_summary?: {
    bisa: number;
    training: number;
    tidak_bisa: number;
    total_variants: number;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  pivot?: {
    status: "bisa" | "training" | "tidak_bisa";
  };
}
