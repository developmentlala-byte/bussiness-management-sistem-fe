"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Package,
  WarningCircle,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { useApiFetch } from "@/app/libs/use-http";
import { textStyle } from "@/app/libs/text-style";
import { formatRupiah } from "@/app/libs/format-rupiah";
import { MembershipSkeleton } from "./components/membership-skeleton";
import MembershipFormModal from "./modal/membership-form-modal";
import { DeleteMembershipModal } from "./modal/delete-membership-modal";
import { MembershipPackage, ServiceVariantOption } from "./types";

interface CategoryResponse {
  id: number;
  name: string;
  services: {
    id: number;
    name: string;
    variants: {
      id: number;
      name: string;
      duration_minutes: number;
      retail_price: string | number;
    }[];
  }[];
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}j ${mins > 0 ? `${mins}m` : ""}`;
  }
  return `${mins}m`;
};

export default function MembershipPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePackageId, setActivePackageId] = useState<number | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    data: packageResponse,
    isLoading,
    isError,
  } = useApiFetch<{ data: MembershipPackage[] }>(
    ["membership-packages"],
    "/master/membership-packages",
  );

  const { data: categoryResponse } = useApiFetch<{ data: CategoryResponse[] }>(
    ["categories"],
    "/master/categories",
  );

  const packages: MembershipPackage[] = useMemo(
    () => packageResponse?.data || [],
    [packageResponse],
  );

  const variantOptions: ServiceVariantOption[] = useMemo(() => {
    const categories = categoryResponse?.data || [];
    const options: ServiceVariantOption[] = [];

    categories.forEach((category) => {
      category.services?.forEach((service) => {
        service.variants?.forEach((variant) => {
          options.push({
            id: variant.id,
            name: variant.name,
            serviceName: service.name,
            categoryName: category.name,
            retail_price: variant.retail_price,
            duration_minutes: variant.duration_minutes,
          });
        });
      });
    });

    return options;
  }, [categoryResponse]);

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description?.toLowerCase().includes(q),
    );
  }, [packages, searchQuery]);

  const activePackage = useMemo(
    () => packages.find((pkg) => pkg.id === activePackageId) ?? null,
    [packages, activePackageId],
  );

  useEffect(() => {
    if (filteredPackages.length === 0) {
      setActivePackageId(null);
      return;
    }

    const stillExists = filteredPackages.some(
      (pkg) => pkg.id === activePackageId,
    );

    if (!activePackageId || !stillExists) {
      setActivePackageId(filteredPackages[0].id);
    }
  }, [filteredPackages, activePackageId]);

  if (isLoading) return <MembershipSkeleton />;

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <WarningCircle className="w-12 h-12 text-danger mb-4" weight="fill" />
        <h3 className="text-lg font-bold">Gagal Memuat Paket Membership</h3>
        <p className="text-muted text-sm mt-1">
          Periksa koneksi API dan pastikan migration sudah dijalankan.
        </p>
      </div>
    );
  }

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
            Master Membership
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Kelola paket membership dan kuota layanan untuk pelanggan.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
          <div className="relative" style={{ width: "16rem" }}>
            <MagnifyingGlass
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{
                width: "var(--icon-sm)",
                height: "var(--icon-sm)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Cari paket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "var(--space-10)",
                paddingRight: "var(--space-4)",
                paddingTop: "var(--space-2)",
                paddingBottom: "var(--space-2)",
                backgroundColor: "var(--field-background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                fontSize: "var(--text-sm)",
                color: "var(--field-foreground)",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              borderRadius: "var(--radius-xl)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          >
            <Plus
              weight="bold"
              style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
            />
            <span className="hidden sm:inline">Tambah Paket</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col min-[1080px]:flex-row gap-6 min-[1080px]:gap-8">
        <aside className="min-[1080px]:w-72 shrink-0">
          <div className="min-[1080px]:sticky min-[1080px]:top-6 space-y-2">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider px-2 mb-3 hidden min-[1080px]:block">
              Daftar Paket
            </h2>

            {filteredPackages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted border border-dashed border-border rounded-xl">
                Belum ada paket membership
              </div>
            ) : (
              filteredPackages.map((pkg) => {
                const isActive = activePackageId === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setActivePackageId(pkg.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isActive
                        ? "bg-accent text-accent-foreground border-accent shadow-md"
                        : "bg-surface border-border hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {textStyle(pkg.name, "capitalize")}
                        </p>
                        <p
                          className={`text-xs mt-0.5 truncate ${
                            isActive
                              ? "text-accent-foreground/80"
                              : "text-muted"
                          }`}
                        >
                          Rp {formatRupiah(pkg.price)} · {pkg.duration_days}{" "}
                          hari
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? "bg-black/10"
                            : pkg.is_active
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-muted/30 text-muted"
                        }`}
                      >
                        {pkg.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!activePackage ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">
                Pilih atau buat paket membership
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">
                        {textStyle(activePackage.name, "capitalize")}
                      </h2>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          activePackage.is_active
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-muted/30 text-muted"
                        }`}
                      >
                        {activePackage.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    {activePackage.description && (
                      <p className="text-sm text-muted mt-2">
                        {activePackage.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Harga Paket
                        </span>
                        <p className="font-semibold">
                          Rp {formatRupiah(activePackage.price)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Durasi
                        </span>
                        <p className="font-semibold flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {activePackage.duration_days} hari
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Jumlah Varian
                        </span>
                        <p className="font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {(activePackage.variants || []).length} jenis layanan
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary"
                    >
                      <PencilSimple className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => setIsDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-danger/30 text-danger rounded-lg hover:bg-danger/5"
                    >
                      <Trash className="w-4 h-4" /> Hapus
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surface-secondary/30">
                  <h3 className="text-sm font-semibold">Kuota Layanan</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary/50 text-muted text-xs uppercase">
                    <tr>
                      <th className="text-left px-6 py-3">Layanan</th>
                      <th className="text-left px-6 py-3">Durasi</th>
                      <th className="text-right px-6 py-3">Kuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePackage.variants || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-8 text-center text-muted"
                        >
                          Belum ada varian layanan
                        </td>
                      </tr>
                    ) : (
                      activePackage.variants?.map((variant) => (
                        <tr
                          key={variant.id}
                          className="border-t border-border/60"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium">
                              {variant.service_variant?.name || "—"}
                            </p>
                            <p className="text-xs text-muted">
                              {variant.service_variant?.service?.name || ""}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-muted">
                            {variant.service_variant?.service ? (
                              "—"
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDuration(
                                  variant.service_variant?.duration_minutes ||
                                    0,
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-accent/15 text-accent text-sm font-bold">
                              {variant.quota}x
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <MembershipFormModal
          onClose={() => setIsCreateOpen(false)}
          variantOptions={variantOptions}
        />
      )}

      {isEditOpen && activePackage && (
        <MembershipFormModal
          onClose={() => setIsEditOpen(false)}
          variantOptions={variantOptions}
          membership={activePackage}
        />
      )}

      {isDeleteOpen && activePackage && (
        <DeleteMembershipModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          membership={activePackage}
          onDeleted={() => setActivePackageId(null)}
        />
      )}
    </div>
  );
}
