"use client";

import { useAuthStore } from "@/app/libs/use-user";
import DashboardAdmin from "./dashboard-view/dashboard-admin";
import DashboardManager from "./dashboard-view/dashboard-manager";

export default function DashboardOverviewPage() {
  const { user } = useAuthStore((state) => state);
  console.log("🚀 ~ DashboardOverviewPage ~ user:", user);

  switch (user?.roles?.[0]?.id || 0) {
    case 2:
      return <DashboardAdmin />;
    default:
      return <DashboardManager />;
  }
}
