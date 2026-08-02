"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Star } from "@phosphor-icons/react";

type Props = {
  selectedRating: number | null;
  onChange: (rating: number | null) => void;
  className?: string;
};

export default function RatingFilterDropdown({
  selectedRating,
  onChange,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ratings = [5, 4, 3, 2, 1];

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex items-center ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all
          ${selectedRating 
            ? "bg-amber-400/10 text-amber-600 border border-amber-400/20" 
            : "bg-surface border border-border text-foreground/70 hover:bg-default-50"}
        `}
      >
        <Star weight={selectedRating ? "fill" : "bold"} className={selectedRating ? "text-amber-500" : "text-muted-foreground/50"} />
        <span className="uppercase tracking-wider">
          {selectedRating ? `${selectedRating}.0` : "Semua Rating"}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-surface/90 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in zoom-in duration-200">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`
              flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors
              ${selectedRating === null ? "bg-accent/10 text-accent" : "text-foreground/60 hover:bg-default-100"}
            `}
          >
            <span>Tampilkan Semua</span>
            {selectedRating === null && <Check className="h-3.5 w-3.5" />}
          </button>
          
          <div className="h-px bg-border/50 my-1.5 mx-1" />
          
          {ratings.map((rating) => (
            <button
              key={rating}
              onClick={() => {
                onChange(rating);
                setOpen(false);
              }}
              className={`
                flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors
                ${selectedRating === rating ? "bg-amber-400/10 text-amber-600" : "text-foreground/70 hover:bg-default-100"}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">{rating}.0</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} weight="fill" className="h-2.5 w-2.5 text-amber-400" />
                  ))}
                </div>
              </div>
              {selectedRating === rating && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
