import React from "react";
import { X, Trash } from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRemove } from "@/app/libs/use-http";
import { MembershipPackage } from "../types";

interface DeleteMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  membership: MembershipPackage;
  onDeleted: () => void;
}

export function DeleteMembershipModal({
  isOpen,
  onClose,
  membership,
  onDeleted,
}: DeleteMembershipModalProps) {
  const { mutate: deleteMembership, isPending } = useRemove(
    `/master/membership-packages/${membership.id}`,
    {
      invalidate: [["membership-packages"]],
      onSuccess: () => {
        toast.success("Paket membership berhasil dihapus");
        onDeleted();
        onClose();
      },
      onError: (err: any) => {
        toast.danger("Gagal menghapus paket", {
          description: err?.response?.data?.message,
        });
      },
    },
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-xl shadow-xl border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trash className="w-5 h-5 text-danger" />
            Hapus Paket Membership
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <p className="text-muted">
            Apakah Anda yakin ingin menghapus paket membership{" "}
            <span className="font-semibold text-foreground">
              {membership.name}
            </span>
            ?
          </p>
          <p className="text-xs text-muted">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => deleteMembership()}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold bg-danger text-danger-foreground rounded-md disabled:opacity-50"
          >
            {isPending ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
