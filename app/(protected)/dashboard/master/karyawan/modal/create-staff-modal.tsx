import React, { useState, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Info,
  CalendarBlank,
  Desktop,
  Star,
  HandHeart,
  UserGear,
} from "@phosphor-icons/react";
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
  DatePicker,
  Calendar,
  FieldError,
  DateField,
} from "@heroui/react";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { usePost } from "@/app/libs/use-http";

// ==========================================
// 1. MOCK DATA JABATAN (Untuk Autocomplete)
// ==========================================
const JOB_ROLES = [
  { id: "Admin", label: "Admin", icon: Desktop },
  { id: "Manager Therapist", label: "Manager Therapist", icon: Star },
  { id: "Therapist", label: "Therapist", icon: HandHeart },
  { id: "Receptionist", label: "Receptionist", icon: UserGear },
];

// ==========================================
// 2. ZOD VALIDATION SCHEMA
// ==========================================
const staffSchema = z.object({
  first_name: z.string().min(1, "Nama depan wajib diisi").max(255),
  last_name: z.string().max(255).optional(),
  email: z
    .union([z.string().email("Format email tidak valid"), z.string().length(0)])
    .optional(),
  phone_number: z.string().max(20, "Nomor telepon terlalu panjang").optional(),
  job_title: z.string().min(1, "Posisi / Jabatan wajib dipilih").max(255),
  join_date: z.string().min(1, "Tanggal bergabung wajib diisi"),
  status: z
    .enum(["active", "inactive", "on_leave", "terminated"])
    .default("active"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface CreateStaffModalProps {
  setIsAddStaffOpen: (isOpen: boolean) => void;
}

// ==========================================
// 3. MODAL COMPONENT
// ==========================================
export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  setIsAddStaffOpen,
}) => {
  const [submitAction, setSubmitAction] = useState<"save" | "save_and_add">(
    "save",
  );
  const { contains } = useFilter({ sensitivity: "base" });
  const timeZone = getLocalTimeZone();
  const currentDateStr = today(timeZone).toString();

  // --- STATE UNTUK IMAGE UPLOAD ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Hook Form Setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      status: "active",
      join_date: currentDateStr,
    },
  });

  const { mutate: createStaff, isPending } = usePost<unknown, FormData>(
    "/master/staffs",
    {
      invalidate: [["staffs"]],
      onSuccess: () => {
        toast.success("Staf berhasil ditambahkan", {
          description: "Data staf baru telah tersimpan dan siap dijadwalkan.",
        });

        if (submitAction === "save") {
          setIsAddStaffOpen(false);
        } else {
          reset({
            first_name: "",
            last_name: "",
            email: "",
            phone_number: "",
            job_title: "",
            join_date: currentDateStr,
            status: "active",
          });
          setImageFile(null);
          setImagePreview(null);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menyimpan data", {
          description:
            error?.response?.data?.message ||
            "Terjadi kesalahan internal pada server.",
        });
      },
    },
  );

  // --- HANDLER UNTUK IMAGE SELECTION ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.danger("Ukuran file terlalu besar", {
          description: "Maksimal ukuran file foto adalah 2MB.",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.danger("Format file tidak didukung", {
          description: "Silakan unggah file gambar (JPG/PNG).",
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: StaffFormValues) => {
    const formData = new FormData();
    formData.append("first_name", data.first_name);
    if (data.last_name) formData.append("last_name", data.last_name);
    if (data.email) formData.append("email", data.email);
    if (data.phone_number) formData.append("phone_number", data.phone_number);
    formData.append("job_title", data.job_title);
    formData.append("join_date", data.join_date);
    formData.append("status", data.status);

    if (imageFile) {
      formData.append("avatar", imageFile);
    }

    createStaff(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            Tambah Staf Baru
          </h2>
          <button
            type="button"
            onClick={() => setIsAddStaffOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* First Name & Last Name */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Nama Depan *
              </label>
              <input
                type="text"
                {...register("first_name")}
                className={`w-full bg-surface border focus:ring-1 rounded-md px-3 h-[38px] text-sm outline-none transition-colors ${
                  errors.first_name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
                placeholder="Contoh: Elin"
              />
              {errors.first_name && (
                <span className="text-xs text-red-500 mt-1.5 block">
                  {errors.first_name.message}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Nama Belakang
              </label>
              <input
                type="text"
                {...register("last_name")}
                className="w-full bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 h-[38px] text-sm outline-none transition-colors"
                placeholder="Contoh: Kusuma"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Email Akses
              </label>
              <input
                type="email"
                {...register("email")}
                className={`w-full bg-surface border focus:ring-1 rounded-md px-3 h-[38px] text-sm outline-none transition-colors ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
                placeholder="elin@mahalu.group"
              />
              {errors.email && (
                <span className="text-xs text-red-500 mt-1.5 block">
                  {errors.email.message}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-foreground mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                {...register("phone_number")}
                className={`w-full bg-surface border focus:ring-1 rounded-md px-3 h-[38px] text-sm outline-none transition-colors ${
                  errors.phone_number
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
                placeholder="0812xxxxxx"
              />
            </div>
          </div>

          <div className="flex gap-4">
            {/* JABATAN (Autocomplete) */}
            <div className="flex-[3]">
              <label className="block text-sm text-foreground mb-1.5">
                Posisi / Jabatan *
              </label>
              <Controller
                name="job_title"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    className="w-full"
                    placeholder="Pilih atau ketik jabatan..."
                    selectionMode="single"
                    value={field.value || null}
                    onChange={(key) => field.onChange(key ? String(key) : "")}
                  >
                    <Autocomplete.Trigger
                      className={`w-full bg-surface border focus-within:ring-1 rounded-md px-3 h-[38px] text-sm shadow-sm transition-colors flex items-center justify-between outline-none cursor-pointer ${errors.job_title ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500" : "border-border hover:border-accent focus-within:border-accent focus-within:ring-accent"}`}
                    >
                      <Autocomplete.Value>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {({ defaultChildren, isPlaceholder }: any) => {
                          if (isPlaceholder || !field.value) {
                            return (
                              <span className="text-muted font-normal">
                                Pilih jabatan...
                              </span>
                            );
                          }
                          const selectedRole = JOB_ROLES.find(
                            (r) => r.id === field.value,
                          );
                          if (!selectedRole) return defaultChildren;

                          return (
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <selectedRole.icon className="w-4 h-4 text-accent" />
                              <span className="truncate">
                                {selectedRole.label}
                              </span>
                            </div>
                          );
                        }}
                      </Autocomplete.Value>
                      <Autocomplete.Indicator className="text-muted" />
                    </Autocomplete.Trigger>

                    <Autocomplete.Popover
                      placement="bottom start"
                      className="w-[260px] bg-surface border border-border rounded-xl shadow-xl z-[100] p-1"
                    >
                      <Autocomplete.Filter filter={contains}>
                        <SearchField autoFocus name="search" className="mb-2">
                          <SearchField.Group className="bg-surface-secondary border border-transparent focus-within:border-accent rounded-lg px-3 py-2 flex items-center gap-2">
                            <SearchField.SearchIcon className="w-4 h-4 text-muted" />
                            <SearchField.Input
                              placeholder="Cari jabatan..."
                              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                            />
                            <SearchField.ClearButton className="text-muted hover:text-foreground" />
                          </SearchField.Group>
                        </SearchField>

                        <ListBox
                          className="max-h-[200px] overflow-y-auto outline-none"
                          renderEmptyState={() => (
                            <EmptyState className="py-4 text-sm text-muted">
                              Jabatan tidak ditemukan
                            </EmptyState>
                          )}
                        >
                          {JOB_ROLES.map((role) => (
                            <ListBox.Item
                              key={role.id}
                              id={role.id}
                              textValue={role.label}
                              className="group flex items-center gap-2 px-3 py-2 rounded-lg outline-none hover:bg-surface-secondary focus:bg-surface-secondary cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <role.icon
                                  weight="duotone"
                                  className="w-4 h-4 text-muted group-hover:text-accent group-focus:text-accent"
                                />
                                <span className="text-sm text-foreground">
                                  {role.label}
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
              {errors.job_title && (
                <span className="text-xs text-red-500 mt-1.5 block">
                  {errors.job_title.message}
                </span>
              )}
            </div>

            {/* TANGGAL BERGABUNG (DatePicker HeroUI) */}
            <div className="flex-[2]">
              <label className="block text-sm text-foreground mb-1.5">
                Bergabung *
              </label>
              <Controller
                name="join_date"
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
                      <DateField.Group className="h-[38px] rounded-md">
                        {/* FIX: Trigger dipindah ke luar dan membungkus seluruh kotak input */}
                        <DatePicker.Trigger
                          className={`w-full bg-surface border focus-within:ring-1  px-3 h-full text-sm shadow-sm transition-colors flex items-center outline-none cursor-pointer ${
                            errors.join_date
                              ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
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

                      {/* FIX: Tambah placement="bottom start" dan z-[100] */}
                      <DatePicker.Popover
                        placement="bottom start"
                        className="w-full max-w-[300px] rounded-xl border border-border bg-surface p-3 shadow-sm mx-auto"
                      >
                        <Calendar aria-label="Choose date" className="w-full">
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

                      {errors.join_date && (
                        <FieldError className="text-xs text-red-500 mt-1.5 block">
                          {errors.join_date.message}
                        </FieldError>
                      )}
                    </DatePicker>
                  );
                }}
              />
            </div>
          </div>

          {/* UPLOAD FOTO */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              Foto (Opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            {imagePreview ? (
              <div className="relative w-full flex items-center justify-center py-6 px-4 bg-surface-secondary rounded-md mb-3 border border-border/50">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded-md hover:bg-surface-secondary transition-colors outline-none"
                  title="Hapus foto"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-surface-secondary hover:bg-border transition-colors text-foreground text-sm font-medium py-3 rounded-md mb-3 border border-border/50 outline-none"
              >
                <ImageIcon className="w-4 h-4 text-muted" /> Upload foto
              </button>
            )}

            <div className="flex gap-2.5 items-start bg-surface-secondary/60 p-3 rounded-md border border-border/30">
              <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              <p className="text-[13px] text-muted leading-relaxed">
                Untuk tampilan optimal di tabel jadwal, sematkan foto dengan
                rasio persegi (1:1) dan resolusi minimal 500x500px.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={() => setIsAddStaffOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors outline-none"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={() => setSubmitAction("save_and_add")}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground border border-border rounded-md hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
          >
            {isPending && submitAction === "save_and_add"
              ? "Menyimpan..."
              : "Simpan & Buat Lagi"}
          </button>
          <button
            type="submit"
            onClick={() => setSubmitAction("save")}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed outline-none"
          >
            {isPending && submitAction === "save" ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};
