"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  MagnifyingGlass,
  Plus,
  CaretRight,
  PlusCircle,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Dropdown, Label, Header, Separator, Description } from "@heroui/react";
import { useApiFetch } from "@/app/libs/use-http";
import { DynamicIcon } from "@/app/components/dynamic-icon";

// Import Modal Components
import { CreateCategoryModal } from "./modal/create-category-modal";
import { textStyle } from "@/app/libs/text-style";
import { DeleteCategoryModal } from "./modal/delete-category-modal";
import { EditCategoryModal } from "./modal/edit-category-modal";
import { CreateServiceModal } from "./modal/create-service-modal";
import { EditServiceModal } from "./modal/edit-service-modal";
import { DeleteServiceModal } from "./modal/delete-service-modal";
import { CreateItemModal } from "./modal/create-item-modal";
import { EditItemModal } from "./modal/edit-item-modal";
import { DeleteItemModal } from "./modal/delete-item-modal";
import { DiscountItemModal } from "./modal/discount-item-modal";

// Hapus import ServiceBlock ini jika ServiceBlock digabungkan di file yang sama
import { ServiceBlock } from "./components/service-block";
import { ProductLayananSkeleton } from "./components/service-skeleton";

// ==========================================
// TYPESCRIPT INTERFACES
// ==========================================
export interface Discount {
  id: number;
  bms_ms_service_variant_id: number;
  discount_type: "percent" | "nominal";
  discount_value: number | string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active: boolean;
}

export interface ServiceVariant {
  id: number;
  bms_ms_services_id: number;
  name: string;
  duration_minutes: number;
  retail_price: string | number;
  special_price: string | number | null;
  capital_price: string | number | null;
  is_active: boolean;
  final_price?: number;
  discounts?: Discount[];
}

export interface Service {
  id: number;
  bms_ms_service_categories_id: number;
  name: string;
  slug: string;
  description: string | null;
  badge: string | null;
  image_path: string | null;
  is_active: boolean;
  variants: ServiceVariant[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  target_audience: "Semua" | "Pria" | "Wanita";
  icon: string | null;
  order_column: number;
  is_active: boolean;
  services: Service[];
}

export interface FilteredService extends Service {
  category_name: string;
}

export default function MasterProductPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  // === Fetch Data Master API ===
  const {
    data: responseData,
    isLoading,
    isError,
  } = useApiFetch<any>(["categories"], "/master/categories");

