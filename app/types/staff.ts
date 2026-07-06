import { Category } from "./product-&-layanan";

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
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}
