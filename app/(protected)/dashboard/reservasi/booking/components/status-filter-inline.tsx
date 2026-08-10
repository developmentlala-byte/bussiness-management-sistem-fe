"use client";

import { Check } from "lucide-react";

export type StatusFilterOption = {
  id: string;
  label: string;
  color: string; // tailwind bg-* class, e.g. "bg-amber-400"
};

type Props = {
  statuses: StatusFilterOption[];
  checkedIds: string[];
  onChange: (checkedIds: string[]) => void;
  className?: string;
};

/**
 * Status filter as a row of tappable chips instead of a checkbox-list
 * dropdown. Meant to live directly inside an already-open panel (e.g. the
 * consolidated "Filters" popover) — there is no second popover to open,
 * every option is one tap away.
 */
export default function StatusFilterInline({
  statuses,
  checkedIds,
  onChange,
  className = "",
}: Props) {
  const checked = new Set(checkedIds);
  const allChecked = checked.size === statuses.length;

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const toggleAll = () => {
    onChange(allChecked ? [] : statuses.map((s) => s.id));
  };

  const chipClass = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
      isActive
        ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
        : "border-border text-muted-foreground hover:bg-surface-secondary/60"
    }`;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={toggleAll}
        className={chipClass(allChecked)}
      >
        Semua
      </button>
      {statuses.map((status) => {
        const isChecked = checked.has(status.id);
        return (
          <button
            key={status.id}
            type="button"
            onClick={() => toggle(status.id)}
            aria-pressed={isChecked}
            className={chipClass(isChecked)}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
            {status.label}
            {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
