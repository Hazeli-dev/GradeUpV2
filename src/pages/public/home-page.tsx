
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock3,
  GraduationCap,
  ClipboardList,
  Loader2,
  ShieldCheck,
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
      description.trim().toLowerCase() !== "belum ada deskripsi."
  );

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
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
      <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="col-span-full flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-cyan-200 bg-white/70 dark:border-cyan-900 dark:bg-card">
      <Loader2 className="h-7 w-7 animate-spin text-cyan-600" />
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
    <div className="col-span-full rounded-3xl border border-dashed border-cyan-200 bg-white px-6 py-14 text-center dark:border-cyan-900 dark:bg-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  const { requireLogin } = useGuestGate();

  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [featuredExams, setFeaturedExams] = useState<FeaturedExam[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    let active = true;

    const loadHomepageData = async () => {
      try {
        const [courseResult, examResult] = await Promise.all([
          supabase
            .from("courses")
            .select(
              "id, title, description, category, level, instructor, premium, thumbnail"
            )
            .eq("status", "Published")
            .order("created_at", { ascending: false })
            .limit(3),

          supabase
            .from("exam_packages")
            .select(
              "id, title, description, category, subject, type, level, grade, difficulty, price, duration_minutes, total_questions, premium"
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
      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative isolate overflow-hidden bg-[#f2fbff] dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-900/20" />
          <div className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />
          <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        </div>

        <div className="container grid items-center gap-14 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-24">
          <div className="relative z-10 animate-fade-up text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-bold text-cyan-800 shadow-sm dark:border-cyan-900 dark:bg-slate-900/80 dark:text-cyan-300">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              Platform belajar digital untuk masa depan
            </div>

            <h1 className="mt-7 text-[2.65rem] font-black leading-[1.08] tracking-[-0.045em] text-slate-950 dark:text-white sm:text-6xl lg:text-[4.25rem]">
              Cara Baru untuk
              <span className="mt-1 block text-cyan-600 dark:text-cyan-400">
                Belajar Lebih
              </span>
              <span className="block">Maju.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-400 sm:text-lg lg:mx-0">
              Belajar bukan sekadar menyelesaikan soal. Bangun pemahaman,
              latih kemampuan, dan kenali perkembangan belajarmu bersama
              GradeUp.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-xl bg-cyan-600 px-7 font-bold text-white shadow-lg shadow-cyan-600/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-xl hover:shadow-cyan-600/25"
              >
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-13 rounded-xl border-slate-300 bg-white/80 px-7 font-bold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-cyan-950"
                onClick={() => requireLogin("mencoba simulasi ujian")}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Coba Simulasi Ujian
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-600 dark:text-slate-400 lg:justify-start">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                Belajar terstruktur
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                Latihan interaktif
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                Evaluasi progres
              </span>
            </div>
          </div>

          {/* VISUAL HERO */}
          <div className="relative mx-auto w-full max-w-[540px] animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-cyan-300/20 blur-3xl dark:bg-cyan-700/10" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-3 shadow-[0_30px_90px_-35px_rgba(8,145,178,0.35)] dark:border-slate-700 dark:bg-slate-900 sm:p-4">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#092f43] text-white">
                <div className="relative overflow-hidden px-6 pb-7 pt-6 sm:px-8 sm:pt-8">
                  <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-cyan-300/15" />
                  <div className="absolute -right-6 -top-10 h-44 w-44 rounded-full border border-cyan-300/20" />
                  <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-[#073044]">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold tracking-wide">
                          GRADEUP
                        </p>
                        <p className="text-[10px] font-medium tracking-[0.16em] text-cyan-100/65">
                          LEARNING EXPERIENCE
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-cyan-100">
                      YOUR LEARNING SPACE
                    </span>
                  </div>

                  <div className="relative mt-10 max-w-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                      Explore your potential
                    </p>
                    <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.5rem]">
                      Setiap proses belajar punya arti.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Temukan pengalaman belajar yang lebih terarah dalam
                      satu ruang digital.
                    </p>
                  </div>

                  <div className="relative mt-8 flex items-center gap-2">
                    <span className="h-1.5 w-9 rounded-full bg-cyan-400" />
                    <span className="h-1.5 w-3 rounded-full bg-white/25" />
                    <span className="h-1.5 w-3 rounded-full bg-white/25" />
                  </div>
                </div>

                <div className="space-y-3 bg-[#f4fbfd] p-4 dark:bg-slate-800 sm:p-5">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Ruang belajarmu
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Pilih cara untuk terus berkembang
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                        <BookMarked className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">
                        Materi Belajar
                      </h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Pahami materi secara bertahap.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Target className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">
                        Latihan Ujian
                      </h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Uji pemahaman dan kemampuanmu.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Kenali perkembanganmu
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Jadikan setiap latihan sebagai langkah kemajuan.
                      </p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-cyan-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -left-5 top-[38%] hidden items-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3 shadow-xl shadow-cyan-900/10 dark:border-slate-700 dark:bg-slate-900 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Belajar cerdas
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Satu langkah setiap hari
                </p>
              </div>
            </div>

            <div className="absolute -right-3 bottom-10 hidden items-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3 shadow-xl shadow-cyan-900/10 dark:border-slate-700 dark:bg-slate-900 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Terus berkembang
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fokus pada proses belajar
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          VALUE STRIP
      ====================================================== */}
      <section className="relative z-10 -mt-1 border-y border-cyan-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container grid gap-5 py-7 sm:grid-cols-3 sm:gap-8">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                Materi Terstruktur
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Belajar sesuai kebutuhan
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 sm:justify-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                Latihan dan Ujian
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Asah pemahaman secara aktif
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 sm:justify-end">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ChartNoAxesCombined className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                Evaluasi Belajar
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kenali perkembangan diri
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FEATURES
      ====================================================== */}
      <section className="container py-20 sm:py-28">
        <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionTitle
            eyebrow="Kenapa GradeUp?"
            title="Bukan hanya belajar. Bangun kemampuan."
            description="GradeUp menggabungkan materi pembelajaran, latihan, dan evaluasi agar perjalanan belajarmu menjadi lebih terarah."
          />

          <div className="flex justify-start lg:justify-end">
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-cyan-200 font-bold hover:bg-cyan-50 dark:border-cyan-900 dark:hover:bg-cyan-950"
            >
              <Link to="/features">
                Jelajahi Fitur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_20px_50px_-25px_rgba(8,145,178,0.25)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-900"
            >
              <span className="absolute right-6 top-5 text-5xl font-black tracking-tighter text-slate-100 transition-colors group-hover:text-cyan-50 dark:text-slate-800 dark:group-hover:text-cyan-950/50">
                0{index + 1}
              </span>

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition-all duration-300 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-950 dark:text-cyan-300">
                <feature.icon className="h-6 w-6" />
              </div>

              <h3 className="relative mt-7 text-lg font-extrabold text-slate-900 dark:text-white">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>

              <div className="mt-6 h-1 w-10 rounded-full bg-cyan-200 transition-all duration-300 group-hover:w-16 group-hover:bg-cyan-500 dark:bg-cyan-900" />
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          COURSES
      ====================================================== */}
      <section className="overflow-hidden border-y border-cyan-100 bg-[#f4fbfe] py-20 dark:border-slate-800 dark:bg-slate-950 sm:py-28">
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
              className="w-fit shrink-0 rounded-xl border-cyan-200 bg-white font-bold hover:bg-cyan-50 dark:border-cyan-900 dark:bg-slate-900 dark:hover:bg-cyan-950"
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
              featuredCourses.map((course, index) => {
                const thumbnail = course.thumbnail?.trim() ?? "";
                const isImage = /^https?:\/\//i.test(thumbnail);

                return (
                  <article
                    key={course.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-cyan-100 to-sky-50 dark:from-cyan-950 dark:to-slate-800">
                      {isImage ? (
                        <img
                          src={thumbnail}
                          alt={course.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/70 text-cyan-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/70 dark:text-cyan-300">
                            <BookOpen className="h-9 w-9" />
                          </div>
                        </div>
                      )}

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-cyan-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-cyan-300">
                          {course.category}
                        </span>
                      </div>

                      {course.premium && (
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-extrabold text-amber-950 shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                          PREMIUM
                        </span>
                      )}

                      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
                        <Layers3 className="h-3.5 w-3.5 text-cyan-600" />
                        {course.level || "Semua Tingkat"}
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {hasDescription(course.description)
                          ? course.description
                          : "Pelajari materi ini dan tingkatkan pemahamanmu bersama GradeUp."}
                      </p>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Pengajar
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                            {course.instructor || "GradeUp"}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="rounded-xl bg-cyan-600 font-bold text-white hover:bg-cyan-700"
                          onClick={() =>
                            requireLogin(
                              `mempelajari materi "${course.title}"`
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

      {/* =====================================================
          EXAMS
      ====================================================== */}
      <section className="container py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle
            eyebrow="Latihan dan Evaluasi"
            title="Persiapkan dirimu dengan latihan."
            description="Pilih paket ujian yang tersedia untuk menguji pemahaman dan melatih kesiapanmu."
          />

          <Button
            asChild
            variant="outline"
            className="w-fit shrink-0 rounded-xl border-cyan-200 font-bold hover:bg-cyan-50 dark:border-cyan-900 dark:hover:bg-cyan-950"
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
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative overflow-hidden bg-[#08374a] px-6 pb-7 pt-6 text-white">
                  <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-cyan-300/20" />
                  <div className="absolute -right-2 -top-7 h-28 w-28 rounded-full bg-cyan-400/10 blur-xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-[#08374a]">
                      <ClipboardList className="h-6 w-6" />
                    </div>

                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-cyan-100">
                      {Number(exam.price ?? 0) <= 0
                        ? "GRATIS"
                        : formatPrice(Number(exam.price))}
                    </span>
                  </div>

                  <div className="relative mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                      Paket evaluasi
                    </p>
                    <h3 className="mt-2 line-clamp-2 min-h-[3.5rem] text-xl font-extrabold leading-snug">
                      {exam.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap gap-2">
                    {exam.type && (
                      <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        {exam.type}
                      </span>
                    )}

                    {exam.level && (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {exam.level}
                        {exam.grade ? ` Kelas ${exam.grade}` : ""}
                      </span>
                    )}

                    {exam.difficulty && (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {exam.difficulty}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {hasDescription(exam.description)
                      ? exam.description
                      : "Latih kemampuan dan uji pemahamanmu melalui paket ujian GradeUp."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 shrink-0 text-cyan-600" />
                      <div>
                        <p className="text-[10px] text-slate-400">Durasi</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {exam.duration_minutes && exam.duration_minutes > 0
                            ? `${exam.duration_minutes} menit`
                            : "Fleksibel"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 shrink-0 text-cyan-600" />
                      <div>
                        <p className="text-[10px] text-slate-400">Jumlah soal</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {Number(exam.total_questions ?? 0) > 0
                            ? `${exam.total_questions} soal`
                            : "Lihat detail"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {exam.subject && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <GraduationCap className="h-4 w-4 text-cyan-600" />
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
                    className="mt-6 w-full rounded-xl bg-cyan-600 font-bold text-white hover:bg-cyan-700"
                    onClick={() =>
                      requireLogin(`mengerjakan paket "${exam.title}"`)
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
      </section>

      {/* =====================================================
          PREMIUM
      ====================================================== */}
      <section className="relative isolate overflow-hidden border-y border-cyan-100 bg-[#f1faff] py-20 dark:border-slate-800 dark:bg-slate-950 sm:py-28">
        <div className="pointer-events-none absolute -right-40 top-0 -z-10 h-96 w-96 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-900/20" />
        <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-900/20" />

        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>GradeUp Premium</SectionLabel>
            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              Lebih banyak kesempatan untuk
              <span className="text-cyan-600 dark:text-cyan-400">
                {" "}
                berkembang.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
              Temukan pilihan paket Premium yang sesuai dengan kebutuhan
              belajarmu dan nikmati akses sesuai ketentuan masing-masing paket.
            </p>
          </div>

          <div className="relative mt-14">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* =====================================================
          FAQ
      ====================================================== */}
      <section className="container py-20 sm:py-28">
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
                className="rounded-xl border-cyan-200 font-bold hover:bg-cyan-50 dark:border-cyan-900 dark:hover:bg-cyan-950"
              >
                <Link to="/faq">
                  Kunjungi Pusat Bantuan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <FaqAccordion items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ====================================================== */}
      <section className="container pb-20 sm:pb-28">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#07374a] px-6 py-16 text-center text-white shadow-[0_30px_80px_-30px_rgba(8,145,178,0.45)] sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-cyan-300/15" />
          <div className="pointer-events-none absolute -right-4 -top-12 -z-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />

          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-100">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Mulai perjalananmu bersama GradeUp
          </span>

          <h2 className="mx-auto mt-7 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Langkah besar dimulai dari
            <span className="text-cyan-300"> belajar hari ini.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Buat akun GradeUp secara gratis, temukan materi pembelajaran,
            dan mulai persiapkan dirimu menghadapi berbagai ujian.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-cyan-400 px-7 font-extrabold text-[#07374a] hover:bg-cyan-300"
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
              className="h-12 rounded-xl border-white/30 bg-white/5 px-7 font-bold text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/about">Kenali GradeUp</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
