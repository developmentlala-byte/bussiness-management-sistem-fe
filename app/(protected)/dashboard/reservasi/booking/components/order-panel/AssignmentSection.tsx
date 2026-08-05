"use client";

import React from "react";
import { Dropdown, Label } from "@heroui/react";
import { WarningIcon, CaretDownIcon } from "@phosphor-icons/react";
import type {
  AvailableTherapist,
  BookingResourceAssignment,
  AvailableSlot,
} from "@/app/types/booking";
import type {
  FormState,
  Resource,
  LocalStaffAssignment,
  ExistingTherapist,
  Variant,
} from "../booking.types";

interface AssignmentSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  selectedServiceVariantUnits: Array<{
    key: string;
    variantId: number;
    unitIndex: number;
    groupId: string;
  }>;
  availableVariants: Variant[];
  availableSlots: AvailableSlot[] | null;
  availableResources: Resource[];
  existingTherapists: ExistingTherapist[];
  unitTimes: Map<string, { startTime: string; endTime: string; duration: number }>;
  therapistAssignmentByKey: Map<string, { id: number; name: string }>;
  resourceAssignmentByKey: Map<string, { id: number; name: string }>;
  availableTherapistsForSlot: AvailableTherapist[];
  staffAssignmentConflicts: string[];
  variantTherapistCountErrors: Array<{
    variantId: number;
    variantName: string;
    requiredCount: number;
    selectedUniqueCount: number;
  }>;
}

