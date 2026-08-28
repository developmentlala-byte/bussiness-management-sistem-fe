import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DynamicIcon } from "@/app/components/dynamic-icon";
import { formatDuration } from "@/app/libs/format-duration";
import { formatRupiah } from "@/app/libs/format-rupiah";
import {
  Accordion,
  Dropdown,
  Header,
  Label,
  Separator,
  toast,
  Switch,
  Tooltip,
} from "@heroui/react";
import {
  Clock,
  DotsThree,
  PencilSimple,
  PlusCircle,
  Tag,
  Trash,
  CaretDown,
  XCircle,
  Users,
  Check,
  Student,
  Prohibit,
  Info,
} from "@phosphor-icons/react";
import { FilteredService, Service, ServiceVariant, Discount } from "../page";
import { useRemove, usePut, useApiFetch } from "@/app/libs/use-http";
import { Staff } from "@/app/types/staff";
import { resolvePhotoUrl } from "@/app/libs/resolve-url";
import { StaffAvatar } from "@/app/components/staff-avatar";

// ==========================================
// 1. KOMPONEN UTAMA: ServiceBlock
// ==========================================
interface ServiceBlockProps {
  service: Service | FilteredService;
  allStaff: Staff[];
  setActionService: (s: Service) => void;
  setActionVariant: (v: ServiceVariant) => void;
  setActiveDiscount: (d: Discount | null) => void;
  setIsCreateItemOpen: (v: boolean) => void;
  setIsDiscountItemOpen: (v: boolean) => void;
  setIsEditServiceOpen: (v: boolean) => void;
  setIsDeleteServiceOpen: (v: boolean) => void;
  setIsEditItemOpen: (v: boolean) => void;
  setIsDeleteItemOpen: (v: boolean) => void;
  setIsDetailItemOpen: (v: boolean) => void;
}

