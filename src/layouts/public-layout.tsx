import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME, CONTACT, PUBLIC_NAV } from "@/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface PlatformContact {
  email: string;
  phone: string;
  address: string;
}

const DEFAULT_CONTACT: PlatformContact = {
  email: CONTACT.email,
  phone: CONTACT.phone,
  address: CONTACT.address,
};

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

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled || open
          ? "border-emerald-100/80 bg-background/90 shadow-sm backdrop-blur-xl dark:border-emerald-950"
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
                    ? "bg-emerald-100 text-emerald-800 shadow-sm dark:bg-emerald-950 dark:text-emerald-300"
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
              className="rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25"
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
            onClick={() => setOpen((previous) => !previous)}
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
          className="animate-fade-up border-t border-emerald-100 bg-background shadow-lg shadow-emerald-950/5 dark:border-emerald-950 lg:hidden"
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
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
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
                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
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

/* ------------------------------------------------------------------ */
/* Dekorasi footer (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

function FooterStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
        mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev {
          animation: none !important;
        }
      }
    `}</style>
  );
}

const footerHeading = "text-slate-950 dark:text-white";

const footerText = "text-slate-600 dark:text-slate-300";

const footerIconBox =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-white/80 text-teal-700 shadow-sm transition-colors duration-300 group-hover:border-emerald-300 group-hover:bg-teal-700 group-hover:text-white dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-emerald-300 dark:group-hover:border-emerald-600 dark:group-hover:bg-emerald-500 dark:group-hover:text-slate-950";

function Footer() {
  const [contact, setContact] =
    useState<PlatformContact>(DEFAULT_CONTACT);

  useEffect(() => {
    let active = true;

    async function fetchContact() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "platform_contact")
        .maybeSingle();

      if (error) {
        console.error(
          "Gagal mengambil informasi kontak footer:",
          error
        );
        return;
      }

      if (!active || !data?.value) return;

      const value = data.value as Partial<PlatformContact>;

      setContact({
        email:
          typeof value.email === "string" && value.email.trim()
            ? value.email.trim()
            : DEFAULT_CONTACT.email,
        phone:
          typeof value.phone === "string" && value.phone.trim()
            ? value.phone.trim()
            : DEFAULT_CONTACT.phone,
        address:
          typeof value.address === "string" && value.address.trim()
            ? value.address.trim()
            : DEFAULT_CONTACT.address,
      });
    }

    fetchContact();

    return () => {
      active = false;
    };
  }, []);

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

  const phoneHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

  return (
    <footer className="relative isolate overflow-hidden border-t border-emerald-300/50 bg-gradient-to-b from-[#d3eddf] via-[#c3e8d3] to-[#b9e4cc] transition-colors duration-300 ease-in-out dark:border-emerald-900/40 dark:from-[#0c2418] dark:via-[#0b2016] dark:to-[#08170f]">
      <FooterStyles />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="gu-grid absolute inset-0 [--gu-line:rgba(15,118,110,0.14)] dark:[--gu-line:rgba(52,211,153,0.10)]"
        />
        <div className="gu-drift absolute -left-32 -top-24 h-96 w-96 rounded-full bg-emerald-400/50 blur-[100px] dark:bg-emerald-500/20" />
        <div className="gu-drift-rev absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-300/60 blur-[100px] dark:bg-teal-600/20" />
        <div className="absolute right-[6%] top-10 h-56 w-56 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
        <div className="absolute -left-8 bottom-20 h-32 w-32 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/50 to-transparent dark:border-teal-500/10 dark:from-white/5" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-200 via-emerald-500 to-teal-400 opacity-80" />

      <div className="container grid gap-10 py-14 md:grid-cols-2 md:py-16 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Logo />

          <p className={`max-w-sm text-sm leading-relaxed ${footerText}`}>
            {APP_NAME} membantu siswa naik kelas lebih cepat lewat materi
            terstruktur, try out realistis, dan statistik belajar yang jelas.
          </p>

          <ul className={`space-y-3 text-sm ${footerText}`}>
            <li className="group flex items-center gap-3">
              <span className={footerIconBox}>
                <Mail className="h-4 w-4" />
              </span>

              <a
                href={`mailto:${contact.email}`}
                className="break-all transition-colors hover:text-teal-700 dark:hover:text-emerald-300"
              >
                {contact.email}
              </a>
            </li>

            <li className="group flex items-center gap-3">
              <span className={footerIconBox}>
                <Phone className="h-4 w-4" />
              </span>

              <a
                href={phoneHref}
                className="transition-colors hover:text-teal-700 dark:hover:text-emerald-300"
              >
                {contact.phone}
              </a>
            </li>

            <li className="group flex items-start gap-3">
              <span className={footerIconBox}>
                <MapPin className="h-4 w-4" />
              </span>

              <span className="pt-1.5 leading-relaxed">
                {contact.address}
              </span>
            </li>
          </ul>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h4
              className={`mb-5 flex items-center gap-2 text-sm font-extrabold tracking-wide ${footerHeading}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {group.title}
            </h4>

            <ul className="space-y-3 text-sm">
              {group.links.map(([label, to]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`inline-flex items-center transition-all duration-300 hover:translate-x-0.5 hover:text-teal-700 motion-reduce:transition-none motion-reduce:hover:translate-x-0 dark:hover:text-emerald-300 ${footerText}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-emerald-300/50 bg-white/30 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-black/20">
        <div
          className={`container flex flex-col items-center justify-between gap-3 py-5 text-center text-xs sm:flex-row sm:text-left ${footerText}`}
        >
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Seluruh hak cipta
            dilindungi.
          </p>

          <p>
            Belajar lebih terarah, raih hasil terbaik bersama {APP_NAME}.
          </p>
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
