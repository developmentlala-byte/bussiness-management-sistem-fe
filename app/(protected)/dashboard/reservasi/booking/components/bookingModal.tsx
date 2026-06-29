"use client";

// tambahkan ke import @heroui/react yang sudah ada
import {
  Calendar,
  Dropdown,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { CalendarBlank, CreditCardIcon } from "@phosphor-icons/react";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePost, useApiFetch, usePut } from "@/app/libs/use-http";
import { toast } from "@heroui/react";
import {
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
  getBundleScheduleHint,
  getBundleTimeBounds,
  isDateTimeWithinBundle,
  type BundlePricing,
} from "@/app/libs/bundle-pricing";
import { BundlePromoCard } from "./bundlePromoCard";

const idr = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

const durFmt = (m: number): string => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60),
    rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
};

const inputCls =
  "w-full py-[9px] px-3 rounded-[10px] border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)]";

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

interface Variant {
  id: number;
  catKey: string;
  subCat: string;
  name: string;
  duration: number;
  price: number;
  categoryId: number;
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

interface ApiStaffRow {
  first_name: string;
  last_name?: string | null;
}

type CartLine =
  | { kind: "service"; variant: Variant }
  | { kind: "bundle"; bundle: BundlePromo; pricing: BundlePricing };

interface ServiceCardProps {
  v: Variant;
  selected: boolean;
  onToggle: () => void;
}

function ServiceCard({ v, selected, onToggle }: ServiceCardProps) {
  return (
    <button
      onClick={onToggle}
      className={[
        "relative text-left w-full rounded-xl border p-3 transition-all duration-150 cursor-pointer min-w-0",
        selected
          ? "border-[#B55368] bg-[#FEF1F4]"
          : "border-[#EDE8E3] bg-white hover:border-[#E8B4C0]",
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
        {idr(v.price)}
      </p>
    </button>
  );
}

interface CartRowProps {
  v: Variant;
  onRemove: () => void;
}

function CartRow({ v, onRemove }: CartRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#EDE8E3] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1A1614] truncate">
          {v.name}
        </p>
        <p className="text-[11px] text-[#B5AFA9]">{durFmt(v.duration)}</p>
      </div>
      <span className="text-[13px] font-semibold text-[#1A1614] shrink-0">
        {idr(v.price)}
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

interface FormState {
  name: string;
  phone: string;
  staffAssignments: BookingStaffAssignment[];
  date: string;
  slotTime: string;
}

type BookingStep = "customer" | "services" | "datetime" | "confirm";

interface OrderPanelProps {
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  cartLines: CartLine[];
  onRemoveLine: (index: number) => void;
  onClearCart: () => void;
  totalAmt: number;
  totalDur: number;
  selectedServiceVariantIds: number[];
  availableDates: string[];
  availableSlots: AvailableSlot[] | null;
  availableVariants: Variant[];
  onBook: () => void;
  submitLabel: string;
  onBack: () => void;
  isMobile: boolean;
  selectedBundle: BundlePromo | null;
  customerBookingCount: number | null;
  isSubmitPending: boolean;
  excludeBookingId?: number;
  // ✅ FIX: track which month the calendar is showing
  viewingMonth: string;
  setViewingMonth: (month: string) => void;
}

function OrderPanel({
  step,
  setStep,
  form,
  setForm,
  cartLines,
  onRemoveLine,
  onClearCart,
  totalAmt,
  totalDur,
  selectedServiceVariantIds,
  availableDates,
  availableSlots,
  availableVariants,
  onBook,
  submitLabel,
  onBack,
  isMobile,
  selectedBundle,
  customerBookingCount,
  isSubmitPending,
  // ✅ FIX: destructure new props
  viewingMonth,
  setViewingMonth,
}: OrderPanelProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const bundleCalendarBounds = selectedBundle
    ? getBundleCalendarBounds(selectedBundle)
    : null;

  const isDateAvailable = (dateStr: string) => {
    if (!availableDates.length) return true;
    return availableDates.includes(dateStr);
  };

  const therapistAssignmentByVariant = useMemo(() => {
    const map = new Map<number, AvailableTherapist>();
    form.staffAssignments.forEach((a) => {
      const slot = availableSlots?.find((s) => s.slot_time === form.slotTime);
      const therapist = slot?.available_therapists.find(
        (t) => t.id === a.staff_id,
      );
      if (therapist) map.set(a.service_variant_id, therapist);
    });
    return map;
  }, [form.staffAssignments, availableSlots, form.slotTime]);

  const availableTherapistsForSlot = useMemo(() => {
    if (!availableSlots || !form.slotTime) return [];
    const slot = availableSlots.find((s) => s.slot_time === form.slotTime);
    return slot?.available_therapists || [];
  }, [availableSlots, form.slotTime]);

  const handleDateSelect = (date: { toString: () => string }) => {
    const dateStr = date.toString();
    setForm((prev) => ({
      ...prev,
      date: dateStr,
      slotTime: "",
      staffAssignments: [],
    }));
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (!slot.is_available) return;

    const variantCategoryMap = new Map<number, number>();
    selectedServiceVariantIds.forEach((variantId) => {
      const variant = availableVariants.find((v) => v.id === variantId);
      if (variant) {
        variantCategoryMap.set(variantId, variant.categoryId);
      }
    });

    const usedStaffIds = new Set<number>();
    const newAssignments: BookingStaffAssignment[] = [];

    for (const variantId of selectedServiceVariantIds) {
      const categoryId = variantCategoryMap.get(variantId);
      if (categoryId === undefined) continue;

      const eligibleIds =
        slot.available_therapists_by_category[categoryId] || [];
      let selectedId: number | null = null;
      for (const id of eligibleIds) {
        if (!usedStaffIds.has(id)) {
          selectedId = id;
          break;
        }
      }
      if (!selectedId) {
        selectedId = eligibleIds[0];
      }

      newAssignments.push({
        service_variant_id: variantId,
        staff_id: selectedId,
      });
      usedStaffIds.add(selectedId);
    }

    setForm((prev) => ({
      ...prev,
      slotTime: slot.slot_time,
      staffAssignments: newAssignments,
    }));
    setStep("confirm");
  };

  const handleTherapistChange = (variantId: number, therapistId: number) => {
    setForm((prev) => ({
      ...prev,
      staffAssignments: prev.staffAssignments.map((a) =>
        a.service_variant_id === variantId
          ? { ...a, staff_id: therapistId }
          : a,
      ),
    }));
  };

  const canProceedFromCustomer = !!form.name.trim();
  const canProceedFromServices = cartLines.length > 0;
  const canBook =
    !!form.name.trim() &&
    cartLines.length > 0 &&
    !!form.date &&
    !!form.slotTime &&
    form.staffAssignments.length === selectedServiceVariantIds.length;

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
              form.phone.trim().length >= 8 ? (
                <p className="mt-2 text-[12px] text-[#7A736E]">
                  Klien ini sudah booking{" "}
                  <span className="font-semibold text-[#B55368]">
                    {customerBookingCount}
                  </span>{" "}
                  kali
                </p>
              ) : null}
            </div>
          </div>
        )}

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
                    key={`service-${line.variant.id}`}
                    v={line.variant}
                    onRemove={() => onRemoveLine(index)}
                  />
                ),
              )
            )}
          </div>
        )}

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
                // ✅ FIX: pakai onFocusChange (bukan onFocusedChange yang tidak ada)
                // fires setiap kali user klik prev/next bulan atau navigasi keyboard
                onFocusChange={(date) => {
                  if (date) {
                    const newMonth = `${date.year}-${String(date.month).padStart(2, "0")}`;
                    if (newMonth !== viewingMonth) {
                      setViewingMonth(newMonth);
                    }
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
                <div className="space-y-2">
                  {availableSlots?.map((slot) => (
                    <button
                      key={slot.slot_time}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.is_available}
                      className={`w-full text-left rounded-xl border p-3 transition-all duration-150 ${
                        slot.is_available
                          ? "border-[#EDE8E3] bg-white hover:border-[#E8B4C0]"
                          : "border-[#EDE8E3] bg-[#EDE8E3] opacity-50 cursor-not-allowed"
                      } ${form.slotTime === slot.slot_time ? "border-[#B55368] bg-[#FEF1F4]" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#1A1614]">
                          {slot.slot_time}
                        </span>
                        {slot.is_available && (
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
                        )}
                        {!slot.is_available && (
                          <span className="text-[11px] text-[#B5AFA9]">
                            Tidak tersedia
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === "confirm" && (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Appointment
              </p>
              <div className="bg-white rounded-xl border border-[#EDE8E3] p-3">
                <p className="text-[13px] text-[#1A1614]">
                  {form.date
                    ? new Date(form.date + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : "—"}{" "}
                  · {form.slotTime} · {durFmt(totalDur)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
                Therapist
              </p>
              <div className="space-y-2">
                {selectedServiceVariantIds.map((variantId) => {
                  const variant = availableVariants.find(
                    (v: Variant) => v.id === variantId,
                  );
                  const currentSlot = availableSlots?.find(
                    (s) => s.slot_time === form.slotTime,
                  );
                  const categoryId = variant?.categoryId ?? 0;
                  const eligibleTherapistIds =
                    currentSlot?.available_therapists_by_category[categoryId] ||
                    [];
                  const eligibleTherapists = availableTherapistsForSlot.filter(
                    (t) => eligibleTherapistIds.includes(t.id),
                  );
                  const selectedTherapist =
                    therapistAssignmentByVariant.get(variantId);
                  return (
                    <div
                      key={variantId}
                      className="bg-white rounded-xl border border-[#EDE8E3] p-3"
                    >
                      <p className="text-[12px] text-[#7A736E] mb-1">
                        {variant?.name}
                      </p>
                      <Dropdown>
                        <Dropdown.Trigger className="w-full">
                          <div className="flex items-center justify-between rounded-[10px] border border-[#EDE8E3] bg-white px-3 py-2 text-[13px] text-[#1A1614] cursor-pointer hover:border-[#E8B4C0]">
                            <span>
                              {selectedTherapist?.name || "Pilih therapist"}
                            </span>
                          </div>
                        </Dropdown.Trigger>
                        <Dropdown.Popover className="rounded-2xl border border-[#EDE8E3] bg-white p-2 shadow-xl">
                          <Dropdown.Menu
                            onAction={(key) =>
                              handleTherapistChange(variantId, Number(key))
                            }
                          >
                            {eligibleTherapists.map((t) => (
                              <Dropdown.Item
                                key={t.id}
                                id={String(t.id)}
                                textValue={t.name}
                                className="rounded-xl px-3 py-2 text-[13px] font-medium text-[#1A1614] hover:bg-[#FEF1F4] hover:text-[#B55368] cursor-pointer"
                              >
                                <Label>{t.name}</Label>
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-[#EDE8E3] bg-white px-4 py-3">
        {(step === "services" || step === "datetime" || step === "confirm") &&
          cartLines.length > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#7A736E]">Total duration</span>
                <span className="font-medium text-[#1A1614]">
                  {durFmt(totalDur)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-[#1A1614]">
                  Total
                </span>
                <span className="text-base font-bold text-[#B55368]">
                  {idr(totalAmt)}
                </span>
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

interface BookingModalProps {
  isOpen: boolean;
  action?: "create" | "edit";
  initialBooking?: SpaBooking | null;
  onSaved?: () => void;
}

interface CreatedBooking {
  id: number;
  booking_code: string;
}

const toFormDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
};

export default function BookingModal({
  isOpen,
  action = "create",
  initialBooking = null,
  onSaved,
}: BookingModalProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const lk = document.createElement("link");
    lk.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
    lk.rel = "stylesheet";
    document.head.appendChild(lk);
  }, []);

  const initialEditCartLines: CartLine[] =
    action === "edit" && initialBooking
      ? (initialBooking.service_variants ?? []).map((line: any) => {
          if (isBundlePromoLine(line)) {
            return {
              kind: "bundle" as const,
              bundle: {
                id: line.bundle_promo_id as any,
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
                bundle_items: line.items.map((item: any) => ({
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
                itemCount: line.items.reduce(
                  (sum: number, item: any) => sum + item.quantity,
                  0,
                ),
              },
            };
          }
          return {
            kind: "service" as const,
            variant: {
              id: line.id as number,
              catKey: (line.slug ?? "other").toLowerCase().replace(/\s+/g, "_"),
              subCat: "Selected Service",
              name: line.name,
              duration: line.duration_minutes ?? 0,
              price: Number(line.retail_price ?? 0),
              categoryId: 0,
            },
          };
        })
      : [];

  const initialEditDateTime =
    action === "edit" && initialBooking
      ? toFormDateTime(initialBooking.schedule_date)
      : { date: "", time: "" };

  const [browseMode, setBrowseMode] = useState<"services" | "bundles">(
    initialEditCartLines.some((line) => line.kind === "bundle")
      ? "bundles"
      : "services",
  );
  const [cat, setCat] = useState(
    initialEditCartLines.find((line) => line.kind === "service")?.variant
      .catKey ?? "spa-wellness-6a3cd52cd23c2",
  );
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>(initialEditCartLines);
  const [step, setStep] = useState<BookingStep>(
    action === "edit" ? "confirm" : "customer",
  );
  const [form, setForm] = useState<FormState>({
    name: action === "edit" ? (initialBooking?.customer_name ?? "") : "",
    phone: action === "edit" ? (initialBooking?.customer_phone ?? "") : "",
    staffAssignments:
      action === "edit" && initialBooking?.staff_assignments
        ? initialBooking.staff_assignments
        : [],
    date: initialEditDateTime.date,
    slotTime: initialEditDateTime.time,
  });

  // ✅ FIX: viewingMonth adalah state TERSENDIRI — tidak diturunkan dari form.date.
  // Ini yang dikirim ke API available-dates, dan diupdate setiap kali user
  // navigasi bulan di kalender (via onFocusChange di Calendar).
  const [viewingMonth, setViewingMonth] = useState<string>(() => {
    // Inisialisasi dari tanggal yang sudah ada (edit mode) atau bulan sekarang
    const dateStr = initialEditDateTime.date;
    if (dateStr) return dateStr.slice(0, 7); // "YYYY-MM"
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Sync viewingMonth jika user memilih tanggal di bulan berbeda
  // (supaya kalau user pilih tanggal → back → buka lagi, bulan tetap sesuai)
  useEffect(() => {
    if (form.date) {
      const newMonth = form.date.slice(0, 7);
      setViewingMonth((prev) => (prev === newMonth ? prev : newMonth));
    }
  }, [form.date]);

  console.log("🚀 ~ BookingModal ~ form:", form);
  console.log("🚀 ~ BookingModal ~ viewingMonth:", viewingMonth);

  const [success, setSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(
    action === "edit" && initialBooking
      ? {
          id: Number(initialBooking.id),
          booking_code: initialBooking.booking_code,
        }
      : null,
  );
  const [mobileView, setMobileView] = useState("browse");

  const selectedServiceVariantIds = useMemo(() => {
    const ids = new Set<number>();
    cartLines.forEach((line) => {
      if (line.kind === "service") {
        ids.add(line.variant.id);
      } else if (line.kind === "bundle") {
        line.bundle.bundle_items?.forEach((item: any) => {
          ids.add(item.bms_ms_service_variant_id);
        });
      }
    });
    return Array.from(ids);
  }, [cartLines]);

  // Fetch variants, bundles, available dates and slots
  const { data: variantsResp, isLoading: variantsLoading } = useApiFetch<{
    data: ApiVariantRow[];
  }>(["variants"], "/master/variants", undefined, isOpen);

  const { data: bundlesResp, isLoading: bundlesLoading } = useApiFetch<{
    data: BundlePromo[];
  }>(["bundle-promo-active"], "/master/bundle-promo/active", undefined, isOpen);

  // ✅ FIX: gunakan viewingMonth (bukan form.date) untuk fetch available-dates
  // Sebelumnya pakai selectedMonth yang diturunkan dari form.date → hanya fetch
  // bulan yang sudah dipilih user, bukan bulan yang sedang dilihat di kalender.
  const availableDatesUrl = useMemo(() => {
    if (selectedServiceVariantIds.length === 0) return null;
    const params = new URLSearchParams();
    params.set("month", viewingMonth);
    selectedServiceVariantIds.forEach((id) =>
      params.append("variant_ids[]", String(id)),
    );
    if (action === "edit" && initialBooking?.id) {
      params.set("exclude_booking_id", String(initialBooking.id));
    }
    return `/master/bookings/available-dates?${params.toString()}`;
  }, [viewingMonth, selectedServiceVariantIds, action, initialBooking?.id]);

  const { data: availableDatesResp } = useApiFetch<AvailableDatesResponse>(
    [
      "available-dates",
      viewingMonth, // ✅ key berubah setiap ganti bulan → query baru
      JSON.stringify(selectedServiceVariantIds),
      String(initialBooking?.id ?? ""),
    ] as string[],
    availableDatesUrl || "",
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
    if (action === "edit" && initialBooking?.id) {
      params.set("exclude_booking_id", String(initialBooking.id));
    }
    return `/master/bookings/available-slots?${params.toString()}`;
  }, [form.date, selectedServiceVariantIds, action, initialBooking?.id]);

  const { data: availableSlotsResp } = useApiFetch<AvailableSlotsResponse>(
    [
      "available-slots",
      form.date,
      JSON.stringify(selectedServiceVariantIds),
      String(initialBooking?.id ?? ""),
    ] as string[],
    availableSlotsUrl || "",
    undefined,
    isOpen && !!availableSlotsUrl,
  );

  const availableVariants: Variant[] = useMemo(() => {
    const list = variantsResp?.data ?? [];
    return list.map((v) => ({
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

  const filteredBundles = useMemo(() => {
    if (!search.trim()) return activeBundles;
    const q = search.toLowerCase();
    return activeBundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(q) ||
        bundle.description?.toLowerCase().includes(q),
    );
  }, [activeBundles, search]);

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

  const totalAmt = cartLines.reduce((sum, line) => {
    if (line.kind === "bundle") return sum + line.pricing.finalPrice;
    return sum + line.variant.price;
  }, 0);

  const totalDur = cartLines.reduce((sum, line) => {
    if (line.kind === "bundle") return sum + line.pricing.totalDuration;
    return sum + line.variant.duration;
  }, 0);

  const selectedBundle = useMemo(
    () => cartLines.find((line) => line.kind === "bundle")?.bundle ?? null,
    [cartLines],
  );

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
      ? (customerLookupResp?.data?.total_bookings ?? 0)
      : null;

  const createBooking = usePost<
    { data: CreatedBooking },
    {
      customer_name: string;
      customer_phone?: string;
      schedule_date: string;
      slot_time: string;
      service_variants: Array<{ variant_id: number; staff_id: number }>;
      line_items: Array<
        | { type: "service_variant"; service_variant_id: number }
        | { type: "bundle_promo"; bundle_promo_id: number }
      >;
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
      service_variants: Array<{ variant_id: number; staff_id: number }>;
      line_items: Array<
        | { type: "service_variant"; service_variant_id: number }
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
    { bookingId: number; idempotency_key: string }
  >((payload) => `/master/bookings/${payload.bookingId}/payment`, {});

  const filtered = useMemo(
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

  const grouped = useMemo(
    () =>
      filtered.reduce((acc: Record<string, Variant[]>, v) => {
        (acc[v.subCat] = acc[v.subCat] || []).push(v);
        return acc;
      }, {}),
    [filtered],
  );

  const updateForm = (updater: (prev: FormState) => FormState) => {
    setForm((prev) => {
      const next = updater(prev);
      if (!selectedBundle) return next;
      const bounds = getBundleCalendarBounds(selectedBundle);
      if (next.date) {
        const picked = parseDate(next.date);
        if (picked.compare(bounds.minValue) < 0) {
          next.date = bounds.minValue.toString();
        }
        if (picked.compare(bounds.maxValue) > 0) {
          next.date = bounds.maxValue.toString();
        }
      }
      return next;
    });
  };

  const selectedBundleId =
    cartLines.find((line) => line.kind === "bundle")?.bundle.id ?? null;

  const inCart = (id: number) =>
    cartLines.some((line) => line.kind === "service" && line.variant.id === id);

  const toggleService = (v: Variant) => {
    setCartLines((prev) => {
      const services = prev.filter((line) => line.kind === "service");
      const exists = services.some((line) => line.variant.id === v.id);
      if (exists) {
        return services.filter((line) => line.variant.id !== v.id);
      }
      return [...services, { kind: "service", variant: v }];
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

  const cartSummaryLabel = useMemo(() => {
    if (cartLines.length === 0) return "";
    if (cartLines.length === 1 && cartLines[0].kind === "bundle") {
      return "1 bundle promo";
    }
    const serviceCount = cartLines.filter(
      (line) => line.kind === "service",
    ).length;
    return `${serviceCount} layanan`;
  }, [cartLines]);

  const isSubmitPending =
    action === "edit" ? updateBooking.isPending : createBooking.isPending;

  const handleBook = () => {
    const lineItems = cartLines.map((line) =>
      line.kind === "bundle"
        ? { type: "bundle_promo" as const, bundle_promo_id: line.bundle.id }
        : {
            type: "service_variant" as const,
            service_variant_id: line.variant.id,
          },
    );

    const serviceVariants = form.staffAssignments.map((a) => ({
      variant_id: a.service_variant_id,
      staff_id: a.staff_id,
    }));

    if (action === "edit" && initialBooking?.id) {
      updateBooking.mutate({
        bookingId: Number(initialBooking.id),
        customer_name: form.name,
        customer_phone: form.phone,
        schedule_date: form.date,
        slot_time: form.slotTime,
        service_variants: serviceVariants,
        line_items: lineItems,
      });
      return;
    }

    createBooking.mutate({
      customer_name: form.name,
      customer_phone: form.phone,
      schedule_date: form.date,
      slot_time: form.slotTime,
      service_variants: serviceVariants,
      line_items: lineItems,
    });
  };

  const reset = () => {
    setCartLines([]);
    setForm({
      name: "",
      phone: "",
      staffAssignments: [],
      date: "",
      slotTime: "",
    });
    setSearch("");
    setBrowseMode("services");
    setCat("spa");
    setSuccess(false);
    setCreatedBooking(null);
    setMobileView("browse");
    setStep("services");
    // Reset viewingMonth ke bulan sekarang
    const now = new Date();
    setViewingMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const handleSelectPayment = async () => {
    if (!createdBooking?.id || createPayment.isPending) return;
    try {
      const response = await createPayment.mutateAsync({
        bookingId: createdBooking.id,
        idempotency_key: crypto.randomUUID(),
      });
      if (response?.data?.payment_url) {
        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error("Failed to create payment", error);
    }
  };

  if (variantsLoading && !variantsResp) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#B5AFA9]">Loading...</p>
      </div>
    );
  }

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
        <div className="w-full max-w-sm bg-[#F8F4F0] rounded-2xl p-5 text-left mb-6 space-y-0">
          {[
            ["Customer", form.name],
            form.phone ? ["Phone", form.phone] : null,
            form.staffAssignments.length
              ? [
                  "Therapist(s)",
                  form.staffAssignments
                    .map((a) => {
                      const slot = availableSlotsResp?.data?.slots.find(
                        (s: AvailableSlot) => s.slot_time === form.slotTime,
                      );
                      return (
                        slot?.available_therapists.find(
                          (t: AvailableTherapist) => t.id === a.staff_id,
                        )?.name || ""
                      );
                    })
                    .filter(Boolean)
                    .join(", "),
                ]
              : null,
            [
              "Date & Time",
              form.date && form.slotTime
                ? `${form.date} ${form.slotTime}`
                : "—",
            ],
            ["Duration", durFmt(totalDur)],
            [
              "Items",
              cartLines.length === 1 && cartLines[0].kind === "bundle"
                ? cartLines[0].bundle.name
                : `${cartLines.filter((line) => line.kind === "service").length} layanan`,
            ],
          ]
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
              {idr(totalAmt)}
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
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      className="flex h-full w-full min-h-0 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EDE8E3] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-[10px] bg-[#FEF1F4] flex items-center justify-center">
            <IconCalendar />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-[#1A1614] leading-tight truncate">
              {action === "edit" ? "Edit Booking" : "New Booking"}
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
              {idr(totalAmt)}
            </span>
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 w-full overflow-hidden">
        <div
          className={[
            "flex min-h-0 flex-col border-r border-[#EDE8E3]",
            mobileView === "browse"
              ? "flex w-full min-w-0 flex-1"
              : "hidden md:flex md:min-w-0 md:flex-1",
          ].join(" ")}
        >
          <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-[#EDE8E3] space-y-2 min-w-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden min-w-0">
              <button
                onClick={() => {
                  setBrowseMode("services");
                  setSearch("");
                }}
                className={[
                  "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-150",
                  browseMode === "services"
                    ? "bg-[#B55368] text-white border-[#B55368]"
                    : "bg-[#F8F4F0] text-[#7A736E] border-transparent hover:border-[#E8B4C0]",
                ].join(" ")}
              >
                Layanan
              </button>
              <button
                onClick={() => {
                  setBrowseMode("bundles");
                  setSearch("");
                }}
                className={[
                  "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-150",
                  browseMode === "bundles"
                    ? "bg-[#B55368] text-white border-[#B55368]"
                    : "bg-[#F8F4F0] text-[#7A736E] border-transparent hover:border-[#E8B4C0]",
                ].join(" ")}
              >
                Bundle Promo
              </button>
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
                      selected={selectedBundleId === bundle.id}
                      onToggle={() => toggleBundle(bundle)}
                    />
                  ))}
                </div>
              )
            ) : Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#B5AFA9]">
                <IconSearch color="#D5CFC9" />
                <p className="text-sm">No services found for {`"${search}"`}</p>
              </div>
            ) : (
              Object.entries(grouped).map(([subCat, vars]) => (
                <div key={subCat} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#B5AFA9] uppercase tracking-[0.07em] shrink-0">
                      {subCat}
                    </span>
                    <div className="flex-1 h-px bg-[#EDE8E3]" />
                  </div>
                  <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                    {vars.map((v) => (
                      <ServiceCard
                        key={v.id}
                        v={v}
                        selected={inCart(v.id)}
                        onToggle={() => toggleService(v)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
            totalAmt={totalAmt}
            totalDur={totalDur}
            selectedServiceVariantIds={selectedServiceVariantIds}
            availableDates={availableDatesResp?.data?.available_dates ?? []}
            availableSlots={availableSlotsResp?.data?.slots ?? null}
            availableVariants={availableVariants}
            onBook={handleBook}
            submitLabel={
              isSubmitPending
                ? action === "edit"
                  ? "Updating..."
                  : "Creating..."
                : action === "edit"
                  ? "Update Booking"
                  : "Create Booking"
            }
            onBack={() => setMobileView("browse")}
            isMobile={mobileView === "order"}
            selectedBundle={selectedBundle}
            customerBookingCount={customerBookingCount}
            isSubmitPending={isSubmitPending}
            excludeBookingId={
              initialBooking?.id ? Number(initialBooking.id) : undefined
            }
            // ✅ FIX: pass viewingMonth dan setViewingMonth ke OrderPanel
            viewingMonth={viewingMonth}
            setViewingMonth={setViewingMonth}
          />
        </div>
      </div>
      {mobileView === "browse" && cartLines.length > 0 && (
        <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 border-t border-[#EDE8E3] bg-white w-full">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#1A1614] truncate">
              {cartSummaryLabel}
            </p>
            <p className="text-[13px] font-bold text-[#B55368]">
              {idr(totalAmt)}
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