export function AssignmentSection({
  form,
  setForm,
  selectedServiceVariantUnits,
  availableVariants,
  availableSlots,
  availableResources,
  existingTherapists,
  unitTimes,
  therapistAssignmentByKey,
  resourceAssignmentByKey,
  availableTherapistsForSlot,
  staffAssignmentConflicts,
  variantTherapistCountErrors,
}: AssignmentSectionProps) {
  const handleTherapistChange = (assignmentKey: string, therapistId: number) => {
    setForm((prev) => ({
      ...prev,
      staffAssignments: prev.staffAssignments.map((a) =>
        a.client_key === assignmentKey ? { ...a, staff_id: therapistId } : a,
      ),
    }));
  };

  const handleResourceChange = (assignmentKey: string, resourceId: number) => {
    setForm((prev) => {
      const exists = prev.resourceAssignments.some(
        (a) => a.client_key === assignmentKey,
      );

      if (!exists) {
        const variantId = Number(assignmentKey.split(":")[1]);
        return {
          ...prev,
          resourceAssignments: [
            ...prev.resourceAssignments,
            {
              client_key: assignmentKey,
              resource_id: resourceId,
              service_variant_id: variantId,
              start_time: null,
              end_time: null,
            },
          ],
        };
      }

      return {
        ...prev,
        resourceAssignments: prev.resourceAssignments.map((a) =>
          a.client_key === assignmentKey
            ? { ...a, resource_id: resourceId }
            : a,
        ),
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EDE8E3] p-2 ">
        <p className="text-[11px] font-bold text-[#B5AFA9] uppercase tracking-[0.06em] ms-2 mb-4 mt-2">
          Penugasan Terapis & Ruangan
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedServiceVariantUnits.map((unit) => {
            const variant = availableVariants.find((v) => v.id === unit.variantId);
            const times = unitTimes.get(unit.key);
            const therapist = therapistAssignmentByKey.get(unit.key);
            const resource = resourceAssignmentByKey.get(unit.key);

            const slot = availableSlots?.find((s) => s.slot_time === form.slotTime);
            const resourceOptions =
              slot?.available_resources_by_variant?.[unit.variantId] ?? [];

            return (
              <div
                key={unit.key}
                className="rounded-2xl border border-[#EDE8E3] bg-white p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#B55368] uppercase tracking-[0.06em]">
                    Layanan #{unit.unitIndex}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#FBEAF0] text-[11px] font-bold text-[#993556]">
                    {times?.startTime} – {times?.endTime}
                  </span>
                </div>

                <p className="text-[14px] font-bold text-[#1A1614] mb-3">
                  {variant?.name}
                </p>

                <div className="space-y-2">
                  {/* Terapis */}
                  <Dropdown>
                    <Dropdown.Trigger className="w-full">
                      <button
                        aria-label="Pilih terapis"
                        className="flex items-center justify-between rounded-[10px] border border-[#EDE8E3] bg-[#F8F4F0] px-3 py-2 text-[13px] text-[#1A1614] cursor-pointer hover:border-[#E8B4C0] transition-colors w-full"
                      >
                        <span className="truncate">
                          {therapist?.name ?? "Pilih Terapis"}
                        </span>
                        <CaretDownIcon
                          size={14}
                          weight="bold"
                          className="shrink-0 hidden text-[#B5AFA9]"
                        />
                      </button>
                    </Dropdown.Trigger>
                    <Dropdown.Popover className="rounded-xl border border-[#EDE8E3] bg-white p-1.5 shadow-lg">
                      <Dropdown.Menu
                        aria-label="Pilih Terapis"
                        onAction={(key) => handleTherapistChange(unit.key, Number(key))}
                        className="max-h-[260px] overflow-y-auto"
                      >
                        {availableTherapistsForSlot.map((t) => (
                          <Dropdown.Item
                            key={t.id}
                            id={t.id}
                            textValue={t.name}
                            className="rounded-lg px-2.5 py-2 text-[13px] text-[#1A1614] data-[hovered=true]:bg-[#FEF1F4] data-[hovered=true]:text-[#B55368] data-[focus-visible=true]:bg-[#FEF1F4]"
                          >
                            <Label>{t.name}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>

                  {/* Ruangan */}
                  {resourceOptions.length > 0 ? (
                    <Dropdown>
                      <Dropdown.Trigger className="w-full">
                        <button
                          aria-label="Pilih ruangan"
                          className="w-full flex items-center justify-between rounded-[10px] border border-[#EDE8E3] bg-[#F8F4F0] px-3 py-2 text-[13px] text-[#1A1614] cursor-pointer hover:border-[#E8B4C0] transition-colors"
                        >
                          <span className="truncate">
                            {resource?.name ?? "Pilih Ruangan"}
                          </span>
                          <CaretDownIcon
                            size={14}
                            weight="bold"
                            className="shrink-0 hidden text-[#B5AFA9]"
                          />
                        </button>
                      </Dropdown.Trigger>
                      <Dropdown.Popover className="rounded-xl border border-[#EDE8E3] bg-white p-1.5 shadow-lg">
                        <Dropdown.Menu
                          aria-label="Pilih Ruangan"
                          onAction={(key) => handleResourceChange(unit.key, Number(key))}
                          className="max-h-[260px] overflow-y-auto"
                        >
                          {resourceOptions.map((resId) => {
                            const res = availableResources.find((r) => r.id === resId);
                            const label = res
                              ? `${res.resource_code} (${res.room_name})`
                              : `Resource #${resId}`;
                            return (
                              <Dropdown.Item
                                key={resId}
                                id={resId}
                                textValue={label}
                                className="rounded-lg px-2.5 py-2 text-[13px] text-[#1A1614] data-[hovered=true]:bg-[#FEF1F4] data-[hovered=true]:text-[#B55368] data-[focus-visible=true]:bg-[#FEF1F4]"
                              >
                                <Label>{label}</Label>
                              </Dropdown.Item>
                            );
                          })}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  ) : (
                    <div className="h-11 px-3.5 rounded-xl bg-[#F3F0ED] flex items-center text-[13px] text-[#B5AFA9]">
                      Ruangan N/A
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(staffAssignmentConflicts.length > 0 ||
          variantTherapistCountErrors.length > 0) && (
          <div className="mt-4 p-3 bg-[#FFF5F5] rounded-xl border border-[#FEE2E2] space-y-2">
            <div className="flex items-center gap-2 text-[#E11D48]">
              <WarningIcon size={16} weight="fill" />
              <p className="text-[12px] font-bold uppercase tracking-wider">
                Perlu Perhatian
              </p>
            </div>
            {staffAssignmentConflicts.map((c, i) => (
              <p key={i} className="text-[11px] text-[#B91C1C] leading-relaxed">
                • {c}
              </p>
            ))}
            {variantTherapistCountErrors.map((err, i) => (
              <p key={i} className="text-[11px] text-[#B91C1C] leading-relaxed">
                • <b>{err.variantName}</b>: Butuh {err.requiredCount} terapis
                unik (saat ini {err.selectedUniqueCount})
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}