"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle,
  User,
  Phone,
  Envelope,
  Note,
  Gift,
} from "@phosphor-icons/react";
import {
  toast,
  TextField,
  InputGroup,
  Label,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { useApiFetch, usePost } from "@/app/libs/use-http";

interface PurchaseMembershipModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
}

type MembershipPackageBenefit = {
  id?: number;
  quota: number;
  service_variant_id?: number | null;
  service_id?: number | null;
  service_category_id?: number | null;
  service_variant?: {
    name?: string;
    service?: {
      name?: string;
    } | null;
  } | null;
  service?: {
    name?: string;
  } | null;
  service_category?: {
    name?: string;
  } | null;
};

type MembershipPackage = {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description?: string | null;
  benefits?: MembershipPackageBenefit[];
};

type BenefitDisplay = {
  type: string;
  name: string;
  quota: number;
};

const getBenefitDisplay = (
  benefit: MembershipPackageBenefit,
): BenefitDisplay => {
  if (benefit.service_variant_id && benefit.service_variant) {
    return {
      type: "Varian",
      name: benefit.service_variant.name ?? "Varian layanan",
      quota: benefit.quota,
    };
  }

  if (benefit.service_id && benefit.service) {
    return {
      type: "Layanan",
      name: benefit.service.name ?? "Layanan",
      quota: benefit.quota,
    };
  }

  if (benefit.service_category_id && benefit.service_category) {
    return {
      type: "Kategori",
      name: benefit.service_category.name ?? "Kategori",
      quota: benefit.quota,
    };
  }

  return { type: "Benefit", name: "Benefit lainnya", quota: benefit.quota };
};

