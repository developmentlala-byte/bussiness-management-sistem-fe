import React from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import { toast } from "@heroui/react";
import { useRemove } from "@/app/libs/use-http";
import { BundlePromo } from "../types";

export function DeleteBundleModal({
  bundle,
  onClose,
  onDeleted,
}: {
  bundle: BundlePromo;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { mutate, isPending } = useRemove(`/master/bundle-promo/${bundle.id}`, {
    invalidate: [["bundle-promo"]],
    onSuccess: () => {
      toast.success("Bundle promo dihapus");
      onDeleted?.();
      onClose();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.danger("Gagal", { description: err?.response?.data?.message });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-xl border border-border p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <WarningCircle className="w-6 h-6 text-danger" weight="fill" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">
              Hapus Bundle Promo?
            </h3>
            <p className="text-sm text-muted mt-1">
              Bundle <strong>{bundle.name}</strong> beserta diskon terkait akan
              dihapus.
            </p>
          </div>
          <button onClick={onClose} className="text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-md"
          >
            Batal
          </button>
          <button
            onClick={() => mutate({})}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold bg-danger text-white rounded-md disabled:opacity-50"
          >
            {isPending ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
