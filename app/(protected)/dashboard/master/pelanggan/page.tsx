"use client";

import { Avatar, InputGroup, TextField, Chip } from "@heroui/react";
import {
  MagnifyingGlass,
  Users,
  Crown,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { useState, useMemo } from "react";
import { useApiFetch } from "@/app/libs/use-http";
import Link from "next/link";

type Booking = {
  id: number;
  booking_code: string;
  schedule_date: string;
  status: string;
  total_amount: number;
};

type ServiceVariant = {
  id: number;
  name: string;
};

type MembershipPackageVariant = {
  id: number;
  service_variant_id: number;
  quota: number;
  service_variant?: ServiceVariant;
};

type MembershipPackage = {
  id: number;
  name: string;
  variants?: MembershipPackageVariant[];
};

type CustomerMembership = {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
  remaining_quota?: Record<number, number>;
  membership_package?: MembershipPackage;
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
  active_membership?: CustomerMembership | null;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    dateStyle: "medium",
  });
};

export default function MasterPelangganPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

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
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Manajemen Pelanggan
          </h1>
          <p className="text-muted text-sm mt-1.5 max-w-xl leading-relaxed">
            Lihat seluruh data pelanggan beserta status membership mereka.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: CUSTOMER LIST */}
        <div className="lg:w-1/2 space-y-6">
          {/* TOOLBAR */}
          <div className="flex items-center justify-between">
            <TextField aria-label="Cari pelanggan" className="w-full">
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

          {/* CUSTOMER LIST */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-20 bg-muted/20 rounded-xl animate-pulse"
                />
              ))
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-muted font-medium text-sm border border-dashed border-border rounded-xl">
                Tidak ada data pelanggan.
              </div>
            ) : (
              filteredCustomers.map((customer: Customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedCustomer?.id === customer.id
                      ? "bg-accent text-accent-foreground border-accent shadow-md"
                      : "bg-surface border-border hover:bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="border border-border/50 bg-border/20">
                      <Avatar.Fallback className="text-muted font-bold">
                        {customer.name.charAt(0)}
                      </Avatar.Fallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold truncate">
                          {customer.name}
                        </span>
                        {customer.active_membership && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="success"
                            startContent={<Crown className="w-3 h-3" />}
                          >
                            Member
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted/80">
                          {customer.phone || "-"}
                        </span>
                        <span className="text-xs text-muted/60">•</span>
                        <span className="text-xs text-muted/80">
                          {customer.bookings_count}x booking
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: CUSTOMER DETAIL */}
        <div className="lg:w-1/2">
          {!selectedCustomer ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Users className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">
                Pilih pelanggan untuk melihat detail
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CUSTOMER INFO CARD */}
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 border border-border/50 bg-border/20 text-lg">
                    <Avatar.Fallback className="text-muted font-bold">
                      {selectedCustomer.name.charAt(0)}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">
                        {selectedCustomer.name}
                      </h2>
                      {selectedCustomer.active_membership && (
                        <Chip
                          size="sm"
                          variant="flat"
                          color="success"
                          startContent={<Crown className="w-3 h-3" />}
                        >
                          {
                            selectedCustomer.active_membership
                              .membership_package?.name
                          }
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {selectedCustomer.customer_code}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                      {selectedCustomer.phone && (
                        <Link
                          href={`https://wa.me/${selectedCustomer.phone}`}
                          target="_blank"
                          className="text-muted hover:text-accent transition-colors"
                        >
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-border/20 hover:bg-accent/10 hover:text-accent text-xs font-bold">
                            {selectedCustomer.phone}
                          </span>
                        </Link>
                      )}
                      {selectedCustomer.email && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
                          {selectedCustomer.email}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-bold">
                        {selectedCustomer.bookings_count}x booking
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MEMBERSHIP INFO */}
              {selectedCustomer.active_membership ? (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-accent/10">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Crown className="w-5 h-5 text-accent" />
                      Membership Aktif
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Paket
                        </span>
                        <p className="font-semibold">
                          {
                            selectedCustomer.active_membership
                              .membership_package?.name
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Status
                        </span>
                        <p className="font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-success" />
                          Aktif
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Mulai
                        </span>
                        <p className="font-semibold">
                          {formatDate(
                            selectedCustomer.active_membership.start_date,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Berakhir
                        </span>
                        <p className="font-semibold flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {formatDate(
                            selectedCustomer.active_membership.end_date,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                        Kuota Layanan
                      </h4>
                      <div className="space-y-2">
                        {selectedCustomer.active_membership.membership_package?.variants?.map(
                          (variant) => {
                            const remaining =
                              selectedCustomer.active_membership
                                ?.remaining_quota?.[
                                variant.service_variant_id
                              ] ?? variant.quota;
                            const used = variant.quota - remaining;
                            const percentage = (used / variant.quota) * 100;

                            return (
                              <div
                                key={variant.id}
                                className="p-3 bg-surface-secondary/30 rounded-xl"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm font-medium">
                                    {variant.service_variant?.name}
                                  </span>
                                  <span className="text-xs font-bold text-muted">
                                    {remaining}/{variant.quota}
                                  </span>
                                </div>
                                <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted mx-auto mb-3" />
                    <h3 className="text-sm font-semibold">
                      Belum Memiliki Membership
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Pelanggan ini belum terdaftar sebagai member
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
