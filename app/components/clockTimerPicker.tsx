"use client";

import { Description, TimeField } from "@heroui/react";
import type { TimeValue } from "@heroui/react";
import { parseTime } from "@internationalized/date";

interface ClockTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minTime?: string | null;
  maxTime?: string | null;
  disabled?: boolean;
}

function safeParseTime(t: string | null | undefined) {
  if (!t) return undefined;
  try {
    return parseTime(t);
  } catch {
    return undefined;
  }
}

export function ClockTimePicker({
  value,
  onChange,
  minTime = null,
  maxTime = null,
  disabled = false,
}: ClockTimePickerProps) {
  const timeValue = safeParseTime(value) ?? null;
  const minValue = safeParseTime(minTime ?? undefined);
  const maxValue = safeParseTime(maxTime ?? undefined);

  const handleChange = (t: TimeValue | null) => {
    if (!t) return;
    onChange(
      `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`,
    );
  };

  return (
    <TimeField
      hourCycle={24}
      granularity="minute"
      value={timeValue}
      onChange={handleChange}
      minValue={minValue}
      maxValue={maxValue}
      isDisabled={disabled}
      aria-label="Waktu"
      className="w-full"
    >
      <TimeField.Group fullWidth>
        <TimeField.Input>
          {(segment) => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
      {(minTime || maxTime) && (
        <Description className="text-[11px] text-amber-700">
          Jam tersedia: {minTime ?? "00:00"} – {maxTime ?? "23:59"}
        </Description>
      )}
    </TimeField>
  );
}