export default function PurchaseMembershipModal({
  open,
  onClose,
  onSuccess,
  initialCustomerName = "",
  initialCustomerPhone = "",
}: PurchaseMembershipModalProps) {
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null,
  );
  const [notes, setNotes] = useState("");

  const { data: packageResponse } = useApiFetch<{ data: MembershipPackage[] }>(
    ["membership-packages-active"],
    "/master/membership-packages/active",
  );

  const packages = packageResponse?.data ?? [];

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const { mutate: createMembership, isPending: isPurchasePending } = usePost(
    "/master/customer-memberships",
    {
      invalidate: [["customer-memberships"], ["customers"]],
      onSuccess: (response: any) => {
        const customerMembershipId = response?.data?.id ?? response?.id ?? null;

        if (customerMembershipId) {
          createPaymentLink(
            {
              id: customerMembershipId,
              return_url: `${window.location.origin}/dashboard/membership?payment_ref={referenceId}&result=success`,
              cancel_url: `${window.location.origin}/dashboard/membership?payment_ref={referenceId}&result=cancel`,
            },
            {
              onSuccess: (paymentResponse: any) => {
                const paymentUrl =
                  paymentResponse?.data?.payment_url ??
                  paymentResponse?.payment_url ??
                  null;

                toast.success(
                  "Pembelian berhasil dibuat. Silakan lanjutkan pembayaran.",
                );

                if (paymentUrl) {
                  window.open(paymentUrl, "_blank", "noopener,noreferrer");
                }

                setCustomerName("");
                setCustomerPhone("");
                setCustomerEmail("");
                setSelectedPackageId(null);
                setNotes("");
                onSuccess?.();
                onClose();
              },
              onError: (paymentError: any) => {
                toast.danger(
                  "Pembelian dibuat, tapi link pembayaran gagal dibuat",
                  {
                    description:
                      paymentError?.response?.data?.message ??
                      "Link pembayaran tidak dapat dibuat.",
                  },
                );
              },
            },
          );

          return;
        }

        toast.success("Membership berhasil dibuat");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setSelectedPackageId(null);
        setNotes("");
        onSuccess?.();
        onClose();
      },
      onError: (error: any) => {
        toast.danger("Gagal", {
          description:
            error?.response?.data?.message ?? "Pembelian gagal dibuat",
        });
      },
    },
  );

  const { mutate: createPaymentLink } = usePost(
    (data: { id: number; return_url?: string; cancel_url?: string }) =>
      `/master/customer-memberships/${data.id}/payment`,
    {
      onError: (error: any) => {
        toast.danger("Link pembayaran gagal dibuat", {
          description:
            error?.response?.data?.message ??
            "Tidak dapat membuat link pembayaran.",
        });
      },
    },
  );

  if (!open) return null;

  const handleSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim() || !selectedPackageId) {
      toast.danger("Validasi", {
        description: "Nama, nomor HP, dan paket membership wajib diisi.",
      });
      return;
    }

    createMembership({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim() || undefined,
      membership_package_id: selectedPackageId,
      address: undefined,
      birth_date: undefined,
      gender: undefined,
      booking_id: undefined,
    });
  };

  return createPortal(
    <div
      // Penting: beri tahu react-aria (Drawer booking) bahwa overlay ini
      // adalah top layer yang sah, supaya tidak di-inert / diblok kliknya.
      data-react-aria-top-layer="true"
      style={{ pointerEvents: "auto" }}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-surface w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Beli Membership
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Isi data pelanggan lalu pilih paket membership yang akan dibeli.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Data pelanggan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">
                Nama Pelanggan
              </Label>
              <InputGroup className="w-full border border-border rounded-md">
                <InputGroup.Prefix className="border-r border-border">
                  <User className="w-4 h-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
              </InputGroup>
            </TextField>

            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">Nomor HP</Label>
              <InputGroup className="w-full border border-border rounded-md">
                <InputGroup.Prefix className="border-r border-border">
                  <Phone className="w-4 h-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
              </InputGroup>
            </TextField>
          </div>

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">
              Email (opsional)
            </Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Prefix className="border-r border-border">
                <Envelope className="w-4 h-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="contoh@email.com"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          {/* Pilihan paket */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Pilih Paket Membership
            </Label>

            {packages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
                Tidak ada paket membership aktif saat ini.
              </div>
            ) : (
              <RadioGroup
                aria-label="Pilih Paket Membership"
                value={
                  selectedPackageId ? String(selectedPackageId) : undefined
                }
                onChange={(value) => setSelectedPackageId(Number(value))}
                className="gap-0 rounded-xl border border-border overflow-hidden divide-y divide-border"
              >
                {packages.map((pkg, i) => (
                  <Radio
                    key={pkg.id}
                    value={String(pkg.id)}
                    className={`w-full rounded-none border-0 mt-0 p-0 gap-0 bg-background border-border hover:bg-muted/5 data-[selected=true]:bg-accent/10 ${i === 0 ? "" : "border-t"}`}
                  >
                    <Radio.Content className="flex w-full items-center gap-3 px-3.5 py-3">
                      <Radio.Control className="h-4 w-4 shrink-0 border-2 border-border data-[selected=true]:border-accent">
                        <Radio.Indicator className="m-auto h-2 w-2 rounded-full bg-accent" />
                      </Radio.Control>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {pkg.name}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {pkg.duration_days} hari
                          {pkg.description ? ` · ${pkg.description}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        Rp {Number(pkg.price).toLocaleString("id-ID")}
                      </span>
                    </Radio.Content>
                  </Radio>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Ringkasan pembelian */}
          {selectedPackage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-sm text-foreground">
              <div className="flex items-center gap-2 font-semibold text-emerald-600">
                <CheckCircle className="h-4 w-4" weight="fill" />
                Ringkasan Pembelian
              </div>

              <div className="mt-2.5 space-y-1.5 text-xs text-muted">
                <div className="flex items-center justify-between">
                  <span>Paket</span>
                  <span className="font-medium text-foreground">
                    {selectedPackage.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Masa aktif</span>
                  <span className="font-medium text-foreground">
                    {selectedPackage.duration_days} hari
                  </span>
                </div>
              </div>

              {/* Benefit */}
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Gift className="h-3.5 w-3.5 text-emerald-600" />
                  Benefit yang Didapat
                </div>

                {(selectedPackage.benefits ?? []).length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-background/70">
                    {/* Header kolom */}
                    <div className="grid grid-cols-[68px_1fr_40px] gap-2 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                      <span>Tipe</span>
                      <span>Nama</span>
                      <span className="text-right">Qty</span>
                    </div>

                    {/* Baris data, dipisah garis tipis */}
                    <div className="divide-y divide-emerald-500/10 border-t border-emerald-500/10">
                      {(selectedPackage.benefits ?? []).map((benefit, idx) => {
                        const display = getBenefitDisplay(benefit);
                        return (
                          <div
                            key={`summary-benefit-${idx}`}
                            className="grid grid-cols-[68px_1fr_40px] items-center gap-2 px-2.5 py-1.5"
                          >
                            <span className="truncate text-[10px] font-medium text-emerald-700">
                              {display.type}
                            </span>
                            <span className="truncate text-xs text-foreground">
                              {display.name}
                            </span>
                            <span className="text-right text-xs font-bold text-foreground">
                              {display.quota}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-background/70 px-2.5 py-2 text-[11px] text-muted">
                    Paket ini belum memiliki benefit.
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-emerald-500/20 pt-2">
                <span className="text-sm font-semibold text-foreground">
                  Total Bayar
                </span>
                <span className="text-sm font-bold text-foreground">
                  Rp {Number(selectedPackage.price).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">
              Catatan (opsional)
            </Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Prefix className="pt-2.5 items-start">
                <Note className="w-4 h-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tambahkan catatan jika ada..."
                className="w-full px-3 py-2 text-sm outline-none bg-transparent resize-none"
              />
            </InputGroup>
          </TextField>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-md text-foreground"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPurchasePending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md disabled:opacity-50"
          >
            {isPurchasePending ? "Menyimpan..." : "Buat Pembelian"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
