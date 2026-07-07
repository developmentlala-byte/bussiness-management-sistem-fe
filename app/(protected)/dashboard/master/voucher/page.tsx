"use client";

import { useMemo, useState } from "react";
import {
  MagnifyingGlass,
  Plus,
  PencilSimple,
  Trash,
  Ticket,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useApiFetch, usePost, usePut, useRemove } from "@/app/libs/use-http";
import { formatRupiah } from "@/app/libs/format-rupiah";
import { apiGet } from "@/app/services/api";
import { CopyableText } from "@/app/components/copyable-text";

type VoucherDiscountType = "percentage" | "nominal";

type UsageBooking = {
  id: number;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  schedule_date: string;
  status: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  applied_voucher: any;
  service_labels: string[];
};

type Voucher = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discount_type: VoucherDiscountType;
  discount_value: number | string;
  min_booking_amount?: number | string | null;
  max_discount_amount?: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  is_active: boolean;
  used_count?: number;
  usage_bookings?: UsageBooking[];
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(value: unknown): number | null {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  return Math.floor(n);
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(value);
  if (m) return `${m[1]}T${m[2]}:${m[3]}`;
  return "";
}

function formatDateTimeLabel(value?: string | null): string {
  if (!value) return "—";
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  return `${m[1]} ${m[2]}:${m[3]}`;
}

function formatVoucherDiscount(v: Voucher): string {
  if (v.discount_type === "percentage") {
    return `${toNumber(v.discount_value)}%`;
  }
  return formatRupiah(toNumber(v.discount_value));
}

function formatVoucherMin(v: Voucher): string {
  const n = toNumberOrNull(v.min_booking_amount);
  if (n === null || n <= 0) return "—";
  return formatRupiah(n);
}

function formatVoucherMax(v: Voucher): string {
  const n = toNumberOrNull(v.max_discount_amount);
  if (n === null || n <= 0) return "—";
  return formatRupiah(n);
}

type VoucherFormState = {
  code: string;
  name: string;
  description: string;
  discount_type: VoucherDiscountType;
  discount_value: string;
  min_booking_amount: string;
  max_discount_amount: string;
  starts_at: string;
  ends_at: string;
  usage_limit: string;
  is_active: boolean;
};

const emptyForm = (): VoucherFormState => ({
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_booking_amount: "",
  max_discount_amount: "",
  starts_at: "",
  ends_at: "",
  usage_limit: "",
  is_active: true,
});

