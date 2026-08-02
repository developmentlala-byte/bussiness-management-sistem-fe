"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  ClockAfternoon,
  Hourglass,
  CalendarBlank,
} from "@phosphor-icons/react";
import {
  Avatar,
  AvatarFallback,
  Card,
  Chip,
  EmptyState,
  Spinner,
  Dropdown,
  Calendar,
} from "@heroui/react";
import { today, getLocalTimeZone } from "@internationalized/date";
import { useApiFetch } from "@/app/libs/use-http";
import { Staff } from "@/app/types/staff";
import {
  SpaBooking,
  BookingTherapist,
  BookingResourceAssignment,
  isBundlePromoLine,
} from "@/app/types/booking";
import { formatWallClockDate, formatDuration } from "@/app/libs/date-format";
import { resolvePhotoUrl } from "@/app/libs/resolve-url";

// ==========================================
// TYPES & HELPERS
// ==========================================
interface SplitTask {
  id: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  duration: number;
  resourceName: string;
  resourceCode: string;
  status: string;
}

interface StaffSchedule {
  staff: Staff;
  tasks: SplitTask[];
  totalDuration: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Confirmed":
      return "accent";
    case "Completed":
      return "success";
    case "Cancelled":
      return "danger";
    default:
      return "warning";
  }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function TherapistSchedulePage() {
  const timeZone = getLocalTimeZone();
  const [selectedDate, setSelectedDate] = useState(today(timeZone));
  const [searchQuery, setSearchQuery] = useState("");

  const dateStr = selectedDate.toString();
  const isToday = dateStr === today(timeZone).toString();

  // 1. Fetch Staff List
  const { data: staffRes, isLoading: isStaffLoading } = useApiFetch<{
    data: Staff[];
  }>(["staffs", "active"], "/master/staffs", { "filter[status]": "active" });

  // 2. Fetch Bookings for Selected Date
  const { data: bookingsRes, isLoading: isBookingsLoading } = useApiFetch<{
    data: SpaBooking[];
  }>(["bookings", dateStr], "/master/bookings", {
    start_date: dateStr,
    end_date: dateStr,
  });

  const staffs = staffRes?.data ?? [];
  const bookings = bookingsRes?.data ?? [];

  // 3. Logic to Split and Group Tasks for All Therapists
  const staffSchedules = useMemo(() => {
    const schedulesMap = new Map<number, SplitTask[]>();

    const formatTime = (timeStr?: string | null) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d{2}:\d{2})/);
      return match ? match[1] : timeStr;
    };

    const processBooking = (booking: SpaBooking) => {
      if (booking.status === "Cancelled") return;

      const therapists = (booking.therapists ?? []).filter(
        (t): t is BookingTherapist => typeof t !== "string",
      );

      const resources = (booking.resource_assignments ??
        []) as (BookingResourceAssignment & {
        resource_name?: string;
        resource_code?: string;
      })[];

      therapists.forEach((t, idx) => {
        // Response API ngirim `staff_id` / `service_variant_id` LANGSUNG di
        // object therapist (nama key di JSON) — bukan `bms_ms_staff_id` /
        // `bms_ms_service_variant_id` (itu nama kolom di DB, beda dari nama
        // key di response). Fallback chain dibiarin biar tetap jalan kalau
        // shape response berubah lagi nanti.
        const staffId = Number(
          (t as any).staff_id ??
            (t as any).bms_ms_staff_id ??
            (t as any).staff?.id,
        );
        if (!staffId) return;

        const variantId =
          (t as any).service_variant_id ?? (t as any).bms_ms_service_variant_id;

        // client_key di resource_assignments sering null di data real, jadi
        // match by client_key cuma dipakai kalau dua-duanya benar-benar
        // terisi; fallback utama tetap by service_variant_id.
        const resource =
          resources.find(
            (r) => r.client_key && r.client_key === t.client_key,
          ) || resources.find((r) => r.service_variant_id === variantId);

        const variantName =
          t.service_variant_name ||
          booking.service_variants?.find((v) => v.id === variantId)?.name ||
          "Treatment";

        // Jam per-item yang sebenarnya kejadwal ada di resource_assignments
        // (slot ruangan/kursi per service_variant) — start_time/end_time di
        // level therapist sering null. Prioritaskan jam dari resource dulu,
        // baru fallback ke therapist-level kalau itu suatu saat terisi.
        const startTime =
          formatTime(resource?.start_time) || formatTime(t.start_time);
        const endTime =
          formatTime(resource?.end_time) || formatTime(t.end_time);

        let duration = 0;
        if (startTime && endTime) {
          const startParts = startTime.split(":").map(Number);
          const endParts = endTime.split(":").map(Number);
          duration =
            endParts[0] * 60 +
            endParts[1] -
            (startParts[0] * 60 + startParts[1]);
        }

        // Fallback to variant duration if time-based calculation failed or was 0
        if (duration <= 0) {
          booking.service_variants?.forEach((v) => {
            if (v.id === variantId) {
              duration = v.duration_minutes || 0;
            } else if (isBundlePromoLine(v)) {
              const item = v.items?.find((i) => i.id === variantId);
              if (item) duration = item.duration_minutes || 0;
            }
          });
        }

        // Final fallback to booking duration if still 0
        if (duration <= 0) duration = booking.duration_minutes || 0;

        const tasks = schedulesMap.get(staffId) || [];
        tasks.push({
          id: `${booking.id}-${idx}-${t.id}`,
          bookingCode: booking.booking_code,
          customerName: booking.customer_name,
          serviceName: variantName,
          startTime:
            startTime ||
            booking.schedule_date.split(" ")[1]?.substring(0, 5) ||
            "--:--",
          endTime: endTime || "--:--",
          duration: duration,
          resourceName: resource?.resource_name || "TBA",
          resourceCode: resource?.resource_code || "---",
          status: booking.status,
        });
        schedulesMap.set(staffId, tasks);
      });

      // Handle bonus items
      (booking.child_bookings ?? []).forEach((child) => {
        if (child.status === "Cancelled") return;
        processBooking(child);
      });
    };

    bookings.forEach(processBooking);

    // Build final array of all staff
    const finalSchedules: StaffSchedule[] = staffs
      .map((staff) => {
        const tasks = (schedulesMap.get(staff.id) || []).sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        );
        const totalDuration = tasks.reduce(
          (acc, t) => acc + (t.duration || 0),
          0,
        );
        return { staff, tasks, totalDuration };
      })
      .filter((s) => {
        if (!searchQuery) return true;
        const name = `${s.staff.first_name} ${s.staff.last_name}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      });

    // Sort: Busy therapists first, then alphabetically
    return finalSchedules.sort((a, b) => {
      if (b.tasks.length !== a.tasks.length) {
        return b.tasks.length - a.tasks.length;
      }
      return `${a.staff.first_name}`.localeCompare(`${b.staff.first_name}`);
    });
  }, [staffs, bookings, searchQuery]);

  return (
    <div
      className="relative flex flex-col w-full min-h-full"
      style={{ gap: "var(--space-5)" }}
    >
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Jadwal Terapis
          </h1>
          <p className="mt-1 text-xs text-muted">
            Pantau agenda kerja harian seluruh terapis Mahalu Spa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Cari terapis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-44 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 md:w-60"
            />
          </div>

          {/* Date filter — prev / dropdown+calendar / next, single date */}
          <div className="flex h-11 items-center rounded-full border border-border bg-surface shadow-sm">
            <button
              type="button"
              onClick={() =>
                setSelectedDate(selectedDate.subtract({ days: 1 }))
              }
              aria-label="Hari sebelumnya"
              className="flex h-full w-11 items-center justify-center rounded-l-full border-r border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            >
              <CaretLeft weight="bold" className="h-4 w-4" />
            </button>

            <Dropdown>
              <Dropdown.Trigger>
                <div className="flex h-full cursor-pointer items-center gap-2 px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-secondary/50">
                  <CalendarBlank
                    weight="bold"
                    className="h-4 w-4 shrink-0 text-muted"
                  />
                  <span className="truncate">
                    {isToday
                      ? "Hari Ini"
                      : formatWallClockDate(dateStr, { dateStyle: "medium" })}
                  </span>
                </div>
              </Dropdown.Trigger>
              <Dropdown.Popover
                placement="bottom"
                className="z-[100] min-w-[300px] rounded-3xl border border-border bg-surface p-4 shadow-xl"
              >
                <Calendar
                  aria-label="Pilih tanggal"
                  value={selectedDate}
                  onChange={(val) => setSelectedDate(val as any)}
                  className="w-full"
                >
                  <Calendar.Header>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => (
                        <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                      )}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => <Calendar.Cell date={date} />}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </Dropdown.Popover>
            </Dropdown>

            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate.add({ days: 1 }))}
              aria-label="Hari berikutnya"
              className="flex h-full w-11 items-center justify-center rounded-r-full border-l border-border text-muted outline-none transition-colors hover:bg-surface-secondary/50 hover:text-accent"
            >
              <CaretRight weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GRID */}
      {isStaffLoading || isBookingsLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
          <Spinner size="lg" color="accent" />
          <p className="text-sm font-medium text-muted">
            Menyusun jadwal terapis...
          </p>
        </div>
      ) : staffSchedules.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 bg-surface-secondary/10 px-6 py-20 text-center">
          <EmptyState
            title={searchQuery ? "Terapis tidak ditemukan" : "Data kosong"}
            description={
              searchQuery
                ? `Tidak ada terapis dengan nama "${searchQuery}".`
                : "Belum ada data terapis atau jadwal tersedia."
            }
            icon={<User size={40} className="text-muted/40" />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {staffSchedules.map((schedule) => (
            <Card
              key={schedule.staff.id}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-accent/30"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Avatar
                  className="size-11 shrink-0 rounded-xl"
                  src={resolvePhotoUrl(schedule.staff.avatar_path) || undefined}
                >
                  <AvatarFallback className="rounded-xl bg-accent/10 text-sm font-semibold text-accent">
                    {schedule.staff.first_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {schedule.staff.first_name} {schedule.staff.last_name}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                    {schedule.staff.job_title || "Therapist"}
                    {schedule.staff.employee_code
                      ? ` · ${schedule.staff.employee_code}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-2 px-4 pt-3">
                <div className="flex items-center gap-1.5 rounded-xl bg-surface-secondary px-2.5 py-1">
                  <Hourglass weight="bold" className="size-3 text-accent" />
                  <span className="text-[11px] font-semibold text-foreground">
                    {schedule.tasks.length} layanan
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-surface-secondary px-2.5 py-1">
                  <Clock weight="bold" className="size-3 text-accent" />
                  <span className="text-[11px] font-semibold text-foreground">
                    {schedule.totalDuration > 0
                      ? formatDuration(schedule.totalDuration)
                      : "0m"}
                  </span>
                </div>
              </div>

              {/* Task list */}
              <div className="flex flex-1 flex-col gap-2.5 p-4">
                {schedule.tasks.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-8 text-muted/70">
                    <CalendarBlank size={22} weight="regular" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      Libur / tidak ada tugas
                    </span>
                  </div>
                ) : (
                  schedule.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-foreground">
                          <ClockAfternoon
                            weight="bold"
                            className="size-3 text-accent"
                          />
                          {task.startTime} – {task.endTime}
                          <span className="ml-1 text-[10px] font-medium text-muted">
                            ({formatDuration(task.duration)})
                          </span>
                        </span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getStatusColor(task.status) as any}
                          className="h-5 rounded-xl px-2 text-[9px] font-semibold uppercase tracking-wide"
                        >
                          {task.status}
                        </Chip>
                      </div>

                      <h4 className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
                        {task.serviceName}
                      </h4>

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <User
                            weight="bold"
                            className="size-3 shrink-0 text-muted"
                          />
                          <span className="truncate text-[11px] text-muted">
                            {task.customerName}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <MapPin
                            weight="bold"
                            className="size-3 text-accent"
                          />
                          <span className="text-[11px] font-semibold text-foreground">
                            {task.resourceCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
