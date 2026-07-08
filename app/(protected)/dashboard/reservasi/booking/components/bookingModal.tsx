"use client";

import { Calendar, Dropdown, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { CreditCardIcon } from "@phosphor-icons/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { usePost, useApiFetch, usePut } from "@/app/libs/use-http";
import { apiPost } from "@/app/services/api";
import { toast } from "@heroui/react";
import {
  AppliedVoucherSnapshot,
  SpaBooking,
  BookingTherapist,
  isBundlePromoLine,
  AvailableSlot,
  AvailableTherapist,
  AvailableSlotsResponse,
  AvailableDatesResponse,
  BookingStaffAssignment,
} from "@/app/types/booking";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import {
  calcBundlePricing,
  formatBundleDiscountLabel,
  getBundleCalendarBounds,
  type BundlePricing,
} from "@/app/libs/bundle-pricing";
import { formatWallClockDate } from "@/app/libs/date-format";
import { buildBookingPaymentRedirectPayload } from "@/app/libs/payment-redirect";
import { BundlePromoCard } from "./bundlePromoCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const idr = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

const durFmt = (m: number): string => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
};

/**
 * Parse ISO datetime string tanpa konversi timezone.
 * Backend menyimpan waktu lokal (WIB) tapi kadang pakai suffix Z — jangan
 * lewat `new Date()` karena akan dikonversi ke UTC dan date/time bisa geser.
 *
 * Contoh: "2026-06-28T17:00:00.000000Z"
 *   → { date: "2026-06-28", time: "17:00" }  ✅
 * Bukan → { date: "2026-06-29", time: "00:00" } (salah timezone UTC+7)
 */
const toFormDateTime = (isoString: string): { date: string; time: string } => {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(
    isoString ?? "",
  );
  if (!match) return { date: "", time: "" };

  const [, datePart, hh, mm] = match;
  const timePart = hh && mm ? `${hh}:${mm}` : "";
  return {
    date: datePart ?? "",
    time: timePart,
  };
};

const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full py-[9px] px-3 rounded-[10px] border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)]";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#B55368"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconSearch = ({ color = "#B5AFA9" }: { color?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconClock = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#B5AFA9"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheck = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconBag = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#B5AFA9"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const IconBack = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  id: number;
  catKey: string;
  subCat: string;
  name: string;
  duration: number;
  price: number;
  categoryId: number;
}

interface BogoEligibleService {
  id: number;
  name: string;
  duration_minutes: number;
  retail_price: number;
}

interface ApiVariantRow {
  id: number;
  name: string;
  duration_minutes?: number;
  duration?: number;
  final_price?: number | string;
  retail_price?: number | string;
  category?: { slug?: string; name?: string; id?: number };
  service?: { name?: string; bms_ms_service_category_id?: number };
}

type CartLine =
  | { kind: "service"; variant: Variant; isFree?: boolean }
  | { kind: "bundle"; bundle: BundlePromo; pricing: BundlePricing };

/** Therapist yang sudah ter-assign di booking existing (edit mode) */
interface ExistingTherapist {
  id: number;
  name: string;
  service_variant_id: number;
}

type LocalStaffAssignment = BookingStaffAssignment & { client_key: string };
type BundleItem = NonNullable<BundlePromo["bundle_items"]>[number];

interface FormState {
  name: string;
  phone: string;
  staffAssignments: LocalStaffAssignment[];
  date: string;
  slotTime: string;
  voucherCode: string;
}

interface BonusBookingFormState {
  scheduleMode: "same_date" | "custom_date";
  date: string;
  slotTime: string;
  staffAssignments: BookingStaffAssignment[];
}

type BookingStep = "customer" | "services" | "datetime" | "confirm";

interface CreatedBooking {
  id: number;
  booking_code: string;
  total_amount?: number;
  subtotal_amount?: number;
  discount_amount?: number;
  applied_voucher?: AppliedVoucherSnapshot | null;
}

interface VoucherPreviewResponse {
  data: {
    subtotal_amount: number;
    discount_amount: number;
    total_amount: number;
    applied_voucher: AppliedVoucherSnapshot | null;
    eligible_free_services?: BogoEligibleService[];
    bogo_cap_amount?: number | null;
  };
}

function buildVariantUnitKeysFromBooking(
  booking: SpaBooking,
): Array<{ key: string; variantId: number; unitIndex: number }> {
  const counts = new Map<number, number>();

  (booking.service_variants ?? []).forEach((line) => {
    if (isBundlePromoLine(line)) {
      line.items.forEach((item) => {
        const variantId = Number(item.id);
        const qty = Math.max(1, Number(item.quantity ?? 1));
        counts.set(variantId, (counts.get(variantId) ?? 0) + qty);
      });
      return;
    }

    counts.set(line.id, (counts.get(line.id) ?? 0) + 1);
  });

  const units: Array<{ key: string; variantId: number; unitIndex: number }> =
    [];

  Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([variantId, qty]) => {
      for (let i = 0; i < qty; i++) {
        units.push({
          key: `${variantId}:${i + 1}`,
          variantId,
          unitIndex: i + 1,
        });
      }
    });

  return units;
}

function buildInitialLocalStaffAssignments(
  booking: SpaBooking,
): LocalStaffAssignment[] {
  const units = buildVariantUnitKeysFromBooking(booking);
  const therapistRows = (booking.therapists ?? []).filter(
    (t): t is BookingTherapist => typeof t !== "string",
  );

  const therapistQueueByVariant = new Map<number, number[]>();
  therapistRows.forEach((row) => {
    const queue =
      therapistQueueByVariant.get(row.service_variant_id) ?? ([] as number[]);
    queue.push(row.staff_id);
    therapistQueueByVariant.set(row.service_variant_id, queue);
  });

  const assignmentQueueByVariant = new Map<number, number[]>();
  (booking.staff_assignments ?? []).forEach((row) => {
    const queue =
      assignmentQueueByVariant.get(row.service_variant_id) ?? ([] as number[]);
    queue.push(row.staff_id);
    assignmentQueueByVariant.set(row.service_variant_id, queue);
  });

  return units
    .map((unit) => {
      const therapistQueue = therapistQueueByVariant.get(unit.variantId) ?? [];
      const assignmentQueue =
        assignmentQueueByVariant.get(unit.variantId) ?? [];
      const staffId = therapistQueue.shift() ?? assignmentQueue.shift() ?? 0;

      return {
        client_key: unit.key,
        service_variant_id: unit.variantId,
        staff_id: staffId,
      };
    })
    .filter((row) => row.staff_id > 0);
}

function eligibleTherapistIdsForCategory(
  slot: AvailableSlot,
  categoryId: number | undefined,
): number[] {
  const byCategory =
    categoryId && categoryId > 0
      ? slot.available_therapists_by_category?.[categoryId]
      : undefined;

  if (Array.isArray(byCategory) && byCategory.length > 0) return byCategory;

  return Array.isArray(slot.available_therapists)
    ? slot.available_therapists.map((t) => t.id)
    : [];
}

function requiredCountByVariantFromUnits(
  units: Array<{ variantId: number }>,
): Map<number, number> {
  const map = new Map<number, number>();
  units.forEach((u) => map.set(u.variantId, (map.get(u.variantId) ?? 0) + 1));
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ServiceCardProps {
  v: Variant;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  helperText?: string;
  priceOverride?: number;
}

function ServiceCard({
  v,
  selected,
  onToggle,
  disabled = false,
  helperText,
  priceOverride,
}: ServiceCardProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={[
        "relative text-left w-full rounded-xl border p-3 transition-all duration-150 cursor-pointer min-w-0",
        selected
          ? "border-[#B55368] bg-[#FEF1F4]"
          : "border-[#EDE8E3] bg-white hover:border-[#E8B4C0]",
        disabled ? "opacity-45 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#B55368] flex items-center justify-center shrink-0">
          <IconCheck />
        </span>
      )}
      <p
        className={`text-[13px] font-semibold mb-1 leading-tight break-words ${selected ? "text-[#B55368] pr-6" : "text-[#1A1614]"}`}
      >
        {v.name}
      </p>
      <div className="flex items-center gap-1 mb-2">
        <IconClock />
        <span className="text-[11px] text-[#B5AFA9]">{durFmt(v.duration)}</span>
      </div>
      <p
        className={`text-[13px] font-bold ${selected ? "text-[#B55368]" : "text-[#1A1614]"}`}
      >
        {idr(priceOverride ?? v.price)}
      </p>
      {helperText && (
        <p className="mt-1 text-[11px] text-[#7A736E]">{helperText}</p>
      )}
    </button>
  );
}

interface CartRowProps {
  v: Variant;
  onRemove: () => void;
  isFree?: boolean;
}

function CartRow({ v, onRemove, isFree = false }: CartRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#EDE8E3] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1A1614] truncate">
          {v.name}
        </p>
        <p className="text-[11px] text-[#B5AFA9]">
          {durFmt(v.duration)}
          {isFree ? " · Bonus gratis" : ""}
        </p>
      </div>
      <span className="text-[13px] font-semibold text-[#1A1614] shrink-0">
        {idr(isFree ? 0 : v.price)}
      </span>
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-loose hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}

interface BundleCartRowProps {
  bundle: BundlePromo;
  pricing: BundlePricing;
  onRemove: () => void;
}

