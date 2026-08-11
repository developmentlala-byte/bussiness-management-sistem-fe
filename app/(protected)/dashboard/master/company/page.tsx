"use client";

import React, { useEffect } from "react";
import {
  Card,
  Button,
  TextField,
  Input,
  TextArea,
  Select,
  ListBox,
  toast,
  Spinner,
  Label,
  FieldError,
} from "@heroui/react";
import {
  Storefront,
  Buildings,
  Envelope,
  Phone,
  MapPin,
  Globe,
  CurrencyCircleDollar,
  HardDriveIcon,
  DeviceMobileCameraIcon,
} from "@phosphor-icons/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApiFetch, usePut } from "@/app/libs/use-http";

// ==========================================
// 1. ZOD VALIDATION SCHEMA
// ==========================================
const companySchema = z.object({
  name: z.string().min(3, "Nama bisnis minimal 3 karakter").max(255),
  legal_name: z.string().max(255).optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  timezone: z.string().min(1, "Timezone wajib dipilih"),
  currency: z.string().min(1, "Mata uang wajib dipilih").max(3),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyData {
  id: number;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
}

// ==========================================
// 2. COMPONENT
// ==========================================
export default function MasterCompanyPage() {
  // --- FETCH DATA ---
  const { data: response, isLoading } = useApiFetch<{ data: CompanyData }>(
    ["company-profile"],
    "/st/company",
  );

  const companyData = response?.data;

  // --- FORM SETUP ---
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      legal_name: "",
      email: "",
      phone: "",
      address: "",
      timezone: "Asia/Jakarta",
      currency: "IDR",
    },
  });

  // Sync data when fetched
  useEffect(() => {
    if (companyData) {
      reset({
        name: companyData.name || "",
        legal_name: companyData.legal_name || "",
        email: companyData.email || "",
        phone: companyData.phone || "",
        address: companyData.address || "",
        timezone: companyData.timezone || "Asia/Jakarta",
        currency: companyData.currency || "IDR",
      });
    }
  }, [companyData, reset]);

  // --- UPDATE MUTATION ---
  const { mutate: updateCompany, isPending: isUpdating } = usePut<
    { data: CompanyData },
    CompanyFormValues
  >("/st/company", {
    invalidate: [["company-profile"]],
    onSuccess: () => {
      toast.success("Profil Diperbarui", {
        description: "Informasi bisnis Anda telah berhasil disimpan.",
      });
    },
    onError: (error: any) => {
      toast.danger("Gagal memperbarui profil", {
        description:
          error?.response?.data?.message || "Terjadi kesalahan pada server.",
      });
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    updateCompany(data);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="accent" />
        <p className="text-sm text-muted">Memuat profil bisnis...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <Storefront weight="fill" className="text-accent w-8 h-8" />
          Profil Bisnis
        </h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed">
          Kelola informasi dasar dan pengaturan regional untuk operasional spa
          Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-border bg-surface shadow-sm overflow-visible">
          <Card.Header className="px-6 py-5 border-b border-separator bg-surface-secondary/30">
            <Card.Title className="text-base font-bold">
              Informasi Dasar
            </Card.Title>
            <Card.Description className="text-xs">
              Detail ini akan muncul pada invoice dan laporan.
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-6 space-y-6">
            {/* Row 1: Name & Legal Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField isInvalid={!!errors.name} className="space-y-2">
                <Label className="text-sm font-semibold">Nama Bisnis *</Label>
                <Input
                  {...register("name")}
                  placeholder="Contoh: Mahalu Spa"
                  className={`bg-background border ${errors.name ? "border-danger" : "border-border"} rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-1 focus:ring-accent transition-all`}
                />
                {errors.name && (
                  <FieldError className="text-xs text-danger mt-1 block font-medium">
                    {errors.name.message}
                  </FieldError>
                )}
              </TextField>

              <TextField className="space-y-2">
                <Label className="text-sm font-semibold">Nama Legal / PT</Label>
                <Input
                  {...register("legal_name")}
                  placeholder="Contoh: PT. Mahalu Sejahtera"
                  className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </TextField>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField isInvalid={!!errors.email} className="space-y-2">
                <Label className="text-sm font-semibold">Email Bisnis</Label>
                <Input
                  {...register("email")}
                  placeholder="business@example.com"
                  className={`bg-background border ${errors.email ? "border-danger" : "border-border"} rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-1 focus:ring-accent transition-all`}
                />
                {errors.email && (
                  <FieldError className="text-xs text-danger mt-1 block font-medium">
                    {errors.email.message}
                  </FieldError>
                )}
              </TextField>

              <TextField className="space-y-2">
                <Label className="text-sm font-semibold">Nomor Telepon</Label>
                <Input
                  {...register("phone")}
                  placeholder="08123456789"
                  className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </TextField>
            </div>

            {/* Row 3: Address */}
            <TextField className="space-y-2">
              <Label className="text-sm font-semibold">Alamat Lengkap</Label>
              <TextArea
                {...register("address")}
                placeholder="Jl. Raya Spa No. 123..."
                rows={3}
                className="bg-background border border-border rounded-xl px-4 py-3 text-sm w-full outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
              />
            </TextField>
          </Card.Content>
        </Card>

        <Card className="border border-border bg-surface shadow-sm overflow-visible">
          <Card.Header className="px-6 py-5 border-b border-separator bg-surface-secondary/30">
            <Card.Title className="text-base font-bold">
              Pengaturan Regional
            </Card.Title>
            <Card.Description className="text-xs">
              Konfigurasi zona waktu dan mata uang untuk perhitungan finansial.
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timezone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Zona Waktu *</Label>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <Select
                      aria-label="Zona Waktu"
                      value={field.value}
                      onChange={(value) => field.onChange(value as string)}
                      className="w-full"
                    >
                      <Select.Trigger className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all flex items-center justify-between">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="bg-surface border border-border rounded-xl shadow-xl p-1 z-[100]">
                        <ListBox>
                          <ListBox.Item
                            id="Asia/Jakarta"
                            textValue="WIB (Asia/Jakarta)"
                          >
                            WIB (Asia/Jakarta)
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="Asia/Makassar"
                            textValue="WITA (Asia/Makassar)"
                          >
                            WITA (Asia/Makassar)
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="Asia/Jayapura"
                            textValue="WIT (Asia/Jayapura)"
                          >
                            WIT (Asia/Jayapura)
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Mata Uang *</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      aria-label="Mata Uang"
                      value={field.value}
                      onChange={(value) => field.onChange(value as string)}
                      className="w-full"
                    >
                      <Select.Trigger className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent transition-all flex items-center justify-between">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="bg-surface border border-border rounded-xl shadow-xl p-1 z-[100]">
                        <ListBox>
                          <ListBox.Item
                            id="IDR"
                            textValue="IDR - Rupiah Indonesia"
                          >
                            IDR - Rupiah Indonesia
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="USD" textValue="USD - US Dollar">
                            USD - US Dollar
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="SGD"
                            textValue="SGD - Singapore Dollar"
                          >
                            SGD - Singapore Dollar
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="secondary"
            onPress={() => reset()}
            isDisabled={!isDirty || isUpdating}
            className="h-11 px-6 rounded-xl font-semibold"
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            isPending={isUpdating}
            isDisabled={!isDirty}
            className="h-11 px-8 rounded-xl font-bold bg-accent text-accent-foreground shadow-md hover:shadow-lg transition-all gap-2"
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <HardDriveIcon className="w-5 h-5" />
                )}
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
