  "use client";

import {
  Avatar,
  Button,
  InputGroup,
  Spinner,
  TextField,
  Switch,
} from "@heroui/react";
import {
  Check,
  MagnifyingGlass,
  PencilSimple,
  X,
  Sparkle,
  Student,
  Prohibit,
  Warning,
  FirstAid,
} from "@phosphor-icons/react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useApiFetch, usePut, usePost } from "@/app/libs/use-http";
import { toast, Tooltip } from "@heroui/react";

import { Staff } from "@/app/types/staff";
import { Category, Service, ServiceItem } from "@/app/types/product-&-layanan";

type CapabilityStatus = "bisa" | "training" | "tidak_bisa";

interface CapabilityEntry {
  variant_id: number;
  status: CapabilityStatus;
}

const getStaffCapabilityVariants = (staff: Staff): ServiceItem[] =>
  staff.variantCapabilities ?? staff.variant_capabilities ?? [];

import { resolvePhotoUrl } from "@/app/libs/resolve-url";
import { StaffAvatar } from "@/app/components/staff-avatar";

// ==========================================
// MODAL: EDIT KEMAMPUAN STAF (Per Item/Varian)
// ==========================================
interface EditCapabilitiesModalProps {
  staff: Staff;
  categories: Category[];
  categoriesLoading: boolean;
  initialCapabilities: CapabilityEntry[];
  isSaving: boolean;
  onSave: (capabilities: CapabilityEntry[]) => void;
  onClose: () => void;
}

