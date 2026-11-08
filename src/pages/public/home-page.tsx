
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  BookOpenCheck,
  BookMarked,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GraduationCap,
  Layers3,
  Lightbulb,
  Loader2,
  MoveUpRight,
  Play,
  Sparkles,
  Star,
  Target,
  ChartNoAxesCombined,
  ShieldCheck,
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

function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] ${
        light ? "text-cyan-200" : "text-cyan-700 dark:text-cyan-400"
      }`}
    >
      <span
        className={`h-px w-7 ${
          light ? "bg-cyan-300" : "bg-cyan-600 dark:bg-cyan-400"
        }`}
      />
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-5 text-3xl font-semibold leading-[1.13] tracking-[-0.045em] sm:text-4xl lg:text-[3.25rem] ${
          light ? "text-white" : "text-slate-950 dark:text-white"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-5 max-w-xl text-sm leading-7 sm:text-base ${
          light ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="col-span-full flex min-h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
    <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
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
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#fbfdfd] dark:bg-[#07151d]">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-cyan-100/70 blur-3xl dark:bg-cyan-950/30" />
          <div className="absolute -bottom-48 left-0 h-[500px] w-[500px] rounded-full bg-sky-100/50 blur-3xl dark:bg-sky-950/20" />
          <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#164e63_0.7px,transparent_0.7px)] [background-size:22px_22px] dark:opacity-[0.08]" />
        </div>

        <div className="container grid items-center gap-14 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:min-h-[760px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-24">
          <div className="relative z-10 max-w-2xl">
            <div className="animate-fade-up">
              <Eyebrow>Learning, elevated</Eyebrow>
            </div>

            <h1 className="mt-7 animate-fade-up text-[3.25rem] font-semibold leading-[0.99] tracking-[-0.065em] text-[#102b35] dark:text-white sm:text-7xl lg:text-[5.65rem]">
              Belajar dengan
              <span className="mt-2 block font-serif font-medium italic text-cyan-700 dark:text-cyan-400">
                arah yang jelas.
              </span>
              <span className="mt-2 block">Maju lebih jauh.</span>
            </h1>

            <p className="mt-8 max-w-lg animate-fade-up text-base leading-8 text-slate-600 [animation-delay:100ms] dark:text-slate-400 sm:text-lg">
              Ruang belajar digital untuk membangun pemahaman, mengasah
              kemampuan, dan mempersiapkan setiap langkah menuju masa depan.
            </p>

            <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:150ms] sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-[#0d5263] px-8 text-sm font-bold text-white shadow-xl shadow-cyan-900/15 transition-all hover:-translate-y-1 hover:bg-[#083e4d]"
              >
                <Link to="/register">
                  Mulai belajar gratis
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-slate-300 bg-white/70 px-8 text-sm font-semibold text-slate-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-800"
                onClick={() => requireLogin("mencoba simulasi ujian")}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Coba simulasi ujian
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-200 pt-7 dark:border-slate-800">
              {["Materi terstruktur", "Latihan interaktif", "Evaluasi progres"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    <Check className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-[570px] animate-fade-up [animation-delay:200ms]">
            <div className="absolute -inset-8 rounded-[4rem] bg-cyan-200/40 blur-3xl dark:bg-cyan-900/20" />

            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0b3542] p-5 shadow-[0_40px_100px_-35px_rgba(8,70,85,0.5)] sm:p-7">
              <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border border-cyan-200/10" />
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-cyan-200/10" />
              <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-[#0b3542]">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-[0.14em] text-white">
                      GRADEUP
                    </p>
                    <p className="mt-1 text-[9px] tracking-[0.2em] text-cyan-100/60">
                      YOUR LEARNING SPACE
                    </p>
                  </div>
                </div>
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>

              <div className="relative py-9 sm:py-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                  A better way to learn
                </p>
                <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.8rem]">
                  Setiap kemajuan dimulai dari satu langkah.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
                  Temukan pengalaman belajar yang membantu kamu berkembang
                  dengan lebih percaya diri.
                </p>
              </div>

              <div className="relative space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-[#0b3542]">
                      <BookMarked className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        Materi pembelajaran
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Bangun pemahaman secara bertahap
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-cyan-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                      <Target className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">
                      Latihan ujian
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                      Asah kemampuanmu
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200">
                      <Award className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">
                      Hasil belajar
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                      Kenali perkembanganmu
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400">
                  LEARN WITH PURPOSE
                </p>
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-7 rounded-full bg-cyan-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                </div>
              </div>
            </div>

            <div className="absolute -left-5 top-[34%] hidden rounded-2xl border border-white bg-white/95 p-4 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Belajar lebih terarah
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Fokus pada pemahaman
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 right-5 hidden rounded-2xl border border-white bg-white/95 p-4 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <ChartNoAxesCombined className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Terus berkembang
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Satu langkah setiap hari
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND VALUE */}
      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container grid gap-0 divide-y divide-slate-100 py-2 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-4 px-2 py-6 sm:px-7 sm:py-8">
            <BookOpen className="h-6 w-6 shrink-0 text-cyan-700 dark:text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Materi terstruktur
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Belajar sesuai kebutuhan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-2 py-6 sm:px-7 sm:py-8">
            <ClipboardList className="h-6 w-6 shrink-0 text-cyan-700 dark:text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Latihan dan ujian
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Asah pemahaman secara aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-2 py-6 sm:px-7 sm:py-8">
            <ChartNoAxesCombined className="h-6 w-6 shrink-0 text-cyan-700 dark:text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Evaluasi belajar
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Kenali perkembangan diri
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow="The GradeUp experience"
              title="Belajar lebih bermakna, bukan sekadar lebih banyak."
              description="Pengalaman belajar yang dirancang untuk membantumu memahami materi, melatih kemampuan, dan melihat perkembangan secara lebih terarah."
            />

            <Button
              asChild
              variant="outline"
              className="mt-8 h-12 rounded-full border-slate-300 px-6 font-semibold dark:border-slate-700"
            >
              <Link to="/features">
                Jelajahi fitur GradeUp
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`group border-slate-200 py-8 transition-colors hover:bg-cyan-50/50 dark:border-slate-800 dark:hover:bg-slate-900/70 sm:px-6 ${
                  index % 2 === 0 ? "sm:border-r" : ""
                } ${index < 2 ? "sm:border-b" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf8fa] text-[#0d6675] transition-all duration-300 group-hover:bg-[#0d5263] group-hover:text-white dark:bg-cyan-950 dark:text-cyan-300">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="font-serif text-2xl italic text-slate-300 dark:text-slate-700">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-7 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-700 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 dark:text-cyan-400">
                  Bagian dari pengalaman GradeUp
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="relative overflow-hidden border-y border-slate-200 bg-[#f5faf9] py-24 dark:border-slate-800 dark:bg-[#0a1920] sm:py-32">
        <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl dark:bg-cyan-950/30" />

        <div className="container relative">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Explore learning"
              title="Temukan materi yang membuka wawasan."
              description="Pilih materi pembelajaran yang tersedia dan mulailah perjalanan belajarmu dari sini."
            />

            <Button
              asChild
              variant="outline"
              className="h-12 w-fit shrink-0 rounded-full border-slate-300 bg-white px-6 font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              <Link to="/courses">
                Lihat semua materi
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_60px_-25px_rgba(15,75,85,0.22)] dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative aspect-[5/4] overflow-hidden bg-[#e6f4f4] dark:bg-slate-800">
                      {isImage ? (
                        <img
                          src={thumbnail}
                          alt={course.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#d7f2ed,transparent_55%),linear-gradient(135deg,#eaf8f7,#dceef2)] dark:bg-[linear-gradient(135deg,#12333b,#172a35)]">
                          <BookOpenCheck className="h-16 w-16 text-cyan-800/40 dark:text-cyan-300/40" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/40 to-transparent" />

                      <div className="absolute left-4 top-4">
                        <span className="rounded-full border border-white/70 bg-white/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm">
                          {course.category}
                        </span>
                      </div>

                      {course.premium && (
                        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-[#e9c77b] px-3.5 py-2 text-[10px] font-bold tracking-wider text-[#4b3510] shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                          PREMIUM
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-semibold text-white">
                        <Layers3 className="h-4 w-4" />
                        {course.level || "Semua Tingkat"}
                      </div>
                    </div>

                    <div className="p-6 sm:p-7">
                      <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {hasDescription(course.description)
                          ? course.description
                          : "Pelajari materi ini dan tingkatkan pemahamanmu bersama GradeUp."}
                      </p>

                      <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Pengajar
                          </p>
                          <p className="mt-1.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {course.instructor || "GradeUp"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            requireLogin(`mempelajari materi "${course.title}"`)
                          }
                          className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 transition-all hover:gap-3 dark:text-cyan-400"
                        >
                          Pelajari
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
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
      <section className="container py-24 sm:py-32">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Practice with purpose"
            title="Persiapkan diri dengan lebih percaya diri."
            description="Latihan dan evaluasi membantumu mengenali pemahaman serta mempersiapkan diri menghadapi berbagai ujian."
          />

          <Button
            asChild
            variant="outline"
            className="h-12 w-fit shrink-0 rounded-full border-slate-300 px-6 font-semibold dark:border-slate-700"
          >
            <Link to="/exams">
              Jelajahi paket ujian
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_25px_60px_-25px_rgba(15,75,85,0.2)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative overflow-hidden bg-[#103e49] px-7 pb-8 pt-7 text-white">
                  <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-cyan-200/10" />
                  <div className="absolute -right-5 -top-10 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200">
                      <ClipboardList className="h-6 w-6" />
                    </div>

                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-bold tracking-wider text-cyan-100">
                      {Number(exam.price ?? 0) <= 0
                        ? "GRATIS"
                        : formatPrice(Number(exam.price))}
                    </span>
                  </div>

                  <div className="relative mt-9">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                      Paket evaluasi
                    </p>
                    <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-snug tracking-tight">
                      {exam.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <div className="flex flex-wrap gap-2">
                    {exam.type && (
                      <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
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

                  <p className="mt-5 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {hasDescription(exam.description)
                      ? exam.description
                      : "Latih kemampuan dan uji pemahamanmu melalui paket ujian GradeUp."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 border-y border-slate-100 py-5 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Clock3 className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
                      <div>
                        <p className="text-[10px] text-slate-400">Durasi</p>
                        <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {exam.duration_minutes && exam.duration_minutes > 0
                            ? `${exam.duration_minutes} menit`
                            : "Fleksibel"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <ClipboardList className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
                      <div>
                        <p className="text-[10px] text-slate-400">Jumlah soal</p>
                        <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {Number(exam.total_questions ?? 0) > 0
                            ? `${exam.total_questions} soal`
                            : "Lihat detail"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {exam.subject && (
                    <p className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <GraduationCap className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      {exam.subject}
                    </p>
                  )}

                  {exam.premium && (
                    <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Paket Premium
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      requireLogin(`mengerjakan paket "${exam.title}"`)
                    }
                    className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0d5263] text-sm font-bold text-white transition-all hover:bg-[#083e4d] group-hover:shadow-lg group-hover:shadow-cyan-900/10"
                  >
                    Mulai ujian
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* PREMIUM */}
      <section className="relative isolate overflow-hidden bg-[#092f3a] py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-cyan-200/10" />
          <div className="absolute -right-16 -top-16 h-[350px] w-[350px] rounded-full border border-cyan-200/10" />
          <div className="absolute -bottom-48 -left-32 h-[550px] w-[550px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-100/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              <Star className="h-3.5 w-3.5 fill-current" />
              GradeUp Premium
            </div>

            <h2 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Berikan ruang lebih luas untuk
              <span className="block font-serif font-medium italic text-cyan-300">
                setiap potensimu.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Temukan pilihan paket Premium yang sesuai dengan kebutuhan
              belajarmu dan nikmati akses sesuai ketentuan masing-masing paket.
            </p>
          </div>

          <div className="relative mt-16">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="We're here to help"
              title="Ada yang ingin kamu ketahui?"
              description="Temukan jawaban dari pertanyaan yang sering diajukan tentang GradeUp dan pengalaman belajar di dalamnya."
            />

            <Button
              asChild
              variant="outline"
              className="mt-8 h-12 rounded-full border-slate-300 px-6 font-semibold dark:border-slate-700"
            >
              <Link to="/faq">
                Kunjungi pusat bantuan
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="mt-12 hidden border-t border-slate-200 pt-7 dark:border-slate-800 lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">
                    Informasi GradeUp
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Kenali layanan dan fitur yang tersedia.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-9">
            <FaqAccordion items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-24 sm:pb-32">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-[#eaf6f4] px-7 py-16 dark:bg-[#102e35] sm:px-14 sm:py-20 lg:px-20">
          <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-[430px] w-[430px] rounded-full border border-cyan-800/10 dark:border-cyan-200/10" />
          <div className="pointer-events-none absolute -right-4 -top-16 -z-10 h-[280px] w-[280px] rounded-full border border-cyan-800/10 dark:border-cyan-200/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <Eyebrow>Start your next chapter</Eyebrow>

              <h2 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-[#103640] dark:text-white sm:text-5xl lg:text-6xl">
                Masa depan dibangun dari apa yang kamu pelajari hari ini.
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Buat akun GradeUp secara gratis, temukan materi pembelajaran,
                dan mulai persiapkan dirimu menghadapi berbagai ujian.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[210px]">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-[#0d5263] px-7 font-bold text-white shadow-lg shadow-cyan-900/10 hover:bg-[#083e4d]"
              >
                <Link to="/register">
                  Daftar gratis
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-[#9bbfbd] bg-white/50 px-7 font-semibold text-[#164653] hover:bg-white dark:border-slate-600 dark:bg-slate-900/50 dark:text-white dark:hover:bg-slate-800"
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
