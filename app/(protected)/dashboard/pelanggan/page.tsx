"use client";

import { Avatar, InputGroup, TextField } from "@heroui/react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useApiFetch } from "@/app/libs/use-http";
import Link from "next/link";
import { CopyableText } from "@/app/components/copyable-text";
import { DataTable } from "@/app/components/data-table";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Booking = {
  id: number;
  booking_code: string;
  schedule_date: string;
  status: string;
  total_amount: number;
};

type ActiveMembership = {
  id: number;
  membership_package?: {
    id: number;
    name: string;
  } | null;
};

type Customer = {
  id: number;
  customer_code: string;
  name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  bookings_count: number;
  created_at: string;
  last_booking?: Booking | null;
  active_membership?: ActiveMembership | null;
};

// Backend paginate(20) → response dibungkus paginator Laravel
type PaginatedCustomers = {
  data: {
    data: Customer[];
    total: number;
  };
};

// Ambil per_page besar supaya DataTable (client-side pagination) tetap bisa
// menampilkan & memfilter seluruh pelanggan seperti sebelumnya.
const FETCH_PER_PAGE = 500;

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(iso),
  );

const columnHelper = createColumnHelper<Customer>();

export default function MasterPelangganPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce: tunggu user berhenti ngetik 400ms sebelum query ke backend
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const queryParams = useMemo(
    () => ({
      per_page: FETCH_PER_PAGE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [debouncedSearch],
  );

  const { data: responseData, isLoading } = useApiFetch<PaginatedCustomers>(
    ["customers", debouncedSearch],
    "/customer",
    queryParams,
  );

  const customers = responseData?.data ?? [];

  // ── Kolom tabel ────────────────────────────────────────────────────────
  const columns = [
    columnHelper.display({
      id: "profile",
      header: "Profil Pelanggan",
      cell: (info) => {
        const customer = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="border border-border/50 bg-border/20 shrink-0">
              <Avatar.Fallback className="text-muted font-bold">
                {customer.name?.charAt(0) ?? "?"}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <CopyableText
                text={customer.name || null}
                className="text-sm! font-extrabold! text-foreground!"
              />
              {customer.gender && (
                <span className="text-[11px] uppercase tracking-wider text-muted font-bold mt-0.5">
                  {customer.gender}
                </span>
              )}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("customer_code", {
      header: "Kode Pelanggan",
      cell: (info) => (
        <span className="text-xs font-bold text-muted">
          {info.getValue() || "-"}
        </span>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => (
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
          {info.getValue() || "-"}
        </span>
      ),
    }),
    columnHelper.accessor("phone", {
      header: "No. Telp",
      cell: (info) => {
        const phone = info.getValue();
        if (!phone) {
          return (
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
              -
            </span>
          );
        }
        return (
          <Link
            href={`https://wa.me/${phone}`}
            target="_blank"
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 hover:bg-accent/10 text-muted hover:text-accent text-xs font-bold transition-colors"
          >
            {phone}
          </Link>
        );
      },
    }),
    columnHelper.accessor("active_membership", {
      header: "Membership",
      cell: (info) => {
        const membership = info.getValue();
        if (!membership) {
          return <span className="text-xs text-muted">-</span>;
        }
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
            {membership.membership_package?.name ?? "Member Aktif"}
          </span>
        );
      },
    }),
    columnHelper.accessor("bookings_count", {
      header: "Jumlah Booking",
      cell: (info) => (
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-bold">
          {info.getValue()}x
        </span>
      ),
    }),
    columnHelper.accessor("last_booking", {
      header: "Terakhir Booking",
      cell: (info) => {
        const lastBooking = info.getValue();
        if (!lastBooking) {
          return <span className="text-xs text-muted">-</span>;
        }
        return (
          <div className="flex flex-col">
            <CopyableText
              text={lastBooking.booking_code || null}
              className="text-xs! font-semibold! text-foreground!"
            />
            <span className="text-[11px] text-muted">
              {fmtDate(lastBooking.schedule_date)}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Bergabung",
      cell: (info) => (
        <span className="text-sm text-muted font-semibold">
          {fmtDate(info.getValue())}
        </span>
      ),
    }),
  ];

  return (
    <div
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* HEADER */}
      <div
        className="flex flex-wrap justify-between items-center"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Manajemen Pelanggan
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
              maxWidth: "36rem",
              lineHeight: 1.6,
            }}
          >
            Lihat seluruh data pelanggan beserta jumlah booking mereka.
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <TextField aria-label="Cari pelanggan" className="w-full sm:w-80">
        <InputGroup className="bg-transparent rounded-full border border-border h-11 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all shadow-sm overflow-hidden">
          <InputGroup.Prefix className="pl-4 pr-2 bg-transparent text-muted flex items-center">
            <MagnifyingGlass weight="bold" className="w-4 h-4" />
          </InputGroup.Prefix>
          <InputGroup.Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama, email, atau telepon..."
            className="w-full bg-transparent text-sm font-semibold h-full px-2 outline-none"
          />
        </InputGroup>
      </TextField>

      {/* TABEL */}
      <DataTable
        columns={columns}
        data={customers}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage="Tidak ada data pelanggan."
      />
    </div>
  );
}
