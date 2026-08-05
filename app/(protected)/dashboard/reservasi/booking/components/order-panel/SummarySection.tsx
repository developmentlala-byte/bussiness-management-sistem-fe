"use client";

import React from "react";
import { idr, durFmt } from "../bookingModal.utils";
import type { FormState } from "../booking.types";
import { CheckIcon, Plus } from "@phosphor-icons/react";
import { AppliedVoucherSnapshot } from "@/app/types/booking";

interface SummarySectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  totalDur: number;
  pricingSummary: {
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    appliedVoucher: AppliedVoucherSnapshot | null;
    isApplied: boolean;
  };
  onApplyVoucher: () => void;
  onBook: () => void;
  isApplyingVoucher: boolean;
  isSubmitPending: boolean;
  canBook: boolean;
  submitLabel: string;
}

export function SummarySection({
  form,
  setForm,
  totalDur,
  pricingSummary,
  onApplyVoucher,
  onBook,
  isApplyingVoucher,
  isSubmitPending,
  canBook,
  submitLabel,
}: SummarySectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Voucher Input */}
        <div className="rounded-xl border border-[#EDE8E3] bg-[#FFFCFA] p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-[#B5AFA9] uppercase tracking-[0.06em]">
              Voucher Promo
            </p>
            {pricingSummary.appliedVoucher && (
              <span className="text-[11px] font-medium text-[#2F9E44]">
                {pricingSummary.appliedVoucher.code} aktif
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 h-10 px-3 rounded-xl border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] w-[80%] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)]"
              placeholder="Masukkan kode voucher..."
              value={form.voucherCode}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  voucherCode: e.target.value.toUpperCase(),
                }))
              }
            />
            <button
              onClick={onApplyVoucher}
              disabled={isApplyingVoucher || !form.voucherCode.trim()}
              className=" h-10 rounded-xl bg-[#B55368] text-white text-[12px] font-bold hover:bg-[#C96480] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-[20%]"
            >
              {isApplyingVoucher ? "..." : <Plus className="size-4 mx-auto" />}
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

        {/* Pricing Breakdown */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#7A736E]">Total duration</span>
            <span className="font-medium text-[#1A1614]">
              {durFmt(totalDur)}
            </span>
          </div>

          {pricingSummary.discountAmount > 0 && (
            <>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7A736E]">Subtotal</span>
                <span className="font-medium text-[#1A1614]">
                  {idr(pricingSummary.subtotalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#7A736E]">
                  Diskon Voucher
                  {pricingSummary.appliedVoucher?.discount_type ===
                    "percentage" &&
                    ` (${pricingSummary.appliedVoucher.discount_value}%)`}
                </span>
                <span className="font-medium text-[#2F9E44]">
                  −{idr(pricingSummary.discountAmount)}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between pt-3 border-t border-[#EDE8E3]">
            <span className="text-[14px] font-bold text-[#1A1614]">Total</span>
            <span className="text-[16px] font-bold text-[#B55368]">
              {idr(pricingSummary.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* <div className="p-4 bg-[#FCFAF8] border-t border-[#EDE8E3]">
        <button
          onClick={onBook}
          disabled={!canBook || isSubmitPending}
          className="w-full h-12 rounded-xl bg-[#B55368] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(181,83_104,0.25)] hover:bg-[#C96480] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isSubmitPending ? "Memproses..." : submitLabel}
        </button>
      </div> */}
    </div>
  );
}
