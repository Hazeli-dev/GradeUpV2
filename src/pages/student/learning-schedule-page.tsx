
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Trophy,
  BookMarked,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

// =====================================================
// TYPES
// =====================================================

type ProfileData = {
  full_name: string | null;
  grade: number | null;
  education_level: string | null;
  is_premium: boolean;
  premium_until: string | null;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  day_of_week: number;
  subject: string;
  sort_order: number;
  is_active: boolean;
};

type Recommendation = {
  schedule_id: string;
  day_of_week: number;
  subject: string;
  sort_order: number;
  package_id: string;
  package_title: string;
  description: string | null;
  category: string | null;
  grade: string | null;
  level: number | null;
  duration_minutes: number | null;
  total_questions: number | null;
  passing_score: number | null;
  premium: boolean;
};

type CourseInfo = {
  id: string;
  title: string;
  premium: boolean;
};

type LessonInfo = {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  module: {
    id: string;
    title: string;
    course: CourseInfo;
  };
  completed: boolean;
};

type LearningProgressData = {
  lesson_id?: string;
  sections?: Array<{
    section_id?: string;
    checkpoint_completed?: boolean;
  }>;
  final_assessment?: {
    assessment_id?: string;
    title?: string;
    completed?: boolean;
  } | null;
};

type CourseRow = {
  id: string;
  title: string;
  premium: boolean | null;
  level: string | null;
  grade: number | null;
  status: string | null;
};

type ModuleRow = {
  id: string;
  title: string;
  course_id: string;
  is_published: boolean;
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  module_id: string;
};

type DayInfo = {
  label: string;
  short: string;
};

const DAYS: DayInfo[] = [
  { label: "Senin", short: "Sen" },
  { label: "Selasa", short: "Sel" },
  { label: "Rabu", short: "Rab" },
  { label: "Kamis", short: "Kam" },
  { label: "Jumat", short: "Jum" },
  { label: "Sabtu", short: "Sab" },
  { label: "Minggu", short: "Min" },
];

// =====================================================
// HELPERS
// =====================================================

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
}

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function normalizeLevel(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (
    normalized === "sd" ||
    normalized.includes("sekolahdasar") ||
    normalized.includes("sdmi") ||
    normalized.includes("madrasahibtidaiyah")
  ) {
    return "SD";
  }

  if (
    normalized === "smp" ||
    normalized.includes("sekolahmenengahpertama") ||
    normalized.includes("smpmts") ||
    normalized.includes("mts")
  ) {
    return "SMP";
  }

  if (
    normalized === "sma" ||
    normalized.includes("sekolahmenengahatas") ||
    normalized.includes("smama") ||
    normalized.includes("madrasahaliyah")
  ) {
    return "SMA";
  }

  return "";
}

function inferLevelFromGrade(grade: number | null): string {
  if (grade === null) return "";

  if (grade >= 1 && grade <= 6) return "SD";
  if (grade >= 7 && grade <= 9) return "SMP";
  if (grade >= 10 && grade <= 12) return "SMA";

  return "";
}

