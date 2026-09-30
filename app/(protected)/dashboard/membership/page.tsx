"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  CheckCircle,
  Warning,
  XCircle,
  Plus,
  Icon,
} from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/app/components/data-table";
import { useApiFetch } from "@/app/libs/use-http";
import { IDR } from "@/app/libs/idr";
import { CopyableText } from "@/app/components/copyable-text";
import PurchaseMembershipModal from "./components/PurchaseMembershipModal";

const columnHelper = createColumnHelper<MemberMembershipRow>();

type MemberMembershipStatus = "active" | "expired" | "cancelled";

type MemberCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  address?: string | null;
};

type MemberMembershipPackageVariant = {
  id?: number;
  quota?: number;
  service_variant?: {
    id?: number;
    name?: string;
  } | null;
};

type MemberMembershipBenefit = {
  id?: number;
  service_category_id?: number | null;
  service_id?: number | null;
  service_variant_id?: number | null;
  quota?: number;
  service_category?: { id?: number; name?: string } | null;
  service?: { id?: number; name?: string } | null;
  service_variant?: {
    id?: number;
    name?: string;
  } | null;
};

type MemberMembershipPackage = {
  id: number;
  name: string;
  price?: number | string;
  duration_days?: number;
  benefits?: MemberMembershipBenefit[];
  variants?: MemberMembershipPackageVariant[];
};

type MemberQuotaUsage = {
  id?: number;
  usage_count?: number;
  membership_package_benefit_id?: number | null;
  membership_package_variant_id?: number | null;
  service_variant?: {
    id?: number;
    name?: string;
    bms_ms_service_id?: number;
    service?: {
      id?: number;
      bms_ms_service_category_id?: number;
      category?: { id?: number } | null;
    } | null;
  } | null;
};

type MemberPayment = {
  id?: number;
  status?: string;
  amount?: number;
  created_at?: string;
};

type MemberMembershipRow = {
  id: number;
  customer?: MemberCustomer | null;
  membership_package?: MemberMembershipPackage | null;
  status: MemberMembershipStatus;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  remaining_quota?: Record<string, number> | null;
  is_expired?: boolean;
  is_paid?: boolean;
  quota_usages?: MemberQuotaUsage[] | null;
  payments?: MemberPayment[] | null;
};

type StatusFilter = "all" | MemberMembershipStatus;

const STATUS_CONFIG: Record<
  MemberMembershipStatus,
  { label: string; className: string; Icon: Icon }
