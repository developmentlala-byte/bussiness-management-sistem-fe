"use client";

/**
 * Redesigned toolbar for the Spa Reservations page.
 *
 * Drop-in replacement for the "TOOLBAR" <div> block in
 * app/dashboard/reservasi/booking/page.tsx.
 *
 * Design logic:
 * - Row 1 = SCOPE: what data am I looking at (date range, based-on, filters)
 * - Row 2 = SEARCH & ACTIONS: find something, act on the whole set
 * - Status / Staff / Rating dropdowns are unchanged internally — they're
 *   just consolidated behind one "Filters" trigger with a live count badge,
 *   so there's no more duplicated hidden!/sm:hidden! rendering for mobile.
 */

import { useMemo } from "react";
import {
  Toolbar,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  SearchField,
  Badge,
  Popover,
  Dropdown,
  RangeCalendar,
  cn,
} from "@heroui/react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  FunnelSimple,
  PaperPlaneRight,
} from "@phosphor-icons/react";
import type { DateValue } from "@internationalized/date";
import { formatDate } from "@/app/libs/date-format";
import StaffFilterDropdown from "./staff-filter-dropdown";
import RatingFilterInline from "./rating-filter-inline";
import StatusFilterInline from "./status-filter-inline";

type StatusOption = { id: string; label: string; color: string };

type Props = {
  timeZone: string;
  dateRange: { start: DateValue; end: DateValue };
  onDateRangeChange: (range: { start: DateValue; end: DateValue }) => void;
  onShiftPeriod: (direction: -1 | 1) => void;

  useScheduleDate: boolean;
  onUseScheduleDateChange: (value: boolean) => void;

  bookingStatusOptions: StatusOption[];
  activeStatusIds: string[];
  onActiveStatusIdsChange: (ids: string[]) => void;

  selectedStaffIds: number[];
  onSelectedStaffIdsChange: (ids: number[]) => void;

  selectedRating: number | null;
  onSelectedRatingChange: (rating: number | null) => void;

  searchInput: string;
  onSearchInputChange: (value: string) => void;

  isChartVisible: boolean;
  onToggleChart: () => void;

  onSendWhatsAppReport: () => void;
};

