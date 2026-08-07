"use client";

import { useMemo } from "react";
import type {
  AppliedVoucherSnapshot,
  AvailableSlot,
  AvailableTherapist,
  BookingStaffAssignment,
} from "@/app/types/booking";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import type {
  BonusBookingFormState,
  CartLine,
  ExistingTherapist,
  FormState,
  Resource,
  BookingStep,
} from "./booking.types";
import { getBundleCalendarBounds } from "@/app/libs/bundle-pricing";
import { CustomerSection } from "./order-panel/CustomerSection";
import { CartSection } from "./order-panel/CartSection";
import { ScheduleSection } from "./order-panel/ScheduleSection";
import { AssignmentSection } from "./order-panel/AssignmentSection";
import { BonusSection } from "./order-panel/BonusSection";
import { ConfirmSection } from "./order-panel/ConfirmSection";
import { SummarySection } from "./order-panel/SummarySection";
import { useOrderPanelLogic } from "./useOrderPanelLogic";

interface OrderPanelProps {
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  cartLines: CartLine[];
  onRemoveLine: (index: number) => void;
  onReorderLines?: (oldIndex: number, newIndex: number) => void;
  onUpdateServiceQty: (index: number, newQty: number) => void;
  onClearCart: () => void;
  totalDur: number;
  selectedServiceVariantIds: number[];
  availableDates: string[];
  availableSlots: AvailableSlot[] | null;
  availableVariants: {
    id: number;
    catKey: string;
    subCat: string;
    name: string;
    duration: number;
    price: number;
    categoryId: number;
  }[];
  existingTherapists: ExistingTherapist[];
  onBook: () => void;
  onApplyVoucher: () => void;
  submitLabel: string;
  onBack: () => void;
  isMobile: boolean;
  isEdit: boolean;
  selectedBundle: BundlePromo | null;
  customerBookingCount: number | null;
  isSubmitPending: boolean;
  isApplyingVoucher: boolean;
  viewingMonth: string;
  setViewingMonth: (month: string) => void;
  pricingSummary: {
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    appliedVoucher: AppliedVoucherSnapshot | null;
    isApplied: boolean;
  };
  bonusBookingForm: BonusBookingFormState;
  selectedFreeVariant: { id: number; name: string; duration: number } | null;
  bonusAvailableSlots: AvailableSlot[] | null;
  selectedServiceVariantUnits: Array<{
    key: string;
    variantId: number;
    unitIndex: number;
  }>;
  onBonusScheduleModeChange: (mode: "same_date" | "custom_date") => void;
  onBonusDateChange: (date: string) => void;
  onBonusSlotSelect: (slot: AvailableSlot) => void;
  onBonusTherapistChange: (therapistId: number) => void;
  isBonusSlotConflictingWithPaidBooking: (slot: AvailableSlot) => boolean;
  unitTimes: Map<
    string,
    { startTime: string; endTime: string; duration: number; variantId: number }
  >;
  availableResources: Resource[];
}

