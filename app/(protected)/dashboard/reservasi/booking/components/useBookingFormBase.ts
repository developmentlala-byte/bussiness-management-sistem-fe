import { useState, useMemo, useEffect, useCallback } from "react";
import { useApiFetch } from "@/app/libs/use-http";
import { apiPost } from "@/app/services/api";
import { toast } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type {
  SpaBooking,
  AvailableSlotsResponse,
  AvailableDatesResponse,
  AvailableSlot,
} from "@/app/types/booking";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import {
  calcBundlePricing,
  getBundleCalendarBounds,
} from "@/app/libs/bundle-pricing";
import {
  addMinutesToTime,
  buildInitialCartLines,
  buildInitialLocalResourceAssignments,
  buildInitialLocalStaffAssignments,
  getCurrentMonth,
  isBonusSlotOverlappingPaidBooking,
  parseTimeToMinutes,
  toFormDateTime,
  buildExistingTherapists,
  eligibleTherapistIdsForVariant,
} from "./bookingModal.utils";
import type {
  Variant,
  CartLine,
  FormState,
  BonusBookingFormState,
  BookingStep,
  CreatedBooking,
  VoucherPreview,
  LocalStaffAssignment,
  Resource,
  BogoEligibleService,
  ExistingTherapist,
} from "./booking.types";

export interface UseBookingFormBaseProps {
  isOpen: boolean;
  action: "create" | "edit";
  initialBooking?: SpaBooking | null;
}

