// src/app/components/modal/delete-staff-modal.tsx

import React from "react";
import { X, Trash } from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRemove } from "@/app/libs/use-http";
import { Staff } from "@/app/types/staff";

interface DeleteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
}

export const DeleteStaffModal: React.FC<DeleteStaffModalProps> = ({
  isOpen,
  onClose,
  staff,
}) => {
  // Gunakan ID staff secara dinamis pada endpoint
  const { mutate: deleteStaff, isPending } = useRemove(
    staff ? `/master/staffs/${staff.id}` : "",
    {
      invalidate: [["staffs"]], // Akan me-refresh tabel secara realtime tanpa reload halaman
      onSuccess: () => {
        onClose();
        toast.success("Berhasil dihapus", {
          description: "Data staf telah dihapus secara permanen.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menghapus", {
          description:
            error?.response?.data?.message || "Terjadi kesalahan internal.",
        });
      },
    },
  );

  // Jangan render apapun jika modal ditutup atau data staff kosong
  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-xl shadow-xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Hapus Staf</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center">
            <Trash weight="fill" className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Apakah Anda yakin?
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Anda akan menghapus data staf{" "}
              <span className="font-bold text-foreground">{`"${staff.first_name} ${staff.last_name || ""}"`}</span>
              . Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors outline-none"
          >
            Batal
          </button>
          <button
            onClick={() => deleteStaff({})}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-danger text-white rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 outline-none"
          >
            {isPending ? "Menghapus..." : "Hapus Staf"}
          </button>
        </div>
      </div>
    </div>
  );
};
