export function formatDate(
  dateInput: string | Date,
  {
    withTime = false,
    simpleFormat = false,
    dateStyle,
  }: {
    withTime?: boolean;
    simpleFormat?: boolean;
    dateStyle?: "short" | "medium" | "long" | "full";
  } = {},
) {
  if (!dateInput) return "-";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  if (dateStyle) {
    return new Intl.DateTimeFormat("id-ID", { dateStyle }).format(date);
  }

  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const namaHari = hari[date.getDay()];
  const namaBulan = bulan[date.getMonth()];
  const tanggal = String(date.getDate()).padStart(2, "0");
  const tahun = date.getFullYear();
  const jam = String(date.getHours()).padStart(2, "0");
  const menit = String(date.getMinutes()).padStart(2, "0");

  if (simpleFormat && withTime) {
    return `${tanggal} ${namaBulan} ${tahun} Pukul ${jam}:${menit}`;
  }

  // 📅 tanggal + jam
  if (withTime) {
    return `${namaHari}, ${tanggal} ${namaBulan} ${tahun} Pukul ${jam}:${menit}`;
  }

  // 📅 tanggal saja
  return `${namaHari}, ${tanggal} ${namaBulan} ${tahun}`;
}

const WALL_CLOCK_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

export function parseWallClockDate(dateInput: string | Date): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const inputStr = String(dateInput);

  // If the string contains an explicit timezone (Z or +HH[:MM] / -HH[:MM]),
  // let the JS Date parser handle it so the resulting Date reflects the
  // correct absolute moment in time.
  if (/[zZ]|[+\-]\d{2}(:\d{2})?/.test(inputStr)) {
    const parsed = new Date(inputStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = WALL_CLOCK_DATE_TIME_RE.exec(inputStr);
  if (match) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] =
      match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  const parsed = new Date(inputStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatWallClockDate(
  dateInput: string | Date,
  options?: Parameters<typeof formatDate>[1],
) {
  const parsed = parseWallClockDate(dateInput);
  if (!parsed) return "-";
  return formatDate(parsed, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// DURATION FORMATTING
// ─────────────────────────────────────────────────────────────────────────────
//
// Sumber durasi bisa dalam 2 bentuk tergantung tempat pemanggilannya:
//  - menit bulat (mis. duration_minutes dari booking)
//  - jam desimal (mis. hasil penjumlahan beberapa booking / 60, jadi pecahan
//    kayak 1.9166666666667)
// Fungsi ini menerima keduanya lewat `unit`, lalu selalu mengeluarkan format
// yang sama: "55m" untuk di bawah 1 jam, "1j 55m" untuk di atas 1 jam, atau
// "2j" kalau pas genap tanpa sisa menit.
export function formatDuration(
  value: number,
  unit: "minutes" | "hours" = "minutes",
): string {
  if (!value || value <= 0) return "-";

  const totalMinutes = Math.round(unit === "hours" ? value * 60 : value);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}j`;
  return `${hours}j ${minutes}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE + DURATION — dipakai di kolom "Jadwal / Tipe" pada tabel booking.
// Menggabungkan tanggal, jam mulai, dan durasi dalam 1 baris rapi:
// "16 Jul 2026 · 19:00 · 1j 55m"
// ─────────────────────────────────────────────────────────────────────────────
export function formatScheduleWithDuration(
  dateInput: string | Date,
  durationValue: number,
  durationUnit: "minutes" | "hours" = "minutes",
): { dateLabel: string; timeLabel: string; durationLabel: string } {
  const parsed = parseWallClockDate(dateInput);

  if (!parsed) {
    return { dateLabel: "-", timeLabel: "-", durationLabel: "-" };
  }

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);

  const timeLabel = `${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;

  const durationLabel = formatDuration(durationValue, durationUnit);

  return { dateLabel, timeLabel, durationLabel };
}
