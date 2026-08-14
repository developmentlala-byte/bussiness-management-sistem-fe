"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/services/axios-instance";
import {
  Button,
  Table,
  Modal,
  useOverlayState,
  TextField,
  Label,
  Input,
  TextArea,
  FieldError,
  Tooltip,
  toast,
  Spinner,
} from "@heroui/react";
import {
  Shield,
  PencilSimple,
  FloppyDisk,
  Plus,
  Trash,
} from "@phosphor-icons/react";

interface Role {
  id: number;
  name: string;
  description?: string;
}

export default function RoleManagementView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const roleModalState = useOverlayState();
  const deleteModalState = useOverlayState();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/st/roles");
      setRoles(res.data.data);
    } catch (error) {
      toast.danger("Gagal mengambil data role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddRole = () => {
    setSelectedRole(null);
    setFormData({ name: "", description: "" });
    roleModalState.open();
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    roleModalState.open();
  };

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    deleteModalState.open();
  };

  const handleSaveRole = async () => {
    setSubmitting(true);
    try {
      let res;
      if (selectedRole) {
        res = await axiosInstance.put(`/st/roles/${selectedRole.id}`, formData);
      } else {
        res = await axiosInstance.post("/st/roles", formData);
      }

      if (res.data.status) {
        toast.success(
          selectedRole ? "Role berhasil diperbarui" : "Role berhasil dibuat",
        );
        fetchData();
        roleModalState.close();
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const res = await axiosInstance.delete(`/st/roles/${selectedRole.id}`);
      if (res.data.status) {
        toast.success("Role berhasil dihapus");
        fetchData();
        deleteModalState.close();
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || "Gagal menghapus role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Daftar Role & Hak Akses
          </h3>
          <p className="text-sm text-muted mt-1">
            Definisikan peran dan batasan akses untuk pengguna sistem.
          </p>
        </div>
        <Button
          variant="primary"
          className="bg-accent text-accent-foreground font-bold rounded-xl"
          onPress={handleOpenAddRole}
        >
          <Plus weight="bold" />
          Tambah Role
        </Button>
      </div>

      <div className="overflow-hidden border border-border rounded-2xl">
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Role Management Table"
              className="min-w-full"
            >
              <Table.Header>
                <Table.Column id="name" isRowHeader>
                  NAMA ROLE
                </Table.Column>
                <Table.Column id="description">DESKRIPSI</Table.Column>
                <Table.Column id="action" className="text-right">
                  AKSI
                </Table.Column>
              </Table.Header>
              <Table.Body
                items={roles}
                renderEmptyState={() =>
                  loading ? "Memuat data..." : "Tidak ada role ditemukan"
                }
              >
                {(role) => (
                  <Table.Row
                    id={role.id}
                    className="border-b border-separator last:border-0"
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <Shield
                          size={20}
                          weight="fill"
                          className="text-accent"
                        />
                        <span className="font-bold">{role.name}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-muted">
                        {role.description || "-"}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip delay={0}>
                          <Tooltip.Trigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onPress={() => handleEditRole(role)}
                              className="text-muted hover:text-accent rounded-lg"
                            >
                              <PencilSimple size={18} weight="bold" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            <p>Edit Role</p>
                          </Tooltip.Content>
                        </Tooltip>

                        <Tooltip delay={0}>
                          <Tooltip.Trigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onPress={() => handleDeleteClick(role)}
                              className="text-muted hover:text-danger rounded-lg"
                            >
                              <Trash size={18} weight="bold" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            <p>Hapus Role</p>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {/* Modal Add/Edit Role */}
      <Modal state={roleModalState}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="border border-border bg-surface">
              <Modal.CloseTrigger />
              <Modal.Header className="border-b border-separator flex flex-col gap-1 items-start">
                <Modal.Heading className="text-lg font-bold">
                  {selectedRole ? "Edit Role" : "Tambah Role Baru"}
                </Modal.Heading>
                <p className="text-xs text-muted font-normal">
                  Tentukan nama dan deskripsi untuk peran ini.
                </p>
              </Modal.Header>
              <Modal.Body className="py-6 space-y-4">
                <TextField name="name" isRequired>
                  <Label>Nama Role</Label>
                  <Input
                    placeholder="Contoh: Supervisor"
                    className="rounded-xl"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                  <FieldError />
                </TextField>

                <TextField name="description">
                  <Label>Deskripsi</Label>
                  <TextArea
                    placeholder="Jelaskan tanggung jawab role ini..."
                    className="rounded-xl"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                  <FieldError />
                </TextField>
              </Modal.Body>
              <Modal.Footer className="border-t border-separator">
                <Button
                  variant="ghost"
                  onPress={() => roleModalState.close()}
                  className="font-semibold rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSaveRole}
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
                      {selectedRole ? "Simpan Perubahan" : "Buat Role"}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Modal Delete Confirmation */}
      <Modal state={deleteModalState}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="border border-border bg-surface">
              <Modal.CloseTrigger />
              <Modal.Header className="flex flex-col gap-1 items-start">
                <Modal.Heading className="text-lg font-bold text-danger">
                  Hapus Role
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="py-6">
                <p>
                  Apakah Anda yakin ingin menghapus role{" "}
                  <b>{selectedRole?.name}</b>? Pastikan tidak ada user yang
                  menggunakan role ini.
                </p>
              </Modal.Body>
              <Modal.Footer className="border-t border-separator">
                <Button
                  variant="ghost"
                  onPress={() => deleteModalState.close()}
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
