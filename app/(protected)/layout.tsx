"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import Sidebar from "@/app/components/sidebar";
import { useAuthStore } from "../libs/use-user";
import axiosInstance from "../services/axios-instance";

// ✅ Pisah ke komponen inner yang pakai useSearchParams
function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const { setAuth, token } = useAuthStore();

  useEffect(() => {
    const handleAuthentication = async () => {
      const urlToken = searchParams.get("token");

      if (urlToken) {
        try {
          const response = await axiosInstance.get("/user", {
            headers: {
              Authorization: `Bearer ${urlToken}`,
            },
          });

          setAuth(response.data, urlToken);
          window.history.replaceState(null, "", "/dashboard");
          setIsReady(true);
        } catch (error) {
          console.error("Gagal verifikasi token OAuth:", error);
          router.replace("/login?error=oauth_failed");
        }
        return;
      }

      setTimeout(() => {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
          router.replace("/login");
        } else {
          setIsReady(true);
        }
      }, 0);
    };

    handleAuthentication();
  }, [router, searchParams, setAuth]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner color="accent" size="lg" />
      </div>
    );
  }

  return (
    <Sidebar>
      {/* <GlobalAttendanceModal /> */}
      {children}
    </Sidebar>
  );
}

// ✅ Layout utama hanya jadi Suspense wrapper
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Spinner color="accent" size="lg" />
        </div>
      }
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </head>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </Suspense>
  );
}
