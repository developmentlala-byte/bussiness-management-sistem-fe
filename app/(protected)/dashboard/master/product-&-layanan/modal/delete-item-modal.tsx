import React from "react";
import { X, Trash } from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRemove } from "@/app/libs/use-http";
import { ServiceVariant } from "../page";

interface DeleteItemModalProps {
  setIsDeleteItemOpen: (isOpen: boolean) => void;
  variant: ServiceVariant;
}

export const DeleteItemModal: React.FC<DeleteItemModalProps> = ({
  setIsDeleteItemOpen,
  variant,
}) => {
  const { mutate: deleteVariant, isPending } = useRemove(
    `/master/variants/${variant.id}`,
    {
      invalidate: [["categories"]],
      onSuccess: () => {
        setIsDeleteItemOpen(false);
        toast.success("Berhasil dihapus", {
          description: "Varian item telah dihapus secara permanen.",
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menghapus", {
          description: error?.response?.data?.message || "Gagal dihapus.",
        });
      },
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-xl shadow-xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Hapus Varian</h2>
          <button
            onClick={() => setIsDeleteItemOpen(false)}
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
              Anda akan menghapus varian{" "}
              <span className="font-bold text-foreground">{`"${variant.name}"`}</span>
              . Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl">
          <button
            onClick={() => setIsDeleteItemOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => deleteVariant({})}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "Menghapus..." : "Hapus Varian"}
          </button>
        </div>
      </div>
    </div>
  );
};
