"use client";

import { useApiFetch } from "@/app/libs/use-http";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

interface PaymentStatusResponse {
  data: {
    booking_code: string;
    booking_status: string;
    payment_status: "Unpaid" | "Paid" | "Refunded";
    payment_channel: string | null;
    payment_via: string | null;
    amount: number | null;
    paid_at: string | null;
  };
}

export default function BookingPaymentResultPage() {
  const params = useParams<{ bookingCode: string }>();
  const router = useRouter();
  const bookingCode = params?.bookingCode ?? "";

  const { data, refetch, isLoading } = useApiFetch<PaymentStatusResponse>(
    ["booking-payment-status", bookingCode],
    `/master/bookings/${bookingCode}/payment-status`,
    undefined,
    !!bookingCode,
  );

  const status = data?.data?.payment_status;
  const isFinal = status === "Paid" || status === "Refunded";

  useEffect(() => {
    if (!bookingCode || isFinal) return;

    const timer = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(timer);
  }, [bookingCode, isFinal, refetch]);

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

        {!isLoading && status !== "Paid" && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-amber-600">
              Menunggu Konfirmasi Pembayaran
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Status saat ini: {status ?? "Unpaid"}. Halaman ini akan refresh
              otomatis.
            </p>
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
