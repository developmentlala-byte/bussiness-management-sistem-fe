import React, { useMemo, useState } from "react";
import { X, Plus, Trash, Percent, CurrencyCircleDollar } from "@phosphor-icons/react";
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
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { usePost, usePut } from "@/app/libs/use-http";
import {
  BundleItemInput,
  BundlePromo,
  ServiceVariantOption,
  buildDateRange,
  formatVariantOptionLabel,
  formatVariantOptionSearchText,
  formatVariantOptionSublabel,
  parseApiTime,
  toDateTimeEnd,
  toDateTimeStart,
  type DateRangeValue,
} from "../types";
import { BundlePeriodPicker } from "../components/bundle-period-picker";

interface BundleFormModalProps {
  onClose: () => void;
  variantOptions: ServiceVariantOption[];
  bundle?: BundlePromo;
}

const emptyItem = (): BundleItemInput => ({
  bms_ms_service_variant_id: 0,
  quantity: 1,
});

export function BundleFormModal({
  onClose,
  variantOptions,
  bundle,
}: BundleFormModalProps) {
  const isEdit = Boolean(bundle);
  const { contains } = useFilter({ sensitivity: "base" });

  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [bundleType, setBundleType] = useState<Key>(
    bundle?.bundle_type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    bundle ? String(bundle.discount_value) : "",
  );
  const [maxQuantity, setMaxQuantity] = useState(
    bundle?.max_quantity ? String(bundle.max_quantity) : "",
  );
  const [isActive, setIsActive] = useState(bundle?.is_active ?? true);
  const [items, setItems] = useState<BundleItemInput[]>(
    bundle?.bundle_items?.length
      ? bundle.bundle_items.map((item) => ({
          bms_ms_service_variant_id: item.bms_ms_service_variant_id,
          quantity: item.quantity,
          sort_order: item.sort_order,
        }))
      : [emptyItem()],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    buildDateRange(bundle?.start_date, bundle?.end_date, 30),
  );
  const [startTime, setStartTime] = useState(() =>
    parseApiTime(bundle?.start_date, "09:00"),
  );
  const [endTime, setEndTime] = useState(() =>
    parseApiTime(bundle?.end_date, "21:00"),
  );

  const variantLabelMap = useMemo(
    () =>
      Object.fromEntries(
        variantOptions.map((v) => [v.id, formatVariantOptionLabel(v)]),
      ),
    [variantOptions],
  );

  const { mutate: createBundle, isPending: isCreating } = usePost(
    "/master/bundle-promo",
    {
      invalidate: [["bundle-promo"]],
      onSuccess: () => {
        toast.success("Bundle promo dibuat");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        toast.danger("Gagal", { description: err?.response?.data?.message }),
    },
  );

  const { mutate: updateBundle, isPending: isUpdating } = usePut(
    bundle ? `/master/bundle-promo/${bundle.id}` : "",
    {
      invalidate: [["bundle-promo"]],
      onSuccess: () => {
        toast.success("Bundle promo diperbarui");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        toast.danger("Gagal", { description: err?.response?.data?.message }),
    },
  );

  const isPending = isCreating || isUpdating;

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.danger("Validasi", { description: "Nama bundle wajib diisi." });
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      toast.danger("Validasi", { description: "Nilai diskon bundle wajib diisi." });
      return;
    }

    const validItems = items.filter((item) => item.bms_ms_service_variant_id > 0);
    if (validItems.length === 0) {
      toast.danger("Validasi", {
        description: "Tambahkan minimal satu layanan ke bundle.",
      });
      return;
    }

    const variantIds = validItems.map((item) => item.bms_ms_service_variant_id);
    if (new Set(variantIds).size !== variantIds.length) {
      toast.danger("Validasi", {
        description: "Varian layanan yang sama tidak boleh dipilih dua kali.",
      });
      return;
    }

    const startAt = new Date(
      toDateTimeStart(dateRange.start.toString(), startTime),
    );
    const endAt = new Date(toDateTimeEnd(dateRange.end.toString(), endTime));
    if (endAt <= startAt) {
      toast.danger("Validasi", {
        description: "Waktu berakhir harus setelah waktu mulai.",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      bundle_type: bundleType,
      discount_value: Number(discountValue),
      max_quantity: maxQuantity ? Number(maxQuantity) : null,
      is_active: isActive,
      start_date: toDateTimeStart(dateRange.start.toString(), startTime),
      end_date: toDateTimeEnd(dateRange.end.toString(), endTime),
      items: validItems.map((item, index) => ({
        ...item,
        sort_order: index,
      })),
    };

    if (isEdit) {
      updateBundle(payload);
    } else {
      createBundle(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Bundle Promo" : "Tambah Bundle Promo"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Gabungkan beberapa layanan dengan harga promo.
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
            <Label className="text-sm text-foreground mb-1.5">Nama Bundle</Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Paket Spa Couple"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">Deskripsi</Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              className="w-full"
              value={bundleType}
              onChange={(key) => setBundleType(key)}
            >
              <Label className="text-sm text-foreground mb-1.5">Tipe Diskon Bundle</Label>
              <Select.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="percentage" textValue="Persentase">
                    <Percent className="w-4 h-4" /> Persentase (%)
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="nominal" textValue="Nominal">
                    <CurrencyCircleDollar className="w-4 h-4" /> Nominal (Rp)
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField className="w-full">
              <Label className="text-sm text-foreground mb-1.5">Nilai Diskon</Label>
              <InputGroup className="w-full border border-border rounded-md">
                <InputGroup.Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={bundleType === "percentage" ? "15" : "50000"}
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
              </InputGroup>
            </TextField>
          </div>

          <TextField className="w-full">
            <Label className="text-sm text-foreground mb-1.5">
              Maks. Kuantitas Terjual (opsional)
            </Label>
            <InputGroup className="w-full border border-border rounded-md">
              <InputGroup.Input
                type="number"
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
                placeholder="Kosongkan = unlimited"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Bundle aktif
          </label>

          <BundlePeriodPicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            allowPastDates={isEdit}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Item Bundle
              </Label>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Item
              </button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_40px] gap-2 items-end border border-border rounded-lg p-3"
              >
                <Autocomplete
                  aria-label="Pilih layanan"
                  defaultItems={variantOptions}
                  selectedKey={
                    item.bms_ms_service_variant_id
                      ? String(item.bms_ms_service_variant_id)
                      : null
                  }
                  onSelectionChange={(key) => {
                    const next = [...items];
                    next[index] = {
                      ...next[index],
                      bms_ms_service_variant_id: Number(key),
                    };
                    setItems(next);
                  }}
                >
                  <Label className="text-xs text-muted mb-1">Layanan</Label>
                  <Autocomplete.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                    <Autocomplete.Value>
                      {({ defaultChildren, isPlaceholder }) =>
                        isPlaceholder
                          ? "Pilih varian layanan"
                          : variantLabelMap[item.bms_ms_service_variant_id] ||
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
                        {variantOptions.map((variant) => (
                          <ListBox.Item
                            key={variant.id}
                            id={String(variant.id)}
                            textValue={formatVariantOptionSearchText(variant)}
                          >
                            <div className="flex flex-col py-0.5">
                              <span className="text-sm font-medium">
                                {formatVariantOptionLabel(variant)}
                              </span>
                              <span className="text-xs text-muted">
                                {formatVariantOptionSublabel(variant)}
                              </span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                        {variantOptions.length === 0 && (
                          <EmptyState>Tidak ada layanan</EmptyState>
                        )}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>

                <TextField>
                  <Label className="text-xs text-muted mb-1">Qty</Label>
                  <InputGroup className="border border-border rounded-md">
                    <InputGroup.Input
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onChange={(e) => {
                        const next = [...items];
                        next[index] = {
                          ...next[index],
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        };
                        setItems(next);
                      }}
                      className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                    />
                  </InputGroup>
                </TextField>

                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={items.length === 1}
                  className="h-10 flex items-center justify-center text-danger disabled:opacity-30"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
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
            {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Bundle"}
          </button>
        </div>
      </div>
    </div>
  );
}