export function ServiceBlock({
  service,
  allStaff,
  setActionService,
  setActionVariant,
  setActiveDiscount,
  setIsCreateItemOpen,
  setIsDiscountItemOpen,
  setIsEditServiceOpen,
  setIsDeleteServiceOpen,
  setIsEditItemOpen,
  setIsDeleteItemOpen,
  setIsDetailItemOpen,
}: ServiceBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Hook untuk toggle is_active Service (Optimistic UI)
  const { mutate: toggleServiceActive } = usePut(
    `/master/services/${service.id}`,
    {
      onMutate: async (newService: any) => {
        await queryClient.cancelQueries({ queryKey: ["categories"] });
        const previousCategories = queryClient.getQueryData(["categories"]);

        queryClient.setQueryData(["categories"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((cat: any) => ({
              ...cat,
              services: cat.services.map((s: any) =>
                s.id === service.id
                  ? { ...s, is_active: newService.is_active }
                  : s,
              ),
            })),
          };
        });

        return { previousCategories };
      },
      onError: (err, newService, context: any) => {
        if (context?.previousCategories) {
          queryClient.setQueryData(["categories"], context.previousCategories);
        }
        toast.danger("Gagal", {
          description: err?.message || "Gagal memperbarui status layanan",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      },
      onSuccess: () => {
        toast.success("Status layanan diperbarui");
      },
    },
  );

  const VISIBLE_LIMIT = 6;
  const variants = service.variants || [];
  const initialVariants = variants.slice(0, VISIBLE_LIMIT);
  const extraVariants = variants.slice(VISIBLE_LIMIT);
  const hasMoreItems = extraVariants.length > 0;

  const imageUrl =
    service.image_path ||
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=300&h=200";

  const variantActionProps = {
    allStaff,
    serviceActive: service.is_active,
    setActionVariant,
    setActiveDiscount,
    setIsDiscountItemOpen,
    setIsEditItemOpen,
    setIsDeleteItemOpen,
    setIsDetailItemOpen,
  };

  return (
    <section
      className={`rounded-3xl border border-border/60 bg-surface/40 p-5 md:p-6 transition-all duration-300 ${
        !service.is_active ? "opacity-70" : ""
      }`}
    >
      {/* Header Info Layanan Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <img
              src={imageUrl}
              alt={service.name}
              className={`w-16 h-16 rounded-2xl object-cover border border-border bg-surface-secondary transition-all duration-300 ${
                !service.is_active ? "grayscale" : ""
              }`}
            />
            {!service.is_active && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger flex items-center justify-center ring-2 ring-surface">
                <Prohibit weight="bold" className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-extrabold text-foreground truncate">
                {service.name}
              </h3>
              {!service.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger/10 text-danger uppercase tracking-wider">
                  Non-aktif
                </span>
              )}
              {service.badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wider">
                  <DynamicIcon name={service.badge} className="w-3 h-3 mr-1" />
                  {service.badge}
                </span>
              )}
            </div>
            <p className="text-muted text-sm line-clamp-1 max-w-lg">
              {service.description || "Tidak ada deskripsi."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Tooltip delay={200}>
            <Tooltip.Trigger aria-label="Status layanan">
              <div className="flex items-center gap-2.5 px-3 h-9 rounded-full border border-border/60 bg-background/60">
                <span className="text-[11px] font-semibold text-muted whitespace-nowrap">
                  {service.is_active ? "Aktif" : "Mati"}
                </span>
                <Switch
                  size="sm"
                  isSelected={service.is_active}
                  aria-label={`Aktifkan layanan ${service.name}`}
                  onChange={(val: boolean) =>
                    toggleServiceActive({ ...service, is_active: val })
                  }
                >
                  {({ isSelected }) => (
                    <Switch.Content>
                      <Switch.Control
                        className={isSelected ? "bg-success!" : ""}
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
                {service.is_active
                  ? "Nonaktifkan layanan ini"
                  : "Aktifkan layanan ini"}
              </p>
            </Tooltip.Content>
          </Tooltip>

          <Dropdown>
            <Dropdown.Trigger>
              <button
                type="button"
                aria-label="Aksi layanan"
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <DotsThree weight="bold" className="w-5 h-5" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom end"
              className="z-50 min-w-[200px]"
            >
              <Dropdown.Menu
                aria-label="Service Actions"
                onAction={(key) => {
                  setActionService(service);
                  if (key === "create_item") setIsCreateItemOpen(true);
                  if (key === "edit") setIsEditServiceOpen(true);
                  if (key === "delete") setIsDeleteServiceOpen(true);
                }}
              >
                <Dropdown.Section>
                  <Header>Actions</Header>
                  <Dropdown.Item id="create_item" textValue="Create Item">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-muted" />
                      <Label>Tambah Item</Label>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="edit" textValue="Edit Service">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="w-4 h-4 text-muted" />
                      <Label>Edit Layanan</Label>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Dropdown.Item
                    id="delete"
                    textValue="Delete Service"
                    variant="danger"
                  >
                    <div className="flex items-center gap-2">
                      <Trash className="w-4 h-4 text-danger" />
                      <Label>Hapus Layanan</Label>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      {/* Area Varian */}
      {variants.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {initialVariants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                {...variantActionProps}
              />
            ))}
          </div>

          {hasMoreItems && (
            <div
              className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3.5">
                  {extraVariants.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      {...variantActionProps}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasMoreItems && (
            <div className="flex justify-center mt-5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-5 py-2 bg-surface hover:bg-surface-secondary border border-border text-foreground text-xs font-semibold rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow"
              >
                {isExpanded
                  ? "Tutup Varian"
                  : `Lihat ${extraVariants.length} Varian Lainnya`}
                <CaretDown
                  weight="bold"
                  className={`w-3.5 h-3.5 transition-transform duration-500 ${
                    isExpanded ? "rotate-180 text-accent" : "text-muted"
                  }`}
                />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-muted bg-background/60 py-6 px-6 rounded-2xl border border-dashed border-border text-center">
          Belum ada varian / item untuk layanan ini.
        </div>
      )}
    </section>
  );
}

// ==========================================
// 2. SUB-KOMPONEN: VariantCard
// ==========================================
interface VariantCardProps {
  variant: ServiceVariant;
  allStaff: Staff[];
  serviceActive: boolean;
  setActionVariant: (v: ServiceVariant) => void;
  setActiveDiscount: (d: Discount | null) => void;
  setIsDiscountItemOpen: (v: boolean) => void;
  setIsEditItemOpen: (v: boolean) => void;
  setIsDeleteItemOpen: (v: boolean) => void;
  setIsDetailItemOpen: (v: boolean) => void;
}

function VariantCard({
  variant,
  allStaff,
  serviceActive,
  setActionVariant,
  setActiveDiscount,
  setIsDiscountItemOpen,
  setIsEditItemOpen,
  setIsDeleteItemOpen,
  setIsDetailItemOpen,
}: VariantCardProps) {
  const [isStaffExpanded, setIsStaffExpanded] = useState(false);
  const queryClient = useQueryClient();

  const activeDiscount = variant.discounts?.find((d) => d.is_active);

  const { mutate: toggleActive } = usePut(`/master/variants/${variant.id}`, {
    onMutate: async (newVariant: any) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previousCategories = queryClient.getQueryData(["categories"]);

      queryClient.setQueryData(["categories"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((cat: any) => ({
            ...cat,
            services: cat.services.map((s: any) => ({
              ...s,
              variants: s.variants.map((v: any) =>
                v.id === variant.id
                  ? { ...v, is_active: newVariant.is_active }
                  : v,
              ),
            })),
          })),
        };
      });

      return { previousCategories };
    },
    onError: (err, newVariant, context: any) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(["categories"], context.previousCategories);
      }
      toast.danger("Gagal", {
        description: err?.message || "Gagal memperbarui status item",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onSuccess: () => {
      toast.success("Status item diperbarui");
    },
  });

  const sanitizeStatus = (
    status: string | undefined,
  ): "bisa" | "training" | "tidak_bisa" => {
    if (status === "bisa" || status === "training") return status;
    return "tidak_bisa";
  };

  const { mutate: updateCapabilities } = usePut(
    `/master/variant-capabilities/${variant.id}`,
    {
      onMutate: async (variables: any) => {
        await queryClient.cancelQueries({ queryKey: ["categories"] });
        const previousCategories = queryClient.getQueryData(["categories"]);

        queryClient.setQueryData(["categories"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((cat: any) => ({
              ...cat,
              services: cat.services.map((s: any) => ({
                ...s,
                variants: s.variants.map((v: any) => {
                  if (v.id !== variant.id) return v;

                  const newCapableStaff = variables.staff_capabilities.map(
                    (cap: { staff_id: number; status: string }) => ({
                      id: cap.staff_id,
                      pivot: { status: sanitizeStatus(cap.status) },
                    }),
                  );

                  return { ...v, capable_staff: newCapableStaff };
                }),
              })),
            })),
          };
        });

        return { previousCategories };
      },
      onError: (err: any, variables, context: any) => {
        if (context?.previousCategories) {
          queryClient.setQueryData(["categories"], context.previousCategories);
        }
        toast.danger("Gagal", {
          description:
            err?.response?.data?.message ||
            err?.message ||
            "Gagal memperbarui kapabilitas",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      },
      onSuccess: () => {
        toast.success("Kapabilitas staf diperbarui");
      },
    },
  );

  const handleSetStatus = (
    staffId: number,
    status: "bisa" | "training" | "tidak_bisa",
  ) => {
    const existingCaps = (variant.capable_staff || []).map((s) => ({
      staff_id: s.id,
      status: sanitizeStatus(s.pivot?.status),
    }));

    const index = existingCaps.findIndex((c) => c.staff_id === staffId);
    if (index > -1) {
      existingCaps[index].status = status;
    } else {
      existingCaps.push({ staff_id: staffId, status });
    }

    updateCapabilities({ staff_capabilities: existingCaps });
  };

  const staffStats = useMemo(() => {
    const caps = variant.capable_staff || [];
    return {
      bisa: caps.filter((s) => sanitizeStatus(s.pivot?.status) === "bisa")
        .length,
    };
  }, [variant.capable_staff]);

  const sortedStaff = useMemo(() => {
    return [...allStaff].sort((a, b) => {
      const hasA = variant.capable_staff?.some(
        (s) =>
          s.id === a.id && sanitizeStatus(s.pivot?.status) !== "tidak_bisa",
      )
        ? 1
        : 0;
      const hasB = variant.capable_staff?.some(
        (s) =>
          s.id === b.id && sanitizeStatus(s.pivot?.status) !== "tidak_bisa",
      )
        ? 1
        : 0;
      return hasB - hasA;
    });
  }, [allStaff, variant.capable_staff]);

  const { mutate: stopDiscount } = useRemove(
    activeDiscount ? `/master/discounts/${activeDiscount.id}` : "",
    {
      invalidate: [["categories"]],
      onSuccess: () => toast.success("Diskon dihentikan"),
      onError: (err: any) =>
        toast.danger("Gagal", {
          description:
            err?.response?.data?.message || "Gagal menghentikan diskon",
        }),
    },
  );

  const originalPrice = Number(variant.retail_price);
  let finalPrice = originalPrice;

  if (activeDiscount) {
    const dValue = Number(activeDiscount.discount_value);
    finalPrice =
      activeDiscount.discount_type === "percent"
        ? originalPrice - (originalPrice * dValue) / 100
        : originalPrice - dValue;
  }

  const cardDisabled = !variant.is_active || !serviceActive;

  return (
    <div
      className={`group relative flex flex-col justify-between p-4 bg-surface border rounded-2xl transition-all duration-300 overflow-hidden ${
        cardDisabled
          ? "opacity-60 border-border bg-surface-secondary/30"
          : "border-border hover:border-accent/40 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      {!serviceActive && (
        <div className="absolute inset-0 z-20 flex items-start justify-center pt-3 pointer-events-none">
          <div className="bg-danger/10 text-danger text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border border-danger/20">
            Layanan induk non-aktif
          </div>
        </div>
      )}

      {/* Header: nama, durasi, switch */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="font-bold text-foreground leading-snug line-clamp-2 mb-1.5">
            {variant.name}
          </h4>
          <div className="inline-flex items-center text-[10px] font-bold text-muted bg-background px-2 py-0.5 rounded-md border border-border/50">
            <Clock className="w-3 h-3 mr-1 opacity-80" />
            {formatDuration(variant.duration_minutes)}
          </div>
        </div>

        <Tooltip delay={200}>
          <Tooltip.Trigger aria-label="Status item">
            <div className="shrink-0">
              <Switch
                size="sm"
                isDisabled={!serviceActive}
                isSelected={variant.is_active}
                aria-label={`Aktifkan item ${variant.name}`}
                onChange={(val: boolean) =>
                  toggleActive({ ...variant, is_active: val })
                }
              >
                {({ isSelected }) => (
                  <Switch.Content>
                    <Switch.Control className={isSelected ? "bg-success!" : ""}>
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
              {!serviceActive
                ? "Aktifkan layanan utama terlebih dahulu"
                : variant.is_active
                  ? "Nonaktifkan item"
                  : "Aktifkan item"}
            </p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* Kapabilitas Staf - HeroUI Accordion */}
      <Accordion
        variant="surface"
        hideSeparator
        className="relative z-10 mb-4 rounded-xl border border-border/60 bg-background overflow-hidden"
      >
        <Accordion.Item
          isExpanded={isStaffExpanded}
          onExpandedChange={setIsStaffExpanded}
        >
          <Accordion.Heading>
            <Accordion.Trigger className="w-full flex items-center justify-between px-2.5 py-2.5 hover:bg-surface-secondary/50 transition-colors">
              <div className="flex items-center justify-between flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-2">
                  <Users weight="bold" className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                    Staf
                  </span>
                  <span className="text-[10px] font-semibold text-muted">
                    {staffStats.bisa}/{allStaff.length}
                  </span>
                </div>
                <div className="flex -space-x-2 mr-1">
                  {(variant.capable_staff || []).slice(0, 3).map((cap) => {
                    const staff = allStaff.find((s) => s.id === cap.id);
                    if (!staff) return null;

                    return (
                      <StaffAvatar key={cap.id} staff={staff} size="xxs" />
                    );
                  })}
                  {(variant.capable_staff || []).length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-surface-secondary border-2 border-surface flex items-center justify-center text-[8px] font-bold text-muted">
                      +{(variant.capable_staff || []).length - 3}
                    </div>
                  )}
                </div>
              </div>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-3">
                <CaretDown weight="bold" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="p-2 pt-1 border-t border-border/50">
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                {sortedStaff.map((staff) => {
                  const capability = variant.capable_staff?.find(
                    (s) => s.id === staff.id,
                  );
                  const status = sanitizeStatus(capability?.pivot?.status);

                  return (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <StaffAvatar staff={staff} size="xxs" />

                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-foreground leading-tight truncate">
                            {staff.first_name} {staff.last_name}
                          </span>
                          <span className="text-[9px] text-muted">
                            {staff.employee_code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-surface-secondary/80 p-1 rounded-lg border border-border/40 shrink-0">
                        <VariantStatusButton
                          active={status === "bisa"}
                          variant="success"
                          tooltip="Sudah Bisa"
                          onClick={() => handleSetStatus(staff.id, "bisa")}
                        >
                          <Check weight="bold" className="w-3 h-3" />
                        </VariantStatusButton>
                        <VariantStatusButton
                          active={status === "training"}
                          variant="warning"
                          tooltip="Sedang Training"
                          onClick={() => handleSetStatus(staff.id, "training")}
                        >
                          <Student weight="bold" className="w-3 h-3" />
                        </VariantStatusButton>
                        <VariantStatusButton
                          active={status === "tidak_bisa"}
                          variant="neutral"
                          tooltip="Tidak Bisa"
                          onClick={() =>
                            handleSetStatus(staff.id, "tidak_bisa")
                          }
                        >
                          <Prohibit weight="bold" className="w-3 h-3" />
                        </VariantStatusButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Harga + Aksi */}
      <div className="relative z-10 flex items-end justify-between mt-auto">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted font-bold mb-0.5">
            Harga
          </div>

          {activeDiscount ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-extrabold text-base text-danger">
                  {"Rp " + formatRupiah(finalPrice)}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger/10 text-danger">
                  {activeDiscount.discount_type === "percent"
                    ? `-${activeDiscount.discount_value}%`
                    : `-Rp ${formatRupiah(activeDiscount.discount_value)}`}
                </span>
              </div>
              <div className="text-[11px] text-muted line-through">
                {"Rp " + formatRupiah(originalPrice)}
              </div>
            </>
          ) : (
            <div className="font-extrabold text-base text-foreground">
              {"Rp " + formatRupiah(originalPrice)}
            </div>
          )}
        </div>

        <Dropdown>
          <Dropdown.Trigger>
            <button
              type="button"
              aria-label="Aksi item"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-secondary text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              <DotsThree weight="bold" className="w-4 h-4" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Popover
            placement="bottom end"
            className="z-50 min-w-[180px]"
          >
            <Dropdown.Menu
              aria-label="Item Actions"
              onAction={(key) => {
                setActionVariant(variant);
                if (key === "detail") setIsDetailItemOpen(true);
                if (key === "edit") setIsEditItemOpen(true);
                if (key === "delete") setIsDeleteItemOpen(true);
                if (key === "add_discount") {
                  setActiveDiscount(null);
                  setIsDiscountItemOpen(true);
                }
                if (key === "edit_discount" && activeDiscount) {
                  setActiveDiscount(activeDiscount);
                  setIsDiscountItemOpen(true);
                }
                if (key === "stop_discount" && activeDiscount) {
                  stopDiscount({});
                }
              }}
            >
              <Dropdown.Section>
                <Header>Action</Header>
                <Dropdown.Item id="detail" textValue="Detail Produk">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-accent" />
                    <Label>Detail Produk</Label>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="edit" textValue="Edit Item">
                  <div className="flex items-center gap-2">
                    <PencilSimple className="w-4 h-4 text-muted" />
                    <Label>Edit Item</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>

              <Dropdown.Section>
                {activeDiscount ? (
                  <>
                    <Dropdown.Item id="edit_discount" textValue="Edit Diskon">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-accent" />
                        <Label>Ubah Diskon</Label>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="stop_discount"
                      textValue="Hentikan Diskon"
                      variant="danger"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-danger" />
                        <Label>Hentikan Diskon</Label>
                      </div>
                    </Dropdown.Item>
                  </>
                ) : (
                  <Dropdown.Item id="add_discount" textValue="Apply Discount">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted" />
                      <Label>Atur Diskon</Label>
                    </div>
                  </Dropdown.Item>
                )}
              </Dropdown.Section>

              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete"
                  textValue="Delete Item"
                  variant="danger"
                >
                  <div className="flex items-center gap-2">
                    <Trash className="w-4 h-4 text-danger" />
                    <Label>Delete Item</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
}

// Komponen tombol status - dipakai bareng di VariantCard
function VariantStatusButton({
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
      ? "bg-success text-white shadow-sm shadow-success/30"
      : "text-muted hover:text-success hover:bg-success/10",
    warning: active
      ? "bg-warning text-white shadow-sm shadow-warning/30"
      : "text-muted hover:text-warning hover:bg-warning/10",
    neutral: active
      ? "bg-foreground/20 text-foreground"
      : "text-muted hover:text-foreground hover:bg-foreground/5",
  };

  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger aria-label={tooltip}>
        <button
          type="button"
          onClick={onClick}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 ${styles[variant]}`}
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
