"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Package,
  Percent,
  WarningCircle,
  Tag,
} from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useApiFetch, useRemove } from "@/app/libs/use-http";
import { textStyle } from "@/app/libs/text-style";
import { formatRupiah } from "@/app/libs/format-rupiah";
import { BundlePromoSkeleton } from "./components/bundle-skeleton";
import { BundleFormModal } from "./modal/bundle-form-modal";
import { DeleteBundleModal } from "./modal/delete-bundle-modal";
import { BundleDiscountModal } from "./modal/bundle-discount-modal";
import {
  BundleDiscount,
  BundlePromo,
  ServiceVariantOption,
  formatBundleDiscount,
  formatDateLabel,
  formatDuration,
  getBundleStatus,
} from "./types";

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

const STATUS_LABEL: Record<
  ReturnType<typeof getBundleStatus>,
  { label: string; className: string }
> = {
  active: {
    label: "Aktif",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  coming_soon: {
    label: "Coming Soon",
    className: "bg-primary/15 text-primary",
  },
  expired: {
    label: "Berakhir",
    className: "bg-muted/30 text-muted",
  },
  inactive: {
    label: "Nonaktif",
    className: "bg-danger/10 text-danger",
  },
};

export default function BundlePromoPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBundleId, setActiveBundleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"bundle" | "discount">("bundle");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState<BundleDiscount | null>(
    null,
  );

  const {
    data: bundleResponse,
    isLoading,
    isError,
  } = useApiFetch<{ data: BundlePromo[] }>(
    ["bundle-promo"],
    "/master/bundle-promo",
  );

  const { data: categoryResponse } = useApiFetch<{ data: CategoryResponse[] }>(
    ["categories"],
    "/master/categories",
  );

  const bundles: BundlePromo[] = useMemo(
    () => bundleResponse?.data || [],
    [bundleResponse],
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

  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;
    const q = searchQuery.toLowerCase();
    return bundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(q) ||
        bundle.description?.toLowerCase().includes(q),
    );
  }, [bundles, searchQuery]);

  const activeBundle = useMemo(
    () => bundles.find((bundle) => bundle.id === activeBundleId) ?? null,
    [bundles, activeBundleId],
  );

  useEffect(() => {
    if (filteredBundles.length === 0) {
      setActiveBundleId(null);
      return;
    }

    const stillExists = filteredBundles.some(
      (bundle) => bundle.id === activeBundleId,
    );

    if (!activeBundleId || !stillExists) {
      setActiveBundleId(filteredBundles[0].id);
    }
  }, [filteredBundles, activeBundleId]);

  const { mutate: deleteDiscount } = useRemove(
    (discount: BundleDiscount) =>
      `/master/bundle-promo/discount/${discount.id}`,
    {
      invalidate: [["bundle-promo"]],
      onSuccess: () => {
        toast.success("Diskon dihapus");
      }, // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast.danger("Gagal", { description: err?.response?.data?.message });
      },
    },
  );

  if (isLoading) return <BundlePromoSkeleton />;

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <WarningCircle className="w-12 h-12 text-danger mb-4" weight="fill" />
        <h3 className="text-lg font-bold">Gagal Memuat Bundle Promo</h3>
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
            Master Bundle Promo
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Kelola paket bundle promo dan aturan diskon tambahan.
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
              placeholder="Cari bundle..."
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
            <span className="hidden sm:inline">Tambah Bundle</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col min-[1080px]:flex-row gap-6 min-[1080px]:gap-8">
        <aside className="min-[1080px]:w-72 shrink-0">
          <div className="min-[1080px]:sticky min-[1080px]:top-6 space-y-2">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider px-2 mb-3 hidden min-[1080px]:block">
              Daftar Bundle
            </h2>

            {filteredBundles.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted border border-dashed border-border rounded-xl">
                Belum ada bundle promo
              </div>
            ) : (
              filteredBundles.map((bundle) => {
                const status = getBundleStatus(bundle);
                const statusMeta = STATUS_LABEL[status];
                const isActive = activeBundleId === bundle.id;

                return (
                  <button
                    key={bundle.id}
                    onClick={() => setActiveBundleId(bundle.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isActive
                        ? "bg-accent text-accent-foreground border-accent shadow-md"
                        : "bg-surface border-border hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {textStyle(bundle.name, "capitalize")}
                        </p>
                        <p
                          className={`text-xs mt-0.5 truncate ${
                            isActive
                              ? "text-accent-foreground/80"
                              : "text-muted"
                          }`}
                        >
                          {formatBundleDiscount(bundle)} ·{" "}
                          {(bundle.bundle_items || []).length} item
                          {bundle.max_quantity !== null
                            ? ` · ${bundle.used_count}/${bundle.max_quantity}x`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isActive ? "bg-black/10" : statusMeta.className
                        }`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!activeBundle ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">Pilih atau buat bundle promo</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">
                        {textStyle(activeBundle.name, "capitalize")}
                      </h2>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          STATUS_LABEL[getBundleStatus(activeBundle)].className
                        }`}
                      >
                        {STATUS_LABEL[getBundleStatus(activeBundle)].label}
                      </span>
                    </div>
                    {activeBundle.description && (
                      <p className="text-sm text-muted mt-2">
                        {activeBundle.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Diskon Bundle
                        </span>
                        <p className="font-semibold">
                          {formatBundleDiscount(activeBundle)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted text-xs uppercase tracking-wide">
                          Periode
                        </span>
                        <p className="font-semibold">
                          {formatDateLabel(activeBundle.start_date)} —{" "}
                          {formatDateLabel(activeBundle.end_date)}
                        </p>
                      </div>
                      {activeBundle.max_quantity !== null && (
                        <div>
                          <span className="text-muted text-xs uppercase tracking-wider">
                            Kuota
                          </span>
                          <p className="font-semibold">
                            {activeBundle.used_count} /{" "}
                            {activeBundle.max_quantity}
                          </p>
                        </div>
                      )}
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

              <div className="flex gap-2 border-b border-border">
                <button
                  onClick={() => setActiveTab("bundle")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    activeTab === "bundle"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> Item Bundle
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("discount")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    activeTab === "discount"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Percent className="w-4 h-4" /> Diskon Tambahan
                  </span>
                </button>
              </div>

              {activeTab === "bundle" ? (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-secondary/50 text-muted text-xs uppercase">
                      <tr>
                        <th className="text-left px-4 py-3">Layanan</th>
                        <th className="text-left px-4 py-3">Durasi</th>
                        <th className="text-left px-4 py-3">Harga</th>
                        <th className="text-right px-4 py-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeBundle.bundle_items || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-muted"
                          >
                            Belum ada item
                          </td>
                        </tr>
                      ) : (
                        activeBundle.bundle_items?.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-border/60"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium">
                                {item.service_variant?.name || "—"}
                                {item.duration_minutes ? (
                                  <span className="ml-1.5 text-xs font-semibold text-accent">
                                    · {formatDuration(item.duration_minutes)}
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted">
                                {item.service_variant?.service?.name || ""}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {item.duration_minutes
                                ? formatDuration(item.duration_minutes)
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              Rp {formatRupiah(item.price || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {item.quantity}x
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted">
                      Diskon tier berdasarkan minimal kuantitas pembelian
                      bundle.
                    </p>
                    <button
                      onClick={() => {
                        setActiveDiscount(null);
                        setIsDiscountOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-lg"
                    >
                      <Tag className="w-4 h-4" /> Tambah Diskon
                    </button>
                  </div>

                  <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-secondary/50 text-muted text-xs uppercase">
                        <tr>
                          <th className="text-left px-4 py-3">Min. Qty</th>
                          <th className="text-left px-4 py-3">Diskon</th>
                          <th className="text-left px-4 py-3">Periode</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-right px-4 py-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeBundle.discounts || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-muted"
                            >
                              Belum ada diskon tambahan
                            </td>
                          </tr>
                        ) : (
                          activeBundle.discounts?.map((discount) => (
                            <tr
                              key={discount.id}
                              className="border-t border-border/60"
                            >
                              <td className="px-4 py-3 font-semibold">
                                {discount.min_quantity}x
                              </td>
                              <td className="px-4 py-3">
                                {discount.discount_type === "percentage"
                                  ? `${discount.discount_value}%`
                                  : `Rp ${formatRupiah(discount.discount_value)}`}
                              </td>
                              <td className="px-4 py-3 text-muted">
                                {formatDateLabel(discount.start_date)} —{" "}
                                {formatDateLabel(discount.end_date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    discount.is_active
                                      ? "bg-emerald-500/15 text-emerald-600"
                                      : "bg-muted/30 text-muted"
                                  }`}
                                >
                                  {discount.is_active ? "Aktif" : "Nonaktif"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setActiveDiscount(discount);
                                      setIsDiscountOpen(true);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-surface-secondary"
                                  >
                                    <PencilSimple className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteDiscount(discount)}
                                    className="p-1.5 rounded-md text-danger hover:bg-danger/5"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
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
          )}
        </div>
      </div>

      {isCreateOpen && (
        <BundleFormModal
          onClose={() => setIsCreateOpen(false)}
          variantOptions={variantOptions}
        />
      )}

      {isEditOpen && activeBundle && (
        <BundleFormModal
          onClose={() => setIsEditOpen(false)}
          variantOptions={variantOptions}
          bundle={activeBundle}
        />
      )}

      {isDeleteOpen && activeBundle && (
        <DeleteBundleModal
          bundle={activeBundle}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={() => setActiveBundleId(null)}
        />
      )}

      {isDiscountOpen && activeBundle && (
        <BundleDiscountModal
          bundle={activeBundle}
          existingDiscount={activeDiscount}
          onClose={() => {
            setIsDiscountOpen(false);
            setActiveDiscount(null);
          }}
        />
      )}
    </div>
  );
}
