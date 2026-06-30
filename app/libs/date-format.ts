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

  const match = WALL_CLOCK_DATE_TIME_RE.exec(dateInput);
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

  const parsed = new Date(dateInput);
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
