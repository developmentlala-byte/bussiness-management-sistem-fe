import React, { useState } from "react";
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
import { usePost } from "@/app/libs/use-http";
import { Service } from "@/app/types/product-&-layanan"; // Sesuaikan path
import { formatRupiah, unformatRupiah } from "@/app/libs/format-rupiah";

const itemSchema = z.object({
  name: z.string().min(1, "Nama varian wajib diisi"),
  duration_minutes: z.coerce.number().min(1, "Durasi harus dipilih"),
  retail_price: z.string().min(1, "Harga wajib diisi"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface CreateItemModalProps {
  setIsCreateItemOpen: (isOpen: boolean) => void;
  service: Service; // Passing data parent service-nya
}

// Opsi Durasi dalam Menit
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

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  setIsCreateItemOpen,
  service,
}) => {
  // State untuk format Rupiah
  const [displayPrice, setDisplayPrice] = useState("");
  const [submitAction, setSubmitAction] = useState<"save" | "save_and_add">(
    "save",
  );

  const { contains } = useFilter({ sensitivity: "base" });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
  });

  const { mutate: createItem, isPending } = usePost<unknown, any>(
    "/master/variants",
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        toast.success("Varian ditambahkan", {
          description: "Varian item baru telah berhasil disimpan.",
        });

        if (submitAction === "save") {
          setIsCreateItemOpen(false);
        } else {
          // Jika pilih Simpan & Tambah Lagi
          reset({ name: "", duration_minutes: 0, retail_price: "" });
          setDisplayPrice("");
        }
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
    // Kita bersihkan dulu harga retailnya ke number murni sebelum kirim ke backend
    const payload = {
      bms_ms_service_id: service.id,
      name: data.name,
      duration_minutes: data.duration_minutes,
      retail_price: unformatRupiah(data.retail_price),
    };

    createItem(payload);
  };

  // Handler saat user mengetik nominal Rupiah
const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value.replace(/[^0-9]/g, ""); // ambil angka saja

  setDisplayPrice(formatRupiah(raw)); // tampilkan formatted
  setValue("retail_price", raw, { shouldValidate: true }); // simpan angka murni
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Tambah Varian Item
              </h2>
              <p className="text-xs text-muted mt-0.5">{service.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateItemOpen(false)}
              className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                      value={field.value ? String(field.value) : null}
                      onSelectionChange={(key) =>
                        field.onChange(key ? Number(key) : 0)
                      }
                    >
                      <Autocomplete.Trigger className="bg-surface border border-border rounded-md px-3 py-2.5 text-sm shadow-sm hover:border-accent transition-colors h-[38px]">
                        <Autocomplete.Value>
                          {({ defaultChildren, isPlaceholder }: any) => {
                            if (isPlaceholder || !field.value) {
                              return (
                                <span className="text-muted font-normal">
                                  Pilih durasi...
                                </span>
                              );
                            }
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
                  className="w-full h-[38px] bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70"
                  placeholder="e.g. Long Hair"
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
                  placeholder="0"
                />
              </div>
              {errors.retail_price && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.retail_price.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => setIsCreateItemOpen(false)}
              className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction("save_and_add")}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground border border-border rounded-md hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && submitAction === "save_and_add"
                ? "Menyimpan..."
                : "Simpan & Tambah Lagi"}
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction("save")}
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending && submitAction === "save" ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
