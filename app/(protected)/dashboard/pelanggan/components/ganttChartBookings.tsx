"use client";

import React, { useMemo } from "react";
import {
  CalendarDate,
  Time,
  getLocalTimeZone,
  today,
} from "@internationalized/date";
import { cn } from "@heroui/react"; // Sesuaikan dengan path utility class Anda
import { FlowerLotus, Hand, Drop, Sparkle } from "@phosphor-icons/react";

// --- KONFIGURASI TIMELINE ---
const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_WIDTH = 120; // 120px per jam
const MINUTE_WIDTH = HOUR_WIDTH / 60; // 2px per menit
const Y_AXIS_WIDTH = 160;

// --- FORMATTER ---
const dayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Helper untuk menghitung jam selesai
const getEndTime = (startTime: string, durationMinutes: number) => {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
};

// --- TYPE DEFINITIONS ---
type ServiceCategory = "massage" | "nail" | "facial" | "spa";

interface SpaBookingEvent {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  guestName: string;
  category: ServiceCategory;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
}

const MOCK_EVENTS: SpaBookingEvent[] = [
  {
    id: "1",
    date: "2026-06-15",
    startTime: "09:00",
    durationMinutes: 90,
    guestName: "Anya Geraldine",
    category: "massage",
    status: "Confirmed",
  },
  {
    id: "2",
    date: "2026-06-15",
    startTime: "11:30",
    durationMinutes: 60,
    guestName: "Tara Basro",
    category: "nail",
    status: "Completed",
  },
  {
    id: "3",
    date: "2026-06-16",
    startTime: "10:00",
    durationMinutes: 120,
    guestName: "Reza Rahadian",
    category: "spa",
    status: "Pending",
  },
  {
    id: "4",
    date: "2026-06-17",
    startTime: "14:15",
    durationMinutes: 90,
    guestName: "Zoe Davis",
    category: "facial",
    status: "Confirmed",
  },
  {
    id: "5",
    date: "2026-06-15",
    startTime: "14:00",
    durationMinutes: 60,
    guestName: "Lily Dian",
    category: "massage",
    status: "Cancelled",
  },
];

// Helper Ikon berdasarkan kategori layanan
const getServiceIcon = (category: ServiceCategory) => {
  switch (category) {
    case "massage":
      return <FlowerLotus weight="duotone" className="size-3.5" />;
    case "nail":
      return <Hand weight="duotone" className="size-3.5" />;
    case "facial":
      return <Sparkle weight="duotone" className="size-3.5" />;
    case "spa":
      return <Drop weight="duotone" className="size-3.5" />;
    default:
      return <FlowerLotus weight="duotone" className="size-3.5" />;
  }
};

// Helper warna block berdasarkan status (menyesuaikan warna tabel screenshot)
const getBlockStyles = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-[#F0FDF4] border-l-[#22C55E] border-y-[#E2E8F0] border-r-[#E2E8F0] text-[#166534]";
    case "Pending":
      return "bg-[#FFF7ED] border-l-[#F97316] border-y-[#E2E8F0] border-r-[#E2E8F0] text-[#9A3412]";
    case "Cancelled":
      return "bg-[#FEF2F2] border-l-[#EF4444] border-y-[#E2E8F0] border-r-[#E2E8F0] text-[#991B1B] opacity-70";
    case "Confirmed":
    default:
      return "bg-[#F8FAFC] border-l-[#475569] border-y-[#E2E8F0] border-r-[#E2E8F0] text-[#334155]";
  }
};

