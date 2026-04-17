"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import Sidebar from "@/app/components/sidebar";
import { useAuthStore } from "../libs/use-user";
import axiosInstance from "../services/axios-instance";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  // Tarik fungsi setAuth dan state dari Zustand
  const { setAuth, token } = useAuthStore();

  useEffect(() => {
    const handleAuthentication = async () => {
      // 1. Cek apakah ada token baru dari URL (hasil lemparan OAuth Laravel)
      const urlToken = searchParams.get("token");

      if (urlToken) {
        try {
          // Ambil data user dari Laravel menggunakan token OAuth tersebut
          const response = await axiosInstance.get("/user", {
            headers: {
              Authorization: `Bearer ${urlToken}`,
            },
          });

          // Simpan User & Token ke Zustand (yang akan otomatis masuk localStorage)
          setAuth(response.data, urlToken);

          // Bersihkan URL (Best Practice)
          window.history.replaceState(null, "", "/dashboard");
          setIsReady(true);
        } catch (error) {
          console.error("Gagal verifikasi token OAuth:", error);
          router.replace("/login?error=oauth_failed");
        }
        return; // Hentikan eksekusi setelah menangani token dari URL
      }

      // 2. Jika tidak ada token di URL, cek dari Zustand
      // (yang nge-hydrate data dari localStorage secara otomatis)

      // Kita pakai setTimeout 0 untuk memastikan Zustand sudah selesai membaca localStorage
      setTimeout(() => {
        const currentToken = useAuthStore.getState().token;

        if (!currentToken) {
          // Tendang ke login jika tidak ada token sama sekali
          router.replace("/login");
        } else {
          setIsReady(true);
        }
      }, 0);
    };

    handleAuthentication();
  }, [router, searchParams, setAuth]);

  // Tampilkan loading saat proses pengecekan berjalan
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner color="accent" size="lg" />
      </div>
    );
  }

  return <Sidebar>{children}</Sidebar>;
}
