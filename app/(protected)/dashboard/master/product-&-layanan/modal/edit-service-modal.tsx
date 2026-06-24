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
// PERBAIKAN: Gunakan usePost, BUKAN usePut, untuk mengamankan upload file di Production
import { usePost } from "@/app/libs/use-http";
import { Category, Service } from "@/app/types/product-&-layanan";

const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Nama layanan wajib diisi")
    .max(255, "Terlalu panjang"),
  description: z.string().nullable().optional(),
  image: z.any().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface EditServiceModalProps {
  setIsEditServiceOpen: (isOpen: boolean) => void;
  category: Category | null;
  service: Service;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  setIsEditServiceOpen,
  category,
  service,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service.name,
      description: service.description || "",
    },
  });

  // ==========================================
  // LOGIKA IMAGE PREVIEW
  // ==========================================
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    service.image_path || null,
  );

  const imageFiles = watch("image");
  const selectedFile = imageFiles?.[0];

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(service.image_path || null);
    }
  }, [selectedFile, service.image_path]);

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setValue("image", undefined);
    setPreviewUrl(null);
  };
  // ==========================================

  // PERBAIKAN: Kita memanggil usePost, BUKAN usePut.
  // Nanti di onSubmit kita akali dengan formData.append("_method", "PUT")
  const { mutate: updateService, isPending } = usePost<unknown, FormData>(
    `/master/services/${service.id}`,
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsEditServiceOpen(false);
        toast.success("Layanan diperbarui", {
          description: "Perubahan data layanan telah disimpan.",
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

  const onSubmit = (data: ServiceFormValues) => {
    const formData = new FormData();

    // ==========================================
    // METHOD SPOOFING (RAHASIA PRODUCTION AMAN)
    // ==========================================
    // Karena kita menggunakan usePost (axios.post) untuk mengirim FormData,
    // kita sisipkan _method = PUT agar Router Laravel menangkapnya sebagai rute PUT.
    formData.append("_method", "PUT");

    // Jangan lupa kirim category_id jika dibutuhkan
    if (category) {
      formData.append("bms_ms_service_category_id", String(category.id));
    }
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);

    // Hanya kirim file gambar ke backend JIKA user benar-benar memilih gambar baru
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    updateService(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Edit Layanan</h2>
          <button
            type="button"
            onClick={() => setIsEditServiceOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Kategori
            </label>
            <input
              type="text"
              disabled
              value={category?.name || "Kategori Terpilih"}
              className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Nama Layanan
            </label>
            <input
              type="text"
              {...register("name")}
              className={`w-full bg-surface border focus:ring-1 rounded-md px-3 py-2 text-sm outline-none transition-colors ${
                errors.name
                  ? "border-red-500 focus:border-red-500"
                  : "border-border focus:border-accent"
              }`}
              placeholder="Contoh: Hot Stone Massage"
            />
            {errors.name && (
              <span className="text-xs text-red-500 mt-1.5 block">
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Deskripsi
            </label>
            <textarea
              {...register("description")}
              className="w-full bg-surface-secondary border border-transparent focus:bg-surface focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors resize-none h-20 placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Cover Layanan
            </label>

            {previewUrl ? (
              <div className="relative w-full h-48 rounded-xl border border-border overflow-hidden group bg-surface-secondary">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <label className="p-2.5 bg-surface text-foreground rounded-full hover:bg-surface-secondary transition-colors shadow-lg cursor-pointer">
                    <ImageIcon weight="bold" className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      {...register("image")}
                    />
                  </label>
                  <span className="text-white text-xs font-medium">
                    Ganti Gambar
                  </span>
                </div>

                {selectedFile && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 pointer-events-none">
                    <div className="flex items-center gap-2 text-white/90">
                      <FileImage className="w-4 h-4 shrink-0" />
                      <p className="text-xs truncate font-medium">
                        {selectedFile.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="w-full flex items-center justify-center gap-2 bg-surface-secondary hover:bg-border transition-colors text-foreground text-sm font-semibold py-3 rounded-md mb-3 border border-border/50 cursor-pointer">
                <ImageIcon className="w-4 h-4" /> Upload foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  {...register("image")}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            type="button"
            onClick={() => setIsEditServiceOpen(false)}
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
