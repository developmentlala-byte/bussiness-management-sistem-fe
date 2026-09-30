"use client";

/**
 * Filter Payments — layout baru (drop-in replace, props sama seperti sebelumnya).
 *
 * Alur baca (atas → bawah):
 *  1. PERIODE  : navigator tanggal (gaya filter booking) + preset cepat
 *  2. STATUS   : segmented control + jumlah transaksi per status
 *  3. PERSEMPIT: pencarian + tombol Filters (metode, layanan) dengan badge
 *  4. RINGKASAN: chip filter aktif, bisa dihapus satu-satu
 */

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Chip,
  Dropdown,
  Popover,
  RangeCalendar,
  SearchField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import {
  ArrowCounterClockwise,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  FunnelSimple,
  X,
} from "@phosphor-icons/react";
import {
  endOfMonth,
  parseDate,
  startOfMonth,
  today,
} from "@internationalized/date";
import type { CalendarDate, DateValue } from "@internationalized/date";
import { formatDate } from "@/app/libs/date-format";
import type { DateRangeValue } from "@/app/components/date-range-filter";

// ─────────────────────────────────────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────────────────────────────────────

export type FilterOption =
  | "all"
  | "paid"
  | "pending"
  | "expired"
  | "failed"
  | "refunded";

const STATUS_TABS: { id: FilterOption; label: string; dot?: string }[] = [
  { id: "all", label: "Semua" },
  { id: "paid", label: "Lunas", dot: "bg-[var(--success)]" },
  { id: "pending", label: "Menunggu", dot: "bg-[var(--warning)]" },
  { id: "expired", label: "Kedaluwarsa", dot: "bg-[var(--muted-foreground)]" },
  { id: "failed", label: "Gagal", dot: "bg-[var(--danger)]" },
  { id: "refunded", label: "Refund", dot: "bg-[var(--accent)]" },
];

const METHOD_GROUPS = [
  {
    title: "Offline",
    options: [
      { id: "cash", label: "Tunai" },
      { id: "free", label: "Free" },
      { id: "influencer/ads", label: "Influencer/Ads" },
    ],
  },
  {
    title: "Online",
    options: [
      { id: "midtrans", label: "Midtrans" },
      { id: "bank_transfer", label: "Bank Transfer" },
      { id: "echannel", label: "E-Channel" },
      { id: "gopay", label: "GoPay" },
      { id: "qris", label: "QRIS" },
    ],
  },
];

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  METHOD_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o.label])),
);

const PRESETS: {
  id: string;
  label: string;
  get: (tz: string) => { start: CalendarDate; end: CalendarDate };
}[] = [
  {
    id: "today",
    label: "Hari ini",
    get: (tz) => {
      const t = today(tz);
      return { start: t, end: t };
    },
  },
  {
    id: "7d",
    label: "7 hari",
    get: (tz) => {
      const t = today(tz);
      return { start: t.subtract({ days: 6 }), end: t };
    },
  },
  {
    id: "month",
    label: "Bulan ini",
    get: (tz) => {
      const t = today(tz);
      return { start: startOfMonth(t), end: endOfMonth(t) };
    },
  },
  {
    id: "lastmonth",
    label: "Bulan lalu",
    get: (tz) => {
      const t = today(tz).subtract({ months: 1 });
      return { start: startOfMonth(t), end: endOfMonth(t) };
    },
  },
];

const selectedChip =
  "rounded-full px-3 text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:font-semibold data-[selected=true]:shadow-sm";

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: ngetik di-debounce supaya API tidak dipanggil tiap huruf
// ─────────────────────────────────────────────────────────────────────────────

