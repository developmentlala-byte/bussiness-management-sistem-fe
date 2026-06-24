export function formatDate(
  dateInput: string | Date,
  {
    withTime = false,
    simpleFormat = false,
  }: {
    withTime?: boolean;
    simpleFormat?: boolean;
  } = {},
) {
  if (!dateInput) return "-";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  // const { withTime = false, onlyTime = false } = options;

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

  // ⏱️ hanya jam:menit
  // if (onlyTime) {
  //   return `${jam}:${menit}`;
  // }

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
