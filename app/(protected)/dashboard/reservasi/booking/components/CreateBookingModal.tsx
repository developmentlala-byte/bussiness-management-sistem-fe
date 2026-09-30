"use client";

import React from "react";
import { useCreateBookingForm } from "./useCreateBookingForm";
import { BookingModalLayout } from "./BookingModalLayout";
import { CreditCardIcon, IdentificationCardIcon } from "@phosphor-icons/react";
import { idr, durFmt } from "./bookingModal.utils";
import { buildBookingPaymentRedirectPayload } from "@/app/libs/payment-redirect";
import { usePost } from "@/app/libs/use-http";
import { toast } from "@heroui/react";
interface CreateBookingModalProps {
  isOpen: boolean;
  onSaved?: () => void;
  onOpenMembership?: (customer: { name: string; phone: string }) => void;
}

export default function CreateBookingModal({
  isOpen,
  onSaved,
  onOpenMembership,
}: CreateBookingModalProps) {
  const form = useCreateBookingForm({ isOpen, onSaved });

  const createPayment = usePost<any, any>(
    (payload: any) => `/master/bookings/${payload.bookingId}/payment`,
    {},
  );
  const payCash = usePost<any, any>(
    (payload: any) => `/master/bookings/${payload.bookingId}/cash-payment`,
    {},
  );
  const payMembership = usePost<
    {
      data: {
        booking_code: string;
        status: string;
        payment_via: string;
        booking: { booking_code: string };
      };
    },
    { bookingId: number }
  >((payload) => `/master/bookings/${payload.bookingId}/pay-membership`, {
    invalidate: [["bookings"]],
  });

  const payableTotal = Number(
    form.createdBooking?.total_amount ?? form.pricingSummary.totalAmount,
  );
  const membershipUnitCount = form.cartLines.reduce((count, line) => {
    if (line.kind !== "service" || line.isFree) return count;
    return count + Math.min(line.qty, line.membershipQty ?? 0);
  }, 0);
  const isMembershipOnlyZeroTotal =
    payableTotal === 0 &&
    membershipUnitCount > 0 &&
    form.cartLines.every(
      (line) =>
        line.kind === "service" &&
        (line.isFree || (line.membershipQty ?? 0) >= line.qty),
    );

  const handleSelectPayment = async () => {
    if (!form.createdBooking?.id || createPayment.isPending) return;
    try {
      const response = await createPayment.mutateAsync({
        bookingId: form.createdBooking.id,
        idempotency_key: crypto.randomUUID(),
        ...buildBookingPaymentRedirectPayload(),
      });
      if (response?.data?.payment_url) {
        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error("Failed to create payment", error);
    }
  };

  const handlePayCash = async () => {
    if (!form.createdBooking?.id || payCash.isPending) return;
    try {
      const response = await payCash.mutateAsync({
        bookingId: form.createdBooking.id,
        idempotency_key: crypto.randomUUID(),
      });
      const bookingCode =
        response?.data?.booking_code ?? form.createdBooking.booking_code;
      toast.success("Pembayaran cash berhasil");
      window.location.href = `/payment/${encodeURIComponent(bookingCode)}/result`;
    } catch {
      toast.warning("Gagal memproses pembayaran cash");
    }
  };

  const handlePayMembership = async () => {
    if (!form.createdBooking?.id || payMembership.isPending) return;
    try {
      const response = await payMembership.mutateAsync({
        bookingId: form.createdBooking.id,
      });
      const bookingCode =
        response.data?.booking_code ??
        response.data?.booking?.booking_code ??
        form.createdBooking.booking_code;
      toast.success("Quota membership berhasil digunakan");
      window.location.href = `/payment/${encodeURIComponent(bookingCode)}/result`;
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Gagal menyelesaikan booking dengan membership.";
      toast.warning(message);
    }
  };

  const reset = () => {
    form.setCartLines([]);
    form.setForm({
      name: "",
      phone: "",
      staffAssignments: [],
      resourceAssignments: [],
      date: "",
      slotTime: "",
      voucherCode: "",
      isParallel: false,
    });
    form.setSearch("");
    form.setBrowseMode("services");
    form.setCat("spa");
    form.setSuccess(false);
    // form.setCreatedBooking(null); // Need to expose setter if needed
    form.setStep("services");
  };

  if (form.variantsLoading && !form.availableVariants.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#B5AFA9]">Loading...</p>
      </div>
    );
  }

  if (form.success) {
    return (
      <div
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#FEF1F4] flex items-center justify-center mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B55368"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1A1614] mb-1">
          Booking Created
        </h2>
        <p className="text-sm text-[#7A736E] mb-7">
          Appointment has been scheduled successfully.
        </p>

        <div className="w-full max-w-sm bg-[#F8F4F0] rounded-2xl p-5 text-left mb-6">
          {(
            [
              ["Customer", form.form.name],
              form.form.phone ? ["Phone", form.form.phone] : null,
              [
                "Date & Time",
                form.form.date && form.form.slotTime
                  ? `${form.form.date} ${form.form.slotTime}`
                  : "—",
              ],
              ["Duration", durFmt(form.totalDur)],
              ["Items", form.cartSummaryLabel],
              form.createdBooking?.applied_voucher?.code
                ? ["Voucher", form.createdBooking.applied_voucher.code]
                : null,
            ] as ([string, string] | null)[]
          )
            .filter((row): row is [string, string] => row !== null)
            .map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between py-2 border-b border-[#EDE8E3] last:border-0"
              >
                <span className="text-[13px] text-[#7A736E]">{k}</span>
                <span className="text-[13px] font-medium text-[#1A1614] text-right">
                  {v}
                </span>
              </div>
            ))}
          <div className="flex justify-between pt-3">
            <span className="text-sm font-semibold text-[#1A1614]">Total</span>
            <span className="text-base font-bold text-[#B55368]">
              {idr(
                Number(
                  form.createdBooking?.total_amount ??
                    form.pricingSummary.totalAmount,
                ),
              )}
            </span>
          </div>
        </div>

        <div className="space-y-3 w-full flex items-center justify-center flex-col">
          {isMembershipOnlyZeroTotal ? (
            <button
              type="button"
              onClick={handlePayMembership}
              disabled={!form.createdBooking?.id || payMembership.isPending}
              className="w-full max-w-sm py-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#EDE8E3] disabled:text-[#B5AFA9]"
            >
              <IdentificationCardIcon size={20} weight="duotone" />
              {payMembership.isPending
                ? "Memproses membership..."
                : `Bayar dengan Membership · ${membershipUnitCount} quota`}
            </button>
          ) : (
            <>
              <button
                onClick={handleSelectPayment}
                disabled={!form.createdBooking?.id || createPayment.isPending}
                className="w-full max-w-sm py-3 flex items-center justify-center gap-2 rounded-xl bg-[#B55368] text-white text-sm font-semibold hover:bg-[#C96480] transition-colors disabled:cursor-not-allowed disabled:bg-[#EDE8E3] disabled:text-[#B5AFA9]"
              >
                <CreditCardIcon className="size-5 mt-0.5 leading-loose" />
                {createPayment.isPending
                  ? "Redirecting..."
                  : "Select Payment Method"}
              </button>
              <button
                onClick={handlePayCash}
                disabled={!form.createdBooking?.id || payCash.isPending}
                className="w-full max-w-sm py-3 flex items-center justify-center gap-2 rounded-xl border border-[#E8B4C0] bg-white text-[#B55368] text-sm font-semibold hover:bg-[#FEF1F4] transition-colors disabled:cursor-not-allowed disabled:bg-[#EDE8E3] disabled:text-[#B5AFA9] disabled:border-transparent"
              >
                {payCash.isPending ? "Processing..." : "Bayar Cash"}
              </button>
            </>
          )}
          <button
            onClick={reset}
            className="w-full max-w-sm py-3 rounded-xl bg-[#B55368] text-white text-sm font-semibold hover:bg-[#C96480] transition-colors"
          >
            + New Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BookingModalLayout
        {...form}
        isEdit={false}
        onBuyMembership={() =>
          onOpenMembership?.({
            name: form.form.name,
            phone: form.form.phone,
          })
        }
      />
    </>
  );
}
