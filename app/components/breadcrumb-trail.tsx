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
  pathname?: string,
): BreadcrumbItemProps[] => {
  const fixUrl = (url?: string) => {
    if (!url || url === "#") return "#";
    if (url.startsWith("http")) return url;
    return "/dashboard" + (url.startsWith("/") ? url : "/" + url);
  };

  if (activeId === "header-team")
    return [{ title: "Ruang Kerja", url: "#" }, { title: activeTeamName }];
  if (activeId === "footer-user")
    return [
      { title: "Profil Pengguna", url: "#" },
      { title: SIDEBAR_DATA.user.name },
    ];
  if (activeId === "proj-more")
    return [{ title: "Projek", url: "#" }, { title: "Semua Projek" }];

  let crumbs: BreadcrumbItemProps[] = [];

  if (activeId.startsWith("main-")) {
    const parts = activeId.split("-");
    const mainIdx = parseInt(parts[1]);
    const mainItem = SIDEBAR_DATA.navMain[mainIdx];
    if (!mainItem) return [];

    crumbs = [
      { title: "Dashboard", url: "/dashboard" },
      { title: mainItem.title, url: fixUrl(mainItem.url) },
    ];

    if (parts.length === 4 && parts[2] === "sub") {
      const subIdx = parseInt(parts[3]);
      const subItem = mainItem.items?.[subIdx];
      if (subItem) crumbs.push({ title: subItem.title, url: fixUrl(subItem.url) });
    }
  } else if (activeId.startsWith("proj-")) {
    const parts = activeId.split("-");
    const projIdx = parseInt(parts[1]);
    const projItem = SIDEBAR_DATA.projects[projIdx];
    if (!projItem) return [];

    crumbs = [
      { title: "Projek", url: "#" },
      { title: projItem.name, url: fixUrl(projItem.url) },
    ];
  } else {
    // Fallback default
    crumbs = [
      { title: "Membina Aplikasi Anda", url: "#" },
      { title: "Halaman Utama" },
    ];
  }

  // Handle dynamic segments from pathname
  if (pathname && crumbs.length > 0) {
    const lastCrumb = crumbs[crumbs.length - 1];
    if (lastCrumb.url && lastCrumb.url !== "#") {
      const baseUrl = lastCrumb.url.split("?")[0];
      if (pathname.startsWith(baseUrl) && pathname !== baseUrl) {
        const remaining = pathname
          .replace(baseUrl, "")
          .split("/")
          .filter(Boolean);
        remaining.forEach((segment) => {
          crumbs.push({ title: decodeURIComponent(segment).replace(/-/g, " ") });
        });
      }
    }
  }

  return crumbs;
};

export default BreadcrumbTrail;
