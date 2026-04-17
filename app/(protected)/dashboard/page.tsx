"use client";

import { useAuthStore } from "@/app/libs/use-user";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  // Tarik data user dan fungsi logout dari Zustand
  const { user, logout } = useAuthStore();
  console.log("🚀 ~ DashboardPage ~ user:", user);

  const handleLogout = () => {
    logout(); // Bersihkan state & localStorage
    router.replace("/login"); // Lempar ke login
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 bg-background text-foreground">
      <div className="w-full max-w-md p-6 border border-border shadow-sm bg-surface rounded-none">
        <h1 className="text-2xl font-bold mb-6">Profile Overview</h1>

        {/* Render Data User secara dinamis */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <p className="text-sm text-muted font-medium">Full Name</p>
            <p className="text-lg font-semibold">{user?.name || "No Name"}</p>
          </div>

          <div>
            <p className="text-sm text-muted font-medium">Email Address</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>

          <div>
            <p className="text-sm text-muted font-medium">Role / Status</p>
            <p className="text-sm mt-1 px-2 py-1 bg-success/10 text-success inline-block font-medium border border-success/20">
              Active Member
            </p>
          </div>
        </div>

        <Button className="w-full font-medium" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
