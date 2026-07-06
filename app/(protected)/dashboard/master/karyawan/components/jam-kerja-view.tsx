"use client";

import React, { useState, useMemo, useRef } from "react"; // Sesuaikan jika Anda menggunakan HeroUI v3 import path
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CalendarBlank,
  UserList,
  UserSwitch,
  UserGear,
  PencilSimple,
  Plus,
  Check,
  XCircle,
  Clock,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { useApiFetch, usePost } from "@/app/libs/use-http";
import { parseWallClockDate } from "@/app/libs/date-format";
import {
  Dropdown,
  Spinner,
  toast,
  Select,
  ListBox,
  RangeCalendar,
  Avatar,
} from "@heroui/react";

// --- INTERFACES ---
interface Shift {
  id: number | string;
  name: string;
  start_time: string;
  end_time: string;
  color_code?: string;
}

interface StaffSchedule {
  id: number | string;
  date: string;
  bms_ms_shift_id: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_day_off?: boolean;
  shift?: Shift;
}

interface Staff {
  id: number | string;
  first_name: string;
  last_name?: string;
  job_title: string;
  avatar_path?: string;
  schedules?: StaffSchedule[];
}

interface SchedulePayload {
  bms_ms_staff_id: number | string;
  date: string;
  bms_ms_shift_id?: number | string | null;
  is_day_off?: boolean;
}

interface RemovePayload {
  bms_ms_staff_id: number | string;
  date: string;
  bms_ms_shift_id?: null;
  is_day_off: boolean;
}

interface ScheduleCellProps {
  date: string;
  staff: Staff;
  schedule?: StaffSchedule;
  shifts: Shift[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignSchedule: (data: SchedulePayload, options: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearSchedule: (data: RemovePayload, options: any) => void;
}

const normalizeScheduleDateKey = (dateInput?: string | null) => {
  if (!dateInput) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
  const parsed = parseWallClockDate(dateInput);
  if (!parsed) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// --- KOMPONEN SEL JADWAL INDIVIDUAL ---
const ScheduleCell = ({
  date,
  staff,
  schedule,
  shifts,
  assignSchedule,
  clearSchedule,
}: ScheduleCellProps) => {
  const [isCellLoading, setIsCellLoading] = useState(false);
  const actionLockRef = useRef(false);
  const isDayOff = Boolean(schedule?.is_day_off);
  const resolvedShift = useMemo(
    () =>
      schedule?.shift ??
      shifts.find(
        (shift) => String(shift.id) === String(schedule?.bms_ms_shift_id),
      ),
    [schedule?.bms_ms_shift_id, schedule?.shift, shifts],
  );

  const unlockCell = () => {
    actionLockRef.current = false;
    setIsCellLoading(false);
  };

  const handleAssign = (shiftId: string) => {
    if (actionLockRef.current) return;
    if (!isDayOff && String(schedule?.bms_ms_shift_id) === shiftId) return;

    actionLockRef.current = true;
    setIsCellLoading(true);
    assignSchedule(
      { bms_ms_staff_id: staff.id, date: date, bms_ms_shift_id: shiftId },
      { onSettled: unlockCell },
    );
  };

  const handleRemove = () => {
    if (actionLockRef.current || !schedule) return;

    actionLockRef.current = true;
    setIsCellLoading(true);
    clearSchedule(
      {
        bms_ms_staff_id: staff.id,
        date,
        bms_ms_shift_id: null,
        is_day_off: true,
      },
      { onSettled: unlockCell },
    );
  };

  const handleMarkDayOff = () => {
    if (actionLockRef.current) return;
    if (isDayOff && !schedule?.bms_ms_shift_id) return;

    actionLockRef.current = true;
    setIsCellLoading(true);
    clearSchedule(
      {
        bms_ms_staff_id: staff.id,
        date,
        bms_ms_shift_id: null,
        is_day_off: true,
      },
      { onSettled: unlockCell },
    );
  };

  //   const handleAction = (key: React.Key) => {
  //     const stringKey = String(key);
  //     if (stringKey === "delete") {
  //       handleRemove();
  //     } else {
  //       // Cegah request api jika klik shift yang sama
  //       if (String(schedule?.bms_ms_shift_id) === stringKey) return;
  //       handleAssign(stringKey);
  //     }
  //   };

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));

  return (
    <Dropdown className="p-0 w-full h-full block">
      <Dropdown.Trigger className="outline-none w-full block">
        <div
          className={`relative w-full h-[3.5rem] rounded-xl transition-all outline-none overflow-hidden ${
            isCellLoading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {isCellLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-secondary/30 backdrop-blur-[1px]">
              <Spinner size="sm" color="warning" />
            </div>
          )}

          {schedule ? (
            <div
              className={`w-full h-full border py-2 px-1 flex flex-col items-center justify-center cursor-pointer transition-colors group/event ${
                isDayOff
                  ? "bg-danger/10 border-danger/20 hover:bg-danger/15"
                  : "bg-accent/15 border-accent/20 hover:bg-accent/25"
              }`}
            >
              <span
                className={`text-[12px] font-bold tracking-tight ${
                  isDayOff ? "text-danger" : "text-accent"
                }`}
              >
                {isDayOff
                  ? "Libur"
                  : resolvedShift
                    ? `${resolvedShift.start_time.substring(0, 5)} - ${resolvedShift.end_time.substring(0, 5)}`
                    : "Custom"}
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 truncate w-full px-1 text-center ${
                  isDayOff ? "text-danger/70" : "text-accent/60"
                }`}
              >
                {isDayOff ? "Hari Off" : resolvedShift?.name || "Shift"}
              </span>

              <div className="absolute top-1 right-1 opacity-0 group-hover/event:opacity-100 transition-opacity bg-surface rounded-full p-1 shadow-sm border border-border">
                <PencilSimple
                  weight="bold"
                  className="w-3 h-3 text-muted hover:text-accent"
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted/40 hover:text-accent border border-dashed border-border/80 hover:border-accent hover:bg-accent/5 transition-all">
              <Plus weight="bold" className="w-5 h-5" />
            </div>
          )}
        </div>
      </Dropdown.Trigger>

