"use client";

import {
  Modal,
  Button,
  TextField,
  Input,
  TextArea,
  Label,
  Description,
} from "@heroui/react";
import { useEffect, useState } from "react";
import { IDR } from "@/app/libs/idr";

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  initialNote?: string;
  year: number;
  month: number;
  onSave: (amount: number, note: string) => Promise<void>;
}

export default function SetTargetModal({
  isOpen,
  onClose,
  initialAmount = 0,
  initialNote = "",
  year,
  month,
  onSave,
}: SetTargetModalProps) {
  const [amount, setAmount] = useState<string>(initialAmount.toString());
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount.toString());
      setNote(initialNote);
    }
  }, [isOpen, initialAmount, initialNote]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(Number(amount), note);
      onClose();
    } catch (error) {
      console.error("Failed to save target:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleDateString("id-ID", {
    month: "long",
  });

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Set Target Omzet</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <TextField>
                <Label>Target Amount (IDR)</Label>
                <Input
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                />
                <Description>
                  {amount ? `Terformat: ${IDR(Number(amount))}` : ""}
                </Description>
              </TextField>

              <TextField>
                <Label>Catatan (Opsional)</Label>
                <TextArea
                  placeholder="Contoh: Target naik 10% karena event akhir tahun"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" slot="close">
                Batal
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                isLoading={isSaving}
                isDisabled={!amount || Number(amount) < 0}
              >
                Simpan Target
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
