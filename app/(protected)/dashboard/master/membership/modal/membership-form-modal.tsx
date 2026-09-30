import React, { useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash,
  Cube,
  Stack,
  SquaresFour,
} from "@phosphor-icons/react";
import {
  toast,
  Select,
  ListBox,
  InputGroup,
  TextField,
  Label,
  Autocomplete,
  SearchField,
  EmptyState,
  useFilter,
  TextArea,
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { usePost, usePut } from "@/app/libs/use-http";
import { formatInputRupiah } from "@/app/libs/format-input-rupiah";
import {
  MembershipCategoryOption,
  MembershipPackage,
  MembershipServiceOption,
  ServiceVariantOption,
} from "../types";
import {
  formatVariantOptionLabel,
  formatVariantOptionSearchText,
  formatVariantOptionSublabel,
} from "../../bundle-promo/types";

interface MembershipFormModalProps {
  onClose: () => void;
  variantOptions: ServiceVariantOption[];
  categoryOptions: MembershipCategoryOption[];
  serviceOptions: MembershipServiceOption[];
  membership?: MembershipPackage;
}

type BenefitScopeType = "variant" | "service" | "category";

interface PackageBenefitForm {
  scopeType: BenefitScopeType;
  scopeId: number | null;
  quota: number;
}

interface TargetOption {
  id: number;
  label: string;
  sublabel?: string;
  searchText: string;
}

const SCOPE_ORDER: BenefitScopeType[] = ["variant", "service", "category"];

const SCOPE_META = {
  variant: {
    label: "Varian",
    Icon: Cube,
    placeholder: "Pilih varian layanan",
    searchPlaceholder: "Cari varian...",
    empty: "Tidak ada varian",
    hint: "Kuota berlaku untuk varian ini saja.",
  },
  service: {
    label: "Service",
    Icon: Stack,
    placeholder: "Pilih service",
    searchPlaceholder: "Cari service...",
    empty: "Tidak ada service",
    hint: "Kuota berlaku untuk semua varian aktif di dalam service ini.",
  },
  category: {
    label: "Kategori",
    Icon: SquaresFour,
    placeholder: "Pilih kategori",
    searchPlaceholder: "Cari kategori...",
    empty: "Tidak ada kategori",
    hint: "Kuota berlaku untuk semua varian aktif di dalam kategori ini, kecuali add-on.",
  },
} as const;

const emptyBenefit = (): PackageBenefitForm => ({
  scopeType: "variant",
  scopeId: null,
  quota: 1,
});

const durationOptions = [
  { id: "30", label: "1 Bulan (30 hari)" },
  { id: "60", label: "2 Bulan (60 hari)" },
  { id: "90", label: "3 Bulan (90 hari)" },
];

export default function MembershipFormModal({
  onClose,
  variantOptions,
  categoryOptions,
  serviceOptions,
  membership,
}: MembershipFormModalProps) {
  const isEdit = Boolean(membership);
  const { contains } = useFilter({ sensitivity: "base" });

  const [name, setName] = useState(membership?.name ?? "");
  const [description, setDescription] = useState(membership?.description ?? "");
  const [price, setPrice] = useState(
    membership ? String(membership.price) : "",
  );
  const [isActive, setIsActive] = useState(membership?.is_active ?? true);

  const [durationDays, setDurationDays] = useState(
    membership ? String(membership.duration_days ?? 30) : "30",
  );

  const [benefits, setBenefits] = useState<PackageBenefitForm[]>(() => {
    if (membership?.benefits?.length) {
      return membership.benefits.map((benefit) => ({
        scopeType: benefit.service_variant_id
          ? "variant"
          : benefit.service_id
            ? "service"
            : benefit.service_category_id
              ? "category"
              : "variant",
        scopeId:
          benefit.service_variant_id ??
          benefit.service_id ??
          benefit.service_category_id ??
          null,
        quota: benefit.quota,
      }));
    }

    if (membership?.variants?.length) {
      return membership.variants.map((variant) => ({
        scopeType: "variant",
        scopeId: variant.service_variant_id,
        quota: variant.quota,
      }));
    }

    return [emptyBenefit()];
  });

  const targetsByScope = useMemo<Record<BenefitScopeType, TargetOption[]>>(
    () => ({
      variant: variantOptions.map((v) => ({
        id: v.id,
        label: formatVariantOptionLabel(v),
        sublabel: formatVariantOptionSublabel(v),
        searchText: formatVariantOptionSearchText(v),
      })),
      service: serviceOptions.map((s) => ({
        id: s.id,
        label: s.name,
        searchText: s.name,
      })),
      category: categoryOptions.map((c) => ({
        id: c.id,
        label: c.name,
        searchText: c.name,
      })),
    }),
    [variantOptions, serviceOptions, categoryOptions],
  );

  const updateBenefit = (index: number, patch: Partial<PackageBenefitForm>) =>
    setBenefits((prev) =>
      prev.map((benefit, i) =>
        i === index ? { ...benefit, ...patch } : benefit,
      ),
    );

  const { mutate: createMembership, isPending: isCreating } = usePost(
    "/master/membership-packages",
    {
      invalidate: [["membership-packages"]],
      onSuccess: () => {
        toast.success("Paket membership dibuat");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast.danger("Gagal", { description: err?.response?.data?.message });
      },
    },
  );

  const { mutate: updateMembership, isPending: isUpdating } = usePut(
    membership ? `/master/membership-packages/${membership.id}` : "",
    {
      invalidate: [["membership-packages"]],
      onSuccess: () => {
        toast.success("Paket membership diperbarui");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast.danger("Gagal", { description: err?.response?.data?.message });
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

    const selectedDuration = Number(durationDays || 0);
    if (!selectedDuration || selectedDuration <= 0) {
      toast.danger("Validasi", {
        description: "Pilih lama membership terlebih dahulu.",
      });
      return;
    }

    if (benefits.some((benefit) => benefit.scopeId === null)) {
      toast.danger("Validasi", {
        description:
          "Ada benefit yang belum memilih target. Pilih targetnya atau hapus barisnya.",
      });
      return;
    }
    if (
      benefits.length === 0 ||
      benefits.some((benefit) => benefit.quota < 1)
    ) {
      toast.danger("Validasi", {
        description: "Tambahkan minimal satu benefit dengan kuota minimal 1.",
      });
      return;
    }

    const scopeKeys = benefits.map(
      (benefit) => `${benefit.scopeType}:${benefit.scopeId}`,
    );
    if (new Set(scopeKeys).size !== scopeKeys.length) {
      toast.danger("Validasi", {
        description: "Target yang sama tidak boleh dipilih dua kali.",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      duration_days: selectedDuration,
      is_active: isActive,
      benefits: benefits.map((benefit) => {
        if (benefit.scopeType === "variant") {
          return { service_variant_id: benefit.scopeId!, quota: benefit.quota };
        }
        if (benefit.scopeType === "service") {
          return { service_id: benefit.scopeId!, quota: benefit.quota };
        }
        return { service_category_id: benefit.scopeId!, quota: benefit.quota };
      }),
    };

    if (isEdit) {
      updateMembership(payload);
    } else {
      createMembership(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Paket Membership" : "Tambah Paket Membership"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Atur harga, masa berlaku, dan kuota layanan untuk pelanggan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">Nama Paket</Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Paket Silver"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <div className="grid grid-cols-2 gap-4">
            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">
                Harga Paket
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
                Lama Membership
              </Label>
              <Select
                selectedKey={durationDays}
                onSelectionChange={(key) => {
                  if (!key) return;
                  const next = String(key);
                  setDurationDays(next);
                }}
                placeholder="Pilih lama membership"
                className="w-full"
              >
                <Select.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {durationOptions.map((option) => (
                      <ListBox.Item
                        key={option.id}
                        id={option.id}
                        textValue={option.label}
                      >
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* <div className="rounded-lg border border-border bg-surface-secondary/30 p-3 text-sm text-foreground">
              <span className="text-muted text-xs uppercase tracking-wide">
                Durasi aktif saat ini:
              </span>
              <div className="mt-1 font-semibold">{durationDays} hari</div>
            </div> */}
            </TextField>
          </div>

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">Deskripsi</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="description"
              className="w-full px-3 py-2 text-sm outline-none bg-transparent rounded border-border border"
            />
          </TextField>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Paket aktif (bisa dijual)
          </label>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold text-foreground">
                  Benefit & Kuota
                </Label>
                <p className="text-xs text-muted mt-0.5">
                  Kuota dipotong dari yang paling spesifik lebih dulu: varian,
                  lalu service, lalu kategori.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBenefits((prev) => [...prev, emptyBenefit()])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Benefit
              </button>
            </div>

            {benefits.map((benefit, index) => {
              const meta = SCOPE_META[benefit.scopeType];
              const targets = targetsByScope[benefit.scopeType];
              const selectedTarget = targets.find(
                (target) => target.id === benefit.scopeId,
              );

              return (
                <div
                  key={index}
                  className="border border-border rounded-lg p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_100px_40px] gap-2 items-end">
                    <Select
                      className="w-full"
                      aria-label="Berlaku untuk"
                      value={benefit.scopeType}
                      onChange={(key: Key | null) => {
                        if (!key) return;
                        updateBenefit(index, {
                          scopeType: key as BenefitScopeType,
                          scopeId: null,
                        });
                      }}
                    >
                      <Label className="text-xs text-muted mb-1">
                        Berlaku untuk
                      </Label>
                      <Select.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {SCOPE_ORDER.map((scope) => {
                            const ScopeIcon = SCOPE_META[scope].Icon;
                            return (
                              <ListBox.Item
                                key={scope}
                                id={scope}
                                textValue={SCOPE_META[scope].label}
                              >
                                <div className="flex items-center gap-2">
                                  <ScopeIcon className="w-4 h-4" />{" "}
                                  {SCOPE_META[scope].label}
                                  <ListBox.ItemIndicator />
                                </div>
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Autocomplete
                      key={benefit.scopeType}
                      aria-label={meta.placeholder}
                      items={targets as any}
                      selectedKey={
                        benefit.scopeId ? String(benefit.scopeId) : null
                      }
                      onSelectionChange={(key) =>
                        updateBenefit(index, {
                          scopeId: key ? Number(key) : null,
                        })
                      }
                    >
                      <Label className="text-xs text-muted mb-1">Target</Label>
                      <Autocomplete.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                        <Autocomplete.Value>
                          {({ defaultChildren, isPlaceholder }) =>
                            isPlaceholder
                              ? meta.placeholder
                              : (selectedTarget?.label ?? defaultChildren)
                          }
                        </Autocomplete.Value>
                        <Autocomplete.Indicator />
                      </Autocomplete.Trigger>
                      <Autocomplete.Popover>
                        <Autocomplete.Filter filter={contains}>
                          <SearchField autoFocus>
                            <SearchField.Group>
                              <SearchField.Input
                                placeholder={meta.searchPlaceholder}
                              />
                            </SearchField.Group>
                          </SearchField>
                          <ListBox>
                            {targets.map((target) => (
                              <ListBox.Item
                                key={target.id}
                                id={String(target.id)}
                                textValue={target.searchText}
                              >
                                <div className="flex flex-col py-0.5">
                                  <span className="text-sm font-medium">
                                    {target.label}
                                  </span>
                                  {target.sublabel && (
                                    <span className="text-xs text-muted">
                                      {target.sublabel}
                                    </span>
                                  )}
                                </div>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                            {targets.length === 0 && (
                              <EmptyState>{meta.empty}</EmptyState>
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
                          value={String(benefit.quota)}
                          onChange={(e) =>
                            updateBenefit(index, {
                              quota: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                        />
                      </InputGroup>
                    </TextField>

                    <button
                      type="button"
                      onClick={() =>
                        setBenefits((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      disabled={benefits.length === 1}
                      className="h-10 flex items-center justify-center text-danger disabled:opacity-30"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-muted">{meta.hint}</p>
                </div>
              );
            })}
          </div>
        </div>

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