export function OrderPanel(props: OrderPanelProps) {
  const {
    step,
    setStep,
    form,
    setForm,
    cartLines,
    onRemoveLine,
    onReorderLines,
    onUpdateServiceQty,
    totalDur,
    selectedServiceVariantIds,
    availableDates,
    availableSlots,
    availableVariants,
    existingTherapists,
    onBook,
    onApplyVoucher,
    submitLabel,
    onBack,
    isMobile,
    isEdit,
    selectedBundle,
    customerBookingCount,
    isSubmitPending,
    isApplyingVoucher,
    pricingSummary,
    bonusBookingForm,
    selectedFreeVariant,
    bonusAvailableSlots,
    selectedServiceVariantUnits,
    onBonusScheduleModeChange,
    onBonusDateChange,
    onBonusSlotSelect,
    onBonusTherapistChange,
    isBonusSlotConflictingWithPaidBooking,
    unitTimes,
    availableResources,
    setViewingMonth,
  } = props;

  const logic = useOrderPanelLogic({
    form,
    setForm,
    setStep,
    availableSlots,
    availableVariants,
    selectedServiceVariantIds,
    selectedServiceVariantUnits,
    existingTherapists,
    availableResources,
    unitTimes,
    bonusBookingForm,
    bonusAvailableSlots,
    selectedFreeVariant,
    isBonusSlotConflictingWithPaidBooking,
    setViewingMonth,
  });

  const bundleCalendarBounds = selectedBundle
    ? getBundleCalendarBounds(selectedBundle)
    : null;

  const canProceedFromCustomer = !!form.name.trim();
  const canProceedFromServices = cartLines.length > 0;
  const bonusBookingReady = selectedFreeVariant
    ? !!bonusBookingForm.date &&
      !!bonusBookingForm.slotTime &&
      bonusBookingForm.staffAssignments.length > 0
    : true;

  const allAssignmentsValid =
    form.staffAssignments.length > 0 &&
    form.staffAssignments.every((a) => a.staff_id > 0);

  const staffAssignmentConflicts = useMemo(() => {
    const conflicts: string[] = [];
    // ... logic remains same as before but uses unitTimes
    return conflicts;
  }, [form.staffAssignments, unitTimes, availableVariants]);

  // Redefine staffAssignmentConflicts because I truncated it
  const actualStaffAssignmentConflicts = useMemo(() => {
    const conflicts: string[] = [];
    form.staffAssignments.forEach((a, i) => {
      if (a.staff_id <= 0) return;
      const currentTimes = unitTimes.get(a.client_key);
      if (!currentTimes) return;

      for (let j = i + 1; j < form.staffAssignments.length; j++) {
        const b = form.staffAssignments[j];
        if (
          Number(b.staff_id) !== Number(a.staff_id) ||
          Number(b.staff_id) <= 0
        )
          continue;
        const otherTimes = unitTimes.get(b.client_key);
        if (!otherTimes) continue;

        const a0 = Number(currentTimes.startTime.replace(":", ""));
        const a1 = Number(currentTimes.endTime.replace(":", ""));
        const b0 = Number(otherTimes.startTime.replace(":", ""));
        const b1 = Number(otherTimes.endTime.replace(":", ""));

        if (a0 < b1 && b0 < a1) {
          const vA =
            availableVariants.find((v) => v.id === a.service_variant_id)
              ?.name ?? `Layanan #${a.service_variant_id}`;
          const vB =
            availableVariants.find((v) => v.id === b.service_variant_id)
              ?.name ?? `Layanan #${b.service_variant_id}`;
          conflicts.push(`Bentrok: ${vA} & ${vB}`);
        }
      }
    });
    return conflicts;
  }, [form.staffAssignments, unitTimes, availableVariants]);

  const requiredCountsByVariant = useMemo(() => {
    const map = new Map<number, number>();
    const counts = new Map<number, number>();
    selectedServiceVariantUnits.forEach((u) =>
      counts.set(u.variantId, (counts.get(u.variantId) ?? 0) + 1),
    );

    counts.forEach((count, variantId) => {
      const needed =
        form.isParallel && count > 1
          ? Math.max(2, Math.ceil(count / 2))
          : Math.ceil(count / 2);
      map.set(variantId, needed);
    });
    return map;
  }, [selectedServiceVariantUnits, form.isParallel]);

  const variantTherapistCountErrors = useMemo(() => {
    const errors: Array<{
      variantId: number;
      variantName: string;
      requiredCount: number;
      selectedUniqueCount: number;
    }> = [];

    const assignedByVariant = new Map<number, Set<number>>();
    form.staffAssignments.forEach((a) => {
      if (a.staff_id <= 0) return;
      const set = assignedByVariant.get(a.service_variant_id) ?? new Set();
      set.add(a.staff_id);
      assignedByVariant.set(a.service_variant_id, set);
    });

    const assignedUniqueCounts = new Map<number, number>();
    assignedByVariant.forEach((set, variantId) =>
      assignedUniqueCounts.set(variantId, set.size),
    );

    requiredCountsByVariant.forEach((requiredCount, variantId) => {
      const selectedUniqueCount = assignedUniqueCounts.get(variantId) ?? 0;
      if (selectedUniqueCount < requiredCount) {
        const name =
          availableVariants.find((v) => v.id === variantId)?.name ??
          `Layanan #${variantId}`;
        errors.push({
          variantId,
          variantName: name,
          requiredCount,
          selectedUniqueCount,
        });
      }
    });

    return errors;
  }, [form.staffAssignments, requiredCountsByVariant, availableVariants]);

  const allUnitsAssigned =
    selectedServiceVariantUnits.length === 0
      ? allAssignmentsValid
      : selectedServiceVariantUnits.every((unit) => {
          const staffAssign = form.staffAssignments.find(
            (a) => a.client_key === unit.key,
          );
          const resAssign = form.resourceAssignments.find(
            (a) => a.client_key === unit.key,
          );

          const slot = availableSlots?.find(
            (s) => s.slot_time === form.slotTime,
          );
          const hasResOptions =
            (slot?.available_resources_by_variant?.[unit.variantId]?.length ??
              0) > 0;

          const staffOk = !!staffAssign && staffAssign.staff_id > 0;
          const resOk =
            !hasResOptions || (!!resAssign && resAssign.resource_id > 0);

          return staffOk && resOk;
        });

  const isInEditMode = existingTherapists.length > 0;
  const hasItems =
    cartLines.length > 0 || (isInEditMode && form.staffAssignments.length > 0);

  const canBook =
    !!form.name.trim() &&
    hasItems &&
    !!form.date &&
    !!form.slotTime &&
    allUnitsAssigned &&
    variantTherapistCountErrors.length === 0 &&
    actualStaffAssignmentConflicts.length === 0 &&
    bonusBookingReady;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F4F0]">
      {isMobile && (
        <button
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 border-b border-[#EDE8E3] bg-white px-4 py-3 text-[13px] font-medium text-[#7A736E] transition-colors hover:text-[#1A1614]"
        >
          <span className="mr-1">←</span>
          Back
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#D5CFC9] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="px-4 py-4 space-y-4">
          {step === "customer" && (
            <CustomerSection
              form={form}
              setForm={setForm}
              customerBookingCount={customerBookingCount}
            />
          )}

          {(step === "services" ||
            step === "datetime" ||
            step === "confirm") && (
            <CartSection
              cartLines={cartLines}
              onRemoveLine={onRemoveLine}
              onReorderLines={onReorderLines}
              onUpdateServiceQty={onUpdateServiceQty}
            />
          )}

          {step === "datetime" && cartLines.length > 0 && (
            <ScheduleSection
              form={form}
              setForm={setForm}
              availableDates={availableDates}
              availableSlots={availableSlots}
              bundleCalendarBounds={bundleCalendarBounds}
              onSlotSelect={logic.handleSlotSelect}
              isSlotDisabled={logic.isSlotDisabled}
              onDateSelect={logic.handleDateSelect}
              onDateFocusChange={logic.handleDateFocusChange}
            />
          )}

          {step === "confirm" && (
            <>
              <ConfirmSection
                form={form}
                isEdit={isEdit}
                setStep={setStep}
                totalDur={totalDur}
                unitTimes={unitTimes}
                selectedServiceVariantUnits={selectedServiceVariantUnits}
                availableVariants={availableVariants}
              />

              <AssignmentSection
                form={form}
                setForm={setForm}
                selectedServiceVariantUnits={selectedServiceVariantUnits}
                availableVariants={availableVariants}
                availableSlots={availableSlots}
                availableResources={availableResources}
                existingTherapists={existingTherapists}
                unitTimes={unitTimes}
                therapistAssignmentByKey={logic.therapistAssignmentByKey}
                resourceAssignmentByKey={logic.resourceAssignmentByKey}
                availableTherapistsForSlot={logic.availableTherapistsForSlot}
                staffAssignmentConflicts={actualStaffAssignmentConflicts}
                variantTherapistCountErrors={variantTherapistCountErrors}
              />

              {selectedFreeVariant && (
                <BonusSection
                  bonusBookingForm={bonusBookingForm}
                  selectedFreeVariant={selectedFreeVariant}
                  bonusAvailableSlots={bonusAvailableSlots}
                  onBonusScheduleModeChange={onBonusScheduleModeChange}
                  onBonusDateChange={onBonusDateChange}
                  onBonusSlotSelect={onBonusSlotSelect}
                  onBonusTherapistChange={onBonusTherapistChange}
                  isBonusSlotDisabled={logic.isBonusSlotDisabled}
                  bonusAvailableTherapistsForSlot={
                    logic.bonusAvailableTherapistsForSlot
                  }
                  selectedBonusTherapist={logic.selectedBonusTherapist}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#EDE8E3] bg-white px-4 py-3">
        {(step === "services" || step === "datetime" || step === "confirm") &&
          cartLines.length > 0 && (
            <SummarySection
              form={form}
              setForm={setForm}
              totalDur={totalDur}
              pricingSummary={pricingSummary}
              onApplyVoucher={onApplyVoucher}
              onBook={onBook}
              isApplyingVoucher={isApplyingVoucher}
              isSubmitPending={isSubmitPending}
              canBook={canBook}
              submitLabel={submitLabel}
            />
          )}

        {step === "customer" && (
          <button
            onClick={() => setStep("services")}
            disabled={!canProceedFromCustomer}
            className={`w-full rounded-xl py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
              canProceedFromCustomer
                ? "bg-[#B55368] text-white hover:bg-[#C96480]"
                : "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
            }`}
          >
            Next →
          </button>
        )}

        {step === "services" && (
          <div className="flex gap-2">
            <button
              onClick={() => setStep("customer")}
              className="flex-1 rounded-xl border border-[#EDE8E3] bg-white py-2.5 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
            >
              Back
            </button>
            {canProceedFromServices && (
              <button
                onClick={() => setStep("datetime")}
                className="flex-1 rounded-xl bg-[#B55368] text-white py-2.5 text-[13px] font-semibold hover:bg-[#C96480] transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        )}

        {step === "datetime" && (
          <div className="flex gap-2">
            <button
              onClick={() => setStep(isEdit ? "confirm" : "services")}
              className="flex-1 rounded-xl border border-[#EDE8E3] bg-white py-2.5 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
            >
              Back
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex gap-2">
            <button
              onClick={() => setStep("datetime")}
              className="flex-1 rounded-xl border border-[#EDE8E3] bg-white py-2.5 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
            >
              Back
            </button>
            <button
              onClick={onBook}
              disabled={!canBook || isSubmitPending}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
                canBook && !isSubmitPending
                  ? "bg-[#B55368] text-white hover:bg-[#C96480]"
                  : "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
              }`}
            >
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
