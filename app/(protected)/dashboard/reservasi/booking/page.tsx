"use client";

import { Suspense } from "react";
import {
  Chip,
  Button,
  Drawer,
  useOverlayState,
  toast,
  cn,
  Dropdown,
  RangeCalendar,
} from "@heroui/react";
import {
  BookingStatus,
  SpaBooking,
  getBookingLineLabel,
  isBundlePromoLine,
} from "@/app/types/booking";
import {
  CalendarBlank,
  CaretDown,
  CaretUp,
  Eye,
  PencilSimple,
  Plus,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/app/components/data-table";
import { createColumnHelper } from "@tanstack/react-table";
import {
  endOfMonth,
  getLocalTimeZone,
  startOfMonth,
  today,
} from "@internationalized/date";
import GanttChartBookings from "./components/ganttChartBookings";
import BookingModal from "./components/bookingModal";
import { useApiFetch, usePost } from "@/app/libs/use-http";
import { formatDate } from "@/app/libs/date-format";
import { useSearchParams, useRouter } from "next/navigation";

const getBookingStatusColor = (status: BookingStatus) => {
  const map: Record<
    BookingStatus,
    "default" | "success" | "warning" | "danger" | "accent"
  > = {
    Pending: "warning",
    Confirmed: "accent",
    Completed: "success",
    Cancelled: "danger",
  };
  return map[status];
};

const columnHelper = createColumnHelper<SpaBooking>();

function BookingsPageInner() {
  const timeZone = getLocalTimeZone();
  const currentDateObj = today(timeZone);

  const [dateRange, setDateRange] = useState({
    start: startOfMonth(currentDateObj),
    end: endOfMonth(currentDateObj),
  });

  const createBookingDrawer = useOverlayState();
  const detailDrawer = useOverlayState();
  const [bookingModalAction, setBookingModalAction] = useState<
    "create" | "edit"
  >("create");
  const [editingBooking, setEditingBooking] = useState<SpaBooking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<SpaBooking | null>(
    null,
  );
  const [isChartVisible, setIsChartVisible] = useState<boolean>(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  const startDateStr = dateRange.start.toString();
  const endDateStr = dateRange.end.toString();

  const { data } = useApiFetch<{ data: SpaBooking[] }>(
    ["bookings", startDateStr, endDateStr],
    "/master/bookings",
    { start_date: startDateStr, end_date: endDateStr },
  );

  const createPayment = usePost<
    { data: { payment_url: string } },
    { bookingId: number; idempotency_key: string }
  >((payload) => `/master/bookings/${payload.bookingId}/payment`, {});

  const bookings = useMemo(() => data?.data ?? [], [data]);

  const totalAmount = useMemo(
    () => bookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0),
    [bookings],
  );

  useEffect(() => {
    const paymentRef = searchParams.get("payment_ref");
    const result = searchParams.get("result");
    if (!paymentRef || !result) return;

    if (result === "success") {
      toast.success("Pembayaran berhasil", {
        description: `Booking ${paymentRef} sudah ditandai sebagai paid/confirmed (jika callback sudah masuk).`,
      });
    } else if (result === "cancel") {
      toast.warning("Pembayaran dibatalkan", {
        description: `Booking ${paymentRef} masih berstatus belum dibayar.`,
      });
    }

    router.replace("/dashboard/reservasi/booking");
  }, [router, searchParams]);

  const handleViewBooking = (booking: SpaBooking) => {
    setSelectedBooking(booking);
    detailDrawer.open();
  };

  const handleOpenCreateModal = () => {
    setBookingModalAction("create");
    setEditingBooking(null);
    createBookingDrawer.open();
  };

  const handleOpenEditModal = (booking: SpaBooking) => {
    setBookingModalAction("edit");
    setEditingBooking(booking);
    createBookingDrawer.open();
  };

  const handleRetryPayment = async () => {
    if (!selectedBooking?.id || createPayment.isPending) return;
    const payload = {
      bookingId: Number(selectedBooking.id),
      idempotency_key: crypto.randomUUID(),
    };
    try {
      const response = await createPayment.mutateAsync(payload);
      const paymentUrl = response?.data?.payment_url;
      if (!paymentUrl) {
        toast.warning("Gagal membuat payment link");
        return;
      }
      window.location.href = paymentUrl;
    } catch {
      toast.warning("Gagal membuat payment link");
    }
  };

  const columns = [
    columnHelper.accessor("id", {
      header: "Booking ID",
      cell: (info) => (
        <span className="font-mono font-semibold">
          {info.row.original.booking_code}
        </span>
      ),
    }),
    columnHelper.accessor("customer_name", {
      header: "Customer",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {info.row.original.customer_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {info.row.original.customer_phone}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("service_name", {
      header: "Service & Therapist",
      cell: (info) => {
        const isBundle = info.row.original?.booking_bundle_promos?.length > 0;
        const lines = info.row.original?.service_variants ?? [];
        const serviceName =
          lines.length > 0
            ? lines.map((line) => getBookingLineLabel(line)).join(", ")
            : "Spa Service";

        if (isBundle) {
          return (
            <div className="flex flex-col">
              <span className="text-sm">
                {info.row.original?.booking_bundle_promos?.[0]?.bundle_name ||
                  ""}
              </span>
              <span className="text-xs text-muted-foreground">
                by {info.row.original.therapists?.join(", ") || "—"}
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm">{serviceName}</span>
            <span className="text-xs text-muted-foreground">
              by {info.row.original.therapists?.join(", ") || "—"}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("schedule_date", {
      header: "Schedule",
      cell: (info) => {
        const date = new Date(info.row.original.schedule_date);
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {formatDate(date, { withTime: true })}
            </span>
            <span className="text-xs text-muted-foreground">
              ({info.row.original.duration_minutes} min)
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <div className="flex gap-2 items-center">
          <Chip
            size="sm"
            variant="primary"
            color={getBookingStatusColor(info.getValue())}
          >
            {info.getValue()}
          </Chip>
        </div>
      ),
      footer: () => (
        <div className="flex justify-end w-full">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
            Total Amount
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("totalAmount", {
      header: "Amount",
      cell: (info) => (
        <span className="font-medium">
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(info.row.original?.total_amount ?? 0)}
        </span>
      ),
      footer: () => (
        <span className="text-sm font-bold">
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(totalAmount)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: (info) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="primary"
            aria-label="View details"
            onClick={() => handleViewBooking(info.row.original)}
          >
            <Eye className="size-4" weight="regular" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="primary"
            aria-label="Edit booking"
            onClick={() => handleOpenEditModal(info.row.original)}
          >
            <PencilSimple className="size-4" weight="regular" />
          </Button>
        </div>
      ),
      footer: () => null,
    }),
  ];

  return (
    <div
      className="relative flex flex-col w-full"
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        gap: "var(--space-5)",
      }}
    >
      {/* PAGE HEADER */}
      <div
        className="flex flex-wrap justify-between items-start"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "600",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Spa Reservations
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Manage your upcoming treatments and staff schedules.
          </p>
        </div>

        <Drawer state={createBookingDrawer} isDismissable={false}>
          <Button
            variant="primary"
            style={{
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-2) var(--space-4)",
              fontSize: "var(--text-sm)",
            }}
            onClick={handleOpenCreateModal}
          >
            <Plus
              style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
            />
            New Booking
          </Button>
          <Drawer.Content
            placement="bottom"
            className="h-[100vh] w-[100vw] max-w-6xl sm:h-[100vh]"
          >
            <Drawer.Dialog className="flex h-full w-full flex-col overflow-hidden p-0">
              <Drawer.CloseTrigger className="absolute right-4 top-4 z-10" />
              <BookingModal
                key={`${bookingModalAction}-${editingBooking?.id ?? "new"}`}
                isOpen={createBookingDrawer.isOpen}
                action={bookingModalAction}
                initialBooking={editingBooking}
                onSaved={createBookingDrawer.close}
              />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer>
      </div>

      {/* TOOLBAR */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3"
        style={{ borderRadius: "var(--radius-xl)" }}
      >
        <div className="flex h-11 w-full items-center justify-between overflow-visible rounded-full border border-border shadow-sm transition-colors sm:w-fit">
          <button
            onClick={() => {
              const rangeDuration = dateRange.end.compare(dateRange.start) + 1;
              setDateRange({
                start: dateRange.start.subtract({ days: rangeDuration }),
                end: dateRange.end.subtract({ days: rangeDuration }),
              });
            }}
            className="flex h-full w-12 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            aria-label="Previous period"
          >
            <CaretLeft weight="bold" className="h-4 w-4" />
          </button>

          <Dropdown>
            <Dropdown.Trigger className="w-full md:w-fit">
              <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-[13px] sm:text-sm font-bold text-foreground outline-none transition-colors hover:bg-surface-secondary/50">
                <CalendarBlank
                  weight="bold"
                  className="h-4 w-4 shrink-0 text-muted"
                />
                <span className="truncate">
                  {formatDate(dateRange.start.toDate(timeZone), {
                    dateStyle: "medium",
                  })}{" "}
                  -{" "}
                  {formatDate(dateRange.end.toDate(timeZone), {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom"
              className="z-[100] w-[calc(100vw-2rem)] sm:w-auto min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl"
            >
              <RangeCalendar
                aria-label="Pilih rentang tanggal"
                value={dateRange}
                onChange={(val) => setDateRange(val)}
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
            onClick={() => {
              const rangeDuration = dateRange.end.compare(dateRange.start) + 1;
              setDateRange({
                start: dateRange.start.add({ days: rangeDuration }),
                end: dateRange.end.add({ days: rangeDuration }),
              });
            }}
            className="flex h-full w-12 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            aria-label="Next period"
          >
            <CaretRight weight="bold" className="h-4 w-4" />
          </button>
        </div>

        <Button
          variant="secondary"
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--text-sm)",
          }}
          className="ml-auto sm:ml-0"
          onClick={() => setIsChartVisible(!isChartVisible)}
        >
          <CalendarBlank
            style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
          />
          <span className="hidden sm:inline">
            {isChartVisible ? "Hide Timeline" : "Show Timeline"}
          </span>
          <span className="sm:hidden">Timeline</span>
          {isChartVisible ? (
            <CaretUp
              style={{
                width: "var(--icon-xs)",
                height: "var(--icon-xs)",
                marginLeft: "var(--space-1)",
                color: "var(--muted)",
              }}
            />
          ) : (
            <CaretDown
              style={{
                width: "var(--icon-xs)",
                height: "var(--icon-xs)",
                marginLeft: "var(--space-1)",
                color: "var(--muted)",
              }}
            />
          )}
        </Button>
      </div>

      {/* GANTT CHART */}
      <div
        className={cn(
          "grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] w-full",
          isChartVisible
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-1 pb-4">
            <GanttChartBookings />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={bookings} defaultPageSize={10} />

      {/* DETAIL DRAWER */}
      <Drawer state={detailDrawer} isDismissable={false}>
        <Drawer.Content
          placement="bottom"
          className="h-[88vh] w-[100vw] mx-auto max-w-3xl sm:h-[100vh]"
        >
          <Drawer.Dialog className="flex h-full w-full flex-col overflow-y-auto p-0">
            <Drawer.CloseTrigger className="absolute right-4 top-4 z-10 text-foreground" />
            <div className="min-h-full bg-background p-6 text-foreground">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-xl font-semibold mb-3">Booking details</h2>
                {!selectedBooking ? (
                  <p className="text-sm text-muted-foreground">
                    No booking selected.
                  </p>
                ) : (
                  <div className="space-y-4 text-sm text-foreground">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Booking code
                        </p>
                        <p className="font-semibold">
                          {selectedBooking.booking_code}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Status
                        </p>
                        <p className="font-semibold">
                          {selectedBooking.status}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Customer
                        </p>
                        <p className="font-semibold">
                          {selectedBooking.customer_name}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedBooking.customer_phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Schedule
                        </p>
                        <p className="font-semibold">
                          {formatDate(new Date(selectedBooking.schedule_date), {
                            withTime: true,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Total amount
                        </p>
                        <p className="font-semibold">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(selectedBooking.total_amount ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Therapists
                        </p>
                        <p className="font-semibold">
                          {selectedBooking.therapists?.join(", ") || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">
                        Items
                      </p>
                      <div className="space-y-3">
                        {(selectedBooking.service_variants ?? []).map(
                          (line, idx) => (
                            <div
                              key={`${line.id}-${idx}`}
                              className="rounded-xl border border-border/60 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  {isBundlePromoLine(line) && (
                                    <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                      Bundle Promo
                                    </span>
                                  )}
                                  <p className="font-medium mt-1">
                                    {getBookingLineLabel(line)}
                                  </p>
                                  {isBundlePromoLine(line) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Hemat{" "}
                                      {new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        maximumFractionDigits: 0,
                                      }).format(line.discount_amount)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {isBundlePromoLine(line) && (
                                    <p className="text-xs text-muted-foreground line-through">
                                      {new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        maximumFractionDigits: 0,
                                      }).format(line.subtotal)}
                                    </p>
                                  )}
                                  <p className="text-sm font-semibold">
                                    {new Intl.NumberFormat("id-ID", {
                                      style: "currency",
                                      currency: "IDR",
                                      maximumFractionDigits: 0,
                                    }).format(line.retail_price ?? 0)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {selectedBooking.status === "Pending" && (
                      <div className="pt-2">
                        <Button
                          variant="primary"
                          className="w-full rounded-xl"
                          onClick={handleRetryPayment}
                          isDisabled={createPayment.isPending}
                        >
                          {createPayment.isPending
                            ? "Mengarahkan ke pembayaran..."
                            : "Pilih Metode Pembayaran"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageInner />
    </Suspense>
  );
}
