"use client";

import { ClockTimePicker } from "@/app/components/clockTimerPicker";
import { formatDate } from "@/app/libs/date-format";
import {
  Calendar,
  Dropdown,
  Autocomplete,
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
import { SpaBooking, isBundlePromoLine } from "@/app/types/booking";
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

const THERAPISTS = [
  "Nurul Aziz",
  "Sari Dewi",
  "Maya Putri",
  "Rini Wulandari",
  "Dewi Sartika",
];

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

const IconSearch = ({ color = "#B5AFA9" }) => (
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

// Type definitions

interface Variant {
  id: number;
  catKey: string;
  subCat: string;
  name: string;
  duration: number;
  price: number;
}

interface ApiVariantRow {
  id: number;
  name: string;
  duration_minutes?: number;
  duration?: number;
  final_price?: number | string;
  retail_price?: number | string;
  category?: { slug?: string; name?: string };
  service?: { name?: string };
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
        className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-none hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
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
            )}
            {" · "}Hemat {idr(pricing.discountAmount)}
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
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-none hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
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
  therapists: string[];
  date: string;
  time: string;
}

interface StaffOption {
  id: number;
  full_name: string;
  is_available: boolean;
  available_until: string | null;
  unavailable_reason: string | null;
}

interface OrderPanelProps {
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  cartLines: CartLine[];
  onRemoveLine: (index: number) => void;
  onClearCart: () => void;
  totalAmt: number;
  totalDur: number;
  canBook: boolean;
  onBook: () => void;
  submitLabel: string;
  onBack: () => void;
  isMobile: boolean;
  staffOptions: StaffOption[];
  selectedBundle: BundlePromo | null;
  customerBookingCount: number | null;
}

