import React, { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@heroui/react";
import { usePost } from "@/app/libs/use-http";

const shiftSchema = z.object({
  name: z.string().min(1, "Nama shift wajib diisi"),
  start_time: z.tuple([z.string(), z.string()]),
  end_time: z.tuple([z.string(), z.string()]),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

interface CreateShiftModalProps {
  setIsCreateShiftOpen: () => void;
}

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  setIsCreateShiftOpen,
}) => {
  const [submitAction, setSubmitAction] = useState<"save" | "save_and_add">(
    "save",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { mutate: createShift, isPending } = usePost<unknown, any>(
    "/master/shifts",
    {
      invalidate: [["shifts"]],
      onSuccess: () => {
        toast.success("Shift ditambahkan", {
          description: "Shift baru telah berhasil disimpan.",
        });

        if (submitAction === "save") {
          setIsCreateShiftOpen();
        } else {
          // Jika pilih Simpan & Tambah Lagi
          reset({ name: "", start_time: [], end_time: [] });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.danger("Gagal menyimpan data", {
          description:
            error?.response?.data?.message || "Terjadi kesalahan server.",
        });
      },
    },
  );
  const onSubmit = (data: ShiftFormValues) => {
    // Kita bersihkan dulu harga retailnya ke number murni sebelum kirim ke backend
    const payload = {
      name: data.name,
      start_time: data.start_time.join(":"),
      end_time: data.end_time.join(":"),
    };

    createShift(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Tambah Shift
              </h2>
              <p className="text-xs text-muted mt-0.5">Tambah Shift</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateShiftOpen()}
              className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm text-foreground mb-1.5">
                  Nama shift
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full h-[38px] bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70"
                  placeholder="e.g. Long Hair"
                />
                {errors.name && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.name.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-2">
                <label className="block text-sm text-foreground mb-1.5">
                  Jam mulai
                </label>
                <input
                  type="text"
                  {...register("start_time")}
                  className="w-full h-[38px] bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70"
                  placeholder="e.g. 08:00"
                />
                {errors.start_time && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.start_time.message}
                  </span>
                )}
              </div>
              <div className="flex-2">
                <label className="block text-sm text-foreground mb-1.5">
                  Jam selesai
                </label>
                <input
                  type="text"
                  {...register("end_time")}
                  className="w-full h-[38px] bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70"
                  placeholder="e.g. 08:00"
                />
                {errors.end_time && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.end_time.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/20 rounded-b-xl shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => setIsCreateShiftOpen()}
              className="px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border hover:bg-surface-secondary rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction("save_and_add")}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground border border-border rounded-md hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && submitAction === "save_and_add"
                ? "Menyimpan..."
                : "Simpan & Tambah Lagi"}
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction("save")}
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending && submitAction === "save" ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
