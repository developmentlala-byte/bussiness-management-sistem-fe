"use client";

import { useState } from "react";
import { User, useAuthStore } from "@/app/libs/use-user";
import axiosInstance from "@/app/services/axios-instance";
import {
  Button,
  TextField,
  Label,
  InputGroup,
  FieldError,
  Spinner,
  toast,
} from "@heroui/react";
import {
  User as UserIcon,
  Envelope,
  Phone,
  MapPin,
  FloppyDisk,
} from "@phosphor-icons/react";

export default function ProfileView() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosInstance.put("/st/users/profile", formData);
      if (res.data.status) {
        updateUser(res.data.data);
        toast.success("Profil berhasil diperbarui");
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || "Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-bold text-foreground">Informasi Pribadi</h3>
        <p className="text-sm text-muted mt-1">
          Perbarui detail profil Anda untuk mempersonalisasi akun.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <TextField isRequired name="name" className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              Nama Lengkap
            </Label>
            <InputGroup>
              <InputGroup.Prefix>
                <UserIcon className="text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </InputGroup>
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="email"
            type="email"
            className="flex flex-col gap-1.5"
          >
            <Label className="text-sm font-medium text-foreground">Email</Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Envelope className="text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder="nama@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </InputGroup>
            <FieldError />
          </TextField>

          <TextField name="phone" className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              Nomor Telepon
            </Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Phone className="text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder="0812..."
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </InputGroup>
          </TextField>
        </div>

        <TextField name="address" className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-foreground">Alamat</Label>
          <InputGroup>
            <InputGroup.Prefix>
              <MapPin className="text-muted mt-1" />
            </InputGroup.Prefix>
            <InputGroup.TextArea
              placeholder="Masukkan alamat lengkap"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
            />
          </InputGroup>
        </TextField>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            className="font-bold px-8 min-w-40 bg-accent text-accent-foreground"
            isPending={loading}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <FloppyDisk weight="bold" />
                )}
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
