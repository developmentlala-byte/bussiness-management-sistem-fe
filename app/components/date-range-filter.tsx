"use client";

import { useState, useRef, useEffect } from "react";
import { RangeCalendar } from "@heroui/react";
import { CalendarBlank } from "@phosphor-icons/react";
import { parseDate, type DateValue } from "@internationalized/date";

export interface DateRangeValue {
  startDate: string; // format YYYY-MM-DD
  endDate: string; // format YYYY-MM-DD
}

interface DateRangeFilterProps {
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
}

function toCalendarValue(value: DateRangeValue | null) {
  if (!value?.startDate || !value?.endDate) return null;
  return {
    start: parseDate(value.startDate),
    end: parseDate(value.endDate),
  };
}

function fromCalendarValue(range: {
  start: DateValue;
  end: DateValue;
}): DateRangeValue {
  return {
    startDate: range.start.toString(),
    endDate: range.end.toString(),
  };
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue | null>(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const label = value
    ? `${value.startDate} — ${value.endDate}`
    : "Semua Tanggal";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-4)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-sm)",
          fontWeight: value ? 600 : 400,
          backgroundColor: value ? "var(--accent)" : "var(--default)",
          color: value ? "var(--accent-foreground)" : "var(--foreground)",
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <CalendarBlank size={14} weight="regular" />
        {label}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 55550,
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-3)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <RangeCalendar
            aria-label="Filter tanggal"
            firstDayOfWeek="mon"
            value={toCalendarValue(draft)}
            onChange={(range) => setDraft(fromCalendarValue(range))}
          >
            <RangeCalendar.Header>
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => (
                  <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                )}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {(date) => <RangeCalendar.Cell date={date} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "var(--space-3)",
              gap: "var(--space-2)",
            }}
          >
            <button
              onClick={() => {
                setDraft(null);
                onChange(null);
                setOpen(false);
              }}
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
            <button
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              disabled={!draft}
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
                border: "none",
                cursor: draft ? "pointer" : "not-allowed",
                opacity: draft ? 1 : 0.5,
              }}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