function BundleCartRow({ bundle, pricing, onRemove }: BundleCartRowProps) {
  return (
    <div className="py-3 border-b border-[#EDE8E3] last:border-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <span className="inline-flex rounded-md bg-[#FEF1F4] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B55368]">
            Bundle Promo
          </span>
          <p className="mt-1 text-[13px] font-semibold text-[#1A1614]">
            {bundle.name}
          </p>
          <p className="text-[11px] text-[#B55368] font-medium mt-0.5">
            {formatBundleDiscountLabel(
              bundle.bundle_type,
              bundle.discount_value,
            )}{" "}
            · Hemat {idr(pricing.discountAmount)}
          </p>
          <p className="text-[11px] text-[#B5AFA9] mt-1">
            {durFmt(pricing.totalDuration)} · {pricing.itemCount} layanan
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-[#B5AFA9] line-through">
            {idr(pricing.subtotal)}
          </p>
          <p className="text-[13px] font-bold text-[#B55368]">
            {idr(pricing.finalPrice)}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-loose hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
          aria-label="Remove bundle"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── OrderPanel ───────────────────────────────────────────────────────────────

interface OrderPanelProps {
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  cartLines: CartLine[];
  onRemoveLine: (index: number) => void;
  onClearCart: () => void;
  totalDur: number;
  selectedServiceVariantIds: number[];
  availableDates: string[];
  availableSlots: AvailableSlot[] | null;
  availableVariants: Variant[];
  /** Therapist yang sudah ter-assign di booking existing. Dipakai sebagai
   *  fallback saat availableSlots belum selesai di-fetch (edit mode). */
  existingTherapists: ExistingTherapist[];
  onBook: () => void;
  onApplyVoucher: () => void;
  submitLabel: string;
  onBack: () => void;
  isMobile: boolean;
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
  selectedFreeVariant: Variant | null;
  bonusAvailableSlots: AvailableSlot[] | null;
  onBonusScheduleModeChange: (mode: "same_date" | "custom_date") => void;
  onBonusDateChange: (date: string) => void;
  onBonusSlotSelect: (slot: AvailableSlot) => void;
  onBonusTherapistChange: (therapistId: number) => void;
}

function OrderPanel({
  step,
  setStep,
  form,
  setForm,
  cartLines,
  onRemoveLine,
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
  selectedBundle,
  customerBookingCount,
  isSubmitPending,
  isApplyingVoucher,
  viewingMonth,
  setViewingMonth,
  pricingSummary,
  bonusBookingForm,
  selectedFreeVariant,
  bonusAvailableSlots,
  onBonusScheduleModeChange,
  onBonusDateChange,
  onBonusSlotSelect,
  onBonusTherapistChange,
}: OrderPanelProps) {
  const bundleCalendarBounds = selectedBundle
    ? getBundleCalendarBounds(selectedBundle)
    : null;

  const selectedServiceVariantUnits = useMemo(() => {
    const counts = new Map<number, number>();

    cartLines.forEach((line) => {
      if (line.kind === "service") {
        if (line.isFree) return;
        counts.set(line.variant.id, (counts.get(line.variant.id) ?? 0) + 1);
        return;
      }

      line.bundle.bundle_items?.forEach((item: BundleItem) => {
        const variantId = Number(item.bms_ms_service_variant_id);
        const qty = Math.max(1, Number(item.quantity ?? 1));
        counts.set(variantId, (counts.get(variantId) ?? 0) + qty);
      });
    });

    const units: Array<{ key: string; variantId: number; unitIndex: number }> =
      [];
    Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([variantId, qty]) => {
        for (let i = 0; i < qty; i++) {
          units.push({
            key: `${variantId}:${i + 1}`,
            variantId,
            unitIndex: i + 1,
          });
        }
      });

    return units;
  }, [cartLines]);

  const isDateAvailable = (dateStr: string): boolean => {
    if (!availableDates.length) return true;
    return availableDates.includes(dateStr);
  };

  /**
   * Map variantId → therapist yang sedang di-assign.
   *
   * Priority:
   * 1. Dari availableSlots (data fresh dari API)
   * 2. Fallback ke existingTherapists (data booking lama) — berguna saat
   *    slots belum selesai di-fetch ketika edit modal pertama dibuka.
   */
  const therapistAssignmentByKey = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    const slot = availableSlots?.find((s) => s.slot_time === form.slotTime);
    const slotTherapists = slot?.available_therapists ?? [];
    const existingTherapistsById = new Map(
      existingTherapists.map(
        (t) => [t.id, { id: t.id, name: t.name }] as const,
      ),
    );

    form.staffAssignments.forEach((assignment) => {
      const fromSlot = slotTherapists.find((t) => t.id === assignment.staff_id);

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

  /**
   * Daftar therapist yang bisa dipilih untuk slot yang aktif.
   *
   * Priority:
   * 1. Dari availableSlots (real availability dari server)
   * 2. Fallback ke existingTherapists — supaya dropdown tidak kosong saat
   *    edit modal baru dibuka dan slots masih loading.
   */
  const availableTherapistsForSlot = useMemo((): AvailableTherapist[] => {
    if (availableSlots && form.slotTime) {
      const slot = availableSlots.find((s) => s.slot_time === form.slotTime);
      if (slot?.available_therapists.length) {
        return slot.available_therapists;
      }
    }
    // Fallback ke existing therapists saat slots belum loaded
    return existingTherapists.map((t) => ({ id: t.id, name: t.name }));
  }, [availableSlots, form.slotTime, existingTherapists]);

  const bonusAvailableTherapistsForSlot = useMemo((): AvailableTherapist[] => {
    if (!bonusAvailableSlots || !bonusBookingForm.slotTime) return [];
    const slot = bonusAvailableSlots.find(
      (s) => s.slot_time === bonusBookingForm.slotTime,
    );
    return slot?.available_therapists ?? [];
  }, [bonusAvailableSlots, bonusBookingForm.slotTime]);

  const selectedBonusTherapist = useMemo(() => {
    const selectedStaffId = bonusBookingForm.staffAssignments[0]?.staff_id;
    if (!selectedStaffId) return null;
    return (
      bonusAvailableTherapistsForSlot.find((t) => t.id === selectedStaffId) ??
      null
    );
  }, [bonusAvailableTherapistsForSlot, bonusBookingForm.staffAssignments]);

  const handleDateSelect = (date: { toString: () => string }) => {
    const dateStr = date.toString();
    setForm((prev) => ({
      ...prev,
      date: dateStr,
      slotTime: "",
      // Reset staff assignments hanya kalau tanggal berubah, supaya
      // user tidak perlu milih therapist ulang kalau ganti slot di hari sama
      staffAssignments: prev.date === dateStr ? prev.staffAssignments : [],
    }));
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (!slot.is_available) return;

    // Build map variantId → categoryId
    const variantCategoryMap = new Map<number, number>();
    selectedServiceVariantIds.forEach((variantId) => {
      const variant = availableVariants.find((v) => v.id === variantId);
      if (variant) variantCategoryMap.set(variantId, variant.categoryId);
    });

    const usedByVariant = new Map<number, Record<number, true>>();
    const newAssignments: LocalStaffAssignment[] = [];

    for (const unit of selectedServiceVariantUnits) {
      const categoryId = variantCategoryMap.get(unit.variantId);
      const eligibleIds = eligibleTherapistIdsForCategory(slot, categoryId);
      const usedForVariant =
        usedByVariant.get(unit.variantId) ?? ({} as Record<number, true>);
      let selectedId: number | null = null;
      for (const id of eligibleIds) {
        if (!usedForVariant[id]) {
          selectedId = id;
          break;
        }
      }
      if (!selectedId) selectedId = eligibleIds[0] ?? null;

      if (selectedId !== null) {
        newAssignments.push({
          client_key: unit.key,
          service_variant_id: unit.variantId,
          staff_id: selectedId,
        });
        usedForVariant[selectedId] = true;
        usedByVariant.set(unit.variantId, usedForVariant);
      }
    }

    setForm((prev) => ({
      ...prev,
      slotTime: slot.slot_time,
      staffAssignments: newAssignments,
    }));
    setStep("confirm");
  };

  const handleTherapistChange = (
    assignmentKey: string,
    therapistId: number,
  ) => {
    setForm((prev) => {
      return {
        ...prev,
        staffAssignments: prev.staffAssignments.map((a) =>
          a.client_key === assignmentKey ? { ...a, staff_id: therapistId } : a,
        ),
      };
    });
  };

  /**
   * Saat availableSlots loaded dan ada variant yang belum punya assignment
   * (misalnya data booking lama tidak lengkap), auto-assign therapist pertama
   * yang eligible untuk variant tersebut.
   */
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

      const usedByVariant = new Map<number, Record<number, true>>();
      prev.staffAssignments.forEach((a) => {
        if (a.staff_id <= 0) return;
        const used = usedByVariant.get(a.service_variant_id) ?? {};
        used[a.staff_id] = true;
        usedByVariant.set(a.service_variant_id, used);
      });

      const newAssignments = missingUnits.map((unit) => {
        const variant = availableVariants.find((v) => v.id === unit.variantId);
        const categoryId = variant?.categoryId ?? 0;
        const eligibleIds = eligibleTherapistIdsForCategory(slot, categoryId);
        const usedForVariant = usedByVariant.get(unit.variantId) ?? {};
        const staffId =
          eligibleIds.find((id) => !usedForVariant[id]) ?? eligibleIds[0] ?? 0;
        if (staffId > 0) {
          usedForVariant[staffId] = true;
          usedByVariant.set(unit.variantId, usedForVariant);
        }
        return {
          client_key: unit.key,
          service_variant_id: unit.variantId,
          staff_id: staffId,
        };
      });

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
  ]);

  const canProceedFromCustomer = !!form.name.trim();
  const canProceedFromServices = cartLines.length > 0;
  const bonusBookingReady = selectedFreeVariant
    ? !!bonusBookingForm.date &&
      !!bonusBookingForm.slotTime &&
      bonusBookingForm.staffAssignments.length > 0
    : true;

  /**
   * Validasi assignment therapist.
   *
   * Aturan:
   * - Kalau selectedServiceVariantIds sudah terisi (variants loaded):
   *   setiap variant harus punya assignment dengan staff_id valid (> 0).
   * - Kalau selectedServiceVariantIds masih kosong (variants masih loading,
   *   hanya di edit mode): cukup staffAssignments ada dan semua staff_id valid.
   *
   * CATATAN: jumlah assignment BOLEH kurang dari jumlah variant — bisa terjadi
   * kalau data booking lama memang tidak punya assignment untuk semua variant
   * (misalnya service baru ditambah setelah booking dibuat). Server yang akan
   * validasi. Yang kita cek di client hanya: assignment yang ada harus valid.
   */
  const allAssignmentsValid =
    form.staffAssignments.length > 0 &&
    form.staffAssignments.every((a) => a.staff_id > 0);

  const requiredCountsByVariant = useMemo(() => {
    return requiredCountByVariantFromUnits(selectedServiceVariantUnits);
  }, [selectedServiceVariantUnits]);

  const variantTherapistCountErrors = useMemo(() => {
    const errors: Array<{
      variantId: number;
      variantName: string;
      requiredCount: number;
      selectedUniqueCount: number;
    }> = [];

    const assignedUniqueCounts = new Map<number, number>();
    const assignedByVariant = new Map<number, Set<number>>();
    form.staffAssignments.forEach((a) => {
      if (a.staff_id <= 0) return;
      const set = assignedByVariant.get(a.service_variant_id) ?? new Set();
      set.add(a.staff_id);
      assignedByVariant.set(a.service_variant_id, set);
    });
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

  const meetsVariantTherapistCounts = variantTherapistCountErrors.length === 0;

  const allUnitsAssigned =
    selectedServiceVariantUnits.length === 0
      ? allAssignmentsValid
      : selectedServiceVariantUnits.every((unit) => {
          const assignment = form.staffAssignments.find(
            (a) => a.client_key === unit.key,
          );
          return assignment && assignment.staff_id > 0;
        });

  /**
   * Di edit mode, cartLines mungkin masih kosong sementara variants loading.
   * Kita deteksi edit mode dari existingTherapists.length > 0 (hanya ada
   * saat edit) dan gunakan staffAssignments sebagai bukti "ada service".
   */
  const isInEditMode = existingTherapists.length > 0;
  const hasItems =
    cartLines.length > 0 || (isInEditMode && form.staffAssignments.length > 0);

  const canBook =
    !!form.name.trim() &&
    hasItems &&
    !!form.date &&
    !!form.slotTime &&
    allUnitsAssigned &&
    meetsVariantTherapistCounts &&
    bonusBookingReady;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F4F0]">
      {isMobile && (
        <button
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 border-b border-[#EDE8E3] bg-white px-4 py-3 text-[13px] font-medium text-[#7A736E] transition-colors hover:text-[#1A1614]"
        >
          <IconBack /> Back
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#D5CFC9] [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* ── STEP: CUSTOMER ── */}
        {step === "customer" && (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Customer
              </p>
              <input
                className={`${inputCls} mb-2`}
                placeholder="Full name *"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <input
                className={inputCls}
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
              {customerBookingCount !== null &&
                form.phone.trim().length >= 8 && (
                  <p className="mt-2 text-[12px] text-[#7A736E]">
                    Klien ini sudah booking{" "}
                    <span className="font-semibold text-[#B55368]">
                      {customerBookingCount}
                    </span>{" "}
                    kali
                  </p>
                )}
            </div>
          </div>
        )}

        {/* ── STEP: SERVICES / DATETIME / CONFIRM — Cart summary ── */}
        {(step === "services" || step === "datetime" || step === "confirm") && (
          <div className="px-4 py-4 border-b border-[#EDE8E3]">
            <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
              Selected Items
            </p>
            {cartLines.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <div className="w-11 h-11 rounded-full bg-[#EDE8E3] flex items-center justify-center">
                  <IconBag />
                </div>
                <p className="text-[13px] text-[#B5AFA9]">
                  Pilih layanan atau bundle promo
                </p>
              </div>
            ) : (
              cartLines.map((line, index) =>
                line.kind === "bundle" ? (
                  <BundleCartRow
                    key={`bundle-${line.bundle.id}`}
                    bundle={line.bundle}
                    pricing={line.pricing}
                    onRemove={() => onRemoveLine(index)}
                  />
                ) : (
                  <CartRow
                    key={`service-${line.variant.id}-${line.isFree ? "free" : "paid"}`}
                    v={line.variant}
                    isFree={!!line.isFree}
                    onRemove={() => onRemoveLine(index)}
                  />
                ),
              )
            )}
          </div>
        )}

        {/* ── STEP: DATETIME ── */}
        {step === "datetime" && cartLines.length > 0 && (
          <>
            <div className="px-4 py-4 border-b border-[#EDE8E3]">
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Pilih Tanggal
              </p>
              <Calendar
                aria-label="Event date"
                value={form.date ? parseDate(form.date) : undefined}
                minValue={bundleCalendarBounds?.minValue}
                maxValue={bundleCalendarBounds?.maxValue}
                onChange={handleDateSelect}
                onFocusChange={(date) => {
                  if (date) {
                    const newMonth = `${date.year}-${String(date.month).padStart(2, "0")}`;
                    if (newMonth !== viewingMonth) setViewingMonth(newMonth);
                  }
                }}
                isDateUnavailable={(date) => {
                  const dateStr = date.toString();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (new Date(dateStr) < today) return true;
                  if (availableDates.length > 0 && !isDateAvailable(dateStr))
                    return true;
                  return false;
                }}
              >
                <Calendar.Header>
                  <Calendar.YearPickerTrigger>
                    <Calendar.YearPickerTriggerHeading />
                    <Calendar.YearPickerTriggerIndicator />
                  </Calendar.YearPickerTrigger>
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => <Calendar.Cell date={date} />}
                  </Calendar.GridBody>
                </Calendar.Grid>
                <Calendar.YearPickerGrid>
                  <Calendar.YearPickerGridBody>
                    {({ year }) => <Calendar.YearPickerCell year={year} />}
                  </Calendar.YearPickerGridBody>
                </Calendar.YearPickerGrid>
              </Calendar>
            </div>

            {form.date && (
              <div className="px-4 py-4">
                <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                  Pilih Waktu
                </p>
                {!availableSlots ? (
                  <p className="text-[13px] text-[#B5AFA9] py-4 text-center">
                    Memuat slot waktu...
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-[13px] text-[#B5AFA9] py-4 text-center">
                    Tidak ada slot tersedia untuk tanggal ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.slot_time}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.is_available}
                        className={[
                          "w-full text-left rounded-xl border p-3 transition-all duration-150",
                          slot.is_available
                            ? "border-[#EDE8E3] bg-white hover:border-[#E8B4C0]"
                            : "border-[#EDE8E3] bg-[#EDE8E3] opacity-50 cursor-not-allowed",
                          form.slotTime === slot.slot_time
                            ? "border-[#B55368] bg-[#FEF1F4]"
                            : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-[#1A1614]">
                            {slot.slot_time}
                          </span>
                          {slot.is_available ? (
                            <div className="flex gap-1 flex-wrap justify-end">
                              {slot.available_therapists.map((t) => (
                                <span
                                  key={t.id}
                                  className="bg-[#EDE8E3] text-[#1A1614] text-[10px] px-2 py-0.5 rounded-full"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#B5AFA9]">
                              Tidak tersedia
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === "confirm" && (
          <div className="px-4 py-4 space-y-4">
            {/* Appointment summary */}
            <div>
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Appointment
              </p>
              <div className="bg-white rounded-xl border border-[#EDE8E3] p-3">
                <p className="text-[13px] text-[#1A1614]">
                  {form.date
                    ? formatWallClockDate(form.date, { dateStyle: "full" })
                    : "—"}{" "}
                  · {form.slotTime} · {durFmt(totalDur)}
                </p>
              </div>
            </div>

            {/* Therapist selection */}
            <div>
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Therapist
              </p>
              {variantTherapistCountErrors.length > 0 && (
                <div className="mb-2 rounded-xl border border-[#F2D7DE] bg-[#FEF1F4] px-3 py-2 text-[12px] text-[#7A736E]">
                  {variantTherapistCountErrors.map((e) => (
                    <div key={e.variantId}>
                      {e.variantName}: pilih {e.requiredCount} therapist berbeda
                    </div>
                  ))}
                </div>
              )}

              {/* Loading state: slots masih di-fetch dan belum ada fallback */}
              {!availableSlots && existingTherapists.length === 0 && (
                <p className="text-[13px] text-[#B5AFA9] py-2">
                  Memuat data therapist...
                </p>
              )}

              <div className="space-y-2">
                {selectedServiceVariantUnits.map((unit) => {
                  const variantId = unit.variantId;
                  const variant = availableVariants.find(
                    (v) => v.id === variantId,
                  );
                  const categoryId = variant?.categoryId ?? 0;

                  // Eligible therapist IDs untuk kategori ini di slot yang dipilih
                  const currentSlot = availableSlots?.find(
                    (s) => s.slot_time === form.slotTime,
                  );
                  const eligibleIds = currentSlot
                    ? eligibleTherapistIdsForCategory(currentSlot, categoryId)
                    : [];

                  // Kalau slots sudah loaded → filter berdasarkan eligibility
                  // Kalau slots belum loaded → tampilkan semua dari existingTherapists
                  const therapistOptions: AvailableTherapist[] = availableSlots
                    ? eligibleIds.length > 0
                      ? availableTherapistsForSlot.filter((t) =>
                          eligibleIds.includes(t.id),
                        )
                      : availableTherapistsForSlot
                    : availableTherapistsForSlot;

                  const requiredCount =
                    requiredCountsByVariant.get(unit.variantId) ?? 1;
                  const usedForSameVariant = new Set<number>();
                  form.staffAssignments.forEach((a) => {
                    if (a.service_variant_id !== unit.variantId) return;
                    if (a.client_key === unit.key) return;
                    if (a.staff_id > 0) usedForSameVariant.add(a.staff_id);
                  });

                  const selectedTherapist = therapistAssignmentByKey.get(
                    unit.key,
                  );

                  return (
                    <div
                      key={unit.key}
                      className="bg-white rounded-xl border border-[#EDE8E3] p-3"
                    >
                      <p className="text-[12px] text-[#7A736E] mb-1">
                        {variant?.name ?? `Layanan #${unit.variantId}`}
                        {unit.unitIndex > 0 ? ` · #${unit.unitIndex}` : ""}
                      </p>
                      <Dropdown>
                        <Dropdown.Trigger className="w-full">
                          <div className="flex items-center justify-between rounded-[10px] border border-[#EDE8E3] bg-white px-3 py-2 text-[13px] text-[#1A1614] cursor-pointer hover:border-[#E8B4C0]">
                            <span
                              className={
                                selectedTherapist
                                  ? "text-[#1A1614]"
                                  : "text-[#B5AFA9]"
                              }
                            >
                              {selectedTherapist?.name ?? "Pilih therapist"}
                            </span>
                          </div>
                        </Dropdown.Trigger>
                        <Dropdown.Popover className="rounded-2xl border border-[#EDE8E3] bg-white p-2 shadow-xl">
                          <Dropdown.Menu
                            onAction={(key) =>
                              handleTherapistChange(unit.key, Number(key))
                            }
                          >
                            {therapistOptions.length === 0 ? (
                              <Dropdown.Item
                                key="empty"
                                id="empty"
                                isDisabled
                                className="rounded-xl px-3 py-2 text-[13px] text-[#B5AFA9]"
                              >
                                <Label>Tidak ada therapist tersedia</Label>
                              </Dropdown.Item>
                            ) : (
                              therapistOptions.map((t) =>
                                (() => {
                                  const isDisabled =
                                    requiredCount > 1 &&
                                    usedForSameVariant.has(t.id);
                                  return (
                                    <Dropdown.Item
                                      key={t.id}
                                      id={String(t.id)}
                                      textValue={t.name}
                                      isDisabled={isDisabled}
                                      className={[
                                        "rounded-xl px-3 py-2 text-[13px] font-medium",
                                        isDisabled
                                          ? "text-[#B5AFA9] cursor-not-allowed"
                                          : "text-[#1A1614] hover:bg-[#FEF1F4] hover:text-[#B55368] cursor-pointer",
                                      ].join(" ")}
                                    >
                                      <Label>{t.name}</Label>
                                    </Dropdown.Item>
                                  );
                                })(),
                              )
                            )}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedFreeVariant && (
              <div>
                <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                  Jadwal Layanan Bonus Gratis
                </p>
                <div className="rounded-xl border border-[#EDE8E3] bg-white p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onBonusScheduleModeChange("same_date")}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        bonusBookingForm.scheduleMode === "same_date"
                          ? "bg-[#B55368] text-white"
                          : "bg-[#F8F4F0] text-[#7A736E]"
                      }`}
                    >
                      Ikut tanggal booking utama
                    </button>
                    <button
                      type="button"
                      onClick={() => onBonusScheduleModeChange("custom_date")}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        bonusBookingForm.scheduleMode === "custom_date"
                          ? "bg-[#B55368] text-white"
                          : "bg-[#F8F4F0] text-[#7A736E]"
                      }`}
                    >
                      Pilih tanggal sendiri
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[12px] text-[#7A736E]">
                        Layanan bonus
                      </p>
                      <div className="rounded-[10px] border border-[#EDE8E3] px-3 py-2 text-[13px] font-medium text-[#1A1614]">
                        {selectedFreeVariant.name}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[12px] text-[#7A736E]">Tanggal</p>
                      <input
                        type="date"
                        className={inputCls}
                        value={bonusBookingForm.date}
                        disabled={bonusBookingForm.scheduleMode === "same_date"}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onBonusDateChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] text-[#7A736E]">
                      Pilih slot bonus
                    </p>
                    {!bonusBookingForm.date ? (
                      <p className="text-[12px] text-[#B5AFA9]">
                        Tentukan tanggal bonus terlebih dahulu.
                      </p>
                    ) : !bonusAvailableSlots ? (
                      <p className="text-[12px] text-[#B5AFA9]">
                        Memuat slot bonus...
                      </p>
                    ) : bonusAvailableSlots.length === 0 ? (
                      <p className="text-[12px] text-[#B5AFA9]">
                        Tidak ada slot bonus tersedia di tanggal ini.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {bonusAvailableSlots.map((slot) => (
                          <button
                            key={`bonus-${slot.slot_time}`}
                            type="button"
                            disabled={!slot.is_available}
                            onClick={() => onBonusSlotSelect(slot)}
                            className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                              !slot.is_available
                                ? "cursor-not-allowed border-[#EDE8E3] bg-[#F3F0ED] text-[#B5AFA9]"
                                : bonusBookingForm.slotTime === slot.slot_time
                                  ? "border-[#B55368] bg-[#FEF1F4] text-[#B55368]"
                                  : "border-[#EDE8E3] bg-white text-[#1A1614]"
                            }`}
                          >
                            <span>{slot.slot_time}</span>
                            {!!slot.available_therapists?.length && (
                              <span className="ml-1 text-[10px] opacity-70">
                                ({slot.available_therapists.length} therapist)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {bonusBookingForm.slotTime && (
                    <div className="rounded-[10px] border border-[#EDE8E3] bg-[#FAF7F4] px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] font-medium text-[#1A1614]">
                          Therapist bonus
                        </p>
                        {selectedBonusTherapist?.name && (
                          <span className="text-[11px] text-[#7A736E]">
                            Auto: {selectedBonusTherapist.name}
                          </span>
                        )}
                      </div>
                      <Dropdown>
                        <Dropdown.Trigger className="w-full">
                          <button
                            type="button"
                            className="w-full rounded-[10px] border border-[#EDE8E3] bg-white px-3 py-2 text-left text-[13px] text-[#1A1614]"
                          >
                            {selectedBonusTherapist?.name ??
                              "Pilih therapist bonus"}
                          </button>
                        </Dropdown.Trigger>
                        <Dropdown.Popover className="rounded-2xl border border-[#EDE8E3] bg-white p-2 shadow-xl">
                          <Dropdown.Menu
                            aria-label="Pilih therapist bonus"
                            selectionMode="single"
                            selectedKeys={
                              selectedBonusTherapist
                                ? [String(selectedBonusTherapist.id)]
                                : []
                            }
                            onAction={(key) =>
                              onBonusTherapistChange(Number(key))
                            }
                            className="min-w-[220px]"
                          >
                            {bonusAvailableTherapistsForSlot.length === 0 ? (
                              <Dropdown.Item
                                key="empty"
                                id="empty"
                                isDisabled
                                className="rounded-xl px-3 py-2 text-[13px] text-[#B5AFA9]"
                              >
                                <Label>Tidak ada therapist tersedia</Label>
                              </Dropdown.Item>
                            ) : (
                              bonusAvailableTherapistsForSlot.map((therapist) => (
                                <Dropdown.Item
                                  key={therapist.id}
                                  id={String(therapist.id)}
                                  textValue={therapist.name}
                                  className="rounded-xl px-3 py-2 text-[13px] font-medium text-[#1A1614] hover:bg-[#FEF1F4] hover:text-[#B55368] cursor-pointer"
                                >
                                  <Label>{therapist.name}</Label>
                                </Dropdown.Item>
                              ))
                            )}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                      {!!bonusAvailableTherapistsForSlot.length && (
                        <p className="text-[11px] text-[#B5AFA9]">
                          Tersedia:{" "}
                          {bonusAvailableTherapistsForSlot
                            .map((therapist) => therapist.name)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="shrink-0 border-t border-[#EDE8E3] bg-white px-4 py-3">
        {(step === "services" || step === "datetime" || step === "confirm") &&
          cartLines.length > 0 && (
            <div className="mb-3 space-y-3">
              <div className="rounded-xl border border-[#EDE8E3] bg-[#FFFCFA] p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em]">
                    Voucher
                  </p>
                  {pricingSummary.appliedVoucher && (
                    <span className="text-[11px] font-medium text-[#2F9E44]">
                      {pricingSummary.appliedVoucher.code} aktif
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Masukkan kode voucher"
                    value={form.voucherCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        voucherCode: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={onApplyVoucher}
                    disabled={isApplyingVoucher}
                    className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors ${
                      isApplyingVoucher
                        ? "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
                        : "bg-[#B55368] text-white hover:bg-[#C96480]"
                    }`}
                  >
                    {isApplyingVoucher ? "Memeriksa..." : "Terapkan"}
                  </button>
                </div>
                {pricingSummary.appliedVoucher && (
                  <p className="text-[12px] text-[#7A736E]">
                    Hemat{" "}
                    <span className="font-semibold text-[#B55368]">
                      {idr(pricingSummary.discountAmount)}
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7A736E]">Total duration</span>
                  <span className="font-medium text-[#1A1614]">
                    {durFmt(totalDur)}
                  </span>
                </div>
                {pricingSummary.discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#7A736E]">Subtotal</span>
                      <span className="font-medium text-[#1A1614]">
                        {idr(pricingSummary.subtotalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#7A736E]">Diskon Voucher</span>
                      <span className="font-medium text-[#2F9E44]">
                        -{idr(pricingSummary.discountAmount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-[#1A1614]">
                    Total
                  </span>
                  <span className="text-base font-bold text-[#B55368]">
                    {idr(pricingSummary.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
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
              onClick={() => setStep("services")}
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

// ─── BookingModal ─────────────────────────────────────────────────────────────

interface BookingModalProps {
  isOpen: boolean;
  action?: "create" | "edit";
  initialBooking?: SpaBooking | null;
  onSaved?: () => void;
}

/** Build initial cart lines dari data booking yang sudah ada */
function buildInitialCartLines(
  booking: SpaBooking,
  availableVariants: Variant[],
): CartLine[] {
  return (booking.service_variants ?? []).map((line) => {
    if (isBundlePromoLine(line)) {
      return {
        kind: "bundle" as const,
        bundle: {
          id: Number(line.bundle_promo_id),
          name: line.name,
          slug: line.slug,
          description: null,
          image_path: null,
          bundle_type: line.bundle_type,
          discount_value: line.discount_value,
          start_date: "",
          end_date: "",
          is_active: true,
          max_quantity: null,
          used_count: 0,
          bundle_items: line.items.map((item) => ({
            id: item.id,
            bms_ms_bundle_promo_id: line.bundle_promo_id,
            bms_ms_service_variant_id: item.id,
            quantity: item.quantity,
            duration_minutes: item.duration_minutes,
            price: item.retail_price,
            sort_order: 0,
            service_variant: {
              id: item.id,
              name: item.name,
              duration_minutes: item.duration_minutes,
              retail_price: item.retail_price,
            },
          })),
        },
        pricing: {
          subtotal: line.subtotal,
          discountAmount: line.discount_amount,
          finalPrice: line.retail_price,
          totalDuration: line.duration_minutes,
          itemCount: line.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    }

    // Service variant — enrich dengan data dari availableVariants kalau ada
    const variantFromApi = availableVariants.find((v) => v.id === line.id);
    return {
      kind: "service" as const,
      isFree: !!line.is_free,
      variant: {
        id: line.id,
        catKey:
          variantFromApi?.catKey ??
          line.slug?.toLowerCase().replace(/\s+/g, "_") ??
          "other",
        subCat: variantFromApi?.subCat ?? "Selected Service",
        name: line.name,
        duration: line.duration_minutes ?? 0,
        price: Number(line.is_free ? 0 : (line.retail_price ?? 0)),
        categoryId: variantFromApi?.categoryId ?? 0,
      },
    };
  });
}

/** Derive ExistingTherapist[] dari data therapists di SpaBooking */
function buildExistingTherapists(booking: SpaBooking): ExistingTherapist[] {
  return (booking.therapists ?? [])
    .filter((t): t is BookingTherapist => typeof t !== "string")
    .map((t) => ({
      id: t.staff_id,
      name: t.name,
      service_variant_id: t.service_variant_id,
    }));
}

export default function BookingModal({
  isOpen,
  action = "create",
  initialBooking = null,
  onSaved,
}: BookingModalProps) {
  const isEdit = action === "edit" && !!initialBooking;

  // Load font
  useEffect(() => {
    const lk = document.createElement("link");
    lk.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
    lk.rel = "stylesheet";
    document.head.appendChild(lk);
  }, []);

  // ── Initial values (derived once from initialBooking) ──────────────────────
  const initialEditDateTime = useMemo(
    () =>
      isEdit
        ? toFormDateTime(initialBooking!.schedule_date)
        : { date: "", time: "" },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [browseMode, setBrowseMode] = useState<"services" | "bundles">(
    "services",
  );
  const [cat, setCat] = useState("spa-wellness-6a3e4be004fc9");
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [step, setStep] = useState<BookingStep>(
    isEdit ? "confirm" : "customer",
  );
  const [form, setForm] = useState<FormState>({
    name: isEdit ? (initialBooking?.customer_name ?? "") : "",
    phone: isEdit ? (initialBooking?.customer_phone ?? "") : "",
    staffAssignments:
      isEdit && initialBooking
        ? buildInitialLocalStaffAssignments(initialBooking)
        : [],
    date: initialEditDateTime.date,
    slotTime: initialEditDateTime.time,
    voucherCode: isEdit ? (initialBooking?.applied_voucher?.code ?? "") : "",
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
  const [voucherPreview, setVoucherPreview] = useState<{
    code: string;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    appliedVoucher: AppliedVoucherSnapshot | null;
    eligibleFreeServices: BogoEligibleService[];
    bogoCapAmount: number | null;
  } | null>(
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
  const [bonusBookingForm, setBonusBookingForm] =
    useState<BonusBookingFormState>({
      scheduleMode: "same_date",
      date: "",
      slotTime: "",
      staffAssignments: [],
    });

  // Sync viewingMonth kalau user pilih tanggal di bulan berbeda
  useEffect(() => {
    if (form.date) {
      const newMonth = form.date.slice(0, 7);
      // eslint-disable-next-line
      setViewingMonth((prev) => (prev === newMonth ? prev : newMonth));
    }
  }, [form.date]);

  useEffect(() => {
    // eslint-disable-next-line
    setBonusBookingForm((prev) => {
      if (prev.scheduleMode !== "same_date") return prev;
      if (!form.date) return prev;
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
      document
        .getElementById("booking-modal-bogo-bonus")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocusBogo(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusBogo]);

  useEffect(() => {
    const hasPaidService = cartLines.some(
      (line) => line.kind === "service" && !line.isFree,
    );
    if (hasPaidService) return;

    // eslint-disable-next-line
    setCartLines((prev) =>
      prev.filter((line) => !(line.kind === "service" && !!line.isFree)),
    );
  }, [cartLines]);

  useEffect(() => {
    const hasFreeVariant = cartLines.some(
      (line) => line.kind === "service" && !!line.isFree,
    );
    if (hasFreeVariant) return;
    // eslint-disable-next-line
    setBonusBookingForm({
      scheduleMode: "same_date",
      date: form.date,
      slotTime: "",
      staffAssignments: [],
    });
  }, [cartLines, form.date]);

  // ── API Fetches ────────────────────────────────────────────────────────────
  const { data: variantsResp, isLoading: variantsLoading } = useApiFetch<{
    data: ApiVariantRow[];
  }>(["variants"], "/master/variants", undefined, isOpen);

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

  const activeBundles: BundlePromo[] = useMemo(
    () => bundlesResp?.data ?? [],
    [bundlesResp],
  );

  // ── Init cart lines saat edit mode (setelah variants loaded) ──────────────
  useEffect(() => {
    if (!isOpen || !isEdit || !initialBooking || availableVariants.length === 0)
      return;
    const lines = buildInitialCartLines(initialBooking, availableVariants);
    // eslint-disable-next-line
    setCartLines(lines);

    // Set browse mode sesuai isi cart
    if (lines.some((l) => l.kind === "bundle")) setBrowseMode("bundles");

    // Set active category ke first service variant
    const firstService = lines.find((l) => l.kind === "service");
    if (firstService && firstService.kind === "service") {
      setCat(firstService.variant.catKey);
    }
  }, [isOpen, isEdit, initialBooking, availableVariants]);

  // ── Existing therapists (untuk fallback di confirm step) ──────────────────
  const existingTherapists = useMemo(
    (): ExistingTherapist[] =>
      isEdit && initialBooking ? buildExistingTherapists(initialBooking) : [],
    [isEdit, initialBooking],
  );

  // ── Available dates & slots ────────────────────────────────────────────────
  const selectedFreeVariant = useMemo(
    () =>
      cartLines.find(
        (line): line is Extract<CartLine, { kind: "service" }> =>
          line.kind === "service" && !!line.isFree,
      )?.variant ?? null,
    [cartLines],
  );

  const selectedServiceVariantIds = useMemo(() => {
    const ids = new Set<number>();
    cartLines.forEach((line) => {
      if (line.kind === "service") {
        if (line.isFree) return;
        ids.add(line.variant.id);
      } else if (line.kind === "bundle") {
        line.bundle.bundle_items?.forEach((item: BundleItem) => {
          ids.add(item.bms_ms_service_variant_id);
        });
      }
    });
    return Array.from(ids);
  }, [cartLines]);

  const selectedBundle = useMemo(
    () => cartLines.find((l) => l.kind === "bundle")?.bundle ?? null,
    [cartLines],
  );

  const availableDatesUrl = useMemo(() => {
    if (selectedServiceVariantIds.length === 0) return null;
    const params = new URLSearchParams();
    params.set("month", viewingMonth);
    selectedServiceVariantIds.forEach((id) =>
      params.append("variant_ids[]", String(id)),
    );
    if (selectedBundle?.id) {
      params.set("bundle_promo_id", String(selectedBundle.id));
    }
    if (isEdit && initialBooking?.id) {
      params.set("exclude_booking_id", String(initialBooking.id));
    }
    return `/master/bookings/available-dates?${params.toString()}`;
  }, [
    viewingMonth,
    selectedServiceVariantIds,
    selectedBundle,
    isEdit,
    initialBooking,
  ]);

  const { data: availableDatesResp } = useApiFetch<AvailableDatesResponse>(
    [
      "available-dates",
      viewingMonth,
      JSON.stringify(selectedServiceVariantIds),
      String(initialBooking?.id ?? ""),
    ] as string[],
    availableDatesUrl ?? "",
    undefined,
    isOpen && !!availableDatesUrl,
  );

  const availableSlotsUrl = useMemo(() => {
    if (selectedServiceVariantIds.length === 0 || !form.date) return null;
    const params = new URLSearchParams();
    params.set("date", form.date);
    selectedServiceVariantIds.forEach((id) =>
      params.append("variant_ids[]", String(id)),
    );
    if (selectedBundle?.id) {
      params.set("bundle_promo_id", String(selectedBundle.id));
    }
    if (isEdit && initialBooking?.id) {
      params.set("exclude_booking_id", String(initialBooking.id));
    }
    return `/master/bookings/available-slots?${params.toString()}`;
  }, [
    form.date,
    selectedServiceVariantIds,
    selectedBundle,
    isEdit,
    initialBooking,
  ]);

  const { data: availableSlotsResp } = useApiFetch<AvailableSlotsResponse>(
    [
      "available-slots",
      form.date,
      JSON.stringify(selectedServiceVariantIds),
      String(initialBooking?.id ?? ""),
    ] as string[],
    availableSlotsUrl ?? "",
    undefined,
    isOpen && !!availableSlotsUrl,
  );

  const bonusAvailableSlotsUrl = useMemo(() => {
    if (!selectedFreeVariant?.id || !bonusBookingForm.date) return null;
    const params = new URLSearchParams();
    params.set("date", bonusBookingForm.date);
    params.append("variant_ids[]", String(selectedFreeVariant.id));
    return `/master/bookings/available-slots?${params.toString()}`;
  }, [selectedFreeVariant, bonusBookingForm.date]);

  const { data: bonusAvailableSlotsResp } = useApiFetch<AvailableSlotsResponse>(
    [
      "bonus-available-slots",
      bonusBookingForm.date,
      String(selectedFreeVariant?.id ?? ""),
    ] as string[],
    bonusAvailableSlotsUrl ?? "",
    undefined,
    isOpen && !!bonusAvailableSlotsUrl,
  );

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalAmt = cartLines.reduce((sum, line) => {
    return (
      sum +
      (line.kind === "bundle"
        ? line.pricing.finalPrice
        : line.isFree
          ? 0
          : line.variant.price)
    );
  }, 0);

  const totalDur = cartLines.reduce((sum, line) => {
    return (
      sum +
      (line.kind === "bundle"
        ? line.pricing.totalDuration
        : line.isFree
          ? 0
          : line.variant.duration)
    );
  }, 0);

  const lineItemsPayload = useMemo(
    () =>
      cartLines.map((line) =>
        line.kind === "bundle"
          ? { type: "bundle_promo" as const, bundle_promo_id: line.bundle.id }
          : {
              type: "service_variant" as const,
              service_variant_id: line.variant.id,
              is_free: !!line.isFree,
            },
      ),
    [cartLines],
  );

  const parentLineItemsPayload = useMemo(
    () =>
      lineItemsPayload.filter(
        (line) =>
          !(
            line.type === "service_variant" &&
            selectedFreeVariant &&
            line.service_variant_id === selectedFreeVariant.id &&
            line.is_free
          ),
      ),
    [lineItemsPayload, selectedFreeVariant],
  );

  const pricingSummary = useMemo(() => {
    const hasAppliedVoucher =
      !!voucherPreview &&
      voucherPreview.code === form.voucherCode.trim().toUpperCase() &&
      !!form.date &&
      !!lineItemsPayload.length;

    return {
      subtotalAmount: hasAppliedVoucher
        ? voucherPreview.subtotalAmount
        : totalAmt,
      discountAmount: hasAppliedVoucher ? voucherPreview.discountAmount : 0,
      totalAmount: hasAppliedVoucher ? voucherPreview.totalAmount : totalAmt,
      appliedVoucher: hasAppliedVoucher ? voucherPreview.appliedVoucher : null,
      isApplied: hasAppliedVoucher,
    };
  }, [
    form.date,
    form.voucherCode,
    lineItemsPayload.length,
    totalAmt,
    voucherPreview,
  ]);

  const cartSummaryLabel = useMemo(() => {
    if (cartLines.length === 0) return "";
    if (cartLines.length === 1 && cartLines[0].kind === "bundle")
      return "1 bundle promo";
    return `${cartLines.filter((l) => l.kind === "service").length} layanan`;
  }, [cartLines]);

  const CATS = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    (variantsResp?.data ?? []).forEach((v) => {
      const key =
        v.category?.slug ??
        (v.service?.name ?? "other").toLowerCase().replace(/\s+/g, "_");
      const label = v.category?.name ?? v.service?.name ?? key;
      if (!map.has(key)) map.set(key, { key, label });
    });
    if (map.size === 0) map.set("spa", { key: "spa", label: "Spa & Wellness" });
    return Array.from(map.values());
  }, [variantsResp]);

  const filteredBundles = useMemo(() => {
    if (!search.trim()) return activeBundles;
    const q = search.toLowerCase();
    return activeBundles.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q),
    );
  }, [activeBundles, search]);

  const filteredVariants = useMemo(
    () =>
      availableVariants.filter(
        (v) =>
          v.catKey === cat &&
          (!search ||
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.subCat.toLowerCase().includes(search.toLowerCase())),
      ),
    [cat, search, availableVariants],
  );

  const groupedVariants = useMemo(
    () =>
      filteredVariants.reduce<Record<string, Variant[]>>((acc, v) => {
        (acc[v.subCat] = acc[v.subCat] || []).push(v);
        return acc;
      }, {}),
    [filteredVariants],
  );

  // ── Customer lookup ────────────────────────────────────────────────────────
  const customerLookupUrl =
    form.phone.trim().length >= 8
      ? `/customer/lookup?phone=${encodeURIComponent(form.phone.trim())}`
      : "";

  const { data: customerLookupResp } = useApiFetch<{
    data: { customer: { name: string } | null; total_bookings: number };
  }>(
    ["customer-lookup", form.phone],
    customerLookupUrl,
    undefined,
    isOpen && customerLookupUrl.length > 0,
  );

  const customerBookingCount =
    customerLookupUrl.length > 0
      ? (customerLookupResp?.data?.total_bookings ?? null)
      : null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createBooking = usePost<
    { data: CreatedBooking },
    {
      customer_name: string;
      customer_phone?: string;
      schedule_date: string;
      slot_time: string;
      voucher_code?: string;
      service_variants: Array<{ variant_id: number; staff_id: number }>;
      line_items: Array<
        | {
            type: "service_variant";
            service_variant_id: number;
            is_free?: boolean;
          }
        | { type: "bundle_promo"; bundle_promo_id: number }
      >;
      bonus_booking?: {
        service_variant_id: number;
        schedule_date: string;
        slot_time: string;
        staff_assignments: Array<{
          service_variant_id: number;
          staff_id: number;
        }>;
      };
    }
  >("/master/bookings", {
    invalidate: [["bookings"]],
    onSuccess: (response) => {
      setCreatedBooking(response?.data ?? null);
      setSuccess(true);
    },
    onError: (error) => {
      console.error("Booking creation failed", error);
    },
  });

  const updateBooking = usePut<
    unknown,
    {
      bookingId: number;
      customer_name: string;
      customer_phone?: string;
      schedule_date: string;
      slot_time: string;
      voucher_code?: string;
      service_variants: Array<{ variant_id: number; staff_id: number }>;
      line_items: Array<
        | {
            type: "service_variant";
            service_variant_id: number;
            is_free?: boolean;
          }
        | { type: "bundle_promo"; bundle_promo_id: number }
      >;
    }
  >((payload) => `/master/bookings/${payload.bookingId}`, {
    invalidate: [["bookings"]],
    onSuccess: () => {
      toast.success("Booking berhasil diupdate");
      onSaved?.();
    },
    onError: () => {
      toast.warning("Booking gagal diupdate");
    },
  });

  const createPayment = usePost<
    { data: { payment_url: string } },
    {
      bookingId: number;
      idempotency_key: string;
      return_url?: string;
      cancel_url?: string;
    }
  >((payload) => `/master/bookings/${payload.bookingId}/payment`, {});

  const payCash = usePost<
    { data: { booking_code: string; status: string } },
    { bookingId: number; idempotency_key: string }
  >((payload) => `/master/bookings/${payload.bookingId}/cash-payment`, {});

  const isSubmitPending = isEdit
    ? updateBooking.isPending
    : createBooking.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const updateForm = useCallback(
    (updater: (prev: FormState) => FormState) => {
      setForm((prev) => {
        const next = updater(prev);
        if (!selectedBundle) return next;
        const bounds = getBundleCalendarBounds(selectedBundle);
        if (next.date) {
          const picked = parseDate(next.date);
          if (picked.compare(bounds.minValue) < 0)
            next.date = bounds.minValue.toString();
          if (picked.compare(bounds.maxValue) > 0)
            next.date = bounds.maxValue.toString();
        }
        return next;
      });
    },
    [selectedBundle],
  );

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
      if (!slot.is_available || !selectedFreeVariant) return;
      const eligibleIds = eligibleTherapistIdsForCategory(
        slot,
        selectedFreeVariant.categoryId,
      );
      const selectedId =
        eligibleIds[0] ?? slot.available_therapists?.[0]?.id ?? 0;
      setBonusBookingForm((prev) => ({
        ...prev,
        slotTime: slot.slot_time,
        staffAssignments:
          selectedId > 0
            ? [
                {
                  service_variant_id: selectedFreeVariant.id,
                  staff_id: selectedId,
                },
              ]
            : [],
      }));
    },
    [selectedFreeVariant],
  );

  const handleBonusTherapistChange = useCallback(
    (therapistId: number) => {
      if (!selectedFreeVariant || therapistId <= 0) return;
      setBonusBookingForm((prev) => ({
        ...prev,
        staffAssignments: [
          {
            service_variant_id: selectedFreeVariant.id,
            staff_id: therapistId,
          },
        ],
      }));
    },
    [selectedFreeVariant],
  );

  const inPaidCart = (id: number) =>
    cartLines.some(
      (l) => l.kind === "service" && !l.isFree && l.variant.id === id,
    );

  const inFreeCart = (id: number) =>
    cartLines.some(
      (l) => l.kind === "service" && !!l.isFree && l.variant.id === id,
    );

  const isBogoActive =
    voucherPreview?.appliedVoucher?.promo_type === "bogo" &&
    form.voucherCode.trim().toUpperCase() === voucherPreview.code;

  const bogoEligibleServices = voucherPreview?.eligibleFreeServices ?? [];

  const maxPaidServicePrice = cartLines.reduce((max, line) => {
    if (line.kind !== "service" || line.isFree) return max;
    return Math.max(max, Number(line.variant.price ?? 0));
  }, 0);

  const bogoCapAmount = Number(
    voucherPreview?.bogoCapAmount ?? maxPaidServicePrice,
  );

  const isBogoEligibleId = (id: number) =>
    bogoEligibleServices.some((row) => Number(row.id) === Number(id));

  const toggleService = (v: Variant) => {
    setCartLines((prev) => {
      const freeServices = prev.filter(
        (l): l is Extract<CartLine, { kind: "service" }> =>
          l.kind === "service" && !!l.isFree,
      );
      const services = prev.filter(
        (l): l is Extract<CartLine, { kind: "service" }> =>
          l.kind === "service" && !l.isFree,
      );
      const exists = services.some((l) => l.variant.id === v.id);
      const nextPaid = exists
        ? services.filter((l) => l.variant.id !== v.id)
        : [...services, { kind: "service" as const, variant: v }];

      return nextPaid.length > 0 ? [...nextPaid, ...freeServices] : nextPaid;
    });
  };

  const toggleFreeService = (row: BogoEligibleService) => {
    if (!isBogoActive) {
      toast.warning("Terapkan voucher BOGO dulu sebelum memilih bonus gratis");
      return;
    }

    if (Number(row.retail_price ?? 0) > bogoCapAmount) {
      toast.warning(
        "Bonus tidak bisa dipilih karena harganya lebih tinggi dari layanan utama",
      );
      return;
    }

    setCartLines((prev) => {
      const withoutFree = prev.filter(
        (line) => !(line.kind === "service" && !!line.isFree),
      );
      const alreadySelected = prev.some(
        (line) =>
          line.kind === "service" &&
          !!line.isFree &&
          line.variant.id === row.id,
      );

      if (alreadySelected) return withoutFree;

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

      return [
        ...withoutFree,
        { kind: "service" as const, variant, isFree: true },
      ];
    });
  };

  const toggleBundle = (bundle: BundlePromo) => {
    const pricing = calcBundlePricing(bundle);
    setCartLines((prev) => {
      const isSelected =
        prev.length === 1 &&
        prev[0].kind === "bundle" &&
        prev[0].bundle.id === bundle.id;
      if (isSelected) return [];
      return [{ kind: "bundle", bundle, pricing }];
    });
  };

  const removeLine = (index: number) =>
    setCartLines((prev) => prev.filter((_, i) => i !== index));

  const handleApplyVoucher = async () => {
    const normalizedCode = form.voucherCode.trim().toUpperCase();

    if (!normalizedCode) {
      setCartLines((prev) =>
        prev.filter((line) => !(line.kind === "service" && !!line.isFree)),
      );
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
      })) as VoucherPreviewResponse;

      setVoucherPreview({
        code: normalizedCode,
        subtotalAmount: Number(response.data.subtotal_amount ?? totalAmt),
        discountAmount: Number(response.data.discount_amount ?? 0),
        totalAmount: Number(response.data.total_amount ?? totalAmt),
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
    } catch (error: unknown) {
      setCartLines((prev) =>
        prev.filter((line) => !(line.kind === "service" && !!line.isFree)),
      );
      setVoucherPreview(null);
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Voucher tidak valid untuk booking ini";
      toast.warning(message);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleBook = () => {
    const serviceVariants = form.staffAssignments.map((a) => ({
      variant_id: a.service_variant_id,
      staff_id: a.staff_id,
    }));

    const normalizedCode = form.voucherCode.trim().toUpperCase();
    if (normalizedCode && !pricingSummary.isApplied) {
      toast.warning("Klik terapkan voucher dulu supaya total booking akurat");
      return;
    }

    const bonusBookingPayload =
      selectedFreeVariant && bonusBookingForm.date && bonusBookingForm.slotTime
        ? {
            service_variant_id: selectedFreeVariant.id,
            schedule_date: bonusBookingForm.date,
            slot_time: bonusBookingForm.slotTime,
            staff_assignments: bonusBookingForm.staffAssignments,
          }
        : undefined;

    if (isEdit && initialBooking?.id) {
      updateBooking.mutate({
        bookingId: Number(initialBooking.id),
        customer_name: form.name,
        customer_phone: form.phone,
        schedule_date: (form.date ?? "").slice(0, 10),
        slot_time: form.slotTime,
        voucher_code: normalizedCode || undefined,
        service_variants: serviceVariants,
        line_items: parentLineItemsPayload,
      });
      return;
    }

    createBooking.mutate({
      customer_name: form.name,
      customer_phone: form.phone,
      schedule_date: (form.date ?? "").slice(0, 10),
      slot_time: form.slotTime,
      voucher_code: normalizedCode || undefined,
      service_variants: serviceVariants,
      line_items: parentLineItemsPayload,
      bonus_booking: bonusBookingPayload,
    });
  };

  const handleSelectPayment = async () => {
    if (!createdBooking?.id || createPayment.isPending) return;
    try {
      const response = await createPayment.mutateAsync({
        bookingId: createdBooking.id,
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
    if (!createdBooking?.id || payCash.isPending) return;
    try {
      const response = await payCash.mutateAsync({
        bookingId: createdBooking.id,
        idempotency_key: crypto.randomUUID(),
      });
      const bookingCode =
        response?.data?.booking_code ?? createdBooking.booking_code;
      toast.success("Pembayaran cash berhasil");
      window.location.href = `/payment/${encodeURIComponent(bookingCode)}/result`;
    } catch {
      toast.warning("Gagal memproses pembayaran cash");
    }
  };

  const reset = () => {
    setCartLines([]);
    setForm({
      name: "",
      phone: "",
      staffAssignments: [],
      date: "",
      slotTime: "",
      voucherCode: "",
    });
    setSearch("");
    setBrowseMode("services");
    setCat("spa");
    setSuccess(false);
    setCreatedBooking(null);
    setVoucherPreview(null);
    setBonusBookingForm({
      scheduleMode: "same_date",
      date: "",
      slotTime: "",
      staffAssignments: [],
    });
    setMobileView("browse");
    setStep("services");
    setViewingMonth(getCurrentMonth());
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (variantsLoading && !variantsResp) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#B5AFA9]">Loading...</p>
      </div>
    );
  }

  // ── Render: success ────────────────────────────────────────────────────────
  if (success && action === "create") {
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
              ["Customer", form.name],
              form.phone ? ["Phone", form.phone] : null,
              [
                "Date & Time",
                form.date && form.slotTime
                  ? `${form.date} ${form.slotTime}`
                  : "—",
              ],
              ["Duration", durFmt(totalDur)],
              ["Items", cartSummaryLabel],
              createdBooking?.applied_voucher?.code
                ? ["Voucher", createdBooking.applied_voucher.code]
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
          {Number(createdBooking?.discount_amount ?? 0) > 0 && (
            <>
              <div className="flex justify-between pt-3">
                <span className="text-sm text-[#7A736E]">Subtotal</span>
                <span className="text-sm font-medium text-[#1A1614]">
                  {idr(Number(createdBooking?.subtotal_amount ?? totalAmt))}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-sm text-[#7A736E]">Diskon Voucher</span>
                <span className="text-sm font-medium text-[#2F9E44]">
                  -{idr(Number(createdBooking?.discount_amount ?? 0))}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between pt-3">
            <span className="text-sm font-semibold text-[#1A1614]">Total</span>
            <span className="text-base font-bold text-[#B55368]">
              {idr(
                Number(
                  createdBooking?.total_amount ?? pricingSummary.totalAmount,
                ),
              )}
            </span>
          </div>
        </div>

        <div className="space-y-4 w-full flex items-center justify-center flex-col">
          <button
            onClick={handleSelectPayment}
            disabled={!createdBooking?.id || createPayment.isPending}
            className="w-full max-w-sm py-3 flex items-center justify-center gap-2 rounded-xl bg-[#B55368] text-white text-sm font-semibold hover:bg-[#C96480] transition-colors disabled:cursor-not-allowed disabled:bg-[#EDE8E3] disabled:text-[#B5AFA9]"
          >
            <CreditCardIcon className="size-5 mt-0.5 leading-loose" />
            {createPayment.isPending
              ? "Redirecting..."
              : "Select Payment Method"}
          </button>
          <button
            onClick={handlePayCash}
            disabled={!createdBooking?.id || payCash.isPending}
            className="w-full max-w-sm py-3 flex items-center justify-center gap-2 rounded-xl border border-[#E8B4C0] bg-white text-[#B55368] text-sm font-semibold hover:bg-[#FEF1F4] transition-colors disabled:cursor-not-allowed disabled:bg-[#EDE8E3] disabled:text-[#B5AFA9] disabled:border-transparent"
          >
            {payCash.isPending ? "Processing..." : "Bayar Cash"}
          </button>
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

  // ── Render: main ───────────────────────────────────────────────────────────
  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      className="flex h-full w-full min-h-0 flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EDE8E3] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-[10px] bg-[#FEF1F4] flex items-center justify-center">
            <IconCalendar />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-[#1A1614] leading-tight truncate">
              {isEdit ? "Edit Booking" : "New Booking"}
            </h2>
            <p className="text-[12px] text-[#7A736E] hidden sm:block truncate">
              {step === "services"
                ? "Pilih layanan atau bundle promo"
                : step === "datetime"
                  ? "Pilih tanggal dan waktu"
                  : "Konfirmasi booking"}
            </p>
          </div>
        </div>
        {cartLines.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FEF1F4] rounded-full shrink-0">
            <span className="text-[13px] text-[#B55368] font-semibold">
              {cartSummaryLabel}
            </span>
            <span className="text-[11px] text-[#E8B4C0]">·</span>
            <span className="text-[13px] text-[#B55368] font-bold">
              {idr(pricingSummary.totalAmount)}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 w-full overflow-hidden">
        {/* Browse panel */}
        <div
          className={[
            "flex min-h-0 flex-col border-r border-[#EDE8E3]",
            mobileView === "browse"
              ? "flex w-full min-w-0 flex-1"
              : "hidden md:flex md:min-w-0 md:flex-1",
          ].join(" ")}
        >
          {/* Browse controls */}
          <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-[#EDE8E3] space-y-2 min-w-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden min-w-0">
              {(["services", "bundles"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setBrowseMode(mode);
                    setSearch("");
                  }}
                  className={[
                    "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-150",
                    browseMode === mode
                      ? "bg-[#B55368] text-white border-[#B55368]"
                      : "bg-[#F8F4F0] text-[#7A736E] border-transparent hover:border-[#E8B4C0]",
                  ].join(" ")}
                >
                  {mode === "services" ? "Layanan" : "Bundle Promo"}
                </button>
              ))}
            </div>

            {browseMode === "services" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden min-w-0">
                {CATS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setCat(c.key);
                      setSearch("");
                    }}
                    className={[
                      "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-150",
                      cat === c.key
                        ? "bg-[#B55368] text-white border-[#B55368]"
                        : "bg-[#F8F4F0] text-[#7A736E] border-transparent hover:border-[#E8B4C0]",
                    ].join(" ")}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <IconSearch />
              </span>
              <input
                className={`${inputCls} pl-9`}
                placeholder={
                  browseMode === "bundles"
                    ? "Cari bundle promo…"
                    : `Search in ${CATS.find((c) => c.key === cat)?.label}…`
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Browse content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5 py-4 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#D5CFC9] [&::-webkit-scrollbar-thumb]:rounded-full">
            {browseMode === "bundles" ? (
              bundlesLoading ? (
                <div className="py-16 text-center text-sm text-[#B5AFA9]">
                  Memuat bundle promo...
                </div>
              ) : filteredBundles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#B5AFA9]">
                  <IconSearch color="#D5CFC9" />
                  <p className="text-sm">Tidak ada bundle promo aktif</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filteredBundles.map((bundle) => (
                    <BundlePromoCard
                      key={bundle.id}
                      bundle={bundle}
                      selected={cartLines.some(
                        (l) => l.kind === "bundle" && l.bundle.id === bundle.id,
                      )}
                      onToggle={() => toggleBundle(bundle)}
                    />
                  ))}
                </div>
              )
            ) : Object.keys(groupedVariants).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#B5AFA9]">
                <IconSearch color="#D5CFC9" />
                <p className="text-sm">
                  No services found{search ? ` for "${search}"` : ""}
                </p>
              </div>
            ) : (
              <>
                {isBogoActive && (
                  <div
                    id="booking-modal-bogo-bonus"
                    className="mb-6 rounded-2xl border border-[#E8B4C0] bg-[#FFFCFA] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#B55368] uppercase tracking-[0.07em] shrink-0">
                        Bonus Voucher
                      </span>
                      <div className="flex-1 h-px bg-[#F2D7DE]" />
                    </div>
                    <p className="mb-3 text-[12px] text-[#7A736E]">
                      Pilih 1 bonus gratis. Maks bonus{" "}
                      <span className="font-semibold text-[#B55368]">
                        {idr(bogoCapAmount)}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                      {bogoEligibleServices.map((row) => {
                        const disableByPrice =
                          Number(row.retail_price ?? 0) > bogoCapAmount;
                        const baseVariant = availableVariants.find(
                          (v) => v.id === row.id,
                        );
                        const bonusVariant: Variant = baseVariant
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

                        return (
                          <ServiceCard
                            key={`bogo-${row.id}`}
                            v={bonusVariant}
                            selected={inFreeCart(row.id)}
                            disabled={disableByPrice}
                            helperText={
                              disableByPrice
                                ? `Harga item ${idr(Number(row.retail_price ?? 0))}`
                                : "Bonus gratis"
                            }
                            priceOverride={0}
                            onToggle={() => {
                              if (disableByPrice) {
                                toast.warning(
                                  "Bonus tidak bisa dipilih karena lebih mahal dari layanan utama",
                                );
                                return;
                              }
                              toggleFreeService(row);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.entries(groupedVariants).map(([subCat, vars]) => (
                  <div key={subCat} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold text-[#B5AFA9] uppercase tracking-[0.07em] shrink-0">
                        {subCat}
                      </span>
                      <div className="flex-1 h-px bg-[#EDE8E3]" />
                    </div>
                    {isBogoActive && (
                      <p className="mb-3 text-[12px] text-[#B5AFA9]">
                        Layanan utama dikunci sementara. Pilih bonus gratis di
                        bagian atas.
                      </p>
                    )}
                    <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                      {vars.map((v) => {
                        const disableByBogo = isBogoActive && !inPaidCart(v.id);
                        const helperText = !disableByBogo
                          ? undefined
                          : isBogoEligibleId(v.id)
                            ? "Pilih dari Bonus Voucher"
                            : "Tidak termasuk bonus";

                        return (
                          <ServiceCard
                            key={v.id}
                            v={v}
                            selected={inPaidCart(v.id)}
                            disabled={disableByBogo}
                            helperText={helperText}
                            onToggle={() => {
                              if (disableByBogo) {
                                toast.warning(
                                  "Item ini dikunci saat promo BOGO aktif. Pilih bonus gratis di bagian atas.",
                                );
                                return;
                              }
                              toggleService(v);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Order panel */}
        <div
          className={[
            "flex min-h-0 flex-col",
            mobileView === "order"
              ? "flex w-full min-w-0 flex-1"
              : "hidden md:flex md:w-[340px] md:shrink-0",
          ].join(" ")}
        >
          <OrderPanel
            step={step}
            setStep={setStep}
            form={form}
            setForm={updateForm}
            cartLines={cartLines}
            onRemoveLine={removeLine}
            onClearCart={() => setCartLines([])}
            totalDur={totalDur}
            selectedServiceVariantIds={selectedServiceVariantIds}
            availableDates={availableDatesResp?.data?.available_dates ?? []}
            availableSlots={availableSlotsResp?.data?.slots ?? null}
            availableVariants={availableVariants}
            existingTherapists={existingTherapists}
            onBook={handleBook}
            onApplyVoucher={handleApplyVoucher}
            submitLabel={
              isSubmitPending
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Booking"
                  : "Create Booking"
            }
            onBack={() => setMobileView("browse")}
            isMobile={mobileView === "order"}
            selectedBundle={selectedBundle}
            customerBookingCount={customerBookingCount}
            isSubmitPending={isSubmitPending}
            isApplyingVoucher={isApplyingVoucher}
            viewingMonth={viewingMonth}
            setViewingMonth={setViewingMonth}
            pricingSummary={pricingSummary}
            bonusBookingForm={bonusBookingForm}
            selectedFreeVariant={selectedFreeVariant}
            bonusAvailableSlots={bonusAvailableSlotsResp?.data?.slots ?? null}
            onBonusScheduleModeChange={handleBonusScheduleModeChange}
            onBonusDateChange={handleBonusDateChange}
            onBonusSlotSelect={handleBonusSlotSelect}
            onBonusTherapistChange={handleBonusTherapistChange}
          />
        </div>
      </div>

      {/* Mobile bottom bar */}
      {mobileView === "browse" && cartLines.length > 0 && (
        <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 border-t border-[#EDE8E3] bg-white w-full">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#1A1614] truncate">
              {cartSummaryLabel}
            </p>
            <p className="text-[13px] font-bold text-[#B55368]">
              {idr(pricingSummary.totalAmount)}
            </p>
          </div>
          <button
            onClick={() => setMobileView("order")}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-[#B55368] text-white text-[13px] font-semibold hover:bg-[#C96480] transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
