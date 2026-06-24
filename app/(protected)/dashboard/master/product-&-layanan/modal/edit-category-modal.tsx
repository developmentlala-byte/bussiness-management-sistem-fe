import React from "react";
import { X, Image as ImageIcon, Info } from "@phosphor-icons/react";
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
import { DynamicIcon } from "@/app/components/dynamic-icon";
import { usePut } from "@/app/libs/use-http";
import { Category } from "@/app/types/product-&-layanan"; // Sesuaikan path ini

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori wajib diisi")
    .max(255, "Nama terlalu panjang"),
  description: z.string().nullable().optional(),
  target_audience: z.enum(["Semua", "Pria", "Wanita"]).default("Semua"),
  icon: z.string().nullable().optional(),
  order_column: z.coerce.number().int().default(1),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface EditCategoryModalProps {
  setIsEditCategoryOpen: (isOpen: boolean) => void;
  category: Category;
}

const iconOptions = [
  { id: "ph-flower-lotus", name: "Flower Lotus (Spa)" },
  { id: "ph-flower", name: "Flower (Beauty)" },
  { id: "ph-yin-yang", name: "Yin Yang (Balance)" },
  { id: "ph-bathtub", name: "Bathtub (Bath/Spa)" },
  { id: "ph-drop", name: "Serum / Oil (Drop)" },
  { id: "ph-drops", name: "Liquid / Water (Drops)" },
  { id: "ph-wind", name: "Aromaterapi / Hair Dryer (Wind)" },
  { id: "ph-fire", name: "Hot Stone / Sauna (Fire)" },
  { id: "ph-scissors", name: "Potong Rambut (Scissors)" },
  { id: "ph-paint-brush", name: "Makeup / Masker (Brush)" },
  { id: "ph-palette", name: "Nail Art / Warna (Palette)" },
  { id: "ph-eye", name: "Eyelash / Brow (Eye)" },
  { id: "ph-smiley", name: "Facial / Face (Smiley)" },
  { id: "ph-magic-wand", name: "Makeover (Magic Wand)" },
  { id: "ph-syringe", name: "Klinik / Injection (Syringe)" },
  { id: "ph-bandaids", name: "Aftercare / Clinic (Bandaids)" },
  { id: "ph-hand-palm", name: "Reflexology / Massage (Palm)" },
  { id: "ph-hand", name: "Manicure / Hand Care (Hand)" },
  { id: "ph-hand-heart", name: "Therapy / Care (Hand Heart)" },
  { id: "ph-barbell", name: "Wellness / Gym (Barbell)" },
  { id: "ph-plant", name: "Organic Treatment (Plant)" },
  { id: "ph-leaf", name: "Natural / Vegan (Leaf)" },
  { id: "ph-sparkle", name: "Clean / Glow (Sparkle)" },
  { id: "ph-sparkles", name: "Premium Glow (Sparkles)" },
  { id: "ph-crown", name: "VIP Treatment (Crown)" },
  { id: "ph-diamond", name: "Premium Service (Diamond)" },
  { id: "ph-heart", name: "Favorite / Care (Heart)" },
  { id: "ph-star", name: "Top Service (Star)" },
  { id: "ph-sun", name: "Morning Package (Sun)" },
  { id: "ph-moon", name: "Night Relax (Moon)" },
];

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  setIsEditCategoryOpen,
  category,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      description: category.description,
      target_audience: category.target_audience || "Semua",
      icon: category.icon || "",
      order_column: category.order_column || 1,
    },
  });

  const targetAudience = watch("target_audience");
  const { contains } = useFilter({ sensitivity: "base" });

  const { mutate: updateCategory, isPending } = usePut<
    unknown,
    CategoryFormValues
  >(`/master/categories/${category.id}`, {
    invalidate: [["categories"]],
    onSuccess: () => {
      setIsEditCategoryOpen(false);
      toast.success("Kategori diperbarui", {
        description: "Perubahan data kategori telah disimpan.",
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.danger("Gagal memperbarui", {
        description:
          error?.response?.data?.message || "Terjadi kesalahan pada server.",
      });
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    updateCategory(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Edit Kategori</h2>
          <button
            type="button"
            onClick={() => setIsEditCategoryOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Field: Nama */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">Nama</label>
            <input
              type="text"
              {...register("name")}
              className={`w-full bg-surface border focus:ring-1 rounded-md px-3 py-2 text-sm outline-none transition-colors ${
                errors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border focus:border-accent focus:ring-accent"
              }`}
              placeholder="Contoh: SPA MASSAGE"
            />
            {errors.name && (
              <span className="text-xs text-red-500 mt-1.5 block">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Field: Deskripsi */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Deskripsi
            </label>
            <textarea
              {...register("description")}
              className="w-full bg-surface-secondary border border-transparent focus:bg-surface focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors resize-none h-20 placeholder:text-muted"
              placeholder="Displayed on online booking"
            />
          </div>

          {/* Field: Tersedia Untuk */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Tersedia Untuk
            </label>
            <div className="flex bg-surface-secondary rounded-md p-1 border border-border/50">
              {(["Semua", "Pria", "Wanita"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setValue("target_audience", tab)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded transition-all ${
                    targetAudience === tab
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {errors.target_audience && (
              <span className="text-xs text-red-500 mt-1.5 block">
                {errors.target_audience.message}
              </span>
            )}
          </div>

          <div className="flex gap-4">
            {/* Field: Order */}
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Order
              </label>
              <input
                type="number"
                {...register("order_column")}
                className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors"
                placeholder="1"
              />
              {errors.order_column && (
                <span className="text-xs text-red-500 mt-1.5 block">
                  {errors.order_column.message}
                </span>
              )}
            </div>

            {/* Field: Icon (Autocomplete) */}
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Icon
              </label>
              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    className="w-full"
                    placeholder="Cari icon..."
                    selectionMode="single"
                    value={field.value || null} // PERBAIKAN 1: Wajib pakai value (bukan defaultSelectedKey)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(val: any) => {
                      // PERBAIKAN 2: Ekstrak string dengan aman dari event HeroUI
                      let selectedStr = "";
                      if (val) {
                        if (val instanceof Set) {
                          selectedStr = String(Array.from(val)[0] || "");
                        } else if (Array.isArray(val)) {
                          selectedStr = String(val[0] || "");
                        } else {
                          selectedStr = String(val);
                        }
                      }
                      field.onChange(selectedStr);
                    }}
                  >
                    <Autocomplete.Trigger className="bg-surface border border-border rounded-md px-3 py-2.5 text-sm shadow-sm hover:border-accent transition-colors">
                      <Autocomplete.Value>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {({ defaultChildren, isPlaceholder }: any) => {
                          if (isPlaceholder || !field.value) {
                            return (
                              <span className="text-muted font-normal">
                                Pilih icon...
                              </span>
                            );
                          }
                          const selectedItem = iconOptions.find(
                            (i) => i.id === field.value,
                          );
                          if (!selectedItem) return defaultChildren;

                          return (
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <DynamicIcon
                                name={selectedItem.id}
                                className="w-4 h-4 text-accent"
                              />
                              <span className="truncate">
                                {selectedItem.name}
                              </span>
                            </div>
                          );
                        }}
                      </Autocomplete.Value>
                      <Autocomplete.ClearButton className="text-muted" />
                      <Autocomplete.Indicator className="text-muted" />
                    </Autocomplete.Trigger>

                    <Autocomplete.Popover className="w-[260px] bg-surface border border-border rounded-xl shadow-lg">
                      <Autocomplete.Filter filter={contains}>
                        <SearchField autoFocus name="search" className="mb-2">
                          <SearchField.Group className="bg-surface-secondary border border-transparent focus-within:border-accent rounded-lg px-3 py-2 flex items-center gap-2">
                            <SearchField.SearchIcon className="w-4 h-4 text-muted" />
                            <SearchField.Input
                              placeholder="Ketik nama icon..."
                              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                            />
                            <SearchField.ClearButton className="text-muted hover:text-foreground" />
                          </SearchField.Group>
                        </SearchField>

                        <ListBox
                          className="max-h-[220px] overflow-y-auto outline-none"
                          renderEmptyState={() => (
                            <EmptyState className="py-4 text-sm text-muted">
                              Icon tidak ditemukan
                            </EmptyState>
                          )}
                        >
                          {iconOptions.map((icon) => (
                            <ListBox.Item
                              key={icon.id}
                              id={icon.id} // Wajib set id sebagai value
                              textValue={icon.name}
                              className="group flex items-center gap-2 px-3 py-2 rounded-lg outline-none hover:bg-surface-secondary focus:bg-surface-secondary cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 flex items-center justify-center rounded bg-surface border border-border group-hover:border-accent/30 group-focus:border-accent/30">
                                  <DynamicIcon
                                    name={icon.id}
                                    className="w-3.5 h-3.5 text-muted group-hover:text-accent group-focus:text-accent"
                                  />
                                </div>
                                <span className="text-sm text-foreground">
                                  {icon.name}
                                </span>
                              </div>
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Autocomplete.Filter>
                    </Autocomplete.Popover>
                  </Autocomplete>
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Foto (Opsional)
            </label>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-surface-secondary hover:bg-border transition-colors text-foreground text-sm font-semibold py-3 rounded-md mb-3 border border-border/50"
            >
              <ImageIcon className="w-4 h-4" /> Upload foto
            </button>
            <div className="flex gap-2.5 items-start bg-surface-secondary/60 p-3 rounded-md border border-border/30">
              <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              <p className="text-[13px] text-muted leading-relaxed">
                Untuk tampilan optimal, sematkan foto dengan rasio persegi (1:1)
                dan resolusi minimal 500x500px.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            type="button"
            onClick={() => setIsEditCategoryOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
