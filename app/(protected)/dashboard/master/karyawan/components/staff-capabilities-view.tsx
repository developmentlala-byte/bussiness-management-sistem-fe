"use client";

import { Avatar, Button, InputGroup, Spinner, TextField } from "@heroui/react";
import {
  Check,
  MagnifyingGlass,
  PencilSimple,
  X,
  Sparkle,
} from "@phosphor-icons/react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useApiFetch, usePut } from "@/app/libs/use-http";
import { toast } from "@heroui/react";

import { Staff } from "@/app/types/staff";
import { Category } from "@/app/types/product-&-layanan";

const getStaffCapabilityCategories = (staff: Staff): Category[] =>
  staff.capabilityCategories ?? staff.capability_categories ?? [];

// ==========================================
// MODAL: EDIT KEMAMPUAN STAF
// ==========================================
interface EditCapabilitiesModalProps {
  staff: Staff;
  categories: Category[];
  categoriesLoading: boolean;
  initialSelected: number[];
  isSaving: boolean;
  onSave: (categoryIds: number[]) => void;
  onClose: () => void;
}

function EditCapabilitiesModal({
  staff,
  categories,
  categoriesLoading,
  initialSelected,
  isSaving,
  onSave,
  onClose,
}: EditCapabilitiesModalProps) {
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Sinkron ulang setiap kali data awal berubah (mis. capabilities selesai di-fetch)
  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [categories, query]);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const hasChanges =
    selected.length !== initialSelected.length ||
    !selected.every((id) => initialSelected.includes(id));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Atur kemampuan ${staff.first_name}`}
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-surface rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/60">
          <Avatar className="border border-border/50 bg-border/20 shrink-0">
            <Avatar.Image
              className="size-11 object-cover rounded-full"
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
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              Atur Kemampuan
            </p>
            <p className="text-xs font-semibold text-muted truncate">
              {staff.first_name} {staff.last_name || ""} &middot;{" "}
              {staff.job_title || "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-full text-muted hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* SEARCH + SELECT ALL */}
        <div className="px-6 pt-4 pb-2 flex flex-col gap-3">
          <TextField aria-label="Cari kategori kemampuan">
            <InputGroup className="bg-background rounded-full border border-border h-10 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all overflow-hidden">
              <InputGroup.Prefix className="pl-4 pr-2 text-muted flex items-center">
                <MagnifyingGlass weight="bold" className="w-4 h-4" />
              </InputGroup.Prefix>
              <InputGroup.Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kemampuan..."
                className="w-full bg-transparent text-sm font-semibold h-full px-2 outline-none"
              />
            </InputGroup>
          </TextField>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
              {selected.length} dari {categories.length} dipilih
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(categories.map((c) => Number(c.id)))}
                className="text-xs font-bold text-accent hover:underline"
              >
                Pilih semua
              </button>
              <button
                onClick={() => setSelected([])}
                className="text-xs font-bold text-muted hover:text-foreground hover:underline"
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>

        {/* GRID PILIHAN — kartu yang bisa diklik langsung, bukan checkbox kecil */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {categoriesLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 rounded-xl bg-border/20 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted">
              <Sparkle className="w-6 h-6 opacity-40" />
              <span className="text-sm font-medium">
                Tidak ada kemampuan yang cocok dengan &ldquo;{query}&rdquo;
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredCategories.map((category) => {
                const id = Number(category.id);
                const isActive = selected.includes(id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggle(id)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      isActive
                        ? "bg-accent/10 border-accent/40 text-accent"
                        : "bg-background border-border/60 text-foreground hover:border-accent/40 hover:bg-accent/5"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-md border shrink-0 transition-colors ${
                        isActive
                          ? "bg-accent border-accent text-accent-foreground"
                          : "border-border/70"
                      }`}
                    >
                      {isActive && <Check weight="bold" className="w-3 h-3" />}
                    </span>
                    <span className="text-sm font-semibold truncate">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60">
          <Button variant="secondary" size="sm" onPress={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={() => onSave(selected)}
            isPending={isSaving}
            isDisabled={!hasChanges || isSaving}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Check weight="bold" className="w-4 h-4" />
                )}
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW UTAMA
// ==========================================
export default function StaffCapabilitiesView() {
  const [search, setSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

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

  const editingStaffId = editingStaff?.id ?? null;

  const { data: capabilitiesResponse } = useApiFetch<{ data: Category[] }>(
    ["capabilities", editingStaffId],
    editingStaffId ? `/master/capabilities/${editingStaffId}` : "",
    undefined,
    !!editingStaffId,
  );

  const updateCapabilities = usePut<
    { data?: Category[] },
    { staff_id: number; category_ids: number[] }
  >((data) => `/master/capabilities/${data.staff_id}`, {
    invalidate: [["capabilities"], ["staffs"]],
    onSuccess: (response, variables) => {
      toast.success("Kemampuan staf berhasil diperbarui");

      const savedCategories =
        response?.data && response.data.length > 0
          ? response.data
          : categories.filter((cat) =>
              variables.category_ids.includes(Number(cat.id)),
            );

      setCapabilitiesCache((prev) => ({
        ...prev,
        [variables.staff_id]: savedCategories,
      }));

      setEditingStaff(null);
    },
    onError: (error) => {
      toast.danger("Gagal memperbarui kemampuan staf: " + error.message);
    },
  });

  // Saat capabilities dari server masuk (saat modal dibuka), simpan ke cache
  useEffect(() => {
    if (capabilitiesResponse?.data && editingStaffId) {
      setCapabilitiesCache((prev) => ({
        ...prev,
        [editingStaffId]: capabilitiesResponse.data,
      }));
    }
  }, [capabilitiesResponse?.data, editingStaffId]);

  const filteredStaffs = useMemo(() => {
    if (!search) return staffs;
    return staffs.filter(
      (staff: Staff) =>
        staff.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        staff.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        staff.email?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, staffs]);

  const getInitialSelectedFor = useCallback(
    (staff: Staff): number[] => {
      const cached = capabilitiesCache[staff.id];
      if (cached) return cached.map((c) => Number(c.id));

      const fromStaff = getStaffCapabilityCategories(staff);
      return fromStaff.map((c) => Number(c.id));
    },
    [capabilitiesCache],
  );

  const handleSave = (categoryIds: number[]) => {
    if (!editingStaff) return;
    updateCapabilities.mutate({
      staff_id: Number(editingStaff.id),
      category_ids: categoryIds,
    });
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

      {/* TABEL DATA — read only, semua edit lewat modal */}
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
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-accent/25" />
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="h-3.5 bg-accent/25 rounded-md w-full" />
                        <div className="h-2.5 bg-accent/25 rounded-md w-1/2" />
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={`skeleton-cell-${j}`} className="p-2.5">
                      <div className="w-full h-[2rem] rounded-xl bg-accent/25 animate-pulse" />
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
                const staffCategories =
                  capabilitiesCache[staff.id] ||
                  getStaffCapabilityCategories(staff) ||
                  [];

                return (
                  <tr
                    key={staff.id}
                    className="border-b border-border hover:bg-border/10 transition-colors"
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
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
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
                            Belum ditentukan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => setEditingStaff(staff)}
                      >
                        <PencilSimple weight="bold" className="w-4 h-4" />
                        Atur
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIT — hanya dirender saat ada staff yang sedang diedit */}
      {editingStaff && (
        <EditCapabilitiesModal
          staff={editingStaff}
          categories={categories}
          categoriesLoading={categoriesLoading}
          initialSelected={getInitialSelectedFor(editingStaff)}
          isSaving={updateCapabilities.isPending}
          onSave={handleSave}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  );
}
