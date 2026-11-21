import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock3,
  GraduationCap,
  ClipboardList,
  Loader2,
  ChartNoAxesCombined,
  BookMarked,
  Target,
  Award,
  CheckCircle2,
  Play,
  Star,
  Layers3,
  MoveUpRight,
  Lightbulb,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { faqs, features } from "@/data/marketing";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { supabase } from "@/lib/supabase";

interface FeaturedCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string | null;
  instructor: string;
  premium: boolean | null;
  thumbnail: string | null;
}

interface FeaturedExam {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  subject: string | null;
  type: string | null;
  level: string | null;
  grade: number | null;
  difficulty: string | null;
  price: number | null;
  duration_minutes: number | null;
  total_questions: number | null;
  premium: boolean | null;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);

const hasDescription = (description: string | null) =>
  Boolean(
    description?.trim() &&
    description.trim().toLowerCase() !== "belum ada deskripsi.",
  );

const mutedText = "text-slate-600 dark:text-slate-300";

const headingText = "text-slate-950 dark:text-white";

const cardSurface =
  "border border-slate-200/80 bg-white/90 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/85";

const softSurface = "bg-emerald-50/70 dark:bg-slate-900";

const smooth = "transition-colors duration-300 ease-in-out";

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.16)] dark:[--gu-line:rgba(52,211,153,0.13)]";
const patternLineInverse = "[--gu-line:rgba(167,243,208,0.13)]";
const patternDot =
  "[--gu-dot:rgba(5,150,105,0.42)] dark:[--gu-dot:rgba(110,231,183,0.28)]";
const patternDotInverse = "[--gu-dot:rgba(167,243,208,0.3)]";

