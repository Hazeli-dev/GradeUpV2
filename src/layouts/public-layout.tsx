import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";
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
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled || open ? "border-b bg-background/80 shadow-soft backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-soft text-primary dark:text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Masuk</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/register">Daftar Gratis</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="animate-fade-up border-t bg-background lg:hidden">
          <nav className="container flex flex-col gap-1 py-4" aria-label="Navigasi seluler">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn("rounded-xl px-4 py-3 text-sm font-semibold", isActive ? "bg-soft text-primary dark:text-accent" : "hover:bg-muted")
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="outline"><Link to="/login">Masuk</Link></Button>
              <Button asChild><Link to="/register">Daftar Gratis</Link></Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const groups = [
    { title: "Platform", links: [["Fitur", "/features"], ["Materi Belajar", "/courses"], ["Paket Ujian", "/exams"], ["Harga", "/pricing"]] },
    { title: "Perusahaan", links: [["Tentang Kami", "/about"], ["FAQ", "/faq"], ["Kontak", "/contact"]] },
    { title: "Akun", links: [["Masuk", "/login"], ["Daftar Gratis", "/register"], ["Lupa Kata Sandi", "/forgot-password"]] },
  ];
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            {APP_NAME} membantu siswa naik kelas lebih cepat lewat materi terstruktur, try out realistis, dan statistik belajar yang jelas.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{CONTACT.email}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{CONTACT.phone}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{CONTACT.address}</li>
          </ul>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="mb-4 text-sm font-bold">{g.title}</h4>
            <ul className="space-y-2.5 text-sm">
              {g.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-muted-foreground transition-colors hover:text-primary dark:hover:text-accent">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {APP_NAME}. Seluruh hak cipta dilindungi.</p>
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
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;
