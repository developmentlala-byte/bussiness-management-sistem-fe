import { Clock } from "@phosphor-icons/react";
import { RangeCalendar, Label } from "@heroui/react";
import { today, getLocalTimeZone } from "@internationalized/date";
import {
  formatDateTimePreview,
  type DateRangeValue,
} from "../types";

interface BundlePeriodPickerProps {
  dateRange: DateRangeValue;
  onDateRangeChange: (range: DateRangeValue) => void;
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  allowPastDates?: boolean;
}

export function BundlePeriodPicker({
  dateRange,
  onDateRangeChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  allowPastDates = false,
}: BundlePeriodPickerProps) {
  const now = today(getLocalTimeZone());

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm text-foreground block">Periode Berlaku</Label>
        <p className="text-xs text-muted mt-0.5">
          Pilih tanggal mulai & berakhir, lalu atur jam aktif bundle.
        </p>
      </div>

      <RangeCalendar
        aria-label="Bundle period"
        value={dateRange}
        onChange={(range) => {
          if (range) {
            onDateRangeChange(range);
          }
        }}
        {...(!allowPastDates ? { minValue: now } : {})}
        className="w-full max-w-[360px] rounded-xl border border-border bg-surface p-3 shadow-sm mx-auto"
      >
        <RangeCalendar.Header className="flex items-center justify-between pb-4">
          <RangeCalendar.NavButton
            slot="previous"
            className="p-1.5 rounded-md hover:bg-surface-secondary text-muted hover:text-foreground transition-colors"
          />
          <RangeCalendar.Heading className="text-sm font-bold text-foreground" />
          <RangeCalendar.NavButton
            slot="next"
            className="p-1.5 rounded-md hover:bg-surface-secondary text-muted hover:text-foreground transition-colors"
          />
        </RangeCalendar.Header>

        <RangeCalendar.Grid className="w-full border-collapse">
          <RangeCalendar.GridHeader>
            {(day) => (
              <RangeCalendar.HeaderCell className="text-[11px] uppercase tracking-wider font-semibold text-muted text-center pb-3">
                {day}
              </RangeCalendar.HeaderCell>
            )}
          </RangeCalendar.GridHeader>

          <RangeCalendar.GridBody>
            {(date) => (
              <RangeCalendar.Cell
                date={date}
                className="text-center text-sm p-0 m-0 relative focus:outline-none cursor-pointer"
              >
                {({ formattedDate, isSelected, isSelectionStart, isSelectionEnd }) => (
                  <div
                    className={`h-9 w-full flex items-center justify-center rounded-md transition-colors ${
                      isSelectionStart || isSelectionEnd
                        ? "bg-accent text-accent-foreground font-semibold"
                        : isSelected
                          ? "bg-accent/20 text-foreground"
                          : "hover:bg-surface-secondary text-foreground"
                    }`}
                  >
                    {formattedDate}
                  </div>
                )}
              </RangeCalendar.Cell>
            )}
          </RangeCalendar.GridBody>
        </RangeCalendar.Grid>
      </RangeCalendar>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Jam Mulai Aktif
          </Label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <Label className="text-xs text-muted mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Jam Berakhir
          </Label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {dateRange?.start && dateRange?.end && (
        <div className="px-4 py-3 bg-surface-secondary/50 rounded-lg border border-border text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
            Preview Periode
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatDateTimePreview(dateRange.start.toString(), startTime)}
          </p>
          <p className="text-xs text-muted my-0.5">sampai</p>
          <p className="text-sm font-medium text-foreground">
            {formatDateTimePreview(dateRange.end.toString(), endTime)}
          </p>
        </div>
      )}
    </div>
  );
}
