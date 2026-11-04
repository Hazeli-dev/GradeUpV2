
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers3,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  BookMarked,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";

import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/format";

/* =========================================
   TYPES
========================================= */

interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  sort_order: number;
  is_published: boolean;
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  course_lessons: CourseLesson[] | null;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string | null;
  instructor: string;
  premium: boolean;
  status: string;
  thumbnail: string | null;
  course_modules: CourseModule[] | null;
}

interface StudentProfile {
  is_premium: boolean | null;
  premium_until: string | null;
}

interface CourseData {
  course: CourseDetail;
  isPremiumUser: boolean;
}

/* =========================================
   HELPERS
========================================= */

function getPublishedModules(
  modules: CourseModule[] | null
): CourseModule[] {
  return (modules ?? [])
    .filter((module) => module.is_published)
    .map((module) => ({
      ...module,
      course_lessons: (module.course_lessons ?? [])
        .filter((lesson) => lesson.is_published)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function getTotalLessons(modules: CourseModule[]): number {
  return modules.reduce(
    (total, module) =>
      total + (module.course_lessons?.length ?? 0),
    0
  );
}

function getTotalDuration(modules: CourseModule[]): number {
  return modules.reduce(
    (total, module) =>
      total +
      (module.course_lessons ?? []).reduce(
        (lessonTotal, lesson) =>
          lessonTotal + (lesson.estimated_minutes || 0),
        0
      ),
    0
  );
}

/* =========================================
   COURSE DETAIL PAGE
========================================= */

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { openUpgrade } = useUpgradeModal();

  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const [startingLessonId, setStartingLessonId] =
    useState<string | null>(null);

  /* =========================================
     FETCH COURSE
  ========================================= */

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setError("ID kursus tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: courseData,
        error: courseError,
      } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          category,
          level,
          instructor,
          premium,
          status,
          thumbnail,
          course_modules (
            id,
            title,
            description,
            sort_order,
            is_published,
            course_lessons (
              id,
              title,
              description,
              estimated_minutes,
              sort_order,
              is_published
            )
          )
        `)
        .eq("id", courseId)
        .eq("status", "Published")
        .maybeSingle();

      if (courseError) throw courseError;

      if (!courseData) {
        setData(null);
        return;
      }

      const course = courseData as unknown as CourseDetail;

      let isPremiumUser = false;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (user) {
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("is_premium, premium_until")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const studentProfile =
          profile as StudentProfile | null;

        isPremiumUser = Boolean(
          studentProfile?.is_premium &&
            studentProfile.premium_until &&
            new Date(studentProfile.premium_until).getTime() >
              Date.now()
        );
      }

      setData({
        course,
        isPremiumUser,
      });

      const modules = getPublishedModules(
        course.course_modules
      );

      setExpandedModules(
        Object.fromEntries(
          modules.map((module, index) => [
            module.id,
            index === 0,
          ])
        )
      );
    } catch (err: unknown) {
      console.error("Fetch course detail error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat detail kursus."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  /* =========================================
     DERIVED DATA
  ========================================= */

  const course = data?.course ?? null;

  const modules = useMemo(
    () => getPublishedModules(course?.course_modules ?? []),
    [course]
  );

  const totalLessons = useMemo(
    () => getTotalLessons(modules),
    [modules]
  );

  const totalDuration = useMemo(
    () => getTotalDuration(modules),
    [modules]
  );

  const isLocked = Boolean(
    course?.premium && !data?.isPremiumUser
  );

  /* =========================================
     MODULE TOGGLE
  ========================================= */

  const toggleModule = (moduleId: string) => {
    setExpandedModules((previous) => ({
      ...previous,
      [moduleId]: !previous[moduleId],
    }));
  };

  /* =========================================
     START LEARNING
  ========================================= */

  const handleStartLesson = async (lesson: CourseLesson) => {
    if (!course) return;

    if (isLocked) {
      openUpgrade();
      return;
    }

    if (startingLessonId) return;

    try {
      setStartingLessonId(lesson.id);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        toast.error(
          "Silakan login terlebih dahulu untuk mulai belajar."
        );
        return;
      }

      navigate(
        `/dashboard/courses/${course.id}/learn/${lesson.id}`
      );
    } catch (err: unknown) {
      console.error("Start lesson error:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Tidak dapat membuka sesi pembelajaran."
      );
    } finally {
      setStartingLessonId(null);
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return <PageSkeleton />;
  }

  /* =========================================
     ERROR
  ========================================= */

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => void fetchCourse()}
      />
    );
  }

  /* =========================================
     NOT FOUND
  ========================================= */

  if (!course) {
    return (
      <EmptyState
        title="Kursus tidak ditemukan"
        description="Kursus mungkin belum diterbitkan atau sudah tidak tersedia."
        action={
          <Button
            onClick={() => navigate("/dashboard/courses")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke materi
          </Button>
        }
      />
    );
  }

  /* =========================================
     MAIN CONTENT
  ========================================= */

  return (
    <div className="min-h-full w-full space-y-6 pb-12 text-foreground">
      {/* BACK NAVIGATION */}

      <div className="flex items-center justify-between gap-3">
        <Link
          to="/dashboard/courses"
          className="group inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Kembali ke Materi
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchCourse()}
          className="gap-2 text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Muat ulang</span>
        </Button>
      </div>

      {/* COURSE HERO */}

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          {/* THUMBNAIL */}

          <div className="group relative min-h-[260px] overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-700 lg:min-h-[420px]">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap className="h-28 w-28 text-white/70" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/10" />

            <div className="absolute left-5 top-5 flex flex-wrap gap-2 sm:left-7 sm:top-7">
              <Badge className="border border-white/20 bg-white/95 text-teal-800 shadow-sm hover:bg-white">
                {course.category || "Pembelajaran"}
              </Badge>

              <Badge className="border border-white/20 bg-slate-950/35 text-white backdrop-blur-md hover:bg-slate-950/45">
                {course.level || "Semua Jenjang"}
              </Badge>
            </div>

            {course.premium && (
              <Badge className="absolute right-5 top-5 gap-1 border-0 bg-amber-400 text-amber-950 shadow-lg hover:bg-amber-400 sm:right-7 sm:top-7">
                <Sparkles className="h-3 w-3" />
                Premium
              </Badge>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 lg:p-8">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <BookMarked className="h-4 w-4" />
                GradeUp Learning
              </div>

              <h1 className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-3xl lg:text-4xl">
                {course.title}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                Mulai perjalanan belajarmu, pahami setiap materi,
                dan tingkatkan kemampuan melalui pembelajaran
                interaktif.
              </p>
            </div>
          </div>

          {/* COURSE INFORMATION */}

          <div className="flex flex-col justify-between gap-6 p-5 sm:p-7 lg:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {course.premium ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    <Lock className="h-3 w-3" />
                    Kursus Premium
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Kursus Gratis
                  </Badge>
                )}

                {data?.isPremiumUser && course.premium && (
                  <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                    <ShieldCheck className="h-3 w-3" />
                    Akses Aktif
                  </Badge>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Tentang Kursus
                </p>

                <p className="text-sm leading-7 text-muted-foreground">
                  {course.description ||
                    "Belum ada deskripsi untuk kursus ini."}
                </p>
              </div>

              {/* STATISTICS */}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Layers3 className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight">
                    {modules.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Modul pembelajaran
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight">
                    {totalLessons}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sesi pembelajaran
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-extrabold tracking-tight">
                    {formatDuration(totalDuration)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimasi belajar
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <p className="truncate text-base font-extrabold tracking-tight">
                    {course.instructor || "GradeUp"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pengajar
                  </p>
                </div>
              </div>
            </div>

            {/* ACCESS PANEL */}

            <div
              className={cn(
                "rounded-2xl border p-4 sm:p-5",
                isLocked
                  ? "border-amber-500/25 bg-amber-500/5"
                  : "border-emerald-500/25 bg-emerald-500/5"
              )}
            >
              {isLocked ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Lock className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bold">
                        Buka Akses Premium
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Nikmati akses ke seluruh materi kursus
                        Premium GradeUp dengan berlangganan.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2 bg-amber-500 text-amber-950 hover:bg-amber-400"
                    onClick={openUpgrade}
                  >
                    <Sparkles className="h-4 w-4" />
                    Lihat Akses Premium
                    <ArrowUpRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-bold">
                      Kamu siap untuk belajar!
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Pilih salah satu sesi di bawah untuk
                      memulai pembelajaran.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* LEARNING STRUCTURE */}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        {/* MODULE LIST */}

        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <BookOpen className="h-4 w-4" />
                Learning Path
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight">
                Struktur Pembelajaran
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Ikuti modul dan sesi secara bertahap untuk
                memahami seluruh materi.
              </p>
            </div>

            <Badge
              variant="outline"
              className="rounded-full px-3 py-1"
            >
              {totalLessons} Sesi
            </Badge>
          </div>

          {modules.length === 0 ? (
            <EmptyState
              title="Materi belum tersedia"
              description="Belum ada modul dan sesi pembelajaran yang diterbitkan untuk kursus ini."
            />
          ) : (
            <div className="space-y-4">
              {modules.map((module, moduleIndex) => {
                const lessons = module.course_lessons ?? [];
                const isExpanded =
                  expandedModules[module.id] ?? false;

                return (
                  <Card
                    key={module.id}
                    className="overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all hover:border-primary/25"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">
                        {String(moduleIndex + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
                            Modul {moduleIndex + 1}
                          </span>

                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />

                          <span className="text-xs text-muted-foreground">
                            {lessons.length} sesi
                          </span>
                        </div>

                        <p className="font-bold leading-snug text-foreground">
                          {module.title}
                        </p>

                        {module.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {module.description}
                          </p>
                        )}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <CardContent className="space-y-2 border-t border-border bg-muted/20 p-3 sm:p-4">
                        {lessons.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-6 text-center">
                            <BookOpen className="mx-auto h-7 w-7 text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              Belum ada sesi yang diterbitkan.
                            </p>
                          </div>
                        ) : (
                          lessons.map((lesson, lessonIndex) => {
                            const isStarting =
                              startingLessonId === lesson.id;

                            return (
                              <div
                                key={lesson.id}
                                className={cn(
                                  "group flex flex-col gap-3 rounded-xl border border-border bg-card p-3 transition-all",
                                  "hover:border-primary/35 hover:shadow-sm sm:flex-row sm:items-center sm:p-4"
                                )}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                    <BookOpen className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold leading-snug text-foreground">
                                      {lesson.title}
                                    </p>

                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDuration(
                                          lesson.estimated_minutes || 0
                                        )}
                                      </span>

                                      <span>
                                        Sesi {lessonIndex + 1}
                                      </span>
                                    </div>

                                    {lesson.description && (
                                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                        {lesson.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  className="w-full shrink-0 gap-2 rounded-lg sm:w-auto"
                                  variant={
                                    isLocked ? "outline" : "default"
                                  }
                                  disabled={
                                    isLocked ||
                                    startingLessonId !== null
                                  }
                                  onClick={() =>
                                    void handleStartLesson(lesson)
                                  }
                                >
                                  {isStarting ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : isLocked ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4 fill-current" />
                                  )}

                                  {isLocked
                                    ? "Premium"
                                    : isStarting
                                      ? "Membuka..."
                                      : "Mulai Belajar"}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* COURSE SIDEBAR */}

        <aside className="space-y-4 xl:sticky xl:top-24">
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 p-5">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>

              <h3 className="font-bold">
                Ringkasan Kursus
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Informasi pembelajaran yang tersedia.
              </p>
            </div>

            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <Layers3 className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xl font-extrabold">
                    {modules.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Modul
                  </p>
                </div>

                <div className="rounded-xl bg-muted/40 p-3">
                  <BookOpen className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xl font-extrabold">
                    {totalLessons}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sesi
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Ketersediaan materi
                  </span>
                  <span className="font-bold text-primary">
                    {totalLessons} sesi
                  </span>
                </div>

                <Progress
                  value={totalLessons > 0 ? 100 : 0}
                  className="h-2"
                />

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Jumlah sesi yang telah diterbitkan oleh pengajar.
                  Ini bukan persentase penyelesaian belajar.
                </p>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Estimasi belajar
                  </span>
                  <span className="ml-auto font-semibold">
                    {formatDuration(totalDuration)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Pengajar
                  </span>
                  <span className="ml-auto max-w-[120px] truncate font-semibold">
                    {course.instructor || "GradeUp"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Akses kursus
                  </span>
                  <span className="ml-auto font-semibold">
                    {course.premium ? "Premium" : "Gratis"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LEARNING TIP */}

          <Card className="overflow-hidden rounded-2xl border-primary/20 bg-primary/[0.04] shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>

                <h3 className="font-bold">
                  Tips Belajar
                </h3>
              </div>

              <p className="text-xs leading-6 text-muted-foreground">
                Pelajari materi secara berurutan. Setelah memahami
                satu bagian, kerjakan checkpoint untuk memastikan
                pemahamanmu sebelum membuka bagian selanjutnya.
              </p>
            </CardContent>
          </Card>

          {/* PREMIUM INFORMATION */}

          {course.premium && (
            <Card className="rounded-2xl border-amber-500/25 bg-amber-500/[0.04] shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-bold">
                    GradeUp Premium
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Kursus ini termasuk dalam koleksi Premium
                  GradeUp.
                </p>

                {!data?.isPremiumUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                    onClick={openUpgrade}
                  >
                    Lihat Premium
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
