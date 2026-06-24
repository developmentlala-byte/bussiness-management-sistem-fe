import React, { useMemo, useState } from "react";
import { X, Plus, Trash } from "@phosphor-icons/react";
import {
  toast,
  InputGroup,
  TextField,
  Label,
  Autocomplete,
  SearchField,
  ListBox,
  useFilter,
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { usePost, usePut } from "@/app/libs/use-http";
import { MembershipPackage, ServiceVariantOption } from "../types";
import { formatInputRupiah } from "@/app/libs/format-input-rupiah";
import {
  formatVariantOptionLabel,
  formatVariantOptionSublabel,
} from "../../bundle-promo/types";

interface MembershipFormModalProps {
  onClose: () => void;
  variantOptions: ServiceVariantOption[];
  membership?: MembershipPackage;
}

interface PackageVariantForm {
  service_variant_id: number | null;
  quota: number;
}

const emptyVariant = (): PackageVariantForm => ({
  service_variant_id: null,
  quota: 1,
});

export default function MembershipFormModal({
  onClose,
  variantOptions,
  membership,
}: MembershipFormModalProps) {
  const { contains } = useFilter({ sensitivity: "base" });
  const isEdit = Boolean(membership);

  // ✅ Init langsung dari prop, no useEffect
  const [name, setName] = useState(membership?.name ?? "");
  const [description, setDescription] = useState(membership?.description ?? "");
  const [price, setPrice] = useState(
    membership ? String(membership.price) : "",
  );
  const [durationDays, setDurationDays] = useState(
    membership ? String(membership.duration_days) : "30",
  );
  const [isActive, setIsActive] = useState(membership?.is_active ?? true);
  const [variants, setVariants] = useState<PackageVariantForm[]>(
    membership?.variants?.length
      ? membership.variants.map((v) => ({
          service_variant_id: v.service_variant_id,
          quota: v.quota,
        }))
      : [emptyVariant()],
  );

  const variantLabelMap = useMemo(
    () =>
      Object.fromEntries(
        variantOptions.map((v) => [
          v.id,
          `${v.name} · ${v.serviceName} · ${v.categoryName}`,
        ]),
      ),
    [variantOptions],
  );

  const { mutate: createMembership, isPending: isCreating } = usePost(
    "/master/membership-packages",
    {
      invalidate: [["membership-packages"]],
      onSuccess: () => {
        toast.success("Paket membership berhasil dibuat");
        onClose();
      },
      onError: (err: any) => {
        toast.danger("Gagal membuat paket", {
          description: err?.response?.data?.message,
        });
      },
    },
  );

  const { mutate: updateMembership, isPending: isUpdating } = usePut(
    membership ? `/master/membership-packages/${membership.id}` : "",
    {
      invalidate: [["membership-packages"]],
      onSuccess: () => {
        toast.success("Paket membership berhasil diupdate");
        onClose();
      },
      onError: (err: any) => {
        toast.danger("Gagal mengupdate paket", {
          description: err?.response?.data?.message,
        });
      },
    },
  );

  const isPending = isCreating || isUpdating;

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.danger("Validasi", { description: "Nama paket wajib diisi." });
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.danger("Validasi", { description: "Harga harus lebih dari 0." });
      return;
    }
    if (!durationDays || Number(durationDays) <= 0) {
      toast.danger("Validasi", {
        description: "Durasi harus lebih dari 0 hari.",
      });
      return;
    }

    const validVariants = variants.filter(
      (v) => v.service_variant_id && v.quota > 0,
    );
    if (validVariants.length === 0) {
      toast.danger("Validasi", {
        description: "Tambahkan minimal satu varian layanan.",
      });
      return;
    }

    const ids = validVariants.map((v) => v.service_variant_id);
    if (new Set(ids).size !== ids.length) {
      toast.danger("Validasi", {
        description: "Varian layanan yang sama tidak boleh dipilih dua kali.",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      duration_days: Number(durationDays),
      is_active: isActive,
      variants: validVariants.map((v) => ({
        service_variant_id: v.service_variant_id!,
        quota: v.quota,
      })),
    };

    if (isEdit) {
      updateMembership(payload);
    } else {
      createMembership(payload);
    }
  };
  console.log({
    InputGroup,
    TextField,
    Label,
    Autocomplete,
    SearchField,
    ListBox,
    useFilter,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Paket Membership" : "Tambah Paket Membership"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Atur harga, durasi, dan kuota layanan untuk pelanggan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">
              Nama Paket <span className="text-danger">*</span>
            </Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Paket Silver"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">
              Deskripsi{" "}
              <span className="text-muted font-normal">(opsional)</span>
            </Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat paket"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">
                Harga Paket <span className="text-danger">*</span>
              </Label>
              <InputGroup className="w-full border border-border rounded-md">
                <InputGroup.Prefix className="px-3 text-sm text-muted border-r border-border">
                  Rp
                </InputGroup.Prefix>
                <InputGroup.Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputRupiah(price)}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
              </InputGroup>
            </TextField>

            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">
                Durasi <span className="text-danger">*</span>
              </Label>
              <InputGroup className="w-full border border-border rounded-md">
                <InputGroup.Input
                  type="text"
                  inputMode="numeric"
                  value={durationDays}
                  onChange={(e) =>
                    setDurationDays(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="30"
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
                <InputGroup.Suffix className="px-3 text-sm text-muted border-l border-border">
                  hari
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>
          </div>

          {/* ✅ Ganti Switch → native checkbox, konsisten sama BundleFormModal */}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Paket aktif
          </label>

          {/* Varian Layanan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Varian Layanan & Kuota <span className="text-danger">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Item
              </button>
            </div>

            {variants.map((variant, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_40px] gap-2 items-end border border-border rounded-lg p-3"
              >
                <Autocomplete
                  aria-label="Pilih layanan"
                  defaultItems={variantOptions}
                  selectedKey={
                    variant.service_variant_id
                      ? String(variant.service_variant_id)
                      : null
                  }
                  onSelectionChange={(key: Key | null) => {
                    const next = [...variants];
                    next[index] = {
                      ...next[index],
                      service_variant_id: key ? Number(key) : null,
                    };
                    setVariants(next);
                  }}
                >
                  <Label className="text-xs text-muted mb-1">Layanan</Label>
                  <Autocomplete.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                    <Autocomplete.Value>
                      {({ defaultChildren, isPlaceholder }) =>
                        isPlaceholder
                          ? "Pilih varian layanan"
                          : variantLabelMap[variant.service_variant_id!] ||
                            defaultChildren
                      }
                    </Autocomplete.Value>
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus>
                        <SearchField.Group>
                          <SearchField.Input placeholder="Cari layanan..." />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox>
                        {variantOptions.map((opt) => (
                          <ListBox.Item
                            key={opt.id}
                            id={String(opt.id)}
                            textValue={`${opt.name} ${opt.serviceName} ${opt.categoryName}`}
                          >
                            <div className="flex flex-col py-0.5">
                              <span className="text-sm font-medium">
                                {formatVariantOptionLabel(opt)}
                              </span>
                              <span className="text-xs text-muted">
                                {formatVariantOptionSublabel(opt)}
                              </span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                        {variantOptions.length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted text-center">
                            Tidak ada layanan
                          </div>
                        )}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>

                <TextField>
                  <Label className="text-xs text-muted mb-1">Kuota</Label>
                  <InputGroup className="border border-border rounded-md">
                    <InputGroup.Input
                      type="number"
                      min={1}
                      value={String(variant.quota)}
                      onChange={(e) => {
                        const next = [...variants];
                        next[index] = {
                          ...next[index],
                          quota: Math.max(1, Number(e.target.value) || 1),
                        };
                        setVariants(next);
                      }}
                      className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                    />
                  </InputGroup>
                </TextField>

                <button
                  type="button"
                  onClick={() =>
                    setVariants((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={variants.length === 1}
                  className="h-10 flex items-center justify-center text-danger disabled:opacity-30"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-md"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md disabled:opacity-50"
          >
            {isPending
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Buat Paket"}
          </button>
        </div>
      </div>
    </div>
  );
}
