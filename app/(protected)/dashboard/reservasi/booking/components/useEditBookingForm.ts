import { usePut } from "@/app/libs/use-http";
import { toast } from "@heroui/react";
import { useBookingFormBase } from "./useBookingFormBase";
import type { SpaBooking } from "@/app/types/booking";

interface UseEditBookingFormProps {
  isOpen: boolean;
  initialBooking: SpaBooking | null;
  onSaved?: () => void;
}

export function useEditBookingForm({
  isOpen,
  initialBooking,
  onSaved,
}: UseEditBookingFormProps) {
  const base = useBookingFormBase({
    isOpen,
    action: "edit",
    initialBooking,
  });

  const updateBookingMutation = usePut<any, any>(
    (payload: any) => `/master/bookings/${payload.bookingId}`,
    {
      invalidate: [["bookings"]],
      onSuccess: () => {
        toast.success("Booking berhasil diupdate");
        onSaved?.();
      },
      onError: (error) => {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Terjadi kesalahan saat mengupdate booking.";
        toast.warning("Booking gagal diupdate", { description: message });
      },
    },
  );

  const handleBook = () => {
    if (!initialBooking?.id) return;

    const serviceVariants = base.form.staffAssignments.map((a) => {
      const times = base.unitTimes.get(a.client_key);
      return {
        variant_id: a.service_variant_id,
        staff_id: a.staff_id,
        client_key: a.client_key,
        start_time: times?.startTime,
        end_time: times?.endTime,
      };
    });

    const resourceAssignments = base.form.resourceAssignments.map((ra) => {
      const times = base.unitTimes.get(ra.client_key ?? "");
      return {
        service_variant_id: ra.service_variant_id,
        resource_id: ra.resource_id,
        client_key: ra.client_key,
        start_time: times?.startTime,
        end_time: times?.endTime,
      };
    });

    const normalizedCode = base.form.voucherCode.trim().toUpperCase();
    if (normalizedCode && !base.pricingSummary.isApplied) {
      toast.warning("Klik terapkan voucher dulu supaya total booking akurat");
      return;
    }

    updateBookingMutation.mutate({
      bookingId: Number(initialBooking.id),
      customer_name: base.form.name,
      customer_phone: base.form.phone,
      schedule_date: (base.form.date ?? "").slice(0, 10),
      slot_time: base.form.slotTime,
      voucher_code: normalizedCode || undefined,
      origin_source: initialBooking.origin_source || "direct",
      is_parallel: !!base.form.isParallel,
      service_variants: serviceVariants,
      resource_assignments: resourceAssignments,
      line_items: base.parentLineItemsPayload,
    });
  };

  return {
    ...base,
    handleBook,
    isSubmitPending: updateBookingMutation.isPending,
  };
}
