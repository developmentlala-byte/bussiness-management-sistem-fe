import {
  CalendarCheck,
  Receipt,
  Users,
  Storefront,
  Tag,
  Crown,
  SquaresFour,
  Ticket,
  Gear,
  CreditCard,
  Bell,
  ShieldCheck,
  Globe,
} from "@phosphor-icons/react";

const SIDEBAR_DATA = {
  user: {
    name: "Skyleen",
    email: "skyleen@example.com",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Aidan",
  },
  navMain: [
    {
      title: "Master Data",
      url: "#",
      icon: SquaresFour,
      isActive: false,
      items: [
        {
          title: "Produk & Layanan",
          url: "/master/product-&-layanan",
          icon: Storefront,
        },
        {
          title: "Ruangan & Resource",
          url: "/master/resources",
          icon: Storefront,
        },
        { title: "Karyawan", url: "/master/karyawan", icon: Users },
        { title: "Bundle Promo", url: "/master/bundle-promo", icon: Tag },
        { title: "Voucher", url: "/master/voucher", icon: Ticket },
        { title: "Paket Membership", url: "/master/membership", icon: Crown },
        // dipindah ke "Pengaturan" — lihat catatan di bawah
      ],
    },
    {
      title: "Transaksi",
      url: "#",
      icon: Receipt,
      isActive: true,
      items: [{ title: "Pembayaran", url: "/payment" }],
    },
    {
      title: "Reservasi",
      url: "#",
      icon: CalendarCheck,
      isActive: true,
      items: [
        { title: "Daftar Booking", url: "/reservasi/booking" },
        { title: "Jadwal Theraphis", url: "/reservasi/theraphis" },
        { title: "Daftar Membership", url: "/keanggotaan" },
      ],
    },
    {
      title: "Pelanggan",
      url: "#",
      icon: Users,
      isActive: true,
      items: [{ title: "Semua Pelanggan", url: "/pelanggan" }],
    },
    {
      title: "Booking Online",
      url: "https://spa.mahalu.group",
      icon: Globe,
      isActive: true,
    },
    {
      title: "Pengaturan",
      url: "#",
      icon: Gear,
      isActive: false,
      items: [
        { title: "Profil Bisnis", url: "/settings/company", icon: Storefront },
        {
          title: "Integrasi Pembayaran",
          url: "/settings/payment-integration",
          icon: CreditCard,
        },
        { title: "Notifikasi", url: "/settings/notifications", icon: Bell },
        {
          title: "Manajemen User",
          url: "/settings/users",
          icon: Users,
        },
      ],
    },
  ],
};

export default SIDEBAR_DATA;
