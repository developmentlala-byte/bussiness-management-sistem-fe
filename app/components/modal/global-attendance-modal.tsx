"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  WifiHigh,
  CheckCircle,
  WarningCircle,
  CalendarBlank,
  SignOut,
  SignIn,
} from "@phosphor-icons/react";
import { toast, Spinner } from "@heroui/react";
import { useApiFetch, usePost } from "@/app/libs/use-http";

// Interface untuk status absensi hari ini
interface TodayAttendanceStatus {
  is_clocked_in: boolean;
  clock_in_time: string | null;
  is_clocked_out: boolean;
  clock_out_time: string | null;
  staff_id: number | null;
}

export const GlobalAttendanceModal = () => {
  // Secara default tertutup sampai data API memastikan statusnya
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 1. FETCH STATUS ABSENSI HARI INI ---
  const {
    data: statusResponse,
    isLoading: isStatusLoading,
    refetch,
  } = useApiFetch<{ data: TodayAttendanceStatus }>(
    ["attendance_today_status"],
    "/master/attendances/my-today-status",
  );

  const status = statusResponse?.data;

  // --- 2. LIVE CLOCK (Update setiap detik) ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 3. AUTO-OPEN LOGIC (MEMAKSA TERBUKA) ---
  useEffect(() => {
    // Jika data API sudah selesai dimuat dan ternyata BELUM absen masuk
    if (!isStatusLoading && status) {
      if (!status.is_clocked_in) {
        setIsOpen(true); // Paksa modal langsung terbuka!
      }
    }
  }, [isStatusLoading, status]);

  // --- 4. MUTASI API (CLOCK IN / CLOCK OUT) ---
  const { mutate: clockIn, isPending: isClockingIn } = usePost(
    "/master/attendances/clock-in",
    {
      onSuccess: () => {
        toast.success("Absen Masuk Berhasil", {
          description: "Selamat bekerja!",
        });
        refetch(); // Update status via API
        setIsOpen(false); // Otomatis tutup modal jika sukses
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal Absen Masuk", {
          description:
            error?.response?.data?.message ||
            "Pastikan Anda terhubung WiFi kantor.",
        });
      },
    },
  );

  const { mutate: clockOut, isPending: isClockingOut } = usePost(
    "/master/attendances/clock-out",
    {
      onSuccess: () => {
        toast.success("Absen Pulang Berhasil", {
          description: "Hati-hati di jalan!",
        });
        refetch();
        setIsOpen(false);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal Absen Pulang", {
          description: error?.response?.data?.message || "Terjadi kesalahan.",
        });
      },
    },
  );

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClockIn = () => {
    clockIn({ bms_ms_staff_id: status?.staff_id });
  };

  const handleClockOut = () => {
    clockOut({ bms_ms_staff_id: status?.staff_id });
  };

  // Format tanggal & waktu
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(currentTime);

  // Jika modal ditutup, tampilkan Floating Button kecil di pojok kanan bawah
  if (!isOpen) {
    // Kita hanya tampilkan tombol jika data sudah selesai dimuat.
    if (isStatusLoading) return null;

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-background px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform outline-none"
      >
        <Clock weight="fill" className="w-5 h-5 text-accent" />
        <span className="text-sm font-bold">Panel Absensi</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header Biru / Accent */}
        <div className="bg-accent/10 px-6 py-5 border-b border-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-md">
              <CalendarBlank weight="fill" className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-extrabold text-foreground leading-tight">
                Presensi Harian
              </h2>
              <span className="text-xs font-semibold text-accent">
                {formattedDate}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-background/50 hover:bg-background text-muted hover:text-foreground transition-colors outline-none"
          >
            <X weight="bold" className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Jam Digital Raksasa */}
          <div className="text-center mb-6">
            <h1 className="text-5xl font-black text-foreground tracking-tighter tabular-nums mb-1">
              {formattedTime.replace(".", ":").replace(".", ":")}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
              <WifiHigh weight="bold" className="w-4 h-4 text-emerald-500" />
              Validasi via WiFi Kantor
            </div>
          </div>

          {/* Logic Tampilan Tombol berdasarkan Status */}
          {isStatusLoading ? (
            <div className="w-full py-8 flex justify-center">
              <Spinner size="md" color="warning" />
            </div>
          ) : !status?.is_clocked_in ? (
            // --- STATE 1: BELUM ABSEN MASUK ---
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-2">
                <WarningCircle
                  weight="fill"
                  className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  Anda belum melakukan absensi masuk hari ini. Pastikan Anda
                  terhubung dengan jaringan kantor sebelum klik tombol di bawah.
                </p>
              </div>
              <button
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="w-full h-14 bg-accent text-accent-foreground font-bold rounded-2xl shadow-lg hover:shadow-accent/25 hover:opacity-90 transition-all flex items-center justify-center gap-2 text-lg outline-none disabled:opacity-50"
              >
                {isClockingIn ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <SignIn weight="bold" className="w-6 h-6" />
                )}
                {isClockingIn ? "Memproses..." : "Absen Masuk Sekarang"}
              </button>
            </div>
          ) : status.is_clocked_in && !status.is_clocked_out ? (
            // --- STATE 2: SUDAH MASUK, BELUM PULANG ---
            <div className="w-full flex flex-col gap-3">
              <div className="flex flex-col items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-2 text-center">
                <CheckCircle
                  weight="fill"
                  className="w-8 h-8 text-emerald-600 mb-1"
                />
                <span className="text-sm font-bold text-emerald-700">
                  Anda sudah Absen Masuk
                </span>
                <span className="text-xs font-semibold text-emerald-600/70 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Pukul{" "}
                  {status.clock_in_time
                    ? new Date(status.clock_in_time).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : "-"}
                </span>
              </div>
              <button
                onClick={handleClockOut}
                disabled={isClockingOut}
                className="w-full h-14 bg-surface border-2 border-border hover:border-danger hover:bg-danger/5 hover:text-danger text-foreground font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg outline-none disabled:opacity-50"
              >
                {isClockingOut ? (
                  <Spinner size="sm" color="danger" />
                ) : (
                  <SignOut weight="bold" className="w-6 h-6" />
                )}
                {isClockingOut ? "Memproses..." : "Absen Pulang"}
              </button>
            </div>
          ) : (
            // --- STATE 3: SUDAH SELESAI (MASUK & PULANG) ---
            <div className="w-full flex flex-col items-center gap-3 bg-surface-secondary/30 border border-border p-6 rounded-2xl text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                <CheckCircle
                  weight="fill"
                  className="w-8 h-8 text-emerald-600"
                />
              </div>
              <h3 className="font-bold text-foreground">
                Selesai untuk Hari Ini!
              </h3>
              <p className="text-xs text-muted font-medium">
                Anda telah menyelesaikan absensi masuk dan pulang. Silakan
                beristirahat.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2 bg-surface border border-border hover:bg-surface-secondary rounded-xl text-sm font-bold transition-colors outline-none"
              >
                Tutup Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
