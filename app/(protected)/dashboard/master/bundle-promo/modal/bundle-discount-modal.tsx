import React, { useState } from "react";
import { X, Percent, CurrencyCircleDollar } from "@phosphor-icons/react";
import {
  toast,
  Select,
  ListBox,
  InputGroup,
  TextField,
  Label,
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { usePost, usePut } from "@/app/libs/use-http";
import {
  BundleDiscount,
  BundlePromo,
  buildDateRange,
  parseApiTime,
  toDateTimeEnd,
  toDateTimeStart,
  type DateRangeValue,
} from "../types";
import { BundlePeriodPicker } from "../components/bundle-period-picker";

interface BundleDiscountModalProps {
  bundle: BundlePromo;
  existingDiscount?: BundleDiscount | null;
  onClose: () => void;
}

export function BundleDiscountModal({
  bundle,
  existingDiscount,
  onClose,
}: BundleDiscountModalProps) {
  const isEdit = Boolean(existingDiscount);

  const [discountType, setDiscountType] = useState<Key>(
    existingDiscount?.discount_type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    existingDiscount ? String(existingDiscount.discount_value) : "",
  );
  const [minQuantity, setMinQuantity] = useState(
    existingDiscount ? String(existingDiscount.min_quantity) : "1",
  );
  const [description, setDescription] = useState(
    existingDiscount?.description ?? "",
  );
  const [isActive, setIsActive] = useState(existingDiscount?.is_active ?? true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    buildDateRange(
      existingDiscount?.start_date,
      existingDiscount?.end_date,
      14,
    ),
  );
  const [startTime, setStartTime] = useState(() =>
    parseApiTime(existingDiscount?.start_date, "09:00"),
  );
  const [endTime, setEndTime] = useState(() =>
    parseApiTime(existingDiscount?.end_date, "21:00"),
  );

  const { mutate: createDiscount, isPending: isCreating } = usePost(
    `/master/bundle-promo/${bundle.id}/discounts`,
    {
      invalidate: [["bundle-promo"]],
      onSuccess: () => {
        toast.success("Diskon bundle ditambahkan");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast.danger("Gagal", { description: err?.response?.data?.message });
      },
    },
  );

  const { mutate: updateDiscount, isPending: isUpdating } = usePut(
    existingDiscount
      ? `/master/bundle-promo/discount/${existingDiscount.id}`
      : "",
    {
      invalidate: [["bundle-promo"]],
      onSuccess: () => {
        toast.success("Diskon bundle diperbarui");
        onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast.danger("Gagal", { description: err?.response?.data?.message });
      },
    },
  );

  const isPending = isCreating || isUpdating;

  const handleSave = () => {
    if (!discountValue || Number(discountValue) <= 0) {
      toast.danger("Validasi", { description: "Nilai diskon wajib diisi." });
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
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_quantity: Number(minQuantity) || 1,
      description: description.trim() || null,
      is_active: isActive,
      start_date: toDateTimeStart(dateRange.start.toString(), startTime),
      end_date: toDateTimeEnd(dateRange.end.toString(), endTime),
    };

    if (isEdit) {
      updateDiscount(payload);
    } else {
      createDiscount(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl border border-border shadow-xl flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Diskon Bundle" : "Tambah Diskon Bundle"}
            </h2>
            <p className="text-xs text-muted mt-0.5">{bundle.name}</p>
          </div>
          <button onClick={onClose} className="text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              value={discountType}
              onChange={(key) => setDiscountType(key)}
            >
              <Label className="text-sm mb-1.5">Tipe Diskon</Label>
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

            <TextField>
              <Label className="text-sm mb-1.5">Nilai Diskon</Label>
              <InputGroup className="border border-border rounded-md">
                <InputGroup.Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                />
              </InputGroup>
            </TextField>
          </div>

          <TextField>
            <Label className="text-sm mb-1.5">Minimal Kuantitas Bundle</Label>
            <InputGroup className="border border-border rounded-md">
              <InputGroup.Input
                type="number"
                min={1}
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <TextField>
            <Label className="text-sm mb-1.5">Deskripsi (opsional)</Label>
            <InputGroup className="border border-border rounded-md">
              <InputGroup.Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Diskon tambahan beli 2 bundle"
                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
              />
            </InputGroup>
          </TextField>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Diskon aktif
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
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-md"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan Diskon"}
          </button>
        </div>
      </div>
    </div>
  );
}
