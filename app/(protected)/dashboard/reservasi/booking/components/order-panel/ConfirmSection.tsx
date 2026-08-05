"use client";

import React from "react";
import { ClockIcon } from "@phosphor-icons/react";
import { formatWallClockDate } from "@/app/libs/date-format";
import { durFmt } from "../bookingModal.utils";
import type { Variant, FormState } from "../booking.types";

interface ConfirmSectionProps {
  form: FormState;
  isEdit: boolean;
  setStep: (step: any) => void;
  totalDur: number;
  unitTimes: Map<string, { startTime: string; endTime: string; duration: number }>;
  selectedServiceVariantUnits: Array<{
    key: string;
    variantId: number;
    unitIndex: number;
  }>;
  availableVariants: Variant[];
}

export function ConfirmSection({
  form,
  isEdit,
  setStep,
  totalDur,
  unitTimes,
  selectedServiceVariantUnits,
  availableVariants,
}: ConfirmSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em]">
            Appointment
          </p>
          {isEdit && (
            <button
              type="button"
              onClick={() => setStep("datetime")}
              className="text-[11px] font-medium text-[#B55368] hover:text-[#C96480] transition-colors"
            >
              Edit Jadwal
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#EDE8E3] p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF1F4] flex items-center justify-center shrink-0">
              <ClockIcon weight="duotone" className="size-5 text-[#B55368]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1A1614]">
                {form.date
                  ? formatWallClockDate(form.date, { dateStyle: "full" })
                  : "—"}
              </p>
              <p className="text-[11px] text-[#7A736E]">
                {form.slotTime} · {durFmt(totalDur)}
              </p>
            </div>
          </div>

          {unitTimes.size > 0 && (
            <div className="pt-3 border-t border-[#EDE8E3] space-y-2">
              <p className="text-[10px] font-bold text-[#B5AFA9] uppercase tracking-widest">
                Timeline Pengerjaan
              </p>
              <div className="space-y-1.5">
                {selectedServiceVariantUnits.map((unit) => {
                  const times = unitTimes.get(unit.key);
                  const variant = availableVariants.find((v) => v.id === unit.variantId);
                  if (!times) return null;
                  return (
                    <div key={`timeline-${unit.key}`} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B55368] shrink-0" />
                        <span className="text-[12px] text-[#1A1614] truncate">
                          {variant?.name} {unit.unitIndex > 1 ? `#${unit.unitIndex}` : ""}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-[#B55368] bg-[#FEF1F4] px-2 py-0.5 rounded-md shrink-0">
                        {times.startTime} - {times.endTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
