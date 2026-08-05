"use client";

import React from "react";
import { toast } from "@heroui/react";
import { idr } from "./bookingModal.utils";
import { BundlePromoCard } from "./bundlePromoCard";
import { ServiceCard } from "./ServiceCard";
import type {
  Variant,
  CartLine,
  BogoEligibleService,
} from "./booking.types";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";

const IconSearch = ({ color = "#B5AFA9" }: { color?: string }) => (
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

const inputCls =
  "w-full py-[9px] px-3 rounded-[10px] border border-[#EDE8E3] text-[13px] text-[#1A1614] bg-white outline-none transition-colors duration-150 focus:border-[#B55368] focus:ring-2 focus:ring-[rgba(181,83,104,0.10)]";

interface BrowsePanelProps {
  browseMode: "services" | "bundles";
  setBrowseMode: (mode: "services" | "bundles") => void;
  cat: string;
  setCat: (cat: string) => void;
  search: string;
  setSearch: (s: string) => void;
  CATS: Array<{ key: string; label: string }>;
  bundlesLoading: boolean;
  filteredBundles: BundlePromo[];
  cartLines: CartLine[];
  toggleBundle: (b: BundlePromo) => void;
  groupedVariants: Record<string, Variant[]>;
  isBogoActive: boolean;
  bogoCapAmount: number;
  bogoEligibleServices: BogoEligibleService[];
  isBonusBlockedByPaidSelection: (id: number) => boolean;
  availableVariants: Variant[];
  inFreeCart: (id: number) => boolean;
  toggleFreeService: (s: BogoEligibleService) => void;
  inPaidCart: (id: number) => boolean;
  getPaidCartQty: (id: number) => number;
  updateVariantQty: (id: number, q: number) => void;
  toggleService: (v: Variant) => void;
  isBogoEligibleId: (id: number) => boolean;
}

export function BrowsePanel(props: BrowsePanelProps) {
  const {
    browseMode, setBrowseMode, cat, setCat, search, setSearch, CATS,
    bundlesLoading, filteredBundles, cartLines, toggleBundle,
    groupedVariants, isBogoActive, bogoCapAmount, bogoEligibleServices,
    isBonusBlockedByPaidSelection, availableVariants, inFreeCart,
    toggleFreeService, inPaidCart, getPaidCartQty, updateVariantQty,
    toggleService, isBogoEligibleId
  } = props;

  return (
    <div className="flex min-h-0 flex-col border-r border-[#EDE8E3] flex-1">
      {/* Browse controls */}
      <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-[#EDE8E3] space-y-2 min-w-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden min-w-0">
          {(["services", "bundles"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setBrowseMode(mode);
                setSearch("");
              }}
              className={[
                "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-150",
                browseMode === mode
                  ? "bg-[#B55368] text-white border-[#B55368]"
                  : "bg-[#F8F4F0] text-[#7A736E] border-transparent hover:border-[#E8B4C0]",
              ].join(" ")}
            >
              {mode === "services" ? "Layanan" : "Bundle Promo"}
            </button>
          ))}
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

      {/* Browse content */}
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
                  selected={cartLines.some(
                    (l) => l.kind === "bundle" && l.bundle.id === bundle.id,
                  )}
                  onToggle={() => toggleBundle(bundle)}
                />
              ))}
            </div>
          )
        ) : Object.keys(groupedVariants).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#B5AFA9]">
            <IconSearch color="#D5CFC9" />
            <p className="text-sm">
              No services found{search ? ` for "${search}"` : ""}
            </p>
          </div>
        ) : (
          <>
            {isBogoActive && (
              <div
                id="booking-modal-bogo-bonus"
                className="mb-6 rounded-2xl border border-[#E8B4C0] bg-[#FFFCFA] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-[#B55368] uppercase tracking-[0.07em] shrink-0">
                    Bonus Voucher
                  </span>
                  <div className="flex-1 h-px bg-[#F2D7DE]" />
                </div>
                <p className="mb-3 text-[12px] text-[#7A736E]">
                  Pilih 1 bonus gratis. Maks bonus{" "}
                  <span className="font-semibold text-[#B55368]">
                    {idr(bogoCapAmount)}
                  </span>
                </p>
                <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {bogoEligibleServices.map((row) => {
                    const disableByPrice =
                      Number(row.retail_price ?? 0) > bogoCapAmount;
                    const disableByConflict = isBonusBlockedByPaidSelection(
                      row.id,
                    );
                    const baseVariant = availableVariants.find(
                      (v) => v.id === row.id,
                    );
                    const bonusVariant: Variant = baseVariant
                      ? { ...baseVariant, price: 0 }
                      : {
                          id: row.id,
                          catKey: "promo",
                          subCat: "Bonus Voucher",
                          name: row.name,
                          duration: Number(row.duration_minutes ?? 0),
                          price: 0,
                          categoryId: 0,
                        };

                    return (
                      <ServiceCard
                        key={`bogo-${row.id}`}
                        v={bonusVariant}
                        selected={inFreeCart(row.id)}
                        qty={1} // Bonus usually 1
                        disabled={disableByPrice || disableByConflict}
                        helperText={
                          disableByConflict
                            ? "Tidak dapat dipilih karena sudah membeli Balinese Massage lainnya"
                            : disableByPrice
                              ? `Harga item ${idr(Number(row.retail_price ?? 0))}`
                              : "Bonus gratis"
                        }
                        priceOverride={0}
                        onToggle={() => {
                          if (disableByConflict) {
                            toast.warning(
                              "Bonus Balinese Massage 60/90 tidak bisa dipilih karena sudah membeli Balinese Massage yang sama atau lebih lama.",
                            );
                            return;
                          }
                          if (disableByPrice) {
                            toast.warning(
                              "Bonus tidak bisa dipilih karena lebih mahal dari layanan utama",
                            );
                            return;
                          }
                          toggleFreeService(row);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {Object.entries(groupedVariants)
              .sort(([a], [b]) => {
                const nameA = a.toUpperCase();
                const nameB = b.toUpperCase();
                const isMassageA = nameA.indexOf("MASSAGE") !== -1;
                const isMassageB = nameB.indexOf("MASSAGE") !== -1;
                const isSpaA = nameA.indexOf("SPA") !== -1;
                const isSpaB = nameB.indexOf("SPA") !== -1;
                const isAddOnA = nameA === "ADD ON" || nameA.indexOf("ADD_ON") !== -1 || nameA.indexOf("ADDON") !== -1 || nameA.indexOf("ADD-ON") !== -1;
                const isAddOnB = nameB === "ADD ON" || nameB.indexOf("ADD_ON") !== -1 || nameB.indexOf("ADDON") !== -1 || nameB.indexOf("ADD-ON") !== -1;
                const isBathA = nameA.indexOf("BATH") !== -1;
                const isBathB = nameB.indexOf("BATH") !== -1;

                const getPriority = (isM: boolean, isS: boolean, isB: boolean, isA: boolean) => {
                  if (isM) return -4;
                  if (isS) return -3;
                  if (isB) return -2;
                  if (isA) return 1;
                  return 0;
                };

                const prioA = getPriority(isMassageA, isSpaA, isBathA, isAddOnA);
                const prioB = getPriority(isMassageB, isSpaB, isBathB, isAddOnB);
                if (prioA !== prioB) return prioA - prioB;
                return a.localeCompare(b);
              })
              .map(([subCat, vars]) => {
                const sortedVars = [...vars].sort((a, b) => {
                  const nA = a.name.toUpperCase();
                  const nB = b.name.toUpperCase();
                  const isBalineseA = nA.indexOf("BALINESE") !== -1;
                  const isBalineseB = nB.indexOf("BALINESE") !== -1;
                  const isThaiA = nA.indexOf("THAI") !== -1;
                  const isThaiB = nB.indexOf("THAI") !== -1;

                  const getItemPriority = (isB: boolean, isT: boolean) => {
                    if (isB) return -2;
                    if (isT) return -1;
                    return 0;
                  };

                  const pA = getItemPriority(isBalineseA, isThaiA);
                  const pB = getItemPriority(isBalineseB, isThaiB);
                  if (pA !== pB) return pA - pB;
                  return a.name.localeCompare(b.name);
                });

                return (
                  <div key={subCat} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold text-[#B5AFA9] uppercase tracking-[0.07em] shrink-0">
                        {subCat}
                      </span>
                      <div className="flex-1 h-px bg-[#EDE8E3]" />
                    </div>
                    {isBogoActive && (
                      <p className="mb-3 text-[12px] text-[#B5AFA9]">
                        Layanan utama dikunci sementara. Pilih bonus gratis
                        di bagian atas.
                      </p>
                    )}
                    <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                      {sortedVars.map((v) => {
                        const disableByBogo = isBogoActive && !inPaidCart(v.id);
                        const helperText = !disableByBogo
                          ? undefined
                          : isBogoEligibleId(v.id)
                            ? "Pilih dari Bonus Voucher"
                            : "Tidak termasuk bonus";

                        return (
                          <ServiceCard
                            key={v.id}
                            v={v}
                            selected={inPaidCart(v.id)}
                            qty={getPaidCartQty(v.id)}
                            onUpdateQty={(q) => updateVariantQty(v.id, q)}
                            disabled={disableByBogo}
                            helperText={helperText}
                            onToggle={() => {
                              if (disableByBogo) {
                                toast.warning("Item ini dikunci saat promo BOGO aktif. Pilih bonus gratis di bagian atas.");
                                return;
                              }
                              toggleService(v);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
