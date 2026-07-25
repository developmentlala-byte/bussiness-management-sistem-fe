"use client";

import React, { useState } from "react";
import {
  Plus,
  PencilSimple,
  Trash,
  Clock,
  DotsThreeVertical,
  Check,
  X,
  PlusCircle,
} from "@phosphor-icons/react";
import { useApiFetch, usePost, usePut, useRemove } from "@/app/libs/use-http";
import {
  Spinner,
  toast,
  Dropdown,
  Button,
  Avatar,
  Modal,
} from "@heroui/react";

interface ShiftSlot {
  id: number;
  bms_ms_shift_id: number;
  slot_time: string;
  is_active: boolean;
}

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  color_code: string;
  is_active: boolean;
  shift_slots?: ShiftSlot[];
}

export default function MasterShiftView() {
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);

  // Fetch shifts with slots
  const { data: shiftsResponse, isLoading: isShiftsLoading } = useApiFetch<{ data: Shift[] }>(
    ["master-shifts"],
    "/master/shifts",
    { include: "shiftSlots" }
  );
  const shifts = shiftsResponse?.data || [];

  // Mutation: Create/Update Shift
  const { mutate: saveShift, isPending: isSavingShift } = usePost<unknown, any>(
    "/master/shifts",
    {
      invalidate: [["master-shifts"]],
      onSuccess: () => {
        toast.success(editingShift ? "Shift diperbarui" : "Shift ditambahkan");
        setIsShiftModalOpen(false);
        setEditingShift(null);
      },
    }
  );

  const { mutate: updateShift } = usePut<unknown, any>(
    (data) => `/master/shifts/${data.id}`,
    {
      invalidate: [["master-shifts"]],
      onSuccess: () => {
        toast.success("Shift diperbarui");
        setIsShiftModalOpen(false);
        setEditingShift(null);
      },
    }
  );

  // Mutation: Delete Shift
  const { mutate: deleteShift } = useRemove<unknown, { id: number }>(
    (data) => `/master/shifts/${data.id}`,
    {
      invalidate: [["master-shifts"]],
      onSuccess: () => {
        toast.success("Shift dihapus");
      },
    }
  );

  // Mutation: Create/Update Slot
  const { mutate: saveSlot, isPending: isSavingSlot } = usePost<unknown, any>(
    "/master/shift-slots",
    {
      invalidate: [["master-shifts"]],
      onSuccess: () => {
        toast.success("Slot ditambahkan");
        setIsSlotModalOpen(false);
      },
    }
  );

  const { mutate: deleteSlot } = useRemove<unknown, { id: number }>(
    (data) => `/master/shift-slots/${data.id}`,
    {
      invalidate: [["master-shifts"]],
      onSuccess: () => {
        toast.success("Slot dihapus");
      },
    }
  );

  const handleOpenShiftModal = (shift?: Shift) => {
    setEditingShift(shift || null);
    setIsShiftModalOpen(true);
  };

  const handleOpenSlotModal = (shiftId: number) => {
    setActiveShiftId(shiftId);
    setIsSlotModalOpen(true);
  };

  const handleDeleteShift = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus shift ini? Semua slot terkait juga akan dihapus.")) {
      deleteShift({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Clock weight="bold" className="text-accent" />
          Daftar Master Shift
        </h2>
        <Button
          onPress={() => handleOpenShiftModal()}
          className="bg-accent text-accent-foreground font-semibold rounded-xl"
          startContent={<Plus weight="bold" />}
        >
          Tambah Shift
        </Button>
      </div>

      {isShiftsLoading ? (
        <div className="flex justify-center py-20">
          <Spinner color="warning" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl">
          <Clock size={48} className="mx-auto text-muted/30 mb-4" />
          <p className="text-muted font-medium">Belum ada data shift.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-surface border border-border/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div
                className="absolute top-0 left-0 w-2 h-full"
                style={{ backgroundColor: shift.color_code || "var(--accent)" }}
              />

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{shift.name}</h3>
                  <p className="text-sm text-muted font-medium mt-1">
                    {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenShiftModal(shift)}
                    className="p-2 rounded-xl hover:bg-surface-secondary text-muted hover:text-accent transition-colors"
                  >
                    <PencilSimple weight="bold" size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    className="p-2 rounded-xl hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                  >
                    <Trash weight="bold" size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                    Slot Booking ({shift.shift_slots?.length || 0})
                  </span>
                  <button
                    onClick={() => handleOpenSlotModal(shift.id)}
                    className="text-accent hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <PlusCircle weight="bold" />
                    Tambah Slot
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shift.shift_slots?.length ? (
                    shift.shift_slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="group/slot relative bg-surface-secondary/50 border border-border/40 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-foreground"
                      >
                        {slot.slot_time.substring(0, 5)}
                        <button
                          onClick={() => deleteSlot({ id: slot.id })}
                          className="opacity-0 group-hover/slot:opacity-100 transition-opacity text-danger hover:scale-110"
                        >
                          <X weight="bold" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted/60 italic">Belum ada slot booking.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHIFT MODAL */}
      {isShiftModalOpen && (
        <ShiftFormModal
          shift={editingShift}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={(data) => {
            if (editingShift) {
              updateShift({ id: editingShift.id, ...data });
            } else {
              saveShift(data);
            }
          }}
          isPending={isSavingShift}
        />
      )}

      {/* SLOT MODAL */}
      {isSlotModalOpen && activeShiftId && (
        <SlotFormModal
          shiftId={activeShiftId}
          onClose={() => setIsSlotModalOpen(false)}
          onSave={(data) => saveSlot(data)}
          isPending={isSavingSlot}
        />
      )}
    </div>
  );
}

function ShiftFormModal({
  shift,
  onClose,
  onSave,
  isPending,
}: {
  shift: Shift | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(shift?.name || "");
  const [startTime, setStartTime] = useState(shift?.start_time.substring(0, 5) || "");
  const [endTime, setEndTime] = useState(shift?.end_time.substring(0, 5) || "");
  const [colorCode, setColorCode] = useState(shift?.color_code || "#B26632");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, start_time: startTime, end_time: endTime, color_code: colorCode });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-[2rem] shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-foreground">
              {shift ? "Edit Shift" : "Tambah Shift Baru"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted transition-colors"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                Nama Shift
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Pagi, Siang, Full"
                className="w-full bg-surface-secondary/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Jam Mulai
                </label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface-secondary/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Jam Selesai
                </label>
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-surface-secondary/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                Warna Identitas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-border bg-transparent cursor-pointer overflow-hidden"
                />
                <span className="text-sm font-mono text-muted">{colorCode}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onPress={onClose}
              className="flex-1 bg-surface-secondary text-foreground font-semibold rounded-2xl h-12"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              className="flex-1 bg-accent text-accent-foreground font-bold rounded-2xl h-12 shadow-lg shadow-accent/20"
            >
              {shift ? "Simpan Perubahan" : "Buat Shift"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SlotFormModal({
  shiftId,
  onClose,
  onSave,
  isPending,
}: {
  shiftId: number;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [slotTime, setSlotTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ bms_ms_shift_id: shiftId, slot_time: slotTime });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-xs rounded-[2rem] shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground">Tambah Slot</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted transition-colors"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Jam Slot
            </label>
            <input
              required
              autoFocus
              type="time"
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
              className="w-full bg-surface-secondary/50 border border-border rounded-2xl px-4 py-3 text-lg font-bold text-center focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onPress={onClose}
              className="flex-1 bg-surface-secondary text-foreground font-semibold rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              className="flex-1 bg-accent text-accent-foreground font-bold rounded-xl"
            >
              Tambah
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