export default function BookingsFilterToolbar({
  timeZone,
  dateRange,
  onDateRangeChange,
  onShiftPeriod,
  useScheduleDate,
  onUseScheduleDateChange,
  bookingStatusOptions,
  activeStatusIds,
  onActiveStatusIdsChange,
  selectedStaffIds,
  onSelectedStaffIdsChange,
  selectedRating,
  onSelectedRatingChange,
  searchInput,
  onSearchInputChange,
  isChartVisible,
  onToggleChart,
  onSendWhatsAppReport,
}: Props) {
  // Total dimensi filter yang lagi non-default → angka di Badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (
      activeStatusIds.length > 0 &&
      activeStatusIds.length < bookingStatusOptions.length
    )
      count++;
    if (selectedStaffIds.length > 0) count++;
    if (selectedRating !== null) count++;
    return count;
  }, [
    activeStatusIds,
    bookingStatusOptions.length,
    selectedStaffIds,
    selectedRating,
  ]);

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3"
      style={{ borderRadius: "var(--radius-xl)" }}
    >
      {/* ROW 1 — SCOPE: rentang tanggal, sumber tanggal, filter */}
      <Toolbar
        aria-label="Filter scope"
        className="flex flex-wrap items-center gap-2"
      >
        {/* Date range navigator */}
        <div className="flex h-10 items-center overflow-visible rounded-full border border-border shadow-sm">
          <button
            onClick={() => onShiftPeriod(-1)}
            className="flex h-full w-10 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            aria-label="Periode sebelumnya"
          >
            <CaretLeft weight="bold" className="h-4 w-4" />
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <div className="flex h-full cursor-pointer items-center gap-2 px-3 text-[13px] font-bold text-foreground outline-none transition-colors hover:bg-surface-secondary/50 sm:text-sm">
                <CalendarBlank
                  weight="bold"
                  className="h-4 w-4 shrink-0 text-muted"
                />
                <span className="whitespace-nowrap">
                  {formatDate(dateRange.start.toDate(timeZone), {
                    dateStyle: "medium",
                  })}{" "}
                  –{" "}
                  {formatDate(dateRange.end.toDate(timeZone), {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom start"
              className="z-[100] w-[calc(100vw-2rem)] min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl sm:w-auto"
            >
              <RangeCalendar
                aria-label="Pilih rentang tanggal"
                value={dateRange}
                onChange={onDateRangeChange}
                className="w-full"
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
            </Dropdown.Popover>
          </Dropdown>

          <button
            onClick={() => onShiftPeriod(1)}
            className="flex h-full w-10 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            aria-label="Periode berikutnya"
          >
            <CaretRight weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Berdasarkan tanggal apa — dipisah jelas dari date-picker (border-l + label),
            dan selected/unselected dipaksa kontras tinggi lewat data-selected */}
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Berdasarkan
          </span>
          <ToggleButtonGroup
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[useScheduleDate ? "schedule" : "created"]}
            onSelectionChange={(keys) =>
              onUseScheduleDateChange(
                Array.from(keys as Set<string>)[0] === "schedule",
              )
            }
            size="sm"
            className="h-10 rounded-full bg-surface-secondary p-1"
          >
            <ToggleButton
              id="schedule"
              className="rounded-full px-3 text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:font-semibold data-[selected=true]:shadow-sm"
            >
              Tgl. Booking
            </ToggleButton>
            <ToggleButton
              id="created"
              className="rounded-full px-3 text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:font-semibold data-[selected=true]:shadow-sm"
            >
              Waktu Dibuat
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* Filters — konsolidasi Status + Terapis + Rating, satu entry point untuk semua breakpoint */}
        <div className="border-l border-border pl-3">
          <Popover>
            <Popover.Trigger>
              <Button
                variant="secondary"
                size="sm"
                className="h-10 rounded-full gap-1.5"
              >
                <FunnelSimple weight="bold" className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge color="accent" className="ml-0.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </Popover.Trigger>
            <Popover.Content>
              <Popover.Arrow />
              <Popover.Dialog className="flex w-80 flex-col p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Filter booking
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onActiveStatusIdsChange(
                          bookingStatusOptions.map((s) => s.id),
                        );
                        onSelectedStaffIdsChange([]);
                        onSelectedRatingChange(null);
                      }}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Reset semua
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4 px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Status
                    </p>
                    <StatusFilterInline
                      statuses={bookingStatusOptions}
                      checkedIds={activeStatusIds}
                      onChange={onActiveStatusIdsChange}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Terapis
                    </p>
                    <StaffFilterDropdown
                      variant="flat"
                      selectedStaffIds={selectedStaffIds}
                      onSelectStaff={onSelectedStaffIdsChange}
                      className="w-full!"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Rating
                    </p>
                    <RatingFilterInline
                      selectedRating={selectedRating}
                      onChange={onSelectedRatingChange}
                    />
                  </div>
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
      </Toolbar>

      {/* ROW 2 — SEARCH & ACTIONS */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          aria-label="Cari nama atau nomor HP customer"
          value={searchInput}
          onChange={onSearchInputChange}
          className="w-full sm:min-w-[240px] sm:flex-1"
        >
          <SearchField.Group className="h-10 rounded-full">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari nama / no. HP customer..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="ml-auto flex items-center gap-2">
          <ToggleButton
            isSelected={isChartVisible}
            onChange={onToggleChart}
            variant="default"
            size="sm"
            className="h-10 gap-1.5 rounded-xl"
            aria-label="Toggle timeline"
          >
            <CalendarBlank className="size-4" />
            <span className="hidden sm:inline">
              {isChartVisible ? "Hide Timeline" : "Show Timeline"}
            </span>
            <span className="sm:hidden">Timeline</span>
            {isChartVisible ? (
              <CaretUp className="size-3.5 text-muted" />
            ) : (
              <CaretDown className="size-3.5 text-muted" />
            )}
          </ToggleButton>

          <Button
            variant="secondary"
            size="sm"
            className="h-10 gap-1.5 rounded-xl"
            onClick={onSendWhatsAppReport}
          >
            <PaperPlaneRight className="size-4" />
            Kirim WA
          </Button>
        </div>
      </div>
    </div>
  );
}