export default function MasterVoucherPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);
  const [form, setForm] = useState<VoucherFormState>(emptyForm());

  const {
    data: resp,
    isLoading,
    isError,
  } = useApiFetch<{ data: Voucher[] }>(["vouchers"], "/master/vouchers");
  const vouchers = resp?.data ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return vouchers;
    const q = searchQuery.toLowerCase();
    return vouchers.filter(
      (v) =>
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.description ?? "").toLowerCase().includes(q),
    );
  }, [vouchers, searchQuery]);

  const { mutate: createVoucher, isPending: isCreating } = usePost<
    unknown,
    Record<string, unknown>
  >("/master/vouchers", {
    invalidate: [["vouchers"]],
    onSuccess: () => {
      toast.success("Voucher berhasil dibuat");
      setIsFormOpen(false);
    },
    onError: (err: any) => {
      toast.warning(err?.message ?? "Gagal membuat voucher");
    },
  });

  const { mutate: updateVoucher, isPending: isUpdating } = usePut<
    unknown,
    { id: number } & Record<string, unknown>
  >((payload) => `/master/vouchers/${payload.id}`, {
    invalidate: [["vouchers"]],
    onSuccess: () => {
      toast.success("Voucher berhasil diperbarui");
      setIsFormOpen(false);
    },
    onError: (err: any) => {
      toast.warning(err?.message ?? "Gagal memperbarui voucher");
    },
  });

  const { mutate: deleteVoucher, isPending: isDeleting } = useRemove<
    unknown,
    { id: number }
  >((payload) => `/master/vouchers/${payload.id}`, {
    invalidate: [["vouchers"]],
    onSuccess: () => {
      toast.success("Voucher berhasil dihapus");
      setIsDeleteOpen(false);
      setActiveVoucher(null);
    },
    onError: (err: any) => {
      toast.warning(err?.message ?? "Gagal menghapus voucher");
    },
  });

  const openCreate = () => {
    setActiveVoucher(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setActiveVoucher(v);
    setForm({
      code: v.code ?? "",
      name: v.name ?? "",
      description: v.description ?? "",
      discount_type: v.discount_type ?? "percentage",
      discount_value: String(v.discount_value ?? ""),
      min_booking_amount:
        v.min_booking_amount !== null && v.min_booking_amount !== undefined
          ? String(v.min_booking_amount)
          : "",
      max_discount_amount:
        v.max_discount_amount !== null && v.max_discount_amount !== undefined
          ? String(v.max_discount_amount)
          : "",
      starts_at: toDateTimeLocal(v.starts_at),
      ends_at: toDateTimeLocal(v.ends_at),
      usage_limit:
        v.usage_limit !== null && v.usage_limit !== undefined
          ? String(v.usage_limit)
          : "",
      is_active: Boolean(v.is_active),
    });
    setIsFormOpen(true);
  };

  const buildPayload = (source: VoucherFormState) => {
    const payload: Record<string, unknown> = {
      code: source.code.trim().toUpperCase(),
      name: source.name.trim(),
      description: source.description.trim() ? source.description.trim() : null,
      discount_type: source.discount_type,
      discount_value: toNumberOrNull(source.discount_value) ?? 0,
      min_booking_amount: toNumberOrNull(source.min_booking_amount),
      max_discount_amount: toNumberOrNull(source.max_discount_amount),
      starts_at: source.starts_at ? source.starts_at : null,
      ends_at: source.ends_at ? source.ends_at : null,
      usage_limit: toIntOrNull(source.usage_limit),
      is_active: Boolean(source.is_active),
    };
    return payload;
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.warning("Kode dan nama voucher wajib diisi");
      return;
    }
    const payload = buildPayload(form);
    if (activeVoucher) {
      updateVoucher({ id: activeVoucher.id, ...payload });
      return;
    }
    createVoucher(payload);
  };

  const handleToggleActive = (v: Voucher) => {
    const next = {
      code: v.code,
      name: v.name,
      description: v.description ?? "",
      discount_type: v.discount_type,
      discount_value: String(v.discount_value ?? ""),
      min_booking_amount:
        v.min_booking_amount !== null && v.min_booking_amount !== undefined
          ? String(v.min_booking_amount)
          : "",
      max_discount_amount:
        v.max_discount_amount !== null && v.max_discount_amount !== undefined
          ? String(v.max_discount_amount)
          : "",
      starts_at: toDateTimeLocal(v.starts_at),
      ends_at: toDateTimeLocal(v.ends_at),
      usage_limit:
        v.usage_limit !== null && v.usage_limit !== undefined
          ? String(v.usage_limit)
          : "",
      is_active: !v.is_active,
    };
    updateVoucher({ id: v.id, ...buildPayload(next) });
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100%",
          backgroundColor: "var(--background)",
          padding: "var(--page-padding-y) var(--page-padding-x)",
        }}
      />
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <WarningCircle className="w-12 h-12 text-danger mb-4" weight="fill" />
        <h3 className="text-lg font-bold">Gagal Memuat Voucher</h3>
        <p className="text-muted text-sm mt-1">
          Periksa koneksi API dan pastikan migration voucher sudah dijalankan.
        </p>
      </div>
    );
  }

  const isSaving = isCreating || isUpdating;

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
            Master Voucher
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Kelola kode voucher diskon untuk booking.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
          <div className="relative" style={{ width: "18rem" }}>
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
              placeholder="Cari voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "var(--input-height-md)",
                paddingLeft: "2.5rem",
                paddingRight: "var(--space-4)",
                borderRadius: "9999px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
                fontSize: "var(--text-sm)",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={openCreate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              height: "var(--btn-height-md)",
              padding: "0 var(--space-4)",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              borderRadius: "var(--radius-xl)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus
              weight="bold"
              style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
            />
            <span>Tambah Voucher</span>
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              minWidth: "1050px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "var(--surface-secondary)" }}>
                {[
                  "Kode",
                  "Nama",
                  "Diskon",
                  "Min",
                  "Max",
                  "Mulai",
                  "Berakhir",
                  "Digunakan",
                  "Kuota",
                  "Status",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: `var(--table-cell-py) var(--table-cell-px)`,
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid var(--border)",
                      textAlign: h === "Aksi" ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      padding: "var(--space-6)",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    Tidak ada voucher.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id}>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      <CopyableText
                        text={v.code || null}
                        className="font-mono font-semibold "
                      />
                      {}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                      }}
                    >
                      {v.name}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatVoucherDiscount(v)}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatVoucherMin(v)}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatVoucherMax(v)}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDateTimeLabel(v.starts_at)}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDateTimeLabel(v.ends_at)}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.used_count ?? 0}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.usage_limit ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        fontSize: "var(--text-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        onClick={() => handleToggleActive(v)}
                        style={{
                          border: "1px solid var(--border)",
                          backgroundColor: v.is_active
                            ? "color-mix(in oklch, var(--success) 12%, transparent)"
                            : "var(--surface)",
                          color: v.is_active
                            ? "var(--success)"
                            : "var(--muted)",
                          padding: "6px 10px",
                          borderRadius: "9999px",
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {v.is_active ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </td>
                    <td
                      style={{
                        padding: `var(--table-cell-py) var(--table-cell-px)`,
                        borderBottom: "1px solid var(--separator)",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {((v.used_count && v.used_count > 0) || true) && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await apiGet(
                                `/master/vouchers/${v.id}`,
                              );
                              if (response && response.data) {
                                setActiveVoucher(response.data);
                                setIsUsageHistoryOpen(true);
                              }
                            } catch (err) {
                              toast.error(
                                "Gagal memuat riwayat penggunaan voucher",
                              );
                            }
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--accent)",
                            padding: "6px 10px",
                            borderRadius: "10px",
                            fontSize: "var(--text-xs)",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginRight: "8px",
                          }}
                        >
                          <Ticket className="w-4 h-4" />
                          Riwayat
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(v)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          padding: "6px 10px",
                          borderRadius: "10px",
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <PencilSimple className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setActiveVoucher(v);
                          setIsDeleteOpen(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--danger)",
                          padding: "6px 10px",
                          borderRadius: "10px",
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          cursor: "pointer",
                          marginLeft: "8px",
                        }}
                      >
                        <Trash className="w-4 h-4" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center border border-border">
                  <Ticket className="w-5 h-5 text-foreground" weight="fill" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {activeVoucher ? "Edit Voucher" : "Tambah Voucher"}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Pastikan diskon dan periode berlaku sudah benar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Kode <span className="text-danger">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="PROMO10"
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Nama <span className="text-danger">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Diskon 10%"
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Contoh: Berlaku untuk semua layanan"
                  className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors min-h-[84px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Tipe Diskon
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        discount_type: e.target.value as VoucherDiscountType,
                      }))
                    }
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Nilai Diskon
                  </label>
                  <input
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, discount_value: e.target.value }))
                    }
                    placeholder={
                      form.discount_type === "percentage" ? "10" : "50000"
                    }
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, is_active: e.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Minimum Transaksi
                  </label>
                  <input
                    value={form.min_booking_amount}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        min_booking_amount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Maks Diskon
                  </label>
                  <input
                    value={form.max_discount_amount}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        max_discount_amount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Kuota (opsional)
                  </label>
                  <input
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, usage_limit: e.target.value }))
                    }
                    placeholder="100"
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Mulai (opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, starts_at: e.target.value }))
                    }
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Berakhir (opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ends_at: e.target.value }))
                    }
                    className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
              <div className="text-xs text-muted">
                Preview diskon:{" "}
                <span className="font-semibold text-foreground">
                  {form.discount_type === "percentage"
                    ? `${toNumberOrNull(form.discount_value) ?? 0}%`
                    : formatRupiah(toNumberOrNull(form.discount_value) ?? 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`rounded-xl py-2.5 px-4 text-[13px] font-semibold transition-colors ${
                    isSaving
                      ? "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
                      : "bg-[#B55368] text-white hover:bg-[#C96480]"
                  }`}
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen && activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Hapus Voucher
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Voucher{" "}
                <span className="font-semibold">{activeVoucher.code}</span> akan
                dihapus.
              </p>
            </div>
            <div className="px-6 py-4 text-sm text-foreground">
              Yakin ingin menghapus voucher ini?
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-xl border border-border bg-white py-2.5 px-4 text-[13px] font-semibold text-[#7A736E] transition-colors hover:bg-[#F8F4F0]"
              >
                Batal
              </button>
              <button
                onClick={() => deleteVoucher({ id: activeVoucher.id })}
                disabled={isDeleting}
                className={`rounded-xl py-2.5 px-4 text-[13px] font-semibold transition-colors ${
                  isDeleting
                    ? "cursor-not-allowed bg-[#EDE8E3] text-[#B5AFA9]"
                    : "bg-danger text-white hover:bg-danger/90"
                }`}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUsageHistoryOpen && activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-4xl rounded-xl shadow-xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Riwayat Penggunaan Voucher
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  <span className="font-semibold">{activeVoucher.code}</span> -{" "}
                  {activeVoucher.name}
                </p>
              </div>
              <button
                onClick={() => setIsUsageHistoryOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {!activeVoucher.usage_bookings ||
              activeVoucher.usage_bookings.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">
                  Belum ada penggunaan voucher ini.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeVoucher.usage_bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-semibold text-sm">
                              {booking.booking_code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                booking.status === "Completed"
                                  ? "bg-success/10 text-success"
                                  : booking.status === "Cancelled"
                                    ? "bg-danger/10 text-danger"
                                    : booking.status === "Confirmed"
                                      ? "bg-accent/10 text-accent"
                                      : "bg-warning/10 text-warning"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium">
                            {booking.customer_name}
                          </p>
                          <p className="text-xs text-muted">
                            {booking.customer_phone}
                          </p>
                          <p className="text-xs text-muted mt-1">
                            {new Date(booking.schedule_date).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {booking.service_labels.map((label, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-surface-secondary px-2 py-0.5 rounded-full"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted line-through">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              maximumFractionDigits: 0,
                            }).format(booking.subtotal_amount)}
                          </p>
                          <p className="text-xs text-danger font-semibold">
                            -{" "}
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              maximumFractionDigits: 0,
                            }).format(booking.discount_amount)}
                          </p>
                          <p className="text-sm font-bold text-foreground mt-1">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              maximumFractionDigits: 0,
                            }).format(booking.total_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
