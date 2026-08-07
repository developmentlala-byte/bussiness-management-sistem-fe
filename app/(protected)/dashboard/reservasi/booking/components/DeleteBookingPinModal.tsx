"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  Button,
  InputOTP,
  REGEXP_ONLY_DIGITS,
  toast,
} from "@heroui/react";
import { Lock } from "@phosphor-icons/react";
import { usePost, useRemove } from "@/app/libs/use-http";

interface DeleteBookingPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number | string;
  bookingCode: string;
}

export const DeleteBookingPinModal: React.FC<DeleteBookingPinModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCode,
}) => {
  const [step, setStep] = useState<"confirm" | "pin">("confirm");
  const [pin, setPin] = useState("");

  const { mutateAsync: requestPin, isPending: isRequestingPin } = usePost(
    `/master/bookings/${bookingId}/request-delete`,
    {
      onSuccess: () => {
        setStep("pin");
        toast.success("PIN telah dikirim ke Telegram Admin");
      },
      onError: (err: any) => {
        toast.danger("Gagal meminta PIN", {
          description: err.response?.data?.message || "Terjadi kesalahan.",
        });
      },
    },
  );

  const { mutateAsync: confirmDelete, isPending: isConfirmingDelete } =
    useRemove(`/master/bookings/${bookingId}/confirm-delete`, {
      invalidate: [["bookings"]],
      onSuccess: () => {
        toast.success("Booking berhasil dihapus");
        handleClose();
      },
      onError: (err: any) => {
        toast.danger("Gagal menghapus booking", {
          description:
            err.response?.data?.message || "PIN salah atau kedaluwarsa.",
        });
        setPin("");
      },
    });

  const handleClose = () => {
    setStep("confirm");
    setPin("");
    onClose();
  };

  const handleRequestPin = async () => {
    await requestPin({});
  };

  const handleConfirmDelete = async (value?: string) => {
    const finalPin = value ?? pin;
    if (finalPin.length !== 6) {
      toast.warning("PIN harus 6 digit");
      return;
    }
    await confirmDelete({ pin: finalPin });
  };

  return (
    <AlertDialog>
      <AlertDialog.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        isDismissable={!isRequestingPin && !isConfirmingDelete}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                {step === "confirm" ? "Hapus booking ini?" : "Konfirmasi PIN"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {step === "confirm" ? (
                <p>
                  Ini akan menghapus booking <strong>{bookingCode}</strong> dan
                  datanya. Aksi ini membutuhkan verifikasi PIN Admin.
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <AlertDialog.Icon status="danger">
                    <Lock className="size-5" />
                  </AlertDialog.Icon>
                  <p className="text-center text-sm text-muted-foreground">
                    Masukkan 6 digit PIN yang dikirim ke Telegram Admin untuk
                    menghapus booking <strong>{bookingCode}</strong>.
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={setPin}
                    onComplete={(value) => handleConfirmDelete(value)}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    isDisabled={isConfirmingDelete}
                  >
                    <InputOTP.Group>
                      <InputOTP.Slot index={0} />
                      <InputOTP.Slot index={1} />
                      <InputOTP.Slot index={2} />
                    </InputOTP.Group>
                    <InputOTP.Separator />
                    <InputOTP.Group>
                      <InputOTP.Slot index={3} />
                      <InputOTP.Slot index={4} />
                      <InputOTP.Slot index={5} />
                    </InputOTP.Group>
                  </InputOTP>
                </div>
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="tertiary"
                onPress={handleClose}
                isDisabled={isRequestingPin || isConfirmingDelete}
              >
                Batal
              </Button>
              {step === "confirm" ? (
                <Button
                  variant="danger"
                  onPress={handleRequestPin}
                  isPending={isRequestingPin}
                >
                  {isRequestingPin ? "Meminta PIN..." : "Lanjut"}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onPress={() => handleConfirmDelete()}
                  isDisabled={pin.length !== 6}
                  isPending={isConfirmingDelete}
                >
                  {isConfirmingDelete ? "Menghapus..." : "Hapus Sekarang"}
                </Button>
              )}
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
