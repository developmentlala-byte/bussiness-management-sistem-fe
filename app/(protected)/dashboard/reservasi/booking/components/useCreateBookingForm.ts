import { usePost } from "@/app/libs/use-http";
import { toast } from "@heroui/react";
import { useBookingFormBase } from "./useBookingFormBase";
import type { SpaBooking } from "@/app/types/booking";

interface UseCreateBookingFormProps {
  isOpen: boolean;
  onSaved?: () => void;
}

export function useCreateBookingForm({
  isOpen,
  onSaved,
}: UseCreateBookingFormProps) {
  const base = useBookingFormBase({
    isOpen,
    action: "create",
  });

  const createBookingMutation = usePost<any, any>("/master/bookings", {
    invalidate: [["bookings"]],
    onSuccess: (response) => {
      base.setCreatedBooking(response?.data ?? null);
      base.setSuccess(true);
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Terjadi kesalahan saat membuat booking.";
      toast.danger("Gagal membuat booking", { description: message });
    },
  });

  const handleBook = () => {
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

    const bonusBookingPayload =
      base.selectedFreeVariant &&
      base.bonusBookingForm.date &&
      base.bonusBookingForm.slotTime
        ? {
            service_variant_id: base.selectedFreeVariant.id,
            schedule_date: base.bonusBookingForm.date,
            slot_time: base.bonusBookingForm.slotTime,
            is_parallel: !!base.form.isParallel,
            staff_assignments: base.bonusBookingForm.staffAssignments,
            resource_assignments: base.bonusBookingForm.resourceAssignments,
          }
        : undefined;

    createBookingMutation.mutate({
      customer_name: base.form.name,
      customer_phone: base.form.phone,
      schedule_date: (base.form.date ?? "").slice(0, 10),
      slot_time: base.form.slotTime,
      voucher_code: normalizedCode || undefined,
      origin_source: "direct",
      is_parallel: !!base.form.isParallel,
      service_variants: serviceVariants,
      resource_assignments: resourceAssignments,
      line_items: base.parentLineItemsPayload,
      bonus_booking: bonusBookingPayload,
    });
  };

  return {
    ...base,
    handleBook,
    isSubmitPending: createBookingMutation.isPending,
  };
}
