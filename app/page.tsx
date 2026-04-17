"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react"; // Opsional: untuk loading state

export default function RootPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Mengecek apakah ada token di localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      // Jika tidak ada token, lempar ke login
      router.replace("/login");
    } else {
      // Jika ada token, lempar ke dashboard (atau halaman utama aplikasi)
      router.replace("/dashboard");
    }
  }, [router]);

  // Tampilkan loading spinner saat sedang mengecek (agar layar tidak blank putih)
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner color="accent" size="lg" />
      </div>
    );
  }

  return null;
}
