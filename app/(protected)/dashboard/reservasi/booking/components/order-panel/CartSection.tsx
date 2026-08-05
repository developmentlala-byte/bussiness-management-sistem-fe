"use client";

import React from "react";
import { durFmt, idr } from "../bookingModal.utils";
import { formatBundleDiscountLabel } from "@/app/libs/bundle-pricing";
import type { CartLine } from "../booking.types";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";

interface CartRowProps {
  v: {
    id: number;
    catKey: string;
    subCat: string;
    name: string;
    duration: number;
    price: number;
    categoryId: number;
  };
  qty: number;
  onRemove: () => void;
  onUpdateQty?: (qty: number) => void;
  isFree?: boolean;
}

function CartRow({
  v,
  qty,
  onRemove,
  onUpdateQty,
  isFree = false,
}: CartRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#EDE8E3] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#1A1614] truncate">
            {v.name}
          </p>
        </div>
        <p className="text-[11px] text-[#B5AFA9]">
          {durFmt(v.duration)}
          {isFree ? " · Bonus gratis" : ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {!isFree && onUpdateQty && (
          <div className="flex items-center bg-[#F3F0ED] rounded-lg p-0.5 border border-[#EDE8E3]">
            <button
              onClick={() => onUpdateQty(qty - 1)}
              disabled={qty <= 1}
              className="w-6 h-6 flex items-center justify-center text-[#1A1614] hover:bg-white rounded-md transition-colors disabled:opacity-30"
            >
              −
            </button>
            <span className="w-5 text-center text-[11px] font-bold text-[#1A1614]">
              {qty}
            </span>
            <button
              onClick={() => onUpdateQty(qty + 1)}
              className="w-6 h-6 flex items-center justify-center text-[#1A1614] hover:bg-white rounded-md transition-colors"
            >
              +
            </button>
          </div>
        )}

        <div className="text-right min-w-[70px]">
          <span className="text-[13px] font-semibold text-[#1A1614] block">
            {idr(isFree ? 0 : v.price * qty)}
          </span>
        </div>

        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-loose hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
          aria-label="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface BundleCartRowProps {
  bundle: BundlePromo;
  pricing: {
    subtotal: number;
    discountAmount: number;
    finalPrice: number;
    totalDuration: number;
    itemCount: number;
  };
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

interface CartSectionProps {
  cartLines: CartLine[];
  onRemoveLine: (index: number) => void;
  onUpdateServiceQty: (index: number, newQty: number) => void;
}

export function CartSection({
  cartLines,
  onRemoveLine,
  onUpdateServiceQty,
}: CartSectionProps) {
  if (cartLines.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EDE8E3] bg-[#FCFAF8]">
        <p className="text-[11px] font-bold text-[#1A1614] uppercase tracking-wider">
          Layanan Terpilih
        </p>
      </div>
      <div className="px-4 py-1">
        {cartLines.map((line, i) => {
          if (line.kind === "service") {
            return (
              <CartRow
                key={`${line.variant.id}-${i}`}
                v={line.variant}
                qty={line.qty}
                isFree={line.isFree}
                onRemove={() => onRemoveLine(i)}
                onUpdateQty={(q) => onUpdateServiceQty(i, q)}
              />
            );
          }
          return (
            <BundleCartRow
              key={`bundle-${line.bundle.id}-${i}`}
              bundle={line.bundle}
              pricing={line.pricing}
              onRemove={() => onRemoveLine(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