function EditCapabilitiesModal({
  staff,
  categories,
  categoriesLoading,
  initialCapabilities,
  isSaving,
  onSave,
  onClose,
}: EditCapabilitiesModalProps) {
  const [capabilities, setCapabilities] =
    useState<CapabilityEntry[]>(initialCapabilities);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCapabilities(initialCapabilities);
  }, [initialCapabilities]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const allVariants = useMemo(() => {
    const flat = categories.flatMap((c) =>
      (c.services || [])
        .filter((s) => s.is_active !== false)
        .flatMap((s) =>
          (s.variants || s.items || []).filter((v) => v.is_active !== false),
        ),
    );
    const seen = new Set();
    return flat.filter((v) => {
      const id = String(v.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    const lowerQuery = query.toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        services: (c.services || [])
          .map((s) => {
            const items = (s.variants || s.items || []).filter(
              (v) =>
                v.name.toLowerCase().includes(lowerQuery) ||
                s.name.toLowerCase().includes(lowerQuery),
            );
            return { ...s, variants: items };
          })
          .filter((s) => s.variants && s.variants.length > 0),
      }))
      .filter((c) => c.services.length > 0);
  }, [categories, query]);

  const updateStatus = (variantId: number, status: CapabilityStatus) => {
    setCapabilities((prev) => {
      const existing = prev.find((c) => c.variant_id === variantId);
      if (existing) {
        if (status === "tidak_bisa") {
          return prev.filter((c) => c.variant_id !== variantId);
        }
        return prev.map((c) =>
          c.variant_id === variantId ? { ...c, status } : c,
        );
      } else {
        if (status === "tidak_bisa") return prev;
        return [...prev, { variant_id: variantId, status }];
      }
    });
  };

  const getStatus = (variantId: number): CapabilityStatus => {
    return (
      capabilities.find((c) => c.variant_id === variantId)?.status ??
      "tidak_bisa"
    );
  };

  const hasChanges = useMemo(() => {
    if (capabilities.length !== initialCapabilities.length) return true;
    return capabilities.some((c) => {
      const init = initialCapabilities.find(
        (i) => i.variant_id === c.variant_id,
      );
      return !init || init.status !== c.status;
    });
  }, [capabilities, initialCapabilities]);

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
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/60">
          <StaffAvatar staff={staff} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              Manajemen Skill Terapis
            </p>
            <p className="text-xs font-semibold text-muted truncate">
              {staff.first_name} {staff.last_name || ""} &middot;{" "}
              {staff.job_title || "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* SEARCH + SUMMARY */}
        <div className="px-6 pt-4 pb-2 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <TextField aria-label="Cari item layanan" className="flex-1 w-full">
              <InputGroup className="bg-background rounded-2xl border border-border h-11 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all overflow-hidden">
                <InputGroup.Prefix className="pl-4 pr-2 text-muted flex items-center">
                  <MagnifyingGlass weight="bold" className="w-4 h-4" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari layanan atau durasi spesifik..."
                  className="w-full bg-transparent text-sm font-semibold h-full px-2 outline-none"
                />
              </InputGroup>
            </TextField>

            <div className="flex items-center gap-6 px-4 py-2 bg-surface-secondary/50 rounded-2xl border border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] font-bold text-foreground uppercase">
                  Bisa: {capabilities.filter((c) => c.status === "bisa").length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-[10px] font-bold text-foreground uppercase">
                  Training:{" "}
                  {capabilities.filter((c) => c.status === "training").length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted/60" />
                <span className="text-[10px] font-bold text-foreground uppercase">
                  Tidak Bisa: {allVariants.length - capabilities.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GROUPED VARIANTS */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-10">
          {categoriesLoading ? (
            <div className="space-y-8 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="h-4 w-32 bg-border/40 rounded-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div
                        key={j}
                        className="h-20 bg-border/20 rounded-2xl border border-border/40"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted">
              <Sparkle className="w-6 h-6 opacity-40" />
              <span className="text-sm font-medium">
                Tidak ada item yang cocok
              </span>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80 whitespace-nowrap">
                    {category.name}
                  </h4>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {category.services.map((service) => (
                    <div key={service.id} className="space-y-3">
                      <h5 className="text-[11px] font-black text-foreground/40 uppercase tracking-wider px-1">
                        {service.name}
                      </h5>
                      <div className="space-y-2">
                        {(service.variants || []).map((variant) => {
                          const id = Number(variant.id);
                          const status = getStatus(id);

                          return (
                            <div
                              key={variant.id}
                              className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                                status === "bisa"
                                  ? "bg-success/5 border-success/20 shadow-sm shadow-success/5"
                                  : status === "training"
                                    ? "bg-warning/5 border-warning/20"
                                    : "bg-background border-border/60 hover:border-border"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs font-bold truncate ${status === "tidak_bisa" ? "text-foreground/70" : "text-foreground"}`}
                                >
                                  {variant.name}
                                </p>
                                <p className="text-[10px] font-semibold text-muted mt-0.5">
                                  {variant.duration ||
                                    (variant.duration_minutes
                                      ? `${variant.duration_minutes}m`
                                      : "-")}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 bg-surface-secondary/80 p-1 rounded-xl border border-border/40 ml-4 shrink-0">
                                <StatusButton
                                  active={status === "bisa"}
                                  variant="success"
                                  tooltip="Sudah Bisa"
                                  onClick={() => updateStatus(id, "bisa")}
                                >
                                  <Check
                                    weight="bold"
                                    className="w-3.5 h-3.5"
                                  />
                                </StatusButton>
                                <StatusButton
                                  active={status === "training"}
                                  variant="warning"
                                  tooltip="Sedang Training"
                                  onClick={() => updateStatus(id, "training")}
                                >
                                  <Student
                                    weight="bold"
                                    className="w-3.5 h-3.5"
                                  />
                                </StatusButton>
                                <StatusButton
                                  active={status === "tidak_bisa"}
                                  variant="neutral"
                                  tooltip="Tidak Bisa"
                                  onClick={() => updateStatus(id, "tidak_bisa")}
                                >
                                  <Prohibit
                                    weight="bold"
                                    className="w-3.5 h-3.5"
                                  />
                                </StatusButton>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border/60 bg-surface-secondary/20">
          <Button
            variant="secondary"
            size="sm"
            onPress={onClose}
            className="rounded-xl font-bold px-6"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={() => onSave(capabilities)}
            isPending={isSaving}
            isDisabled={!hasChanges || isSaving}
            className="rounded-xl font-bold px-8 shadow-lg shadow-accent/20"
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Check weight="bold" className="w-4 h-4" />
                )}
                Update Skill
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  active,
  variant,
  children,
  onClick,
  tooltip,
}: {
  active: boolean;
  variant: "success" | "warning" | "neutral";
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
}) {
  const styles = {
    success: active
      ? "bg-success text-white shadow-lg shadow-success/30"
      : "text-muted hover:text-success hover:bg-success/10",
    warning: active
      ? "bg-warning text-white shadow-lg shadow-warning/30"
      : "text-muted hover:text-warning hover:bg-warning/10",
    neutral: active
      ? "bg-foreground/20 text-foreground shadow-sm"
      : "text-muted hover:text-foreground hover:bg-foreground/5",
  };

  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger aria-label={tooltip}>
        <button
          type="button"
          onClick={onClick}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${styles[variant]}`}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        <p>{tooltip}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

// ==========================================
// VIEW UTAMA
// ==========================================
export default function StaffCapabilitiesView() {
  const [search, setSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  // Cache kemampuan per staff: { [staffId]: ServiceItem[] }
  const [capabilitiesCache, setCapabilitiesCache] = useState<
    Record<number, ServiceItem[]>
  >({});

  const { data: staffsResponse, isLoading: staffsLoading } = useApiFetch<{
    data: Staff[];
  }>(["staffs"], "/master/staffs");
  const staffs = staffsResponse?.data || [];

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useApiFetch<{ data: Category[] }>(["categories"], "/master/categories");
  const categories = categoriesResponse?.data || [];

  // Fetch Settings
  const { data: settingsResponse, refetch: refetchSettings } = useApiFetch<{
    data: Record<string, string>;
  }>(["system-settings"], "/st/settings");

  useEffect(() => {
    if (settingsResponse?.data?.emergency_mode) {
      setIsEmergencyMode(settingsResponse.data.emergency_mode === "true");
    }
  }, [settingsResponse]);

  const { mutate: updateSettings } = usePost<any, any>("/st/settings", {
    onSuccess: () => {
      refetchSettings();
    },
    onError: (err) => {
      toast.danger("Gagal mengubah mode: " + err.message);
    },
  });

  const handleEmergencyToggle = (val: boolean) => {
    setIsEmergencyMode(val);
    updateSettings({
      settings: { emergency_mode: String(val) },
      group: "general",
    });
    toast.success(
      val
        ? "Mode Darurat Aktif: Staf Training kini tersedia untuk booking."
        : "Mode Darurat Mati: Hanya staf berstatus Bisa yang tersedia.",
    );
  };

  const allVariants = useMemo(() => {
    const flat = categories.flatMap((c) =>
      (c.services || [])
        .filter((s) => s.is_active !== false)
        .flatMap((s) =>
          (s.variants || s.items || []).filter((v) => v.is_active !== false),
        ),
    );
    const seen = new Set();
    return flat.filter((v) => {
      const id = String(v.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [categories]);

  const editingStaffId = editingStaff?.id ?? null;

  const { data: capabilitiesResponse } = useApiFetch<{ data: ServiceItem[] }>(
    ["capabilities", editingStaffId],
    editingStaffId ? `/master/capabilities/${editingStaffId}` : "",
    undefined,
    !!editingStaffId,
  );

  const updateCapabilities = usePut<
    { data?: ServiceItem[] },
    { staff_id: number; capabilities: CapabilityEntry[] }
  >((data) => `/master/capabilities/${data.staff_id}`, {
    invalidate: [["capabilities"], ["staffs"]],
    onSuccess: (response, variables) => {
      toast.success("Skill terapis berhasil diperbarui");

      const allVariants = categories.flatMap((c) =>
        (c.services || []).flatMap((s) => s.variants || s.items || []),
      );

      // Map back to ServiceItem with pivot status for local cache
      const savedVariants: ServiceItem[] = variables.capabilities.map((cap) => {
        const variant = allVariants.find(
          (v) => Number(v.id) === cap.variant_id,
        );
        return {
          ...(variant || { id: String(cap.variant_id), name: "Unknown" }),
          pivot: { status: cap.status },
        } as ServiceItem;
      });

      setCapabilitiesCache((prev) => ({
        ...prev,
        [variables.staff_id]: savedVariants,
      }));

      setEditingStaff(null);
    },
    onError: (error) => {
      toast.danger("Gagal memperbarui skill: " + error.message);
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

  const getInitialCapabilitiesFor = useCallback(
    (staff: Staff): CapabilityEntry[] => {
      const items =
        capabilitiesCache[staff.id] || getStaffCapabilityVariants(staff);

      // Gunakan Map untuk memastikan variant_id unik
      const capabilityMap = new Map<number, CapabilityStatus>();
      items.forEach((item) => {
        const id = Number(item.id);
        const status = item.pivot?.status ?? "bisa";
        // Hanya simpan jika status bukan "tidak_bisa", karena di UI tidak_bisa dianggap tidak ada di list
        if (status !== "tidak_bisa") {
          capabilityMap.set(id, status);
        }
      });

      return Array.from(capabilityMap.entries()).map(([id, status]) => ({
        variant_id: id,
        status: status,
      }));
    },
    [capabilitiesCache],
  );

  const handleSave = (capabilities: CapabilityEntry[]) => {
    if (!editingStaff) return;
    updateCapabilities.mutate({
      staff_id: Number(editingStaff.id),
      capabilities: capabilities,
    });
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Tooltip delay={200}>
            <Tooltip.Trigger aria-label="Mode darurat">
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${
                  isEmergencyMode
                    ? "bg-danger/5 border-danger/20 shadow-sm shadow-danger/5"
                    : "bg-surface-secondary/50 border-border/50"
                }`}
              >
                <div
                  className={`flex items-center gap-2 ${isEmergencyMode ? "text-danger" : "text-muted"}`}
                >
                  {isEmergencyMode ? (
                    <FirstAid weight="fill" className="w-4 h-4" />
                  ) : (
                    <FirstAid weight="bold" className="w-4 h-4" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                      Mode Darurat
                    </span>
                    <span className="text-[8px] font-bold opacity-70 mt-0.5">
                      {isEmergencyMode
                        ? "Training Tersedia"
                        : "Hanya Profesional"}
                    </span>
                  </div>
                </div>
                <Switch
                  size="sm"
                  isSelected={isEmergencyMode}
                  aria-label="Aktifkan mode darurat"
                  onChange={handleEmergencyToggle}
                >
                  {({ isSelected }) => (
                    <Switch.Content>
                      <Switch.Control
                        className={isSelected ? "bg-danger!" : ""}
                      >
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  )}
                </Switch>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              <p>
                {isEmergencyMode
                  ? "Matikan Mode Darurat (Training tidak bisa dipilih)"
                  : "Aktifkan Mode Darurat (Training bisa dipilih jika darurat)"}
              </p>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="overflow-x-auto scrollbar-hide pb-10">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-y border-border">
              <th className="px-6 py-5 text-[11px] font-black text-muted uppercase tracking-[0.2em]">
                Profil Staf
              </th>
              <th className="px-6 py-5 text-[11px] font-black text-muted uppercase tracking-[0.2em]">
                Id Karyawan
              </th>
              <th className="px-6 py-5 text-[11px] font-black text-muted uppercase tracking-[0.2em]">
                Jabatan
              </th>
              <th className="px-6 py-5 text-[11px] font-black text-muted uppercase tracking-[0.2em]">
                Status Kemampuan
              </th>
              <th className="px-6 py-5 text-[11px] font-black text-muted uppercase tracking-[0.2em] text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {staffsLoading || categoriesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-border/40" />
                      <div className="flex flex-col gap-2 w-32">
                        <div className="h-4 bg-border/40 rounded-full w-full" />
                        <div className="h-3 bg-border/20 rounded-full w-2/3" />
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={`skeleton-cell-${j}`} className="px-6 py-6">
                      <div className="w-full h-8 rounded-xl bg-border/20 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredStaffs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-16 text-center text-muted font-bold text-sm uppercase tracking-widest opacity-40"
                >
                  Belum ada data staf tersedia
                </td>
              </tr>
            ) : (
              filteredStaffs.map((staff: Staff) => {
                const staffVariants =
                  capabilitiesCache[staff.id] ||
                  getStaffCapabilityVariants(staff) ||
                  [];

                // Gunakan Map untuk memastikan variant_id unik bagi staf ini
                const staffCapabilityMap = new Map<number, CapabilityStatus>();
                staffVariants.forEach((v) => {
                  if (v.id) {
                    const status = v.pivot?.status ?? "bisa";
                    staffCapabilityMap.set(Number(v.id), status);
                  }
                });

                const canDoVariants = allVariants.filter(
                  (v) => staffCapabilityMap.get(Number(v.id)) === "bisa",
                );

                // Ambil data ringkasan dari backend jika tersedia
                const summary = staff.capabilities_summary || {
                  bisa: canDoVariants.length,
                  training: Array.from(staffCapabilityMap.values()).filter(
                    (s) => s === "training",
                  ).length,
                  tidak_bisa:
                    allVariants.length -
                    canDoVariants.length -
                    Array.from(staffCapabilityMap.values()).filter(
                      (s) => s === "training",
                    ).length,
                };

                const canDoCount = summary.bisa;
                const trainingCount = summary.training;
                const cannotDoCount = summary.tidak_bisa;

                return (
                  <tr
                    key={staff.id}
                    className="group border-b border-border hover:bg-accent/[0.02] transition-colors"
                  >
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <StaffAvatar staff={staff} size="lg" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground">
                            {staff.first_name} {staff.last_name || ""}
                          </span>
                          <span className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mt-1">
                            {staff.email || "No email"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <code className="text-xs font-black text-muted bg-surface-secondary px-2 py-1 rounded-lg border border-border/40">
                        {staff.employee_code || "---"}
                      </code>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <span className="text-xs font-black text-foreground/80 uppercase tracking-tighter">
                        {staff.job_title || "Staff"}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-[10px] font-black text-foreground/70 uppercase">
                              Bisa: {canDoCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-[10px] font-black text-foreground/70 uppercase">
                              Training: {trainingCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted/60" />
                            <span className="text-[10px] font-black text-foreground/50 uppercase">
                              Tidak Bisa: {cannotDoCount}
                            </span>
                          </div>
                        </div>
                        <div className="h-8 w-px bg-border/60 mx-2" />
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {canDoVariants.slice(0, 3).map((v) => (
                            <span
                              key={v.id}
                              className="text-[9px] font-black text-muted uppercase bg-surface-secondary px-2 py-0.5 rounded border border-border/40 truncate max-w-[80px]"
                            >
                              {v.name}
                            </span>
                          ))}
                          {canDoCount > 3 && (
                            <span className="text-[9px] font-black text-accent uppercase px-1">
                              +{canDoCount - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => setEditingStaff(staff)}
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest px-4 hover:bg-accent hover:text-white transition-all shadow-sm"
                      >
                        <PencilSimple weight="bold" className="w-3.5 h-3.5" />
                        Atur Skill
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingStaff && (
        <EditCapabilitiesModal
          staff={editingStaff}
          categories={categories}
          categoriesLoading={categoriesLoading}
          initialCapabilities={getInitialCapabilitiesFor(editingStaff)}
          isSaving={updateCapabilities.isPending}
          onSave={handleSave}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  );
}
