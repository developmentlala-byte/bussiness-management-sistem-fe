"use client";

import { SpaBooking, BookingRating } from "@/app/types/booking";
import { Button, cn } from "@heroui/react";
import { Star, X, NotePencil } from "@phosphor-icons/react";
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

  const { mutate: saveRating } = usePost<
    { data: BookingRating },
    Partial<BookingRating> & { notes?: string }
  >((payload) => `/master/bookings/${booking?.id}/rating`, {
    onSuccess: (response) => {
      queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((b: SpaBooking) =>
            b.id === booking?.id ? { ...b, rating: response.data } : b,
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
  }, [booking]);

  const overallScore = useMemo(() => {
    const values = RATING_METRICS.map(
      (m) => (localRating[m.key as keyof BookingRating] as number) || 0,
    );
    const filled = values.filter((v) => v > 0).length;
    if (filled === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / 5;
  }, [localRating]);

  const persist = (rating: Partial<BookingRating>, notesValue: string) => {
    saveRating({
      care_concern: rating.care_concern || 0,
      comfort: rating.comfort || 0,
      friendliness_communication: rating.friendliness_communication || 0,
      cleanliness_neatness: rating.cleanliness_neatness || 0,
      treatment_suitability: rating.treatment_suitability || 0,
      notes: notesValue,
    });
  };

  const handleRate = (key: keyof BookingRating, value: number) => {
    const newRating = { ...localRating, [key]: value };
    setLocalRating(newRating);

    const filledValues = Object.values(newRating).filter(
      (v) => typeof v === "number",
    ) as number[];
    const calculatedOverall = Number(
      (filledValues.reduce((a, b) => a + b, 0) / 5).toFixed(1),
    );

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
                  ...newRating,
                  overall_score: calculatedOverall,
                },
              }
            : b,
        ),
      };
    });

    persist(newRating, notes);
  };

  const handleNotesBlur = () => persist(localRating, notes);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Drag handle */}
      <div className="flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="h-1 w-9 rounded-full bg-gray-200" />
      </div>

      {/* HEADER */}
      <div className="px-5 pt-2 pb-4 flex items-center justify-between shrink-0 border-b border-gray-100">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="text-[15px] font-semibold text-gray-900">
            Beri Penilaian
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-mono font-medium text-gray-700 truncate">
              {booking?.booking_code}
            </span>
            <span className="text-gray-300">·</span>
            <span className="truncate">{booking?.customer_name}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="shrink-0 size-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X weight="bold" className="size-4" />
        </button>
      </div>

      {/* SCORE STRIP */}
      <div className="px-5 py-3.5 flex items-center justify-between shrink-0 bg-gray-50/60 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
            {overallScore.toFixed(1)}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  weight={star <= Math.round(overallScore) ? "fill" : "regular"}
                  className={cn(
                    "size-3",
                    star <= Math.round(overallScore)
                      ? "text-amber-400"
                      : "text-gray-200",
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Skor Keseluruhan
            </span>
          </div>
        </div>
      </div>

      {/* METRICS LIST */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {RATING_METRICS.map((metric) => {
            const currentValue =
              (localRating[metric.key as keyof BookingRating] as number) || 0;
            const activeHover =
              hoveredMetric?.key === metric.key ? hoveredMetric.value : 0;
            const displayValue = activeHover || currentValue;

            return (
              <div
                key={metric.key}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <span className="text-[13px] font-medium text-gray-700">
                  {metric.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {currentValue > 0 && (
                    <span className="text-[11px] font-semibold text-amber-500 tabular-nums w-6 text-right">
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
                          handleRate(metric.key as keyof BookingRating, star)
                        }
                        aria-label={`${metric.label}: ${star} bintang`}
                        className="size-6 flex items-center justify-center"
                      >
                        <Star
                          weight={star <= displayValue ? "fill" : "regular"}
                          className={cn(
                            "size-4 transition-colors",
                            star <= displayValue
                              ? "text-amber-400"
                              : "text-gray-200",
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
        <div className="px-5 pt-4 pb-5 space-y-2">
          <div className="flex items-center gap-1.5">
            <NotePencil weight="bold" className="size-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Catatan Tambahan
            </span>
          </div>
          <textarea
            placeholder="Tulis masukan khusus dari pelanggan di sini..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all resize-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-gray-500 font-medium">
            Tersimpan otomatis
          </span>
        </div>
        <Button
          variant="solid"
          color="primary"
          onClick={onClose}
          size="sm"
          className="rounded-lg font-semibold px-5"
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}
