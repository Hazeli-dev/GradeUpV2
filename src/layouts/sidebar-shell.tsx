import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/constants";

interface SidebarShellProps {
  nav: NavItem[];
  /** Label kecil di bawah logo, mis. "Admin". */
  areaLabel?: string;
  storageKey: string;
  topbarRight: ReactNode;
  sidebarFooter?: ReactNode;
  /** Item menu berbentuk tombol (bukan route), mis. "Upgrade Premium" yang membuka modal. */
  actionItem?: { label: string; icon: NavItem["icon"]; onClick: () => void };
}

/** Cangkang dashboard dengan sidebar yang bisa diciutkan (desktop) dan drawer (mobile). */
export function SidebarShell({ nav, areaLabel, storageKey, topbarRight, sidebarFooter, actionItem }: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, storageKey]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const current = nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  const links = (isCollapsed: boolean) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navigasi utama">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={isCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
              isCollapsed && "justify-center px-0",
              isActive
                ? "bg-brand-gradient text-white shadow-glow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
      {actionItem && (
        <button
          type="button"
          onClick={actionItem.onClick}
          title={isCollapsed ? actionItem.label : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-soft dark:text-accent",
            isCollapsed && "justify-center px-0"
          )}
        >
          <actionItem.icon className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span className="truncate">{actionItem.label}</span>}
        </button>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <div className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}>
          <Logo compact={collapsed} />
        </div>
        {areaLabel && !collapsed && (
          <div className="px-5 pt-4">
            <Badge variant="default">{areaLabel}</Badge>
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden pt-2">{links(collapsed)}</div>
        {sidebarFooter && !collapsed && <div className="p-3">{sidebarFooter}</div>}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", collapsed ? "px-0" : "justify-start")}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <ChevronsRight /> : <><ChevronsLeft /> Ciutkan</>}
          </Button>
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-up flex-col bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
                <X />
              </Button>
            </div>
            {areaLabel && (
              <div className="px-5 pt-4">
                <Badge variant="default">{areaLabel}</Badge>
              </div>
            )}
            <div className="flex flex-1 flex-col overflow-hidden pt-2">{links(false)}</div>
            {sidebarFooter && <div className="p-3">{sidebarFooter}</div>}
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-25 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{current?.label ?? "Dashboard"}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifikasi (demo)" className="relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-background" />
          </Button>
          <ThemeToggle />
          {topbarRight}
        </header>
        
        {/* Konten utama tanpa key={location.pathname} agar transisi rute instan */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
