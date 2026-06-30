import React, { useState, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  toast,
  Autocomplete,
  SearchField,
  ListBox,
  EmptyState,
  useFilter,
} from "@heroui/react";
import { usePut } from "@/app/libs/use-http";
import { formatRupiah, unformatRupiah } from "@/app/libs/format-rupiah";
import { ServiceVariant } from "../page";

const itemSchema = z.object({
  name: z.string().min(1, "Nama varian wajib diisi"),
  duration_minutes: z.coerce.number().min(1, "Durasi harus dipilih"),
  retail_price: z.string().min(1, "Harga wajib diisi"),
  is_active: z.boolean().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface EditItemModalProps {
  setIsEditItemOpen: (isOpen: boolean) => void;
  variant: ServiceVariant;
}

const durationOptions = [
  { id: "15", name: "15 Menit" },
  { id: "30", name: "30 Menit" },
  { id: "45", name: "45 Menit" },
  { id: "60", name: "1 Jam" },
  { id: "90", name: "1.5 Jam" },
  { id: "120", name: "2 Jam" },
  { id: "150", name: "2.5 Jam" },
  { id: "180", name: "3 Jam" },
];

export const EditItemModal: React.FC<EditItemModalProps> = ({
  setIsEditItemOpen,
  variant,
}) => {
  const [displayPrice, setDisplayPrice] = useState("");
  const { contains } = useFilter({ sensitivity: "base" });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: variant.name,
      duration_minutes: variant.duration_minutes,
      retail_price: String(variant.retail_price),
      is_active: Boolean(variant.is_active),
    },
  });

  // Set initial formatted price
useEffect(() => {
  const rawPrice = String(Math.trunc(Number(variant.retail_price ?? 0)));

  setDisplayPrice(formatRupiah(rawPrice));
  setValue("retail_price", rawPrice, { shouldValidate: true });
}, [variant, setValue]);

  const { mutate: updateItem, isPending } = usePut<unknown, any>(
    `/master/variants/${variant.id}`,
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsEditItemOpen(false);
        toast.success("Varian diperbarui", {
          description: "Data varian telah berhasil disimpan.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menyimpan data", {
          description:
            error?.response?.data?.message || "Terjadi kesalahan server.",
        });
      },
    },
  );

const onSubmit = (data: ItemFormValues) => {
  const payload = {
    name: data.name,
    duration_minutes: data.duration_minutes,
    retail_price: Number(data.retail_price),
    is_active: Boolean(data.is_active),
  };

  updateItem(payload);
};

const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value.replace(/[^0-9]/g, "");

  setDisplayPrice(formatRupiah(raw));
  setValue("retail_price", raw, { shouldValidate: true });
};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-bold text-foreground">
              Edit Varian Item
            </h2>
            <button
              type="button"
              onClick={() => setIsEditItemOpen(false)}
              className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ... BODY SAMA PERSIS SEPERTI CREATE_ITEM_MODAL ... */}
          {/* Paste bagian <div className="p-6 overflow-y-auto space-y-5"> ... </div> dari CreateItemModal di sini */}

          <div className="p-6 overflow-y-auto space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm text-foreground mb-1.5">
                  Durasi
                </label>
                <Controller
                  name="duration_minutes"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      className="w-full"
                      placeholder="Pilih Durasi"
                      selectionMode="single"
                      defaultSelectedKey={String(field.value)}
                      onSelectionChange={(key) =>
                        field.onChange(key ? Number(key) : 0)
                      }
                    >
                      <Autocomplete.Trigger className="bg-surface border border-border rounded-md px-3 py-2.5 text-sm shadow-sm hover:border-accent transition-colors h-[38px]">
                        <Autocomplete.Value>
                          {({ defaultChildren, isPlaceholder }: any) => {
                            if (isPlaceholder || !field.value)
                              return (
                                <span className="text-muted font-normal">
                                  Pilih durasi...
                                </span>
                              );
                            const selected = durationOptions.find(
                              (o) => o.id === String(field.value),
                            );
                            return selected ? selected.name : defaultChildren;
                          }}
                        </Autocomplete.Value>
                        <Autocomplete.ClearButton className="text-muted" />
                        <Autocomplete.Indicator className="text-muted" />
                      </Autocomplete.Trigger>

                      <Autocomplete.Popover className="w-[180px] bg-surface border border-border rounded-xl shadow-lg">
                        <Autocomplete.Filter filter={contains}>
                          <SearchField
                            autoFocus
                            name="search"
                            className="mb-2 hidden"
                          >
                            <SearchField.Group>
                              <SearchField.Input />
                            </SearchField.Group>
                          </SearchField>

                          <ListBox className="max-h-[220px] overflow-y-auto outline-none">
                            {durationOptions.map((opt) => (
                              <ListBox.Item
                                key={opt.id}
                                id={opt.id}
                                textValue={opt.name}
                                className="px-3 py-2 rounded-lg hover:bg-surface-secondary cursor-pointer"
                              >
                                <span className="text-sm text-foreground">
                                  {opt.name}
                                </span>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Autocomplete.Filter>
                      </Autocomplete.Popover>
                    </Autocomplete>
                  )}
                />
                {errors.duration_minutes && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.duration_minutes.message}
                  </span>
                )}
              </div>

              <div className="flex-[2]">
                <label className="block text-sm text-foreground mb-1.5">
                  Nama variant
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full h-[38px] bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                />
                {errors.name && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.name.message}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-foreground mb-1.5">
                Harga retail
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm text-muted font-medium">
                  Rp
                </span>
                <input
                  type="text"
                  value={displayPrice}
                  onChange={handlePriceChange}
                  className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md pl-9 pr-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
              {errors.retail_price && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.retail_price.message}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Active
                </span>
                <span className="text-[11px] text-muted">
                  Nonaktifkan varian agar tidak bisa dipilih saat booking.
                </span>
              </div>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => setIsEditItemOpen(false)}
              className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
