"use client";

import { SpaBooking, BookingRating, BookingTip } from "@/app/types/booking";
import { Button, cn, ToggleButton, Separator } from "@heroui/react";
import { Star, X, NotePencil, HandCoins } from "@phosphor-icons/react";
import { useEffect, useState, useMemo } from "react";
import { usePost } from "@/app/libs/use-http";
import { useQueryClient } from "@tanstack/react-query";

interface RatingDrawerProps {
  booking: SpaBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

const RATING_METRICS = [
  { key: "care_concern", label: "Perhatian & Kepedulian" },
  { key: "comfort", label: "Kenyamanan" },
  { key: "friendliness_communication", label: "Keramahan & Komunikasi" },
  { key: "cleanliness_neatness", label: "Kebersihan & Kerapian" },
  { key: "treatment_suitability", label: "Kesesuaian Treatment" },
] as const;

export default function RatingDrawer({
  booking,
  isOpen,
  onClose,
}: RatingDrawerProps) {
  const queryClient = useQueryClient();
  const [localRating, setLocalRating] = useState<Partial<BookingRating>>({});
  const [notes, setNotes] = useState("");
  const [hoveredMetric, setHoveredMetric] = useState<{
    key: string;
    value: number;
  } | null>(null);

  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(
    [],
  );
  // FIX: masing-masing therapist punya nominal tips sendiri, bukan 1 nilai dibagi rata
  const [tipAmounts, setTipAmounts] = useState<Record<string, string>>({});

  // Get real therapists from booking
  const therapists = useMemo(() => {
    if (!booking?.therapists) return [];
    return (booking.therapists as any[])
      .map((t) => {
        if (!t) return null;
        if (typeof t === "string") return { id: t, name: t };

        // Handle different possible structures of therapist data
        const staffId = t.bms_ms_staff_id || t.staff_id || t.id;
        const staffName = t.staff
          ? `${t.staff.first_name} ${t.staff.last_name || ""}`.trim()
          : t.name || t.first_name || "Unknown";

        return {
          id: staffId?.toString() || Math.random().toString(),
          name: staffName,
        };
      })
      .filter((t): t is { id: string; name: string } => !!t)
      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
  }, [booking]);

  const { mutate: saveRating } = usePost<
    { data: BookingRating },
    Partial<BookingRating> & {
      notes?: string;
    }
  >((payload) => `/master/bookings/${booking?.id}/rating`, {
    onSuccess: (response) => {
      queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((b: SpaBooking) =>
            b.id === booking?.id
              ? {
                  ...b,
                  rating: response.data,
                }
              : b,
          ),
        };
      });
    },
  });

  const { mutate: saveTips } = usePost<
    { data: { tips: BookingTip[] } },
    { tips: { staff_id: number; amount: number }[] }
  >((payload) => `/master/bookings/${booking?.id}/tips`, {
    onSuccess: (response) => {
      queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((b: SpaBooking) =>
            b.id === booking?.id
              ? {
                  ...b,
                  tips: response.data.tips || [],
                }
              : b,
          ),
        };
      });
    },
  });

  useEffect(() => {
    if (booking?.rating) {
      setLocalRating(booking.rating);
      setNotes(booking.rating.notes ?? "");
    } else {
      setLocalRating({});
      setNotes("");
    }

    if (booking?.tips && booking.tips.length > 0) {
      const ids = booking.tips.map((t) => t.staff_id.toString());
      const amounts: Record<string, string> = {};
      booking.tips.forEach((t) => {
        amounts[t.staff_id.toString()] = t.amount.toString();
      });
      setSelectedTherapistIds(ids);
      setTipAmounts(amounts);
    } else {
      setSelectedTherapistIds([]);
      setTipAmounts({});
    }
  }, [booking]);

  const overallScore = useMemo(() => {
    const values = RATING_METRICS.map(
      (m) => (localRating[m.key as keyof BookingRating] as number) || 0,
    );
    const filled = values.filter((v) => v > 0).length;
    if (filled === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / 5;
  }, [localRating]);

  const persistRating = (
    rating: Partial<BookingRating>,
    notesValue: string,
  ) => {
    const filledValues = Object.values(rating).filter(
      (v) => typeof v === "number",
    ) as number[];
    const calculatedOverall =
      filledValues.length > 0
        ? Number((filledValues.reduce((a, b) => a + b, 0) / 5).toFixed(1))
        : 0;

    // Optimistic cache update for rating
    queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((b: SpaBooking) =>
          b.id === booking?.id
            ? {
                ...b,
                rating: {
                  ...b.rating,
                  ...rating,
                  overall_score: calculatedOverall,
                },
              }
            : b,
        ),
      };
    });

    saveRating({
      care_concern: rating.care_concern || 0,
      comfort: rating.comfort || 0,
      friendliness_communication: rating.friendliness_communication || 0,
      cleanliness_neatness: rating.cleanliness_neatness || 0,
      treatment_suitability: rating.treatment_suitability || 0,
      notes: notesValue,
    });
  };

  const persistTips = (customTipAmounts?: Record<string, string>) => {
    const currentTips = customTipAmounts || tipAmounts;
    const tips = Object.entries(currentTips)
      // FIX: amount 0 tetap valid (backend terima min:0) — jangan di-filter out,
      // cukup pastikan bukan string kosong / NaN
      .filter(([_, amount]) => amount !== "" && !isNaN(parseFloat(amount)))
      .map(([staffId, amount]) => ({
        staff_id: parseInt(staffId),
        amount: parseFloat(amount),
      }));

    queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((b: SpaBooking) =>
          b.id === booking?.id
            ? {
                ...b,
                tips: tips.map((t, idx) => ({
                  id: -(idx + 1),
                  booking_id: b.id,
                  staff_id: t.staff_id,
                  amount: t.amount ?? 0,
                })),
              }
            : b,
        ),
      };
    });

    saveTips({ tips });
  };

  const handleRate = (key: keyof BookingRating, value: number) => {
    const newRating = { ...localRating, [key]: value };
    setLocalRating(newRating);

    persistRating(newRating, notes);
  };

  const handleNotesBlur = () => persistRating(localRating, notes);

  const toggleTherapist = (id: string, isSelected: boolean) => {
    setSelectedTherapistIds((prev) => {
      const nextIds = isSelected
        ? [...prev, id]
        : prev.filter((tid) => tid !== id);
      return nextIds;
    });

    let nextTips = { ...tipAmounts };
    if (!isSelected) {
      delete nextTips[id];
    } else {
      // FIX: seed nominal 0 waktu therapist baru dipilih, biar staff_id-nya ikut kekirim
      nextTips[id] = nextTips[id] ?? "0";
    }
    setTipAmounts(nextTips);

    persistTips(nextTips);
  };

  const handleTipAmountChange = (therapistId: string, value: string) => {
    setTipAmounts((prev) => ({ ...prev, [therapistId]: value }));
  };

  const handleTipAmountBlur = (therapistId: string) => {
    persistTips();
  };

  const selectedTherapists = therapists.filter((t) =>
    selectedTherapistIds.includes(t.id),
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Drag handle */}
      <div className="flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="h-1 w-9 rounded-full bg-border" />
      </div>

      {/* HEADER */}
      <div className="px-4 sm:px-5 pt-2 pb-3 sm:pb-4 flex items-center justify-between shrink-0 border-b border-border">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="text-sm sm:text-[15px] font-semibold text-foreground">
            Beri Penilaian
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted">
            <span className="font-mono font-medium text-foreground truncate">
              {booking?.booking_code}
            </span>
            <span className="text-border">·</span>
            <span className="truncate">{booking?.customer_name}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="shrink-0 size-8 flex items-center justify-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
        >
          <X weight="bold" className="size-4" />
        </button>
      </div>

      {/* BODY: dua panel sebelahan (stack di layar sempit) */}
      {/* BODY: dua panel sebelahan (stack di layar sempit) */}
      <div className="flex flex-col md:flex-row flex-1 md:min-h-0 overflow-y-auto md:overflow-hidden">
        {/* PANEL KIRI — rating */}
        <div className="flex flex-col md:flex-1 md:min-h-0">
          {/* SCORE STRIP */}
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between shrink-0 bg-surface-secondary border-b border-border">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none">
                {overallScore.toFixed(1)}
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      weight={
                        star <= Math.round(overallScore) ? "fill" : "regular"
                      }
                      className={cn(
                        "size-3",
                        star <= Math.round(overallScore)
                          ? "text-warning"
                          : "text-border",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  Skor Keseluruhan
                </span>
              </div>
            </div>
          </div>

          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="divide-y divide-border">
              {RATING_METRICS.map((metric) => {
                const currentValue =
                  (localRating[metric.key as keyof BookingRating] as number) ||
                  0;
                const activeHover =
                  hoveredMetric?.key === metric.key ? hoveredMetric.value : 0;
                const displayValue = activeHover || currentValue;

                return (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface-secondary/60 transition-colors"
                  >
                    <span className="text-xs sm:text-[13px] font-medium text-foreground">
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {currentValue > 0 && (
                        <span className="text-[11px] font-semibold text-warning tabular-nums w-6 text-right">
                          {currentValue}.0
                        </span>
                      )}
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() =>
                              setHoveredMetric({ key: metric.key, value: star })
                            }
                            onMouseLeave={() => setHoveredMetric(null)}
                            onClick={() =>
                              handleRate(
                                metric.key as keyof BookingRating,
                                star,
                              )
                            }
                            aria-label={`${metric.label}: ${star} bintang`}
                            className="size-6 flex items-center justify-center"
                          >
                            <Star
                              weight={star <= displayValue ? "fill" : "regular"}
                              className={cn(
                                "size-3.5 sm:size-4 transition-colors",
                                star <= displayValue
                                  ? "text-warning"
                                  : "text-border",
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NOTES */}
            <div className="px-4 sm:px-5 pt-4 pb-5 space-y-2">
              <div className="flex items-center gap-1.5">
                <NotePencil weight="bold" className="size-3.5 text-muted" />
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                  Catatan Tambahan
                </span>
              </div>
              <textarea
                placeholder="Tulis masukan khusus dari pelanggan di sini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
                className="w-full bg-surface-secondary border border-border focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 rounded-lg px-3 sm:px-3.5 py-2.5 text-sm text-foreground outline-none transition-all resize-none placeholder:text-muted"
              />
            </div>
          </div>
        </div>

        {/* PANEL KANAN — tips */}
        <div className="w-full md:w-69 shrink-0 border-t md:border-t-0 md:border-l border-border flex flex-col md:min-h-0 md:overflow-y-auto">
          <div className="px-4 pt-4 pb-3 flex items-center gap-1.5 shrink-0">
            <HandCoins weight="bold" className="size-3.5 text-muted" />
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
              Tips untuk Therapist
            </span>
          </div>

          <div className="px-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-2">
            {therapists.map((t) => {
              const isSelected = selectedTherapistIds.includes(t.id);
              return (
                <ToggleButton
                  key={t.id}
                  isSelected={isSelected}
                  onChange={(selected) => toggleTherapist(t.id, selected)}
                  className={`w-full justify-center rounded-lg text-sm ${isSelected ? "bg-accent text-surface" : " text-foreground"}`}
                >
                  {t.name}
                </ToggleButton>
              );
            })}
          </div>
          <Separator className="my-4 w-11/12 mx-auto" />
          <div className="px-4 pb-5 space-y-3">
            <div className="w-60 sm:w-36 md:w-full h-fit mx-auto overflow-hidden rounded-xl border border-border bg-surface">
              <img
                src="/assets/qris-tips.jpeg"
                alt="QRIS Tips"
                className="h-full w-full object-contain"
              />
            </div>

            {/* FIX: input tips di-render per therapist yang dipilih, masing-masing independen */}
            {selectedTherapists.length === 0 ? (
              <p className="text-[11px] text-muted text-center py-2">
                Pilih therapist dulu untuk isi nominal tips
              </p>
            ) : (
              <div className="space-y-3">
                {selectedTherapists.map((t) => (
                  <div key={t.id} className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Tips untuk {t.name} (Rp)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={tipAmounts[t.id] ?? ""}
                      onChange={(e) =>
                        handleTipAmountChange(t.id, e.target.value)
                      }
                      onBlur={() => handleTipAmountBlur(t.id)}
                      className="w-full bg-surface-secondary border border-border focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-lg px-3 sm:px-3.5 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-success" />
          <span className="text-[11px] text-muted font-medium">
            Tersimpan otomatis
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            persistRating(localRating, notes);
            persistTips();
            onClose();
          }}
          size="sm"
          className="rounded-lg font-semibold px-5"
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}