> = {
  active: {
    label: "Aktif",
    className: "bg-emerald-500/10 text-emerald-600",
    Icon: CheckCircle,
  },
  expired: {
    label: "Expired",
    className: "bg-muted/20 text-muted-foreground",
    Icon: Warning,
  },
  cancelled: {
    label: "Batal",
    className: "bg-red-500/10 text-red-600",
    Icon: XCircle,
  },
};

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const statusBadge = (status: MemberMembershipStatus) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.className}`}
    >
      <Icon size={10} weight="fill" />
      {cfg.label}
    </span>
  );
};

const FILTER_OPTIONS: Array<StatusFilter> = [
  "all",
  "active",
  "expired",
  "cancelled",
];

const getMembershipBenefits = (
  membershipPackage?: MemberMembershipPackage | null,
): MemberMembershipBenefit[] =>
  membershipPackage?.benefits?.length
    ? membershipPackage.benefits
    : (membershipPackage?.variants ?? []).map((variant) => ({
        id: variant.id,
        service_variant_id: variant.service_variant?.id,
        service_variant: variant.service_variant,
        quota: variant.quota,
      }));

const getMembershipBenefitUsage = (
  member: MemberMembershipRow,
  benefits: MemberMembershipBenefit[],
) => {
  const usedByBenefit = new Map<number, number>();
  const benefitScope = (benefit: MemberMembershipBenefit) => {
    if (benefit.service_variant_id != null) return 3;
    if (benefit.service_id != null) return 2;
    if (benefit.service_category_id != null) return 1;
    return 0;
  };

  const orderedBenefits = benefits
    .filter((benefit) => benefit.id != null)
    .slice()
    .sort(
      (a, b) => benefitScope(b) - benefitScope(a) || (a.id ?? 0) - (b.id ?? 0),
    );

  (member.quota_usages ?? []).forEach((usage) => {
    const count = Math.max(0, usage.usage_count ?? 0);
    if (!count) return;

    const explicitBenefitId = usage.membership_package_benefit_id;
    if (explicitBenefitId != null) {
      usedByBenefit.set(
        explicitBenefitId,
        (usedByBenefit.get(explicitBenefitId) ?? 0) + count,
      );
      return;
    }

    const legacyVariantId = usage.membership_package_variant_id;
    if (legacyVariantId != null) {
      usedByBenefit.set(
        legacyVariantId,
        (usedByBenefit.get(legacyVariantId) ?? 0) + count,
      );
      return;
    }

    const variant = usage.service_variant;
    const serviceId = variant?.bms_ms_service_id ?? variant?.service?.id;
    const categoryId =
      variant?.service?.bms_ms_service_category_id ??
      variant?.service?.category?.id;
    const matchingBenefits = orderedBenefits.filter((benefit) => {
      if (benefit.service_variant_id != null) {
        return benefit.service_variant_id === variant?.id;
      }
      if (benefit.service_id != null) {
        return benefit.service_id === serviceId;
      }
      if (benefit.service_category_id != null) {
        return benefit.service_category_id === categoryId;
      }
      return false;
    });

    let unallocated = count;
    matchingBenefits.forEach((benefit) => {
      if (unallocated <= 0 || benefit.id == null) return;
      const benefitId = benefit.id;
      const alreadyUsed = usedByBenefit.get(benefitId) ?? 0;
      const available = Math.max(0, (benefit.quota ?? 0) - alreadyUsed);
      const allocated = Math.min(unallocated, available);
      if (allocated > 0) {
        usedByBenefit.set(benefitId, alreadyUsed + allocated);
        unallocated -= allocated;
      }
    });
  });

  return usedByBenefit;
};

const getMembershipQuotaSummary = (member: MemberMembershipRow) => {
  const benefits = getMembershipBenefits(member.membership_package);
  const usedByBenefit = getMembershipBenefitUsage(member, benefits);
  const total = benefits.reduce(
    (sum, benefit) => sum + (benefit.quota ?? 0),
    0,
  );
  const used = benefits.reduce(
    (sum, benefit) =>
      sum + (benefit.id == null ? 0 : (usedByBenefit.get(benefit.id) ?? 0)),
    0,
  );

  return {
    benefits,
    total,
    used,
    remaining: Math.max(0, total - used),
    usedByBenefit,
  };
};

export default function MembershipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  useEffect(() => {
    const paymentRef = searchParams.get("payment_ref");
    const result = searchParams.get("result");

    if (!paymentRef || !result) return;

    if (result === "success") {
      toast.success("Pembayaran membership berhasil", {
        description: `Transaksi ${paymentRef} sudah diterima dan status membership Anda diperbarui.`,
      });
    } else if (result === "cancel") {
      toast.warning("Pembayaran membership dibatalkan", {
        description: `Transaksi ${paymentRef} belum selesai. Anda masih bisa mencoba kembali.`,
      });
    }

    router.replace("/dashboard/membership");
  }, [router, searchParams]);

  const { data, isLoading } = useApiFetch<{ data: MemberMembershipRow[] }>(
    ["customer-memberships", statusFilter, search],
    "/master/customer-memberships",
    { status: statusFilter === "all" ? undefined : statusFilter },
  );

  const memberships = useMemo(() => data?.data ?? [], [data]);

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return memberships.filter((member) => {
      const matchStatus =
        statusFilter === "all" || member.status === statusFilter;

      if (!matchStatus) return false;

      if (!query) return true;

      const customer = member.customer ?? null;
      const packageName = member.membership_package?.name ?? "";
      const name = customer?.name ?? "";
      const phone = customer?.phone ?? "";
      const email = customer?.email ?? "";

      return (
        name.toLowerCase().includes(query) ||
        packageName.toLowerCase().includes(query) ||
        phone.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query)
      );
    });
  }, [memberships, search, statusFilter]);

  const summary = useMemo(() => {
    const total = memberships.length;
    const active = memberships.filter((m) => m.status === "active").length;
    const expired = memberships.filter((m) => m.status === "expired").length;
    const cancelled = memberships.filter(
      (m) => m.status === "cancelled",
    ).length;
    const collected = memberships
      .flatMap((m) => m.payments ?? [])
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (Number(p.amount) ?? 0), 0);

    return { total, active, expired, cancelled, collected };
  }, [memberships]);

  const renderMembershipDetails = (member: MemberMembershipRow) => {
    const benefits = getMembershipBenefits(member.membership_package);
    const usedByBenefit = getMembershipBenefitUsage(member, benefits);

    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Rincian benefit
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ringkasan kuota untuk setiap layanan dalam paket ini.
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {benefits.length} layanan
          </span>
        </div>

        {benefits.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Belum ada benefit pada paket membership ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-sm">
              <thead className="bg-muted/35">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th
                    scope="col"
                    className="rounded-l-md px-3 py-2.5 font-semibold"
                  >
                    Benefit
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Kuota
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Terpakai
                  </th>
                  <th
                    scope="col"
                    className="rounded-r-md px-3 py-2.5 text-right font-semibold"
                  >
                    Sisa
                  </th>
                </tr>
              </thead>
              <tbody>
                {benefits.map((benefit) => {
                  const benefitId = benefit.id;
                  const quota = benefit.quota ?? 0;
                  const used =
                    benefitId == null ? 0 : (usedByBenefit.get(benefitId) ?? 0);
                  const remaining = Math.max(0, quota - used);
                  const scopeLabel =
                    benefit.service_variant_id != null
                      ? "Variant"
                      : benefit.service_id != null
                        ? "Layanan"
                        : benefit.service_category_id != null
                          ? "Kategori"
                          : "Benefit";

                  return (
                    <tr
                      key={
                        benefitId ??
                        `${scopeLabel}-${benefit.service_category_id ?? benefit.service_id ?? benefit.service_variant_id}`
                      }
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-3 py-3 font-medium text-foreground">
                        <div>
                          {benefit.service_variant?.name ??
                            benefit.service?.name ??
                            benefit.service_category?.name ??
                            "Benefit layanan"}
                        </div>
                        <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                          {scopeLabel}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {quota}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {used}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className="inline-flex min-w-8 justify-center rounded-md bg-accent/10 px-2 py-1 font-semibold text-accent">
                          {remaining}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const columns = [
    columnHelper.display({
      id: "member",
      header: "Member",
      cell: (info) => {
        const member = info.row.original;
        const customer = member.customer;
        const name = customer?.name ?? "-";
        const phone = customer?.phone ?? "-";

        return (
          <div className="flex items-center gap-3 min-w-52">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
              {name.charAt(0).toUpperCase() || "M"}
            </div>
            <div className="min-w-0 ">
              <CopyableText
                text={name}
                className="text-sm! font-bold! text-foreground!"
              />
              <div className="">
                <CopyableText
                  text={phone}
                  className="text-[11px] text-muted-foreground "
                />
              </div>
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "paket",
      header: "Paket Membership",
      cell: (info) => {
        const pkg = info.row.original.membership_package;
        if (!pkg) return <span className="text-xs text-muted">-</span>;

        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground">
              {pkg.name}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {pkg.duration_days ? `${pkg.duration_days} hari` : "-"}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: (info) => statusBadge(info.row.original.status),
    }),
    columnHelper.display({
      id: "periode",
      header: "Periode",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-foreground">
              {fmtDate(row.start_date)}
            </span>
            <span className="text-muted-foreground">
              s/d {fmtDate(row.end_date)}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "kuota",
      header: "Sisa / Total Kuota",
      cell: (info) => {
        const row = info.row.original;
        const { total, remaining } = getMembershipQuotaSummary(row);

        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {remaining} / {total}
            </span>
            <span className="text-[10px] text-muted-foreground">
              sisa / total
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "pemakaian",
      header: "Pemakaian",
      cell: (info) => {
        const row = info.row.original;
        const { used } = getMembershipQuotaSummary(row);

        return used > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {used}x
            </span>
            <span className="text-[10px] text-muted-foreground">pemakaian</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Belum dipakai</span>
        );
      },
    }),
    columnHelper.display({
      id: "pembayaran",
      header: "Pembayaran",
      cell: (info) => {
        const row = info.row.original;
        const paid =
          row.payments?.filter((p) => p.status === "paid").length ?? 0;
        const paymentStatus = row.is_paid ? "Lunas" : "Belum";

        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {paymentStatus}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {paid} transaksi
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "amount",
      header: "Amount",
      cell: (info) => {
        const row = info.row.original;
        const amount = Number(row.payments?.[0]?.amount) ?? 0;

        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {IDR(amount)}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "terakhir",
      header: "Update Terakhir",
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className="text-xs text-muted-foreground">
            {fmtDateTime(row.created_at)}
          </span>
        );
      },
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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Daftar Member Membership
          </h1>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
            Semua data member aktif beserta paket, status, periode, dan catatan
            pemakaian.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPurchaseOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Beli Membership
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Total Member
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {summary.total}
          </div>
          <div className="text-[11px] text-muted">Semua data member</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Aktif
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {summary.active}
          </div>
          <div className="text-[11px] text-muted">Member berlaku saat ini</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Expired
          </div>
          <div className="mt-2 text-2xl font-bold text-warning">
            {summary.expired}
          </div>
          <div className="text-[11px] text-muted">Perlu perhatian</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Pendapatan
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {IDR(Number(summary.collected))}
          </div>
          <div className="text-[11px] text-muted">Dari payment yang lunas</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => {
              const active = option === statusFilter;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatusFilter(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/10 text-muted-foreground hover:bg-muted/20"
                  }`}
                >
                  {option === "all" ? "Semua" : STATUS_CONFIG[option].label}
                </button>
              );
            })}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, paket, email, atau nomor HP..."
            className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={visibleMembers}
        isLoading={isLoading}
        emptyMessage="Belum ada data member membership."
        defaultPageSize={10}
        getRowCanExpand={(row) =>
          (row.original.membership_package?.benefits?.length ?? 0) > 0 ||
          (row.original.membership_package?.variants?.length ?? 0) > 0
        }
        renderExpandedRow={(row) => renderMembershipDetails(row.original)}
        expandable
      />

      <PurchaseMembershipModal
        open={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        onSuccess={() => setStatusFilter("all")}
      />
    </div>
  );
}
