"use client";

import { useMemo, useCallback, useEffect } from "react";
import type {
  AvailableSlot,
  AvailableTherapist,
  BookingResourceAssignment,
} from "@/app/types/booking";
import type {
  FormState,
  LocalStaffAssignment,
  Resource,
  BookingStep,
  BonusBookingFormState,
  ExistingTherapist,
} from "./booking.types";
import {
  addMinutesToTime,
  eligibleTherapistIdsForVariant,
  isTimeRangeOverlap,
} from "./bookingModal.utils";

interface UseOrderPanelLogicProps {
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  setStep: (step: BookingStep) => void;
  availableSlots: AvailableSlot[] | null;
  availableVariants: any[];
  selectedServiceVariantIds: number[];
  selectedServiceVariantUnits: any[];
  existingTherapists: ExistingTherapist[];
  availableResources: Resource[];
  unitTimes: Map<string, any>;
  bonusBookingForm: BonusBookingFormState;
  bonusAvailableSlots: AvailableSlot[] | null;
  selectedFreeVariant: any | null;
  isBonusSlotConflictingWithPaidBooking: (slot: AvailableSlot) => boolean;
  setViewingMonth?: (month: string) => void;
}

export function useOrderPanelLogic({
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
}: UseOrderPanelLogicProps) {
  const therapistAssignmentByKey = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    const slot = availableSlots?.find((s) => s.slot_time === form.slotTime);
    const slotTherapists = slot?.available_therapists ?? [];
    const sortedAvailableTherapists = [...slotTherapists].sort((a, b) => {
      const timeA = a.last_assigned_at
        ? new Date(a.last_assigned_at).getTime()
        : 0;
      const timeB = b.last_assigned_at
        ? new Date(b.last_assigned_at).getTime()
        : 0;
      return timeA - timeB;
    });

    const existingTherapistsById = new Map(
      existingTherapists.map(
        (t) => [t.id, { id: t.id, name: t.name }] as const,
      ),
    );

    form.staffAssignments.forEach((assignment) => {
      const fromSlot = sortedAvailableTherapists.find(
        (t) => t.id === assignment.staff_id,
      );

      if (fromSlot) {
        map.set(assignment.client_key, fromSlot);
        return;
      }

      const fromExisting = existingTherapistsById.get(assignment.staff_id);
      if (fromExisting) {
        map.set(assignment.client_key, fromExisting);
        return;
      }

      if (assignment.staff_id > 0) {
        map.set(assignment.client_key, {
          id: assignment.staff_id,
          name: `Therapist #${assignment.staff_id}`,
        });
      }
    });

    return map;
  }, [
    form.staffAssignments,
    availableSlots,
    form.slotTime,
    existingTherapists,
  ]);

  const resourceAssignmentByKey = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();

    form.resourceAssignments.forEach((assignment) => {
      const res = availableResources.find(
        (r) => Number(r.id) === Number(assignment.resource_id),
      );
      if (res) {
        map.set(assignment.client_key ?? "", {
          id: res.id,
          name: `${res.resource_code} (${res.room_name})`,
        });
        return;
      }

      if (assignment.resource_id > 0) {
        map.set(assignment.client_key ?? "", {
          id: assignment.resource_id,
          name: `Resource #${assignment.resource_id}`,
        });
      }
    });

    return map;
  }, [form.resourceAssignments, availableResources]);

  const availableTherapistsForSlot = useMemo((): AvailableTherapist[] => {
    if (availableSlots && form.slotTime) {
      const slot = availableSlots.find((s) => s.slot_time === form.slotTime);
      if (slot?.available_therapists.length) {
        return [...slot.available_therapists].sort((a, b) => {
          const timeA = a.last_assigned_at
            ? new Date(a.last_assigned_at).getTime()
            : 0;
          const timeB = b.last_assigned_at
            ? new Date(b.last_assigned_at).getTime()
            : 0;
          return timeA - timeB;
        });
      }
    }
    return existingTherapists.map((t) => ({ id: t.id, name: t.name }));
  }, [availableSlots, form.slotTime, existingTherapists]);

  const bonusAvailableTherapistsForSlot = useMemo((): AvailableTherapist[] => {
    if (
      !bonusAvailableSlots ||
      !bonusBookingForm.slotTime ||
      !selectedFreeVariant
    )
      return [];
    const slot = bonusAvailableSlots.find(
      (s) => s.slot_time === bonusBookingForm.slotTime,
    );
    if (!slot) return [];

    const eligibleIds = eligibleTherapistIdsForVariant(
      slot,
      selectedFreeVariant.id,
    );
    return (slot.available_therapists ?? []).filter((t) =>
      eligibleIds.includes(t.id),
    );
  }, [bonusAvailableSlots, bonusBookingForm.slotTime, selectedFreeVariant]);

  const selectedBonusTherapist = useMemo(() => {
    const selectedStaffId = bonusBookingForm.staffAssignments[0]?.staff_id;
    if (!selectedStaffId) return null;
    return (
      bonusAvailableTherapistsForSlot.find((t) => t.id === selectedStaffId) ??
      null
    );
  }, [bonusAvailableTherapistsForSlot, bonusBookingForm.staffAssignments]);

  const isSlotDisabled = useCallback(
    (slot: AvailableSlot): boolean => {
      if (!slot.is_available) return true;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (form.date === todayStr) {
        const [slotH, slotM] = slot.slot_time.split(":").map(Number);
        const nowH = now.getHours();
        const nowM = now.getMinutes();
        if (slotH < nowH || (slotH === nowH && slotM <= nowM)) {
          return true;
        }
      }
      return false;
    },
    [form.date],
  );

  const isBonusSlotDisabled = useCallback(
    (slot: AvailableSlot): boolean => {
      if (!slot.is_available) return true;
      if (isBonusSlotConflictingWithPaidBooking(slot)) return true;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (bonusBookingForm.date === todayStr) {
        const [slotH, slotM] = slot.slot_time.split(":").map(Number);
        const nowH = now.getHours();
        const nowM = now.getMinutes();
        if (slotH < nowH || (slotH === nowH && slotM <= nowM)) {
          return true;
        }
      }
      return false;
    },
    [bonusBookingForm.date, isBonusSlotConflictingWithPaidBooking],
  );

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (!slot.is_available) return;

    if (slot.suggested_assignments && slot.suggested_assignments.length > 0) {
      setForm((prev) => ({
        ...prev,
        slotTime: slot.slot_time,
        staffAssignments: slot.suggested_assignments!.map((a, i) => ({
          ...a,
          client_key: a.client_key ?? `${a.service_variant_id}:${i + 1}`,
        })),
        resourceAssignments: slot.suggested_resource_assignments ?? [],
      }));
      setStep("confirm");
      return;
    }

    const variantCategoryMap = new Map<number, number>();
    selectedServiceVariantIds.forEach((variantId) => {
      const variant = availableVariants.find((v) => v.id === variantId);
      if (variant) variantCategoryMap.set(variantId, variant.categoryId);
    });

    const staffUsageCount = new Map<number, number>();
    const newAssignments: LocalStaffAssignment[] = [];
    const newResourceAssignments: BookingResourceAssignment[] = [];
    const paxTherapistMap = new Map<number, number>();
    const usedResourceIds = new Set<number>();

    const slotUnitTimes = new Map<
      string,
      { startTime: string; endTime: string; duration: number }
    >();

    if (form.isParallel) {
      const paxOffsets = new Map<number, number>();
      selectedServiceVariantUnits.forEach((u) => {
        const variant = availableVariants.find((v) => v.id === u.variantId);
        const dur = variant?.duration ?? 0;
        const offset = paxOffsets.get(u.unitIndex) ?? 0;
        const start = addMinutesToTime(slot.slot_time, offset);
        const end = addMinutesToTime(start, dur);
        slotUnitTimes.set(u.key, {
          startTime: start,
          endTime: end,
          duration: dur,
        });
        paxOffsets.set(u.unitIndex, offset + dur);
      });
    } else {
      let globalOffset = 0;
      selectedServiceVariantUnits.forEach((u) => {
        const variant = availableVariants.find((v) => v.id === u.variantId);
        const dur = variant?.duration ?? 0;
        const start = addMinutesToTime(slot.slot_time, globalOffset);
        const end = addMinutesToTime(start, dur);
        slotUnitTimes.set(u.key, {
          startTime: start,
          endTime: end,
          duration: dur,
        });
        globalOffset += dur;
      });
    }

    const localLastAssigned = new Map<number, number>();
    slot.available_therapists?.forEach((t) => {
      localLastAssigned.set(
        t.id,
        t.last_assigned_at ? new Date(t.last_assigned_at).getTime() : 0,
      );
    });

    const getSortedEligibleIds = (ids: number[]) => {
      return [...ids].sort((a, b) => {
        const timeA = localLastAssigned.get(a) ?? 0;
        const timeB = localLastAssigned.get(b) ?? 0;
        return timeA - timeB;
      });
    };

    for (const unit of selectedServiceVariantUnits) {
      const eligibleIds = getSortedEligibleIds(
        eligibleTherapistIdsForVariant(slot, unit.variantId),
      );

      const currentUnitTime = slotUnitTimes.get(unit.key);
      let selectedId: number | null = null;

      for (const id of eligibleIds) {
        const hasOverlap = newAssignments.some((a) => {
          if (a.staff_id !== id) return false;
          const otherTime = slotUnitTimes.get(a.client_key ?? "");
          if (!currentUnitTime || !otherTime) return false;
          return isTimeRangeOverlap(
            currentUnitTime.startTime,
            currentUnitTime.duration,
            otherTime.startTime,
            otherTime.duration,
          );
        });

        if (!hasOverlap) {
          selectedId = id;
          break;
        }
      }

      if (!selectedId && eligibleIds.length > 0) {
        selectedId = eligibleIds[0];
      }

      if (selectedId !== null) {
        newAssignments.push({
          client_key: unit.key,
          service_variant_id: unit.variantId,
          staff_id: selectedId,
          start_time: currentUnitTime?.startTime ?? null,
          end_time: currentUnitTime?.endTime ?? null,
        });

        const currentMax = Math.max(
          ...Array.from(localLastAssigned.values()),
          0,
        );
        localLastAssigned.set(selectedId, currentMax + 1000);

        staffUsageCount.set(
          selectedId,
          (staffUsageCount.get(selectedId) ?? 0) + 1,
        );
        if (!paxTherapistMap.has(unit.unitIndex)) {
          paxTherapistMap.set(unit.unitIndex, selectedId);
        }
      }

      const eligibleResourceIds =
        slot.available_resources_by_variant?.[unit.variantId] ?? [];
      let pickedResourceId: number | null = null;

      for (const resId of eligibleResourceIds) {
        if (!usedResourceIds.has(resId)) {
          pickedResourceId = resId;
          break;
        }
      }

      if (!pickedResourceId && eligibleResourceIds.length > 0) {
        pickedResourceId = eligibleResourceIds[0];
      }

      if (pickedResourceId && pickedResourceId !== -1) {
        usedResourceIds.add(pickedResourceId);
        newResourceAssignments.push({
          service_variant_id: unit.variantId,
          resource_id: pickedResourceId,
          client_key: unit.key,
          start_time: currentUnitTime?.startTime ?? "",
          end_time: currentUnitTime?.endTime ?? "",
        });
      }
    }

    setForm((prev) => ({
      ...prev,
      slotTime: slot.slot_time,
      staffAssignments: newAssignments,
      resourceAssignments: newResourceAssignments,
    }));
    setStep("confirm");
  };

  const handleTherapistChange = (
    assignmentKey: string,
    therapistId: number,
  ) => {
    setForm((prev) => ({
      ...prev,
      staffAssignments: prev.staffAssignments.map((a) =>
        a.client_key === assignmentKey ? { ...a, staff_id: therapistId } : a,
      ),
    }));
  };

  const handleResourceChange = (assignmentKey: string, resourceId: number) => {
    console.log("[useOrderPanelLogic] handleResourceChange", { assignmentKey, resourceId });
    setForm((prev) => {
      const exists = prev.resourceAssignments.some(
        (a) => a.client_key === assignmentKey,
      );

      if (!exists) {
        const variantId = Number(assignmentKey.split(":")[1]);
        return {
          ...prev,
          resourceAssignments: [
            ...prev.resourceAssignments,
            {
              client_key: assignmentKey,
              resource_id: resourceId,
              service_variant_id: variantId,
              start_time: null,
              end_time: null,
            },
          ],
        };
      }

      return {
        ...prev,
        resourceAssignments: prev.resourceAssignments.map((a) =>
          a.client_key === assignmentKey
            ? { ...a, resource_id: resourceId }
            : a,
        ),
      };
    });
  };

  const handleDateFocusChange = (date: { year: number; month: number }) => {
    const monthStr = `${date.year}-${String(date.month).padStart(2, "0")}`;
    // @ts-ignore
    setViewingMonth?.(monthStr);
  };

  const handleDateSelect = (date: { toString: () => string }) => {
    const dateStr = date.toString();
    setForm((prev) => ({
      ...prev,
      date: dateStr,
      slotTime: "",
      staffAssignments: prev.date === dateStr ? prev.staffAssignments : [],
    }));
  };

  useEffect(() => {
    if (
      !availableSlots ||
      !form.slotTime ||
      selectedServiceVariantUnits.length === 0
    )
      return;

    const slot = availableSlots.find((s) => s.slot_time === form.slotTime);
    if (!slot) return;

    setForm((prev) => {
      const missingUnits = selectedServiceVariantUnits.filter(
        (unit) =>
          !prev.staffAssignments.some(
            (a) => a.client_key === unit.key && a.staff_id > 0,
          ),
      );
      if (missingUnits.length === 0) return prev;

      const localLastAssigned = new Map<number, number>();
      slot.available_therapists?.forEach((t) => {
        localLastAssigned.set(
          t.id,
          t.last_assigned_at ? new Date(t.last_assigned_at).getTime() : 0,
        );
      });

      const getSortedEligibleIds = (ids: number[]) => {
        return [...ids].sort((a, b) => {
          const timeA = localLastAssigned.get(a) ?? 0;
          const timeB = localLastAssigned.get(b) ?? 0;
          return timeA - timeB;
        });
      };

      const newAssignments: LocalStaffAssignment[] = [];
      missingUnits.forEach((unit) => {
        const serverSuggestion = slot.suggested_assignments?.find(
          (s) => s.client_key === unit.key,
        );
        if (serverSuggestion && serverSuggestion.staff_id > 0) {
          newAssignments.push({
            client_key: unit.key,
            service_variant_id: unit.variantId,
            staff_id: serverSuggestion.staff_id,
            start_time: serverSuggestion.start_time ?? null,
            end_time: serverSuggestion.end_time ?? null,
          });
          return;
        }

        const eligibleIds = getSortedEligibleIds(
          eligibleTherapistIdsForVariant(slot, unit.variantId),
        );
        let staffId = 0;

        const currentUnitTime = unitTimes.get(unit.key);

        for (const id of eligibleIds) {
          const hasConflict = [
            ...prev.staffAssignments,
            ...newAssignments,
          ].some((a) => {
            if (a.staff_id !== id) return false;
            const otherTime = unitTimes.get(a.client_key ?? "");
            if (!currentUnitTime || !otherTime) return false;
            return isTimeRangeOverlap(
              currentUnitTime.startTime,
              currentUnitTime.duration,
              otherTime.startTime,
              otherTime.duration,
            );
          });

          if (!hasConflict) {
            staffId = id;
            break;
          }
        }

        if (staffId === 0 && eligibleIds.length > 0) {
          staffId = eligibleIds[0];
        }

        if (staffId > 0) {
          const currentMax = Math.max(
            ...Array.from(localLastAssigned.values()),
            0,
          );
          localLastAssigned.set(staffId, currentMax + 1000);

          newAssignments.push({
            client_key: unit.key,
            service_variant_id: unit.variantId,
            staff_id: staffId,
            start_time: currentUnitTime?.startTime ?? null,
            end_time: currentUnitTime?.endTime ?? null,
          });
        }
      });

      if (newAssignments.length === 0) return prev;

      return {
        ...prev,
        staffAssignments: [...prev.staffAssignments, ...newAssignments],
      };
    });
  }, [
    availableSlots,
    form.slotTime,
    selectedServiceVariantUnits,
    availableVariants,
    setForm,
    unitTimes,
  ]);

  return {
    therapistAssignmentByKey,
    resourceAssignmentByKey,
    availableTherapistsForSlot,
    bonusAvailableTherapistsForSlot,
    selectedBonusTherapist,
    isSlotDisabled,
    isBonusSlotDisabled,
    handleDateFocusChange,
    handleDateSelect,
    handleSlotSelect,
    handleTherapistChange,
    handleResourceChange,
  };
}
