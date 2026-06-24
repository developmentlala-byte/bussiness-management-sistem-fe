import React from "react";
import { X, Trash } from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRemove } from "@/app/libs/use-http";
import { Service } from "@/app/types/product-&-layanan"; // Sesuaikan path

interface DeleteServiceModalProps {
  setIsDeleteServiceOpen: (isOpen: boolean) => void;
  service: Service;
}

export const DeleteServiceModal: React.FC<DeleteServiceModalProps> = ({
  setIsDeleteServiceOpen,
  service,
}) => {
  const { mutate: deleteService, isPending } = useRemove(
    `/master/services/${service.id}`,
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsDeleteServiceOpen(false);
        toast.success("Berhasil dihapus", {
          description: "Layanan telah dihapus secara permanen.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menghapus", {
          description:
            error?.response?.data?.message ||
            "Layanan tidak dapat dihapus saat ini.",
        });
      },
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-xl shadow-xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Hapus Layanan</h2>
          <button
            onClick={() => setIsDeleteServiceOpen(false)}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center">
            <Trash className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Apakah Anda yakin?
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Anda akan menghapus layanan{" "}
              <span className="font-bold text-foreground">{`"${service.name}"`}</span>{" "}
              beserta seluruh variannya secara permanen. Tindakan ini tidak
              dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            onClick={() => setIsDeleteServiceOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => deleteService({})}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Menghapus..." : "Hapus Layanan"}
          </button>
        </div>
      </div>
    </div>
  );
};
