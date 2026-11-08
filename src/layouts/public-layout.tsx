
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Mail, MapPin, Menu, Phone, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME, CONTACT, PUBLIC_NAV } from "@/constants";
import { cn } from "@/lib/utils";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled || open
          ? "border-cyan-100/80 bg-background/90 shadow-sm backdrop-blur-xl dark:border-cyan-950"
          : "border-transparent bg-background/80 backdrop-blur-md"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 lg:h-[76px]">
        <div className="shrink-0">
          <Logo />
        </div>

        <nav
          className="hidden items-center gap-1 rounded-2xl border border-border/60 bg-muted/40 p-1 lg:flex"
          aria-label="Navigasi utama"
        >
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-cyan-100 text-cyan-800 shadow-sm dark:bg-cyan-950 dark:text-cyan-300"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              asChild
              variant="ghost"
              className="rounded-xl font-semibold"
            >
              <Link to="/login">Masuk</Link>
            </Button>

            <Button
              asChild
              className="rounded-xl bg-cyan-600 px-5 font-bold text-white shadow-sm shadow-cyan-600/20 transition-all hover:bg-cyan-700 hover:shadow-md hover:shadow-cyan-600/25"
            >
              <Link to="/register">
                Daftar Gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="animate-fade-up border-t border-cyan-100 bg-background shadow-lg shadow-cyan-950/5 dark:border-cyan-950 lg:hidden"
        >
          <nav
            className="container flex flex-col gap-1 py-4"
            aria-label="Navigasi seluler"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
              <Button
                asChild
                variant="outline"
                className="rounded-xl font-semibold"
              >
                <Link to="/login">Masuk</Link>
              </Button>

              <Button
                asChild
                className="rounded-xl bg-cyan-600 font-bold text-white hover:bg-cyan-700"
              >
                <Link to="/register">Daftar Gratis</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const groups = [
    {
      title: "Platform",
      links: [
        ["Fitur", "/features"],
        ["Materi Belajar", "/courses"],
        ["Paket Ujian", "/exams"],
        ["Harga", "/pricing"],
      ],
    },
    {
      title: "Perusahaan",
      links: [
        ["Tentang Kami", "/about"],
        ["FAQ", "/faq"],
        ["Kontak", "/contact"],
      ],
    },
    {
      title: "Akun",
      links: [
        ["Masuk", "/login"],
        ["Daftar Gratis", "/register"],
        ["Lupa Kata Sandi", "/forgot-password"],
      ],
    },
  ];

  return (
    <footer className="relative border-t border-cyan-100/80 bg-white dark:border-cyan-950 dark:bg-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-200 via-cyan-500 to-teal-300 opacity-70" />

      <div className="container grid gap-10 py-12 md:grid-cols-2 md:py-14 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Logo />

          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {APP_NAME} membantu siswa naik kelas lebih cepat lewat materi
            terstruktur, try out realistis, dan statistik belajar yang jelas.
          </p>

          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <Mail className="h-4 w-4" />
              </span>
              <span>{CONTACT.email}</span>
            </li>

            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <Phone className="h-4 w-4" />
              </span>
              <span>{CONTACT.phone}</span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="pt-1">{CONTACT.address}</span>
            </li>
          </ul>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h4 className="mb-5 text-sm font-extrabold tracking-wide text-foreground">
              {group.title}
            </h4>

            <ul className="space-y-3 text-sm">
              {group.links.map(([label, to]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex items-center text-muted-foreground transition-colors hover:translate-x-0.5 hover:text-cyan-700 dark:hover:text-cyan-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/70">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Seluruh hak cipta
            dilindungi.
          </p>

          <p>Versi kerangka aplikasi · data pada situs ini adalah contoh (demo)</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
