
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
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
     FETCH COURSE FROM SUPABASE
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
        setLoading(false);
        return;
      }

      const course = courseData as unknown as CourseDetail;

      /* =====================================
         CHECK STUDENT PREMIUM ENTITLEMENT
      ====================================== */

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
     TOGGLE MODULE
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

      /*
       * Pemeriksaan akses konten dilakukan kembali oleh
       * RLS dan RPC pada halaman pembelajaran.
       *
       * Halaman belajar siswa akan dibuat pada tahap berikutnya.
       */

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
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      {/* BACK NAVIGATION */}

      <Link
        to="/dashboard/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Materi Belajar
      </Link>

      {/* COURSE HERO */}

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          {/* THUMBNAIL */}

          <div className="relative min-h-[230px] overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-600 lg:min-h-[370px]">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />

            {!course.thumbnail && (
              <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap className="h-24 w-24 text-white/80" />
              </div>
            )}

            <div className="absolute bottom-5 left-5 right-5 text-white">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className="border-0 bg-white/95 text-teal-800">
                  {course.category}
                </Badge>

                <Badge className="border-0 bg-white/20 text-white backdrop-blur">
                  {course.level || "Umum"}
                </Badge>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight drop-shadow sm:text-3xl">
                {course.title}
              </h1>
            </div>

            {course.premium && (
              <Badge className="absolute right-4 top-4 gap-1 border-0 bg-amber-400 text-amber-950">
                <Sparkles className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>

          {/* COURSE INFORMATION */}

          <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {course.premium ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600"
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    Kursus Premium
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Kursus Gratis
                  </Badge>
                )}

                {data?.isPremiumUser && course.premium && (
                  <Badge className="bg-emerald-600 text-white">
                    <ShieldCheck className="mr-1 h-3 w-3" />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Layers3 className="h-4 w-4" />
                    <span className="text-xs">Modul</span>
                  </div>

                  <p className="text-xl font-bold">
                    {modules.length}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs">Sesi belajar</span>
                  </div>

                  <p className="text-xl font-bold">
                    {totalLessons}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Estimasi waktu</span>
                  </div>

                  <p className="text-xl font-bold">
                    {formatDuration(totalDuration)}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-xs">Pengajar</span>
                  </div>

                  <p className="truncate text-sm font-bold">
                    {course.instructor}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-primary/5 p-4">
              {isLocked ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                      <Lock className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bold">
                        Kursus Premium
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Aktifkan akses Premium GradeUp untuk
                        membuka seluruh materi kursus ini.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={openUpgrade}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Lihat Akses Premium
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Siap untuk belajar?
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Pilih sesi pembelajaran untuk memulai.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* MODULE AND LESSON LIST */}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">
                Struktur Pembelajaran
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Pelajari materi secara bertahap dari setiap modul.
              </p>
            </div>

            <Badge variant="outline">
              {totalLessons} Sesi
            </Badge>
          </div>

          {modules.length === 0 ? (
            <EmptyState
              title="Materi belum tersedia"
              description="Belum ada modul dan sesi pembelajaran yang diterbitkan untuk kursus ini."
            />
          ) : (
            <div className="space-y-3">
              {modules.map((module, moduleIndex) => {
                const lessons = module.course_lessons ?? [];

                const isExpanded =
                  expandedModules[module.id] ?? false;

                return (
                  <Card
                    key={module.id}
                    className="overflow-hidden border-border/70"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {moduleIndex + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {module.title}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {lessons.length} sesi pembelajaran
                        </p>

                        {module.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {module.description}
                          </p>
                        )}
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <CardContent className="space-y-2 border-t bg-muted/10 p-3 sm:p-4">
                        {lessons.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            Belum ada sesi yang diterbitkan.
                          </p>
                        ) : (
                          lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className={cn(
                                "flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:p-4",
                                "transition-colors hover:border-primary/30"
                              )}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                                  <BookOpen className="h-4 w-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">
                                    {moduleIndex + 1}.
                                    {lessonIndex + 1}.{" "}
                                    {lesson.title}
                                  </p>

                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDuration(
                                        lesson.estimated_minutes || 0
                                      )}
                                    </span>

                                    {lesson.description && (
                                      <span className="line-clamp-1">
                                        · {lesson.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                className="w-full shrink-0 gap-2 sm:w-auto"
                                disabled={
                                  isLocked ||
                                  startingLessonId !== null
                                }
                                onClick={() =>
                                  void handleStartLesson(lesson)
                                }
                              >
                                {startingLessonId === lesson.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : isLocked ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}

                                {isLocked
                                  ? "Premium"
                                  : startingLessonId === lesson.id
                                    ? "Membuka..."
                                    : "Mulai Belajar"}
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* COURSE SIDEBAR */}

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" />
                Ringkasan Kursus
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Materi tersedia
                  </span>

                  <span className="font-bold">
                    {totalLessons} sesi
                  </span>
                </div>

                <Progress
                  value={totalLessons > 0 ? 100 : 0}
                  className="h-2"
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  Jumlah sesi yang telah diterbitkan oleh pengajar.
                </p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Layers3 className="h-4 w-4 text-primary" />
                  <span>{modules.length} modul pembelajaran</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>{totalLessons} sesi materi</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {formatDuration(totalDuration)} estimasi belajar
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>
                    {course.premium
                      ? "Akses Premium"
                      : "Akses Gratis"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="h-4 w-4 text-primary" />
                Belajar Bertahap
              </div>

              <p className="text-xs leading-6 text-muted-foreground">
                Selesaikan setiap bagian materi dan checkpoint
                sebelum melanjutkan ke bagian berikutnya.
                Evaluasi akhir tersedia setelah seluruh checkpoint
                selesai.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
