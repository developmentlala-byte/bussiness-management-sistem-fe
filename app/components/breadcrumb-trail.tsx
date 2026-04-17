import { CaretRight } from "@phosphor-icons/react";
import SIDEBAR_DATA from "../data/sidebar-data";
interface BreadcrumbItemProps {
  title: string;
  url?: string;
}
const BreadcrumbTrail = ({ items }: { items: BreadcrumbItemProps[] }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5 sm:gap-2">
              {isLast ? (
                // Item terakhir ditandai dengan aria-current
                <span
                  className="font-semibold text-foreground"
                  aria-current="page"
                >
                  {item.title}
                </span>
              ) : (
                <>
                  <a
                    href={item.url || "#"}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.title}
                  </a>
                  <CaretRight className="w-4 h-4 text-muted-foreground/50" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const generateBreadcrumbs = (
  activeId: string,
  activeTeamName: string,
): BreadcrumbItemProps[] => {
  if (activeId === "header-team")
    return [{ title: "Ruang Kerja", url: "#" }, { title: activeTeamName }];
  if (activeId === "footer-user")
    return [
      { title: "Profil Pengguna", url: "#" },
      { title: SIDEBAR_DATA.user.name },
    ];
  if (activeId === "proj-more")
    return [{ title: "Projek", url: "#" }, { title: "Semua Projek" }];

  if (activeId.startsWith("main-")) {
    const parts = activeId.split("-");
    const mainIdx = parseInt(parts[1]);
    const mainItem = SIDEBAR_DATA.navMain[mainIdx];
    if (!mainItem) return [];

    const crumbs: BreadcrumbItemProps[] = [
      { title: "Dashboard", url: "/dashboard" },
      { title: mainItem.title, url: mainItem.url },
    ];

    if (parts.length === 4 && parts[2] === "sub") {
      const subIdx = parseInt(parts[3]);
      const subItem = mainItem.items?.[subIdx];
      if (subItem) crumbs.push({ title: subItem.title, url: subItem.url });
    }
    return crumbs;
  }

  if (activeId.startsWith("proj-")) {
    const parts = activeId.split("-");
    const projIdx = parseInt(parts[1]);
    const projItem = SIDEBAR_DATA.projects[projIdx];
    if (!projItem) return [];

    return [
      { title: "Projek", url: "#" },
      { title: projItem.name, url: projItem.url },
    ];
  }

  // Fallback default
  return [
    { title: "Membina Aplikasi Anda", url: "#" },
    { title: "Halaman Utama" },
  ];
};

export default BreadcrumbTrail;
