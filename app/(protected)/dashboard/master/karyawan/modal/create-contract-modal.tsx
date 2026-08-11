import React, { useState, useRef } from "react";
import {
  X,
  FilePdf,
  CalendarBlank,
  Info,
  UploadSimple,
} from "@phosphor-icons/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  toast,
  DatePicker,
  Calendar,
  FieldError,
  DateField,
  Button,
} from "@heroui/react";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { usePost } from "@/app/libs/use-http";

// ==========================================
// 1. ZOD VALIDATION SCHEMA
// ==========================================
const contractSchema = z
  .object({
    start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
    end_date: z.string().min(1, "Tanggal berakhir wajib diisi"),
    note: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "Tanggal berakhir harus setelah tanggal mulai",
      path: ["end_date"],
    },
  );

type ContractFormValues = z.infer<typeof contractSchema>;

interface CreateContractModalProps {
  staffId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// 2. COMPONENT
// ==========================================
export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  staffId,
  isOpen,
  onClose,
}) => {
  const timeZone = getLocalTimeZone();
  const currentDateStr = today(timeZone).toString();

  // --- STATE UNTUK FILE PDF ---
  const [contractFile, setContractFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      start_date: currentDateStr,
      end_date: today(timeZone).add({ years: 1 }).toString(),
    },
  });

  const { mutate: uploadContract, isPending } = usePost<unknown, FormData>(
    `/master/staffs/${staffId}/contracts`,
    {
      invalidate: [["staff-contracts", staffId]],
      onSuccess: () => {
        toast.success("Kontrak Berhasil Diperbarui", {
          description:
            "Kontrak baru telah aktif dan kontrak lama diarsipkan secara otomatis.",
        });
        reset();
        setContractFile(null);
        onClose();
      },
      onError: (error: any) => {
        toast.danger("Gagal mengunggah kontrak", {
          description:
            error?.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan dokumen kontrak.",
        });
      },
    },
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.danger("File terlalu besar", {
          description: "Maksimal ukuran file kontrak adalah 10MB.",
        });
        return;
      }
      if (file.type !== "application/pdf") {
        toast.danger("Format file salah", {
          description: "Harap unggah dokumen dalam format PDF.",
        });
        return;
      }
      setContractFile(file);
    }
  };

  const onSubmit = (data: ContractFormValues) => {
    if (!contractFile) {
      toast.warning("File kontrak wajib diunggah", {
        description: "Silakan pilih dokumen PDF kontrak terlebih dahulu.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("start_date", data.start_date);
    formData.append("end_date", data.end_date);
    if (data.note) formData.append("note", data.note);
    formData.append("file", contractFile);

    uploadContract(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Perbarui Kontrak Kerja
            </h2>
            <p className="text-xs text-muted">
              Unggah versi kontrak terbaru untuk staf ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-2 rounded-full hover:bg-surface-secondary outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Dates Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tanggal Mulai *
              </label>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => {
                  const dateValue = field.value
                    ? parseDate(field.value)
                    : parseDate(currentDateStr);
                  return (
                    <DatePicker
                      className="w-full"
                      value={dateValue}
                      onChange={(date) => field.onChange(date?.toString())}
                    >
                      <DateField.Group className="h-11 rounded-xl">
                        <DatePicker.Trigger className="w-full bg-surface border border-border focus-within:ring-1 focus-within:border-accent focus-within:ring-accent px-4 h-full text-sm shadow-sm transition-all flex items-center outline-none cursor-pointer">
                          <CalendarBlank className="w-4 h-4 text-muted mr-2 shrink-0" />
                          <span className="text-foreground truncate flex-1 text-left">
                            {new Intl.DateTimeFormat("id-ID", {
                              dateStyle: "medium",
                            }).format(dateValue.toDate(timeZone))}
                          </span>
                        </DatePicker.Trigger>
                      </DateField.Group>
                      <DatePicker.Popover
                        placement="bottom start"
                        className="w-full max-w-[280px] rounded-2xl border border-border bg-surface p-4 shadow-2xl z-[120]"
                      >
                        <Calendar
                          aria-label="Pilih tanggal mulai"
                          className="w-full"
                        >
                          <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                              <Calendar.YearPickerTriggerHeading />
                              <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                        </Calendar>
                      </DatePicker.Popover>
                    </DatePicker>
                  );
                }}
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tanggal Berakhir *
              </label>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => {
                  const dateValue = field.value
                    ? parseDate(field.value)
                    : parseDate(currentDateStr);
                  return (
                    <DatePicker
                      className="w-full"
                      value={dateValue}
                      onChange={(date) => field.onChange(date?.toString())}
                    >
                      <DateField.Group className="h-11 rounded-xl">
                        <DatePicker.Trigger
                          className={`w-full bg-surface border px-4 h-full text-sm shadow-sm transition-all flex items-center outline-none cursor-pointer ${errors.end_date ? "border-danger focus-within:ring-danger" : "border-border hover:border-accent focus-within:border-accent focus-within:ring-accent"}`}
                        >
                          <CalendarBlank className="w-4 h-4 text-muted mr-2 shrink-0" />
                          <span className="text-foreground truncate flex-1 text-left">
                            {new Intl.DateTimeFormat("id-ID", {
                              dateStyle: "medium",
                            }).format(dateValue.toDate(timeZone))}
                          </span>
                        </DatePicker.Trigger>
                      </DateField.Group>
                      <DatePicker.Popover
                        placement="bottom start"
                        className="w-full max-w-[280px] rounded-2xl border border-border bg-surface p-4 shadow-2xl z-[120]"
                      >
                        <Calendar
                          aria-label="Pilih tanggal berakhir"
                          className="w-full"
                        >
                          <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                              <Calendar.YearPickerTriggerHeading />
                              <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                        </Calendar>
                      </DatePicker.Popover>
                      {errors.end_date && (
                        <FieldError className="text-xs text-danger mt-1.5 block">
                          {errors.end_date.message}
                        </FieldError>
                      )}
                    </DatePicker>
                  );
                }}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Catatan Kontrak (Opsional)
            </label>
            <textarea
              {...register("note")}
              rows={3}
              className="w-full bg-surface border border-border rounded-xl p-4 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
              placeholder="Misal: Perpanjangan setelah evaluasi tahun kedua..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Dokumen Kontrak (PDF) *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-between border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${
                contractFile
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50 hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${contractFile ? "bg-accent text-accent-foreground" : "bg-muted/10 text-muted"}`}
                >
                  <FilePdf weight="fill" size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {contractFile
                      ? contractFile.name
                      : "Pilih file kontrak PDF"}
                  </p>
                  <p className="text-xs text-muted">
                    {contractFile
                      ? `${(contractFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "Maksimal ukuran file 10MB"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contractFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContractFile(null);
                    }}
                    className="p-2 hover:bg-danger/10 text-danger rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
                <div className="p-2 bg-surface border border-border rounded-lg text-muted">
                  <UploadSimple size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex gap-3 bg-accent/5 p-4 rounded-xl border border-accent/20">
            <Info className="w-5 h-5 text-accent shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              Mengunggah kontrak baru akan secara otomatis menonaktifkan status
              kontrak saat ini dan memindahkannya ke dalam riwayat. Pastikan
              data tanggal sudah sesuai dengan dokumen fisik.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border shrink-0">
          <Button
            variant="ghost"
            onPress={onClose}
            className="rounded-xl font-semibold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            className="bg-accent text-accent-foreground font-bold rounded-xl px-8 shadow-lg shadow-accent/20"
          >
            Simpan Kontrak
          </Button>
        </div>
      </form>
    </div>
  );
};
