"use client";

import React, { useEffect, useRef, useState } from "react";
import { durFmt, idr } from "../bookingModal.utils";
import { formatBundleDiscountLabel } from "@/app/libs/bundle-pricing";
import type { CartLine } from "../booking.types";
import type { BundlePromo } from "@/app/(protected)/dashboard/master/bundle-promo/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListIcon } from "lucide-react";
import { Tooltip } from "@heroui/react";

/**
 * Hook kecil buat deteksi apakah elemen teks lagi ke-truncate
 * (scrollWidth > clientWidth). Dipakai biar Tooltip nama bundle
 * cuma aktif kalau memang teksnya kepotong — bukan nyala terus
 * buat semua item termasuk yang namanya udah muat penuh.
 *
 * ResizeObserver dipasang (bukan cuma cek sekali di mount) karena
 * modal ini 2 kolom dan lebar kolom cart bisa berubah saat window
 * di-resize atau breakpoint sidebar berubah — kalau cuma cek sekali,
 * status truncated bisa basi (stale) setelah resize.
 */
function useIsTruncated<T extends HTMLElement>(deps: React.DependencyList) {
  const ref = useRef<T>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();

    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, isTruncated };
}

interface CartRowProps {
  id: string;
  v: {
    id: number;
    catKey: string;
    subCat: string;
    name: string;
    duration: number;
    price: number;
    originalPrice?: number;
    categoryId: number;
  };
  qty: number;
  onRemove: () => void;
  onUpdateQty?: (qty: number) => void;
  isFree?: boolean;
  membershipQty?: number;
}

/**
 * Layout CartRow (kolom cart sempit ±300px, jadi dibuat 2 baris):
 *
 *  [≡]  Nama layanan (boleh wrap, tidak dipotong)              [×]
 *       40 min
 *       [ − 2 + ]                                     Rp 245.000
 *       ┌──────────────────────────────────────────────────────┐
 *       │ 1 × Bayar normal                          Rp 245.000 │
 *       │ [MEMBERSHIP] 1 × pakai quota                     Rp0 │
 *       └──────────────────────────────────────────────────────┘
 *
 * Rincian normal vs membership hanya muncul kalau ada unit membership.
 */
