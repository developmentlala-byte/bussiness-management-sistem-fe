import {
  Avatar,
  Dropdown,
  InputGroup,
  Label,
  Separator,
  TextField,
} from "@heroui/react";
import {
  DotsThree,
  MagnifyingGlass,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useState, useMemo } from "react";
import { useApiFetch } from "@/app/libs/use-http";
import Link from "next/link";

// Import Type dan Komponen Modal
import { Staff } from "@/app/types/staff";
import { EditStaffModal } from "../modal/edit-staff-modal";
import { DeleteStaffModal } from "../modal/delete-staff-modal";

export default function AnggotaStaffView() {
  const [search, setSearch] = useState("");

  // STATE MANAJEMEN MODAL
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const { data: responseData, isLoading } = useApiFetch<{ data: Staff[] }>(
    ["staffs"],
    "/master/staffs",
  );
  const staffs = responseData?.data || [];

  const filteredStaffs = useMemo(() => {
    if (!search) return staffs;
    return staffs.filter(
      (staff: Staff) =>
        staff.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        staff.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        staff.email?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, staffs]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      active: {
        color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        label: "Aktif",
      },
      inactive: {
        color: "bg-gray-500/10 text-gray-700 border-gray-500/20",
        label: "Nonaktif",
      },
      on_leave: {
        color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
        label: "Cuti",
      },
      terminated: {
        color: "bg-red-500/10 text-red-700 border-red-500/20",
        label: "Berhenti",
      },
    };
    const b = badges[status] || badges.inactive;
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${b.color}`}
      >
        {b.label}
      </span>
    );
  };

  // HANDLER AKSI
  const handleEditClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
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
                Email
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                No. Telp
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Bergabung
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-5 text-[11px] font-bold text-muted uppercase tracking-wider text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
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
                  {Array.from({ length: 6 }).map((_, i) => (
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
                  colSpan={7}
                  className="py-12 text-center text-muted font-medium text-sm"
                >
                  Tidak ada data staf.
                </td>
              </tr>
            ) : (
              filteredStaffs.map((staff: Staff) => (
                <tr
                  key={staff.id}
                  className="border-b border-border hover:bg-border/10 transition-colors group"
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
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
                      {staff.email || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap">
                    {staff.phone_number ? (
                      <Link
                        href={`https://wa.me/${staff.phone_number}`}
                        target="_blank"
                        className="text-muted hover:text-accent transition-colors"
                      >
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 hover:bg-accent/10 hover:text-accent text-xs font-bold">
                          {staff.phone_number}
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-border/20 text-xs font-bold text-muted">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap">
                    <span className="text-sm text-muted font-semibold">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(new Date(staff.join_date))}
                    </span>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap">
                    {getStatusBadge(staff.status)}
                  </td>

                  {/* AKSI DROPDOWN */}
                  <td className="px-4 py-5 whitespace-nowrap text-right">
                    <Dropdown>
                      <Dropdown.Trigger>
                        <button className="p-2 rounded-full text-muted hover:bg-border/30 hover:text-foreground transition-colors inline-flex outline-none">
                          <DotsThree weight="bold" className="w-5 h-5" />
                        </button>
                      </Dropdown.Trigger>
                      <Dropdown.Popover
                        placement="bottom end"
                        className="min-w-[160px] bg-surface rounded-2xl border border-border shadow-lg p-1 z-[99]"
                      >
                        <Dropdown.Menu aria-label="Aksi Staf">
                          <Dropdown.Section>
                            <Dropdown.Item
                              id="edit"
                              textValue="Edit Profil"
                              onPress={() => handleEditClick(staff)}
                            >
                              <div className="flex items-center gap-2">
                                <PencilSimple
                                  weight="bold"
                                  className="w-4 h-4 text-muted"
                                />
                                <Label className="font-semibold text-sm cursor-pointer">
                                  Edit Profil
                                </Label>
                              </div>
                            </Dropdown.Item>
                          </Dropdown.Section>
                          <Separator />
                          <Dropdown.Section>
                            <Dropdown.Item
                              id="delete"
                              textValue="Hapus Staf"
                              onPress={() => handleDeleteClick(staff)}
                              className="text-danger data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger"
                            >
                              <div className="flex items-center gap-2">
                                <Trash weight="bold" className="w-4 h-4" />
                                <Label className="font-semibold text-sm text-danger cursor-pointer">
                                  Hapus Data
                                </Label>
                              </div>
                            </Dropdown.Item>
                          </Dropdown.Section>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RENDER MODALS (Hanya Mount saat Terbuka/Ada Staf) */}
      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTimeout(() => setSelectedStaff(null), 300); // Clear data setelah animasi tutup
        }}
        staffData={selectedStaff}
      />

      <DeleteStaffModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTimeout(() => setSelectedStaff(null), 300); // Clear data setelah animasi tutup
        }}
        staff={selectedStaff}
      />
    </div>
  );
}