      <Dropdown.Popover
        placement="bottom"
        className="min-w-[260px] bg-surface rounded-2xl shadow-2xl border border-border/60 p-1.5 z-[100]"
      >
        <Dropdown.Menu
          aria-label="Pilih Shift"
          selectionMode="single"
          className="p-0 gap-1"
        >
          <Dropdown.Item
            key="header"
            textValue="Header"
            className="p-0 mb-1 rounded-none data-[hover=true]:bg-transparent rounded-t-lg cursor-default"
          >
            <div className="w-full px-3 pt-2 pb-3.5  border-b border-border/60 flex flex-col gap-1.5 outline-none pointer-events-none">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <CalendarBlank weight="bold" className="w-3.5 h-3.5" />
                Penugasan Shift
              </span>
              <span className="text-[13px] font-bold text-foreground flex items-center truncate">
                {staff.first_name} {staff.last_name || ""}
                <span className="text-muted/30 mx-2">•</span>
                <span className="text-accent">{formattedDate}</span>
              </span>
            </div>
          </Dropdown.Item>
          {shifts.length > 0 ? (
            shifts.map((shift) => {
              const shiftIdStr = String(shift.id);
              const isActive =
                !isDayOff && String(schedule?.bms_ms_shift_id) === shiftIdStr;

              return (
                <Dropdown.Item
                  key={shiftIdStr}
                  textValue={shift.name}
                  onPress={() => handleAssign(shiftIdStr)}
                  className={`py-2 px-2.5 rounded-xl transition-all group/item data-[hover=true]:bg-surface-secondary/80 ${
                    isActive
                      ? "bg-accent/10 data-[hover=true]:bg-accent/15"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Icon Container yang Elegan */}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm border transition-colors ${
                        isActive
                          ? "bg-accent/20 border-accent/30 text-accent"
                          : "bg-background border-border/50 text-muted group-data-[hover=true]/item:text-foreground"
                      }`}
                    >
                      <Clock
                        weight={isActive ? "fill" : "regular"}
                        className="w-4 h-4"
                      />
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col flex-1 gap-0.5">
                      <span
                        className={`text-[13.5px] leading-none ${isActive ? "font-bold text-accent" : "font-semibold text-foreground group-data-[hover=true]/item:text-foreground"}`}
                      >
                        {shift.name}
                      </span>
                      <span
                        className={`text-[11px] font-medium leading-none mt-0.5 ${isActive ? "text-accent/70" : "text-muted group-data-[hover=true]/item:text-muted/80"}`}
                      >
                        {shift.start_time.substring(0, 5)} -{" "}
                        {shift.end_time.substring(0, 5)}
                      </span>
                    </div>

                    {/* Check Indicator */}
                    {isActive && (
                      <div className="pr-1">
                        <Check weight="bold" className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </div>
                </Dropdown.Item>
              );
            })
          ) : (
            <Dropdown.Item
              key="empty"
              textValue="Kosong"
              className="py-6 text-center text-muted text-sm font-medium"
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Clock className="w-6 h-6 opacity-40" />
                <span>Belum ada master shift</span>
              </div>
            </Dropdown.Item>
          )}

          <Dropdown.Item
            key="day-off"
            onPress={handleMarkDayOff}
            textValue="Tandai Libur"
            className="mt-1.5 rounded-xl text-warning data-[hover=true]:bg-warning/10 data-[hover=true]:text-warning"
          >
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-warning/10 text-warning">
                <CalendarBlankIcon weight="fill" className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-sm font-semibold">Tandai Libur</span>
                <span className="text-[11px] opacity-70">
                  Set hari ini sebagai off
                </span>
              </div>
            </div>
          </Dropdown.Item>

          {schedule && !isDayOff ? (
            <Dropdown.Item
              key="delete"
              onPress={handleRemove}
              textValue="Kosongkan Jadwal"
              className="mt-1.5 pt-2 border-t border-border/60 rounded-none text-danger data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger"
            >
              <div className="flex items-center gap-2.5 px-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-danger/10 text-danger">
                  <XCircle weight="fill" className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">Kosongkan Jadwal</span>
              </div>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

// --- VIEW UTAMA ---
export default function JamKerjaView() {
  const timeZone = getLocalTimeZone();
  const currentDateObj = today(timeZone);

  const [dateRange, setDateRange] = useState({
    start: currentDateObj,
    end: currentDateObj.add({ days: 6 }),
  });

  const startDateStr = dateRange.start.toString();
  const endDateStr = dateRange.end.toString();

  // FETCH STAFFS & SCHEDULES
  const { data: responseData, isLoading: isStaffsLoading } = useApiFetch<{
    data: Staff[];
  }>(["schedules", startDateStr, endDateStr], "/master/schedules", {
    start_date: startDateStr,
    end_date: endDateStr,
  });
  const staffs = responseData?.data || [];

  // FETCH SHIFTS
  const { data: shiftsResponse } = useApiFetch<{ data: Shift[] }>(
    ["shifts"],
    "/master/shifts",
  );
  const shifts = shiftsResponse?.data || [];

  // MUTATION ASSIGN
  const { mutate: assignSchedule } = usePost<unknown, SchedulePayload>(
    "/master/schedules",
    {
      invalidate: [["schedules"]],
      onSuccess: () => {
        toast.success("Berhasil mengatur jadwal shift");
      },
    },
  );

  // MUTATION CLEAR TO DAY OFF
  const { mutate: clearSchedule } = usePost<unknown, RemovePayload>(
    "/master/schedules",
    {
      invalidate: [["schedules"]],
      onSuccess: () => {
        toast.success("Jadwal berhasil diubah menjadi hari off");
      },
    },
  );

  const rangeDuration = dateRange.end.compare(dateRange.start) + 1;
  const handlePrevDate = () => {
    setDateRange({
      start: dateRange.start.subtract({ days: rangeDuration }),
      end: dateRange.end.subtract({ days: rangeDuration }),
    });
  };
  const handleNextDate = () => {
    setDateRange({
      start: dateRange.start.add({ days: rangeDuration }),
      end: dateRange.end.add({ days: rangeDuration }),
    });
  };

  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  });
  const startYear = dateRange.start.year;
  const endYear = dateRange.end.year;
  const displayDateText =
    startYear === endYear
      ? `${formatter.format(dateRange.start.toDate(timeZone))} - ${formatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`
      : `${formatter.format(dateRange.start.toDate(timeZone))}, ${startYear} - ${formatter.format(dateRange.end.toDate(timeZone))}, ${endYear}`;

  const gridDays = useMemo(() => {
    const days = [];
    let curr = dateRange.start;
    const todayStr = currentDateObj.toString();
    while (curr.compare(dateRange.end) <= 0) {
      days.push({
        dateStr: curr.toString(),
        name: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
          curr.toDate(timeZone),
        ),
        shortDate: formatter.format(curr.toDate(timeZone)),
        isToday: curr.toString() === todayStr,
      });
      curr = curr.add({ days: 1 });
    }
    return days;
  }, [dateRange, currentDateObj]);

  return (
    <div className="space-y-6">
      {/* Toolbar Filter Grid (Styling dikembalikan ke Mock) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-64">
          <Select placeholder="Semua Staf" aria-label="Filter Staf">
            <Select.Trigger className="bg-transparent rounded-full border border-border h-11 px-5 flex items-center justify-between shadow-sm outline-none hover:border-accent transition-colors">
              <div className="flex items-center gap-2">
                <Select.Value className="text-sm font-bold text-foreground" />
              </div>
              <Select.Indicator>
                <CaretDown className="w-4 h-4 text-muted" />
              </Select.Indicator>
            </Select.Trigger>
            <Select.Popover className="bg-surface border border-border rounded-2xl shadow-lg mt-1 p-1">
              <ListBox>
                <ListBox.Item id="all" textValue="Semua Staf">
                  <div className="flex items-center gap-2">
                    <UserList className="w-4 h-4 text-muted" />
                    <span className="text-sm font-semibold">Semua Staf</span>
                  </div>
                </ListBox.Item>
                <ListBox.Item
                  id="manager therapist"
                  textValue="Menager Therapist"
                >
                  <div className="flex items-center gap-2">
                    <UserSwitch className="w-4 h-4 text-muted" />
                    <span className="text-sm font-semibold">
                      Menager Therapist
                    </span>
                  </div>
                </ListBox.Item>
                <ListBox.Item id="therapist" textValue="Therapist">
                  <div className="flex items-center gap-2">
                    <UserGear className="w-4 h-4 text-muted" />
                    <span className="text-sm font-semibold">Therapist</span>
                  </div>
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className="flex items-center bg-transparent border border-border rounded-full overflow-visible shadow-sm w-full sm:w-auto h-11 transition-colors">
          <button
            onClick={handlePrevDate}
            className="px-5 h-full text-muted hover:text-accent hover:bg-surface-secondary/50 transition-colors border-r border-border rounded-l-full outline-none"
          >
            <CaretLeft weight="bold" className="w-4 h-4" />
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <div className="px-6 h-full text-sm font-bold text-foreground flex items-center gap-2 hover:bg-surface-secondary/50 transition-colors outline-none">
                <CalendarBlank weight="bold" className="w-4 h-4 text-muted" />
                {displayDateText}
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom"
              className="bg-surface border border-border shadow-xl rounded-3xl p-4 min-w-[320px] z-[100]"
            >
              {/* === Custom Anatomy Range Calendar dikembalikan dari Mock === */}
              <RangeCalendar
                aria-label="Pilih rentang jadwal"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value={dateRange as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(val: any) => setDateRange(val)}
                className="w-full"
              >
                <RangeCalendar.Header className="flex items-center justify-between pb-4">
                  <RangeCalendar.NavButton
                    slot="previous"
                    className="p-2 rounded-xl border border-border hover:bg-surface-secondary text-muted transition-colors"
                  />
                  <RangeCalendar.Heading className="text-sm font-bold text-foreground" />
                  <RangeCalendar.NavButton
                    slot="next"
                    className="p-2 rounded-xl border border-border hover:bg-surface-secondary text-muted transition-colors"
                  />
                </RangeCalendar.Header>

                <RangeCalendar.Grid className="w-full border-collapse">
                  <RangeCalendar.GridHeader>
                    {(day) => (
                      <RangeCalendar.HeaderCell className="text-[11px] uppercase font-bold text-muted text-center pb-3">
                        {day}
                      </RangeCalendar.HeaderCell>
                    )}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {(date) => (
                      <RangeCalendar.Cell
                        date={date}
                        className="text-center p-0 m-0 outline-none"
                      >
                        {({
                          formattedDate,
                          isSelected,
                          isSelectionStart,
                          isSelectionEnd,
                          isOutsideMonth,
                        }) => {
                          const isBoth = isSelectionStart && isSelectionEnd;
                          let wrapperClass = "w-full py-0.5 ";
                          let pillClass =
                            "w-8 h-8 mx-auto flex items-center justify-center text-sm rounded-full transition-colors font-medium ";

                          if (
                            isSelected &&
                            !isSelectionStart &&
                            !isSelectionEnd
                          ) {
                            wrapperClass += "bg-accent/10";
                            pillClass += "text-accent";
                          } else if (isSelectionStart || isSelectionEnd) {
                            if (isSelectionStart && !isBoth)
                              wrapperClass += "bg-accent/10 rounded-l-full";
                            if (isSelectionEnd && !isBoth)
                              wrapperClass += "bg-accent/10 rounded-r-full";
                            pillClass +=
                              "bg-accent text-accent-foreground font-bold shadow-sm";
                          } else {
                            pillClass +=
                              "hover:bg-surface-secondary text-foreground";
                          }
                          if (isOutsideMonth) pillClass += " opacity-30";

                          return (
                            <div className={wrapperClass}>
                              <div className={pillClass}>{formattedDate}</div>
                            </div>
                          );
                        }}
                      </RangeCalendar.Cell>
                    )}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </Dropdown.Popover>
          </Dropdown>

          <button
            onClick={handleNextDate}
            className="px-5 h-full text-muted hover:text-accent hover:bg-surface-secondary/50 transition-colors border-l border-border rounded-r-full outline-none"
          >
            <CaretRight weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Area Kalender Card - LANGSUNG DI ATAS BACKGROUND TEMA */}
      <div className="overflow-x-auto scrollbar-hide pb-10">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-[1000px] border-collapse">
          <thead>
            <tr className="border-y border-border">
              {/* Table Header Profil dikembalikan seperti Mock */}
              <th className="py-6 px-4 font-bold text-muted uppercase tracking-wider w-[240px] text-xs bg-background sticky left-0 z-20 border-r border-border/50 shadow-[1px_0_0_0_var(--color-border)]">
                Anggota Staf
              </th>
              {gridDays.map((d) => (
                <th
                  key={d.dateStr}
                  // Styling lebar dan padding ditarik lagi ke versi Mock (w-[130px])
                  className="py-6 px-2 text-center w-[130px] border-r border-border/30 last:border-r-0"
                >
                  <div
                    className={`font-bold ${d.isToday ? "text-accent" : "text-foreground"}`}
                  >
                    {d.name}
                  </div>
                  <div
                    className={`text-[11px] font-semibold mt-1 ${d.isToday ? "text-accent/80" : "text-muted"}`}
                  >
                    {d.shortDate}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isStaffsLoading ? (
              // Skeleton dengan struktur Table Body yang disesuaikan untuk Mock
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border">
                  <td className="py-5 px-4 bg-background sticky left-0 z-10 border-r border-border/50 shadow-[1px_0_0_0_var(--color-border)]">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-accent/25" />
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="h-3.5 bg-accent/25 rounded-md w-full" />
                        <div className="h-2.5 bg-accent/25 rounded-md w-1/2" />
                      </div>
                    </div>
                  </td>
                  {gridDays.map((d) => (
                    <td
                      key={`skeleton-cell-${d.dateStr}`}
                      className="p-2.5 border-r border-border/30 last:border-r-0"
                    >
                      <div className="w-full h-[3.5rem] rounded-xl bg-accent/25 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : staffs.length === 0 ? (
              <tr>
                <td
                  colSpan={gridDays.length + 1}
                  className="py-12 text-center text-muted font-medium"
                >
                  Belum ada data jadwal staf.
                </td>
              </tr>
            ) : (
              staffs.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b border-border hover:bg-border/10 transition-colors group/row"
                >
                  {/* Kolom Profil Staf (Styling dari Mock) */}
                  <td className="py-5 px-4 bg-background group-hover/row:bg-background/90 sticky left-0 z-10 border-r border-border/50 shadow-[1px_0_0_0_var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-1 ring-border/50 bg-border/20">
                        <Avatar.Image
                          src={
                            staff.avatar_path
                              ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${staff.avatar_path}`
                              : ""
                          }
                        />
                        <Avatar.Fallback className="text-muted font-bold">
                          {staff.first_name?.charAt(0) || "U"}
                        </Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">
                          {staff.first_name} {staff.last_name || ""}
                        </span>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-0.5">
                          {staff.job_title}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Kolom Hari (Kotak Jadwal) */}
                  {gridDays.map((d) => {
                    const schedule = staff.schedules?.find(
                      (s) => normalizeScheduleDateKey(s.date) === d.dateStr,
                    );
                    return (
                      <td
                        key={d.dateStr}
                        className="p-2.5 align-middle text-center border-r border-border/30 last:border-r-0"
                      >
                        <ScheduleCell
                          date={d.dateStr}
                          staff={staff}
                          schedule={schedule}
                          shifts={shifts}
                          assignSchedule={assignSchedule}
                          clearSchedule={clearSchedule}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
