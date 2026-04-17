"use client";

import { useState } from "react";
import { Chip, Button } from "@heroui/react";
import { BookingStatus, PaymentStatus, SpaBooking } from "@/app/types/booking";
import { mockBookings } from "@/app/data/mockBookings";
import { Eye, PencilSimple } from "@phosphor-icons/react";
import { DataTable } from "@/app/components/data-table"; // Pastikan ini mengarah ke file DataTable TanStack
import { createColumnHelper } from "@tanstack/react-table";

// Helper untuk warna status reservasi
const getBookingStatusColor = (status: BookingStatus) => {
  const map: Record<
    BookingStatus,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  > = {
    Pending: "warning",
    Confirmed: "primary",
    Completed: "success",
    Cancelled: "danger",
  };
  return map[status];
};

// Helper untuk warna status pembayaran
const getPaymentStatusColor = (status: PaymentStatus) => {
  const map: Record<
    PaymentStatus,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  > = {
    Unpaid: "danger",
    Paid: "success",
    Refunded: "default",
  };
  return map[status];
};

// 1. Gunakan ColumnHelper dari TanStack
const columnHelper = createColumnHelper<SpaBooking>();

export default function BookingsPage() {
  const [data] = useState<SpaBooking[]>(mockBookings);

  // 2. Definisi kolom dengan standard TanStack (menggunakan cell, bukan render)
  const columns = [
    columnHelper.accessor("id", {
      header: "Booking ID",
      cell: (info) => <span className="font-mono ">{info.getValue()}</span>,
    }),

    columnHelper.accessor("customerName", {
      header: "Customer",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{info.getValue()}</span>
          <span className="text-xs text-muted-foreground">
            {info.row.original.customerPhone}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("serviceName", {
      header: "Service & Therapist",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-sm">{info.getValue()}</span>
          <span className="text-xs text-muted-foreground">
            by {info.row.original.therapistName}
          </span>
        </div>
      ),
    }),

    columnHelper.accessor("scheduleDate", {
      header: "Schedule",
      cell: (info) => {
        const date = new Date(info.getValue());
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                date,
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(
                date,
              )}{" "}
              ({info.row.original.durationMinutes} min)
            </span>
          </div>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const payment = info.row.original.paymentStatus;
        return (
          <div className="flex gap-2 items-center">
            {/* Note: HeroUI Chip menggunakan 'variant' (solid/flat/faded) dan 'color' (primary/success/dll) */}
            <Chip
              size="sm"
              variant="primary"
              color={getBookingStatusColor(status)}
            >
              {status}
            </Chip>
            {/* <Chip
              size="sm"
              variant="primary"
              color={getPaymentStatusColor(payment)}
            >
              {payment}
            </Chip> */}
          </div>
        );
      },
    }),

    columnHelper.accessor("totalAmount", {
      header: "Amount",
      cell: (info) => (
        <span className="font-medium">
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(info.getValue())}
        </span>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: () => (
        <div className="flex justify-end gap-2">
          {/* Note: Menggunakan varian 'primary' agar icon button tidak terlihat memblok (clean design) */}
          <Button
            isIconOnly
            size="sm"
            variant="primary"
            aria-label="View details"
          >
            <Eye className="size-4" weight="regular" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="primary"
            aria-label="Edit booking"
          >
            <PencilSimple className="size-4" weight="regular" />
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Spa Reservations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your upcoming treatments and staff schedules.
          </p>
        </div>
        <Button variant="primary">New Booking</Button>
      </div>

      {/* Perhatikan props yang dikirim ke DataTable (Hanya columns, data, dan opsional pageSize) */}
      <DataTable columns={columns} data={data} pageSize={10} />
    </div>
  );
}
