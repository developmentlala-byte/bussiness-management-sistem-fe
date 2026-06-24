import { useState } from "react";
import { DynamicIcon } from "@/app/components/dynamic-icon";
import { formatDuration } from "@/app/libs/format-duration";
import { formatRupiah } from "@/app/libs/format-rupiah";
import { Dropdown, Header, Label, Separator, toast } from "@heroui/react";
import {
  Clock,
  DotsThree,
  PencilSimple,
  PlusCircle,
  Tag,
  Trash,
  CaretDown,
  XCircle,
} from "@phosphor-icons/react";
import { FilteredService, Service, ServiceVariant, Discount } from "../page";
import { useRemove } from "@/app/libs/use-http";

// ==========================================
// 1. KOMPONEN UTAMA: ServiceBlock
// ==========================================
interface ServiceBlockProps {
  service: Service | FilteredService;
  setActionService: (s: Service) => void;
  setActionVariant: (v: ServiceVariant) => void;
  setActiveDiscount: (d: Discount | null) => void;
  setIsCreateItemOpen: (v: boolean) => void;
  setIsDiscountItemOpen: (v: boolean) => void;
  setIsEditServiceOpen: (v: boolean) => void;
  setIsDeleteServiceOpen: (v: boolean) => void;
  setIsEditItemOpen: (v: boolean) => void;
  setIsDeleteItemOpen: (v: boolean) => void;
}

export function ServiceBlock({
  service,
  setActionService,
  setActionVariant,
  setActiveDiscount,
  setIsCreateItemOpen,
  setIsDiscountItemOpen,
  setIsEditServiceOpen,
  setIsDeleteServiceOpen,
  setIsEditItemOpen,
  setIsDeleteItemOpen,
}: ServiceBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const VISIBLE_LIMIT = 6;
  const variants = service.variants || [];
  const initialVariants = variants.slice(0, VISIBLE_LIMIT);
  const extraVariants = variants.slice(VISIBLE_LIMIT);
  const hasMoreItems = extraVariants.length > 0;

  const imageUrl =
    service.image_path ||
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=300&h=200";

  // Mengumpulkan props yang akan diteruskan ke VariantCard
  const variantActionProps = {
    setActionVariant,
    setActiveDiscount,
    setIsDiscountItemOpen,
    setIsEditItemOpen,
    setIsDeleteItemOpen,
  };

  return (
    <section className="bg-transparent">
      {/* Header Info Layanan Utama */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <img
            src={imageUrl}
            alt={service.name}
            className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-border bg-surface-secondary"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-extrabold text-foreground">
                {service.name}
              </h3>
              {service.badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-secondary text-accent uppercase tracking-wider">
                  <DynamicIcon name={service.badge} className="w-3 h-3 mr-1" />{" "}
                  {service.badge}
                </span>
              )}
            </div>
            <p className="text-muted text-sm line-clamp-1 max-w-lg">
              {service.description || "Tidak ada deskripsi."}
            </p>
          </div>
        </div>

        {/* Aksi Dropdown untuk Layanan (Parent) */}
        <Dropdown>
          <Dropdown.Trigger>
            <div className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-secondary hover:text-foreground transition-colors cursor-pointer shrink-0">
              <DotsThree weight="bold" className="w-5 h-5" />
            </div>
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
                    <Label>Create Item</Label>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="edit" textValue="Edit Service">
                  <div className="flex items-center gap-2">
                    <PencilSimple className="w-4 h-4 text-muted" />
                    <Label>Edit Service</Label>
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
                    <Label>Delete Service</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Area Varian */}
      <div className="pl-0 md:pl-20">
        {variants.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
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
              <div className="flex justify-center mt-6">
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
          <div className="mt-2 text-sm text-muted bg-surface-secondary/50 py-4 px-6 rounded-xl border border-dashed border-border inline-block">
            Belum ada varian / item untuk layanan ini.
          </div>
        )}
      </div>

      <div className="h-px bg-border w-full mt-8 mb-4 opacity-50" />
    </section>
  );
}

// ==========================================
// 2. SUB-KOMPONEN: VariantCard (BEST PRACTICE)
// Memisahkan variant agar masing-masing card memiliki Hook useRemove sendiri
// ==========================================
interface VariantCardProps {
  variant: ServiceVariant;
  setActionVariant: (v: ServiceVariant) => void;
  setActiveDiscount: (d: Discount | null) => void;
  setIsDiscountItemOpen: (v: boolean) => void;
  setIsEditItemOpen: (v: boolean) => void;
  setIsDeleteItemOpen: (v: boolean) => void;
}

function VariantCard({
  variant,
  setActionVariant,
  setActiveDiscount,
  setIsDiscountItemOpen,
  setIsEditItemOpen,
  setIsDeleteItemOpen,
}: VariantCardProps) {
  // Cari diskon yang aktif
  const activeDiscount = variant.discounts?.find((d) => d.is_active);

  // Hook spesifik milik card ini. Karena diletakkan di dalam card,
  // dia bisa langsung menarget ID diskon yang akurat.
  const { mutate: stopDiscount } = useRemove(
    activeDiscount ? `/master/discounts/${activeDiscount.id}` : "",
    {
      invalidate: [["categories"]],
      onSuccess: () => toast.success("Diskon dihentikan"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (activeDiscount.discount_type === "percent") {
      finalPrice = originalPrice - (originalPrice * dValue) / 100;
    } else {
      finalPrice = originalPrice - dValue;
    }
  }

  return (
    <div className="group flex flex-col justify-between p-5 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-accent/50 transition-all relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-background rounded-full group-hover:bg-surface-secondary transition-colors pointer-events-none" />

      <div className="relative z-10 mb-6">
        <h4 className="font-bold text-foreground group-hover:text-accent transition-colors mb-2 line-clamp-2">
          {variant.name}
        </h4>
        <div className="inline-flex items-center text-xs font-semibold text-muted bg-surface-secondary px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 mr-1.5 opacity-80" />
          {formatDuration(variant.duration_minutes)}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between mt-auto">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">
            Harga
          </div>

          {activeDiscount ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-extrabold text-lg text-danger">
                  {"Rp " + formatRupiah(finalPrice)}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">
                  {activeDiscount.discount_type === "percent"
                    ? `-${activeDiscount.discount_value}%`
                    : `-Rp ${formatRupiah(activeDiscount.discount_value)}`}
                </span>
              </div>
              <div className="text-xs text-muted line-through">
                {"Rp " + formatRupiah(originalPrice)}
              </div>
            </>
          ) : (
            <div className="font-extrabold text-lg text-foreground">
              {"Rp " + formatRupiah(originalPrice)}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Dropdown>
            <Dropdown.Trigger>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-secondary text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                <DotsThree weight="bold" className="w-4 h-4" />
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom end"
              className="z-50 min-w-[180px]"
            >
              <Dropdown.Menu
                aria-label="Item Actions"
                onAction={(key) => {
                  setActionVariant(variant);

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
                    // Panggil stopDiscount tanpa parameter kosong
                    stopDiscount({});
                  }
                }}
              >
                <Dropdown.Section>
                  <Header>Action</Header>
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
    </div>
  );
}
