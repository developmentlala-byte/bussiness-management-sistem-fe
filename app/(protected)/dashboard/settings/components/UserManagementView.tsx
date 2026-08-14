"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/services/axios-instance";
import {
  Button,
  Table,
  Avatar,
  Chip,
  Modal,
  useOverlayState,
  ListBox,
  Input,
  Spinner,
  toast,
  TextField,
  Label,
  TextArea,
  FieldError,
} from "@heroui/react";
import {
  Shield,
  PencilSimple,
  FloppyDisk,
  Plus,
  Trash,
  Phone,
  MapPin,
} from "@phosphor-icons/react";

interface Role {
  id: number;
  name: string;
}

interface AppUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  roles: Role[];
}

export default function UserManagementView() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // SATU state buat modal edit/tambah, SATU state buat modal delete.
  // Pakai prop `state` di root <Modal>, jadi gak butuh trigger button
  // apapun di dalam Modal — open()/close() bisa dipanggil dari luar
  // (tombol Edit/Hapus di tabel) dan Modal-nya otomatis nyambung.
  const userModal = useOverlayState();
  const deleteModal = useOverlayState();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role_ids: new Set<string>(),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axiosInstance.get("/st/users"),
        axiosInstance.get("/st/roles"),
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (error) {
      toast.danger("Gagal mengambil data user/role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddUser = () => {
    setSelectedUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      role_ids: new Set(),
    });
    userModal.open();
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      role_ids: new Set(user.roles.map((r) => r.id.toString())),
    });
    userModal.open();
  };

  const handleDeleteClick = (user: AppUser) => {
    setSelectedUser(user);
    deleteModal.open();
  };

  const handleSaveUser = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        role_ids: Array.from(formData.role_ids).map(Number),
      };

      let res;
      if (selectedUser) {
        res = await axiosInstance.put(`/st/users/${selectedUser.id}`, payload);
      } else {
        res = await axiosInstance.post("/st/users", payload);
      }

      if (res.data.status) {
        toast.success(
          selectedUser ? "User berhasil diperbarui" : "User berhasil dibuat",
        );
        fetchData();
        userModal.close();
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await axiosInstance.delete(`/st/users/${selectedUser.id}`);
      if (res.data.status) {
        toast.success("User berhasil dihapus");
        fetchData();
        deleteModal.close();
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || "Gagal menghapus user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Manajemen User & Role
          </h3>
          <p className="text-sm text-muted mt-1">
            Kelola akses pengguna dan atur peran mereka dalam sistem.
          </p>
        </div>
        <Button
          variant="primary"
          onPress={handleOpenAddUser}
          className="bg-accent text-accent-foreground font-bold rounded-xl"
        >
          <Plus weight="bold" />
          Tambah User
        </Button>
      </div>

      <div className="overflow-hidden border border-border rounded-2xl">
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="User Management Table"
              className="min-w-full"
            >
              <Table.Header>
                {/* isRowHeader WAJIB di salah satu kolom, kalau gak ada
                    Table bakal throw error terus (itu penyebab modal
                    kemarin ga kebuka — komponennya crash-loop) */}
                <Table.Column id="user" isRowHeader>
                  PENGGUNA
                </Table.Column>
                <Table.Column id="contact">KONTAK</Table.Column>
                <Table.Column id="role">ROLE</Table.Column>
                <Table.Column id="action" className="text-right">
                  AKSI
                </Table.Column>
              </Table.Header>
              <Table.Body
                items={users}
                renderEmptyState={() =>
                  loading ? "Memuat data..." : "Tidak ada user ditemukan"
                }
              >
                {(user) => (
                  <Table.Row
                    id={user.id}
                    className="border-b border-separator last:border-0"
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <Avatar.Image
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                            alt={user.name}
                          />
                          <Avatar.Fallback>
                            {user.name.charAt(0)}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-muted">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium">
                          <Phone
                            size={12}
                            weight="bold"
                            className="text-muted"
                          />
                          {user.phone || "-"}
                        </div>
                        {user.address && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted">
                            <MapPin size={11} weight="bold" />
                            <span className="truncate max-w-[150px]">
                              {user.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Chip
                            key={role.id}
                            size="sm"
                            className="bg-accent/10 text-accent font-semibold"
                          >
                            <Shield size={12} weight="fill" className="mr-1" />
                            {role.name}
                          </Chip>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-xs text-muted italic">
                            No role assigned
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => handleEditUser(user)}
                          className="text-muted hover:text-accent rounded-lg"
                        >
                          <PencilSimple size={18} weight="bold" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => handleDeleteClick(user)}
                          className="text-muted hover:text-danger rounded-lg"
                        >
                          <Trash size={18} weight="bold" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {/*
        Modal Add/Edit User.
        Pakai state={userModal} di root Modal → gak butuh Button/Trigger
        anak di dalam Modal ini sama sekali, karena open()/close() sudah
        dipanggil manual dari handleEditUser/handleOpenAddUser di luar.
        isOpen/onOpenChange TIDAK perlu ditulis manual lagi karena
        sudah otomatis nyambung lewat prop `state`.
      */}
      <Modal state={userModal}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="border border-border bg-surface w-full">
              <Modal.CloseTrigger />
              <Modal.Header className="border-b border-separator flex flex-col gap-1 items-start">
                <Modal.Heading className="text-lg font-bold">
                  {selectedUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </Modal.Heading>
                <p className="text-xs text-muted font-normal">
                  Isi detail informasi pengguna di bawah ini.
                </p>
              </Modal.Header>
              <Modal.Body className="py-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <TextField name="name" isRequired>
                    <Label>Nama Lengkap</Label>
                    <Input
                      placeholder="John Doe"
                      className="rounded-xl"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                    <FieldError />
                  </TextField>

                  {/* Email */}
                  <TextField name="email" isRequired type="email">
                    <Label>Email</Label>
                    <Input
                      placeholder="john@example.com"
                      className="rounded-xl"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                    <FieldError />
                  </TextField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Password */}
                  <TextField
                    name="password"
                    isRequired={!selectedUser}
                    type="password"
                  >
                    <Label>
                      {selectedUser
                        ? "Password (Kosongkan jika tidak diubah)"
                        : "Password"}
                    </Label>
                    <Input
                      placeholder="••••••••"
                      className="rounded-xl"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <FieldError />
                  </TextField>

                  {/* Phone */}
                  <TextField name="phone">
                    <Label>Nomor Telepon</Label>
                    <Input
                      placeholder="0812..."
                      className="rounded-xl"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                    <FieldError />
                  </TextField>
                </div>
                <TextField name="address">
                  <Label>Alamat</Label>
                  <TextArea
                    placeholder="Jl. Raya..."
                    className="rounded-xl"
                    rows={2}
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                  <FieldError />
                </TextField>

                <div className="flex flex-col gap-2">
                  <Label>Role Akses</Label>
                  <ListBox
                    aria-label="Pilih Role"
                    selectionMode="multiple"
                    selectedKeys={formData.role_ids}
                    onSelectionChange={(keys) =>
                      setFormData({
                        ...formData,
                        role_ids: keys as Set<string>,
                      })
                    }
                    className="border border-border rounded-xl p-2 max-h-[200px] overflow-y-auto"
                  >
                    {roles.map((role) => (
                      <ListBox.Item
                        key={role.id}
                        id={role.id.toString()}
                        textValue={role.name}
                      >
                        <div className="flex items-center gap-2">
                          <Shield
                            size={16}
                            weight="fill"
                            className="text-accent"
                          />
                          <span>{role.name}</span>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </div>
              </Modal.Body>
              <Modal.Footer className="border-t border-separator">
                <Button
                  variant="ghost"
                  onPress={() => userModal.close()}
                  className="font-semibold rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSaveUser}
                  isPending={submitting}
                  className="bg-accent text-accent-foreground font-bold rounded-xl"
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner size="sm" color="current" />
                      ) : (
                        <FloppyDisk weight="bold" />
                      )}
                      {selectedUser ? "Simpan Perubahan" : "Buat User"}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Modal Delete Confirmation — sama, pakai state={deleteModal} */}
      <Modal state={deleteModal}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="border border-border bg-surface">
              <Modal.CloseTrigger />
              <Modal.Header className="border-b border-separator">
                <Modal.Heading className="text-lg font-bold text-danger">
                  Hapus Pengguna
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="py-6">
                <p>
                  Apakah Anda yakin ingin menghapus user{" "}
                  <b>{selectedUser?.name}</b>? Tindakan ini tidak dapat
                  dibatalkan.
                </p>
              </Modal.Body>
              <Modal.Footer className="border-t border-separator">
                <Button
                  variant="ghost"
                  onPress={() => deleteModal.close()}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onPress={handleConfirmDelete}
                  isPending={submitting}
                  className="bg-danger text-white font-bold rounded-xl"
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner size="sm" color="current" />}
                      Ya, Hapus
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
