import {
  BookOpen,
  BoundingBox,
  CalendarCheckIcon,
  ChartPieSlice,
  Command,
  Faders,
  Robot,
  Stack,
  TerminalWindow,
  Users,
  Waveform,
} from "@phosphor-icons/react";

const SIDEBAR_DATA = {
  user: {
    name: "Skyleen",
    email: "skyleen@example.com",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Aidan",
  },
  teams: [
    { name: "Acme Inc", logo: Stack, plan: "Perusahaan" },
    { name: "Acme Corp.", logo: Waveform, plan: "Syarikat Pemula" },
    { name: "Evil Corp.", logo: Command, plan: "Percuma" },
  ],
  navMain: [
    {
      title: "Reservasi",
      url: "#",
      icon: CalendarCheckIcon,
      isActive: true,
      items: [
        { title: "Daftar Booking", url: "/reservasi/booking" },
        { title: "Kalender Jadwal", url: "/reservasi/calendar" },
        { title: "Buat Booking", url: "/reservasi/create" },
      ],
    },
    {
      title: "Pelanggan",
      url: "/pelanggan",
      icon: Users,
    },
    {
      title: "Dokumentasi",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Pengenalan", url: "#" },
        { title: "Mula Menggunakan", url: "#" },
        { title: "Tutorial", url: "#" },
      ],
    },
    {
      title: "Tetapan",
      url: "#",
      icon: Faders,
      items: [
        { title: "Umum", url: "#" },
        { title: "Pasukan", url: "#" },
      ],
    },
  ],
  projects: [
    { name: "Kejuruteraan Reka Bentuk", url: "#", icon: BoundingBox },
    { name: "Jualan & Pemasaran", url: "#", icon: ChartPieSlice },
  ],
};

export default SIDEBAR_DATA;
