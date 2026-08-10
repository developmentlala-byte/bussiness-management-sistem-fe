"use client";

import { Star } from "@phosphor-icons/react";

type Props = {
  selectedRating: number | null;
  onChange: (rating: number | null) => void;
  className?: string;
};

/**
 * Rating filter as a single row of star chips instead of a dropdown list.
 * Only 6 possible states (Semua + 1-5), so a dropdown was overkill —
 * this puts every option one tap away, same logic as StatusFilterInline.
 */
export default function RatingFilterInline({
  selectedRating,
  onChange,
  className = "",
}: Props) {
  const ratings = [5, 4, 3, 2, 1];

  const chipClass = (isSelected: boolean, tone: "neutral" | "amber") => {
    if (!isSelected) {
      return "border-border text-muted-foreground hover:bg-surface-secondary/60";
    }
    return tone === "amber"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-700"
      : "border-foreground/20 bg-foreground/[0.06] text-foreground";
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${chipClass(
          selectedRating === null,
          "neutral",
        )}`}
      >
        Semua
      </button>
      {ratings.map((rating) => {
        const isSelected = selectedRating === rating;
        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            aria-pressed={isSelected}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${chipClass(
              isSelected,
              "amber",
            )}`}
          >
            {rating}
            <Star
              weight={isSelected ? "fill" : "regular"}
              className={`h-3 w-3 ${isSelected ? "text-amber-500" : "text-muted-foreground/50"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
