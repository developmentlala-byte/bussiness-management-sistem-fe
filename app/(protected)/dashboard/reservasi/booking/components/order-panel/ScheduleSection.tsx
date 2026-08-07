"use client";

import React from "react";
import { Calendar, Switch, SwitchGroup, Label } from "@heroui/react";
import { ClockIcon, WarningIcon } from "@phosphor-icons/react";
import { parseDate } from "@internationalized/date";
import { formatWallClockDate } from "@/app/libs/date-format";
import type { AvailableSlot } from "@/app/types/booking";
import type { FormState } from "../booking.types";

interface ScheduleSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  availableDates: string[];
  availableSlots: AvailableSlot[] | null;
  bundleCalendarBounds: { minValue: any; maxValue: any } | null;
  onSlotSelect: (slot: AvailableSlot) => void;
  isSlotDisabled: (slot: AvailableSlot) => boolean;
  onDateSelect?: (date: { toString: () => string }) => void;
  onDateFocusChange?: (date: { year: number; month: number }) => void;
}

export function ScheduleSection({
  form,
  setForm,
  availableDates,
  availableSlots,
  bundleCalendarBounds,
  onSlotSelect,
  isSlotDisabled,
  onDateSelect,
  onDateFocusChange,
}: ScheduleSectionProps) {
  const isDateAvailable = (dateStr: string): boolean => {
    if (!availableDates.length) return true;
    return availableDates.includes(dateStr);
  };

  const handleDateSelect = (date: { toString: () => string }) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      const dateStr = date.toString();
      setForm((prev) => ({
        ...prev,
        date: dateStr,
        slotTime: "",
        staffAssignments: prev.date === dateStr ? prev.staffAssignments : [],
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold text-[#B5AFA9] uppercase tracking-[0.06em]">
            Pilih Tanggal
          </p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[12px] font-semibold text-[#1A1614]">
                Dilakukan Bersamaan?
              </span>
              <span className="text-[10px] text-[#B5AFA9]">
                Pilih jika Anda datang bersama pasangan/teman
              </span>
            </div>
            <Switch
              size="sm"
              isSelected={form.isParallel}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, isParallel: val }))
              }
              aria-label="Booking dilakukan bersamaan"
            >
              <Switch.Control className="data-[selected=true]:bg-[#B55368]">
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </div>
        </div>

        <Calendar
          aria-label="Booking date"
          value={form.date ? parseDate(form.date) : null}
          onChange={handleDateSelect}
          isDateUnavailable={(date) => !isDateAvailable(date.toString())}
          minValue={bundleCalendarBounds?.minValue}
          maxValue={bundleCalendarBounds?.maxValue}
          className="w-full border-none bg-transparent shadow-none"
        >
          <Calendar.Header className="bg-transparent pb-4">
            <Calendar.Heading className="text-[14px] font-bold text-[#1A1614]" />
            <Calendar.NavButton
              className="rounded-lg text-[#B5AFA9] hover:bg-[#F3F0ED]"
              slot="previous"
            />
            <Calendar.NavButton
              className="rounded-lg text-[#B5AFA9] hover:bg-[#F3F0ED]"
              slot="next"
            />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader className="bg-transparent">
              {(day) => (
                <Calendar.HeaderCell className="text-[11px] font-bold text-[#B5AFA9]!">
                  {day}
                </Calendar.HeaderCell>
              )}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => (
                <Calendar.Cell
                  className={[
                    "p-0.5 h-9 w-full text-black! rounded-lg text-[13px] font-medium transition-all duration-200",
                    "data-[unavailable=true]:cursor-not-allowed! data-[unavailable=true]:text-[#EDE8E3]!",
                    "data-[selected=true]:bg-[#B55368]! data-[selected=true]:text-white! data-[selected=true]:font-bold data-[selected=true]:shadow-[0_4px_12px_rgba(181,83,104,0.2)]!",
                    "data-[today=true]:text-[#B55368]! data-[today=true]:font-bold!",
                    "hover:bg-[#FEF1F4]! hover:text-[#B55368]!",
                  ].join(" ")}
                  date={date}
                />
              )}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </div>

      {form.date && (
        <div className="bg-white rounded-2xl border border-[#EDE8E3] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#FEF1F4] flex items-center justify-center">
                <ClockIcon size={12} weight="bold" className="text-[#B55368]" />
              </div>
              <p className="text-[11px] font-bold text-[#1A1614] uppercase tracking-wider">
                Slot Tersedia
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#B5AFA9]">
              {formatWallClockDate(form.date)}
            </span>
          </div>

          {!availableSlots ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-8 h-8 border-2 border-[#B55368] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[12px] text-[#B5AFA9]">Mencari slot...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[#FCFAF8] rounded-xl border border-dashed border-[#EDE8E3]">
              <WarningIcon size={24} className="text-[#B5AFA9] mb-2" />
              <p className="text-[12px] font-medium text-[#1A1614]">
                Tidak ada slot
              </p>
              <p className="text-[11px] text-[#B5AFA9]">
                Coba pilih tanggal lain
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((slot) => {
                const disabled = isSlotDisabled(slot);
                const isSelected = form.slotTime === slot.slot_time;

                return (
                  <button
                    key={slot.slot_time}
                    disabled={disabled}
                    onClick={() => onSlotSelect(slot)}
                    className={[
                      "h-10 rounded-xl text-[12px] font-semibold transition-all duration-200 border",
                      isSelected
                        ? "bg-[#B55368] border-[#B55368] text-white shadow-[0_4px_12px_rgba(181,83,104,0.2)]"
                        : disabled
                          ? "bg-[#F3F0ED] border-transparent text-[#D5CFC9] cursor-not-allowed opacity-50"
                          : "bg-white border-[#EDE8E3] text-[#1A1614] hover:border-[#B55368] hover:text-[#B55368] hover:bg-[#FEF1F4]",
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
    </div>
  );
}