export function useBookingFormBase({
  isOpen,
  action,
  initialBooking,
}: UseBookingFormBaseProps) {
  const isEdit = action === "edit" && !!initialBooking;

  // ── Initial values ──────────────────────────────────────────────────────────
  const initialEditDateTime = useMemo(
    () =>
      isEdit
        ? toFormDateTime(initialBooking!.schedule_date)
        : { date: "", time: "" },
    [isEdit, initialBooking],
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [browseMode, setBrowseMode] = useState<"services" | "bundles">("services");
  const [cat, setCat] = useState("spa-wellness-6a3e4be004fc9");
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [step, setStep] = useState<BookingStep>(isEdit ? "confirm" : "customer");
  const [form, setForm] = useState<FormState>({
    name: isEdit ? (initialBooking?.customer_name ?? "") : "",
    phone: isEdit ? (initialBooking?.customer_phone ?? "") : "",
    staffAssignments:
      isEdit && initialBooking
        ? buildInitialLocalStaffAssignments(initialBooking)
        : [],
    resourceAssignments:
      isEdit && initialBooking
        ? buildInitialLocalResourceAssignments(initialBooking)
        : [],
    date: initialEditDateTime.date,
    slotTime: initialEditDateTime.time,
    voucherCode: isEdit ? (initialBooking?.applied_voucher?.code ?? "") : "",
    isParallel: isEdit ? (initialBooking?.is_parallel ?? false) : false,
  });
  const [viewingMonth, setViewingMonth] = useState<string>(() => {
    if (initialEditDateTime.date) return initialEditDateTime.date.slice(0, 7);
    return getCurrentMonth();
  });
  const [success, setSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(
    isEdit && initialBooking
      ? {
          id: Number(initialBooking.id),
          booking_code: initialBooking.booking_code,
          total_amount: Number(initialBooking.total_amount ?? 0),
          subtotal_amount: Number(
            initialBooking.subtotal_amount ?? initialBooking.total_amount ?? 0,
          ),
          discount_amount: Number(initialBooking.discount_amount ?? 0),
          applied_voucher: initialBooking.applied_voucher ?? null,
        }
      : null,
  );
  const [mobileView, setMobileView] = useState<"browse" | "order">("browse");
  const [voucherPreview, setVoucherPreview] = useState<VoucherPreview | null>(
    isEdit && initialBooking
      ? {
          code: initialBooking.applied_voucher?.code ?? "",
          subtotalAmount: Number(
            initialBooking.subtotal_amount ?? initialBooking.total_amount ?? 0,
          ),
          discountAmount: Number(initialBooking.discount_amount ?? 0),
          totalAmount: Number(initialBooking.total_amount ?? 0),
          appliedVoucher: initialBooking.applied_voucher ?? null,
          eligibleFreeServices: [],
          bogoCapAmount: null,
        }
      : null,
  );
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [focusBogo, setFocusBogo] = useState(false);
  const [bonusBookingForm, setBonusBookingForm] = useState<BonusBookingFormState>({
    scheduleMode: "same_date",
    date: "",
    slotTime: "",
    staffAssignments: [],
    resourceAssignments: [],
  });

  // ── API Fetches ────────────────────────────────────────────────────────────
  const { data: variantsResp, isLoading: variantsLoading } = useApiFetch<{
    data: any[];
  }>(["variants"], "/master/variants", undefined, isOpen);

  const { data: resourcesResp } = useApiFetch<{ data: Resource[] }>(
    ["resources"],
    "/master/resources",
    undefined,
    isOpen,
  );

  const { data: bundlesResp, isLoading: bundlesLoading } = useApiFetch<{
    data: BundlePromo[];
  }>(["bundle-promo-active"], "/master/bundle-promo/active", undefined, isOpen);

  const availableVariants: Variant[] = useMemo(() => {
    return (variantsResp?.data ?? []).map((v) => ({
      id: v.id,
      catKey:
        v.category?.slug ??
        (v.service?.name ?? "other").toLowerCase().replace(/\s+/g, "_"),
      subCat: v.service?.name ?? v.category?.name ?? "",
      name: v.name,
      duration: v.duration_minutes ?? v.duration ?? 0,
      price: Number(v.final_price ?? v.retail_price ?? 0),
      categoryId: v.category?.id ?? v.service?.bms_ms_service_category_id ?? 0,
    }));
  }, [variantsResp]);

  const activeBundles: BundlePromo[] = useMemo(() => bundlesResp?.data ?? [], [bundlesResp]);
  const availableResources: Resource[] = useMemo(() => resourcesResp?.data ?? [], [resourcesResp]);

  useEffect(() => {
    if (form.date) {
      const newMonth = form.date.slice(0, 7);
      setViewingMonth((prev) => (prev === newMonth ? prev : newMonth));
    }
  }, [form.date]);

  const selectedServiceVariantUnits = useMemo(() => {
    const units: Array<{
      key: string;
      variantId: number;
      unitIndex: number;
      groupId: string;
    }> = [];

    cartLines.forEach((line, lineIdx) => {
      const groupId = `group_${lineIdx + 1}`;

      if (line.kind === "service") {
        if (line.isFree) return;
        const qty = line.qty;

        for (let i = 0; i < qty; i++) {
          units.push({
            key: `${groupId}:${line.variant.id}:${i + 1}`,
            variantId: line.variant.id,
            unitIndex: i + 1,
            groupId,
          });
        }
      } else if (line.kind === "bundle") {
        line.bundle.bundle_items?.forEach((item) => {
          const variantId = Number(item.bms_ms_service_variant_id);
          const qty = Math.max(1, Number(item.quantity ?? 1));

          for (let i = 0; i < qty; i++) {
            units.push({
              key: `${groupId}:${variantId}:${i + 1}`,
              variantId,
              unitIndex: i + 1,
              groupId,
            });
          }
        });
      }
    });

    return units;
  }, [cartLines]);

  const unitTimes = useMemo(() => {
    const result = new Map<
      string,
      { startTime: string; endTime: string; duration: number }
    >();
    if (!form.slotTime) return result;

    let currentGroupStart = form.slotTime;

    const groupIds = Array.from(
      new Set(selectedServiceVariantUnits.map((u) => u.groupId)),
    );

    groupIds.forEach((groupId) => {
      const groupUnits = selectedServiceVariantUnits.filter(
        (u) => u.groupId === groupId,
      );
      if (groupUnits.length === 0) return;

      const groupTotalQty = groupUnits.length;
      const groupIsParallel = form.isParallel && groupTotalQty >= 2;

      let groupMaxEnd = currentGroupStart;
      let tempSequentialStart = currentGroupStart;
      const paxOffsets = new Map<number, number>();

      groupUnits.forEach((unit) => {
        const variant = availableVariants.find((v) => v.id === unit.variantId);
        const duration = Number(
          variant?.duration ?? variant?.duration_minutes ?? 0,
        );

        let actualStartTime: string;
        if (groupIsParallel) {
          const offset = paxOffsets.get(unit.unitIndex) ?? 0;
          actualStartTime = addMinutesToTime(currentGroupStart, offset);
          paxOffsets.set(unit.unitIndex, offset + duration);
        } else {
          actualStartTime = tempSequentialStart;
        }

        const actualEndTime = addMinutesToTime(actualStartTime, duration);

        result.set(unit.key, {
          startTime: actualStartTime,
          endTime: actualEndTime,
          duration,
        });

        if (
          parseTimeToMinutes(actualEndTime) > parseTimeToMinutes(groupMaxEnd)
        ) {
          groupMaxEnd = actualEndTime;
        }

        if (!groupIsParallel) {
          tempSequentialStart = actualEndTime;
        }
      });

      currentGroupStart = groupMaxEnd;
    });

    return result;
  }, [form.slotTime, selectedServiceVariantUnits, availableVariants, form.isParallel]);

  // Sync staff assignments
  useEffect(() => {
    if (isEdit && cartLines.length === 0 && form.staffAssignments.length > 0) {
      return;
    }

    setForm((prev) => {
      const currentAssignments = prev.staffAssignments;
      const newAssignments: LocalStaffAssignment[] = [];
      const usedInNew = new Set<string>();

      if (selectedServiceVariantUnits.length === 0) {
        if (currentAssignments.length === 0) return prev;
        return { ...prev, staffAssignments: [] };
      }

      selectedServiceVariantUnits.forEach((unit) => {
        const existing = currentAssignments.find((a) => a.client_key === unit.key);
        if (existing) {
          newAssignments.push(existing);
          usedInNew.add(unit.key);
        }
      });

      selectedServiceVariantUnits.forEach((unit) => {
        if (usedInNew.has(unit.key)) return;

        const sameVariantSibling = newAssignments.find(
          (a) => a.service_variant_id === unit.variantId && a.staff_id > 0,
        );

        newAssignments.push({
          client_key: unit.key,
          service_variant_id: unit.variantId,
          staff_id: !prev.isParallel && sameVariantSibling ? sameVariantSibling.staff_id : 0,
        });
      });

      newAssignments.sort((a, b) => a.client_key.localeCompare(b.client_key));

      const isChanged =
        newAssignments.length !== currentAssignments.length ||
        newAssignments.some((a, i) => {
          const ca = currentAssignments[i];
          return !ca || a.client_key !== ca.client_key || a.staff_id !== ca.staff_id;
        });

      if (!isChanged) return prev;
      return { ...prev, staffAssignments: newAssignments };
    });
  }, [selectedServiceVariantUnits, isEdit, cartLines]);

  // Sync resource assignments
  useEffect(() => {
    if (isEdit && cartLines.length === 0 && form.resourceAssignments.length > 0) {
      return;
    }

    setForm((prev) => {
      const currentAssignments = prev.resourceAssignments;
      const newAssignments: BookingResourceAssignment[] = [];
      const usedInNew = new Set<string>();

      if (selectedServiceVariantUnits.length === 0) {
        if (currentAssignments.length === 0) return prev;
        return { ...prev, resourceAssignments: [] };
      }

      selectedServiceVariantUnits.forEach((unit) => {
        const existing = currentAssignments.find((a) => a.client_key === unit.key);
        if (existing) {
          newAssignments.push(existing);
          usedInNew.add(unit.key);
        }
      });

      selectedServiceVariantUnits.forEach((unit) => {
        if (usedInNew.has(unit.key)) return;

        newAssignments.push({
          client_key: unit.key,
          service_variant_id: unit.variantId,
          resource_id: 0,
        });
      });

      newAssignments.sort((a, b) => (a.client_key ?? "").localeCompare(b.client_key ?? ""));

      const isChanged =
        newAssignments.length !== currentAssignments.length ||
        newAssignments.some((a, i) => {
          const ca = currentAssignments[i];
          return !ca || a.client_key !== ca.client_key || a.resource_id !== ca.resource_id;
        });

      if (!isChanged) return prev;
      return { ...prev, resourceAssignments: newAssignments };
    });
  }, [selectedServiceVariantUnits, isEdit, cartLines]);

  // Bonus booking effects
  useEffect(() => {
    setBonusBookingForm((prev) => {
      if (prev.scheduleMode !== "same_date") return prev;
      if (!form.date) return prev;
      if (prev.date === form.date && prev.slotTime === "" && prev.staffAssignments.length === 0)
        return prev;

      return {
        ...prev,
        date: form.date,
        slotTime: "",
        staffAssignments: [],
      };
    });
  }, [form.date]);

  useEffect(() => {
    if (!focusBogo) return;
    const timer = window.setTimeout(() => {
      document.getElementById("booking-modal-bogo-bonus")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocusBogo(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusBogo]);

  useEffect(() => {
    const hasPaidItem = cartLines.some((line) => (line.kind === "service" && !line.isFree) || line.kind === "bundle");
    if (hasPaidItem) return;

    const hasFreeService = cartLines.some((line) => line.kind === "service" && !!line.isFree);
    if (!hasFreeService) return;

    setCartLines((prev) => prev.filter((line) => !(line.kind === "service" && !!line.isFree)));
  }, [cartLines]);

  useEffect(() => {
    const hasFreeVariant = cartLines.some((line) => line.kind === "service" && !!line.isFree);
    if (hasFreeVariant) return;

    if (
      bonusBookingForm.scheduleMode === "same_date" &&
      bonusBookingForm.date === form.date &&
      bonusBookingForm.slotTime === "" &&
      bonusBookingForm.staffAssignments.length === 0
    )
      return;

    setBonusBookingForm({
      scheduleMode: "same_date",
      date: form.date,
      slotTime: "",
      staffAssignments: [],
      resourceAssignments: [],
    });
  }, [cartLines, form.date]);

  // Initial cart lines for edit mode
  useEffect(() => {
    if (!isOpen || !isEdit || !initialBooking || availableVariants.length === 0) return;
    const lines = buildInitialCartLines(initialBooking, availableVariants);
    setCartLines(lines);

    if (lines.some((l) => l.kind === "bundle")) setBrowseMode("bundles");
    const firstService = lines.find((l) => l.kind === "service");
    if (firstService && firstService.kind === "service") {
      setCat(firstService.variant.catKey);
    }
  }, [isOpen, isEdit, initialBooking, availableVariants]);

  const existingTherapists = useMemo(
    (): ExistingTherapist[] => (isEdit && initialBooking ? buildExistingTherapists(initialBooking) : []),
    [isEdit, initialBooking]
  );

  const selectedFreeVariant = useMemo(
    () => cartLines.find((line): line is Extract<CartLine, { kind: "service" }> => line.kind === "service" && !!line.isFree)?.variant ?? null,
    [cartLines]
  );

  const selectedServiceVariantIds = useMemo(() => {
    const ids: number[] = [];
    cartLines.forEach((line) => {
      if (line.kind === "service") {
        if (line.isFree) return;
        for (let i = 0; i < line.qty; i++) ids.push(line.variant.id);
      } else if (line.kind === "bundle") {
        line.bundle.bundle_items?.forEach((item) => {
          const qty = Math.max(1, Number(item.quantity ?? 1));
          for (let i = 0; i < qty; i++) ids.push(Number(item.bms_ms_service_variant_id));
        });
      }
    });
    return ids;
  }, [cartLines]);

  const selectedBundle = useMemo(() => cartLines.find((l) => l.kind === "bundle")?.bundle ?? null, [cartLines]);

  const variantGroups = useMemo(() => {
    const groups: Array<{ variant_id: number; qty: number; group_id: string }> = [];
    cartLines.forEach((line, lineIdx) => {
      const groupId = `group_${lineIdx + 1}`;
      if (line.kind === "service") {
        if (line.isFree) return;
        groups.push({ variant_id: line.variant.id, qty: line.qty, group_id: groupId });
      } else if (line.kind === "bundle") {
        line.bundle.bundle_items?.forEach((item) => {
          groups.push({ variant_id: Number(item.bms_ms_service_variant_id), qty: Number(item.quantity ?? 1), group_id: groupId });
        });
      }
    });
    return groups;
  }, [cartLines]);

  useEffect(() => {
    setForm((prev) => {
      const targetParallel = selectedBundle ? !!selectedBundle.is_parallel : false;
      if (prev.isParallel === targetParallel) return prev;
      return { ...prev, isParallel: targetParallel };
    });
  }, [selectedBundle]);

  // Fetch available dates and slots
  const availableDatesUrl = useMemo(() => {
    if (variantGroups.length === 0) return null;
    const params = new URLSearchParams();
    params.set("month", viewingMonth);
    variantGroups.forEach((g, idx) => {
      params.append(`variant_groups[${idx}][variant_id]`, String(g.variant_id));
      params.append(`variant_groups[${idx}][qty]`, String(g.qty));
      params.append(`variant_groups[${idx}][group_id]`, g.group_id);
    });
    if (selectedBundle?.id) params.set("bundle_promo_id", String(selectedBundle.id));
    if (isEdit && initialBooking?.id) params.set("exclude_booking_id", String(initialBooking.id));
    if (form.isParallel) params.set("is_parallel", "1");
    return `/master/bookings/available-dates?${params.toString()}`;
  }, [viewingMonth, variantGroups, selectedBundle, isEdit, initialBooking, form.isParallel]);

  const { data: availableDatesResp } = useApiFetch<AvailableDatesResponse>(
    ["available-dates", viewingMonth, JSON.stringify(variantGroups), String(initialBooking?.id ?? ""), String(form.isParallel ?? false)],
    availableDatesUrl ?? "",
    undefined,
    isOpen && !!availableDatesUrl
  );

  const availableSlotsUrl = useMemo(() => {
    if (variantGroups.length === 0 || !form.date) return null;
    const params = new URLSearchParams();
    params.set("date", form.date);
    variantGroups.forEach((g, idx) => {
      params.append(`variant_groups[${idx}][variant_id]`, String(g.variant_id));
      params.append(`variant_groups[${idx}][qty]`, String(g.qty));
      params.append(`variant_groups[${idx}][group_id]`, g.group_id);
    });
    if (selectedBundle?.id) params.set("bundle_promo_id", String(selectedBundle.id));
    if (isEdit && initialBooking?.id) params.set("exclude_booking_id", String(initialBooking.id));
    if (form.isParallel) params.set("is_parallel", "1");
    return `/master/bookings/available-slots?${params.toString()}`;
  }, [form.date, variantGroups, selectedBundle, isEdit, initialBooking, form.isParallel]);

  const { data: availableSlotsResp } = useApiFetch<AvailableSlotsResponse>(
    ["available-slots", form.date, JSON.stringify(selectedServiceVariantIds), String(initialBooking?.id ?? ""), String(form.isParallel ?? false)],
    availableSlotsUrl ?? "",
    undefined,
    isOpen && !!availableSlotsUrl
  );

  const bonusAvailableSlotsUrl = useMemo(() => {
    if (!selectedFreeVariant?.id || !bonusBookingForm.date) return null;
    const params = new URLSearchParams();
    params.set("date", bonusBookingForm.date);
    params.append("variant_ids[]", String(selectedFreeVariant.id));
    return `/master/bookings/available-slots?${params.toString()}`;
  }, [selectedFreeVariant, bonusBookingForm.date]);

  const { data: bonusAvailableSlotsResp } = useApiFetch<AvailableSlotsResponse>(
    ["bonus-available-slots", bonusBookingForm.date, String(selectedFreeVariant?.id ?? "")],
    bonusAvailableSlotsUrl ?? "",
    undefined,
    isOpen && !!bonusAvailableSlotsUrl
  );

  // Pricing calculations
  const grossAmt = cartLines.reduce((sum, line) => {
    return sum + (line.kind === "bundle" ? line.pricing.subtotal : line.variant.price * line.qty);
  }, 0);

  const netAmtBeforeVoucher = cartLines.reduce((sum, line) => {
    return sum + (line.kind === "bundle" ? line.pricing.finalPrice : line.isFree ? 0 : line.variant.price * line.qty);
  }, 0);

  const totalDur = useMemo(() => {
    if (selectedServiceVariantUnits.length === 0) return 0;
    const dummyStart = "10:00";
    let currentGroupStart = dummyStart;
    const groupIds = Array.from(new Set(selectedServiceVariantUnits.map((u) => u.groupId)));
    let maxEndMinutes = parseTimeToMinutes(dummyStart);

    groupIds.forEach((groupId) => {
      const groupUnits = selectedServiceVariantUnits.filter((u) => u.groupId === groupId);
      if (groupUnits.length === 0) return;
      const groupIsParallel = form.isParallel && groupUnits.length >= 2;
      let groupMaxEndMinutes = parseTimeToMinutes(currentGroupStart);
      let tempSequentialStart = currentGroupStart;

      groupUnits.forEach((unit) => {
        const variant = availableVariants.find((v) => v.id === unit.variantId);
        const duration = Number(variant?.duration ?? 0);
        const unitStartTime = groupIsParallel ? currentGroupStart : tempSequentialStart;
        const unitEndTime = addMinutesToTime(unitStartTime, duration);
        const unitEndMinutes = parseTimeToMinutes(unitEndTime);
        if (unitEndMinutes > groupMaxEndMinutes) groupMaxEndMinutes = unitEndMinutes;
        if (!groupIsParallel) tempSequentialStart = unitEndTime;
      });

      if (groupMaxEndMinutes > maxEndMinutes) maxEndMinutes = groupMaxEndMinutes;
      currentGroupStart = addMinutesToTime(dummyStart, maxEndMinutes - parseTimeToMinutes(dummyStart));
    });
    return maxEndMinutes - parseTimeToMinutes(dummyStart);
  }, [selectedServiceVariantUnits, availableVariants, form.isParallel]);

  const isBonusSlotConflictingWithPaidBooking = useCallback(
    (slot: AvailableSlot): boolean => {
      if (!selectedFreeVariant) return false;
      return isBonusSlotOverlappingPaidBooking(form.date, form.slotTime, totalDur, bonusBookingForm.date, slot.slot_time, selectedFreeVariant.duration);
    },
    [selectedFreeVariant, form.date, form.slotTime, totalDur, bonusBookingForm.date]
  );

  const lineItemsPayload = useMemo(
    () =>
      cartLines.map((line, idx) => {
        const groupId = `group_${idx + 1}`;
        return line.kind === "bundle"
          ? { type: "bundle_promo" as const, bundle_promo_id: line.bundle.id, group_id: groupId }
          : { type: "service_variant" as const, service_variant_id: line.variant.id, is_free: !!line.isFree, quantity: line.qty, group_id: groupId };
      }),
    [cartLines]
  );

  const parentLineItemsPayload = useMemo(
    () =>
      lineItemsPayload.filter(
        (line) => !(line.type === "service_variant" && selectedFreeVariant && line.service_variant_id === selectedFreeVariant.id && line.is_free)
      ),
    [lineItemsPayload, selectedFreeVariant]
  );

  const pricingSummary = useMemo(() => {
    const hasAppliedVoucher = !!voucherPreview && voucherPreview.code === form.voucherCode.trim().toUpperCase() && !!form.date && !!lineItemsPayload.length;
    return {
      subtotalAmount: hasAppliedVoucher ? voucherPreview.subtotalAmount : grossAmt,
      discountAmount: hasAppliedVoucher ? voucherPreview.discountAmount : 0,
      totalAmount: hasAppliedVoucher ? voucherPreview.totalAmount : netAmtBeforeVoucher,
      appliedVoucher: hasAppliedVoucher ? voucherPreview.appliedVoucher : null,
      isApplied: hasAppliedVoucher,
    };
  }, [form.date, form.voucherCode, lineItemsPayload.length, grossAmt, netAmtBeforeVoucher, voucherPreview]);

  const cartSummaryLabel = useMemo(() => {
    if (cartLines.length === 0) return "";
    if (cartLines.length === 1 && cartLines[0].kind === "bundle") return "1 bundle promo";
    return `${cartLines.filter((l) => l.kind === "service").length} layanan`;
  }, [cartLines]);

  // Handlers
  const updateForm = useCallback(
    (updater: (prev: FormState) => FormState) => {
      setForm((prev) => {
        let next = updater(prev);
        if (selectedBundle) {
          const bounds = getBundleCalendarBounds(selectedBundle);
          if (next.date) {
            const picked = parseDate(next.date);
            let correctedDate = next.date;
            if (picked.compare(bounds.minValue) < 0) correctedDate = bounds.minValue.toString();
            else if (picked.compare(bounds.maxValue) > 0) correctedDate = bounds.maxValue.toString();
            if (correctedDate !== next.date) next = { ...next, date: correctedDate };
          }
        }
        return next;
      });
    },
    [selectedBundle]
  );

  const toggleService = (v: Variant) => {
    setCartLines((prev) => {
      const exists = prev.some((l) => l.kind === "service" && !l.isFree && l.variant.id === v.id);
      if (exists) return prev.filter((l) => !(l.kind === "service" && !l.isFree && l.variant.id === v.id));
      return [...prev, { kind: "service" as const, variant: v, qty: 1 }];
    });
  };

  const toggleBundle = (bundle: BundlePromo) => {
    const pricing = calcBundlePricing(bundle);
    setCartLines((prev) => {
      const isAlreadySelected = prev.some((l) => l.kind === "bundle" && l.bundle.id === bundle.id);
      const withoutBundles = prev.filter((l) => l.kind !== "bundle");
      if (isAlreadySelected) return withoutBundles;
      return [...withoutBundles, { kind: "bundle", bundle, pricing }];
    });
  };

  const removeLine = (index: number) => setCartLines((prev) => prev.filter((_, i) => i !== index));

  const updateServiceQty = (index: number, newQty: number) => {
    setCartLines((prev) => {
      const next = [...prev];
      const line = next[index];
      if (line && line.kind === "service") {
        next[index] = { ...line, qty: Math.max(1, newQty) };
      }
      return next;
    });
  };

  const updateVariantQty = (variantId: number, newQty: number) => {
    setCartLines((prev) =>
      prev.map((line) =>
        line.kind === "service" && line.variant.id === variantId
          ? { ...line, qty: Math.max(1, newQty) }
          : line,
      ),
    );
  };

  const toggleFreeService = (row: BogoEligibleService) => {
    const isBogoActive = pricingSummary.appliedVoucher?.promo_type === "bogo";
    if (!isBogoActive) {
      toast.warning("Terapkan voucher BOGO dulu sebelum memilih bonus gratis");
      return;
    }

    const bogoCapAmount = Number(voucherPreview?.bogoCapAmount ?? 0);
    if (Number(row.retail_price ?? 0) > bogoCapAmount) {
      toast.warning("Bonus tidak bisa dipilih karena harganya lebih tinggi dari layanan utama");
      return;
    }

    const isAlreadySelected = cartLines.some(
      (line) => line.kind === "service" && !!line.isFree && line.variant.id === row.id,
    );

    setCartLines((prev) => {
      const withoutFree = prev.filter((line) => !(line.kind === "service" && !!line.isFree));
      if (isAlreadySelected) return withoutFree;

      const baseVariant = availableVariants.find((v) => v.id === row.id);
      const variant: Variant = baseVariant
        ? { ...baseVariant, price: 0 }
        : {
            id: row.id,
            catKey: "promo",
            subCat: "Bonus Voucher",
            name: row.name,
            duration: Number(row.duration_minutes ?? 0),
            price: 0,
            categoryId: 0,
          };

      return [...withoutFree, { kind: "service" as const, variant, qty: 1, isFree: true }];
    });

    if (!isAlreadySelected && form.date && form.slotTime) {
      setBonusBookingForm((prev) => ({
        ...prev,
        scheduleMode: "same_date",
        date: form.date,
        slotTime: "",
        staffAssignments: [],
      }));
      setStep("confirm");
      setMobileView("order");
    } else if (isAlreadySelected) {
      setBonusBookingForm({
        scheduleMode: "same_date",
        date: form.date,
        slotTime: "",
        staffAssignments: [],
        resourceAssignments: [],
      });
    }
  };

  const handleBonusScheduleModeChange = useCallback(
    (mode: "same_date" | "custom_date") => {
      setBonusBookingForm((prev) => ({
        ...prev,
        scheduleMode: mode,
        date: mode === "same_date" ? form.date : prev.date,
        slotTime: "",
        staffAssignments: [],
      }));
    },
    [form.date],
  );

  const handleBonusDateChange = useCallback((date: string) => {
    setBonusBookingForm((prev) => ({
      ...prev,
      date,
      slotTime: "",
      staffAssignments: [],
    }));
  }, []);

  const handleBonusSlotSelect = useCallback(
    (slot: AvailableSlot) => {
      if (!slot.is_available || !selectedFreeVariant || isBonusSlotConflictingWithPaidBooking(slot)) {
        return;
      }
      const eligibleIds = eligibleTherapistIdsForVariant(slot, selectedFreeVariant.id);
      const selectedId = eligibleIds[0] ?? slot.available_therapists?.[0]?.id ?? 0;
      const startTime = slot.slot_time;
      const endTime = addMinutesToTime(startTime, selectedFreeVariant.duration);
      const eligibleResourceIds = slot.available_resources_by_variant?.[selectedFreeVariant.id] ?? [];
      const resourceId = eligibleResourceIds[0] ?? -1;

      setBonusBookingForm((prev) => ({
        ...prev,
        slotTime: slot.slot_time,
        staffAssignments: selectedId > 0 ? [{ service_variant_id: selectedFreeVariant.id, staff_id: selectedId, client_key: `${selectedFreeVariant.id}:bonus`, start_time: startTime, end_time: endTime }] : [],
        resourceAssignments: resourceId > 0 ? [{ service_variant_id: selectedFreeVariant.id, resource_id: resourceId, client_key: `${selectedFreeVariant.id}:bonus`, start_time: startTime, end_time: endTime }] : [],
      }));
    },
    [selectedFreeVariant, isBonusSlotConflictingWithPaidBooking],
  );

  const handleBonusTherapistChange = useCallback(
    (therapistId: number) => {
      if (!selectedFreeVariant || therapistId <= 0 || !bonusBookingForm.slotTime) return;
      const startTime = bonusBookingForm.slotTime;
      const endTime = addMinutesToTime(startTime, selectedFreeVariant.duration);
      setBonusBookingForm((prev) => ({
        ...prev,
        staffAssignments: [{ service_variant_id: selectedFreeVariant.id, staff_id: therapistId, client_key: `${selectedFreeVariant.id}:bonus`, start_time: startTime, end_time: endTime }],
      }));
    },
    [selectedFreeVariant, bonusBookingForm.slotTime],
  );

  const inPaidCart = (id: number) => cartLines.some((l) => l.kind === "service" && !l.isFree && l.variant.id === id);
  const getPaidCartQty = (id: number) => cartLines.find((l) => l.kind === "service" && !l.isFree && l.variant.id === id)?.qty ?? 1;
  const inFreeCart = (id: number) => cartLines.some((l) => l.kind === "service" && !!l.isFree && l.variant.id === id);
  const isBogoActive = pricingSummary.appliedVoucher?.promo_type === "bogo";
  const bogoCapAmount = Number(voucherPreview?.bogoCapAmount ?? 0);
  const bogoEligibleServices = voucherPreview?.eligibleFreeServices ?? [];
  const isBogoEligibleId = (id: number) => bogoEligibleServices.some((row) => Number(row.id) === Number(id));

  const isBonusBlockedByPaidSelection = (id: number) => {
    const hasPaidBalinese1 = inPaidCart(1);
    const hasPaidBalinese2 = inPaidCart(2);
    const hasPaidBalinese6 = inPaidCart(6);
    const hasPaidBalinese7 = inPaidCart(7);

    return (
      (hasPaidBalinese1 && [1, 2, 6, 7].includes(id)) ||
      (hasPaidBalinese2 && [2, 1, 6, 7].includes(id)) ||
      (hasPaidBalinese6 && [7, 2, 1, 6].includes(id)) ||
      (hasPaidBalinese7 && [6, 7, 2, 1].includes(id))
    );
  };

  const handleApplyVoucher = async () => {
    const normalizedCode = form.voucherCode.trim().toUpperCase();
    if (!normalizedCode) {
      setCartLines((prev) => prev.filter((line) => !(line.kind === "service" && !!line.isFree)));
      setVoucherPreview(null);
      return;
    }
    if (!form.date || !form.slotTime) {
      toast.warning("Pilih tanggal dan jam booking dulu sebelum pakai voucher");
      return;
    }
    if (lineItemsPayload.length === 0) {
      toast.warning("Pilih layanan dulu sebelum pakai voucher");
      return;
    }
    try {
      setIsApplyingVoucher(true);
      const response = (await apiPost("/master/vouchers/preview-booking", {
        voucher_code: normalizedCode,
        schedule_date: form.date.slice(0, 10),
        slot_time: form.slotTime,
        line_items: lineItemsPayload,
      })) as any;
      setVoucherPreview({
        code: normalizedCode,
        subtotalAmount: Number(response.data.subtotal_amount ?? grossAmt),
        discountAmount: Number(response.data.discount_amount ?? 0),
        totalAmount: Number(response.data.total_amount ?? netAmtBeforeVoucher),
        appliedVoucher: response.data.applied_voucher ?? null,
        eligibleFreeServices: response.data.eligible_free_services ?? [],
        bogoCapAmount: response.data.bogo_cap_amount ?? null,
      });
      setForm((prev) => ({ ...prev, voucherCode: normalizedCode }));
      if (response.data.applied_voucher?.promo_type === "bogo") {
        setBrowseMode("services");
        setStep("services");
        setFocusBogo(true);
      }
      toast.success("Voucher berhasil diterapkan");
    } catch (error: any) {
      setCartLines((prev) => prev.filter((line) => !(line.kind === "service" && !!line.isFree)));
      setVoucherPreview(null);
      toast.warning(error.response?.data?.message || error.message || "Voucher tidak valid untuk booking ini");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const CATS = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    (variantsResp?.data ?? []).forEach((v: any) => {
      const key = v.category?.slug ?? (v.service?.name ?? "other").toLowerCase().replace(/\s+/g, "_");
      const label = v.category?.name ?? v.service?.name ?? key;
      if (!map.has(key)) map.set(key, { key, label });
    });
    return Array.from(map.values()).sort((a, b) => {
      const getPriority = (label: string) => {
        const n = label.toUpperCase();
        if (n.includes("MASSAGE")) return -4;
        if (n.includes("SPA")) return -3;
        if (n.includes("BATH")) return -2;
        if (n.includes("ADD ON") || n.includes("ADDON")) return 1;
        return 0;
      };
      return getPriority(a.label) - getPriority(b.label) || a.label.localeCompare(b.label);
    });
  }, [variantsResp]);

  const filteredBundles = useMemo(() => {
    if (!search.trim()) return activeBundles;
    const q = search.toLowerCase();
    return activeBundles.filter((b) => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q));
  }, [activeBundles, search]);

  const groupedVariants = useMemo(() => {
    const filtered = availableVariants.filter((v) => v.catKey === cat && (!search || v.name.toLowerCase().includes(search.toLowerCase()) || v.subCat.toLowerCase().includes(search.toLowerCase())));
    return filtered.reduce<Record<string, Variant[]>>((acc, v) => {
      (acc[v.subCat] = acc[v.subCat] || []).push(v);
      return acc;
    }, {});
  }, [cat, search, availableVariants]);

  const customerLookupUrl = form.phone.trim().length >= 8 ? `/customer/lookup?phone=${encodeURIComponent(form.phone.trim())}` : "";
  const { data: customerLookupResp } = useApiFetch<any>(["customer-lookup", form.phone], customerLookupUrl, undefined, isOpen && !!customerLookupUrl);
  const customerBookingCount = customerLookupResp?.data?.total_bookings ?? null;

  return {
    isEdit, browseMode, setBrowseMode, cat, setCat, search, setSearch,
    cartLines, setCartLines, step, setStep, form, setForm, updateForm,
    viewingMonth, setViewingMonth, success, setSuccess, createdBooking, setCreatedBooking,
    mobileView, setMobileView, voucherPreview, setVoucherPreview, isApplyingVoucher,
    focusBogo, bonusBookingForm, setBonusBookingForm, availableVariants,
    activeBundles, availableResources, variantsLoading, bundlesLoading,
    selectedServiceVariantUnits, unitTimes, pricingSummary, totalDur,
    availableDatesResp, availableSlotsResp, bonusAvailableSlotsResp,
    existingTherapists, selectedFreeVariant, selectedServiceVariantIds,
    selectedBundle, handleApplyVoucher, toggleService,
    toggleBundle, toggleFreeService, removeLine, updateServiceQty,
    updateVariantQty, handleBonusScheduleModeChange, handleBonusDateChange,
    handleBonusSlotSelect, handleBonusTherapistChange,
    isBonusSlotConflictingWithPaidBooking, inPaidCart,
    getPaidCartQty, inFreeCart, isBogoActive, bogoCapAmount,
    bogoEligibleServices, isBogoEligibleId, isBonusBlockedByPaidSelection, CATS, groupedVariants,
    filteredBundles, cartSummaryLabel, customerBookingCount, parentLineItemsPayload,
  };
}