function CartRow({
  id,
  v,
  qty,
  onRemove,
  onUpdateQty,
  isFree = false,
  membershipQty = 0,
}: CartRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const hasMembership = !isFree && membershipQty > 0;
  const normalQty = Math.max(qty - membershipQty, 0);
  const hasDiscount = !!v.originalPrice && v.originalPrice > v.price;
  const lineTotal = isFree ? 0 : v.price * normalQty;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="py-3 border-b border-[#EDE8E3] last:border-0 bg-white"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 mt-0.5 text-[#B5AFA9] hover:text-[#7A736E] shrink-0"
        >
          <ListIcon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Baris 1: nama + durasi + tombol hapus */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug text-[#1A1614] break-words">
                {v.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#B5AFA9]">
                {durFmt(v.duration)}
                {isFree && (
                  <span className="rounded-md bg-[#FEF1F4] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B55368]">
                    Bonus gratis
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onRemove}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#B5AFA9] text-lg leading-none hover:bg-[#FEE2E8] hover:text-[#B55368] transition-colors duration-150 shrink-0"
              aria-label="Remove"
            >
              ×
            </button>
          </div>

          {/* Baris 2: stepper qty (kiri) + total harga (kanan) */}
          <div className="mt-2 flex items-center justify-between gap-3">
            {!isFree && onUpdateQty ? (
              <div className="flex items-center bg-[#F3F0ED] rounded-lg p-0.5 border border-[#EDE8E3]">
                <button
                  onClick={() => onUpdateQty(qty - 1)}
                  disabled={qty <= 1}
                  className="w-6 h-6 flex items-center justify-center text-[#1A1614] hover:bg-white rounded-md transition-colors disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center text-[11px] font-bold text-[#1A1614]">
                  {qty}
                </span>
                <button
                  onClick={() => onUpdateQty(qty + 1)}
                  className="w-6 h-6 flex items-center justify-center text-[#1A1614] hover:bg-white rounded-md transition-colors"
                >
                  +
                </button>
              </div>
            ) : (
              <span />
            )}

            <div className="text-right">
              {hasDiscount && !isFree && normalQty > 0 && (
                <span className="block text-[11px] font-medium text-[#B5AFA9] line-through">
                  {idr((v.originalPrice as number) * normalQty)}
                </span>
              )}
              <span className="block text-[13px] font-semibold text-[#1A1614]">
                {idr(lineTotal)}
              </span>
            </div>
          </div>

          {/* Rincian pembayaran: normal vs membership */}
          {hasMembership && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-[#EDE8E3] bg-[#FCFAF8] px-2.5 py-2">
              {normalQty > 0 && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#7A736E]">
                    {normalQty} × Bayar normal
                  </span>
                  <span className="font-medium text-[#1A1614]">
                    {idr(v.price * normalQty)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                    Membership
                  </span>
                  {membershipQty} × pakai quota
                </span>
                <span className="font-semibold text-emerald-600">Rp0</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BundleCartRowProps {
  id: string;
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

function BundleCartRow({ id, bundle, pricing, onRemove }: BundleCartRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const { ref: bundleNameRef, isTruncated } =
    useIsTruncated<HTMLParagraphElement>([bundle.name]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="py-3 border-b border-[#EDE8E3] last:border-0 bg-white"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 mt-1 text-[#B5AFA9] hover:text-[#7A736E]"
        >
          <ListIcon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-flex rounded-md bg-[#FEF1F4] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B55368]">
            Bundle Promo
          </span>

          <Tooltip delay={300} isDisabled={!isTruncated}>
            <Tooltip.Trigger className="mt-1 text-[13px] font-semibold text-[#1A1614] truncate cursor-pointer">
              <p ref={bundleNameRef} className="">
                {bundle.name}
              </p>
            </Tooltip.Trigger>
            <Tooltip.Content
              showArrow
              placement="top"
              className="max-w-[220px] rounded-lg border border-[#2A2422] bg-[#1A1614] px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg"
            >
              <Tooltip.Arrow className="fill-[#1A1614]" />
              {bundle.name}
            </Tooltip.Content>
          </Tooltip>

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
  onReorderLines?: (oldIndex: number, newIndex: number) => void;
  onUpdateServiceQty: (index: number, newQty: number) => void;
}

export function CartSection({
  cartLines,
  onRemoveLine,
  onReorderLines,
  onUpdateServiceQty,
}: CartSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (cartLines.length === 0) return null;

  const getLineId = (line: CartLine, i: number) =>
    line.kind === "service"
      ? `${line.variant.id}-${i}`
      : `bundle-${line.bundle.id}-${i}`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorderLines) return;

    const oldIndex = cartLines.findIndex(
      (line, i) => getLineId(line, i) === active.id,
    );
    const newIndex = cartLines.findIndex(
      (line, i) => getLineId(line, i) === over.id,
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderLines(oldIndex, newIndex);
    }
  };

  const itemIds = cartLines.map(getLineId);

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8E3] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EDE8E3] bg-[#FCFAF8]">
        <p className="text-[11px] font-bold text-[#1A1614] uppercase tracking-wider">
          Layanan Terpilih
        </p>
      </div>
      <div className="px-4 py-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {cartLines.map((line, i) => {
              const id = getLineId(line, i);

              if (line.kind === "service") {
                return (
                  <CartRow
                    key={id}
                    id={id}
                    v={line.variant}
                    qty={line.qty}
                    isFree={line.isFree}
                    membershipQty={line.membershipQty}
                    onRemove={() => onRemoveLine(i)}
                    onUpdateQty={(q) => onUpdateServiceQty(i, q)}
                  />
                );
              }
              return (
                <BundleCartRow
                  key={id}
                  id={id}
                  bundle={line.bundle}
                  pricing={line.pricing}
                  onRemove={() => onRemoveLine(i)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
