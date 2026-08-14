"use client";

import { useState } from "react";
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
import { Key, Lock, Eye, EyeSlash, FloppyDisk } from "@phosphor-icons/react";

export default function SecurityView() {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.password_confirmation) {
      toast.danger("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.put("/st/users/password", formData);
      if (res.data.status) {
        toast.success("Password berhasil diperbarui");
        setFormData({
          current_password: "",
          password: "",
          password_confirmation: "",
        });
      }
    } catch (error: any) {
      toast.danger(
        error.response?.data?.message || "Gagal memperbarui password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-bold text-foreground">Keamanan Akun</h3>
        <p className="text-sm text-muted mt-1">
          Kelola kata sandi Anda untuk memastikan keamanan akun.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        <TextField
          isRequired
          name="current_password"
          className="flex flex-col gap-1.5"
        >
          <Label className="text-sm font-medium text-foreground">
            Password Saat Ini
          </Label>
          <InputGroup>
            <InputGroup.Prefix>
              <Lock className="text-muted" />
            </InputGroup.Prefix>
            <InputGroup.Input
              type={isVisible ? "text" : "password"}
              placeholder="••••••••"
              value={formData.current_password}
              onChange={(e) =>
                setFormData({ ...formData, current_password: e.target.value })
              }
            />
            <InputGroup.Suffix>
              <button
                type="button"
                className="focus:outline-none"
                onClick={toggleVisibility}
              >
                {isVisible ? (
                  <EyeSlash className="text-muted" />
                ) : (
                  <Eye className="text-muted" />
                )}
              </button>
            </InputGroup.Suffix>
          </InputGroup>
          <FieldError />
        </TextField>

        <div className="space-y-6 pt-4 border-t border-separator">
          <TextField isRequired name="password" className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              Password Baru
            </Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Key className="text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                type={isVisible ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </InputGroup>
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="password_confirmation"
            className="flex flex-col gap-1.5"
          >
            <Label className="text-sm font-medium text-foreground">
              Konfirmasi Password Baru
            </Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Key className="text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                type={isVisible ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password_confirmation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password_confirmation: e.target.value,
                  })
                }
              />
            </InputGroup>
            <FieldError />
          </TextField>
        </div>

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
                Update Password
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}