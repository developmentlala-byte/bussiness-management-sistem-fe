"use client";

import { Avatar, InputGroup, TextField } from "@heroui/react";
import { MagnifyingGlass, Users } from "@phosphor-icons/react";
import { useState, useMemo } from "react";
import { useApiFetch } from "@/app/libs/use-http";
import Link from "next/link";
import { CopyableText } from "@/app/components/copyable-text";

type Booking = {
  id: number;
  booking_code: string;
  schedule_date: string;
  status: string;
  total_amount: number;
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
};

export default function MasterPelangganPage() {
  const [search, setSearch] = useState("");

  const { data: responseData, isLoading } = useApiFetch<{ data: Customer[] }>(
    ["customers"],
    "/customer",
  );
  const customers = responseData?.data || [];

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    return customers.filter(
      (customer: Customer) =>
        customer.name?.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, customers]);

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

      {/* CONTENT */}
      <div className="space-y-6">
        {/* TOOLBAR */}
        <div className="flex items-center justify-between">
          <TextField aria-label="Cari pelanggan" className="w-full sm:w-80">
            <InputGroup className="bg-transparent rounded-full border border-border h-11 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all shadow-sm overflow-hidden">
              <InputGroup.Prefix className="pl-4 pr-2 bg-transparent text-muted flex items-center">
                <MagnifyingGlass weight="bold" className="w-4 h-4" />
              </InputGroup.Prefix>
              <InputGroup.Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau telepon..."
                className="w-full bg-transparent text-sm font-semibold h-full px-2 outline-none"
              />
            </InputGroup>
          </TextField>
        </div>

        {/* TABEL DATA */}
        <div className="overflow-x-auto scrollbar-hide pb-10">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-y border-border">
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Profil Pelanggan
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Kode Pelanggan
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  No. Telp
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Jumlah Booking
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Terakhir Booking
                </th>
                <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                  Bergabung
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-border">
                    <td className="py-5 px-4 bg-background sticky left-0 z-10 border-r border-border/50 shadow-[1px_0_0_0_var(--color-border)]">
                      <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-accent/25" />
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="h-3.5 bg-accent/25 rounded-md w-full" />
                          <div className="h-2.5 bg-accent/25 rounded-md w-1/2" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <td
                        key={`skeleton-cell-${i}`}
                        className="p-2.5 border-r border-border/30 last:border-r-0"
                      >
                        <div className="w-full h-[3.5rem] rounded-xl bg-accent/25 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted font-medium text-sm"
                  >
                    Tidak ada data pelanggan.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border hover:bg-border/10 transition-colors group"
                  >
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <Avatar className="border border-border/50 bg-border/20">
                          <Avatar.Fallback className="text-muted font-bold">
                            {customer.name.charAt(0)}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <CopyableText
                            text={customer.name || null}
                            className=" text-sm! font-extrabold! text-foreground!"
                          />

                          {customer.gender && (
                            <span className="text-[11px] uppercase tracking-wider text-muted font-bold mt-1">
                              {customer.gender}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="text-xs font-bold text-muted">
                        {customer.customer_code || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
                        {customer.email || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      {customer.phone ? (
                        <Link
                          href={`https://wa.me/${customer.phone}`}
                          target="_blank"
                          className="text-muted hover:text-accent transition-colors"
                        >
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 hover:bg-accent/10 hover:text-accent text-xs font-bold">
                            {customer.phone}
                          </span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-bold">
                        {customer.bookings_count}x
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      {customer.last_booking ? (
                        <div className="flex flex-col">
                          <CopyableText
                            text={customer.last_booking.booking_code || null}
                            className="text-xs! font-semibold! text-foreground!"
                          />
                          <span className="text-[11px] text-muted">
                            {new Date(
                              customer.last_booking.schedule_date,
                            ).toLocaleDateString("id-ID", {
                              dateStyle: "medium",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="text-sm text-muted font-semibold">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                        }).format(new Date(customer.created_at))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
