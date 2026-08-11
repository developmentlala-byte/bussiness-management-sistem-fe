import React, { useState, useRef } from "react";
import { X, Paperclip, CalendarBlank, Info } from "@phosphor-icons/react";
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
  Select,
  ListBox,
} from "@heroui/react";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { usePost } from "@/app/libs/use-http";

// ==========================================
// 1. ZOD VALIDATION SCHEMA
// ==========================================
const warningSchema = z.object({
  level: z.enum(["ringan", "sedang", "berat"], {
    errorMap: () => ({ message: "Pilih tingkat peringatan" }),
  }),
  note: z.string().min(10, "Catatan minimal 10 karakter").max(1000),
  date: z.string().min(1, "Tanggal wajib diisi"),
});

type WarningFormValues = z.infer<typeof warningSchema>;

interface CreateWarningModalProps {
  staffId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// 2. COMPONENT
// ==========================================
export const CreateWarningModal: React.FC<CreateWarningModalProps> = ({
  staffId,
  isOpen,
  onClose,
}) => {
  const timeZone = getLocalTimeZone();
  const currentDateStr = today(timeZone).toString();

  // --- STATE UNTUK FILE ATTACHMENT ---
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<WarningFormValues>({
    resolver: zodResolver(warningSchema),
    defaultValues: {
      level: "ringan",
      date: currentDateStr,
    },
  });

  const { mutate: createWarning, isPending } = usePost<unknown, FormData>(
    `/master/staffs/${staffId}/warnings`,
    {
      invalidate: [["staff-warnings", staffId]],
      onSuccess: () => {
        toast.success("Peringatan Berhasil Dicatat", {
          description: "Data peringatan telah disimpan ke dalam riwayat staf.",
        });
        reset();
        setAttachmentFile(null);
        onClose();
      },
      onError: (error: any) => {
        toast.danger("Gagal mencatat peringatan", {
          description:
            error?.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan data.",
        });
      },
    },
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.danger("File terlalu besar", {
          description: "Maksimal ukuran file lampiran adalah 5MB.",
        });
        return;
      }
      setAttachmentFile(file);
    }
  };

  const onSubmit = (data: WarningFormValues) => {
    const formData = new FormData();
    formData.append("level", data.level);
    formData.append("note", data.note);
    formData.append("date", data.date);

    if (attachmentFile) {
      formData.append("attachment", attachmentFile);
    }

    createWarning(formData);
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
              Catat Peringatan Staf
            </h2>
            <p className="text-xs text-muted">
              Pastikan data yang dimasukkan sudah sesuai dengan prosedur HR.
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
          {/* Level & Date */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tingkat Peringatan *
              </label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select
                    className="w-full"
                    selectedKey={field.value}
                    onSelectionChange={(key) => field.onChange(String(key))}
                  >
                    <Select.Trigger className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 h-11 text-sm outline-none transition-all">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Popover className="bg-surface border border-border rounded-xl shadow-xl p-1">
                      <ListBox>
                        <ListBox.Item
                          id="ringan"
                          textValue="Ringan"
                          className="hover:bg-surface-secondary py-2 rounded-lg"
                        >
                          <span className="text-sm font-medium">Ringan</span>
                        </ListBox.Item>
                        <ListBox.Item
                          id="sedang"
                          textValue="Sedang"
                          className="hover:bg-surface-secondary py-2 rounded-lg"
                        >
                          <span className="text-sm font-medium text-warning">
                            Sedang
                          </span>
                        </ListBox.Item>
                        <ListBox.Item
                          id="berat"
                          textValue="Berat"
                          className="hover:bg-surface-secondary py-2 rounded-lg"
                        >
                          <span className="text-sm font-medium text-danger">
                            Berat
                          </span>
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tanggal Diberikan *
              </label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => {
                  const dateValue = field.value
                    ? parseDate(field.value)
                    : parseDate(currentDateStr);

                  return (
                    <DatePicker
                      className="w-full"
                      value={dateValue}
                      maxValue={today(timeZone)}
                      onChange={(date) => field.onChange(date?.toString())}
                    >
                      <DateField.Group className="h-11 rounded-xl">
                        <DatePicker.Trigger
                          className={`w-full bg-surface border focus-within:ring-1 px-4 h-full text-sm shadow-sm transition-all flex items-center outline-none cursor-pointer ${
                            errors.date
                              ? "border-danger focus-within:border-danger focus-within:ring-danger"
                              : "border-border hover:border-accent focus-within:border-accent focus-within:ring-accent"
                          }`}
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
                        <Calendar aria-label="Pilih tanggal" className="w-full">
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
                      {errors.date && (
                        <FieldError className="text-xs text-danger mt-1.5 block">
                          {errors.date.message}
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
              Isi Peringatan / Catatan Pelanggaran *
            </label>
            <textarea
              {...register("note")}
              rows={4}
              className={`w-full bg-surface border rounded-xl p-4 text-sm outline-none transition-all resize-none ${
                errors.note
                  ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger"
                  : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
              }`}
              placeholder="Jelaskan detail pelanggaran yang dilakukan staf..."
            />
            {errors.note && (
              <span className="text-xs text-danger mt-1.5 block">
                {errors.note.message}
              </span>
            )}
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Lampiran Bukti (Opsional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-between border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                attachmentFile
                  ? "border-accent/50 bg-accent/5"
                  : "border-border hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/10 flex items-center justify-center text-muted">
                  <Paperclip weight="bold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {attachmentFile ? attachmentFile.name : "Unggah dokumen pendukung"}
                  </p>
                  <p className="text-xs text-muted">
                    {attachmentFile
                      ? `${(attachmentFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "PDF, JPG, PNG (Maks. 5MB)"}
                  </p>
                </div>
              </div>
              {attachmentFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachmentFile(null);
                  }}
                  className="p-1.5 hover:bg-danger/10 text-danger rounded-md"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="flex gap-3 bg-muted/5 p-4 rounded-xl border border-border/50">
            <Info className="w-5 h-5 text-muted shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              Peringatan yang dicatat akan langsung muncul di timeline riwayat
              staf dan memengaruhi statistik kinerja tahunan. Tindakan ini tidak
              dapat dibatalkan oleh HR biasa (hanya Owner).
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
            Catat Peringatan
          </Button>
        </div>
      </form>
    </div>
  );
};