export default function GanttChartBookings() {
  const baseDate = new CalendarDate(2026, 6, 15);
  const currentDate = today(getLocalTimeZone());

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => baseDate.add({ days: i })),
    [baseDate],
  );
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, SpaBookingEvent[]>();
    MOCK_EVENTS.forEach((event) => {
      const arr = map.get(event.date) || [];
      arr.push(event);
      map.set(event.date, arr);
    });
    return map;
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white border border-[#E5E2DC] shadow-sm text-[#2C2C2A] mb-8">
      {/* Texture Grain Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')`,
        }}
      />

      {/* Header Widget */}
      <div className="flex items-end justify-between px-6 py-5 border-b-[0.5px] border-[#E5E2DC] bg-[#FAF8F5]">
        <div>
          <h2 className="font-['Cormorant_Garamond'] text-2xl font-semibold tracking-wide text-[#3A332C]">
            Schedule Overview
          </h2>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#8A7D70] mt-1">
            Timeline reservasi untuk 7 hari ke depan.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto [scrollbar-width:thin]">
        <div className="relative w-fit min-w-full">
          {/* --- X-AXIS: HEADER JAM --- */}
          <div className="flex border-b-[0.5px] border-[#E5E2DC] bg-[#FAF8F5]">
            <div
              className="sticky left-0 z-20 shrink-0 border-r-[0.5px] border-[#E5E2DC] bg-[#FAF8F5]"
              style={{ width: Y_AXIS_WIDTH }}
            />
            <div className="flex relative">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="shrink-0 relative py-2.5"
                  style={{ width: i === hours.length - 1 ? 0 : HOUR_WIDTH }}
                >
                  <span className="absolute -left-3 font-['Plus_Jakarta_Sans'] text-[10px] font-semibold text-[#8A7D70]">
                    {h.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* --- Y-AXIS: BARIS TANGGAL --- */}
          {days.map((day) => {
            const dateStr = day.toString();
            const dayEvents = eventsByDate.get(dateStr) || [];
            const isToday = day.compare(currentDate) === 0;
            const nativeDate = day.toDate(getLocalTimeZone());

            return (
              <div
                key={dateStr}
                className="flex border-b-[0.5px] border-[#E5E2DC] last:border-b-0 group"
              >
                {/* Kolom Tanggal (Sumbu Y) */}
                <div
                  className="sticky left-0 z-10 shrink-0 flex flex-col justify-center gap-0.5 border-r-[0.5px] border-[#E5E2DC] bg-white px-5 py-5 transition-colors group-hover:bg-[#FAF8F5]"
                  style={{ width: Y_AXIS_WIDTH }}
                >
                  <span className="font-['Plus_Jakarta_Sans'] text-[9px] font-bold uppercase tracking-widest text-[#A69C90]">
                    {dayFormatter.format(nativeDate)}
                  </span>
                  <span
                    className={cn(
                      "font-['Raleway'] text-sm font-semibold tracking-wide",
                      isToday ? "text-[#A67C52]" : "text-[#4A3F35]",
                    )}
                  >
                    {dateFormatter.format(nativeDate)}
                  </span>
                </div>

                {/* Timeline Grid & Blok Event */}
                <div
                  className="relative bg-white"
                  style={{ width: TOTAL_HOURS * HOUR_WIDTH }}
                >
                  {/* Garis Vertikal per Jam */}
                  {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute bottom-0 top-0 border-r-[0.5px] border-dashed border-[#E5E2DC]/70"
                      style={{ left: (i + 1) * HOUR_WIDTH }}
                    />
                  ))}

                  {/* Render Event / Booking */}
                  {dayEvents.map((event) => {
                    const [hourStr, minStr] = event.startTime.split(":");
                    const eventTime = new Time(
                      parseInt(hourStr, 10),
                      parseInt(minStr, 10),
                    );
                    const gridStart = new Time(START_HOUR, 0);

                    const minutesFromStart =
                      (eventTime.hour - gridStart.hour) * 60 +
                      (eventTime.minute - gridStart.minute);

                    if (
                      minutesFromStart < 0 ||
                      minutesFromStart > TOTAL_HOURS * 60
                    )
                      return null;

                    const leftPx = minutesFromStart * MINUTE_WIDTH;
                    const widthPx = event.durationMinutes * MINUTE_WIDTH;
                    const endTimeStr = getEndTime(
                      event.startTime,
                      event.durationMinutes,
                    );

                    return (
                      <div
                        key={event.id}
                        className="absolute z-20 top-3 bottom-3 overflow-hidden cursor-pointer hover:z-30 transition-shadow hover:shadow-md rounded-md"
                        style={{
                          left: leftPx + 1, // +1 agar tidak menimpa garis grid
                          width: widthPx - 2, // -2 agar ada jarak antar event yang berdekatan
                        }}
                      >
                        {/* Wrapper Card dengan warna dinamis sesuai status */}
                        <div
                          className={cn(
                            "absolute inset-0 flex items-center px-2.5 border-[0.5px] border-l-2",
                            getBlockStyles(event.status),
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            {/* Icon Layanan */}
                            <div className="shrink-0 opacity-80">
                              {getServiceIcon(event.category)}
                            </div>

                            {/* Detail Data */}
                            <div className="flex flex-col min-w-0">
                              {/* Jam Mulai - Selesai */}
                              <span className="font-mono text-[9.5px] font-medium leading-none opacity-80 mb-0.5 whitespace-nowrap">
                                {event.startTime} - {endTimeStr}
                              </span>
                              {/* Nama Klien */}
                              <span className="truncate font-['Plus_Jakarta_Sans'] text-xs font-semibold leading-tight">
                                {event.guestName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