function useDebouncedField(
  external: string,
  onCommit: (v: string) => void,
  delay = 400,
) {
  const [local, setLocal] = useState(external);

  useEffect(() => {
    setLocal(external);
  }, [external]);

  useEffect(() => {
    if (local === external) return;
    const t = setTimeout(() => onCommit(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return [local, setLocal] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentFiltersProps {
  status: FilterOption;
  onStatusChange: (v: FilterOption) => void;
  counts: Record<string, number>;

  dateRange: DateRangeValue | null;
  onDateRangeChange: (v: DateRangeValue | null) => void;

  method: string;
  onMethodChange: (v: string) => void;

  paymentSearch: string;
  onPaymentSearchChange: (v: string) => void;

  serviceSearch: string;
  onServiceSearchChange: (v: string) => void;

  onReset: () => void;
  timeZone?: string;
}

export function PaymentFilters({
  status,
  onStatusChange,
  counts,
  dateRange,
  onDateRangeChange,
  method,
  onMethodChange,
  paymentSearch,
  onPaymentSearchChange,
  serviceSearch,
  onServiceSearchChange,
  onReset,
  timeZone = "Asia/Jakarta",
}: PaymentFiltersProps) {
  const [customerInput, setCustomerInput] = useDebouncedField(
    paymentSearch,
    onPaymentSearchChange,
  );
  const [serviceInput, setServiceInput] = useDebouncedField(
    serviceSearch,
    onServiceSearchChange,
  );

  // string "YYYY-MM-DD" ⇄ DateValue
  const range = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return null;
    return {
      start: parseDate(dateRange.startDate),
      end: parseDate(dateRange.endDate),
    };
  }, [dateRange]);

  const emitRange = (start: DateValue, end: DateValue) =>
    onDateRangeChange({
      startDate: start.toString(),
      endDate: end.toString(),
    });

  const shiftPeriod = (dir: -1 | 1) => {
    if (!range) return;
    const { start, end } = range;
    const isFullMonth = start.day === 1 && end.compare(endOfMonth(start)) === 0;
    if (isFullMonth) {
      const ns = startOfMonth(start.add({ months: dir }));
      emitRange(ns, endOfMonth(ns));
      return;
    }
    const len =
      Math.round(
        (end.toDate(timeZone).getTime() - start.toDate(timeZone).getTime()) /
          86400000,
      ) + 1;
    emitRange(start.add({ days: dir * len }), end.add({ days: dir * len }));
  };

  const activePreset = useMemo(() => {
    if (!range) return null;
    return (
      PRESETS.find((p) => {
        const r = p.get(timeZone);
        return (
          r.start.toString() === range.start.toString() &&
          r.end.toString() === range.end.toString()
        );
      })?.id ?? null
    );
  }, [range, timeZone]);

  const fmt = (d: DateValue) =>
    formatDate(d.toDate(timeZone), { dateStyle: "medium" });

  const serviceActive = serviceSearch.trim();
  const customerActive = paymentSearch.trim();
  const popoverCount = (method ? 1 : 0) + (serviceActive ? 1 : 0);
  const totalActive = popoverCount + (customerActive ? 1 : 0);

  return (
    <div
      className="flex flex-col gap-4 border border-border bg-surface p-4"
      style={{ borderRadius: "var(--radius-xl)" }}
    >
      {/* 1 — PERIODE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={activePreset ? [activePreset] : []}
          onSelectionChange={(keys) => {
            const id = Array.from(keys as Set<string>)[0];
            const p = PRESETS.find((x) => x.id === id);
            if (p) {
              const r = p.get(timeZone);
              emitRange(r.start, r.end);
            }
          }}
          size="sm"
          className="h-10 rounded-full bg-surface-secondary p-1"
        >
          {PRESETS.map((p) => (
            <ToggleButton key={p.id} id={p.id} className={selectedChip}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <div className="flex h-10 items-center overflow-visible rounded-full border border-border shadow-sm">
          <button
            onClick={() => shiftPeriod(-1)}
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
                  {range
                    ? `${fmt(range.start)} – ${fmt(range.end)}`
                    : "Pilih tanggal"}
                </span>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom start"
              className="z-[100] w-[calc(100vw-2rem)] min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl sm:w-auto"
            >
              <RangeCalendar
                aria-label="Pilih rentang tanggal"
                value={range ?? undefined}
                onChange={(r) => emitRange(r.start, r.end)}
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
            onClick={() => shiftPeriod(1)}
            className="flex h-full w-10 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            aria-label="Periode berikutnya"
          >
            <CaretRight weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {totalActive > 0 && (
          <Button
            variant="tertiary"
            size="sm"
            className="ml-auto h-10 gap-1.5 rounded-full"
            onPress={onReset}
          >
            <ArrowCounterClockwise className="size-4" />
            Reset filter
          </Button>
        )}
      </div>

      {/* 2 + 3 — STATUS  |  PENCARIAN + FILTERS */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <ToggleButtonGroup
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[status]}
            onSelectionChange={(keys) => {
              const id = Array.from(keys as Set<string>)[0];
              if (id) onStatusChange(id as FilterOption);
            }}
            size="sm"
            aria-label="Status pembayaran"
            className="h-10 w-max rounded-full bg-surface-secondary p-1"
          >
            {STATUS_TABS.map((t) => (
              <ToggleButton key={t.id} id={t.id} className={selectedChip}>
                <span className="flex items-center gap-1.5">
                  {t.dot && (
                    <span className={`size-1.5 rounded-full ${t.dot}`} />
                  )}
                  {t.label}
                  <span className="text-[11px] font-semibold opacity-70">
                    {counts[t.id] ?? 0}
                  </span>
                </span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        <div className="flex items-center gap-2">
          <SearchField
            aria-label="Cari booking, nama, atau nomor HP"
            value={customerInput}
            onChange={setCustomerInput}
            className="w-full sm:w-[300px]"
          >
            <SearchField.Group className="h-10 rounded-full">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Kode booking / nama / no. HP..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <Popover>
            <Popover.Trigger>
              <Button
                variant="secondary"
                size="sm"
                className="h-10 shrink-0 gap-1.5 rounded-full"
              >
                <FunnelSimple weight="bold" className="size-4" />
                Filters
                {popoverCount > 0 && (
                  <Badge color="accent" className="ml-0.5">
                    {popoverCount}
                  </Badge>
                )}
              </Button>
            </Popover.Trigger>
            <Popover.Content>
              <Popover.Arrow />
              <Popover.Dialog className="flex w-[340px] flex-col p-0">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Persempit hasil
                  </p>
                </div>

                <div className="flex flex-col gap-4 px-4 py-3">
                  {METHOD_GROUPS.map((g) => (
                    <div key={g.title} className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Metode · {g.title}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {g.options.map((o) => (
                          <ToggleButton
                            key={o.id}
                            size="sm"
                            isSelected={method === o.id}
                            onChange={(sel) => onMethodChange(sel ? o.id : "")}
                            className={`${selectedChip} border border-border`}
                          >
                            {o.label}
                          </ToggleButton>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Layanan
                    </p>
                    <SearchField
                      aria-label="Cari layanan"
                      value={serviceInput}
                      onChange={setServiceInput}
                    >
                      <SearchField.Group className="h-10 rounded-full">
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="Nama layanan atau paket..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                  </div>
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
      </div>

      {/* 4 — RINGKASAN FILTER AKTIF */}
      {totalActive > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Filter aktif:
          </span>
          {customerActive && (
            <ActiveChip
              label={`Cari: ${customerActive}`}
              onRemove={() => onPaymentSearchChange("")}
            />
          )}
          {method && (
            <ActiveChip
              label={`Metode: ${METHOD_LABEL[method] ?? method}`}
              onRemove={() => onMethodChange("")}
            />
          )}
          {serviceActive && (
            <ActiveChip
              label={`Layanan: ${serviceActive}`}
              onRemove={() => onServiceSearchChange("")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Chip size="sm" variant="soft" color="accent">
      <span className="flex items-center gap-1">
        {label}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus ${label}`}
          className="rounded-full p-0.5 outline-none hover:bg-accent/20"
        >
          <X weight="bold" className="size-3" />
        </button>
      </span>
    </Chip>
  );
}
