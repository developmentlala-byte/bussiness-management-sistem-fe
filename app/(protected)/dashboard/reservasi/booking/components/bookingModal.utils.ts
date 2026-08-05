    import {
  isBundlePromoLine,
  getBookingLineDuration,
  type SpaBooking,
  type AvailableSlot,
  type BookingStaffAssignment,
  type BookingResourceAssignment,
  type BookingTherapist,
} from "@/app/types/booking";
import type {
  Variant,
  CartLine,
  ExistingTherapist,
  LocalStaffAssignment,
} from "./booking.types";
import {
  calcBundlePricing,
} from "@/app/libs/bundle-pricing";

export const idr = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

export const durFmt = (m: number): string => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
};

export const parseTimeToMinutes = (time: string): number => {
  if (!time) return -1;
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return Number.isFinite(hour) && Number.isFinite(minute)
    ? hour * 60 + minute
    : -1;
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  const total = parseTimeToMinutes(time);
  if (total < 0) return time;
  const nextTotal = total + minutes;
  const nextH = Math.floor(nextTotal / 60) % 24;
  const nextM = nextTotal % 60;
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
};

export const isTimeRangeOverlap = (
  startA: string,
  durationA: number,
  startB: string,
  durationB: number,
): boolean => {
  const a0 = parseTimeToMinutes(startA);
  const b0 = parseTimeToMinutes(startB);
  if (a0 < 0 || b0 < 0 || durationA <= 0 || durationB <= 0) return false;
  const a1 = a0 + durationA;
  const b1 = b0 + durationB;
  return a0 < b1 && b0 < a1;
};

export function eligibleTherapistIdsForVariant(
  slot: AvailableSlot,
  variantId: number,
): number[] {
  const byVariant = slot.available_therapists_by_variant?.[variantId];
  if (Array.isArray(byVariant)) return byVariant;
  return Array.isArray(slot.available_therapists)
    ? slot.available_therapists.map((t) => t.id)
    : [];
}

export const toFormDateTime = (isoString: string): { date: string; time: string } => {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(
    isoString ?? "",
  );
  if (!match) return { date: "", time: "" };

  const [, datePart, hh, mm] = match;
  const timePart = hh && mm ? `${hh}:${mm}` : "";
  return {
    date: datePart ?? "",
    time: timePart,
  };
};

