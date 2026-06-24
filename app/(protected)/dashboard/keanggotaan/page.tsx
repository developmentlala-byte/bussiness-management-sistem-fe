"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect } from "react";
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

const idr = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;
const durFmt = (days: number): string =>
  days === 1 ? "1 hari" : `${days} hari`;

const inputCls =
  "w-full py-2 px-3 rounded-lg border border-border text-sm text-foreground bg-transparent outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20";

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

  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] =
    useState<CustomerMembership | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [form, setForm] = useState<FormState>(defaultForm());

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
          if (paymentUrl) {
            window.location.href = paymentUrl;
          } else {
            toast.warning("Gagal membuat link pembayaran");
          }
        },
        onError: (err: any) => {
          toast.danger("Gagal membuat link pembayaran", {
            description: err?.response?.data?.message,
          });
        },
      },
    );

  const handleCreatePayment = () => {
    createMembershipPayment({ idempotency_key: crypto.randomUUID() });
  };

  const resetForm = () => {
    setForm(defaultForm());
    setCustomerMode("existing");
  };

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === form.membershipPackageId),
    [packages, form.membershipPackageId],
  );

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

  // Reset form fields saat ganti mode
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
      toast.danger("Validasi", {
        description: "Mohon pilih paket keanggotaan.",
      });
      return;
    }

    if (customerMode === "new") {
      if (!form.name.trim() || !form.phone.trim()) {
        toast.danger("Validasi", {
          description: "Nama dan nomor telepon wajib diisi.",
        });
        return;
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
        toast.danger("Validasi", { description: "Mohon pilih pelanggan." });
        return;
      }
      addMembership({
        customer_id: form.customerId,
        membership_package_id: form.membershipPackageId,
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* HEADER */}
      <div
        className="flex flex-wrap justify-between items-center"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Daftar Anggota
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
              maxWidth: "36rem",
              lineHeight: 1.6,
            }}
          >
            Lihat dan kelola semua anggota beserta paket keanggotaan mereka.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground)",
            borderRadius: "var(--radius-xl)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }} />
          <span>Tambah Anggota</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: MEMBER LIST */}
        <div className="lg:w-1/2 space-y-4">
          {/* SEARCH */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Cari nama, nomor telepon, atau paket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-field-background border border-border rounded-xl text-sm outline-none"
            />
          </div>

          {/* ACTIVE MEMBERS */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-surface-secondary/30 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <h2 className="text-sm font-bold">
                Anggota Aktif ({activeMemberships.length})
              </h2>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {isMembershipsLoading ? (
                <div className="py-12 text-center text-muted text-sm">
                  Loading...
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
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedMember?.id === member.id
                        ? "bg-accent/10 border border-accent"
                        : "hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {member.customer?.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                            <Crown className="w-3 h-3" />
                            {member.membership_package?.name}
                          </span>
                        </div>
                        {member.customer?.phone && (
                          <span className="text-xs text-muted">
                            {member.customer.phone}
                          </span>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {formatDate(new Date(member.start_date), {
                              dateStyle: "medium",
                            })}
                            {" – "}
                            {formatDate(new Date(member.end_date), {
                              dateStyle: "medium",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* EXPIRED MEMBERS */}
          {expiredMemberships.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface-secondary/30 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-danger" />
                <h2 className="text-sm font-bold">
                  Anggota Kadaluarsa ({expiredMemberships.length})
                </h2>
              </div>
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {expiredMemberships.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`w-full text-left p-4 rounded-xl transition-all opacity-75 ${
                      selectedMember?.id === member.id
                        ? "bg-accent/10 border border-accent"
                        : "hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {member.customer?.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-danger/15 text-danger">
                          Kadaluarsa
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Kadaluarsa{" "}
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

        {/* RIGHT: MEMBER DETAIL */}
        <div className="lg:w-1/2">
          {!selectedMember ? (
            <div className="bg-surface border border-border rounded-2xl p-10 text-center">
              <Users className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-bold">Pilih Anggota</h3>
              <p className="text-sm text-muted mt-2">
                Pilih anggota dari daftar di sebelah kiri untuk melihat detail
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MEMBER INFO */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedMember.customer?.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          selectedMember.status === "active" &&
                          new Date(selectedMember.end_date) >= new Date()
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-danger/15 text-danger"
                        }`}
                      >
                        {selectedMember.status === "active" ? (
                          <Crown className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {selectedMember.membership_package?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted uppercase tracking-wide">
                        Nomor Telepon
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMember.customer?.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted uppercase tracking-wide">
                        Email
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMember.customer?.email || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div>
                      <Label className="text-xs text-muted uppercase tracking-wide">
                        Tanggal Mulai
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {formatDate(new Date(selectedMember.start_date), {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted uppercase tracking-wide">
                        Tanggal Kadaluarsa
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {formatDate(new Date(selectedMember.end_date), {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUOTA INFO */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surface-secondary/30">
                  <h4 className="text-sm font-bold">Kuota Layanan</h4>
                </div>
                <div className="p-6 space-y-4">
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
                        <div key={variant.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={`font-medium ${selectedMember.is_paid ? "" : "text-muted opacity-70"}`}
                            >
                              {variant.service_variant?.name}
                            </span>
                            <span className="text-muted font-medium">
                              {remaining} / {variant.quota}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${selectedMember.is_paid ? "bg-accent" : "bg-muted/50"}`}
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

              {/* PAYMENT BUTTON */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold">Pembayaran</h4>
                    <p className="text-xs text-muted mt-1">
                      Harga paket:{" "}
                      {idr(selectedMember.membership_package?.price || 0)}
                    </p>
                  </div>
                  {selectedMember.is_paid ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-xl text-sm font-semibold">
                      Sudah Dibayar
                    </div>
                  ) : (
                    <button
                      onClick={handleCreatePayment}
                      disabled={isCreatingPayment}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
                        borderRadius: "var(--radius-xl)",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isCreatingPayment
                        ? "Membuat link..."
                        : "Buat Link Pembayaran"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl border border-border flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Tambah Anggota
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Daftarkan pelanggan ke paket keanggotaan
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* ✅ TAB SELECTOR — jauh lebih jelas dari Switch */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-secondary rounded-xl">
                <button
                  type="button"
                  onClick={() => handleModeChange("existing")}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    customerMode === "existing"
                      ? "bg-surface text-foreground shadow-sm border border-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <UserList className="w-4 h-4" />
                  Pelanggan Terdaftar
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("new")}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    customerMode === "new"
                      ? "bg-surface text-foreground shadow-sm border border-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <UserCirclePlus className="w-4 h-4" />
                  Pelanggan Baru
                </button>
              </div>

              {/* EXISTING CUSTOMER */}
              {customerMode === "existing" ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-foreground">
                    Pilih Pelanggan <span className="text-danger">*</span>
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
                    <Autocomplete.Trigger className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                      <Autocomplete.Value>
                        {({ isPlaceholder }) =>
                          isPlaceholder ? (
                            <span className="text-muted">
                              Pilih pelanggan...
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
                            <SearchField.Input placeholder="Cari pelanggan..." />
                          </SearchField.Group>
                        </SearchField>
                        <ListBox>
                          {customers.map((customer) => (
                            <ListBox.Item
                              key={String(customer.id)}
                              id={String(customer.id)}
                              textValue={`${customer.name} ${customer.phone}`}
                            >
                              <div className="flex flex-col py-0.5">
                                <span className="text-sm font-medium">
                                  {customer.name}
                                </span>
                                <span className="text-xs text-muted">
                                  {customer.phone || customer.customer_code}
                                </span>
                              </div>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                          {customers.length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted text-center">
                              Tidak ada pelanggan
                            </div>
                          )}
                        </ListBox>
                      </Autocomplete.Filter>
                    </Autocomplete.Popover>
                  </Autocomplete>
                </div>
              ) : (
                /* NEW CUSTOMER */
                <div className="space-y-4 p-4 rounded-xl border border-border bg-surface-secondary/20">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      Nama Lengkap <span className="text-danger">*</span>
                    </Label>
                    <input
                      className={inputCls}
                      placeholder="Nama lengkap pelanggan"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">
                        Nomor Telepon <span className="text-danger">*</span>
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
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">
                        Email{" "}
                        <span className="text-muted font-normal">
                          (opsional)
                        </span>
                      </Label>
                      <input
                        className={inputCls}
                        placeholder="email@example.com"
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
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">
                      Alamat{" "}
                      <span className="text-muted font-normal">(opsional)</span>
                    </Label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      placeholder="Alamat lengkap"
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

              {/* PACKAGE */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">
                  Pilih Paket Keanggotaan <span className="text-danger">*</span>
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
                  <Autocomplete.Trigger className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                    <Autocomplete.Value>
                      {({ isPlaceholder }) =>
                        isPlaceholder ? (
                          <span className="text-muted">Pilih paket...</span>
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
                            <div className="flex flex-col py-0.5">
                              <span className="text-sm font-medium">
                                {pkg.name}
                              </span>
                              <span className="text-xs text-muted">
                                {idr(pkg.price)} · {durFmt(pkg.duration_days)}
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

              {/* DATE SUMMARY */}
              {selectedPackage && (
                <div className="rounded-xl border border-border/50 bg-surface-secondary/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Ringkasan Keanggotaan
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted">Tanggal Mulai</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {formatDate(new Date(form.startDate), {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Tanggal Kadaluarsa</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {form.endDate
                          ? formatDate(new Date(form.endDate), {
                              dateStyle: "medium",
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>
                  {selectedPackage.variants?.length ? (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted mb-2">
                        Kuota yang didapat:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPackage.variants.map((v) => (
                          <span
                            key={v.id}
                            className="text-xs font-medium px-2 py-1 rounded-lg bg-accent/10 text-accent"
                          >
                            {v.service_variant?.name} × {v.quota}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={isAddingMembership}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitAdd}
                disabled={isAddingMembership}
                className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-lg disabled:opacity-50"
              >
                {isAddingMembership ? "Menyimpan..." : "Tambah Anggota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
