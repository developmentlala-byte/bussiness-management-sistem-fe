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
  TextField,
  InputGroup,
} from "@heroui/react";
import type { Row } from "@tanstack/react-table";
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
  Trash,
  PaperPlaneRight,
  ArrowsMergeIcon,
  ArrowsSplitIcon,
  MagnifyingGlass,
  X,
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
import { useApiFetch, usePost, useRemove } from "@/app/libs/use-http";
import { formatDate, formatWallClockDate } from "@/app/libs/date-format";
import { buildBookingPaymentRedirectPayload } from "@/app/libs/payment-redirect";
import { useSearchParams, useRouter } from "next/navigation";
import { useVisualViewportHeight } from "@/app/libs/use-visual-viewport";
import { apiGet } from "@/app/services/api";
import { AlertDialog } from "@heroui/react";
import StatusFilterDropdown from "./components/status-filter-dropdown";
import { CopyableText } from "@/app/components/copyable-text";

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

type CreatedBookingsReport = {
  date: string;
  statuses?: string[] | null;
  bookings: SpaBooking[];
  totals: {
    total_count: number;
    total_amount: number;
    by_status: Record<string, number>;
    by_source?: Record<string, number>;
  };
};

function BookingsPageInner() {
  const timeZone = getLocalTimeZone();
  const currentDateObj = today(timeZone);

  const [dateRange, setDateRange] = useState({
    start: startOfMonth(currentDateObj),
    end: endOfMonth(currentDateObj),
  });
  const [useScheduleDate, setUseScheduleDate] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const drawerHeight = useVisualViewportHeight();
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

  // Debounce search: tunggu 400ms setelah user berhenti ngetik
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const bookingQueryParams = useMemo(() => {
    const base = useScheduleDate
      ? { start_date: startDateStr, end_date: endDateStr }
      : { created_start_date: startDateStr, created_end_date: endDateStr };
    return debouncedSearch ? { ...base, search: debouncedSearch } : base;
  }, [endDateStr, startDateStr, useScheduleDate, debouncedSearch]);

  const { data, isLoading: isBookingsLoading } = useApiFetch<{
    data: SpaBooking[];
  }>(
    [
      "bookings",
      startDateStr,
      endDateStr,
      useScheduleDate ? "schedule_date" : "created_at",
      debouncedSearch,
    ],
    "/master/bookings",
    bookingQueryParams,
  );

  const createPayment = usePost<
    { data: { payment_url: string } },
    {
      bookingId: number;
      idempotency_key: string;
      return_url?: string;
      cancel_url?: string;
    }
  >((payload) => `/master/bookings/${payload.bookingId}/payment`, {});

  const payCash = usePost<
    { data: { booking_code: string; status: string } },
    { bookingId: number; idempotency_key: string }
  >((payload) => `/master/bookings/${payload.bookingId}/cash-payment`, {});

  const bookings = useMemo(() => data?.data ?? [], [data]);

  const BOOKING_STATUS_OPTIONS = useMemo(
    () => [
      { id: "Pending", label: "Pending", color: "bg-amber-400" },
      { id: "Confirmed", label: "Confirmed", color: "bg-indigo-400" },
      { id: "Completed", label: "Completed", color: "bg-emerald-400" },
      { id: "Cancelled", label: "Cancelled", color: "bg-red-500" },
    ],
    [],
  );

  const [activeStatusIds, setActiveStatusIds] = useState<string[]>(
    BOOKING_STATUS_OPTIONS.map((s) => s.id),
  );

  const filteredBookings = useMemo(() => {
    const set = new Set(activeStatusIds);
    return bookings.filter((b) => set.has(b.status));
  }, [activeStatusIds, bookings]);

  const totalAmount = useMemo(
    () =>
      filteredBookings.reduce((sum, b) => {
        if (b.status === "Cancelled") return sum;
        return sum + Number(b.total_amount ?? 0);
      }, 0),
    [filteredBookings],
  );

  const formatReportDateLabel = (dateStr: string) => {
    const dt = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
      .format(dt)
      .toUpperCase();
  };

  const fetchCreatedBookingsReport = async (
    dateStr: string,
    statuses: string[],
    useScheduleDate: boolean,
  ): Promise<CreatedBookingsReport> => {
    const res = await apiGet("/master/reports/bookings-created", {
      date: dateStr,
      statuses,
      use_schedule_date: useScheduleDate ? 1 : 0,
    });
    return res?.data as CreatedBookingsReport;
  };

  const formatRupiah = (n: number) =>
    `Rp ${Math.trunc(Number(n || 0)).toLocaleString("id-ID")}`;

  const isCancelledBooking = (status?: string) => {
    const s = (status ?? "").toLowerCase();
    return s.includes("cancel") || s.includes("batal");
  };

  const buildCreatedBookingsReportText = (report: CreatedBookingsReport) => {
    const allBookings = report.bookings ?? [];
    const cancelledBookings = allBookings.filter((b) =>
      isCancelledBooking(b.status as unknown as string),
    );
    const confirmedBookings = allBookings.filter(
      (b) => !isCancelledBooking(b.status as unknown as string),
    );

    const sumBySource = (list: SpaBooking[], source: "direct" | "ads") =>
      list
        .filter((b) => (b.source ?? "direct") === source)
        .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    const directAmount = sumBySource(confirmedBookings, "direct");
    const adsAmount = sumBySource(confirmedBookings, "ads");
    const confirmedTotalAmount = directAmount + adsAmount;

    const describeBooking = (b: SpaBooking, idx: number) => {
      const lines = b.service_variants ?? [];
      const serviceLabel =
        lines.length > 0
          ? lines.map((line) => getBookingLineLabel(line)).join(", ")
          : "Spa Service";
      const amount = formatRupiah(Number(b.total_amount || 0));
      const source = (b.source ?? "direct").toUpperCase();
      return `${idx + 1}. ${b.customer_name} - ${serviceLabel} - ${source} - ${amount}`;
    };

    const confirmedRows =
      confirmedBookings.length > 0
        ? confirmedBookings.map((b, i) => describeBooking(b, i)).join("\n")
        : "-";

    const cancelledRows = cancelledBookings
      .map((b, i) => `${describeBooking(b, i)}`)
      .join("\n");

    const statusLines = Object.entries(report.totals.by_status ?? {}).map(
      ([k, v]) => `${k} : ${v}`,
    );

    const filterStatusLine =
      report.statuses && report.statuses.length
        ? `Filter Status : ${report.statuses.join(", ")}`
        : null;

    return [
      `REPORT BOOKING - ${formatReportDateLabel(report.date)}`,
      "",
      "DETAIL BOOKING CONFIRMED",
      confirmedRows,
      ...(cancelledBookings.length > 0
        ? ["", "DETAIL BOOKING CANCEL", cancelledRows]
        : []),
      "",
      "TOTAL",
      `Booking Masuk : ${allBookings.length}`,
      `Booking Confirmed : ${confirmedBookings.length}`,
      `Booking Cancel : ${cancelledBookings.length}`,
      "",
      "OMZET (booking confirmed)",
      `Direct : ${formatRupiah(directAmount)}`,
      `Ads : ${formatRupiah(adsAmount)}`,
      `Total : ${formatRupiah(confirmedTotalAmount)}`,
    ].join("\n");
  };

  const sendWhatsAppText = async (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

    const openFallback = async () => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Teks report disalin", {
          description: "Buka WhatsApp lalu paste teks report.",
        });
      } catch {
        toast.warning("Teks report terlalu panjang", {
          description: "Silakan download report, lalu copy paste ke WhatsApp.",
        });
      }
      window.open("https://wa.me/", "_blank");
    };

    if (url.length > 1800) {
      await openFallback();
      return;
    }

    const opened = window.open(url, "_blank");
    if (!opened) {
      await openFallback();
    }
  };

  const handleSendBookingCreatedReportToWhatsApp = async () => {
    const dateStr = currentDateObj.toString();
    try {
      const report = await fetchCreatedBookingsReport(
        dateStr,
        activeStatusIds,
        useScheduleDate,
      );
      const text = buildCreatedBookingsReportText(report);
      await sendWhatsAppText(text);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.danger("Gagal membuat report booking", {
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Tidak bisa mengambil data report.",
      });
    }
  };

  const { mutateAsync: deleteBooking, isPending: isDeletingBooking } =
    useRemove<unknown, { id: number }>(
      (payload) => `/master/bookings/${payload.id}`,
      {
        invalidate: [["bookings"]],
        onError: (err: unknown) => {
          const error = err as {
            response?: { data?: { message?: string } };
          };
          toast.warning("Gagal menghapus booking", {
            description:
              error.response?.data?.message ??
              "Terjadi kesalahan saat menghapus booking.",
          });
        },
        onSuccess: () => {
          toast.success("Booking berhasil dihapus");
        },
      },
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
      ...buildBookingPaymentRedirectPayload(),
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

  const handlePayCash = async () => {
    if (!selectedBooking?.id || payCash.isPending) return;
    try {
      const response = await payCash.mutateAsync({
        bookingId: Number(selectedBooking.id),
        idempotency_key: crypto.randomUUID(),
      });
      const bookingCode =
        response?.data?.booking_code ?? selectedBooking.booking_code;
      toast.success("Pembayaran cash berhasil");
      detailDrawer.close();
      window.location.href = `/payment/${encodeURIComponent(bookingCode)}/result`;
    } catch {
      toast.warning("Gagal memproses pembayaran cash");
    }
  };

  const columns = [
    columnHelper.display({
      id: "no",
      header: "No",
      size: 56,
      minSize: 40,
      maxSize: 72,
      cell: (info) => {
        const childBookings = info.row.original.child_bookings ?? [];
        const canExpand = childBookings.length > 0;

        // Nomor urut mengikuti posisi baris di halaman aktif (bukan id booking),
        // jadi tetap 1, 2, 3... berlanjut antar halaman.
        const rows = info.table.getRowModel().rows;
        const localIndex = rows.findIndex((r) => r.id === info.row.id);
        const { pageIndex, pageSize } = info.table.getState().pagination;
        const rowNumber = pageIndex * pageSize + localIndex + 1;

        // Row tanpa bonus booking: tampil angka polos aja, tidak interaktif.
        if (!canExpand) {
          return (
            <span className="inline-flex h-6 w-6 items-center justify-center text-sm text-muted-foreground">
              {rowNumber}
            </span>
          );
        }

        const isExpanded = info.row.getIsExpanded();

        return (
          <button
            type="button"
            onClick={() => info.row.toggleExpanded()}
            aria-label="Toggle bonus booking"
            aria-expanded={isExpanded}
            className="group relative inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-muted cursor-pointer"
          >
            {/* Angka: default kelihatan, hilang saat hover atau saat expanded */}
            <span
              className={cn(
                "text-sm text-muted-foreground transition-opacity",
                isExpanded ? "opacity-0" : "opacity-100 group-hover:opacity-0",
              )}
            >
              {rowNumber}
            </span>
            {/* Icon caret: default disembunyikan, muncul saat hover atau saat expanded */}
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity",
                isExpanded
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            >
              {isExpanded ? (
                <CaretUp className="size-4 text-foreground" weight="bold" />
              ) : (
                <CaretDown className="size-4 text-foreground" weight="bold" />
              )}
            </span>
          </button>
        );
      },
      footer: () => null,
    }),
    columnHelper.accessor("id", {
      header: "Booking ID",
      cell: (info) => (
        <CopyableText
          text={info.row.original.booking_code || null}
          className="font-mono font-semibold "
        />
      ),
    }),
    columnHelper.accessor("customer_name", {
      header: "Customer",
      cell: (info) => {
        const rawName = info.row.original.customer_name ?? "";
        const displayName = rawName ? rawName.toLowerCase() : "";

        return (
          <div className="flex flex-col gap-0.5">
            <CopyableText
              text={displayName || null}
              className="font-medium text-sm capitalize"
            />
            <CopyableText
              text={info.row.original.customer_phone}
              className="text-xs text-muted-foreground"
            />
          </div>
        );
      },
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

        const therapistNames =
          Array.from(
            new Set(
              (info.row.original.therapists ?? [])
                .map((t) => {
                  if (typeof t === "string") return t;
                  return t.name;
                })
                .filter(Boolean),
            ),
          ).join(", ") || "—";

        if (isBundle) {
          return (
            <div className="flex flex-col">
              <span className="text-sm">
                {info.row.original?.booking_bundle_promos?.[0]?.bundle_name ??
                  ""}
              </span>
              <span className="text-xs text-muted-foreground">
                by {therapistNames}
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm">{serviceName}</span>
            <span className="text-xs text-muted-foreground">
              by {therapistNames}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("schedule_date", {
      header: "Schedule",
      cell: (info) => {
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {formatWallClockDate(info.row.original.schedule_date, {
                withTime: true,
              })}
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
    columnHelper.accessor("source", {
      header: "Source",
      cell: (info) => {
        const src = info.row.original.source ?? "direct";
        const label = src === "ads" ? "Ads" : "Direct";
        return (
          <Chip
            size="sm"
            variant="primary"
            color={src === "ads" ? "accent" : "warning"}
          >
            {src === "ads" ? (
              <>
                <ArrowsMergeIcon
                  className="size-4 -rotate-90"
                  weight="regular"
                />{" "}
                {label}
              </>
            ) : (
              <>
                <ArrowsSplitIcon
                  className="size-4 -rotate-90"
                  weight="regular"
                />{" "}
                {label}
              </>
            )}
          </Chip>
        );
      },
    }),
    columnHelper.accessor("totalAmount", {
      header: "Amount",
      cell: (info) => {
        const booking = info.row.original;
        const voucher = booking.applied_voucher || booking.voucher_snapshot;
        const subtotal = Number(
          booking.subtotal_amount ?? booking.total_amount ?? 0,
        );
        const discount = Number(booking.discount_amount ?? 0);
        const total = Number(booking.total_amount ?? subtotal);
        const hasDiscount = discount > 0;

        return (
          <div className="flex flex-col">
            {hasDiscount && (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(subtotal)}
                </span>
                <span className="text-xs text-danger font-medium">
                  -
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(discount)}
                </span>
                <span className="text-[10px] text-danger/80 font-semibold mt-0.5">
                  Diskon
                </span>
              </>
            )}
            {voucher && !hasDiscount && (
              <span className="text-[10px] text-accent font-semibold mb-0.5">
                {voucher.code || voucher.name || "Voucher"}
              </span>
            )}
            <span className="font-medium">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(total)}
            </span>
          </div>
        );
      },
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
          <AlertDialog>
            <Button
              isIconOnly
              size="sm"
              variant="danger"
              aria-label="Delete booking"
            >
              <Trash className="size-4" weight="regular" />
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[420px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      Hapus booking ini?
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      Ini akan menghapus booking{" "}
                      <strong>{info.row.original.booking_code}</strong> dan
                      datanya. Aksi ini tidak bisa dibatalkan.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Cancel
                    </Button>
                    <Button
                      slot="close"
                      variant="danger"
                      onClick={() =>
                        void deleteBooking({ id: Number(info.row.original.id) })
                      }
                      isDisabled={isDeletingBooking}
                    >
                      {isDeletingBooking ? "Deleting..." : "Delete"}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      ),
      footer: () => null,
    }),
  ];

  const renderExpandedBookingRow = (row: Row<SpaBooking>) => {
    const childBookings = row.original.child_bookings ?? [];
    if (childBookings.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Bonus Booking
          </p>
          <p className="text-xs text-muted-foreground">
            Tidak tampil sebagai row terpisah
          </p>
        </div>
        <div className="grid gap-3">
          {childBookings.map((child) => (
            <div
              key={child.booking_code}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {child.service_variants?.length
                      ? child.service_variants
                          .map((line) => getBookingLineLabel(line))
                          .join(", ")
                      : "Bonus Service"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {child.booking_code}
                  </p>
                </div>
                <Chip size="sm" variant="primary" color="accent">
                  Bonus Gratis
                </Chip>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-foreground sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Jadwal
                  </p>
                  <p>
                    {formatWallClockDate(child.schedule_date, {
                      withTime: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Therapist
                  </p>
                  <p>
                    {child.therapists
                      ?.map((t) => (typeof t === "string" ? t : t.name))
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Status
                  </p>
                  <p>
                    {child.status} / {child.payment_status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

        <Drawer state={createBookingDrawer}>
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
          <Drawer.Backdrop isDismissable={false}>
            <Drawer.Content placement="bottom">
              <Drawer.Dialog
                className="flex w-full max-w-6xl mx-auto flex-col overflow-hidden p-0"
                style={{ height: drawerHeight }}
              >
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
          </Drawer.Backdrop>
        </Drawer>
      </div>

      {/* TOOLBAR — 2 baris berdasarkan fungsi, biar tidak sesak */}
      <div
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3"
        style={{ borderRadius: "var(--radius-xl)" }}
      >
        {/* BARIS 1: FILTER DATA — date range, status, sumber tanggal */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center justify-between overflow-visible rounded-full border border-border shadow-sm transition-colors w-full sm:w-fit">
            <button
              onClick={() => {
                const rangeDuration =
                  dateRange.end.compare(dateRange.start) + 1;
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
                        <RangeCalendar.HeaderCell>
                          {day}
                        </RangeCalendar.HeaderCell>
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
                const rangeDuration =
                  dateRange.end.compare(dateRange.start) + 1;
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

          <div className="flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Berdasarkan
            </span>
            <div className="flex bg-surface rounded-full p-1">
              <button
                onClick={() => setUseScheduleDate(false)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  !useScheduleDate
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Waktu Dibuat
              </button>
              <button
                onClick={() => setUseScheduleDate(true)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  useScheduleDate
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tanggal Booking
              </button>
            </div>
          </div>

          <StatusFilterDropdown
            statuses={BOOKING_STATUS_OPTIONS}
            defaultChecked={BOOKING_STATUS_OPTIONS.map((s) => s.id)}
            onChange={(ids) => setActiveStatusIds(ids)}
            className="hidden! sm:inline-flex!"
          />
        </div>

        {/* BARIS 2: PENCARIAN + AKSI — search dapat ruang lebar, aksi di kanan */}
        <div className="flex flex-wrap items-center gap-3">
          <TextField
            aria-label="Cari nama atau nomor HP customer"
            className="w-full sm:flex-1 sm:min-w-[240px] "
          >
            <InputGroup className="h-11 rounded-full" fullWidth>
              <InputGroup.Prefix>
                <MagnifyingGlass weight="bold" className="h-4 w-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama / no. HP customer..."
                className="text-sm font-medium"
              />
              {searchInput && (
                <InputGroup.Suffix className="pr-1">
                  <button
                    type="button"
                    aria-label="Hapus pencarian"
                    onClick={() => setSearchInput("")}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                  >
                    <X weight="bold" className="h-3.5 w-3.5" />
                  </button>
                </InputGroup.Suffix>
              )}
            </InputGroup>
          </TextField>

          {/* Status filter juga muncul di sini khusus layar kecil, karena disembunyikan di baris 1 */}
          <StatusFilterDropdown
            statuses={BOOKING_STATUS_OPTIONS}
            defaultChecked={BOOKING_STATUS_OPTIONS.map((s) => s.id)}
            onChange={(ids) => setActiveStatusIds(ids)}
            className="sm:hidden! w-full!"
          />

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="secondary"
              style={{
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                padding: "var(--space-2) var(--space-4)",
                fontSize: "var(--text-sm)",
              }}
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

            <Button
              variant="secondary"
              style={{
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                padding: "var(--space-2) var(--space-4)",
                fontSize: "var(--text-sm)",
              }}
              onClick={() => void handleSendBookingCreatedReportToWhatsApp()}
            >
              <PaperPlaneRight className="size-5" /> Kirim WA
            </Button>
          </div>
        </div>
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

      <DataTable
        columns={columns}
        data={filteredBookings}
        defaultPageSize={10}
        isLoading={isBookingsLoading}
        getRowCanExpand={(row) =>
          (row.original.child_bookings ?? []).length > 0
        }
        renderExpandedRow={renderExpandedBookingRow}
      />

      {/* DETAIL DRAWER */}
      <Drawer state={detailDrawer}>
        <Drawer.Backdrop isDismissable={false}>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog
              className="flex w-full max-w-3xl mx-auto flex-col overflow-y-auto p-0"
              style={{ height: drawerHeight }}
            >
              <Drawer.CloseTrigger className="absolute right-4 top-4 z-10 text-foreground" />
              <div className="min-h-full bg-background p-6 text-foreground">
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-xl font-semibold mb-3">
                    Booking details
                  </h2>
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
                            {formatWallClockDate(
                              selectedBooking.schedule_date,
                              {
                                withTime: true,
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Total amount
                          </p>
                          {(() => {
                            const hasVoucher =
                              selectedBooking.applied_voucher ||
                              selectedBooking.voucher_snapshot;
                            const voucher =
                              selectedBooking.applied_voucher ||
                              selectedBooking.voucher_snapshot;
                            const subtotal = selectedBooking.subtotal_amount;
                            const discount = selectedBooking.discount_amount;
                            const total = selectedBooking.total_amount;

                            return (
                              <div>
                                {hasVoucher && subtotal && (
                                  <>
                                    <p className="text-sm text-muted-foreground line-through">
                                      {new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        maximumFractionDigits: 0,
                                      }).format(subtotal)}
                                    </p>
                                    <p className="text-sm text-danger font-medium">
                                      -{" "}
                                      {new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        maximumFractionDigits: 0,
                                      }).format(discount)}
                                    </p>
                                    {voucher && (
                                      <p className="text-xs text-accent font-semibold">
                                        {voucher.code ||
                                          voucher.name ||
                                          "Voucher"}
                                      </p>
                                    )}
                                  </>
                                )}
                                <p className="font-semibold">
                                  {new Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    maximumFractionDigits: 0,
                                  }).format(total ?? 0)}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Therapists
                          </p>
                          <p className="font-semibold">
                            {selectedBooking.therapists
                              ?.map((t) => {
                                if (typeof t === "string") return t;
                                return t.name;
                              })
                              .filter(Boolean)
                              .join(", ") || "—"}
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
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Durasi: {line.duration_minutes ?? 0} menit
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

                      {(selectedBooking.child_bookings ?? []).length > 0 && (
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">
                            Bonus Booking
                          </p>
                          <div className="space-y-3">
                            {selectedBooking.child_bookings?.map((child) => (
                              <div
                                key={child.booking_code}
                                className="rounded-xl border border-border/60 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">
                                      {child.service_variants?.length
                                        ? child.service_variants
                                            .map((line) =>
                                              getBookingLineLabel(line),
                                            )
                                            .join(", ")
                                        : "Bonus Service"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {formatWallClockDate(
                                        child.schedule_date,
                                        {
                                          withTime: true,
                                        },
                                      )}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Durasi bonus:{" "}
                                      {child.total_duration_minutes ??
                                        child.duration_minutes ??
                                        0}{" "}
                                      menit
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {child.therapists
                                        ?.map((t) =>
                                          typeof t === "string" ? t : t.name,
                                        )
                                        .filter(Boolean)
                                        .join(", ") || "—"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Chip
                                      size="sm"
                                      variant="primary"
                                      color="accent"
                                    >
                                      Bonus Gratis
                                    </Chip>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {child.status} / {child.payment_status}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                          <Button
                            variant="secondary"
                            className="mt-2 w-full rounded-xl"
                            onClick={handlePayCash}
                            isDisabled={payCash.isPending}
                          >
                            {payCash.isPending ? "Memproses..." : "Bayar Cash"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
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
