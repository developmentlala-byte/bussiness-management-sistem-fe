"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Users,
  ClockClockwise,
  Money,
  CaretRight,
  PlusCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import { Description, Dropdown, Header, Label } from "@heroui/react";

import { CreateStaffModal } from "./modal/create-staff-modal";
import { CreateShiftModal } from "./modal/create-shift-modal";
import JamKerjaView from "./components/jam-kerja-view";
import AnggotaStaffView from "./components/anggota-staff-view";
import KehadiranStaffView from "./components/kehadiran-staff-view-redesign";
import StaffCapabilitiesView from "./components/staff-capabilities-view";

const TABS = [
  { id: "kehadiran", label: "Kehadiran", icon: ClockClockwise },
  { id: "staf", label: "Anggota Staf", icon: Users },
  { id: "jam_kerja", label: "Shift Kerja", icon: Clock },
  { id: "capabilities", label: "Kemampuan", icon: Sparkle },
  // { id: "komisi", label: "Aturan Komisi", icon: Money },
];

export default function MasterKaryawanPage() {
  const [activeTab, setActiveTab] = useState("kehadiran");

  // State Modal yang disederhanakan
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDropdownOpen = (id: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenDropdownId(id);
  };

  const handleDropdownClose = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 250);
  };

  return (
    <div
      className="relative flex flex-col w-full"
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        gap: "var(--space-6)",
      }}
    >
      {/* HEADER */}
      <div
        className="flex flex-wrap justify-between items-center"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Manajemen Staf
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
              maxWidth: "36rem",
              lineHeight: 1.6,
            }}
          >
            Pusat kendali operasional karyawan. Atur jadwal kerja mingguan,
            pantau kehadiran, hingga kebijakan komisi.
          </p>
        </div>

        <button
          onClick={() => setIsStaffModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground)",
            borderRadius: "var(--radius-xl)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            opacity: 0.9,
          }}
        >
          <Plus
            weight="bold"
            style={{ width: "var(--icon-sm)", height: "var(--icon-sm)" }}
          />
          <span>Tambah Staf Baru</span>
        </button>
      </div>

      {/* LAYOUT: SIDEBAR + CONTENT */}
      <div className="flex flex-col min-[1080px]:flex-row gap-6 min-[1080px]:gap-8 flex-1 min-h-0">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full min-[1080px]:w-64 shrink-0 relative ">
          <div className="min-[1080px]:sticky min-[1080px]:top-6 space-y-2">
            <h2 className="hidden min-[1080px]:block text-[11px] font-extrabold text-muted uppercase tracking-wider px-2 mb-3">
              Menu Navigasi
            </h2>

            {/* Grid 3 kolom untuk Mobile (Ikon & Teks Tengah), Kolom Vertikal untuk Desktop */}
            <div className="grid grid-cols-3 min-[1080px]:flex min-[1080px]:flex-col gap-2 w-full">
              {TABS.map((tab, i) => {
                const index = i + 1;
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex flex-col min-[1080px]:flex-row items-center justify-center min-[1080px]:justify-between p-2.5 min-[1080px]:px-4 min-[1080px]:py-3.5 rounded-xl min-[1080px]:rounded-2xl transition-all outline-none border ${
                      isActive
                        ? "bg-accent border-accent text-accent-foreground shadow-sm"
                        : "bg-surface min-[1080px]:bg-transparent border-border/50 min-[1080px]:border-transparent text-muted hover:text-foreground hover:bg-surface-secondary/60"
                    }`}
                  >
                    <div className="flex flex-col min-[1080px]:flex-row items-center gap-1 min-[1080px]:gap-3 pointer-events-none">
                      <Icon
                        className="size-5 min-[1080px]:w-[18px] min-[1080px]:h-[18px]"
                        weight={isActive ? "fill" : "bold"}
                      />
                      <span className="text-[10px] min-[1080px]:text-sm font-semibold text-center mt-0.5 min-[1080px]:mt-0">
                        {tab.label}
                      </span>
                    </div>

                    {/* Aksi Dropdown: Hanya tampil di Desktop */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={() => handleDropdownOpen(index)}
                      onMouseLeave={handleDropdownClose}
                      className="hidden min-[1080px]:block ml-2 shrink-0"
                    >
                      <Dropdown isOpen={openDropdownId === index}>
                        <Dropdown.Trigger>
                          <div
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isActive ? "hover:bg-black/15" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                          >
                            <CaretRight
                              className={`w-4 h-4 ${isActive ? "text-accent-foreground" : "text-muted"}`}
                            />
                          </div>
                        </Dropdown.Trigger>
                        <Dropdown.Popover
                          placement="right top"
                          className="z-50 min-w-[220px] rounded-2xl border border-border shadow-xl"
                          onMouseEnter={() => handleDropdownOpen(index)}
                          onMouseLeave={handleDropdownClose}
                        >
                          <Dropdown.Menu
                            aria-label={`Aksi Menu ${tab.label}`}
                            onAction={(key) => {
                              if (key === "create_staff")
                                setIsStaffModalOpen(true);
                              if (key === "create_shift")
                                setIsShiftModalOpen(true);
                              handleDropdownClose();
                            }}
                          >
                            <Dropdown.Section>
                              <Header>Actions</Header>
                              <Dropdown.Item
                                id="create_staff"
                                textValue="Create Staff"
                              >
                                <div className="flex h-8 items-start justify-center pt-px mr-2">
                                  <PlusCircle className="w-4 h-4 shrink-0 text-muted" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <Label className="font-bold">
                                    Create Staff
                                  </Label>
                                  <Description className="text-xs">
                                    Tambah staf baru
                                  </Description>
                                </div>
                              </Dropdown.Item>
                              <Dropdown.Item
                                id="create_shift"
                                textValue="Create Shift"
                                hidden
                              >
                                <div className="flex h-8 items-start justify-center pt-px mr-2">
                                  <Clock className="w-4 h-4 shrink-0 text-muted" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <Label className="font-bold">
                                    Create Shift
                                  </Label>
                                  <Description className="text-xs">
                                    Tambah data shift
                                  </Description>
                                </div>
                              </Dropdown.Item>
                            </Dropdown.Section>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 bg-transparent rounded-3xl relative z-10">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {activeTab === "jam_kerja" && <JamKerjaView />}
            {activeTab === "kehadiran" && <KehadiranStaffView />}
            {activeTab === "staf" && <AnggotaStaffView />}
            {activeTab === "capabilities" && <StaffCapabilitiesView />}
            {activeTab === "komisi" && (
              <PlaceholderView
                title="Aturan Komisi"
                desc="Atur pembagian komisi staf."
              />
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isStaffModalOpen && (
        <CreateStaffModal setIsAddStaffOpen={setIsStaffModalOpen} />
      )}
      {isShiftModalOpen && (
        <CreateShiftModal setIsCreateShiftOpen={setIsShiftModalOpen} />
      )}
    </div>
  );
}

// Komponen Helper untuk Placeholder
function PlaceholderView({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-24 border border-dashed border-border/60 rounded-3xl bg-surface-secondary/10 px-4 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-border/20 rounded-full flex items-center justify-center mb-4 sm:mb-5 border border-border/40">
        <ClockClockwise className="w-8 h-8 sm:w-10 sm:h-10 text-muted" />
      </div>
      <h3 className="text-lg sm:text-xl font-extrabold text-foreground">
        {title}
      </h3>
      <p className="text-muted text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium">
        {desc}
      </p>
    </div>
  );
}
