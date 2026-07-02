"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";

export type StatusFilterOption = {
  id: string;
  label: string;
  color: string;
};

type Props = {
  statuses: StatusFilterOption[];
  defaultChecked?: string[];
  onChange?: (checkedIds: string[]) => void;
  onMoreClick?: () => void;
  className?: string;
};

export default function StatusFilterDropdown({
  statuses,
  defaultChecked,
  onChange,
  onMoreClick,
  className = "",
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(defaultChecked ?? statuses.map((s) => s.id)),
  );
  const [open, setOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const activeCount = checked.size;
  const allChecked = activeCount === statuses.length;

  const previewColors = useMemo(
    () =>
      statuses
        .filter((s) => checked.has(s.id))
        .map((s) => s.color)
        .filter((color, idx, arr) => arr.indexOf(color) === idx)
        .slice(0, 3),
    [checked, statuses],
  );

  function emitChange(nextSet: Set<string>) {
    onChange?.(Array.from(nextSet));
  }

  function toggleStatus(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      emitChange(next);
      return next;
    });
  }

  function toggleAll() {
    setChecked((prev) => {
      const next =
        prev.size === statuses.length
          ? new Set<string>()
          : new Set(statuses.map((s) => s.id));
      emitChange(next);
      return next;
    });
  }

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex items-center gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-surface-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center -space-x-1">
          {previewColors.length > 0 ? (
            previewColors.map((color, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ring-2 ring-surface ${color}`}
              />
            ))
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-muted ring-2 ring-surface" />
          )}
        </span>
        <span className="font-medium">Status</span>
        <span className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {activeCount}/{statuses.length}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* <button
        type="button"
        onClick={onMoreClick}
        aria-label="More actions"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-secondary/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button> */}

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {statuses.map((status) => {
            const isChecked = checked.has(status.id);
            const isHovered = hoveredRow === status.id;

            return (
              <div
                key={status.id}
                role="option"
                aria-selected={isChecked}
                onMouseEnter={() => setHoveredRow(status.id)}
                onMouseLeave={() =>
                  setHoveredRow((v) => (v === status.id ? null : v))
                }
                onClick={() => toggleStatus(status.id)}
                className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-colors ${
                  isHovered ? "bg-surface-secondary/70" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox checked={isChecked} />
                  <span className={`h-2 w-2 rounded-full ${status.color}`} />
                  <span className="text-foreground">{status.label}</span>
                </div>

                {isHovered && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAll();
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {allChecked ? "Uncheck all" : "Check all"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
        checked ? "border-accent bg-accent" : "border-border bg-transparent"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
    </span>
  );
}
