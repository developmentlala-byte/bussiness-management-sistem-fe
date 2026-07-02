import {
  CalendarCheck,
  Receipt,
  Users,
  Storefront,
  Tag,
  Crown,
  SquaresFour,
  Ticket,
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
        { title: "Karyawan", url: "/master/karyawan", icon: Users },
        { title: "Bundle Promo", url: "/master/bundle-promo", icon: Tag },
        { title: "Voucher", url: "/master/voucher", icon: Ticket },
        { title: "Paket Membership", url: "/master/membership", icon: Crown },
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
  ],
};

export default SIDEBAR_DATA;
