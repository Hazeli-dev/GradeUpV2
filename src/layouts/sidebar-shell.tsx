import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronsLeft,
  ChevronsRight,
  Megaphone,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { supabase } from "@/lib/supabase";
import { useStudentMembership } from "@/hooks/use-student-membership";
import { cn } from "@/lib/utils";
import type { NavItem, NavGroup } from "@/constants";

// Mendukung navigasi biasa dan navigasi berbasis kategori.
type SidebarNav = NavItem[] | NavGroup[];

interface SidebarShellProps {
  nav: SidebarNav;
  compactMenu?: boolean;
  areaLabel?: string;
  storageKey: string;
  topbarRight: ReactNode;
  sidebarFooter?: ReactNode;
  actionItem?: {
    label: string;
    icon: NavItem["icon"];
    onClick: () => void;
  };
}

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, statis, tidak interaktif)          */
/* ------------------------------------------------------------------ */

/** Latar dekoratif untuk sidebar (desktop dan drawer mobile). */
function SidebarDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/35 blur-3xl dark:bg-emerald-500/15" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-teal-300/45 blur-3xl dark:bg-teal-600/15" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-[radial-gradient(rgba(5,150,105,0.28)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:linear-gradient(to_top,#000,transparent)] dark:bg-[radial-gradient(rgba(110,231,183,0.16)_1px,transparent_1.5px)]" />
      <div className="absolute -right-10 top-1/3 h-32 w-32 rotate-12 rounded-[2rem] border border-emerald-400/30 dark:border-emerald-500/10" />
    </div>
  );
}

/** Ambient glow lembut di area konten dashboard. */
function ContentDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-emerald-300/25 blur-[110px] dark:bg-emerald-500/10" />
      <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-teal-300/20 blur-[110px] dark:bg-teal-600/10" />
    </div>
  );
}

