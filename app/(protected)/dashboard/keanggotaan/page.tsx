"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Autocomplete,
  Label,
  ListBox,
  SearchField,
  useFilter,
  toast,
} from "@heroui/react";
import {
  Clock,
  Users,
  Crown,
  CheckCircle,
  XCircle,
  Plus,
  MagnifyingGlass,
  UserCirclePlus,
  UserList,
} from "@phosphor-icons/react";
import { useApiFetch, usePost } from "@/app/libs/use-http";
import { CustomerMembership, MembershipPackage, Customer } from "./types";
import { formatDate } from "@/app/libs/date-format";

// --- Utilities ---
const idr = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;
const durFmt = (days: number): string =>
  days === 1 ? "1 hari" : `${days} hari`;

const inputCls =
  "w-full py-3 px-4 rounded-xl border-[0.5px] border-border text-sm text-foreground bg-transparent outline-none transition-all focus:border-[#135a86] focus:ring-1 focus:ring-[#135a86]/20 font-['Plus_Jakarta_Sans',sans-serif]";

type CustomerMode = "existing" | "new";

interface FormState {
  customerId: number | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  membershipPackageId: number | null;
  startDate: string;
  endDate: string;
}

const defaultForm = (): FormState => ({
  customerId: null,
  name: "",
  phone: "",
  email: "",
  address: "",
  membershipPackageId: null,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
});

