"use client";

import { useParams, useRouter } from "next/navigation";

export default function BookingPaymentCancelPage() {
  const params = useParams<{ bookingCode: string }>();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Booking
        </p>
        <h1 className="mt-2 text-xl font-semibold">{params?.bookingCode}</h1>
        <h2 className="mt-6 text-lg font-semibold text-destructive">
          Pembayaran Dibatalkan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kamu bisa lanjutkan pembayaran lagi dari daftar booking.
        </p>
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