function HomeStyles() {
  return (
    <style>{`
      @keyframes gu-float {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, -12px, 0); }
      }
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 16px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-float { animation: gu-float 7s ease-in-out infinite; }
      .gu-float-slow { animation: gu-float 10s ease-in-out infinite; animation-delay: -3s; }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .gu-reveal-delay { animation-delay: 0.15s; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
        mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, #000 25%, transparent 100%);
      }
      .gu-dots {
        background-image: radial-gradient(var(--gu-dot) 1.2px, transparent 1.5px);
        background-size: 24px 24px;
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 20%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-float, .gu-float-slow, .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {children}
    </div>
  );
}

function GridPattern({
  dots = false,
  inverse = false,
  className = "",
}: {
  dots?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const tone = dots
    ? inverse
      ? patternDotInverse
      : patternDot
    : inverse
      ? patternLineInverse
      : patternLine;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        dots ? "gu-dots" : "gu-grid"
      } ${tone} ${className}`}
    />
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800 transition-colors duration-300 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200 sm:text-[11px]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <SectionLabel>{eyebrow}</SectionLabel>

      <h2
        className={`mt-5 text-[1.85rem] font-extrabold leading-[1.2] tracking-[-0.035em] sm:text-3xl lg:text-[2.65rem] ${headingText}`}
      >
        {title}
      </h2>

      <p
        className={`mt-4 text-sm leading-7 sm:text-base sm:leading-8 ${mutedText}`}
      >
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className={`col-span-full flex min-h-56 items-center justify-center rounded-3xl ${cardSurface}`}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-teal-600 dark:text-teal-400" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Memuat konten...
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`col-span-full rounded-3xl px-6 py-16 text-center ${cardSurface}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className={`mt-5 text-lg font-bold ${headingText}`}>{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  const { requireLogin } = useGuestGate();
  const navigate = useNavigate();

  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [featuredExams, setFeaturedExams] = useState<FeaturedExam[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingExams, setLoadingExams] = useState(true);

  /**
   * Memeriksa sesi Supabase setiap kali tombol aktivitas belajar diklik.
   * Jika sudah login, pengguna langsung diarahkan.
   * Jika belum login, modal login akan menyimpan tujuan redirect.
   */
  const handleProtectedAction = async (path: string, activity: string) => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Gagal memeriksa sesi login:", error);
        requireLogin(activity, path);
        return;
      }

      if (data.session?.user) {
        navigate(path);
        return;
      }

      requireLogin(activity, path);
    } catch (error) {
      console.error("Terjadi kesalahan saat memeriksa login:", error);
      requireLogin(activity, path);
    }
  };

  useEffect(() => {
    let active = true;

    const loadHomepageData = async () => {
      try {
        const [courseResult, examResult] = await Promise.all([
          supabase
            .from("courses")
            .select(
              "id, title, description, category, level, instructor, premium, thumbnail",
            )
            .eq("status", "Published")
            .order("created_at", { ascending: false })
            .limit(3),

          supabase
            .from("exam_packages")
            .select(
              "id, title, description, category, subject, type, level, grade, difficulty, price, duration_minutes, total_questions, premium",
            )
            .eq("status", "Published")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (!active) return;

        if (courseResult.error) {
          console.error("Gagal mengambil kursus:", courseResult.error);
        } else {
          setFeaturedCourses((courseResult.data ?? []) as FeaturedCourse[]);
        }

        if (examResult.error) {
          console.error("Gagal mengambil paket ujian:", examResult.error);
        } else {
          setFeaturedExams((examResult.data ?? []) as FeaturedExam[]);
        }
      } catch (error) {
        console.error("Gagal memuat data homepage:", error);
      } finally {
        if (active) {
          setLoadingCourses(false);
          setLoadingExams(false);
        }
      }
    };

    loadHomepageData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <HomeStyles />

      {/* HERO */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-br from-[#c9ecd8] via-[#e6f5ec] to-[#b9e4cc] dark:from-[#0b2418] dark:via-[#0e2b1c] dark:to-[#0a2a20] ${smooth}`}
      >
        <DecorLayer>
          <div className="gu-drift absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/25" />
          <div className="gu-drift-rev absolute -right-32 top-10 h-[430px] w-[430px] rounded-full bg-teal-400/50 blur-[110px] dark:bg-teal-500/25" />
          <div className="absolute -bottom-32 left-1/3 h-[320px] w-[320px] rounded-full bg-emerald-400/45 blur-[90px] dark:bg-emerald-600/20" />
          <GridPattern />
          <div className="absolute right-[6%] top-16 h-72 w-72 rounded-full border border-emerald-400/45 dark:border-emerald-400/10" />
          <div className="absolute right-[10%] top-24 h-48 w-48 rounded-full border border-teal-400/45 dark:border-teal-400/10" />
          <div className="absolute -left-10 bottom-24 h-40 w-40 rotate-12 rounded-[2rem] border border-teal-400/45 bg-gradient-to-br from-white/70 to-emerald-200/30 dark:border-teal-400/20 dark:from-white/8" />
          <div className="absolute bottom-16 right-[32%] h-14 w-14 -rotate-12 rounded-2xl bg-emerald-500/25 dark:bg-emerald-400/10" />
          <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent dark:via-emerald-700/50" />
        </DecorLayer>

        <div className="container grid items-center gap-14 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:min-h-[670px] lg:grid-cols-[1fr_0.95fr] lg:gap-12 lg:py-24">
          <div className="gu-reveal relative z-10 text-center lg:text-left">
            <SectionLabel>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Platform belajar digital
            </SectionLabel>

            <h1
              className={`mt-7 text-[2.65rem] font-black leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[4.25rem] ${headingText}`}
            >
              Naik Level
              <span className="mt-1 block bg-gradient-to-r from-teal-700 to-emerald-500 bg-clip-text text-transparent dark:from-teal-300 dark:to-emerald-300">
                Lebih Cepat
              </span>
              <span className="block">Dengan GradeUp</span>
            </h1>

            <p
              className={`mx-auto mt-6 max-w-xl text-[15px] leading-8 sm:text-lg sm:leading-9 lg:mx-0 ${mutedText}`}
            >
              Belajar bukan sekadar menyelesaikan soal. Bangun pemahaman, latih
              kemampuan, dan kenali perkembangan belajarmu bersama GradeUp.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-teal-700 px-7 font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-7 font-bold text-slate-700 transition-all duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                onClick={() =>
                  handleProtectedAction(
                    "/dashboard/exams",
                    "mencoba simulasi ujian",
                  )
                }
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Coba Simulasi Ujian
              </Button>
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-600 dark:text-slate-300 lg:justify-start">
              {[
                "Belajar terstruktur",
                "Latihan interaktif",
                "Evaluasi progres",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="gu-reveal gu-reveal-delay relative mx-auto w-full max-w-[540px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-emerald-300/45 via-teal-200/30 to-transparent blur-3xl dark:from-emerald-600/20 dark:via-teal-700/10"
            />

            <div className="relative rounded-[2rem] border border-white/80 bg-white/70 p-2.5 shadow-[0_40px_100px_-40px_rgba(6,78,59,0.45),0_0_0_1px_rgba(16,185,129,0.08)] ring-1 ring-inset ring-white/60 backdrop-blur-2xl transition-colors duration-300 dark:border-emerald-900/40 dark:bg-slate-900/70 dark:shadow-[0_40px_100px_-40px_rgba(16,185,129,0.25)] dark:ring-white/5 sm:p-3.5">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#123b29] text-white">
                <div className="relative overflow-hidden px-6 pb-8 pt-6 sm:px-8 sm:pt-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(52,211,153,0.22),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(20,184,166,0.14),transparent_50%)]"
                  />
                  <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-emerald-300/45" />
                  <div className="absolute -right-6 -top-10 h-44 w-44 rounded-full border border-emerald-300/45" />
                  <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-[#123b29]">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold tracking-wide">
                          GRADEUP
                        </p>
                        <p className="mt-0.5 text-[9px] font-semibold tracking-[0.17em] text-emerald-100/70">
                          LEARNING EXPERIENCE
                        </p>
                      </div>
                    </div>

                    <span className="hidden rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-[9px] font-bold tracking-wide text-emerald-100 sm:inline-flex">
                      YOUR LEARNING SPACE
                    </span>
                  </div>

                  <div className="relative mt-10 max-w-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                      Explore your potential
                    </p>
                    <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.15] tracking-tight sm:text-[2.5rem]">
                      Setiap proses belajar punya arti.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Temukan pengalaman belajar yang lebih terarah dalam satu
                      ruang digital.
                    </p>
                  </div>

                  <div className="relative mt-8 flex items-center gap-2">
                    <span className="h-1.5 w-9 rounded-full bg-emerald-400" />
                    <span className="h-1.5 w-3 rounded-full bg-white/25" />
                    <span className="h-1.5 w-3 rounded-full bg-white/25" />
                  </div>
                </div>

                <div className="space-y-3 bg-[#f3faf5] p-4 dark:bg-slate-800 sm:p-5">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Ruang belajarmu
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Pilih cara untuk terus berkembang
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <BookMarked className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                        Materi Belajar
                      </h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Pahami materi secara bertahap.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        <Target className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                        Latihan Ujian
                      </h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Uji pemahaman dan kemampuanmu.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Kenali perkembanganmu
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Jadikan setiap latihan sebagai langkah kemajuan.
                      </p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-teal-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="gu-float absolute -left-5 top-[38%] hidden items-center gap-3 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-xl shadow-emerald-900/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Belajar cerdas
                </p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Satu langkah setiap hari
                </p>
              </div>
            </div>

            <div className="gu-float-slow absolute -right-3 bottom-10 hidden items-center gap-3 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-xl shadow-emerald-900/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Terus berkembang
                </p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Fokus pada proses belajar
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section
        className={`relative isolate overflow-hidden border-b border-emerald-100/70 bg-gradient-to-b from-[#b9e4cc] via-[#dff3e8] to-[#eaf6ef] dark:border-emerald-900/30 dark:from-[#0a2a20] dark:via-[#0d2519] dark:to-[#0d2116] ${smooth}`}
      >
        <DecorLayer>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent dark:via-emerald-500/30" />
          <div className="absolute -top-10 left-1/2 h-24 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/45 blur-3xl dark:bg-emerald-500/20" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/40 to-transparent dark:via-teal-700/30" />
        </DecorLayer>

        <div className="container grid gap-6 py-8 sm:grid-cols-3 sm:gap-8">
          {[
            {
              icon: BookOpen,
              title: "Materi Terstruktur",
              description: "Belajar sesuai kebutuhan",
              color:
                "bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300",
            },
            {
              icon: ClipboardList,
              title: "Latihan dan Ujian",
              description: "Asah pemahaman secara aktif",
              color:
                "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
            },
            {
              icon: ChartNoAxesCombined,
              title: "Evaluasi Belajar",
              description: "Kenali perkembangan diri",
              color:
                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-center gap-3 sm:justify-start"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.color}`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#eaf6ef] via-[#f6fbf8] to-[#d3eddf] dark:from-[#0d2116] dark:via-[#0b1c13] dark:to-[#0c2418] ${smooth}`}
      >
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift absolute -right-40 top-20 h-[26rem] w-[26rem] rounded-full bg-teal-300/55 blur-3xl dark:bg-teal-600/20" />
          <div className="gu-drift-rev absolute -left-40 bottom-10 h-[24rem] w-[24rem] rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="absolute right-[8%] top-10 h-40 w-40 rotate-12 rounded-[2.5rem] border border-emerald-300/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[6%] h-24 w-24 -rotate-12 rounded-3xl border border-teal-300/45 bg-gradient-to-br from-white/40 to-transparent dark:border-teal-500/10 dark:from-white/5" />
        </DecorLayer>

        <div className="container py-20 sm:py-28">
          <div className="grid items-end gap-7 lg:grid-cols-[1fr_auto]">
            <SectionTitle
              eyebrow="Kenapa GradeUp?"
              title="Bukan hanya belajar. Bangun kemampuan."
              description="GradeUp menggabungkan materi pembelajaran, latihan, dan evaluasi agar perjalanan belajarmu menjadi lebih terarah."
            />

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-xl border-slate-300 font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
            >
              <Link to="/features">
                Jelajahi Fitur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`group relative overflow-hidden rounded-3xl p-7 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 hover:bg-white hover:shadow-[0_24px_60px_-28px_rgba(15,118,110,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/70 dark:hover:bg-slate-900 ${cardSurface}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/20 dark:group-hover:bg-emerald-500/15"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/0 to-transparent transition-colors duration-500 group-hover:via-emerald-400/70"
                />
                <span className="absolute right-6 top-5 text-5xl font-black tracking-tighter text-slate-100 transition-colors duration-300 group-hover:text-emerald-50 dark:text-slate-800 dark:group-hover:text-emerald-950/50">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 transition-all duration-300 group-hover:bg-teal-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:group-hover:bg-emerald-500 dark:group-hover:text-slate-950">
                  <feature.icon className="h-6 w-6" />
                </div>

                <h3
                  className={`relative mt-7 text-lg font-bold ${headingText}`}
                >
                  {feature.title}
                </h3>

                <p className={`mt-3 text-sm leading-7 ${mutedText}`}>
                  {feature.description}
                </p>

                <div className="mt-6 h-1 w-10 rounded-full bg-emerald-200 transition-all duration-300 group-hover:w-16 group-hover:bg-emerald-500 dark:bg-emerald-900" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section
        className={`relative isolate overflow-hidden border-y border-emerald-300/40 bg-gradient-to-b from-[#d3eddf] via-[#c3e8d3] to-[#d8f0e2] py-20 dark:border-emerald-900/30 dark:from-[#0c2418] dark:via-[#0e2a1b] dark:to-[#0b2016] sm:py-28 ${smooth}`}
      >
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute left-1/2 -top-32 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/50 blur-[110px] dark:bg-emerald-500/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-700/20" />
          <div className="absolute -right-16 top-24 h-64 w-64 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
        </DecorLayer>

        <div className="container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionTitle
              eyebrow="Materi Pembelajaran"
              title="Temukan materi. Mulai berkembang."
              description="Jelajahi materi pembelajaran yang tersedia dan pilih yang sesuai dengan kebutuhan belajarmu."
            />

            <Button
              asChild
              variant="outline"
              className="w-fit shrink-0 rounded-xl border-slate-300 bg-white font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
            >
              <Link to="/courses">
                Semua Materi
                <MoveUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingCourses ? (
              <LoadingState />
            ) : featuredCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Materi segera tersedia"
                description="Materi pembelajaran baru akan ditampilkan di sini setelah dipublikasikan."
              />
            ) : (
              featuredCourses.map((course) => {
                const thumbnail = course.thumbnail?.trim() ?? "";
                const isImage = /^https?:\/\//i.test(thumbnail);

                return (
                  <article
                    key={course.id}
                    className={`group overflow-hidden rounded-3xl shadow-[0_12px_36px_-22px_rgba(15,118,110,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 hover:shadow-[0_28px_60px_-28px_rgba(15,118,110,0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-emerald-700/70 ${cardSurface}`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-950 dark:to-slate-800">
                      {isImage ? (
                        <img
                          src={thumbnail}
                          alt={course.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/70 text-teal-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/70 dark:text-emerald-300">
                            <BookOpen className="h-9 w-9" />
                          </div>
                        </div>
                      )}

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-emerald-200">
                          {course.category}
                        </span>
                      </div>

                      {course.premium && (
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-extrabold text-amber-950 shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                          PREMIUM
                        </span>
                      )}

                      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                        <Layers3 className="h-3.5 w-3.5 text-teal-600 dark:text-emerald-400" />
                        {course.level || "Semua Tingkat"}
                      </div>
                    </div>

                    <div className="p-6">
                      <h3
                        className={`line-clamp-2 min-h-[3.5rem] text-lg font-bold leading-snug ${headingText}`}
                      >
                        {course.title}
                      </h3>

                      <p
                        className={`mt-3 line-clamp-2 min-h-12 text-sm leading-6 ${mutedText}`}
                      >
                        {hasDescription(course.description)
                          ? course.description
                          : "Pelajari materi ini dan tingkatkan pemahamanmu bersama GradeUp."}
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Pengajar
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {course.instructor || "GradeUp"}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="shrink-0 rounded-xl bg-teal-700 font-bold text-white transition-colors duration-300 hover:bg-teal-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                          onClick={() =>
                            handleProtectedAction(
                              `/dashboard/courses/${course.id}`,
                              `mempelajari materi "${course.title}"`,
                            )
                          }
                        >
                          Pelajari
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* EXAMS */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d8f0e2] via-[#e2f3f0] to-[#cfeae3] dark:from-[#0b2016] dark:via-[#0c2220] dark:to-[#0b1f19] ${smooth}`}
      >
        <DecorLayer>
          <GridPattern />
          <div className="gu-drift-rev absolute -left-32 top-24 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="gu-drift absolute -right-32 bottom-24 h-[26rem] w-[26rem] rounded-full bg-emerald-300/55 blur-3xl dark:bg-emerald-600/20" />
          <div className="absolute right-[5%] top-16 h-44 w-44 rotate-45 rounded-[2.5rem] border border-teal-300/45 dark:border-teal-500/10" />
          <div className="absolute left-[4%] bottom-24 h-28 w-28 rotate-12 rounded-3xl border border-emerald-300/45 bg-gradient-to-br from-white/50 to-transparent dark:border-emerald-500/10 dark:from-white/5" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/50 to-transparent dark:via-teal-700/30" />
        </DecorLayer>

        <div className="container py-20 sm:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionTitle
              eyebrow="Latihan dan Evaluasi"
              title="Persiapkan dirimu dengan latihan."
              description="Pilih paket ujian yang tersedia untuk menguji pemahaman dan melatih kesiapanmu."
            />

            <Button
              asChild
              variant="outline"
              className="w-fit shrink-0 rounded-xl border-slate-300 font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
            >
              <Link to="/exams">
                Semua Paket Ujian
                <MoveUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingExams ? (
              <LoadingState />
            ) : featuredExams.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Paket ujian segera tersedia"
                description="Paket ujian terbaru akan ditampilkan di sini setelah dipublikasikan."
              />
            ) : (
              featuredExams.map((exam) => (
                <article
                  key={exam.id}
                  className={`group flex flex-col overflow-hidden rounded-3xl shadow-[0_14px_40px_-26px_rgba(15,118,110,0.4)] ring-1 ring-teal-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/80 hover:shadow-[0_28px_64px_-28px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:ring-white/5 dark:hover:border-emerald-700/70 ${cardSurface}`}
                >
                  <div className="relative overflow-hidden bg-[#123b29] px-6 pb-7 pt-6 text-white">
                    <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-emerald-300/45" />
                    <div className="absolute -right-2 -top-7 h-28 w-28 rounded-full bg-emerald-400/10 blur-xl" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-[#123b29]">
                        <ClipboardList className="h-6 w-6" />
                      </div>

                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                        {Number(exam.price ?? 0) <= 0
                          ? "GRATIS"
                          : formatPrice(Number(exam.price))}
                      </span>
                    </div>

                    <div className="relative mt-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                        Paket evaluasi
                      </p>
                      <h3 className="mt-2 line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-snug">
                        {exam.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap gap-2">
                      {exam.type && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-teal-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {exam.type}
                        </span>
                      )}

                      {exam.level && (
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {exam.level}
                          {exam.grade ? ` Kelas ${exam.grade}` : ""}
                        </span>
                      )}

                      {exam.difficulty && (
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {exam.difficulty}
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-4 line-clamp-2 min-h-12 text-sm leading-6 ${mutedText}`}
                    >
                      {hasDescription(exam.description)
                        ? exam.description
                        : "Latih kemampuan dan uji pemahamanmu melalui paket ujian GradeUp."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 shrink-0 text-teal-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Durasi
                          </p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {exam.duration_minutes && exam.duration_minutes > 0
                              ? `${exam.duration_minutes} menit`
                              : "Fleksibel"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 shrink-0 text-teal-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Jumlah soal
                          </p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {Number(exam.total_questions ?? 0) > 0
                              ? `${exam.total_questions} soal`
                              : "Lihat detail"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {exam.subject && (
                      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <GraduationCap className="h-4 w-4 text-teal-600 dark:text-emerald-400" />
                        {exam.subject}
                      </p>
                    )}

                    {exam.premium && (
                      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Paket Premium
                      </p>
                    )}

                    <Button
                      className="mt-6 w-full rounded-xl bg-teal-700 font-bold text-white transition-colors duration-300 hover:bg-teal-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                      onClick={() =>
                        handleProtectedAction(
                          `/dashboard/exams/${exam.id}`,
                          `mengerjakan paket "${exam.title}"`,
                        )
                      }
                    >
                      Mulai Ujian
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* PREMIUM */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-br from-[#0f3d29] via-[#14533a] to-[#0b2e22] py-20 dark:from-[#071a10] dark:via-[#0c2a1b] dark:to-[#08201a] sm:py-28 ${smooth}`}
      >
        <DecorLayer>
          <GridPattern inverse />
          <div className="gu-drift absolute -right-40 -top-20 h-[30rem] w-[30rem] rounded-full bg-emerald-400/30 blur-[110px] dark:bg-emerald-500/20" />
          <div className="gu-drift-rev absolute -left-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-teal-400/30 blur-[110px] dark:bg-teal-500/18" />
          <div className="absolute left-1/2 top-1/3 h-[22rem] w-[40rem] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[100px]" />
          <div className="absolute -right-24 top-28 h-80 w-80 rounded-full border border-emerald-300/45" />
          <div className="absolute -right-8 top-44 h-48 w-48 rounded-full border border-emerald-300/45" />
          <div className="absolute -left-16 top-32 h-44 w-44 rotate-12 rounded-[2.5rem] border border-emerald-300/45 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#cfeae3] to-transparent dark:from-[#0b1f19]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#d9f0e3] dark:to-[#0d2116]" />
        </DecorLayer>

        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>GradeUp Premium</SectionLabel>

            <h2 className="mt-5 text-[1.9rem] font-black leading-[1.2] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Lebih banyak kesempatan untuk
              <span className="text-emerald-300"> berkembang.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-emerald-50/85 sm:text-base sm:leading-8">
              Temukan pilihan paket Premium yang sesuai dengan kebutuhan
              belajarmu dan nikmati akses sesuai ketentuan masing-masing paket.
            </p>
          </div>

          <div className="relative mt-14 rounded-[2rem] border border-emerald-200/40 bg-[#f1f8f2] p-3 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)] ring-1 ring-white/20 dark:border-emerald-800/40 dark:bg-[#0d2116] dark:ring-white/5 sm:p-6 lg:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
            >
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-700/15" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-800/15" />
            </div>
            <div className="relative">
              <PricingCards />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d9f0e3] via-[#c9ebd8] to-[#d3eddf] dark:from-[#0d2116] dark:via-[#0d2a1b] dark:to-[#0d2116] ${smooth}`}
      >
        <DecorLayer>
          <GridPattern dots />
          <div className="gu-drift absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-300/60 blur-3xl dark:bg-emerald-600/20" />
          <div className="gu-drift-rev absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-teal-300/60 blur-3xl dark:bg-teal-600/20" />
          <div className="absolute right-[6%] top-12 h-40 w-40 rounded-full border border-emerald-400/45 dark:border-emerald-500/10" />
          <div className="absolute bottom-16 left-[5%] h-24 w-24 rotate-12 rounded-3xl border border-teal-300/45 dark:border-teal-500/10" />
        </DecorLayer>

        <div className="container py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <SectionTitle
                eyebrow="Pusat Bantuan"
                title="Punya pertanyaan tentang GradeUp?"
                description="Kami merangkum beberapa pertanyaan yang sering diajukan agar kamu lebih mudah memahami platform ini."
              />

              <div className="mt-7">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl border-slate-300 font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                >
                  <Link to="/faq">
                    Kunjungi Pusat Bantuan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div
              className={`rounded-3xl p-5 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.4)] ring-1 ring-emerald-900/[0.04] transition-colors duration-300 dark:ring-white/5 sm:p-8 ${cardSurface}`}
            >
              <FaqAccordion items={faqs.slice(0, 5)} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className={`relative isolate overflow-hidden bg-gradient-to-b from-[#d3eddf] to-[#b9e4cc] pb-20 dark:from-[#0d2116] dark:to-[#0a1d14] sm:pb-28 ${smooth}`}
      >
        <DecorLayer>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-emerald-400/45 to-transparent dark:from-emerald-800/30" />
          <div className="absolute left-1/2 bottom-0 h-72 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/55 blur-[100px] dark:bg-emerald-500/20" />
        </DecorLayer>

        <div className="container">
          <div className="relative isolate overflow-hidden rounded-[2rem] border border-emerald-300/45 bg-gradient-to-br from-[#0f3324] via-[#174b34] to-[#1e6842] px-6 py-16 text-center text-white shadow-[0_40px_100px_-40px_rgba(6,78,59,0.65)] ring-1 ring-inset ring-white/10 sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.24),transparent_50%),radial-gradient(circle_at_95%_100%,rgba(20,184,166,0.22),transparent_45%)]"
            />
            <GridPattern inverse className="-z-10" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
            />
            <div
              className="gu-drift pointer-events-none absolute left-1/2 top-0 -z-10 h-40 w-2/3 -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-emerald-300/45"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-4 -top-12 -z-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-64 w-64 rounded-full border border-emerald-300/45"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-10 right-[8%] -z-10 hidden h-20 w-20 rotate-12 rounded-3xl border border-white/10 bg-white/5 sm:block"
              aria-hidden="true"
            />

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-4 py-2 text-xs font-bold text-emerald-100">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Mulai perjalananmu bersama GradeUp
            </span>

            <h2 className="mx-auto mt-7 max-w-3xl text-[1.9rem] font-black leading-[1.2] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              Langkah besar dimulai dari
              <span className="text-emerald-300"> belajar hari ini.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              Buat akun GradeUp secara gratis, temukan materi pembelajaran, dan
              mulai persiapkan dirimu menghadapi berbagai ujian.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-emerald-400 px-7 font-extrabold text-[#123b29] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                <Link to="/register">
                  Daftar Gratis Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/30 bg-white/5 px-7 font-bold text-white transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:text-white"
              >
                <Link to="/about">Kenali GradeUp</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
