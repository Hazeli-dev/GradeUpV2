
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
  CheckCircle2,
  BookMarked,
  Target,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";
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
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_15%,hsl(var(--soft))_0%,transparent_55%)]" />
        <div className="absolute -right-40 top-10 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="container grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-32">
          <div className="animate-fade-up text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4" />
              Selamat datang di GradeUp
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Belajar Lebih Terarah,
              <span className="text-gradient"> Raih Hasil Terbaik.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Satu platform untuk mempelajari materi, berlatih mengerjakan
              soal, dan mengevaluasi perkembangan belajarmu.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="h-12 px-7 shadow-glow">
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 px-7"
                onClick={() => requireLogin("mencoba simulasi ujian")}
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Coba Simulasi Ujian
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-sm text-muted-foreground lg:justify-start">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Pembelajaran terarah
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Materi pembelajaran
              </span>
              <span className="flex items-center gap-2">
                <ChartNoAxesCombined className="h-4 w-4 text-primary" />
                Evaluasi belajar
              </span>
            </div>
          </div>

          {/* HERO VISUAL - TANPA STATISTIK PALSU */}
          <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-primary/5 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border bg-card p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between border-b pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-extrabold tracking-tight">GradeUp</p>
                    <p className="text-xs text-muted-foreground">
                      Ruang belajar digital
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  Learning Platform
                </span>
              </div>

              <div className="py-7">
                <p className="text-sm font-semibold text-primary">
                  Belajar dengan lebih terarah
                </p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                  Satu langkah kecil untuk kemajuan yang lebih besar.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Temukan materi, latih pemahaman, dan persiapkan dirimu
                  menghadapi berbagai evaluasi pembelajaran.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold">Materi Belajar</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Pelajari berbagai materi sesuai kebutuhanmu.
                  </p>
                </div>

                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Target className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold">Latihan Ujian</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Asah pemahaman melalui latihan dan evaluasi.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Terus berkembang</p>
                  <p className="text-xs text-muted-foreground">
                    Bangun kebiasaan belajar yang lebih baik bersama GradeUp.
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="container py-20 sm:py-24">
        <SectionHeading
          eyebrow="Keunggulan GradeUp"
          title="Semua kebutuhan belajar dalam satu platform"
          description="Fitur pembelajaran yang dirancang untuk mendukung proses belajar menjadi lebih terarah."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
                <feature.icon className="h-6 w-6" />
              </span>

              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KURSUS */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <SectionHeading
              center={false}
              eyebrow="Materi Pembelajaran"
              title="Mulai perjalanan belajarmu"
              description="Jelajahi materi pembelajaran yang tersedia di GradeUp."
            />

            <Button asChild variant="outline" className="shrink-0">
              <Link to="/courses">
                Lihat Semua Materi
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingCourses ? (
              <div className="col-span-full flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : featuredCourses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 font-bold">Materi segera tersedia</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Materi pembelajaran baru akan ditampilkan di sini.
                </p>
              </div>
            ) : (
              featuredCourses.map((course) => {
                const thumbnail = course.thumbnail?.trim() ?? "";
                const isImage = /^https?:\/\//i.test(thumbnail);

                return (
                  <article
                    key={course.id}
                    className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      {isImage ? (
                        <img
                          src={thumbnail}
                          alt={course.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-primary">
                          <BookOpen className="h-14 w-14 text-white/90" />
                        </div>
                      )}

                      {course.premium && (
                        <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                          Premium
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                          {course.category}
                        </span>
                        {course.level && (
                          <span className="text-muted-foreground">
                            {course.level}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 line-clamp-2 min-h-14 text-lg font-bold">
                        {course.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                        {hasDescription(course.description)
                          ? course.description
                          : "Pelajari materi ini dan tingkatkan pemahamanmu bersama GradeUp."}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t pt-4">
                        <span className="text-xs text-muted-foreground">
                          {course.instructor || "GradeUp"}
                        </span>

                        <Button
                          size="sm"
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

      {/* PAKET UJIAN */}
      <section className="container py-20 sm:py-24">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <SectionHeading
            center={false}
            eyebrow="Latihan dan Evaluasi"
            title="Uji pemahamanmu bersama GradeUp"
            description="Pilih paket ujian dan latih kemampuanmu secara bertahap."
          />

          <Button asChild variant="outline" className="shrink-0">
            <Link to="/exams">
              Lihat Semua Paket
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loadingExams ? (
            <div className="col-span-full flex justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : featuredExams.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 font-bold">Paket ujian segera tersedia</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Paket ujian terbaru akan ditampilkan di sini.
              </p>
            </div>
          ) : (
            featuredExams.map((exam) => (
              <article
                key={exam.id}
                className="flex flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="h-6 w-6" />
                  </div>

                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {Number(exam.price ?? 0) <= 0
                      ? "Gratis"
                      : formatPrice(Number(exam.price))}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  {exam.type && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                      {exam.type}
                    </span>
                  )}

                  {exam.level && (
                    <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      {exam.level}
                      {exam.grade ? ` Kelas ${exam.grade}` : ""}
                    </span>
                  )}

                  {exam.difficulty && (
                    <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      {exam.difficulty}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 line-clamp-2 min-h-14 text-lg font-bold">
                  {exam.title}
                </h3>

                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                  {hasDescription(exam.description)
                    ? exam.description
                    : "Latih kemampuan dan uji pemahamanmu melalui paket ujian GradeUp."}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                  {exam.duration_minutes && exam.duration_minutes > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {exam.duration_minutes} menit
                    </span>
                  )}

                  {Number(exam.total_questions ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4" />
                      {exam.total_questions} soal
                    </span>
                  )}

                  {exam.subject && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      {exam.subject}
                    </span>
                  )}
                </div>

                <Button
                  className="mt-auto w-full"
                  onClick={() =>
                    requireLogin(`mengerjakan paket "${exam.title}"`)
                  }
                >
                  <span className="pt-5">Mulai Ujian</span>
                  <ArrowRight className="ml-2 mt-5 h-4 w-4" />
                </Button>
              </article>
            ))
          )}
        </div>
      </section>

      {/* PREMIUM */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Paket Premium"
            title="Maksimalkan pengalaman belajarmu"
            description="Pilih paket Premium sesuai kebutuhan dan nikmati pengalaman belajar yang lebih lengkap."
          />

          <div className="mt-14">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="Pusat Bantuan"
            title="Ada yang ingin kamu ketahui?"
            description="Temukan jawaban atas pertanyaan seputar penggunaan GradeUp."
          />

          <div className="mt-10">
            <FaqAccordion items={faqs.slice(0, 5)} />
          </div>

          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link to="/faq">
                Lihat Semua FAQ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-16 text-center text-white shadow-glow sm:px-12 sm:py-20">
          <div className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-20 -left-10 -z-10 h-64 w-64 rounded-full bg-white/10 blur-sm" />

          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold">
            <Sparkles className="h-4 w-4" />
            Mulai bersama GradeUp
          </span>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Masa depan belajar dimulai dari sini.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Buat akun gratis, temukan materi pembelajaran, dan mulai
            persiapkan dirimu menghadapi berbagai ujian.
          </p>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="mt-8 h-12 border-white/40 bg-white px-7 font-bold text-primary hover:bg-white/90"
          >
            <Link to="/register">
              Daftar Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
