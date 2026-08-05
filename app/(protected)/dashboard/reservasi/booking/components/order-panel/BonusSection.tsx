"use client";

import React from "react";
import { Dropdown } from "@heroui/react";
import { ClockIcon, WarningIcon } from "@phosphor-icons/react";
import { formatWallClockDate } from "@/app/libs/date-format";
import type { AvailableSlot, AvailableTherapist } from "@/app/types/booking";
import type { BonusBookingFormState } from "../booking.types";

interface BonusSectionProps {
  bonusBookingForm: BonusBookingFormState;
  selectedFreeVariant: { id: number; name: string; duration: number } | null;
  bonusAvailableSlots: AvailableSlot[] | null;
  bonusAvailableTherapistsForSlot: AvailableTherapist[];
  selectedBonusTherapist: AvailableTherapist | null;
  onBonusScheduleModeChange: (mode: "same_date" | "custom_date") => void;
  onBonusDateChange: (date: string) => void;
  onBonusSlotSelect: (slot: AvailableSlot) => void;
  onBonusTherapistChange: (therapistId: number) => void;
  isBonusSlotDisabled: (slot: AvailableSlot) => boolean;
}

export function BonusSection({
  bonusBookingForm,
  selectedFreeVariant,
  bonusAvailableSlots,
  bonusAvailableTherapistsForSlot,
  selectedBonusTherapist,
  onBonusScheduleModeChange,
  onBonusDateChange,
  onBonusSlotSelect,
  onBonusTherapistChange,
  isBonusSlotDisabled,
}: BonusSectionProps) {
  if (!selectedFreeVariant) return null;

  return (
    <div
      id="booking-modal-bogo-bonus"
      className="bg-[#FEF1F4] rounded-2xl border border-[#E8B4C0] p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
            <span className="text-[#B55368] text-[10px] font-bold">★</span>
          </div>
          <p className="text-[11px] font-bold text-[#B55368] uppercase tracking-wider">
            Bonus Gratis
          </p>
        </div>
        <div className="flex items-center bg-white rounded-lg p-1 border border-[#E8B4C0]">
          <button
            onClick={() => onBonusScheduleModeChange("same_date")}
            className={[
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
              bonusBookingForm.scheduleMode === "same_date"
                ? "bg-[#B55368] text-white"
                : "text-[#B55368] hover:bg-[#FEF1F4]",
            ].join(" ")}
          >
            Sama
          </button>
          <button
            onClick={() => onBonusScheduleModeChange("custom_date")}
            className={[
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
              bonusBookingForm.scheduleMode === "custom_date"
                ? "bg-[#B55368] text-white"
                : "text-[#B55368] hover:bg-[#FEF1F4]",
            ].join(" ")}
          >
            Beda Jam
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 border border-[#E8B4C0]">
        <p className="text-[12px] font-bold text-[#1A1614] mb-0.5">
          {selectedFreeVariant.name}
        </p>
        <p className="text-[11px] text-[#B5AFA9]">
          {bonusBookingForm.date ? formatWallClockDate(bonusBookingForm.date) : "Pilih slot..."}
          {bonusBookingForm.slotTime ? ` · ${bonusBookingForm.slotTime}` : ""}
        </p>
      </div>

      {bonusBookingForm.scheduleMode === "custom_date" && (
        <div className="space-y-3">
          <input
            type="date"
            className="w-full h-10 px-3 rounded-xl border border-[#E8B4C0] text-[13px] bg-white outline-none focus:ring-2 focus:ring-[#B55368]/10"
            value={bonusBookingForm.date}
            onChange={(e) => onBonusDateChange(e.target.value)}
          />
        </div>
      )}

      {bonusBookingForm.date && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClockIcon size={14} className="text-[#B55368]" />
            <p className="text-[11px] font-bold text-[#B55368] uppercase tracking-wider">
              Slot Bonus Tersedia
            </p>
          </div>

          {!bonusAvailableSlots ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#B55368] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bonusAvailableSlots.length === 0 ? (
            <div className="p-4 bg-white/50 rounded-xl border border-dashed border-[#E8B4C0] text-center">
              <WarningIcon size={20} className="text-[#B55368] mx-auto mb-1" />
              <p className="text-[11px] text-[#B55368] font-medium">
                Tidak ada slot tersedia
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {bonusAvailableSlots.map((slot) => {
                const disabled = isBonusSlotDisabled(slot);
                const isSelected = bonusBookingForm.slotTime === slot.slot_time;
                return (
                  <button
                    key={slot.slot_time}
                    disabled={disabled}
                    onClick={() => onBonusSlotSelect(slot)}
                    className={[
                      "h-8 rounded-lg text-[11px] font-bold border transition-all",
                      isSelected
                        ? "bg-[#B55368] border-[#B55368] text-white"
                        : disabled
                          ? "bg-white/30 border-transparent text-[#E8B4C0] cursor-not-allowed"
                          : "bg-white border-[#E8B4C0] text-[#B55368] hover:bg-[#FEF1F4]",
                    ].join(" ")}
                  >
                    {slot.slot_time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {bonusBookingForm.slotTime && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-[#B55368] uppercase tracking-wider">
            Terapis Bonus
          </p>
          <Dropdown>
            <Dropdown.Trigger>
              <button className="w-full h-10 px-3 rounded-xl border border-[#E8B4C0] bg-white text-[12px] text-left text-[#1A1614] hover:border-[#B55368] transition-colors">
                {selectedBonusTherapist?.name ?? "Pilih Terapis Bonus"}
              </button>
            </Dropdown.Trigger>
            <Dropdown.Menu
              aria-label="Pilih Terapis Bonus"
              onAction={(key) => onBonusTherapistChange(Number(key))}
            >
              {bonusAvailableTherapistsForSlot.map((t) => (
                <Dropdown.Item key={t.id}>{t.name}</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      )}
    </div>
  );
}
