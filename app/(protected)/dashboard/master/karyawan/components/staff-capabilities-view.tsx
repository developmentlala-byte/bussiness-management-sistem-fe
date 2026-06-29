"use client";

import {
  Avatar,
  Button,
  Checkbox,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import { Check, MagnifyingGlass, PencilSimple, X } from "@phosphor-icons/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useApiFetch, usePut } from "@/app/libs/use-http";
import { toast } from "@heroui/react";

import { Staff } from "@/app/types/staff";
import { Category } from "@/app/types/product-&-layanan";

export default function StaffCapabilitiesView() {
  const [search, setSearch] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // Cache kemampuan per staff: { [staffId]: Category[] }
  const [capabilitiesCache, setCapabilitiesCache] = useState<
    Record<number, Category[]>
  >({});

  const { data: staffsResponse, isLoading: staffsLoading } = useApiFetch<{
    data: Staff[];
  }>(["staffs"], "/master/staffs");
  const staffs = staffsResponse?.data || [];

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useApiFetch<{ data: Category[] }>(["categories"], "/master/categories");
  const categories = categoriesResponse?.data || [];

  const { data: capabilitiesResponse, refetch: refetchCapabilities } =
    useApiFetch<{ data: Category[] }>(
      ["capabilities", editingStaffId],
      editingStaffId ? `/master/capabilities/${editingStaffId}` : "",
      undefined,
      !!editingStaffId,
    );

  const updateCapabilities = usePut<unknown, { category_ids: number[] }>(
    (data) => `/master/capabilities/${editingStaffId}`,
    {
      invalidate: [["capabilities"], ["staffs"]],
      onSuccess: () => {
        toast.success("Kemampuan staf berhasil diperbarui");

        // ✅ Update cache lokal setelah save berhasil
        if (editingStaffId !== null) {
          const savedCategories = categories.filter((cat) =>
            selectedCategories.includes(Number(cat.id)),
          );
          setCapabilitiesCache((prev) => ({
            ...prev,
            [editingStaffId]: savedCategories,
          }));
        }

        setEditingStaffId(null);
        setSelectedCategories([]);
      },
      onError: (error) => {
        toast.error("Gagal memperbarui kemampuan staf: " + error.message);
      },
    },
  );

  // ✅ Saat capabilitiesResponse masuk (saat buka edit), simpan ke cache
  useEffect(() => {
    if (capabilitiesResponse?.data && editingStaffId) {
      const caps = capabilitiesResponse.data;

      // Simpan ke cache agar ditampilkan di kolom view
      setCapabilitiesCache((prev) => ({
        ...prev,
        [editingStaffId]: caps,
      }));

      // Inisialisasi checkbox
      setSelectedCategories(caps.map((cat) => Number(cat.id)));
    }
  }, [capabilitiesResponse?.data, editingStaffId]);

  // ✅ Pre-fetch capabilities semua staff saat data staff sudah ada
  //    Jalankan satu per satu via endpoint individual, atau ganti dengan
  //    bulk endpoint jika tersedia di backend.
  //    Uncomment blok ini jika mau pre-fetch otomatis:
  //
  // useEffect(() => {
  //   if (staffs.length === 0) return;
  //   staffs.forEach(async (staff) => {
  //     if (capabilitiesCache[staff.id] !== undefined) return; // sudah ada
  //     try {
  //       const res = await fetch(`/api/master/capabilities/${staff.id}`);
  //       const json = await res.json();
  //       setCapabilitiesCache((prev) => ({
  //         ...prev,
  //         [staff.id]: json.data || [],
  //       }));
  //     } catch (_) {}
  //   });
  // }, [staffs]);

  const filteredStaffs = useMemo(() => {
    if (!search) return staffs;
    return staffs.filter(
      (staff: Staff) =>
        staff.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        staff.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        staff.email?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, staffs]);

  const handleEditClick = (staff: Staff) => {
    setEditingStaffId(staff.id);

    // Inisialisasi dari cache dulu (jika sudah pernah dibuka)
    const cached = capabilitiesCache[staff.id];
    if (cached) {
      setSelectedCategories(cached.map((cat) => Number(cat.id)));
    } else if (staff.capabilityCategories) {
      // Fallback: dari data backend jika tersedia
      setSelectedCategories(
        staff.capabilityCategories.map((cat) => Number(cat.id)),
      );
    } else {
      setSelectedCategories([]);
      // Fetch akan berjalan karena editingStaffId sudah di-set
    }
  };

  const handleSave = () => {
    updateCapabilities.mutate({ category_ids: selectedCategories });
  };

  const handleCancel = () => {
    setEditingStaffId(null);
    setSelectedCategories([]);
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between">
        <TextField aria-label="Cari staf" className="w-full sm:w-80">
          <InputGroup className="bg-transparent rounded-full border border-border h-11 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all shadow-sm overflow-hidden">
            <InputGroup.Prefix className="pl-4 pr-2 bg-transparent text-muted flex items-center">
              <MagnifyingGlass weight="bold" className="w-4 h-4" />
            </InputGroup.Prefix>
            <InputGroup.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, Nama, Email staf..."
              className="w-full bg-transparent text-sm font-semibold h-full px-2 outline-none"
            />
          </InputGroup>
        </TextField>
      </div>

      {/* TABEL DATA */}
      <div className="overflow-x-auto scrollbar-hide pb-10">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-y border-border">
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Profil Staf
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Id Karyawan
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Jabatan
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Kemampuan
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {staffsLoading || categoriesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border">
                  <td className="py-5 px-4 bg-background sticky left-0 z-10 border-r border-border/50 shadow-[1px_0_0_0_var(--color-border)]">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-accent/25" />
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="h-3.5 bg-accent/25 rounded-md w-full" />
                        <div className="h-2.5 bg-accent/25 rounded-md w-1/2" />
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <td
                      key={`skeleton-cell-${i}`}
                      className="p-2.5 border-r border-border/30 last:border-r-0"
                    >
                      <div className="w-full h-[3.5rem] rounded-xl bg-accent/25 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredStaffs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-muted font-medium text-sm"
                >
                  Tidak ada data staf.
                </td>
              </tr>
            ) : (
              filteredStaffs.map((staff: Staff) => {
                const isEditing = editingStaffId === staff.id;

                // ✅ Prioritas sumber data kemampuan:
                // 1. Cache lokal (sudah di-fetch/di-save di sesi ini)
                // 2. Data dari backend (jika capabilityCategories tersedia)
                // 3. Array kosong
                const staffCategories = isEditing
                  ? capabilitiesResponse?.data ||
                    capabilitiesCache[staff.id] ||
                    []
                  : capabilitiesCache[staff.id] ||
                    staff.capabilityCategories ||
                    [];

                // ✅ Flag loading saat fetch capabilities belum selesai
                const isLoadingCapabilities =
                  !isEditing &&
                  capabilitiesCache[staff.id] === undefined &&
                  !staff.capabilityCategories;

                return (
                  <tr
                    key={staff.id}
                    className={`border-b border-border transition-colors ${isEditing ? "bg-surface/50" : "hover:bg-border/10"}`}
                  >
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <Avatar className="border border-border/50 bg-border/20">
                          <Avatar.Image
                            className="size-12.5 object-cover rounded-full"
                            src={
                              staff.avatar_path
                                ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${staff.avatar_path}`
                                : ""
                            }
                            alt={staff.first_name}
                          />
                          <Avatar.Fallback className="text-muted font-bold">
                            {staff.first_name.charAt(0)}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-foreground">
                            {staff.first_name} {staff.last_name || ""}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-muted font-bold mt-1">
                            {staff.job_title || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="text-xs font-bold text-muted">
                        {staff.employee_code || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="text-xs font-bold text-muted">
                        {staff.job_title || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {categories.map((category) => {
                              const isSelected = selectedCategories.includes(
                                Number(category.id),
                              );
                              return (
                                <Checkbox
                                  key={category.id}
                                  isSelected={isSelected}
                                  onValueChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategories((prev) => [
                                        ...prev,
                                        Number(category.id),
                                      ]);
                                    } else {
                                      setSelectedCategories((prev) =>
                                        prev.filter(
                                          (id) => id !== Number(category.id),
                                        ),
                                      );
                                    }
                                  }}
                                >
                                  {category.name}
                                </Checkbox>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onPress={handleSave}
                              isLoading={updateCapabilities.isPending}
                              startContent={
                                <Check weight="bold" className="w-4 h-4" />
                              }
                            >
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onPress={handleCancel}
                              startContent={
                                <X weight="bold" className="w-4 h-4" />
                              }
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {staffCategories.length > 0 ? (
                            staffCategories.map((category) => (
                              <span
                                key={category.id}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent/10 text-accent border border-accent/20"
                              >
                                {category.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted font-medium italic">
                              Belum ditentukan — klik Edit untuk mengatur
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-right">
                      {!isEditing && (
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => handleEditClick(staff)}
                          startContent={
                            <PencilSimple weight="bold" className="w-4 h-4" />
                          }
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