export const isBonusSlotOverlappingPaidBooking = (
  paidDate: string,
  paidStartTime: string,
  paidDuration: number,
  bonusDate: string,
  bonusSlotTime: string,
  bonusDuration: number,
): boolean => {
  if (
    !paidDate ||
    !paidStartTime ||
    !bonusDate ||
    !bonusSlotTime ||
    paidDuration <= 0 ||
    bonusDuration <= 0 ||
    paidDate !== bonusDate
  ) {
    return false;
  }

  const p0 = parseTimeToMinutes(paidStartTime);
  const p1 = p0 + paidDuration;
  const b0 = parseTimeToMinutes(bonusSlotTime);

  if (p0 < 0 || b0 < 0) return false;
  return b0 < p1;
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export function buildVariantUnitKeysFromBooking(
  booking: SpaBooking,
  isParallel: boolean = false,
): Array<{
  key: string;
  variantId: number;
  unitIndex: number;
  groupId: string;
}> {
  const units: Array<{
    key: string;
    variantId: number;
    unitIndex: number;
    groupId: string;
  }> = [];

  (booking.service_variants ?? []).forEach((line, lineIdx) => {
    const groupId = line.group_id ?? `group_${lineIdx + 1}`;

    if (isBundlePromoLine(line)) {
      const bundleQty = Math.max(1, Number(line.quantity ?? 1));
      line.items.forEach((item) => {
        const variantId = Number(item.id);
        const itemQty = Math.max(1, Number(item.quantity ?? 1));
        const totalQty = itemQty * bundleQty;
        for (let i = 0; i < totalQty; i++) {
          units.push({
            key: `${groupId}:${variantId}:${i + 1}`,
            variantId,
            unitIndex: i + 1,
            groupId,
          });
        }
      });
      return;
    }

    const variantId = Number(line.id);
    const qty = Math.max(1, Number(line.quantity ?? line.pivot?.quantity ?? 1));
    for (let i = 0; i < qty; i++) {
      units.push({
        key: `${groupId}:${variantId}:${i + 1}`,
        variantId,
        unitIndex: i + 1,
        groupId,
      });
    }
  });

  return units;
}

export function buildInitialLocalStaffAssignments(
  booking: SpaBooking,
): LocalStaffAssignment[] {
  const units = buildVariantUnitKeysFromBooking(booking, !!booking.is_parallel);

  const rawStaff =
    booking.staff_assignments ?? (booking as any).booking_therapists ?? [];

  const existingAssignments = rawStaff.map((s: any) => ({
    staff_id: s.staff_id ?? s.bms_ms_staff_id,
    service_variant_id: s.service_variant_id ?? s.bms_ms_service_variant_id,
    client_key: s.client_key,
    start_time: s.start_time,
    end_time: s.end_time,
  }));

  const assignmentMap = new Map<string, LocalStaffAssignment>();
  existingAssignments.forEach((a: any) => {
    if (a.client_key) {
      assignmentMap.set(a.client_key, a);
    }
  });

  const variantQueues = new Map<number, any[]>();
  existingAssignments.forEach((a: any) => {
    const q = variantQueues.get(a.service_variant_id) ?? [];
    q.push(a);
    variantQueues.set(a.service_variant_id, q);
  });

  return units.map((unit) => {
    let existing = assignmentMap.get(unit.key);

    if (!existing) {
      const q = variantQueues.get(unit.variantId);
      if (q && q.length > 0) {
        existing = q.shift();
      }
    }

    return {
      client_key: unit.key,
      service_variant_id: unit.variantId,
      staff_id: existing?.staff_id ?? 0,
      start_time: existing?.start_time ?? null,
      end_time: existing?.end_time ?? null,
    };
  });
}

export function buildInitialCartLines(
  booking: SpaBooking,
  availableVariants: Variant[],
): CartLine[] {
  return (booking.service_variants ?? []).map((line) => {
    if (isBundlePromoLine(line)) {
      return {
        kind: "bundle" as const,
        bundle: {
          id: Number(line.bundle_promo_id),
          name: line.name,
          slug: line.slug,
          description: null,
          image_path: null,
          bundle_type: line.bundle_type,
          discount_value: line.discount_value,
          start_date: "",
          end_date: "",
          is_active: true,
          max_quantity: null,
          used_count: 0,
          bundle_items: line.items.map((item) => ({
            id: item.id,
            bms_ms_bundle_promo_id: line.bundle_promo_id,
            bms_ms_service_variant_id: item.id,
            quantity: item.quantity,
            duration_minutes: item.duration_minutes,
            price: item.retail_price,
            sort_order: 0,
            service_variant: {
              id: item.id,
              name: item.name,
              duration_minutes: item.duration_minutes,
              retail_price: item.retail_price,
            },
          })),
        },
        pricing: {
          subtotal: line.subtotal,
          discountAmount: line.discount_amount,
          finalPrice: line.retail_price,
          totalDuration: getBookingLineDuration(line),
          itemCount: line.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    }

    const variantFromApi = availableVariants.find((v) => v.id === line.id);
    return {
      kind: "service" as const,
      isFree: !!line.is_free,
      qty: Math.max(1, Number(line.quantity ?? line.pivot?.quantity ?? 1)),
      variant: {
        id: line.id,
        catKey:
          variantFromApi?.catKey ??
          line.slug?.toLowerCase().replace(/\s+/g, "_") ??
          "other",
        subCat: variantFromApi?.subCat ?? "Selected Service",
        name: line.name,
        duration: line.duration_minutes ?? 0,
        price: Number(line.is_free ? 0 : (line.retail_price ?? 0)),
        categoryId: variantFromApi?.categoryId ?? 0,
      },
    };
  });
}

export function buildExistingTherapists(booking: SpaBooking): ExistingTherapist[] {
  return (booking.therapists ?? [])
    .filter((t): t is BookingTherapist => typeof t !== "string")
    .map((t) => ({
      id: t.staff_id,
      name: t.name,
      service_variant_id: t.service_variant_id,
    }));
}

export function buildInitialLocalResourceAssignments(
  booking: SpaBooking,
): BookingResourceAssignment[] {
  const units = buildVariantUnitKeysFromBooking(booking, !!booking.is_parallel);

  const rawResources =
    booking.resource_assignments ?? (booking as any).booking_resources ?? [];

  const existingAssignments = rawResources.map((r: any) => ({
    resource_id: r.resource_id ?? r.bms_ms_resource_id,
    service_variant_id: r.service_variant_id ?? r.bms_ms_service_variant_id,
    client_key: r.client_key,
    start_time: r.start_time,
    end_time: r.end_time,
  }));

  const assignmentMap = new Map<string, BookingResourceAssignment>();
  existingAssignments.forEach((a: any) => {
    if (a.client_key) {
      assignmentMap.set(a.client_key, a);
    }
  });

  const variantQueues = new Map<number, any[]>();
  existingAssignments.forEach((a: any) => {
    const q = variantQueues.get(a.service_variant_id) ?? [];
    q.push(a);
    variantQueues.set(a.service_variant_id, q);
  });

  return units.map((unit) => {
    let existing = assignmentMap.get(unit.key);

    if (!existing) {
      const q = variantQueues.get(unit.variantId);
      if (q && q.length > 0) {
        existing = q.shift();
      }
    }

    return {
      client_key: unit.key,
      service_variant_id: unit.variantId,
      resource_id: existing?.resource_id ?? 0,
      start_time: existing?.start_time ?? null,
      end_time: existing?.end_time ?? null,
    };
  });
}
