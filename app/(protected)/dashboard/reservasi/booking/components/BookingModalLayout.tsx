"use client";

import React from "react";
import { idr } from "./bookingModal.utils";
import { OrderPanel } from "./orderPanel";
import { BrowsePanel } from "./BrowsePanel";
import type {
  Variant,
  CartLine,
  FormState,
  BonusBookingFormState,
  BookingStep,
  Resource,
  BogoEligibleService,
  ExistingTherapist,
} from "./booking.types";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import type {
  AvailableSlotsResponse,
  AvailableDatesResponse,
} from "@/app/types/booking";

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

interface BookingModalLayoutProps {
  isEdit: boolean;
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  browseMode: "services" | "bundles";
  setBrowseMode: (mode: "services" | "bundles") => void;
  cat: string;
  setCat: (cat: string) => void;
  search: string;
  setSearch: (s: string) => void;
  cartLines: CartLine[];
  setCartLines: React.Dispatch<React.SetStateAction<CartLine[]>>;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  updateForm: (updater: (prev: FormState) => FormState) => void;
  pricingSummary: {
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    appliedVoucher: any;
    isApplied: boolean;
  };
  totalDur: number;
  availableVariants: Variant[];
  activeBundles: BundlePromo[];
  availableResources: Resource[];
  variantsLoading: boolean;
  bundlesLoading: boolean;
  availableDatesResp?: AvailableDatesResponse;
  availableSlotsResp?: AvailableSlotsResponse;
  bonusAvailableSlotsResp?: AvailableSlotsResponse;
  existingTherapists: ExistingTherapist[];
  selectedServiceVariantUnits: Array<{
    key: string;
    variantId: number;
    unitIndex: number;
    groupId: string;
  }>;
  unitTimes: Map<
    string,
    { startTime: string; endTime: string; duration: number }
  >;
  handleBook: () => void;
  handleApplyVoucher: () => void;
  isSubmitPending: boolean;
  isApplyingVoucher: boolean;
  viewingMonth: string;
  setViewingMonth: (m: string) => void;
  mobileView: "browse" | "order";
  setMobileView: (v: "browse" | "order") => void;
  bonusBookingForm: BonusBookingFormState;
  setBonusBookingForm: React.Dispatch<React.SetStateAction<BonusBookingFormState>>;
  selectedFreeVariant: Variant | null;
  selectedServiceVariantIds: number[];
  selectedBundle: BundlePromo | null;
  customerBookingCount: number | null;
  toggleService: (v: Variant) => void;
  toggleBundle: (b: BundlePromo) => void;
  toggleFreeService: (s: BogoEligibleService) => void;
  removeLine: (i: number) => void;
  updateServiceQty: (i: number, q: number) => void;
  updateVariantQty: (id: number, q: number) => void;
  handleBonusScheduleModeChange: (m: "same_date" | "custom_date") => void;
  handleBonusDateChange: (d: string) => void;
  handleBonusSlotSelect: (s: any) => void;
  handleBonusTherapistChange: (id: number) => void;
  isBonusSlotConflictingWithPaidBooking: (s: any) => boolean;
  isBogoActive: boolean;
  bogoCapAmount: number;
  bogoEligibleServices: BogoEligibleService[];
  isBonusBlockedByPaidSelection: (id: number) => boolean;
  inPaidCart: (id: number) => boolean;
  getPaidCartQty: (id: number) => number;
  inFreeCart: (id: number) => boolean;
  isBogoEligibleId: (id: number) => boolean;
  CATS: Array<{ key: string; label: string }>;
  groupedVariants: Record<string, Variant[]>;
  filteredBundles: BundlePromo[];
  cartSummaryLabel: string;
}

export function BookingModalLayout(props: BookingModalLayoutProps) {
  const {
    isEdit, step, setStep, browseMode, setBrowseMode, cat, setCat, search, setSearch,
    cartLines, setCartLines, form, updateForm, pricingSummary, totalDur,
    availableVariants, availableResources, bundlesLoading,
    availableDatesResp, availableSlotsResp, bonusAvailableSlotsResp,
    existingTherapists, selectedServiceVariantUnits, unitTimes,
    handleBook, handleApplyVoucher, isSubmitPending, isApplyingVoucher,
    viewingMonth, setViewingMonth, mobileView, setMobileView,
    bonusBookingForm, selectedFreeVariant, selectedServiceVariantIds,
    selectedBundle, customerBookingCount, toggleService, toggleBundle,
    toggleFreeService, removeLine, updateServiceQty, updateVariantQty,
    handleBonusScheduleModeChange, handleBonusDateChange, handleBonusSlotSelect,
    handleBonusTherapistChange, isBonusSlotConflictingWithPaidBooking,
    isBogoActive, bogoCapAmount, bogoEligibleServices, isBonusBlockedByPaidSelection,
    inPaidCart, getPaidCartQty, inFreeCart, isBogoEligibleId, CATS,
    groupedVariants, filteredBundles, cartSummaryLabel
  } = props;

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col overflow-hidden font-sans"
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
            "flex min-h-0",
            mobileView === "browse" ? "flex w-full min-w-0 flex-1" : "hidden md:flex md:min-w-0 md:flex-1",
          ].join(" ")}
        >
          <BrowsePanel
            browseMode={browseMode}
            setBrowseMode={setBrowseMode}
            cat={cat}
            setCat={setCat}
            search={search}
            setSearch={setSearch}
            CATS={CATS}
            bundlesLoading={bundlesLoading}
            filteredBundles={filteredBundles}
            cartLines={cartLines}
            toggleBundle={toggleBundle}
            groupedVariants={groupedVariants}
            isBogoActive={isBogoActive}
            bogoCapAmount={bogoCapAmount}
            bogoEligibleServices={bogoEligibleServices}
            isBonusBlockedByPaidSelection={isBonusBlockedByPaidSelection}
            availableVariants={availableVariants}
            inFreeCart={inFreeCart}
            toggleFreeService={toggleFreeService}
            inPaidCart={inPaidCart}
            getPaidCartQty={getPaidCartQty}
            updateVariantQty={updateVariantQty}
            toggleService={toggleService}
            isBogoEligibleId={isBogoEligibleId}
          />
        </div>

        {/* Order panel */}
        <div
          className={[
            "flex min-h-0 flex-col transition-all duration-300",
            mobileView === "order"
              ? "flex w-full min-w-0 flex-1"
              : step === "confirm"
                ? "hidden md:flex md:w-[480px] md:shrink-0"
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
            onUpdateServiceQty={updateServiceQty}
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
            isEdit={isEdit}
            selectedBundle={selectedBundle}
            selectedServiceVariantUnits={selectedServiceVariantUnits}
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
            isBonusSlotConflictingWithPaidBooking={isBonusSlotConflictingWithPaidBooking}
            unitTimes={unitTimes}
            availableResources={availableResources}
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