/** Cangkang dashboard dengan sidebar responsif dan navigasi kategori. */
export function SidebarShell({
  nav,
  compactMenu = false,
  areaLabel,
  storageKey,
  topbarRight,
  sidebarFooter,
  actionItem,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const { isPremium } = useStudentMembership();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const location = useLocation();

  // ==========================================
  // NORMALISASI NAVIGASI
  // ==========================================

  const groupedNav = useMemo<NavGroup[]>(() => {
    if (nav.length === 0) return [];

    const firstItem = nav[0];

    if ("items" in firstItem) {
      return nav as NavGroup[];
    }

    return [
      {
        title: "",
        items: nav as NavItem[],
      },
    ];
  }, [nav]);

  // Menyembunyikan menu Upgrade Premium jika akun sudah Premium.
  const visibleNav = useMemo<NavGroup[]>(() => {
    return groupedNav
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const isUpgradeMenu = /upgrade\s*premium/i.test(item.label);
          return !isUpgradeMenu || isPremium === false;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedNav, isPremium]);

  const visibleActionItem =
    actionItem &&
    (!/upgrade\s*premium/i.test(actionItem.label) || isPremium === false)
      ? actionItem
      : undefined;

  const allVisibleItems = useMemo(
    () => visibleNav.flatMap((group) => group.items),
    [visibleNav]
  );

  const current = allVisibleItems.find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
  );

  const unreadCount = useMemo(
    () => announcements.filter((item) => !readIds.includes(item.id)).length,
    [announcements, readIds]
  );

  // ==========================================
  // EFEK SIDEBAR
  // ==========================================

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      // Abaikan jika penyimpanan browser tidak tersedia.
    }
  }, [collapsed, storageKey]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // ==========================================
  // NOTIFIKASI PENGUMUMAN
  // ==========================================

  const loadAnnouncements = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoadingAnnouncements(true);
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setAnnouncements([]);
        setReadIds([]);
        return;
      }

      const [announcementResult, readResult] = await Promise.all([
        supabase
          .from("announcements")
          .select(
            "id, title, content, category, published_at, created_at"
          )
          .eq("status", "Published")
          .not("published_at", "is", null)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false }),

        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id),
      ]);

      if (announcementResult.error) throw announcementResult.error;
      if (readResult.error) throw readResult.error;

      setAnnouncements(
        (announcementResult.data ?? []) as Announcement[]
      );

      setReadIds(
        (readResult.data ?? []).map((item) => item.announcement_id)
      );
    } catch (error) {
      console.error("Gagal memuat pengumuman:", error);

      if (showLoading) {
        toast.error("Gagal memuat notifikasi pengumuman.");
      }
    } finally {
      if (showLoading) {
        setLoadingAnnouncements(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  // Pemeriksaan pengumuman otomatis setiap 30 detik.
  useEffect(() => {
    const notificationInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadAnnouncements(false);
      }
    }, 30000);

    return () => {
      window.clearInterval(notificationInterval);
    };
  }, [loadAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    if (readIds.includes(announcementId)) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) return;

      const { error } = await supabase
        .from("announcement_reads")
        .upsert(
          {
            announcement_id: announcementId,
            user_id: user.id,
          },
          {
            onConflict: "announcement_id,user_id",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;

      setReadIds((previous) =>
        previous.includes(announcementId)
          ? previous
          : [...previous, announcementId]
      );
    } catch (error) {
      console.error("Gagal memperbarui status baca:", error);
      toast.error("Gagal menyimpan status pengumuman.");
    }
  };

  const openAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    void markAsRead(announcement.id);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });
  };

  // ==========================================
  // KOMPONEN MENU SIDEBAR
  // ==========================================

  const links = (isCollapsed: boolean) => (
    <nav
      className="flex-1 space-y-4 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Navigasi utama"
    >
      {visibleNav.map((group, groupIndex) => (
        <div
          key={group.title || `group-${groupIndex}`}
          className={cn(
            compactMenu ? "space-y-0.5" : "space-y-1"
          )}
        >
          {/* Judul kategori */}
          {!isCollapsed && group.title && (
            <div
              className={cn(
                "px-3 pb-2 pt-2 first:pt-0",
                compactMenu && "pb-1.5 pt-1.5"
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-teal-800/70 dark:text-emerald-300/60",
                  compactMenu && "text-[9px] tracking-[0.12em]"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-1 shrink-0 rounded-full bg-emerald-500"
                />
                {group.title}
              </p>
            </div>
          )}

          {/* Item navigasi */}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  compactMenu && "gap-2.5 px-3 py-2 text-xs",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-700/25 ring-1 ring-inset ring-white/15 dark:from-emerald-600 dark:to-teal-600"
                    : "text-slate-600 hover:bg-emerald-100/70 hover:text-teal-800 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-white/90" />
                  )}

                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                      compactMenu && "h-[17px] w-[17px]",
                      !isActive && "group-hover:scale-110"
                    )}
                  />

                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      {/* Tombol Upgrade Premium */}
      {visibleActionItem && (
        <div className="pt-2">
          {!isCollapsed && (
            <div className="mb-3 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          )}

          <button
            type="button"
            onClick={visibleActionItem.onClick}
            title={isCollapsed ? visibleActionItem.label : undefined}
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-teal-700 via-teal-700 to-emerald-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-700/25 ring-1 ring-inset ring-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-700/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:from-emerald-500 dark:via-emerald-500 dark:to-teal-400 dark:text-slate-950 dark:ring-white/30",
              compactMenu && "gap-2.5 py-2 text-xs",
              isCollapsed && "justify-center px-0"
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/20 blur-xl"
            />

            <visibleActionItem.icon
              className={cn(
                "relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                compactMenu && "h-[17px] w-[17px]"
              )}
            />

            {!isCollapsed && (
              <span className="relative truncate">
                {visibleActionItem.label}
              </span>
            )}
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="relative isolate min-h-screen bg-background">
      <ContentDecor />

      {/* ========================================
          SIDEBAR DESKTOP
      ======================================== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 isolate hidden flex-col overflow-hidden border-r border-emerald-200/60 bg-gradient-to-b from-[#f4fbf7] via-[#e6f5ec] to-[#d3eddf] transition-[width] duration-300 dark:border-emerald-900/40 dark:from-[#0c2418] dark:via-[#0b2016] dark:to-[#08170f] lg:flex",
          collapsed ? "w-[76px]" : "w-56"
        )}
      >
        <SidebarDecor />

        {/* Logo */}
        <div
          className={cn(
            "relative flex h-16 shrink-0 items-center border-b border-emerald-200/60 bg-white/50 px-4 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-white/[0.02]",
            collapsed && "justify-center px-0"
          )}
        >
          <Logo compact={collapsed} />

          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
          />
        </div>

        {/* Label dashboard */}
        {areaLabel && !collapsed && (
          <div className="px-5 pt-4">
            <Badge
              variant="default"
              className="gap-1.5 border border-teal-200/80 bg-teal-50 text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              {areaLabel}
            </Badge>
          </div>
        )}

        {/* Navigasi */}
        <div className="flex flex-1 flex-col overflow-hidden pt-2">
          {links(collapsed)}
        </div>

        {/* Footer sidebar */}
        {sidebarFooter && !collapsed && (
          <div className="p-3">{sidebarFooter}</div>
        )}

        {/* Tombol collapse */}
        <div className="shrink-0 border-t border-emerald-200/60 bg-white/40 p-3 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-white/[0.02]">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-slate-600 hover:bg-emerald-100/70 hover:text-teal-800 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200",
              collapsed ? "px-0" : "justify-start"
            )}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={
              collapsed ? "Perluas sidebar" : "Ciutkan sidebar"
            }
          >
            {collapsed ? (
              <ChevronsRight />
            ) : (
              <>
                <ChevronsLeft />
                Sembunyikan
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* ========================================
          DRAWER MOBILE
      ======================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 isolate flex w-72 max-w-[85vw] animate-fade-up flex-col overflow-hidden bg-gradient-to-b from-[#f4fbf7] via-[#e6f5ec] to-[#d3eddf] shadow-2xl dark:from-[#0c2418] dark:via-[#0b2016] dark:to-[#08170f]">
            <SidebarDecor />

            <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-emerald-200/60 bg-white/50 px-4 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-white/[0.02]">
              <Logo />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
              >
                <X />
              </Button>
            </div>

            {areaLabel && (
              <div className="px-5 pt-4">
                <Badge
                  variant="default"
                  className="gap-1.5 border border-teal-200/80 bg-teal-50 text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  {areaLabel}
                </Badge>
              </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden pt-2">
              {links(false)}
            </div>

            {sidebarFooter && (
              <div className="p-3">{sidebarFooter}</div>
            )}
          </aside>
        </div>
      )}

      {/* ========================================
          KONTEN DASHBOARD
      ======================================== */}
      <div
        className={cn(
          "transition-[padding] duration-300",
          collapsed ? "lg:pl-[76px]" : "lg:pl-56"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-[50] flex h-16 items-center gap-3 border-b border-emerald-200/60 bg-background/80 px-4 shadow-sm shadow-emerald-900/[0.03] backdrop-blur-xl dark:border-emerald-900/40 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {current?.label ?? "Dashboard"}
            </p>
          </div>

          {/* Notifikasi pengumuman */}
          <DropdownMenu
            open={notificationsOpen}
            onOpenChange={(open) => {
              setNotificationsOpen(open);

              if (open) {
                void loadAnnouncements();
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} pengumuman belum dibaca`
                    : "Notifikasi pengumuman"
                }
                className="relative"
              >
                <Bell className="h-[18px] w-[18px]" />

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="max-h-[min(480px,75vh)] w-[350px] max-w-[calc(100vw-2rem)] overflow-y-auto border-emerald-200/70 p-0 shadow-xl shadow-emerald-900/10 dark:border-emerald-900/50"
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-transparent px-4 py-3 dark:from-emerald-950/40">
                <div>
                  <p className="text-sm font-bold">Notifikasi</p>
                  <p className="text-xs text-muted-foreground">
                    Pengumuman dari GradeUp
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {unreadCount} belum dibaca
                  </span>
                )}
              </div>

              <DropdownMenuSeparator />

              {loadingAnnouncements ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  <p className="text-xs text-muted-foreground">
                    Memuat pengumuman...
                  </p>
                </div>
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    Belum ada pengumuman
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pengumuman admin akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {announcements.map((announcement) => {
                    const isRead = readIds.includes(announcement.id);

                    return (
                      <button
                        key={announcement.id}
                        type="button"
                        onClick={() => {
                          openAnnouncement(announcement);
                          setNotificationsOpen(false);
                        }}
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Megaphone className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "line-clamp-2 text-sm",
                                isRead
                                  ? "font-medium text-muted-foreground"
                                  : "font-bold text-foreground"
                              )}
                            >
                              {announcement.title}
                            </p>

                            {!isRead && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {announcement.content}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {announcement.category}
                            </span>

                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(announcement.published_at)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <DropdownMenuSeparator />

              <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                <CheckCheck className="h-3.5 w-3.5" />
                Pengumuman resmi dari admin GradeUp
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          {topbarRight}
        </header>

        {/* Halaman */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      {/* ========================================
          DETAIL PENGUMUMAN
      ======================================== */}
      <Dialog
        open={!!selectedAnnouncement}
        onOpenChange={(open) => {
          if (!open) setSelectedAnnouncement(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-emerald-200/70 dark:border-emerald-900/50 sm:max-w-lg">
          {selectedAnnouncement && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
              />

              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Megaphone className="h-5 w-5" />
                  </span>

                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {selectedAnnouncement.category}
                  </span>
                </div>

                <DialogTitle className="text-left text-xl">
                  {selectedAnnouncement.title}
                </DialogTitle>

                <DialogDescription className="flex items-center gap-1.5 text-left">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(selectedAnnouncement.published_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                {selectedAnnouncement.content}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCheck className="h-4 w-4 shrink-0" />
                Pengumuman ini telah ditandai sebagai sudah dibaca.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