  const categories: Category[] = useMemo(
    () => responseData?.data || [],
    [responseData],
  );

  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // === Modal States ===
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);

  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isDeleteServiceOpen, setIsDeleteServiceOpen] = useState(false);

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [isDiscountItemOpen, setIsDiscountItemOpen] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);

  // Action Data States
  const [actionCategory, setActionCategory] = useState<Category | null>(null);
  const [actionService, setActionService] = useState<Service | null>(null);
  const [actionVariant, setActionVariant] = useState<ServiceVariant | null>(
    null,
  );

  // Hover Caret State
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterCaret = (id: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenDropdownId(id);
  };

  const handleMouseLeaveCaret = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 250);
  };

  // Logika Filter Data Pencarian
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || categories.length === 0) return null;

    const lowerQuery = searchQuery.toLowerCase();
    const results: FilteredService[] = [];

    categories.forEach((cat) => {
      cat.services.forEach((svc) => {
        const matchingVariants = svc.variants.filter(
          (variant) =>
            variant.name.toLowerCase().includes(lowerQuery) ||
            svc.name.toLowerCase().includes(lowerQuery),
        );

        if (matchingVariants.length > 0) {
          results.push({
            ...svc,
            category_name: cat.name,
            variants: matchingVariants,
          });
        }
      });
    });
    return results;
  }, [searchQuery, categories]);

  // Ambil data kategori yang sedang aktif
  const activeCategory = useMemo(
    () => categories.find((cat) => cat.id === activeCategoryId),
    [categories, activeCategoryId],
  );

  // === RENDER STATE: LOADING ===
  if (isLoading) {
    return <ProductLayananSkeleton />;
  }

  // === RENDER STATE: ERROR ===
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-danger/10 text-danger flex items-center justify-center rounded-full mb-4">
          <WarningCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Gagal Memuat Data</h3>
        <p className="text-muted text-sm mt-1 max-w-md">
          Terjadi kesalahan saat terhubung ke server. Silakan periksa koneksi
          Anda dan coba lagi.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "800",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Master Product & Layanan
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "var(--text-sm)",
              marginTop: "var(--space-1)",
            }}
          >
            Kelola daftar layanan, kategori, dan harga.
          </p>
        </div>

        <div
          className="flex items-center w-full sm:w-auto"
          style={{ gap: "var(--space-3)" }}
        >
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
            />
            <input
              type="text"
              placeholder="Cari layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "var(--space-10)",
                paddingRight: "var(--space-4)",
                paddingTop: "var(--space-3)",
                paddingBottom: "var(--space-3)",
                backgroundColor: "var(--field-background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                fontSize: "var(--text-sm)",
                color: "var(--field-foreground)",
                outline: "none",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--focus)";
                e.target.style.boxShadow = "0 0 0 1px var(--focus)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
              }}
            />
          </div>
          <button
            onClick={() => setIsAddCategoryOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              paddingLeft: "var(--space-5)",
              paddingRight: "var(--space-5)",
              paddingTop: "var(--space-3)",
              paddingBottom: "var(--space-3)",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              borderRadius: "var(--radius-xl)",
              fontSize: "var(--text-sm)",
              fontWeight: "600",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              transition: "opacity 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus
              weight="bold"
              style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
            />
            <span className="hidden sm:inline">Tambah Data</span>
          </button>
        </div>
      </div>

      <div
        className="flex flex-col min-[1080px]:flex-row"
        style={{ gap: "var(--space-6)" }}
      >
        {/* SIDEBAR KATEGORI */}
        <aside className="min-[1080px]:w-[280px] flex-shrink-0 relative">
          <div
            className="min-[1080px]:sticky"
            style={{ top: "var(--page-padding-y)" }}
          >
            {/* Label "Kategori" + tombol + hanya tampil di desktop */}
            <div
              className="hidden min-[1080px]:flex items-center justify-between mb-3"
              style={{
                paddingLeft: "var(--space-2)",
                paddingRight: "var(--space-2)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "700",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Kategori
              </h2>
              <button
                onClick={() => setIsAddCategoryOpen(true)}
                style={{
                  width: "var(--space-6)",
                  height: "var(--space-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface-secondary)",
                  color: "var(--foreground)",
                  transition: "background-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent-foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--surface-secondary)";
                  e.currentTarget.style.color = "var(--foreground)";
                }}
              >
                <Plus
                  style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
                />
              </button>
            </div>

            {/* Mobile: horizontal pill tabs | Desktop: vertical list */}
            <div className="flex min-[1080px]:flex-col gap-2 min-[1080px]:gap-1 overflow-x-auto min-[1080px]:overflow-visible pb-2 min-[1080px]:pb-0 scrollbar-hide">
              {categories.length === 0 ? (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    fontSize: "var(--text-sm)",
                    color: "var(--muted)",
                    backgroundColor:
                      "color-mix(in oklch, var(--surface-secondary) 50%, transparent)",
                    borderRadius: "var(--radius-xl)",
                    textAlign: "center",
                    border: "1px dashed var(--border)",
                  }}
                >
                  Belum ada kategori
                </div>
              ) : (
                categories.map((cat) => {
                  const isActive = activeCategoryId === cat.id;
                  const isDropdownOpen = openDropdownId === cat.id;
                  const showCaret = isActive || isDropdownOpen;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActiveCategoryId(cat.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-xl)",
                        fontSize: "var(--text-sm)",
                        fontWeight: "500",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        cursor: "pointer",
                        backgroundColor: isActive
                          ? "var(--accent)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent-foreground)"
                          : "var(--foreground)",
                        boxShadow: isActive
                          ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor =
                            "var(--surface-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div
                        className="flex items-center"
                        style={{ gap: "var(--space-3)" }}
                      >
                        <span
                          style={{
                            color: isActive
                              ? "var(--accent-foreground)"
                              : "var(--muted)",
                          }}
                        >
                          <DynamicIcon
                            name={cat.icon || ""}
                            style={{
                              width: "var(--icon-lg)",
                              height: "var(--icon-lg)",
                            }}
                          />
                        </span>
                        <span>{textStyle(cat.name)}</span>
                      </div>

                      <div
                        style={{
                          display: "none",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "opacity 0.2s ease",
                          opacity: showCaret ? 1 : 0,
                          "@media (min-width: 768px)": {
                            display: "flex",
                          },
                        }}
                        className="group-hover:opacity-100"
                        onMouseEnter={() => handleMouseEnterCaret(cat.id)}
                        onMouseLeave={handleMouseLeaveCaret}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Dropdown isOpen={isDropdownOpen}>
                          <Dropdown.Trigger>
                            <div
                              style={{
                                padding: "var(--space-1)",
                                borderRadius: "var(--radius-md)",
                                transition: "background-color 0.2s ease",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(0,0,0,0.1)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <CaretRight
                                style={{
                                  width: "var(--icon-md)",
                                  height: "var(--icon-md)",
                                  color: isActive
                                    ? "var(--accent-foreground)"
                                    : "var(--muted)",
                                }}
                              />
                            </div>
                          </Dropdown.Trigger>
                          <Dropdown.Popover
                            placement="right top"
                            className="z-50 min-w-[220px]"
                            onMouseEnter={() => handleMouseEnterCaret(cat.id)}
                            onMouseLeave={handleMouseLeaveCaret}
                          >
                            <Dropdown.Menu
                              aria-label={`Menu ${cat.name}`}
                              onAction={(key) => {
                                setActionCategory(cat);
                                if (key === "create_service")
                                  setIsCreateServiceOpen(true);
                                if (key === "edit") setIsEditCategoryOpen(true);
                                if (key === "delete")
                                  setIsDeleteCategoryOpen(true);
                              }}
                            >
                              <Dropdown.Section>
                                <Header>Actions</Header>
                                <Dropdown.Item
                                  id="create_service"
                                  textValue="Create Service"
                                >
                                  <div className="flex h-8 items-start justify-center pt-px mr-2">
                                    <PlusCircle
                                      style={{
                                        width: "var(--icon-md)",
                                        height: "var(--icon-md)",
                                        flexShrink: 0,
                                        color: "var(--muted)",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <Label>Create Service</Label>
                                    <Description>
                                      Tambah layanan baru
                                    </Description>
                                  </div>
                                </Dropdown.Item>
                                <Dropdown.Item id="edit" textValue="Edit">
                                  <div className="flex h-8 items-start justify-center pt-px mr-2">
                                    <PencilSimple
                                      style={{
                                        width: "var(--icon-md)",
                                        height: "var(--icon-md)",
                                        flexShrink: 0,
                                        color: "var(--muted)",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <Label>Edit Category</Label>
                                    <Description>
                                      Ubah data kategori
                                    </Description>
                                  </div>
                                </Dropdown.Item>
                              </Dropdown.Section>
                              <Separator />
                              <Dropdown.Section>
                                <Header>Danger zone</Header>
                                <Dropdown.Item
                                  id="delete"
                                  textValue="Delete"
                                  variant="danger"
                                >
                                  <div className="flex h-8 items-start justify-center pt-px mr-2">
                                    <Trash
                                      style={{
                                        width: "var(--icon-md)",
                                        height: "var(--icon-md)",
                                        flexShrink: 0,
                                        color: "var(--danger)",
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <Label>Delete Category</Label>
                                    <Description>
                                      Hapus kategori ini
                                    </Description>
                                  </div>
                                </Dropdown.Item>
                              </Dropdown.Section>
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* KONTEN UTAMA (SERVICES & VARIANTS) */}
        <div
          className="flex-1 min-w-0"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {filteredData ? (
            filteredData.length > 0 ? (
              filteredData.map((svc) => (
                <ServiceBlock
                  key={svc.id}
                  service={svc}
                  setActionService={setActionService}
                  setActionVariant={setActionVariant}
                  setIsCreateItemOpen={setIsCreateItemOpen}
                  setIsDiscountItemOpen={setIsDiscountItemOpen}
                  setIsEditServiceOpen={setIsEditServiceOpen}
                  setIsDeleteServiceOpen={setIsDeleteServiceOpen}
                  setIsEditItemOpen={setIsEditItemOpen}
                  setIsDeleteItemOpen={setIsDeleteItemOpen}
                  setActiveDiscount={setActiveDiscount}
                />
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-20)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-2xl)",
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                }}
              >
                <div
                  style={{
                    width: "var(--space-16)",
                    height: "var(--space-16)",
                    backgroundColor: "var(--surface-secondary)",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: "auto",
                    marginRight: "auto",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <MagnifyingGlass
                    style={{
                      width: "var(--icon-xl)",
                      height: "var(--icon-xl)",
                      color: "var(--muted)",
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-lg)",
                    fontWeight: "700",
                    color: "var(--foreground)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Data tidak ditemukan
                </h3>
                <p
                  style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}
                >
                  Coba gunakan kata kunci pencarian yang lain.
                </p>
              </div>
            )
          ) : activeCategory?.services && activeCategory.services.length > 0 ? (
            activeCategory.services.map((svc) => (
              <ServiceBlock
                key={svc.id}
                service={svc}
                setActionService={setActionService}
                setActionVariant={setActionVariant}
                setIsCreateItemOpen={setIsCreateItemOpen}
                setIsDiscountItemOpen={setIsDiscountItemOpen}
                setIsEditServiceOpen={setIsEditServiceOpen}
                setIsDeleteServiceOpen={setIsDeleteServiceOpen}
                setIsEditItemOpen={setIsEditItemOpen}
                setIsDeleteItemOpen={setIsDeleteItemOpen}
                setActiveDiscount={setActiveDiscount}
              />
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-20)",
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-2xl)",
              }}
            >
              <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                Tidak ada layanan di kategori ini.
              </p>
              <button
                onClick={() => {
                  setActionCategory(activeCategory || null);
                  setIsCreateServiceOpen(true);
                }}
                style={{
                  marginTop: "var(--space-4)",
                  paddingLeft: "var(--space-4)",
                  paddingRight: "var(--space-4)",
                  paddingTop: "var(--space-2)",
                  paddingBottom: "var(--space-2)",
                  backgroundColor: "var(--surface-secondary)",
                  color: "var(--foreground)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "500",
                  borderRadius: "var(--radius-lg)",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--border)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--surface-secondary)")
                }
              >
                Tambah Layanan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODALS RENDER (PERBAIKAN PROPS DI SINI)
          ========================================== */}
      {isAddCategoryOpen && (
        <CreateCategoryModal setIsAddCategoryOpen={setIsAddCategoryOpen} />
      )}

      {isEditCategoryOpen && actionCategory && (
        <EditCategoryModal
          setIsEditCategoryOpen={setIsEditCategoryOpen}
          category={actionCategory}
        />
      )}

      {isDeleteCategoryOpen && actionCategory && (
        <DeleteCategoryModal
          setIsDeleteCategoryOpen={setIsDeleteCategoryOpen}
          category={actionCategory}
        />
      )}

      {isCreateServiceOpen && actionCategory && (
        <CreateServiceModal
          setIsCreateServiceOpen={setIsCreateServiceOpen}
          category={actionCategory}
        />
      )}

      {isEditServiceOpen && actionService && (
        <EditServiceModal
          setIsEditServiceOpen={setIsEditServiceOpen}
          category={activeCategory || null}
          service={actionService}
        />
      )}

      {isDeleteServiceOpen && actionService && (
        <DeleteServiceModal
          setIsDeleteServiceOpen={setIsDeleteServiceOpen}
          service={actionService}
        />
      )}

      {/* PERBAIKAN: Create Item butuh parent service-nya */}
      {isCreateItemOpen && actionService && (
        <CreateItemModal
          setIsCreateItemOpen={setIsCreateItemOpen}
          service={actionService}
        />
      )}

      {/* PERBAIKAN: Edit & Delete Item butuh varian-nya */}
      {isEditItemOpen && actionVariant && (
        <EditItemModal
          setIsEditItemOpen={setIsEditItemOpen}
          variant={actionVariant}
        />
      )}

      {isDeleteItemOpen && actionVariant && (
        <DeleteItemModal
          setIsDeleteItemOpen={setIsDeleteItemOpen}
          variant={actionVariant}
        />
      )}

      {isDiscountItemOpen && actionVariant && (
        <DiscountItemModal
          setIsDiscountItemOpen={setIsDiscountItemOpen}
          variant={actionVariant}
          existingDiscount={activeDiscount} // null untuk Create, isi object untuk Edit
        />
      )}
    </div>
  );
}
