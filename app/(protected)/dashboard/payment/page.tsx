"use client";

import { formatWallClockDate } from "@/app/libs/date-format";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Eye,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Warning,
  ArrowLeft,
  User,
  Receipt,
  ArrowSquareOut,
  Copy,
  Check,
  Tag,
  Buildings,
} from "@phosphor-icons/react";
import { DataTable } from "@/app/components/data-table";
import { useApiFetch } from "@/app/libs/use-http";
import { IDR } from "@/app/libs/idr";
import ReceiptModal from "./components/receiptModal";
import { PaginatedApiResponse } from "@/app/types/api";
import { CopyableText } from "@/app/components/copyable-text";

export const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  paid: {
    label: "Paid",
    className: "bg-[var(--success)]/10 text-[var(--success)]",
    Icon: CheckCircle,
  },
  pending: {
    label: "Pending",
    className: "bg-[var(--warning)]/15 text-[var(--warning)]",
    Icon: Clock,
  },
  expired: {
    label: "Expired",
    className: "bg-[var(--muted-foreground)]/15 text-[var(--muted-foreground)]",
    Icon: Warning,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
    Icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    className: "bg-primary/10 text-primary",
    Icon: ArrowLeft,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "paid"
  | "pending"
  | "expired"
  | "failed"
  | "refunded";

export type PaymentVia = "va" | "qris" | "cstore" | "cc";

export interface ServiceVariant {
  id: number;
  name: string;
  retail_price: number;
  bundle_name?: string;
  duration_minutes: number;
}

export interface PaymentBooking {
  id: number;
  booking_code: string;
  booking_bundle_promos?: ServiceVariant[];
  customer_name: string;
  customer_phone: string;
  schedule_date: string; // ISO string
  duration_minutes: number;
  status: string;
  payment_status: string;
  total_amount: number;
  service_variants: ServiceVariant[];
}

export interface PaymentMember {
  id: number;
  customer?: {
    name: string;
    phone?: string;
  };
  membership_package?: {
    name: string;
  };
}

export interface Payment {
  id: number;
  booking_id?: number | null;
  member_id?: number | null;
  reference_id: string;
  idempotency_key: string;
  ipaymu_session_id: string | null;
  ipaymu_trx_id: string | null;
  payment_url: string | null;
  status: PaymentStatus;
  via: PaymentVia | null;
  channel: string | null;
  amount: number;
  fee: number;
  paid_off: number;
  payment_url_created_at: string | null;
  payment_url_expires_at: string | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  booking?: PaymentBooking | null;
  member?: PaymentMember | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const fmtDate = (iso: string) =>
  formatWallClockDate(iso, { dateStyle: "medium" });

export const fmtDateTime = (iso: string) =>
  formatWallClockDate(iso, { withTime: true });

export const fmtTime = (iso: string) => {
  const formatted = formatWallClockDate(iso, { withTime: true });
  const match = /Pukul (\d{2}:\d{2})$/.exec(formatted);
  return match?.[1] ?? "-";
};

export const channelLabel: Record<string, string> = {
  bca: "BCA Virtual Account",
  mandiri: "Mandiri Virtual Account",
  bni: "BNI Virtual Account",
  bri: "BRI Virtual Account",
  qris: "QRIS",
  alfamart: "Alfamart",
  indomaret: "Indomaret",
  visa: "Visa Credit Card",
  mastercard: "Mastercard",
};

export const viaLabel: Record<string, string> = {
  va: "Virtual Account",
  qris: "QRIS",
  cstore: "Convenience Store",
  cc: "Credit Card",
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.className}`}
    >
      <cfg.Icon size={10} weight="fill" />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Payment>();

function usePaymentColumns(onView: (p: Payment) => void) {
  return [
    columnHelper.accessor("reference_id", {
      header: "Referensi",
      enableSorting: false,
      cell: (info) => (
        <div className="flex flex-col">
          <CopyableText
            text={info.getValue() || null}
            className="text-[11px]! font-bold! text-foreground!"
          />
        </div>
      ),
    }),

    columnHelper.display({
      id: "customer",
      header: "Customer",
      cell: (info) => {
        const { booking, member } = info.row.original;
        let customerName = "—";
        let customerPhone = "—";

        if (booking) {
          customerName = booking.customer_name;
          customerPhone = booking.customer_phone;
        } else if (member?.customer) {
          customerName = member.customer.name;
          customerPhone = member.customer.phone || "—";
        }

        return (
          <div className="flex flex-col">
            <CopyableText
              text={customerName || null}
              className="font-semibold! text-xs! text-foreground! "
            />
            <CopyableText
              text={customerPhone || null}
              className="text-[10px]! text-muted-foreground! "
            />
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "layanan",
      header: "Layanan",
      cell: (info) => {
        const { booking, member } = info.row.original;

        if (booking) {
          const { service_variants, booking_bundle_promos } = booking;
          const isBundle =
            booking_bundle_promos && booking_bundle_promos.length > 0;

          const bundle_name = booking_bundle_promos?.[0]?.bundle_name || "";

          if (isBundle) {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-1">
                  <span className="inline-block rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    • {bundle_name}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {service_variants.map((sv) => (
                  <span
                    key={sv.id}
                    className="inline-block rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                  >
                    • {sv.name}
                  </span>
                ))}
              </div>
            </div>
          );
        } else if (member?.membership_package) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                <span className="inline-block rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  • {member.membership_package.name}
                </span>
              </div>
            </div>
          );
        }

        return <span className="text-[10px] text-muted-foreground">—</span>;
      },
    }),

    columnHelper.display({
      id: "jadwal",
      header: "Jadwal / Tipe",
      cell: (info) => {
        const { booking, member } = info.row.original;

        if (booking) {
          const iso = booking.schedule_date;
          const { duration_minutes } = booking;
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">
                {fmtDate(iso)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {fmtTime(iso)} · {duration_minutes / 60}j
              </span>
            </div>
          );
        } else if (member) {
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">
                Keanggotaan
              </span>
            </div>
          );
        }

        return <span className="text-[10px] text-muted-foreground">—</span>;
      },
    }),

    columnHelper.display({
      id: "metode",
      header: "Metode",
      cell: (info) => {
        const { via, channel } = info.row.original;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {channelLabel[channel ?? ""] ?? channel ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {viaLabel[via ?? ""] ?? via ?? "—"}
            </span>
          </div>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),

    columnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">
            {IDR(info.getValue())}
          </span>
          {info.row.original.fee > 0 && (
            <span className="text-[10px] text-muted-foreground">
              +fee {IDR(info.row.original.fee)}
            </span>
          )}
        </div>
      ),
    }),

    columnHelper.accessor("paid_at", {
      header: "Dibayar",
      cell: (info) => {
        const v = info.getValue();
        return v ? (
          <span className="text-xs text-foreground">{fmtDateTime(v)}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex justify-end">
          <button
            aria-label="Lihat struk"
            onClick={() => onView(info.row.original)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            <Eye size={13} weight="regular" />
          </button>
        </div>
      ),
    }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARDS — Semua card SAMA warna background (var(--surface))
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  subtext,
  variant = "default",
}: {
  label: string;
  value: string;
  subtext: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: { color: "var(--foreground)" },
    success: { color: "var(--success)" },
    warning: { color: "var(--warning)" },
    danger: { color: "var(--danger)" },
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding-sm)",
      }}
    >
      <span
        className="uppercase tracking-widest block"
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--muted)",
          letterSpacing: "0.08em",
          marginBottom: "var(--space-2)",
        }}
      >
        {label}
      </span>
      <div
        className="font-bold leading-tight truncate"
        style={{ fontSize: "var(--text-xl)", ...variantStyles[variant] }}
        title={value}
      >
        {value}
      </div>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--muted)",
          marginTop: "var(--space-1)",
          display: "block",
        }}
      >
        {subtext}
      </span>
    </div>
  );
}

function SummaryCards({ payments }: { payments: Payment[] }) {
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.paid_off), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const countExpiredFailed = payments.filter(
    (p) => p.status === "expired" || p.status === "failed",
  ).length;
  const countCash = payments
    .filter((p) => p.channel === "cash")
    .reduce((sum, p) => sum + Number(p.paid_off), 0);

  const countPaid = payments.filter((p) => p.status === "paid").length;
  const countPending = payments.filter((p) => p.status === "pending").length;
  const countCashTrans = payments.filter((p) => p.channel === "cash").length;

  return (
    <div className="min-[1080px]:grid-cols-4 gap-4 grid grid-cols-2 ">
      <SummaryCard
        label="Total Lunas"
        value={IDR(totalPaid)}
        subtext={`${countPaid} transaksi`}
        variant="success"
      />
      <SummaryCard
        label="Menunggu Bayar"
        value={IDR(totalPending)}
        subtext={`${countPending} transaksi`}
        variant="warning"
      />
      <SummaryCard
        label="Expired / Gagal"
        value={String(countExpiredFailed)}
        subtext="transaksi"
        variant="danger"
      />
      <SummaryCard
        label="Cash"
        value={IDR(countCash)}
        subtext={`${countCashTrans} transaksi`}
        variant="default"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER TABS
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  "all",
  "paid",
  "pending",
  "expired",
  "failed",
  "refunded",
] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number];

function FilterTabs({
  value,
  onChange,
  payments,
}: {
  value: FilterOption;
  onChange: (v: FilterOption) => void;
  payments: Payment[];
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: "var(--space-2)",
      }}
    >
      {FILTER_OPTIONS.map((s) => {
        const count =
          s === "all"
            ? payments.length
            : payments.filter((p) => p.status === s).length;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: `var(--space-2) var(--space-4)`,
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              fontWeight: value === s ? 600 : 400,
              backgroundColor: value === s ? "var(--accent)" : "var(--default)",
              color:
                value === s ? "var(--accent-foreground)" : "var(--foreground)",
              border: "none",
              cursor: "pointer",
              transition: "all 150ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {s === "all" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                opacity: value === s ? 1 : 0.6,
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterOption>("all");

  const { data: paymentResponse, isLoading: paymentLoading } = useApiFetch<
    PaginatedApiResponse<Payment>
  >([statusFilter], "/payment/booking-payments");

  const allPayments = paymentResponse?.data?.data ?? [];

  if (paymentLoading) {
    return (
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "var(--background)",
          padding: "var(--page-padding-y) var(--page-padding-x)",
        }}
      >
        <div
          className="animate-pulse rounded-lg"
          style={{
            backgroundColor: "var(--surface)",
            padding: "var(--card-padding-md)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div
            className="mb-4"
            style={{
              height: "var(--text-xl)",
              width: "33%",
              backgroundColor: "var(--surface-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          <div
            className="mb-6"
            style={{
              height: "var(--text-sm)",
              width: "25%",
              backgroundColor: "var(--surface-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: "var(--table-row-height)",
                backgroundColor: "var(--surface-secondary)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-2)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const filtered =
    statusFilter === "all"
      ? allPayments
      : allPayments.filter((p) => p.status === statusFilter);

  const columns = usePaymentColumns((p) => setSelectedPayment(p));

  return (
    <div
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: "bold",
            color: "var(--foreground)",
          }}
        >
          Payments
        </h1>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Kelola dan pantau transaksi pembayaran booking spa
        </p>
      </div>

      {/* Summary Cards */}
      <div>
        <SummaryCards payments={allPayments} />
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          paddingBottom: "var(--space-4)",
          overflowX: "auto",
        }}
      >
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          payments={allPayments}
        />
      </div>

      {/* Table — pakai DataTable component kamu */}
      <DataTable
        data={filtered}
        columns={columns}
        defaultPageSize={10}
        emptyMessage="Tidak ada data pembayaran."
      />

      {/* Receipt Modal */}
      {selectedPayment && (
        <ReceiptModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