export default function DaftarAnggotaPage() {
  const { contains } = useFilter({ sensitivity: "base" });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] =
    useState<CustomerMembership | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [form, setForm] = useState<FormState>(defaultForm());

  // --- Data Fetching ---
  const { data: membershipsResp, isLoading: isMembershipsLoading } =
    useApiFetch<{ data: CustomerMembership[] }>(
      ["customer-memberships"],
      "/master/customer-memberships",
    );
  const { data: packagesResp } = useApiFetch<{ data: MembershipPackage[] }>(
    ["membership-packages"],
    "/master/membership-packages",
  );
  const { data: customersResp } = useApiFetch<{ data: Customer[] }>(
    ["customers"],
    "/customer",
  );

  const memberships = membershipsResp?.data || [];
  const packages = packagesResp?.data?.filter((p) => p.is_active) || [];
  const customers = customersResp?.data || [];

  // --- Derived Data ---
  const filteredMemberships = useMemo(() => {
    if (!search.trim()) return memberships;
    const q = search.toLowerCase();
    return memberships.filter(
      (m) =>
        m.customer?.name?.toLowerCase().includes(q) ||
        m.customer?.phone?.toLowerCase().includes(q) ||
        m.membership_package?.name?.toLowerCase().includes(q),
    );
  }, [search, memberships]);

  const activeMemberships = useMemo(
    () =>
      filteredMemberships.filter(
        (m) => m.status === "active" && new Date(m.end_date) >= new Date(),
      ),
    [filteredMemberships],
  );

  const expiredMemberships = useMemo(
    () =>
      filteredMemberships.filter(
        (m) => m.status === "expired" || new Date(m.end_date) < new Date(),
      ),
    [filteredMemberships],
  );

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === form.membershipPackageId),
    [packages, form.membershipPackageId],
  );

  // --- Mutations ---
  const { mutate: addMembership, isPending: isAddingMembership } = usePost<
    { data: CustomerMembership },
    {
      customer_id?: number;
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      membership_package_id: number;
    }
  >("/master/customer-memberships", {
    invalidate: [["customer-memberships"]],
    onSuccess: () => {
      toast.success("Keanggotaan berhasil ditambahkan!");
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.danger("Gagal menambahkan keanggotaan", {
        description: err?.response?.data?.message,
      });
    },
  });

  const { mutate: createMembershipPayment, isPending: isCreatingPayment } =
    usePost<{ data: { payment_url: string } }, { idempotency_key: string }>(
      (payload) =>
        selectedMember
          ? `/master/customer-memberships/${selectedMember.id}/payment`
          : "",
      {
        onSuccess: (data) => {
          const paymentUrl = data?.data?.payment_url;
          if (paymentUrl) window.location.href = paymentUrl;
          else toast.warning("Gagal membuat link pembayaran");
        },
        onError: (err: any) => {
          toast.danger("Gagal membuat link pembayaran", {
            description: err?.response?.data?.message,
          });
        },
      },
    );

  // --- Effects ---
  useEffect(() => {
    if (selectedPackage) {
      const start = new Date(form.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + selectedPackage.duration_days);
      setForm((prev) => ({
        ...prev,
        endDate: end.toISOString().split("T")[0],
      }));
    }
  }, [form.startDate, selectedPackage]);

  useEffect(() => {
    // Custom GSAP Reveal for list items
    if (typeof window !== "undefined" && (window as any).gsap) {
      (window as any).gsap.fromTo(
        ".gsap-reveal",
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "power3.out" },
      );
    }
  }, [activeMemberships.length, expiredMemberships.length]);

  // --- Handlers ---
  const handleCreatePayment = () => {
    createMembershipPayment({ idempotency_key: crypto.randomUUID() });
  };

  const resetForm = () => {
    setForm(defaultForm());
    setCustomerMode("existing");
  };

  const handleModeChange = (mode: CustomerMode) => {
    setCustomerMode(mode);
    setForm((prev) => ({
      ...prev,
      customerId: null,
      name: "",
      phone: "",
      email: "",
      address: "",
    }));
  };

  const handleSubmitAdd = () => {
    if (!form.membershipPackageId) {
      return toast.danger("Validasi", {
        description: "Mohon pilih paket keanggotaan.",
      });
    }

    if (customerMode === "new") {
      if (!form.name.trim() || !form.phone.trim()) {
        return toast.danger("Validasi", {
          description: "Nama dan nomor telepon wajib diisi.",
        });
      }
      addMembership({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        membership_package_id: form.membershipPackageId,
      });
    } else {
      if (!form.customerId) {
        return toast.danger("Validasi", {
          description: "Mohon pilih pelanggan.",
        });
      }
      addMembership({
        customer_id: form.customerId,
        membership_package_id: form.membershipPackageId,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-full flex flex-col bg-[#fdfdfd] text-foreground"
      style={{
        padding: "120px var(--page-padding-x) 40px",
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* SVG Grain Noise Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-end mb-12 gap-6 relative z-10">
        <div className="max-w-2xl">
          <h1
            className="text-4xl md:text-5xl font-light tracking-tight text-foreground"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            Daftar Anggota
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed tracking-wide">
            Lihat dan kelola semua anggota beserta paket keanggotaan mereka
            secara komprehensif.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="magnetic-cta inline-flex items-center gap-3 px-6 py-3 bg-[#135a86] text-white rounded-none hover:bg-[#0f466b] transition-colors duration-300"
          style={{
            fontFamily: '"Raleway", sans-serif',
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
          }}
        >
          <Plus weight="bold" className="w-4 h-4" />
          <span className="uppercase font-bold">Tambah Anggota</span>
        </button>
      </div>

      {/* EDITORIAL ASYMMETRY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        {/* LEFT: MEMBER LIST (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SEARCH */}
          <div className="relative group">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-[#135a86]" />
            <input
              type="text"
              placeholder="Cari nama, telepon, atau paket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-transparent border-[0.5px] border-border rounded-none text-sm outline-none focus:border-[#135a86] transition-colors"
            />
          </div>

          {/* ACTIVE MEMBERS */}
          <div className="border-[0.5px] border-border bg-white">
            <div className="px-6 py-4 border-b-[0.5px] border-border flex items-center gap-3">
              <CheckCircle weight="fill" className="w-5 h-5 text-[#135a86]" />
              <h2
                className="text-xs font-bold uppercase tracking-widest text-foreground/80"
                style={{ fontFamily: '"Raleway", sans-serif' }}
              >
                Aktif ({activeMemberships.length})
              </h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-3">
              {isMembershipsLoading ? (
                <div className="py-12 text-center text-muted text-sm italic">
                  Memuat data...
                </div>
              ) : activeMemberships.length === 0 ? (
                <div className="py-8 text-center text-muted text-sm">
                  Belum ada anggota aktif.
                </div>
              ) : (
                activeMemberships.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`gsap-reveal w-full text-left p-4 mb-2 border-[0.5px] transition-all duration-300 ${
                      selectedMember?.id === member.id
                        ? "bg-[#135a86]/5 border-[#135a86]"
                        : "border-transparent hover:border-border hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {member.customer?.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 bg-[#135a86]/10 text-[#135a86]">
                          <Crown weight="fill" className="w-3 h-3" />
                          {member.membership_package?.name}
                        </span>
                      </div>
                      {member.customer?.phone && (
                        <span className="text-xs text-muted/80 font-mono">
                          {member.customer.phone}
                        </span>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {formatDate(new Date(member.start_date), {
                            dateStyle: "medium",
                          })}{" "}
                          —{" "}
                          {formatDate(new Date(member.end_date), {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* EXPIRED MEMBERS */}
          {expiredMemberships.length > 0 && (
            <div className="border-[0.5px] border-border bg-white opacity-80 hover:opacity-100 transition-opacity">
              <div className="px-6 py-4 border-b-[0.5px] border-border flex items-center gap-3">
                <XCircle weight="fill" className="w-5 h-5 text-red-800" />
                <h2
                  className="text-xs font-bold uppercase tracking-widest text-foreground/80"
                  style={{ fontFamily: '"Raleway", sans-serif' }}
                >
                  Kadaluarsa ({expiredMemberships.length})
                </h2>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-3">
                {expiredMemberships.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`gsap-reveal w-full text-left p-4 mb-2 border-[0.5px] transition-all duration-300 ${
                      selectedMember?.id === member.id
                        ? "bg-red-50 border-red-200"
                        : "border-transparent hover:border-border hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex flex-col gap-2 grayscale opacity-75">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {member.customer?.name}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 bg-red-100 text-red-800">
                          Kadaluarsa
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Berakhir pada{" "}
                          {formatDate(new Date(member.end_date), {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: MEMBER DETAIL (7/12) */}
        <div className="lg:col-span-7">
          {!selectedMember ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-[0.5px] border-border bg-white p-12 text-center">
              <Users className="w-12 h-12 text-muted/30 mb-6" weight="light" />
              <h3
                className="text-lg font-medium tracking-wide"
                style={{ fontFamily: '"Raleway", sans-serif' }}
              >
                Pilih Profil Anggota
              </h3>
              <p className="text-sm text-muted mt-2 max-w-sm">
                Pilih anggota dari daftar direktori di sebelah kiri untuk
                meninjau detail paket dan penggunaan layanan.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* MEMBER INFO */}
              <div className="border-[0.5px] border-border bg-white p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#135a86]" />
                <div className="flex flex-col gap-6">
                  <div>
                    <h3
                      className="text-3xl font-light mb-3"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      {selectedMember.customer?.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 ${
                          selectedMember.status === "active" &&
                          new Date(selectedMember.end_date) >= new Date()
                            ? "bg-[#135a86]/10 text-[#135a86]"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedMember.status === "active" ? (
                          <Crown weight="fill" className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle weight="fill" className="w-3.5 h-3.5" />
                        )}
                        {selectedMember.membership_package?.name}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t-[0.5px] border-border">
                    <div>
                      <Label className="text-[10px] text-muted font-bold uppercase tracking-widest">
                        Nomor Telepon
                      </Label>
                      <p className="text-sm font-medium mt-2">
                        {selectedMember.customer?.phone || "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted font-bold uppercase tracking-widest">
                        Email
                      </Label>
                      <p className="text-sm font-medium mt-2">
                        {selectedMember.customer?.email || "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted font-bold uppercase tracking-widest">
                        Tanggal Mulai
                      </Label>
                      <p className="text-sm font-medium mt-2">
                        {formatDate(new Date(selectedMember.start_date), {
                          dateStyle: "long",
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted font-bold uppercase tracking-widest">
                        Tanggal Kadaluarsa
                      </Label>
                      <p className="text-sm font-medium mt-2">
                        {formatDate(new Date(selectedMember.end_date), {
                          dateStyle: "long",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUOTA INFO */}
              <div className="border-[0.5px] border-border bg-white">
                <div className="px-8 py-5 border-b-[0.5px] border-border">
                  <h4
                    className="text-xs font-bold uppercase tracking-widest text-foreground/80"
                    style={{ fontFamily: '"Raleway", sans-serif' }}
                  >
                    Alokasi Kuota Layanan
                  </h4>
                </div>
                <div className="p-8 space-y-6">
                  {selectedMember.membership_package?.variants?.map(
                    (variant) => {
                      const used =
                        selectedMember.quota_usages
                          ?.filter(
                            (q) =>
                              q.service_variant_id ===
                              variant.service_variant_id,
                          )
                          .reduce((sum, q) => sum + q.usage_count, 0) || 0;
                      const remaining =
                        selectedMember.remaining_quota?.[
                          variant.service_variant_id
                        ] ?? variant.quota - used;

                      return (
                        <div key={variant.id} className="space-y-3">
                          <div className="flex items-end justify-between text-sm">
                            <span
                              className={`font-medium ${selectedMember.is_paid ? "" : "text-muted"}`}
                            >
                              {variant.service_variant?.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-muted">
                              {remaining} / {variant.quota}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ease-out ${selectedMember.is_paid ? "bg-[#135a86]" : "bg-gray-300"}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, ((variant.quota - remaining) / variant.quota) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* PAYMENT STRIP */}
              <div className="border-[0.5px] border-border bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h4
                    className="text-xs font-bold uppercase tracking-widest text-muted"
                    style={{ fontFamily: '"Raleway", sans-serif' }}
                  >
                    Total Tagihan
                  </h4>
                  <p
                    className="text-2xl font-light mt-1"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {idr(selectedMember.membership_package?.price || 0)}
                  </p>
                </div>
                {selectedMember.is_paid ? (
                  <div className="flex items-center gap-2 px-5 py-2.5 border-[0.5px] border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-widest">
                    <CheckCircle className="w-4 h-4" />
                    Lunas
                  </div>
                ) : (
                  <button
                    onClick={handleCreatePayment}
                    disabled={isCreatingPayment}
                    className="magnetic-cta px-6 py-3 bg-[#135a86] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0f466b] transition-colors duration-300 disabled:opacity-50"
                    style={{ fontFamily: '"Raleway", sans-serif' }}
                  >
                    {isCreatingPayment
                      ? "Memproses..."
                      : "Buat Link Pembayaran"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#fdfdfd] w-full max-w-2xl rounded-none shadow-2xl border-[0.5px] border-border flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b-[0.5px] border-border shrink-0">
              <div>
                <h2
                  className="text-xl font-light"
                  style={{ fontFamily: '"Cormorant Garamond", serif' }}
                >
                  Tambah Anggota Baru
                </h2>
                <p className="text-xs text-muted mt-1 uppercase tracking-wider font-bold">
                  Registrasi Paket Keanggotaan
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-muted hover:text-foreground transition-colors"
              >
                <XCircle weight="light" className="w-6 h-6" />
              </button>
            </div>

            <div
              className="p-8 overflow-y-auto space-y-8"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              {/* TAB SELECTOR */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100/50 border-[0.5px] border-border">
                <button
                  type="button"
                  onClick={() => handleModeChange("existing")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                    customerMode === "existing"
                      ? "bg-white text-[#135a86] shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <UserList className="w-4 h-4" /> Pelanggan Lama
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("new")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                    customerMode === "new"
                      ? "bg-white text-[#135a86] shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <UserCirclePlus className="w-4 h-4" /> Pelanggan Baru
                </button>
              </div>

              {/* EXISTING CUSTOMER FORM */}
              {customerMode === "existing" ? (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                    Pilih Direktori Pelanggan{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Autocomplete
                    defaultItems={customers}
                    selectedKey={
                      form.customerId ? String(form.customerId) : null
                    }
                    onSelectionChange={(key) =>
                      setForm((prev) => ({
                        ...prev,
                        customerId: key ? Number(key) : null,
                      }))
                    }
                  >
                    <Autocomplete.Trigger className={inputCls}>
                      <Autocomplete.Value>
                        {({ isPlaceholder }) =>
                          isPlaceholder ? (
                            <span className="text-muted">
                              Cari nama atau nomor telepon...
                            </span>
                          ) : (
                            customers.find((c) => c.id === form.customerId)
                              ?.name
                          )
                        }
                      </Autocomplete.Value>
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover>
                      <Autocomplete.Filter filter={contains}>
                        <SearchField autoFocus>
                          <SearchField.Group>
                            <SearchField.Input placeholder="Ketik untuk mencari..." />
                          </SearchField.Group>
                        </SearchField>
                        <ListBox>
                          {customers.map((customer) => (
                            <ListBox.Item
                              key={String(customer.id)}
                              id={String(customer.id)}
                              textValue={`${customer.name} ${customer.phone}`}
                            >
                              <div className="flex flex-col py-1">
                                <span className="text-sm font-medium">
                                  {customer.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted mt-0.5">
                                  {customer.phone || customer.customer_code}
                                </span>
                              </div>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                          {customers.length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted text-center">
                              Data kosong
                            </div>
                          )}
                        </ListBox>
                      </Autocomplete.Filter>
                    </Autocomplete.Popover>
                  </Autocomplete>
                </div>
              ) : (
                /* NEW CUSTOMER FORM */
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <input
                      className={inputCls}
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                        Nomor Telepon <span className="text-red-500">*</span>
                      </Label>
                      <input
                        className={inputCls}
                        placeholder="08xxx"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                        Email{" "}
                        <span className="text-muted font-normal lowercase">
                          (opsional)
                        </span>
                      </Label>
                      <input
                        className={inputCls}
                        placeholder="email@domain.com"
                        value={form.email}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                      Alamat{" "}
                      <span className="text-muted font-normal lowercase">
                        (opsional)
                      </span>
                    </Label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      placeholder="Alamat lengkap domisili"
                      value={form.address}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <hr className="border-t-[0.5px] border-border" />

              {/* PACKAGE SELECTION */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Pilih Paket Keanggotaan{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Autocomplete
                  defaultItems={packages}
                  selectedKey={
                    form.membershipPackageId
                      ? String(form.membershipPackageId)
                      : null
                  }
                  onSelectionChange={(key) =>
                    setForm((prev) => ({
                      ...prev,
                      membershipPackageId: key ? Number(key) : null,
                    }))
                  }
                >
                  <Autocomplete.Trigger className={inputCls}>
                    <Autocomplete.Value>
                      {({ isPlaceholder }) =>
                        isPlaceholder ? (
                          <span className="text-muted">
                            Pilih paket layanan...
                          </span>
                        ) : (
                          packages.find(
                            (p) => p.id === form.membershipPackageId,
                          )?.name
                        )
                      }
                    </Autocomplete.Value>
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus>
                        <SearchField.Group>
                          <SearchField.Input placeholder="Cari paket..." />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox>
                        {packages.map((pkg) => (
                          <ListBox.Item
                            key={String(pkg.id)}
                            id={String(pkg.id)}
                            textValue={pkg.name}
                          >
                            <div className="flex flex-col py-1">
                              <span className="text-sm font-medium">
                                {pkg.name}
                              </span>
                              <span className="text-[10px] tracking-wider text-muted mt-0.5">
                                {idr(pkg.price)} • {durFmt(pkg.duration_days)}
                              </span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                        {packages.length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted text-center">
                            Tidak ada paket aktif
                          </div>
                        )}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>
              </div>

              {/* DATE & QUOTA SUMMARY */}
              {selectedPackage && (
                <div className="bg-gray-50 border-[0.5px] border-border p-6 space-y-4">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    Ringkasan Ketentuan
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">
                        Tanggal Aktivasi
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {formatDate(new Date(form.startDate), {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">
                        Berakhir Pada
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {form.endDate
                          ? formatDate(new Date(form.endDate), {
                              dateStyle: "medium",
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>
                  {selectedPackage.variants?.length ? (
                    <div className="pt-4 border-t-[0.5px] border-border">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-3">
                        Distribusi Kuota
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPackage.variants.map((v) => (
                          <span
                            key={v.id}
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 border-[0.5px] border-[#135a86]/20 bg-white text-[#135a86]"
                          >
                            {v.service_variant?.name}{" "}
                            <span className="mx-1 text-muted">×</span> {v.quota}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 px-8 py-6 border-t-[0.5px] border-border bg-white shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={isAddingMembership}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-50"
                style={{ fontFamily: '"Raleway", sans-serif' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitAdd}
                disabled={isAddingMembership}
                className="px-8 py-2.5 bg-[#135a86] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0f466b] transition-colors disabled:opacity-50"
                style={{ fontFamily: '"Raleway", sans-serif' }}
              >
                {isAddingMembership ? "Memproses..." : "Konfirmasi Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
