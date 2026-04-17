"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Dropdown, Label, Separator, Header, Button } from "@heroui/react";
import {
  CaretRight,
  CaretUpDown,
  DotsThree,
  List,
  PushPin,
  PushPinSlash,
  Check,
  Plus,
  Gear,
  UserCircle,
  CreditCard,
  SignOut,
  Sparkle,
  Question, // Ikon untuk butang Tour
} from "@phosphor-icons/react";
import SIDEBAR_DATA from "../data/sidebar-data";
import BreadcrumbTrail, { generateBreadcrumbs } from "./breadcrumb-trail";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../libs/use-user";
import { useAppTour } from "../libs/use-app-tour";

// ==========================================
// 1. KONTEKS GLOBAL & HOOK LAYOUT
// ==========================================
interface SidebarContextType {
  isExpanded: boolean;
  isPinned: boolean;
  setIsPinned: (val: boolean) => void;
  hoveredMenu: string;
  setHoveredMenu: (val: string) => void;
  activeMenu: string;
  setActiveMenu: (val: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within Provider");
  return context;
};

// ==========================================
// 2. ITEM MENU SIDEBAR
// ==========================================
const SidebarItem = ({
  item,
  parentId,
  staggerIdx,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  parentId: string;
  staggerIdx: number;
}) => {
  const { isExpanded, hoveredMenu, setHoveredMenu, activeMenu, setActiveMenu } =
    useSidebar();
  const router = useRouter(); // Tambahan: Inisialisasi router di sini

  const [isOpen, setIsOpen] = useState(item.isActive || false);
  const isMainProminent = hoveredMenu === parentId || activeMenu === parentId;

  return (
    <div className="flex flex-col">
      <div
        className="relative cursor-pointer py-0.5 group outline-none"
        onMouseEnter={() => setHoveredMenu(parentId)}
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveMenu(parentId);
          // Jika item utama punya URL dan tidak punya sub-menu, navigasi di sini
          if (item.url && !item.items) {
            router.push("/dashboard" + item.url);
          }
        }}
      >
        <div
          data-nav-id={parentId}
          className={`relative z-10 flex items-center w-full py-2.5 rounded-lg transition-colors duration-300
            ${
              isMainProminent
                ? "text-foreground font-medium"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
        >
          <div className="w-[48px] flex items-center justify-center shrink-0">
            {item.icon && (
              <item.icon
                className="w-5 h-5"
                weight={isMainProminent ? "fill" : "regular"}
              />
            )}
          </div>

          <div
            className={`grid css-grid-transition flex-1 ${
              isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
            }`}
          >
            <div className="overflow-hidden whitespace-nowrap w-full">
              <div
                className="flex items-center justify-between pr-2 w-full"
                style={{
                  transform: isExpanded
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(0, 15px, 0)",
                  opacity: isExpanded ? 1 : 0,
                  transition: `transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                    isExpanded ? staggerIdx * 0.03 : 0
                  }s, opacity 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                    isExpanded ? staggerIdx * 0.03 : 0
                  }s`,
                  willChange: "transform, opacity",
                }}
              >
                <span className="text-sm">{item.title}</span>
                {item.items && (
                  <CaretRight
                    className={`w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`grid css-grid-transition ${
          isOpen && isExpanded && item.items
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-[44px] pr-2 py-1 flex flex-col relative mt-1">
            <div className="absolute left-[24px] top-1 bottom-1 w-px bg-border" />

            {item.items &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              item.items.map((subItem: any, idx: number) => {
                const subId = `${parentId}-sub-${idx}`;
                const isSubProminent =
                  hoveredMenu === subId || activeMenu === subId;

                return (
                  <div
                    key={idx}
                    className="relative cursor-pointer py-0.5 group/sub"
                    onMouseEnter={() => setHoveredMenu(subId)}
                    onClick={() => {
                      setActiveMenu(subId);
                      // PERBAIKAN: Menambahkan navigasi asli
                      router.push("/dashboard" + subItem.url);
                    }}
                  >
                    <div
                      data-nav-id={subId}
                      className={`relative z-10 block text-sm py-1.5 px-3 rounded-md transition-colors duration-300 whitespace-nowrap
                      ${
                        isSubProminent
                          ? "text-foreground font-medium"
                          : "text-muted-foreground group-hover/sub:text-foreground"
                      }`}
                    >
                      {subItem.title}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. SUSUN ATUR UTAMA (SIDEBAR & HEADER)
// ==========================================
export default function Sidebar({ children }: { children?: ReactNode }) {
  const asideRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [isPinned, setIsPinned] = useState(false);
  const [isHoveredSidebar, setIsHoveredSidebar] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(SIDEBAR_DATA.teams[0]);

  const isExpanded = isPinned || isHoveredSidebar || isMobileOpen;

  const [activeMenu, setActiveMenu] = useState("main-0");
  const [hoveredMenu, setHoveredMenu] = useState("main-0");
  const [isPillReady, setIsPillReady] = useState(false);

  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const { startTour } = useAppTour(() => {
    setIsPinned(true);
  });

  const updatePillPosition = useCallback(() => {
    if (!asideRef.current || !pillRef.current) return;

    let targetId = hoveredMenu;

    if (!isExpanded && targetId.includes("-sub-")) {
      targetId = targetId.split("-sub-")[0];
    }

    const targetEl = asideRef.current.querySelector(
      `[data-nav-id="${targetId}"]`,
    );

    if (targetEl) {
      const asideRect = asideRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      if (targetRect.width === 0 && targetRect.height === 0) {
        pillRef.current.style.opacity = "0";
        return;
      }

      const x = targetRect.left - asideRect.left;
      const y = targetRect.top - asideRect.top;

      pillRef.current.style.opacity = "1";
      pillRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      pillRef.current.style.width = `${targetRect.width}px`;
      pillRef.current.style.height = `${targetRect.height}px`;
    } else {
      pillRef.current.style.opacity = "0";
    }
  }, [hoveredMenu, isExpanded]);

  useEffect(() => {
    updatePillPosition();
  }, [hoveredMenu, updatePillPosition]);

  useEffect(() => {
    let frameId: number;
    const startTime = performance.now();
    const duration = 500;

    const loop = (time: number) => {
      updatePillPosition();
      if (time - startTime < duration) {
        frameId = requestAnimationFrame(loop);
      }
    };
    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [activeMenu, isExpanded, updatePillPosition]);

  useEffect(() => {
    if (!isPillReady) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsPillReady(true));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isPillReady]);

  useEffect(() => {
    if (!asideRef.current) return;
    const observer = new ResizeObserver(() => updatePillPosition());
    observer.observe(asideRef.current);
    return () => observer.disconnect();
  }, [updatePillPosition]);

  useEffect(() => {
    const handleResize = () => setIsMobileOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentBreadcrumbs = generateBreadcrumbs(activeMenu, activeTeam.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTeamSelection = (key: any) => {
    const idx = parseInt(key as string);
    if (!isNaN(idx)) {
      setActiveTeam(SIDEBAR_DATA.teams[idx]);
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .css-grid-transition {
          transition: 
            grid-template-columns 0.5s cubic-bezier(0.2, 0.9, 0.3, 1),
            grid-template-rows 0.5s cubic-bezier(0.2, 0.9, 0.3, 1),
            opacity 0.4s ease;
        }
                
        .fluid-pill-transition {
          transition: 
            transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1),
            width 0.5s cubic-bezier(0.2, 0.9, 0.3, 1),
            height 0.5s cubic-bezier(0.2, 0.9, 0.3, 1),
            opacity 0.3s ease;
          will-change: transform, width, height, opacity;
        }

        @keyframes fadeInUpStagger {
          0% { opacity: 0; transform: translate3d(0, 15px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        
        .animate-stagger-item {
          opacity: 0;
          animation: fadeInUpStagger 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        }
      `,
        }}
      />

      <SidebarContext.Provider
        value={{
          isExpanded,
          isPinned,
          setIsPinned,
          hoveredMenu,
          setHoveredMenu,
          activeMenu,
          setActiveMenu,
        }}
      >
        <div className="flex h-screen w-full bg-background font-sans text-foreground overflow-hidden">
          <div
            onClick={() => setIsMobileOpen(false)}
            className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden transition-opacity duration-500 ease-in-out
              ${
                isMobileOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
          />

          <aside
            ref={asideRef}
            onMouseEnter={() => setIsHoveredSidebar(true)}
            onMouseLeave={() => {
              setIsHoveredSidebar(false);
              setHoveredMenu(activeMenu);
            }}
            className={`fixed md:relative z-50 h-full flex flex-col border-r border-border bg-background shadow-sm overflow-hidden
              transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)]
              ${
                isMobileOpen
                  ? "translate-x-0"
                  : "-translate-x-full md:translate-x-0"
              }`}
            style={{
              width: isExpanded ? "280px" : "80px",
            }}
          >
            <div
              ref={pillRef}
              className={`absolute z-0 pointer-events-none bg-accent border border-border/50 shadow-sm rounded-lg
                ${isPillReady ? "fluid-pill-transition" : ""}`}
              style={{ opacity: 0 }}
            />

            <div className="p-4 flex items-center h-16 shrink-0 border-b border-border relative z-20">
              <div className="flex-1 min-w-0">
                <Dropdown className="min-w-[260px] w-full p-1 bg-background border border-border shadow-lg rounded-xl">
                  <Dropdown.Trigger className="w-full">
                    <div
                      className="w-full relative cursor-pointer py-0.5 group outline-none border-none bg-transparent text-left"
                      onMouseEnter={() => setHoveredMenu("header-team")}
                      onClick={() => setActiveMenu("header-team")}
                    >
                      <div
                        data-nav-id="header-team"
                        className={`relative z-10 flex items-center w-full py-1.5 rounded-lg transition-colors duration-200
                        ${
                          hoveredMenu === "header-team" ||
                          activeMenu === "header-team"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        <div className="w-[48px] flex items-center justify-center shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground shadow-sm">
                            <activeTeam.logo
                              className="w-4 h-4"
                              weight="bold"
                            />
                          </div>
                        </div>

                        <div
                          className={`grid css-grid-transition flex-1 ${
                            isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden whitespace-nowrap w-full">
                            <div
                              className="flex items-center justify-between pr-2 w-full"
                              style={{
                                transform: isExpanded
                                  ? "translate3d(0, 0, 0)"
                                  : "translate3d(0, 10px, 0)",
                                opacity: isExpanded ? 1 : 0,
                                transition:
                                  "transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)",
                                willChange: "transform, opacity",
                              }}
                            >
                              <div className="flex flex-col items-start overflow-hidden">
                                <span className="text-sm font-semibold truncate text-left">
                                  {activeTeam.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate text-left font-normal">
                                  {activeTeam.plan}
                                </span>
                              </div>
                              <CaretUpDown className="w-4 h-4 shrink-0 text-muted-foreground ml-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu
                      onAction={handleTeamSelection}
                      aria-label="Team Selection Menu"
                    >
                      <Dropdown.Section>
                        <Header className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-2">
                          Pasukan Anda
                        </Header>
                        {SIDEBAR_DATA.teams.map((team, idx) => (
                          <Dropdown.Item
                            key={idx.toString()}
                            id={idx.toString()}
                            textValue={team.name}
                            className="py-2 px-2 lg:pe-4 hover:bg-accent rounded-md transition-colors"
                          >
                            <div className="flex items-center flex-1 gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary">
                                <team.logo className="w-4 h-4" weight="fill" />
                              </div>
                              <div className="flex flex-col flex-1">
                                <Label className="font-medium text-sm cursor-pointer">
                                  {team.name}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {team.plan}
                                </span>
                              </div>
                              {activeTeam.name === team.name && (
                                <Check
                                  className="w-4 h-4 text-primary"
                                  weight="bold"
                                />
                              )}
                            </div>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Section>
                      <Separator className="my-1 border-border/50" />
                      <Dropdown.Section>
                        <Dropdown.Item
                          id="create-team"
                          textValue="Cipta Pasukan"
                          className="py-2 hover:bg-accent rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                            <Label className="cursor-pointer text-sm font-medium">
                              Cipta Pasukan Baharu
                            </Label>
                          </div>
                        </Dropdown.Item>
                        <Dropdown.Item
                          id="manage-teams"
                          textValue="Urus Pasukan"
                          className="py-2 hover:bg-accent rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Gear className="w-4 h-4 text-muted-foreground" />
                            <Label className="cursor-pointer text-sm font-medium">
                              Urus Pasukan
                            </Label>
                          </div>
                        </Dropdown.Item>
                      </Dropdown.Section>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>

              {/* TARGET TOUR #2: BUTANG PIN */}
              <div
                className={`grid css-grid-transition shrink-0 ${
                  isExpanded
                    ? "grid-cols-[1fr] opacity-100"
                    : "grid-cols-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden flex justify-end w-fit pl-1">
                  <button
                    id="tour-pin-button"
                    onClick={() => setIsPinned(!isPinned)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors duration-200 shrink-0"
                    title={isPinned ? "Nyahsemat Sidebar" : "Semat Sidebar"}
                  >
                    {isPinned ? (
                      <PushPinSlash className="w-4 h-4" weight="fill" />
                    ) : (
                      <PushPin className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <nav
              onScroll={updatePillPosition}
              className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 flex flex-col gap-6 relative z-10"
            >
              <div>
                <div
                  className={`grid css-grid-transition ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100 mb-2"
                      : "grid-rows-[0fr] opacity-0 mb-0"
                  }`}
                >
                  <h4 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden">
                    Platform
                  </h4>
                </div>
                <div className="flex flex-col gap-1">
                  {SIDEBAR_DATA.navMain.map((item, idx) => (
                    <div
                      key={idx}
                      className="animate-stagger-item"
                      style={{ animationDelay: `${idx * 0.04}s` }}
                    >
                      <SidebarItem
                        item={item}
                        parentId={`main-${idx}`}
                        staggerIdx={idx}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div
                  className={`grid css-grid-transition ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100 mb-2"
                      : "grid-rows-[0fr] opacity-0 mb-0"
                  }`}
                >
                  <h4 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden">
                    Projek
                  </h4>
                </div>
                <div className="flex flex-col gap-1">
                  {SIDEBAR_DATA.projects.map((project, idx) => {
                    const projId = `proj-${idx}`;
                    const isProjProminent =
                      hoveredMenu === projId || activeMenu === projId;
                    const staggerDelayIdx = SIDEBAR_DATA.navMain.length + idx;

                    return (
                      <div
                        key={idx}
                        className="animate-stagger-item relative cursor-pointer py-0.5 group outline-none"
                        style={{ animationDelay: `${staggerDelayIdx * 0.04}s` }}
                        onMouseEnter={() => setHoveredMenu(projId)}
                        onClick={() => {
                          setActiveMenu(projId);
                          // PERBAIKAN: Menambahkan navigasi asli untuk Projek
                          router.push("/dashboard" + project.url);
                        }}
                      >
                        <div
                          data-nav-id={projId}
                          className={`relative z-10 flex items-center w-full py-2.5 rounded-lg transition-colors duration-200
                          ${
                            isProjProminent
                              ? "text-foreground font-medium"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <div className="w-[48px] flex items-center justify-center shrink-0">
                            <project.icon
                              className="w-5 h-5"
                              weight={isProjProminent ? "fill" : "regular"}
                            />
                          </div>

                          <div
                            className={`grid css-grid-transition flex-1 ${
                              isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden whitespace-nowrap w-full">
                              <div
                                className="w-full"
                                style={{
                                  transform: isExpanded
                                    ? "translate3d(0, 0, 0)"
                                    : "translate3d(0, 15px, 0)",
                                  opacity: isExpanded ? 1 : 0,
                                  transition: `transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                                    isExpanded ? staggerDelayIdx * 0.03 : 0
                                  }s, opacity 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                                    isExpanded ? staggerDelayIdx * 0.03 : 0
                                  }s`,
                                  willChange: "transform, opacity",
                                }}
                              >
                                <span className="text-sm">{project.name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="animate-stagger-item relative cursor-pointer py-0.5 group outline-none"
                    style={{
                      animationDelay: `${
                        (SIDEBAR_DATA.navMain.length +
                          SIDEBAR_DATA.projects.length) *
                        0.04
                      }s`,
                    }}
                    onMouseEnter={() => setHoveredMenu("proj-more")}
                    onClick={() => setActiveMenu("proj-more")}
                  >
                    <div
                      data-nav-id="proj-more"
                      className={`relative z-10 flex items-center w-full py-2.5 rounded-lg transition-colors duration-200
                      ${
                        hoveredMenu === "proj-more" ||
                        activeMenu === "proj-more"
                          ? "text-foreground font-medium"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <div className="w-[48px] flex items-center justify-center shrink-0">
                        <span className="flex items-center justify-center w-5 h-5 rounded bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground transition-colors">
                          <DotsThree className="w-4 h-4" weight="bold" />
                        </span>
                      </div>
                      <div
                        className={`grid css-grid-transition flex-1 ${
                          isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden whitespace-nowrap w-full">
                          <div
                            className="w-full"
                            style={{
                              transform: isExpanded
                                ? "translate3d(0, 0, 0)"
                                : "translate3d(0, 15px, 0)",
                              opacity: isExpanded ? 1 : 0,
                              transition: `transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                                isExpanded
                                  ? (SIDEBAR_DATA.navMain.length +
                                      SIDEBAR_DATA.projects.length) *
                                    0.03
                                  : 0
                              }s, opacity 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${
                                isExpanded
                                  ? (SIDEBAR_DATA.navMain.length +
                                      SIDEBAR_DATA.projects.length) *
                                    0.03
                                  : 0
                              }s`,
                              willChange: "transform, opacity",
                            }}
                          >
                            <span className="text-sm">Lagi</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            {/* TARGET TOUR #3: DROPDOWN PENGGUNA */}
            <div className="p-4 border-t border-border relative z-20 w-full">
              <Dropdown className="min-w-[260px] p-1 bg-background border border-border shadow-lg rounded-xl mb-2">
                <Dropdown.Trigger className="w-full">
                  <div
                    id="tour-user-dropdown"
                    className="relative w-full block cursor-pointer py-0.5 group outline-none border-none bg-transparent text-left"
                    onMouseEnter={() => setHoveredMenu("footer-user")}
                    onClick={() => setActiveMenu("footer-user")}
                  >
                    <div
                      data-nav-id="footer-user"
                      className={`relative z-10 flex items-center w-full py-1.5 rounded-lg transition-colors duration-200
                      ${
                        hoveredMenu === "footer-user" ||
                        activeMenu === "footer-user"
                          ? "text-foreground font-medium"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <div className="w-[48px] flex items-center justify-center shrink-0">
                        <img
                          src={SIDEBAR_DATA.user.avatar}
                          alt="User"
                          className="w-9 h-9 rounded-md border border-border shrink-0 object-cover"
                        />
                      </div>

                      <div
                        className={`grid css-grid-transition flex-1 ${
                          isExpanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden whitespace-nowrap w-full">
                          <div
                            className="flex items-center justify-between pr-2 w-full"
                            style={{
                              transform: isExpanded
                                ? "translate3d(0, 0, 0)"
                                : "translate3d(0, 10px, 0)",
                              opacity: isExpanded ? 1 : 0,
                              transition:
                                "transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) 0.1s, opacity 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) 0.1s",
                              willChange: "transform, opacity",
                            }}
                          >
                            <div className="flex flex-col items-start w-full">
                              <span className="text-sm font-semibold truncate w-full text-left">
                                {user?.name || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground truncate w-full text-left font-normal">
                                {user?.email || "User@gmail.com"}
                              </span>
                            </div>
                            <CaretUpDown className="w-4 h-4 shrink-0 text-muted-foreground ml-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label="User Actions Menu">
                    <Dropdown.Section>
                      <Dropdown.Item
                        id="user-info"
                        textValue="Info Pengguna"
                        className="py-2 cursor-default pointer-events-none opacity-100 mb-1 border-b border-border/50 rounded-none"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={SIDEBAR_DATA.user.avatar}
                            alt="User Avatar"
                            className="w-10 h-10 rounded-full border border-border"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {user?.name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user?.email || "User@gmail.com"}
                            </span>
                          </div>
                        </div>
                      </Dropdown.Item>
                    </Dropdown.Section>

                    <Dropdown.Section>
                      <Dropdown.Item
                        id="upgrade"
                        textValue="Naik Taraf"
                        className="py-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Sparkle
                              className="w-4 h-4 text-amber-500"
                              weight="fill"
                            />
                            <Label className="cursor-pointer text-sm font-medium">
                              Naik Taraf ke Pro
                            </Label>
                          </div>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="profile"
                        textValue="Profil Saya"
                        className="py-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-muted-foreground" />
                          <Label className="cursor-pointer text-sm font-medium">
                            Profil Saya
                          </Label>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="billing"
                        textValue="Pengebilan"
                        className="py-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <Label className="cursor-pointer text-sm font-medium">
                            Pengebilan
                          </Label>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="settings"
                        textValue="Tetapan"
                        className="py-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Gear className="w-4 h-4 text-muted-foreground" />
                          <Label className="cursor-pointer text-sm font-medium">
                            Tetapan Akaun
                          </Label>
                        </div>
                      </Dropdown.Item>
                    </Dropdown.Section>
                    <Separator className="my-1 border-border/50" />
                    <Dropdown.Section>
                      <Dropdown.Item
                        id="logout"
                        textValue="Log Keluar"
                        variant="danger"
                        onClick={handleLogout}
                        className="py-2 hover:bg-danger/10 rounded-md transition-colors group/logout"
                      >
                        <div className="flex items-center gap-2">
                          <SignOut
                            className="w-4 h-4 text-danger"
                            weight="bold"
                          />
                          <Label className="cursor-pointer text-sm font-semibold text-danger">
                            Log Keluar
                          </Label>
                        </div>
                      </Dropdown.Item>
                    </Dropdown.Section>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </aside>

          {/* ================= KANDUNGAN UTAMA ================= */}
          <main className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
            <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 bg-background border-b border-border relative z-10">
              <div className="flex items-center gap-4">
                {/* TARGET TOUR #1: BUTANG TOGGLE SIDEBAR */}
                <button
                  id="tour-sidebar-toggle"
                  onClick={() => {
                    if (window.innerWidth < 768) setIsMobileOpen(true);
                    else setIsPinned(!isPinned);
                  }}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors outline-none"
                >
                  <List className="w-5 h-5" />
                </button>

                <BreadcrumbTrail items={currentBreadcrumbs} />
              </div>

              {/* BUTANG MULA TOUR */}
              <Button
                variant="outline"
                size="sm"
                className="border-border hover:bg-surface-secondary font-medium"
                onClick={startTour}
              >
                <Question className="w-4 h-4 mr-1" /> Bantuan Panduan
              </Button>
            </header>

            <div className="flex-1 overflow-auto p-6">
              {children || (
                <div className="text-muted-foreground max-w-2xl">
                  <h1 className="text-2xl font-bold text-foreground mb-4">
                    Kandungan untuk:{" "}
                    {currentBreadcrumbs[currentBreadcrumbs.length - 1].title}
                  </h1>
                  <p className="mb-4">
                    Sidebar ini direka setanding perisian korporat terkemuka
                    seperti Vercel dan Stripe.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Sila klik butang pin/unpin atau klik pada{" "}
                      {`"Bantuan Panduan"`} di sudut kanan atas untuk mencuba
                      animasi *tour* Driver.js.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarContext.Provider>
    </>
  );
}
