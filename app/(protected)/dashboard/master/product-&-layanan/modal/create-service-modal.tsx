import React, { useEffect, useState } from "react";
import {
  X,
  Image as ImageIcon,
  Info,
  Trash,
  FileImage,
} from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@heroui/react";
import { usePost } from "@/app/libs/use-http";
import { Category } from "@/app/types/product-&-layanan";

// Schema Validation
const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Nama layanan wajib diisi")
    .max(255, "Terlalu panjang"),
  description: z.string().optional(),
  image: z.any().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface CreateServiceModalProps {
  setIsCreateServiceOpen: (isOpen: boolean) => void;
  category: Category;
}

export const CreateServiceModal: React.FC<CreateServiceModalProps> = ({
  setIsCreateServiceOpen,
  category,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue, // Digunakan untuk menghapus file terpilih
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
  });

  // ==========================================
  // LOGIKA IMAGE PREVIEW (BEST PRACTICE)
  // ==========================================
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 1. Pantau perubahan pada input file 'image'
  const imageFiles = watch("image");
  const selectedFile = imageFiles?.[0]; // Ambil file pertama

  // 2. Buat object URL untuk preview & cegah memory leak
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    // Buat URL sementara untuk merender gambar
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Cleanup function: Hapus URL dari memori browser saat unmount / ganti gambar
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Fungsi untuk menghapus gambar yang sudah dipilih
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault(); // Cegah form submit
    setValue("image", undefined); // Reset nilai RHF
  };
  // ==========================================

  const { mutate: createService, isPending } = usePost<unknown, FormData>(
    "/master/services",
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsCreateServiceOpen(false);
        toast.success("Layanan berhasil ditambahkan");
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

  const onSubmit = (data: ServiceFormValues) => {
    const formData = new FormData();

    formData.append("bms_ms_service_category_id", String(category.id));
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);

    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    createService(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Create Service</h2>
          <button
            type="button"
            onClick={() => setIsCreateServiceOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Field: Category (Readonly) */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Kategori
            </label>
            <input
              type="text"
              disabled
              value={category.name}
              className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-muted cursor-not-allowed"
            />
          </div>

          {/* Field: Nama Service */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Nama Layanan
            </label>
            <input
              type="text"
              {...register("name")}
              className={`w-full bg-surface border focus:ring-1 rounded-md px-3 py-2 text-sm outline-none transition-colors ${
                errors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border focus:border-accent focus:ring-accent"
              }`}
              placeholder="Contoh: Hot Stone Massage"
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
              placeholder="Masukkan detail singkat mengenai layanan ini"
            />
          </div>

          {/* Field: Foto dengan Preview UI */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Cover Layanan (Opsional)
            </label>

            {previewUrl ? (
              // RENDER JIKA GAMBAR SUDAH DIPILIH
              <div className="relative w-full h-48 rounded-xl border border-border overflow-hidden group bg-surface-secondary">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />

                {/* Overlay Hapus saat di-hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Hapus Gambar"
                  >
                    <Trash weight="bold" className="w-5 h-5" />
                  </button>
                  <span className="text-white text-xs font-medium">
                    Hapus Gambar
                  </span>
                </div>

                {/* Info nama file di sudut */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 pointer-events-none">
                  <div className="flex items-center gap-2 text-white/90">
                    <FileImage className="w-4 h-4 shrink-0" />
                    <p className="text-xs truncate font-medium">
                      {selectedFile?.name}
                    </p>
                    <span className="text-[10px] text-white/70 ml-auto shrink-0">
                      {selectedFile
                        ? (selectedFile.size / 1024 / 1024).toFixed(2)
                        : 0}{" "}
                      MB
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // RENDER JIKA BELUM ADA GAMBAR (Tombol Upload Normal)
              <label className="w-full flex items-center justify-center gap-2 bg-surface-secondary hover:bg-border transition-colors text-foreground text-sm font-semibold py-3 rounded-md mb-3 border border-border/50 cursor-pointer">
                <ImageIcon className="w-4 h-4" /> Upload foto
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  {...register("image")}
                />
              </label>
            )}

            {!previewUrl && (
              <div className="flex gap-2.5 items-start bg-surface-secondary/60 p-3 rounded-md border border-border/30 mt-3">
                <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <p className="text-[13px] text-muted leading-relaxed">
                  Rekomendasi rasio gambar lanskap (16:9) atau potret (4:3)
                  resolusi tinggi. Format JPG, PNG, WEBP maks 2MB.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            type="button"
            onClick={() => setIsCreateServiceOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};
