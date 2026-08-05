"use client";

import React from "react";
import { Variant } from "./booking.types";
import { idr, durFmt } from "./bookingModal.utils";

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

interface ServiceCardProps {
  v: Variant;
  selected: boolean;
  onToggle: () => void;
  qty?: number;
  onUpdateQty?: (newQty: number) => void;
  disabled?: boolean;
  helperText?: string;
  priceOverride?: number;
}

export function ServiceCard({
  v,
  selected,
  onToggle,
  qty = 1,
  onUpdateQty,
  disabled = false,
  helperText,
  priceOverride,
}: ServiceCardProps) {
  return (
    <div
      onClick={!disabled ? onToggle : undefined}
      className={[
        "relative text-left w-full rounded-xl border p-3 transition-all duration-150 min-w-0",
        selected
          ? "border-[#B55368] bg-[#FEF1F4]"
          : "border-[#EDE8E3] bg-white hover:border-[#E8B4C0] cursor-pointer",
        disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
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

      <div className="flex items-end justify-between gap-2 mt-auto">
        <p
          className={`text-[13px] font-bold ${selected ? "text-[#B55368]" : "text-[#1A1614]"}`}
        >
          {idr((priceOverride ?? v.price) * (selected ? qty : 1))}
        </p>

        {selected && onUpdateQty && (
          <div
            className="flex items-center bg-white/60 backdrop-blur-sm rounded-lg p-0.5 border border-[#B55368]/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onUpdateQty(qty - 1)}
              disabled={qty <= 1}
              className="w-6 h-6 flex items-center justify-center text-[#B55368] hover:bg-white rounded-md transition-colors disabled:opacity-30"
            >
              −
            </button>
            <span className="w-5 text-center text-[11px] font-bold text-[#B55368]">
              {qty}
            </span>
            <button
              onClick={() => onUpdateQty(qty + 1)}
              className="w-6 h-6 flex items-center justify-center text-[#B55368] hover:bg-white rounded-md transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>

      {helperText && (
        <div className="mt-2 pt-2 border-t border-[#EDE8E3]/50">
          <p className="text-[10px] text-[#B5AFA9] leading-tight">
            {helperText}
          </p>
        </div>
      )}
    </div>
  );
}
