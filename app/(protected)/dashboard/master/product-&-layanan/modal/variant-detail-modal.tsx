"use client";

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Button,
  Input,
  TextArea,
  TextField,
  toast,
  Label,
  Surface,
} from "@heroui/react";
import {
  Plus,
  Trash,
  Image as ImageIcon,
  X,
  Info,
  Globe,
  Star,
  BookOpen,
  PlusCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import { useApiFetch, usePost } from "@/app/libs/use-http";
import { ServiceVariant } from "../page";
import { useQueryClient } from "@tanstack/react-query";
import { compressImagesBulk } from "@/app/libs/image-compression";

interface VariantDetailModalProps {
  setIsDetailOpen: (v: boolean) => void;
  variant: ServiceVariant;
}

export function VariantDetailModal({
  setIsDetailOpen,
  variant,
}: VariantDetailModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [description, setDescription] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  // Image States
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Fetch Existing Data
  const { data: detailData, isLoading: isFetching } = useApiFetch<any>(
    [`variant-detail`, variant.id],
    `/master/variants/${variant.id}`,
  );

  useEffect(() => {
    if (detailData?.data?.detail) {
      const detail = detailData.data.detail;
      setDescription(detail.description || "");
      setHowToUse(detail.how_to_use || "");
      setBenefits(detail.benefits || []);
      setMetaTitle(detail.meta_title || "");
      setMetaDescription(detail.meta_description || "");
      setMetaKeywords(detail.meta_keywords || "");
      setExistingImages(detail.images || []);
    }
  }, [detailData]);

  const { mutate: updateDetail, isPending: isSaving } = usePost(
    `/master/variants/${variant.id}/detail`,
    {
      onSuccess: () => {
        toast.success("Berhasil", {
          description: "Detail varian berhasil diperbarui",
        });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        queryClient.invalidateQueries({
          queryKey: ["variant-detail", variant.id],
        });
        setIsDetailOpen(false);
      },
      onError: (err: any) => {
        toast.danger("Gagal", {
          description:
            err?.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan data",
        });
      },
    },
  );

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsCompressing(true);
      try {
        const files = Array.from(e.target.files);

        // Kompresi bulk sebelum simpan ke state
        const compressedFiles = await compressImagesBulk(files, 0.7, 1200);

        setNewImages((prev) => [...prev, ...compressedFiles]);

        const previews = compressedFiles.map((file) =>
          URL.createObjectURL(file),
        );
        setNewImagePreviews((prev) => [...prev, ...previews]);

        toast.success("Gambar berhasil diproses", {
          description: `${files.length} gambar telah dikompresi.`,
        });
      } catch (error) {
        toast.danger("Gagal memproses gambar");
      } finally {
        setIsCompressing(false);
        // Reset input agar bisa pilih file yang sama jika dihapus
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveExistingImage = (url: string) => {
    setDeletedImages([...deletedImages, url]);
    setExistingImages(existingImages.filter((img) => img !== url));
  };

  const handleRemoveNewImage = (index: number) => {
    const updatedImages = [...newImages];
    const updatedPreviews = [...newImagePreviews];

    URL.revokeObjectURL(updatedPreviews[index]);
    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setNewImages(updatedImages);
    setNewImagePreviews(updatedPreviews);
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("description", description);
    formData.append("how_to_use", howToUse);
    formData.append("meta_title", metaTitle);
    formData.append("meta_description", metaDescription);
    formData.append("meta_keywords", metaKeywords);

    benefits.forEach((benefit, index) => {
      formData.append(`benefits[${index}]`, benefit);
    });

    newImages.forEach((image) => {
      formData.append("images[]", image);
    });

    deletedImages.forEach((url, index) => {
      formData.append(`deleted_images[${index}]`, url);
    });

    updateDetail(formData);
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) setIsDetailOpen(false);
        }}
      >
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog
            aria-label={`Detail Varian: ${variant.name}`}
            className="rounded-3xl shadow-xl overflow-hidden"
          >
            <Modal.CloseTrigger
              onPress={() => setIsDetailOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-current hover:bg-surface-secondary transition-colors"
            />

            <Modal.Header className="border-b border-border/60 px-6 py-5">
              <Modal.Icon className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent shrink-0">
                <Info weight="bold" className="w-5 h-5" />
              </Modal.Icon>
              <Modal.Heading>
                <span className="text-lg font-bold leading-tight">
                  Detail Varian
                </span>
                <p className="text-sm text-accent font-semibold leading-tight mt-0.5">
                  {variant.name}
                </p>
                <p className="text-xs text-muted font-normal mt-1.5">
                  Lengkapi informasi detail untuk ditampilkan di halaman produk.
                </p>
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="px-6 py-6 flex flex-col gap-5 bg-surface-secondary/40">
              {/* Section: Images */}
              <Surface
                variant="secondary"
                className="rounded-3xl border border-border/60 p-5 sm:p-6 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent shrink-0">
                      <ImageIcon weight="bold" className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Media
                      </p>
                      <Label className="text-sm font-bold">Galeri Foto</Label>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => fileInputRef.current?.click()}
                    className="rounded-full shrink-0"
                    isPending={isCompressing}
                  >
                    <Plus weight="bold" />
                    {isCompressing ? "Memproses..." : "Tambah Foto"}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Existing Images */}
                  {existingImages.map((url, i) => (
                    <div
                      key={`existing-${i}`}
                      className="relative aspect-square group"
                    >
                      <img
                        src={url}
                        alt={`Preview ${i}`}
                        className="w-full h-full object-cover rounded-2xl border border-border shadow-sm transition-transform group-hover:scale-[1.02]"
                      />
                      <button
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute top-2 right-2 w-7 h-7 bg-surface/95 text-danger rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash weight="bold" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* New Image Previews */}
                  {newImagePreviews.map((url, i) => (
                    <div
                      key={`new-${i}`}
                      className="relative aspect-square group"
                    >
                      <img
                        src={url}
                        alt={`New Preview ${i}`}
                        className="w-full h-full object-cover rounded-2xl border-2 border-accent/40 shadow-sm transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-[9px] font-bold text-white rounded-full uppercase tracking-wider">
                        Baru
                      </div>
                      <button
                        onClick={() => handleRemoveNewImage(i)}
                        className="absolute top-2 right-2 w-7 h-7 bg-surface/95 text-danger rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash weight="bold" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {existingImages.length === 0 && newImages.length === 0 && (
                    <div
                      onClick={() =>
                        !isCompressing && fileInputRef.current?.click()
                      }
                      className={`col-span-full h-36 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted transition-all cursor-pointer ${
                        isCompressing
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-accent hover:text-accent hover:bg-accent/5"
                      }`}
                    >
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent">
                        {isCompressing ? (
                          <CircleNotch size={20} className="animate-spin" />
                        ) : (
                          <ImageIcon size={20} />
                        )}
                      </span>
                      <span className="text-sm font-medium">
                        {isCompressing
                          ? "Sedang mengompres gambar..."
                          : "Belum ada foto. Klik untuk tambah."}
                      </span>
                    </div>
                  )}
                </div>
              </Surface>

              {/* Section: Description & Benefits */}
              <Surface
                variant="secondary"
                className="rounded-3xl border border-border/60 p-5 sm:p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-5">
                    <TextField className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent shrink-0">
                          <Star weight="bold" className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Konten
                          </p>
                          <Label className="text-sm font-bold">
                            Deskripsi Produk
                          </Label>
                        </div>
                      </div>
                      <TextArea
                        placeholder="Jelaskan detail layanan ini..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        fullWidth
                      />
                    </TextField>

                    <TextField className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent shrink-0">
                          <BookOpen weight="bold" className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Konten
                          </p>
                          <Label className="text-sm font-bold">
                            Cara Penggunaan
                          </Label>
                        </div>
                      </div>
                      <TextArea
                        placeholder="Instruksi atau cara penggunaan..."
                        value={howToUse}
                        onChange={(e) => setHowToUse(e.target.value)}
                        rows={4}
                        fullWidth
                      />
                    </TextField>
                  </div>

                  <div className="flex flex-col gap-2 md:border-l md:border-border/60 md:pl-6">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent shrink-0">
                        <PlusCircle weight="bold" className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Konten
                        </p>
                        <Label className="text-sm font-bold">
                          Keunggulan & Manfaat
                        </Label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Contoh: Melembabkan kulit"
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddBenefit()
                        }
                        fullWidth
                        className="flex-1"
                      />
                      <Button
                        isIconOnly
                        variant="outline"
                        onPress={handleAddBenefit}
                        className="rounded-full shrink-0"
                      >
                        <Plus weight="bold" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {benefits.map((benefit, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-semibold group animate-in fade-in zoom-in duration-200"
                        >
                          {benefit}
                          <button
                            onClick={() => handleRemoveBenefit(i)}
                            className="w-4 h-4 flex items-center justify-center rounded-full text-accent/70 hover:text-white hover:bg-danger transition-colors"
                          >
                            <X weight="bold" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {benefits.length === 0 && (
                        <p className="text-xs text-muted italic">
                          Belum ada keunggulan ditambahkan.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Surface>

              {/* Section: SEO */}
              <Surface
                variant="secondary"
                className="rounded-3xl border border-border/60 p-5 sm:p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent shrink-0">
                    <Globe weight="bold" className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Pencarian
                    </p>
                    <Label className="text-sm font-bold">Optimasi SEO</Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-muted">
                      Meta Title
                    </Label>
                    <Input
                      placeholder="Judul untuk mesin pencari"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      fullWidth
                    />
                  </TextField>

                  <TextField className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-muted">
                      Meta Keywords
                    </Label>
                    <Input
                      placeholder="Kata kunci (pisahkan dengan koma)"
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      fullWidth
                    />
                  </TextField>

                  <TextField className="md:col-span-2 flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-muted">
                      Meta Description
                    </Label>
                    <TextArea
                      placeholder="Deskripsi singkat untuk hasil pencarian Google"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={2}
                      fullWidth
                    />
                  </TextField>
                </div>
              </Surface>
            </Modal.Body>

            <Modal.Footer className="border-t border-border/60 bg-surface px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onPress={() => setIsDetailOpen(false)}
                className="rounded-full font-bold"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isPending={isSaving}
                className="rounded-full font-bold px-8"
              >
                Simpan Detail
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
