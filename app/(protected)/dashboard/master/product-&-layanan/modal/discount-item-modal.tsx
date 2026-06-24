import React, { useState } from "react";
import {
  X,
  CaretDown,
  Percent,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import {
  RangeCalendar,
  toast,
  Select,
  ListBox,
  InputGroup,
  TextField,
  Label,
} from "@heroui/react";
import { today, getLocalTimeZone, parseDate } from "@internationalized/date";
import type { Key } from "@heroui/react";
import { usePost, usePut } from "@/app/libs/use-http";
import { Discount, ServiceVariant } from "../page";

interface DiscountItemModalProps {
  setIsDiscountItemOpen: (isOpen: boolean) => void;
  variant: ServiceVariant;
  existingDiscount?: Discount | null;
}

export const DiscountItemModal: React.FC<DiscountItemModalProps> = ({
  setIsDiscountItemOpen,
  variant,
  existingDiscount,
}) => {
  const [discountType, setDiscountType] = useState<Key | null>(
    existingDiscount?.discount_type || "percent",
  );
  const [discountValue, setDiscountValue] = useState<string>(
    existingDiscount ? String(existingDiscount.discount_value) : "",
  );

  const now = today(getLocalTimeZone());
  const [dateRange, setDateRange] = useState({
    start: existingDiscount
      ? parseDate(existingDiscount.start_date.split("T")[0])
      : now,
    end: existingDiscount
      ? parseDate(existingDiscount.end_date.split("T")[0])
      : now.add({ days: 7 }),
  });

  const { mutate: createDiscount, isPending: isCreating } = usePost(
    "/master/discounts",
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsDiscountItemOpen(false);
        toast.success("Diskon diterapkan", {
          description: "Harga layanan akan terpotong secara otomatis.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        toast.danger("Gagal", { description: err?.response?.data?.message }),
    },
  );

  const { mutate: updateDiscount, isPending: isUpdating } = usePut(
    existingDiscount ? `/master/discounts/${existingDiscount.id}` : "",
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsDiscountItemOpen(false);
        toast.success("Diskon diperbarui", {
          description: "Aturan diskon telah diubah.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        toast.danger("Gagal", { description: err?.response?.data?.message }),
    },
  );

  const isPending = isCreating || isUpdating;

  const handleSave = () => {
    if (!discountValue || Number(discountValue) <= 0) {
      toast.danger("Validasi Error", {
        description: "Nilai diskon tidak boleh kosong atau 0.",
      });
      return;
    }

    const payload = {
      bms_ms_service_variant_id: variant.id,
      discount_type: discountType,
      discount_value: Number(discountValue),
      start_date: dateRange.start.toString(),
      end_date: dateRange.end.toString(),
    };

    if (existingDiscount) {
      updateDiscount(payload);
    } else {
      createDiscount(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {existingDiscount ? "Edit Diskon" : "Atur Diskon"}
            </h2>
            <p className="text-xs text-muted mt-0.5">{variant.name}</p>
          </div>
          <button
            onClick={() => setIsDiscountItemOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* HEROUI SELECT */}
            <div className="flex-1">
              <Select
                className="w-full"
                placeholder="Pilih tipe diskon"
                value={discountType}
                onChange={(key) => setDiscountType(key)}
              >
                <Label className="block text-sm text-foreground mb-1.5">
                  Tipe Diskon
                </Label>
                <Select.Trigger className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-surface border border-border rounded-xl shadow-lg mt-1">
                  <ListBox>
                    <ListBox.Item id="percent" textValue="Persentase (%)">
                      <div className="flex items-center gap-2 py-1">
                        <Percent className="w-4 h-4 text-muted" />
                        <span>Persentase (%)</span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="nominal" textValue="Nominal (Rp)">
                      <div className="flex items-center gap-2 py-1">
                        <CurrencyCircleDollar className="w-4 h-4 text-muted" />
                        <span>Nominal (Rp)</span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* HEROUI INPUTGROUP */}
            <div className="flex-1">
              <TextField aria-label="Nilai Diskon" className="w-full">
                <Label className="block text-sm text-foreground mb-1.5">
                  Nilai Diskon
                </Label>
                <InputGroup className="w-full border border-border bg-surface rounded-md overflow-hidden focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
                  <InputGroup.Prefix className=" px-3 flex items-center justify-center border-r border-border">
                    {discountType === "percent" ? (
                      <Percent className="w-4 h-4 text-muted" />
                    ) : (
                      <CurrencyCircleDollar className="w-4 h-4 text-muted" />
                    )}
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    type="number"
                    className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                    placeholder={discountType === "percent" ? "15" : "50000"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                  {discountType === "percent" && (
                    <InputGroup.Suffix className="bg-transparent px-3 flex items-center justify-center text-muted text-sm font-medium">
                      %
                    </InputGroup.Suffix>
                  )}
                </InputGroup>
              </TextField>
            </div>
          </div>

          <div className="h-px bg-border/50 w-full" />

          {/* HEROUI RANGECALENDAR */}
          <div className="flex flex-col items-center w-full">
            <div className="w-full text-left mb-3">
              <label className="block text-sm text-foreground">
                Periode Berlaku
              </label>
              <p className="text-xs text-muted mt-0.5">
                Pilih tanggal mulai dan berakhirnya promo.
              </p>
            </div>

            <RangeCalendar
              aria-label="Discount period"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              value={dateRange as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(val: any) => setDateRange(val)}
              minValue={now}
              className="w-full max-w-[360px] rounded-xl border border-border bg-surface p-3 shadow-sm mx-auto"
            >
              <RangeCalendar.Header className="flex items-center justify-between pb-4">
                <RangeCalendar.NavButton
                  slot="previous"
                  className="p-1.5 rounded-md hover:bg-surface-secondary text-muted hover:text-foreground transition-colors"
                />
                <RangeCalendar.Heading className="text-sm font-bold text-foreground" />
                <RangeCalendar.NavButton
                  slot="next"
                  className="p-1.5 rounded-md hover:bg-surface-secondary text-muted hover:text-foreground transition-colors"
                />
              </RangeCalendar.Header>

              <RangeCalendar.Grid className="w-full border-collapse">
                <RangeCalendar.GridHeader>
                  {(day) => (
                    <RangeCalendar.HeaderCell className="text-[11px] uppercase tracking-wider font-semibold text-muted text-center pb-3">
                      {day}
                    </RangeCalendar.HeaderCell>
                  )}
                </RangeCalendar.GridHeader>

                {/* ========================================== */}
                {/* LOGIKA SATU LAPIS YANG CLEAN & SIMPLE */}
                {/* ========================================== */}
                <RangeCalendar.GridBody>
                  {(date) => (
                    <RangeCalendar.Cell
                      date={date}
                      className="text-center text-sm p-0 m-0 relative focus:outline-none"
                    >
                      {({
                        formattedDate,
                        isSelected,
                        isSelectionStart,
                        isSelectionEnd,
                        isUnavailable,
                      }) => {
                        return (
                          <div className="h-9 w-full flex items-center justify-center transition-colors">
                            {formattedDate}
                          </div>
                        );
                      }}
                    </RangeCalendar.Cell>
                  )}
                </RangeCalendar.GridBody>
                {/* ========================================== */}
              </RangeCalendar.Grid>
            </RangeCalendar>

            {dateRange?.start && dateRange?.end && (
              <div className="mt-4 px-4 py-2 bg-surface-secondary/50 rounded-lg border border-border inline-block">
                <p className="text-xs text-muted text-center font-medium">
                  Aktif:{" "}
                  <span className="text-foreground">
                    {dateRange.start.toString()}
                  </span>{" "}
                  —{" "}
                  <span className="text-foreground">
                    {dateRange.end.toString()}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl shrink-0">
          <button
            onClick={() => setIsDiscountItemOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan Diskon"}
          </button>
        </div>
      </div>
    </div>
  );
};
