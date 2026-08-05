"use client";

import React from "react";
import { useEditBookingForm } from "./useEditBookingForm";
import { BookingModalLayout } from "./BookingModalLayout";
import type { SpaBooking } from "@/app/types/booking";

interface EditBookingModalProps {
  isOpen: boolean;
  initialBooking: SpaBooking;
  onSaved?: () => void;
}

export default function EditBookingModal({ isOpen, initialBooking, onSaved }: EditBookingModalProps) {
  const form = useEditBookingForm({ isOpen, initialBooking, onSaved });

  if (form.variantsLoading && !form.availableVariants.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[#B5AFA9]">Loading...</p>
      </div>
    );
  }

  return <BookingModalLayout {...form} isEdit={true} />;
}
