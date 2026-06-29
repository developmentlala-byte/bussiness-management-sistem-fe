"use client";

import { useApiFetch } from "@/app/libs/use-http";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface PaymentStatusResponse {
  data: {
    booking_code: string;
    booking_status: string;
    payment_status: "Unpaid" | "Paid" | "Refunded" | "Expired";
    payment_channel: string | null;
    payment_via: string | null;
    amount: number | null;
    paid_at: string | null;
    expires_at: string | null;
  };
}

export default function BookingPaymentResultPage() {
  const params = useParams<{ bookingCode: string }>();
  const router = useRouter();
  const bookingCode = params?.bookingCode ?? "";
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data, refetch, isLoading } = useApiFetch<PaymentStatusResponse>(
    ["booking-payment-status", bookingCode],
    `/master/bookings/${bookingCode}/payment-status`,
    undefined,
    !!bookingCode,
  );

  const status = data?.data?.payment_status;
  const expiresAt = data?.data?.expires_at ?? null;
  const isFinal = status === "Paid" || status === "Refunded" || status === "Expired";
  const timeLeftMs = useMemo(() => {
    if (!expiresAt) return null;
    return new Date(expiresAt).getTime() - nowMs;
  }, [expiresAt, nowMs]);

  useEffect(() => {
    if (!bookingCode || isFinal) return;

    const timer = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(timer);
  }, [bookingCode, isFinal, refetch]);

  useEffect(() => {
    if (!expiresAt || isFinal) return;

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, isFinal]);

  const countdownLabel = useMemo(() => {
    if (timeLeftMs === null || timeLeftMs <= 0) return null;

    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [timeLeftMs]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Booking
        </p>
        <h1 className="mt-2 text-xl font-semibold">{bookingCode}</h1>

        {isLoading && (
          <p className="mt-6 text-sm text-muted-foreground">
            Mengecek status pembayaran...
          </p>
        )}

        {!isLoading && status === "Paid" && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-emerald-600">
              Pembayaran Berhasil
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Booking sudah dikonfirmasi. Kamu akan diarahkan ke halaman booking.
            </p>
          </>
        )}

        {!isLoading && status === "Expired" && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-rose-600">
              Link Pembayaran Expired
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Waktu pembayaran 15 menit sudah habis. Booking otomatis dibatalkan.
            </p>
          </>
        )}

        {!isLoading && status !== "Paid" && status !== "Expired" && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-amber-600">
              Menunggu Konfirmasi Pembayaran
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Status saat ini: {status ?? "Unpaid"}. Halaman ini akan refresh
              otomatis.
            </p>
            {countdownLabel && (
              <p className="mt-3 text-sm font-medium text-[#B55368]">
                Selesaikan pembayaran dalam {countdownLabel}
              </p>
            )}
          </>
        )}

        <button
          onClick={() => router.push("/dashboard/reservasi/booking")}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Kembali ke Booking
        </button>
      </div>
    </div>
  );
}