function OrderPanel({
  form,
  setForm,
  cartLines,
  onRemoveLine,
  onClearCart,
  totalAmt,
  totalDur,
  canBook,
  onBook,
  submitLabel,
  onBack,
  isMobile,
  staffOptions,
  selectedBundle,
  customerBookingCount,
}: OrderPanelProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const bundleCalendarBounds = selectedBundle
    ? getBundleCalendarBounds(selectedBundle)
    : null;

  // Draft date/time state so the popover commits only when the user taps
  // "Apply" — it no longer relies on click-outside as the only way to close.
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(form.date);
  const [draftTime, setDraftTime] = useState(form.time);

  const draftBundleTimeBounds =
    selectedBundle && draftDate
      ? getBundleTimeBounds(selectedBundle, draftDate)
      : null;

  const openDateTimePicker = () => {
    setDraftDate(form.date);
    setDraftTime(form.time);
    setIsDateTimeOpen(true);
  };

  const applyDateTime = () => {
    setForm((p: FormState) => ({ ...p, date: draftDate, time: draftTime }));
    setIsDateTimeOpen(false);
  };

  const cancelDateTime = () => {
    setIsDateTimeOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F4F0]">
      {isMobile && (
        <button
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 border-b border-[#EDE8E3] bg-white px-4 py-3 text-[13px] font-medium text-[#7A736E] transition-colors hover:text-[#1A1614]"
        >
          <IconBack /> Back to services
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#D5CFC9] [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Customer */}

        <div className="px-4 py-4 border-b border-[#EDE8E3]">
          <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
            Customer
          </p>

          <input
            className={`${inputCls} mb-2`}
            placeholder="Full name *"
            value={form.name}
            onChange={(e) => {
              setForm((p: FormState) => ({ ...p, name: e.target.value }));
            }}
            autoFocus
          />

          <input
            className={inputCls}
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) =>
              setForm((p: FormState) => ({ ...p, phone: e.target.value }))
            }
          />

          {customerBookingCount !== null && form.phone.trim().length >= 8 ? (
            <p className="mt-2 text-[12px] text-[#7A736E]">
              Klien ini sudah booking{" "}
              <span className="font-semibold text-[#B55368]">
                {customerBookingCount}
              </span>{" "}
              kali
            </p>
          ) : null}
        </div>

        {/* ── DATE + TIME — disatukan dalam satu dropdown ── */}

        <div className="px-4 py-4 border-b border-[#EDE8E3]">
          <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
            Appointment
          </p>

          {selectedBundle ? (
            <p className="mb-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              {getBundleScheduleHint(selectedBundle)}
            </p>
          ) : null}

          <Dropdown
            isOpen={isDateTimeOpen}
            onOpenChange={(open) => {
              if (open) setIsDateTimeOpen(true);
            }}
          >
            <Dropdown.Trigger className="w-full" onClick={openDateTimePicker}>
              <div className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#EDE8E3] bg-white px-4 py-[9px] text-[13px] sm:text-sm font-semibold text-[#1A1614] outline-none transition-colors hover:border-[#E8B4C0]">
                <CalendarBlank
                  weight="bold"
                  className="h-[18px] w-[18px] shrink-0 text-[#B55368]"
                />
                <span className="truncate">
                  {form.date && form.time
                    ? formatDate(new Date(`${form.date}T${form.time}:00`), {
                        withTime: true,

                        simpleFormat: true,
                      })
                    : "Select Date & Time"}
                </span>
              </div>
            </Dropdown.Trigger>

            <Dropdown.Popover
              placement="bottom"
              className="z-[100] w-[calc(100vw-2rem)] sm:w-auto min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold text-[#1A1614]">
                  Pilih Tanggal & Waktu
                </p>
                <button
                  type="button"
                  onClick={cancelDateTime}
                  aria-label="Tutup"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#B5AFA9] transition-colors hover:bg-[#F8F4F0] hover:text-[#B55368]"
                >
                  ×
                </button>
              </div>

              <Calendar
                aria-label="Event date"
                value={draftDate ? parseDate(draftDate) : undefined}
                minValue={bundleCalendarBounds?.minValue}
                maxValue={bundleCalendarBounds?.maxValue}
                onChange={(d: { toString: () => string }) => {
                  setDraftDate(d.toString());
                  setDraftTime("");
                }}
              >
                <Calendar.Header>
                  <Calendar.Heading />
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
              </Calendar>

              <div className="mt-4 pt-4 border-t border-[#EDE8E3]">
                <ClockTimePicker
                  value={draftTime}
                  minTime={draftBundleTimeBounds?.minTime}
                  maxTime={draftBundleTimeBounds?.maxTime}
                  disabled={!draftDate}
                  onChange={(t: string) => setDraftTime(t)}
                />
              </div>

              <div className="mt-4 flex gap-2 border-t border-[#EDE8E3] pt-4">
                <button
                  type="button"
                  onClick={cancelDateTime}
                  className="flex-1 rounded-xl border border-[#EDE8E3] bg-white py-2.5 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applyDateTime}
                  disabled={!draftDate || !draftTime}
                  className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
                    draftDate && draftTime
                      ? "bg-[#B55368] text-white hover:bg-[#C96480]"
                      : "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
                  }`}
                >
                  Terapkan
                </button>
              </div>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Therapists Autocomplete */}

        <div className="px-4 py-4 border-b border-[#EDE8E3]">
          <Label className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2 block">
            Therapists (Multiple)
          </Label>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.therapists.map((therapist: string) => (
              <div
                key={therapist}
                className="bg-[#FEF1F4] text-[#B55368] border-none text-[11px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
              >
                <span>{therapist}</span>

                <button
                  onClick={() =>
                    setForm((p: FormState) => ({
                      ...p,

                      therapists: p.therapists.filter(
                        (t: string) => t !== therapist,
                      ),
                    }))
                  }
                  className="ml-1 hover:text-[#B55368]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <Autocomplete
            className="w-full"
            placeholder="Search therapists..."
            onChange={(value: string | number | null) => {
              const newTherapist = value?.toString();

              if (newTherapist && !form.therapists.includes(newTherapist)) {
                setForm((p: FormState) => ({
                  ...p,

                  therapists: [...p.therapists, newTherapist],
                }));
              }
            }}
            aria-label="Select therapists"
          >
            <Autocomplete.Trigger className="flex min-h-[38px] w-full items-center justify-between rounded-[10px] border border-[#EDE8E3] bg-white px-3 py-1.5 text-[13px] text-[#1A1614] transition-colors hover:border-[#E8B4C0]">
              <Autocomplete.Value>
                {({ isPlaceholder }: { isPlaceholder: boolean }) =>
                  isPlaceholder ? (
                    <span className="text-[#B5AFA9]">Select therapists...</span>
                  ) : null
                }
              </Autocomplete.Value>
              <Autocomplete.Indicator className="text-[#B5AFA9]" />
            </Autocomplete.Trigger>

            <Autocomplete.Popover className="rounded-2xl border border-[#EDE8E3] bg-white p-2 shadow-xl">
              <Autocomplete.Filter filter={contains}>
                <SearchField name="search" className="mb-2">
                  <SearchField.Group className="flex items-center gap-2 rounded-lg bg-[#F8F4F0] px-3 py-2 border border-transparent focus-within:border-[#E8B4C0] transition-colors">
                    <SearchField.SearchIcon className="text-[#B5AFA9] w-4 h-4 shrink-0" />

                    <SearchField.Input
                      placeholder="Search name..."
                      className="flex-1 bg-transparent text-[13px] text-[#1A1614] outline-none placeholder:text-[#B5AFA9]"
                    />

                    <SearchField.ClearButton className="text-[#B5AFA9] hover:text-[#B55368]" />
                  </SearchField.Group>
                </SearchField>

                <ListBox
                  className="max-h-[220px] overflow-y-auto outline-none [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#D5CFC9] [&::-webkit-scrollbar-thumb]:rounded-full"
                  renderEmptyState={() => (
                    <EmptyState className="py-6 text-center text-[13px] text-[#B5AFA9]">
                      No therapist found
                    </EmptyState>
                  )}
                >
                  {staffOptions.map((staff) => (
                    <ListBox.Item
                      key={staff.full_name}
                      id={staff.full_name}
                      textValue={staff.full_name}
                      isDisabled={!staff.is_available}
                      className="rounded-xl px-3 py-2 text-[13px] font-medium text-[#1A1614] hover:bg-[#FEF1F4] hover:text-[#B55368] cursor-pointer outline-none transition-colors data-[selected=true]:bg-[#FEF1F4] data-[selected=true]:text-[#B55368] data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span>{staff.full_name}</span>
                        {!staff.is_available && staff.unavailable_reason ? (
                          <span className="text-[10px] font-normal text-amber-700">
                            {staff.unavailable_reason}
                            {staff.available_until
                              ? ` · tersedia ${new Date(staff.available_until).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
        </div>

        {/* Cart items */}

        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em]">
              Selected Items
            </p>

            {cartLines.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-[11px] text-[#7A736E] hover:text-[#B55368] transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

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
      </div>

      {/* Sticky footer — always visible at the bottom of the panel */}

      <div className="shrink-0 border-t border-[#EDE8E3] bg-white px-4 py-3">
        {cartLines.length > 0 && (
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

        {!canBook && (
          <p className="text-[11px] text-[#B5AFA9] text-center mb-2">
            {cartLines.length === 0
              ? "Tambahkan layanan atau bundle promo"
              : "Lengkapi nama, tanggal, waktu, dan terapis"}
          </p>
        )}

        <button
          onClick={onBook}
          disabled={!canBook}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-150 ${
            canBook
              ? "bg-[#B55368] text-white cursor-pointer hover:bg-[#C96480]"
              : "bg-[#EDE8E3] text-[#B5AFA9] cursor-not-allowed"
          }`}
        >
          {submitLabel}
        </button>
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

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability"] });
    }, 60_000);
    return () => clearInterval(timer);
  }, [isOpen, queryClient]);

  const initialEditCartLines: CartLine[] =
    action === "edit" && initialBooking
      ? (initialBooking.service_variants ?? []).map((line) => {
          if (isBundlePromoLine(line)) {
            return {
              kind: "bundle" as const,
              bundle: {
                id: line.bundle_promo_id,
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
                bundle_items: line.items.map((item) => ({
                  id: item.id,
                  bms_ms_bundle_promo_id: line.bundle_promo_id,
                  bms_ms_service_variant_id: item.id,
                  quantity: item.quantity,
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
                  (sum, item) => sum + item.quantity,
                  0,
                ),
              },
            };
          }

          return {
            kind: "service" as const,
            variant: {
              id: line.id,
              catKey: (line.slug ?? "other").toLowerCase().replace(/\s+/g, "_"),
              subCat: "Selected Service",
              name: line.name,
              duration: line.duration_minutes ?? 0,
              price: Number(line.retail_price ?? 0),
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
      .catKey ?? "spa-wellness-6a2fcbbcc7d02",
  );
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>(initialEditCartLines);
  const [form, setForm] = useState<FormState>({
    name: action === "edit" ? (initialBooking?.customer_name ?? "") : "",
    phone: action === "edit" ? (initialBooking?.customer_phone ?? "") : "",
    therapists: action === "edit" ? (initialBooking?.therapists ?? []) : [],
    date: initialEditDateTime.date,
    time: initialEditDateTime.time,
  });

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

  // Fetch variants and staff from backend

  const { data: variantsResp, isLoading: variantsLoading } = useApiFetch<{
    data: ApiVariantRow[];
  }>(["variants"], "/master/variants", undefined, isOpen);

  const { data: bundlesResp, isLoading: bundlesLoading } = useApiFetch<{
    data: BundlePromo[];
  }>(["bundle-promo-active"], "/master/bundle-promo/active", undefined, isOpen);

  const { data: staffsResp, isLoading: staffsLoading } = useApiFetch<{
    data: ApiStaffRow[];
  }>(["staffs"], "/master/staffs", undefined, isOpen);

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

    // Fallback to a default if empty
    if (map.size === 0) {
      map.set("spa", { key: "spa", label: "Spa & Wellness" });
    }

    return Array.from(map.values());
  }, [variantsResp]);

  const staffList: string[] = useMemo(() => {
    const s = staffsResp?.data ?? [];
    if (!s.length) return THERAPISTS;

    return s.map((x) => [x.first_name, x.last_name].filter(Boolean).join(" "));
  }, [staffsResp]);

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

  const scheduleIso = useMemo(() => {
    if (!form.date || !form.time) return null;
    return new Date(`${form.date}T${form.time}:00`).toISOString();
  }, [form.date, form.time]);

  const staffAvailabilityUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (scheduleIso && totalDur > 0) {
      params.set("schedule_date", scheduleIso);
      params.set("duration_minutes", String(totalDur));
    }
    if (action === "edit" && initialBooking?.id) {
      params.set("exclude_booking_id", String(initialBooking.id));
    }
    const query = params.toString();
    return `/master/staffs/for-booking/availability${query ? `?${query}` : ""}`;
  }, [scheduleIso, totalDur, action, initialBooking]);

  const { data: staffAvailabilityResp } = useApiFetch<{ data: StaffOption[] }>(
    [
      "staff-availability",
      scheduleIso ?? "",
      String(totalDur),
      initialBooking?.id != null ? String(initialBooking.id) : "",
    ],
    staffAvailabilityUrl,
    undefined,
    isOpen,
  );

  const staffOptions: StaffOption[] = useMemo(() => {
    const fromApi = staffAvailabilityResp?.data ?? [];
    if (fromApi.length > 0) return fromApi;

    return staffList.map((name, index) => ({
      id: index,
      full_name: name,
      is_available: true,
      available_until: null,
      unavailable_reason: null,
    }));
  }, [staffAvailabilityResp, staffList]);

  const customerLookupUrl =
    form.phone.trim().length >= 8
      ? `/customer/lookup?phone=${encodeURIComponent(form.phone.trim())}`
      : "";

  const { data: customerLookupResp } = useApiFetch<{
    data: {
      customer: { name: string } | null;
      total_bookings: number;
    };
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
      customerName: string;
      customerPhone: string;
      therapists: string[];
      scheduleDate: string | null;
      durationMinutes: number;
      status: string;
      paymentStatus: string;
      totalAmount: number;
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
      customerName: string;
      customerPhone: string;
      therapists: string[];
      scheduleDate: string | null;
      durationMinutes: number;
      totalAmount: number;
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
    {
      data: {
        payment_url: string;
      };
    },
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

      if (next.date && next.time) {
        const timeBounds = getBundleTimeBounds(selectedBundle, next.date);
        if (timeBounds) {
          if (next.time < timeBounds.minTime) next.time = timeBounds.minTime;
          if (next.time > timeBounds.maxTime) next.time = timeBounds.maxTime;
        }

        if (!isDateTimeWithinBundle(selectedBundle, next.date, next.time)) {
          next.time = "";
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

    setForm((prev) => {
      if (
        prev.date &&
        prev.time &&
        !isDateTimeWithinBundle(bundle, prev.date, prev.time)
      ) {
        return { ...prev, date: "", time: "" };
      }
      return prev;
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

  const bundleScheduleValid =
    !selectedBundle ||
    (!!form.date &&
      !!form.time &&
      isDateTimeWithinBundle(selectedBundle, form.date, form.time));

  const therapistsAvailable = form.therapists.every((name) => {
    const staff = staffOptions.find((s) => s.full_name === name);
    return !staff || staff.is_available;
  });

  const canBook =
    !!form.name.trim() &&
    !!form.date &&
    !!form.time &&
    form.therapists.length > 0 &&
    cartLines.length > 0 &&
    bundleScheduleValid &&
    therapistsAvailable;

  const isSubmitPending =
    action === "edit" ? updateBooking.isPending : createBooking.isPending;

  const handleBook = () => {
    if (!canBook || isSubmitPending) return;

    const lineItems = cartLines.map((line) =>
      line.kind === "bundle"
        ? { type: "bundle_promo" as const, bundle_promo_id: line.bundle.id }
        : {
            type: "service_variant" as const,
            service_variant_id: line.variant.id,
          },
    );

    const booking = {
      customerName: form.name,
      customerPhone: form.phone,
      therapists: form.therapists,
      scheduleDate:
        form.date && form.time
          ? new Date(`${form.date}T${form.time}:00`).toISOString()
          : null,
      durationMinutes: totalDur,
      totalAmount: totalAmt,
      line_items: lineItems,
    };

    if (action === "edit" && initialBooking?.id) {
      updateBooking.mutate({
        bookingId: Number(initialBooking.id),
        ...booking,
      });
      return;
    }

    createBooking.mutate({
      ...booking,
      status: "Pending",
      paymentStatus: "Unpaid",
    });
  };

  const reset = () => {
    setCartLines([]);
    setForm({ name: "", phone: "", therapists: [], date: "", time: "" });
    setSearch("");
    setBrowseMode("services");
    setCat("spa");
    setSuccess(false);
    setCreatedBooking(null);
    setMobileView("browse");
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

  if (variantsLoading && !variantsResp && staffsLoading) {
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
          {(
            [
              ["Customer", form.name],
              form.phone ? ["Phone", form.phone] : null,
              form.therapists.length
                ? ["Therapist(s)", form.therapists.join(", ")]
                : null,
              [
                "Date & Time",
                form.date && form.time
                  ? formatDate(new Date(`${form.date}T${form.time}:00`), {
                      withTime: true,
                    })
                  : "—",
              ],
              ["Duration", durFmt(totalDur)],
              [
                "Items",
                cartLines.length === 1 && cartLines[0].kind === "bundle"
                  ? cartLines[0].bundle.name
                  : `${cartLines.filter((line) => line.kind === "service").length} layanan`,
              ],
            ] as (string[] | null)[]
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
      {/* HEADER */}

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
              Pilih layanan atau bundle promo, lalu isi detail appointment
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

      {/* BODY — fills remaining height, splits into browser + order panel */}

      <div className="flex min-h-0 flex-1 w-full overflow-hidden">
        {/* LEFT: Service Browser */}

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

        {/* RIGHT: Order Panel */}

        <div
          className={[
            "flex min-h-0 flex-col",

            mobileView === "order"
              ? "flex w-full min-w-0 flex-1"
              : "hidden md:flex md:w-[300px] md:shrink-0 lg:w-[340px]",
          ].join(" ")}
        >
          <OrderPanel
            form={form}
            setForm={updateForm}
            cartLines={cartLines}
            onRemoveLine={removeLine}
            onClearCart={() => setCartLines([])}
            totalAmt={totalAmt}
            totalDur={totalDur}
            canBook={canBook}
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
            staffOptions={staffOptions}
            selectedBundle={selectedBundle}
            customerBookingCount={customerBookingCount}
          />
        </div>
      </div>

      {/* MOBILE BOTTOM BAR */}

      {mobileView === "browse" && (
        <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 border-t border-[#EDE8E3] bg-white w-full">
          {cartLines.length > 0 ? (
            <>
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
            </>
          ) : (
            <p className="w-full text-center text-[13px] text-[#B5AFA9]">
              Pilih layanan atau bundle promo untuk lanjut
            </p>
          )}
        </div>
      )}
    </div>
  );
}
