import React from "react";
import { X, Money } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@heroui/react";
import { usePost } from "@/app/libs/use-http";
import { useQueryClient } from "@tanstack/react-query";

const salarySchema = z.object({
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif"),
});

type SalaryFormValues = z.infer<typeof salarySchema>;

interface EditSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string | number | undefined;
  currentSalary: number;
}

export const EditSalaryModal: React.FC<EditSalaryModalProps> = ({
  isOpen,
  onClose,
  staffId,
  currentSalary,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      salary: currentSalary,
    },
  });

  // Reset form when currentSalary changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      reset({ salary: currentSalary });
    }
  }, [isOpen, currentSalary, reset]);

  const queryClient = useQueryClient();

  const { mutate: updateSalary, isPending } = usePost<unknown, FormData>(
    `/master/staffs/${staffId}`,
    {
      onSuccess: () => {
        toast.success("Gaji Diperbarui", {
          description: "Nilai gaji staf berhasil diperbarui.",
        });
        queryClient.invalidateQueries({ queryKey: ["staffs"] });
        onClose();
      },
      onError: (err: any) => {
        toast.danger("Gagal memperbarui gaji", {
          description: err?.response?.data?.message || "Terjadi kesalahan.",
        });
      },
    }
  );

  const onSubmit = (data: SalaryFormValues) => {
    if (!staffId) return;

    const formData = new FormData();
    formData.append("_method", "PUT");
    formData.append("salary", data.salary.toString());

    updateSalary(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface w-full max-w-sm rounded-xl shadow-xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-success/10 p-2 rounded-lg text-success">
              <Money size={20} weight="fill" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Edit Gaji Staf</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Gaji Pokok (Base Salary)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">
                Rp
              </span>
              <input
                type="number"
                {...register("salary")}
                className={`w-full bg-surface border focus:ring-1 rounded-md pl-10 pr-3 h-[42px] text-base font-semibold outline-none transition-colors ${
                  errors.salary
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
                placeholder="0"
              />
            </div>
            {errors.salary && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">
                {errors.salary.message}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Nilai ini akan menjadi dasar perhitungan total pendapatan bulanan staf.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-secondary/30 flex justify-end gap-3 shrink-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary rounded-md transition-colors border border-border"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 text-sm font-bold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm transition-all"
          >
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
