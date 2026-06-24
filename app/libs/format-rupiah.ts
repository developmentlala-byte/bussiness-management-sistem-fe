// export const formatRupiah = (number: string | number) => {
//   if (typeof number === "string") {
//     number = Number(number);
//   }

//   return new Intl.NumberFormat("id-ID", {
//     style: "currency",
//     currency: "IDR",
//     minimumFractionDigits: 0,
//   }).format(number);
// };

// Fungsi untuk memformat angka menjadi string Rupiah (Contoh: "150.000")
export const formatRupiah = (value: number | string): string => {
  if (value === null || value === undefined || value === "") return "";

  const numberValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numberValue)) return "";

  return new Intl.NumberFormat("id-ID").format(numberValue);
};

// Fungsi untuk mengembalikan string Rupiah ke angka murni (Contoh: "150.000" -> 150000)
export const unformatRupiah = (value: string): number => {
  if (!value) return 0;
  return Number(value.replace(/[^0-9]/g, ""));
};
