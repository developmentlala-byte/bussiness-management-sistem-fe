"use client";

import type { Key } from "@heroui/react";
import {
  Autocomplete,
  Avatar,
  AvatarFallback,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import { Staff } from "@/app/types/staff";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/app/services/api";

interface StaffFilterDropdownProps {
  selectedStaffIds: number[];
  onSelectStaff: (staffIds: number[]) => void;
  className?: string;
}

export default function StaffFilterDropdown({
  selectedStaffIds,
  onSelectStaff,
  className,
}: StaffFilterDropdownProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const { data: staffResponse, isLoading } = useQuery({
    queryKey: ["staffs"],
    queryFn: async () => {
      const response = await apiGet("/master/staffs");
      return response as {
        data: Staff[];
        meta: { current_page: number; last_page: number; per_page: number; total: number };
      };
    },
    staleTime: 300000, // 5 minutes
  });

  const staffs = staffResponse?.data ?? [];

  const selectedKeys: Key[] = selectedStaffIds;

  const handleChange = (keys: Key | Key[] | null) => {
    const arr = Array.isArray(keys) ? keys : keys ? [keys] : [];
    onSelectStaff(arr.map((k) => Number(k)));
  };

  const initials = (staff: Staff) =>
    `${staff.first_name?.[0] ?? ""}${staff.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  const fullName = (staff: Staff) =>
    [staff.first_name, staff.last_name].filter(Boolean).join(" ");

  const onRemoveTags = (keys: Set<Key>) => {
    onSelectStaff(selectedStaffIds.filter((id) => !keys.has(id)));
  };

  return (
    <div className={className}>
      <Autocomplete
        className="w-[220px]"
        selectionMode="multiple"
        placeholder="Semua Terapis"
        value={selectedKeys}
        onChange={handleChange}
        isDisabled={isLoading}
      >
        <Autocomplete.Trigger className="rounded-full border border-border bg-surface px-3 py-2 shadow-sm transition-colors hover:border-foreground/20 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-primary/40">
          <Autocomplete.Value>
            {({ defaultChildren, isPlaceholder, state }) => {
              if (isPlaceholder || state.selectedItems.length === 0) {
                return <span className="text-sm font-medium">{defaultChildren}</span>;
              }

              if (state.selectedItems.length === 1) {
                const staff = staffs.find((s) => s.id === Number(state.selectedItems[0]?.key));
                if (!staff) return <span className="text-sm font-medium">Semua Terapis</span>;
                return (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {initials(staff)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{fullName(staff)}</span>
                  </div>
                );
              }

              const selectedKeysArr = state.selectedItems.map((item) => item.key);

              return (
                <TagGroup size="sm" onRemove={onRemoveTags}>
                  <TagGroup.List className="flex-nowrap overflow-hidden">
                    {selectedKeysArr.slice(0, 2).map((key) => {
                      const staff = staffs.find((s) => s.id === Number(key));
                      if (!staff) return null;
                      return (
                        <Tag key={key} id={key}>
                          {staff.first_name}
                        </Tag>
                      );
                    })}
                    {selectedKeysArr.length > 2 && (
                      <span className="whitespace-nowrap text-xs font-medium text-muted">
                        +{selectedKeysArr.length - 2}
                      </span>
                    )}
                  </TagGroup.List>
                </TagGroup>
              );
            }}
          </Autocomplete.Value>
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator className="text-muted" />
        </Autocomplete.Trigger>

        <Autocomplete.Popover className="w-[260px] rounded-xl border border-border bg-surface p-2 shadow-lg">
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary" className="mb-2">
              <SearchField.Group className="rounded-full border border-border bg-surface-secondary px-2">
                <SearchField.SearchIcon className="size-4 text-muted" />
                <SearchField.Input
                  placeholder="Cari nama atau kode..."
                  className="text-sm"
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <ListBox
              className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto"
              renderEmptyState={() => (
                <EmptyState className="py-6 text-center text-sm text-muted">
                  {isLoading ? "Memuat data..." : "Terapis tidak ditemukan"}
                </EmptyState>
              )}
            >
              {staffs.map((staff) => (
                <ListBox.Item
                  key={staff.id}
                  id={staff.id}
                  textValue={`${fullName(staff)} ${staff.employee_code}`}
                  className="rounded-lg px-2 py-1.5 data-[hovered=true]:bg-surface-secondary data-[selected=true]:bg-primary/10"
                >
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {initials(staff)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <Label className="text-sm font-medium">{fullName(staff)}</Label>
                    <Description className="text-xs text-muted">
                      {staff.employee_code} · {staff.job_title}
                    </Description>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </div>
  );
}