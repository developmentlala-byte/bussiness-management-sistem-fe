import { driver } from "driver.js";
import "driver.js/dist/driver.css"; // Wajib di-import

export const useAppTour = (onStartTour: () => void) => {
  const startTour = () => {
    // Jalankan fungsi (misal: melebarkan sidebar) sebelum tur dimulai
    // agar elemen yang disembunyikan (seperti tombol pin) bisa disorot
    onStartTour();

    // Beri sedikit delay (async) agar sidebar selesai melebar sebelum Driver menghitung posisi
    setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        animate: true, // INI YANG MEMBUAT PERGERAKANNYA MULUS (Tidak patah-patah)
        overlayColor: "rgba(0, 0, 0, 0.75)",
        popoverClass: "driver-theme-luxury", // Class custom CSS kita
        doneBtnText: "Selesai",
        closeBtnText: "Tutup",
        nextBtnText: "Selanjutnya ➔",
        prevBtnText: "⬅ Sebelumnya",
        steps: [
          {
            element: "#tour-sidebar-toggle",
            popover: {
              title: "1. Buka Menu",
              description:
                "Jika Anda menggunakan perangkat Mobile, klik tombol ini untuk membuka atau menutup navigasi Sidebar.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-pin-button",
            popover: {
              title: "2. Sematkan (Pin) Sidebar",
              description:
                "Gunakan tombol Push Pin ini agar Sidebar tetap melebar secara permanen dan tidak tertutup otomatis saat mouse Anda menjauh.",
              side: "right",
              align: "center",
            },
          },
          {
            element: "#tour-user-dropdown",
            popover: {
              title: "3. Pengaturan & Log Keluar",
              description:
                "Klik pada kartu profil Anda di sini untuk membuka menu. Dari menu tersebut Anda dapat mengakses Pengaturan Akun atau menekan tombol Log Keluar (Logout).",
              side: "right",
              align: "end",
            },
          },
        ],
      });

      driverObj.drive();
    }, 300); // 300ms menunggu sidebar terbuka
  };

  return { startTour };
};
