"use client";

import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import { formatDuration } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import {
  calcBundlePricing,
  formatBundleDiscountLabel,
  normalizeBundleItems,
} from "@/app/libs/bundle-pricing";

const idr = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

interface BundlePromoCardProps {
  bundle: BundlePromo;
  selected: boolean;
  onToggle: () => void;
}

export function BundlePromoCard({
  bundle,
  selected,
  onToggle,
}: BundlePromoCardProps) {
  const pricing = calcBundlePricing(bundle);
  const items = normalizeBundleItems(bundle);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "relative w-full text-left rounded-xl border p-4 transition-all duration-150",
        selected
          ? "border-[#B55368] bg-[#FEF1F4] ring-1 ring-[#B55368]/30"
          : "border-[#EDE8E3] bg-white hover:border-[#E8B4C0]",
      ].join(" ")}
    >
      {selected && (
        <span className="absolute top-3 right-3 rounded-full bg-[#B55368] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Dipilih
        </span>
      )}

      <div className="flex items-start justify-between gap-3 pr-16">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-md bg-[#FEF1F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B55368]">
            Bundle Promo
          </span>
          <h3 className="mt-2 text-[15px] font-bold text-[#1A1614] leading-tight">
            {bundle.name}
          </h3>
          {bundle.description ? (
            <p className="mt-1 text-[12px] text-[#7A736E] line-clamp-2">
              {bundle.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          {formatBundleDiscountLabel(bundle.bundle_type, bundle.discount_value)}
        </span>
        <span className="rounded-full bg-[#F8F4F0] px-2.5 py-1 text-[11px] font-medium text-[#7A736E]">
          Hemat {idr(pricing.discountAmount)}
        </span>
        <span className="rounded-full bg-[#F8F4F0] px-2.5 py-1 text-[11px] font-medium text-[#7A736E]">
          {pricing.itemCount} layanan · {formatDuration(pricing.totalDuration)}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#EDE8E3] pt-3">
        <div>
          <p className="text-[11px] text-[#B5AFA9] line-through">
            {idr(pricing.subtotal)}
          </p>
          <p className="text-[18px] font-bold text-[#B55368]">
            {idr(pricing.finalPrice)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#B5AFA9]">
          Termasuk
        </p>
        {items.map((item) => (
          <div
            key={`${item.bms_ms_service_variant_id}-${item.id}`}
            className="flex items-center justify-between gap-2 text-[12px]"
          >
            <span className="text-[#1A1614] truncate">
              {item.quantity > 1 ? `${item.quantity}× ` : ""}
              {item.service_variant?.name ?? "Layanan"}
              {item.service_variant?.duration_minutes ? (
                <span className="text-[#B5AFA9]">
                  {" "}
                  · {formatDuration(item.service_variant.duration_minutes)}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-[#7A736E]">
              {idr(Number(item.service_variant?.retail_price ?? 0) * item.quantity)}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