function isLessonCompleted(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as LearningProgressData;
  const sections = Array.isArray(progress.sections)
    ? progress.sections
    : [];

  if (sections.length === 0) return false;

  const allSectionsCompleted = sections.every(
    (section) => section.checkpoint_completed === true
  );

  if (!allSectionsCompleted) return false;

  if (progress.final_assessment) {
    return progress.final_assessment.completed === true;
  }

  return true;
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function StudentLearningSchedulePage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [subjectToAdd, setSubjectToAdd] = useState("");

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lessonError, setLessonError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ===================================================
  // LOAD COURSE MATERIALS
  // ===================================================

  const loadCourseMaterials = useCallback(
    async (studentProfile: ProfileData) => {
      setLoadingLessons(true);
      setLessonError("");

      try {
        const studentLevel =
          normalizeLevel(studentProfile.education_level) ||
          inferLevelFromGrade(studentProfile.grade);

        if (!studentLevel) {
          setLessons([]);
          setLessonError(
            "Jenjang pendidikan pada profil belum dapat dikenali. Periksa kembali profil siswa."
          );
          return;
        }

        // 1. Ambil kursus yang sudah dipublikasikan.
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id,title,premium,level,grade,status")
          .eq("status", "Published");

        if (courseError) throw courseError;

        const matchingCourses = ((courseData ?? []) as CourseRow[]).filter(
          (course) => {
            const courseLevel = normalizeLevel(course.level);

            if (courseLevel !== studentLevel) return false;

            // Jika kelas kursus ditentukan, harus cocok
            // dengan kelas siswa.
            if (
              course.grade !== null &&
              studentProfile.grade !== null &&
              course.grade !== studentProfile.grade
            ) {
              return false;
            }

            return true;
          }
        );

        if (matchingCourses.length === 0) {
          setLessons([]);
          return;
        }

        const courseIds = matchingCourses.map((course) => course.id);

        // 2. Ambil modul yang sudah dipublikasikan.
        const { data: moduleData, error: moduleError } = await supabase
          .from("course_modules")
          .select("id,title,course_id,is_published")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("sort_order", { ascending: true });

        if (moduleError) throw moduleError;

        const publishedModules = (moduleData ?? []) as ModuleRow[];

        if (publishedModules.length === 0) {
          setLessons([]);
          return;
        }

        const moduleIds = publishedModules.map((module) => module.id);

        // 3. Ambil pelajaran yang sudah dipublikasikan.
        const { data: lessonData, error: lessonErrorResult } =
          await supabase
            .from("course_lessons")
            .select(
              "id,title,description,estimated_minutes,module_id"
            )
            .in("module_id", moduleIds)
            .eq("is_published", true)
            .order("sort_order", { ascending: true });

        if (lessonErrorResult) throw lessonErrorResult;

        const publishedLessons = (lessonData ?? []) as LessonRow[];

        if (publishedLessons.length === 0) {
          setLessons([]);
          return;
        }

        const courseMap = new Map(
          matchingCourses.map((course) => [
            course.id,
            {
              id: course.id,
              title: course.title,
              premium: course.premium === true,
            },
          ])
        );

        const moduleMap = new Map(
          publishedModules.map((module) => [
            module.id,
            module,
          ])
        );

        // Hanya pelajaran dengan hubungan modul dan kursus valid.
        const validLessons = publishedLessons.filter((lesson) => {
          const module = moduleMap.get(lesson.module_id);

          return Boolean(
            module && courseMap.has(module.course_id)
          );
        });

        if (validLessons.length === 0) {
          setLessons([]);
          return;
        }

        // 4. Periksa progres dengan batas enam permintaan bersamaan.
        const progressMap = new Map<string, boolean>();
        let currentIndex = 0;

        const worker = async () => {
          while (currentIndex < validLessons.length) {
            const index = currentIndex++;
            const lesson = validLessons[index];

            try {
              const { data: progressData, error: progressError } =
                await supabase.rpc("get_lesson_learning_progress", {
                  p_lesson_id: lesson.id,
                });

              if (progressError) {
                console.error(
                  "Load lesson progress:",
                  lesson.id,
                  progressError
                );

                progressMap.set(lesson.id, false);
                continue;
              }

              progressMap.set(
                lesson.id,
                isLessonCompleted(progressData)
              );
            } catch (err) {
              console.error("Check lesson progress:", err);
              progressMap.set(lesson.id, false);
            }
          }
        };

        const workerCount = Math.min(6, validLessons.length);

        await Promise.all(
          Array.from({ length: workerCount }, () => worker())
        );

        // 5. Bentuk data untuk tampilan.
        const mappedLessons: LessonInfo[] = validLessons
          .map((lesson) => {
            const module = moduleMap.get(lesson.module_id);

            if (!module) return null;

            const course = courseMap.get(module.course_id);

            if (!course) return null;

            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              estimated_minutes: lesson.estimated_minutes ?? 0,
              module: {
                id: module.id,
                title: module.title,
                course,
              },
              completed: progressMap.get(lesson.id) === true,
            };
          })
          .filter((item): item is LessonInfo => item !== null);

        // Materi yang sudah selesai tidak ditampilkan.
        setLessons(
          mappedLessons.filter((lesson) => !lesson.completed)
        );
      } catch (err) {
        console.error("Load course materials:", err);
        setLessonError(formatError(err));
      } finally {
        setLoadingLessons(false);
      }
    },
    []
  );

  // ===================================================
  // LOAD RECOMMENDATIONS
  // ===================================================

  const loadRecommendations = useCallback(
    async (dayIndex: number) => {
      setLoadingRecommendations(true);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_daily_learning_recommendations",
          {
            p_day_of_week: dayIndex,
          }
        );

        if (rpcError) throw rpcError;

        const result = Array.isArray(data)
          ? (data as Recommendation[])
          : [];

        setRecommendations(
          result.sort((a, b) => a.sort_order - b.sort_order)
        );
      } catch (err) {
        console.error("Load recommendations:", err);
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    },
    []
  );

  // ===================================================
  // LOAD PAGE
  // ===================================================

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      const [
        { data: profileData, error: profileError },
        { data: scheduleData, error: scheduleError },
        { data: packageData, error: packageError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name,grade,education_level,is_premium,premium_until"
          )
          .eq("id", user.id)
          .single(),

        supabase
          .from("student_learning_schedules")
          .select(
            "id,user_id,day_of_week,subject,sort_order,is_active"
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("exam_packages")
          .select("category")
          .eq("type", "Latihan")
          .eq("is_active", true),
      ]);

      if (profileError) throw profileError;
      if (scheduleError) throw scheduleError;
      if (packageError) throw packageError;

      const normalizedProfile: ProfileData = {
        full_name: profileData?.full_name ?? null,
        grade:
          profileData?.grade === null ||
          profileData?.grade === undefined
            ? null
            : Number(profileData.grade),
        education_level: profileData?.education_level ?? null,
        is_premium: profileData?.is_premium === true,
        premium_until: profileData?.premium_until ?? null,
      };

      setProfile(normalizedProfile);

      const schedules = (scheduleData ?? []) as ScheduleRow[];
      setScheduleRows(schedules);

      const subjects = Array.from(
        new Set(
          (packageData ?? [])
            .map((item) => item.category)
            .filter(
              (item): item is string =>
                typeof item === "string" && item.trim() !== ""
            )
        )
      ).sort((a, b) => a.localeCompare(b));

      setAvailableSubjects(subjects);

      const currentDaySubjects = schedules
        .filter((item) => item.day_of_week === selectedDay)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.subject);

      setSelectedSubjects(currentDaySubjects);

      // Materi hanya dimuat ketika halaman pertama kali
      // dibuka atau pengguna menekan tombol Muat Ulang.
      await loadCourseMaterials(normalizedProfile);
    } catch (err) {
      console.error("Load schedule page:", err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedDay, loadCourseMaterials]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  // ===================================================
  // RELOAD RECOMMENDATIONS WHEN DAY CHANGES
  // ===================================================

  useEffect(() => {
    if (!userId) return;

    void loadRecommendations(selectedDay);
  }, [userId, selectedDay, loadRecommendations]);

  // ===================================================
  // SELECT DAY
  // ===================================================

  const handleSelectDay = (index: number) => {
    setSelectedDay(index);

    const daySubjects = scheduleRows
      .filter((item) => item.day_of_week === index)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.subject);

    setSelectedSubjects(daySubjects);
    setSubjectToAdd("");
    setSuccessMessage("");
  };

  // ===================================================
  // ADD SUBJECT
  // ===================================================

  const addSubject = () => {
    if (!subjectToAdd) return;

    if (selectedSubjects.includes(subjectToAdd)) {
      setSubjectToAdd("");
      return;
    }

    setSelectedSubjects((previous) => [
      ...previous,
      subjectToAdd,
    ]);

    setSubjectToAdd("");
    setSuccessMessage("");
  };

  // ===================================================
  // REMOVE SUBJECT
  // ===================================================

  const removeSubject = (subject: string) => {
    setSelectedSubjects((previous) =>
      previous.filter((item) => item !== subject)
    );

    setSuccessMessage("");
  };

  // ===================================================
  // REORDER SUBJECT
  // ===================================================

  const moveSubject = (
    index: number,
    direction: "up" | "down"
  ) => {
    setSelectedSubjects((previous) => {
      const next = [...previous];

      const targetIndex =
        direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return previous;
      }

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });
  };

  // ===================================================
  // SAVE SCHEDULE
  // ===================================================

  const saveSchedule = async () => {
    if (!userId || saving) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const currentRows = scheduleRows.filter(
        (item) => item.day_of_week === selectedDay
      );

      const currentSubjects = currentRows.map(
        (item) => item.subject
      );

      const removedRows = currentRows.filter(
        (item) => !selectedSubjects.includes(item.subject)
      );

      const newSubjects = selectedSubjects.filter(
        (subject) => !currentSubjects.includes(subject)
      );

      // Hapus kategori yang tidak dipilih.
      if (removedRows.length > 0) {
        const { error: deleteError } = await supabase
          .from("student_learning_schedules")
          .delete()
          .in(
            "id",
            removedRows.map((item) => item.id)
          )
          .eq("user_id", userId);

        if (deleteError) throw deleteError;
      }

      // Perbarui urutan kategori yang sudah ada.
      for (let index = 0; index < selectedSubjects.length; index++) {
        const subject = selectedSubjects[index];

        const existing = currentRows.find(
          (item) => item.subject === subject
        );

        if (existing) {
          const { error: updateError } = await supabase
            .from("student_learning_schedules")
            .update({
              sort_order: index,
              is_active: true,
            })
            .eq("id", existing.id)
            .eq("user_id", userId);

          if (updateError) throw updateError;
        }
      }

      // Tambahkan kategori baru.
      for (const subject of newSubjects) {
        const index = selectedSubjects.indexOf(subject);

        const { error: insertError } = await supabase
          .from("student_learning_schedules")
          .insert({
            user_id: userId,
            day_of_week: selectedDay,
            subject,
            sort_order: index,
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      const { data, error: reloadError } = await supabase
        .from("student_learning_schedules")
        .select(
          "id,user_id,day_of_week,subject,sort_order,is_active"
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (reloadError) throw reloadError;

      setScheduleRows((data ?? []) as ScheduleRow[]);
      setSuccessMessage("Jadwal berhasil disimpan.");

      // Perbarui rekomendasi tanpa memuat ulang seluruh halaman.
      await loadRecommendations(selectedDay);
    } catch (err) {
      console.error("Save schedule:", err);
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // CURRENT DAY DATA
  // ===================================================

  const currentDayName = DAYS[selectedDay].label;

  const currentRecommendations = useMemo(() => {
    return recommendations
      .filter((item) =>
        selectedSubjects.includes(item.subject)
      )
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [recommendations, selectedSubjects]);

  const remainingSubjects = useMemo(() => {
    return availableSubjects.filter(
      (subject) => !selectedSubjects.includes(subject)
    );
  }, [availableSubjects, selectedSubjects]);

  const lessonsByCourse = useMemo(() => {
    const groups = new Map<
      string,
      {
        course: CourseInfo;
        lessons: LessonInfo[];
      }
    >();

    for (const lesson of lessons) {
      const courseId = lesson.module.course.id;

      if (!groups.has(courseId)) {
        groups.set(courseId, {
          course: lesson.module.course,
          lessons: [],
        });
      }

      groups.get(courseId)?.lessons.push(lesson);
    }

    return Array.from(groups.values());
  }, [lessons]);

  const totalEstimatedMinutes = lessons.reduce(
    (total, item) => total + (item.estimated_minutes || 0),
    0
  );

  // ===================================================
  // START LEARNING
  // ===================================================

  const handleStartLesson = (lesson: LessonInfo) => {
    navigate(
      `/dashboard/courses/${lesson.module.course.id}/learn/${lesson.id}`
    );
  };

  // ===================================================
  // START PRACTICE
  // ===================================================

  const handleStartPractice = (item: Recommendation) => {
    navigate(`/dashboard/exams/${item.package_id}/attempt`);
  };

  // ===================================================
  // LOADING VIEW
  // ===================================================

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="rounded-2xl bg-emerald-500/10 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>

        <div className="text-center">
          <p className="font-semibold">
            Menyiapkan jadwal belajar
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // MAIN VIEW
  // ===================================================

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-7">

        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CalendarDays className="h-4 w-4" />
                Jadwal pembelajaran
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Rencanakan belajarmu
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Materi kursus dan latihan tersusun dalam satu tempat.
                Pelajari materi yang tersedia dan lanjutkan latihan
                sesuai jadwal belajarmu.
              </p>

              <p className="mt-4 text-sm font-semibold">
                Halo, {profile?.full_name || "Siswa"}!
                {profile?.grade ? (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {profile.education_level || "Kelas"} {profile.grade}
                  </span>
                ) : null}
              </p>
            </div>

            <button
              onClick={() => void loadPage()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Muat ulang
            </button>
          </div>
        </section>

        {/* ALERT */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* SUMMARY */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Materi tersedia
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {lessons.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Jadwal hari ini
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {selectedSubjects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Estimasi materi
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {totalEstimatedMinutes}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    menit
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DAY SELECTOR */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold">
                  Jadwal mingguan
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih hari untuk mengatur mata pelajaran.
              </p>
            </div>

            <span className="text-xs font-semibold text-muted-foreground">
              {currentDayName}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DAYS.map((day, index) => {
              const active = selectedDay === index;
              const hasSchedule = scheduleRows.some(
                (item) => item.day_of_week === index
              );

              return (
                <button
                  key={day.label}
                  onClick={() => handleSelectDay(index)}
                  className={`relative flex min-h-[68px] flex-col items-center justify-center rounded-2xl border px-2 py-3 transition sm:min-h-[76px] ${
                    active
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                      : "border-border bg-background hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {day.short}
                  </span>

                  {hasSchedule && (
                    <span
                      className={`mt-2 h-1.5 w-1.5 rounded-full ${
                        active ? "bg-white" : "bg-emerald-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* SUBJECT SETTINGS */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold">
                  Mata pelajaran {currentDayName}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan kategori latihan melalui dropdown.
              </p>
            </div>

            <button
              onClick={() => void saveSchedule()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Menyimpan..." : "Simpan jadwal"}
            </button>
          </div>

          {/* DROPDOWN CATEGORY */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <select
              value={subjectToAdd}
              onChange={(event) => setSubjectToAdd(event.target.value)}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Pilih kategori mata pelajaran...</option>

              {remainingSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <button
              onClick={addSubject}
              disabled={!subjectToAdd}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Tambahkan
            </button>
          </div>

          {selectedSubjects.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">
                  Kategori terpilih
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedSubjects.length} kategori
                </span>
              </div>

              <div className="space-y-2">
                {selectedSubjects.map((subject, index) => (
                  <div
                    key={subject}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {subject}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => moveSubject(index, "up")}
                        disabled={index === 0}
                        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                        title="Naikkan urutan"
                      >
                        <ChevronLeft className="h-4 w-4 rotate-90" />
                      </button>

                      <button
                        onClick={() => moveSubject(index, "down")}
                        disabled={index === selectedSubjects.length - 1}
                        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                        title="Turunkan urutan"
                      >
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </button>

                      <button
                        onClick={() => removeSubject(subject)}
                        className="rounded-lg border border-border p-2 text-red-500 transition hover:bg-red-500/10"
                        title="Hapus kategori"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
              <GraduationCap className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">
                Belum ada mata pelajaran
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih kategori dari dropdown untuk membuat jadwal belajar.
              </p>
            </div>
          )}

          {availableSubjects.length === 0 && (
            <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Belum ada kategori latihan aktif yang tersedia.
            </p>
          )}
        </section>

        {/* COURSE MATERIALS */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                <BookMarked className="h-4 w-4" />
                Materi pembelajaran
              </div>

              <h2 className="text-xl font-bold sm:text-2xl">
                Lanjutkan materi kursus
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Materi disesuaikan dengan jenjang dan kelas pada profilmu.
              </p>
            </div>

            <span className="w-fit rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
              {lessons.length} materi tersedia
            </span>
          </div>

          {loadingLessons ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Memeriksa progres materi...
            </div>
          ) : lessonError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5" />
                Materi belum dapat dimuat
              </div>
              <p className="mt-2">{lessonError}</p>
              <button
                onClick={() => {
                  if (profile) void loadCourseMaterials(profile);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 font-semibold"
              >
                <RefreshCw className="h-4 w-4" />
                Coba lagi
              </button>
            </div>
          ) : lessonsByCourse.length > 0 ? (
            <div className="space-y-5">
              {lessonsByCourse.map((group) => (
                <div
                  key={group.course.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-blue-500/10 p-3">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          KURSUS
                        </p>
                        <h3 className="mt-1 break-words font-bold">
                          {group.course.title}
                        </h3>
                      </div>
                    </div>

                    {group.course.premium && (
                      <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        Premium
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-border">
                    {group.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <BookMarked className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {lesson.module.title}
                            </p>

                            <h4 className="mt-1 break-words font-bold">
                              {lesson.title}
                            </h4>

                            {lesson.description && (
                              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                {lesson.description}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />
                                {lesson.estimated_minutes || 0} menit
                              </span>

                              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <BookOpen className="h-3.5 w-3.5" />
                                Belum selesai
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartLesson(lesson)}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Mulai Belajar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                <BookOpen className="h-8 w-8 text-emerald-600" />
              </div>

              <h3 className="mt-4 text-lg font-bold">
                Belum ada materi yang tersedia
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Belum ada materi yang sesuai dengan jenjang dan kelasmu,
                atau semua materi yang tersedia sudah selesai dipelajari.
              </p>
            </div>
          )}
        </section>

        {/* DAILY PRACTICE */}
        <section className="space-y-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Latihan harian
            </div>

            <h2 className="text-xl font-bold sm:text-2xl">
              Rekomendasi latihan {currentDayName}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Latihan mengikuti mata pelajaran yang kamu pilih.
            </p>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Menyiapkan rekomendasi latihan...
            </div>
          ) : currentRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {currentRecommendations.map((item, index) => (
                <div
                  key={`${item.package_id}-${index}`}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-emerald-500/30 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.subject}
                        </p>

                        <h3 className="mt-1 break-words font-bold">
                          {item.package_title}
                        </h3>
                      </div>
                    </div>

                    {item.premium && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                        Premium
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.total_questions != null && (
                      <span className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        {item.total_questions} soal
                      </span>
                    )}

                    {item.duration_minutes != null && (
                      <span className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        {item.duration_minutes} menit
                      </span>
                    )}

                    {item.passing_score != null && (
                      <span className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        KKM {item.passing_score}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartPractice(item)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Mulai Latihan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Trophy className="h-7 w-7 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-bold">
                Belum ada rekomendasi latihan
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Pilih mata pelajaran untuk hari {currentDayName},
                kemudian simpan jadwal agar rekomendasi latihan dapat
                ditampilkan.
              </p>
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold">
                Progres belajar tersimpan
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Progres materi diperiksa menggunakan sistem pembelajaran
                GradeUp. Materi yang sudah selesai tidak akan muncul lagi
                pada daftar materi yang perlu dilanjutkan.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
