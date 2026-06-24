"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@heroui/react";

export default function BookingPaymentNoticePage() {
  const params = useParams<{ bookingCode: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingCode = params?.bookingCode ?? "";
  const from = searchParams.get("from"); // return | cancel

  useEffect(() => {
    if (!bookingCode) return;

    if (from === "cancel") {
      toast.warning("Pembayaran dibatalkan", {
        description: `Booking ${bookingCode}. Kamu bisa coba bayar lagi.`,
      });
      return;
    }

    toast.success("Kembali dari pembayaran", {
      description: `Booking ${bookingCode}. Klik untuk lihat hasil pembayaran.`,
    });
  }, [bookingCode, from]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Booking
        </p>
        <h1 className="mt-2 text-xl font-semibold">{bookingCode}</h1>

        <p className="mt-6 text-sm text-muted-foreground">
          {from === "cancel"
            ? "Pembayaran dibatalkan. Kamu bisa cek status atau bayar ulang dari dashboard."
            : "Silakan cek hasil pembayaran. Status resmi tetap dari callback (notifyUrl)."}
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push(`/payment/${bookingCode}/result`)}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Lihat hasil pembayaran
          </button>

          <button
            onClick={() => router.push("/dashboard/reservasi/booking")}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
          >
            Kembali ke Booking
          </button>
        </div>
      </div>
    </div>
  );
}

