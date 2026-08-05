"use client";

import React from "react";
import type { FormState } from "../booking.types";

interface CustomerSectionProps {
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  customerBookingCount: number | null;
}

export function CustomerSection({
  form,
  setForm,
  customerBookingCount,
}: CustomerSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em] mb-2">
          Customer
        </p>
        <input
          className="w-full py-[9px] px-3 rounded-[10px] border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)] mb-2"
          placeholder="Full name *"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
        />
        <input
          className="w-full py-[9px] px-3 rounded-[10px] border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)]"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, phone: e.target.value }))
          }
        />
        {customerBookingCount !== null && form.phone.trim().length >= 8 && (
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
  );
}
