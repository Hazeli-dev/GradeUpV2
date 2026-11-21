import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  grade: number | null;
  level: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  passing_score: number | null;
  premium: boolean;
  start_time: string | null;
  end_time: string | null;
  has_passed: boolean;
  student_has_premium: boolean;
  access_status:
    | "open"
    | "upcoming"
    | "closed"
    | "premium_locked"
    | "completed";
  can_attempt: boolean;
};

type CourseInfo = {
  id: string;
  title: string;
  category: string | null;
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
  category: string | null;
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

type PackageCategoryRow = {
  category: string | null;
  grade: number | null;
  level: string | null;
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
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card utama.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

// Permukaan kecil di dalam card (baris, input, tombol sekunder).
const INSET =
  "border border-emerald-900/10 bg-white/70 dark:border-emerald-400/10 dark:bg-slate-950/40";

// Tombol utama emerald.
const BTN_PRIMARY =
  "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-700/25";

// Tombol sekunder biru (materi yang sudah selesai).
const BTN_BLUE =
  "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-blue-700/20 hover:from-sky-600 hover:to-blue-700";

// Animasi ringan. Dimatikan otomatis jika prefers-reduced-motion aktif.
const PAGE_STYLES = `
@keyframes gu-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
}
@keyframes gu-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(14px, 10px, 0) scale(1.05); }
}
.gu-float { animation: gu-float 10s ease-in-out infinite; }
.gu-drift { animation: gu-drift 16s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gu-float, .gu-drift { animation: none !important; }
}
`;

// =====================================================
// HELPERS
// =====================================================

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const err = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return [
      err.message,
      err.details,
      err.hint ? `Petunjuk: ${err.hint}` : "",
      err.code ? `Kode: ${err.code}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
}

function formatScheduleDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function getRecommendationStatus(item: Recommendation) {
  if (item.access_status === "completed") {
    return {
      label: "Selesai",
      description: "Kamu sudah mencapai nilai kelulusan.",
      buttonLabel: "Sudah Selesai",
      canStart: false,
      className:
        "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    };
  }

  if (item.access_status === "upcoming") {
    return {
      label: "Akan Datang",
      description: item.start_time
        ? `Latihan dibuka pada ${formatScheduleDate(item.start_time)} WIB`
        : "Latihan belum dibuka.",
      buttonLabel: "Belum Dibuka",
      canStart: false,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  if (item.access_status === "closed") {
    return {
      label: "Ditutup",
      description: "Waktu pengerjaan latihan sudah berakhir.",
      buttonLabel: "Sudah Ditutup",
      canStart: false,
      className:
        "bg-gray-100 text-gray-700 dark:bg-slate-500/20 dark:text-slate-300",
    };
  }

  if (item.access_status === "premium_locked") {
    return {
      label: "Premium",
      description: "Latihan ini khusus untuk siswa Premium.",
      buttonLabel: "Khusus Premium",
      canStart: false,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  return {
    label: "Tersedia",
    description: "Latihan siap dikerjakan.",
    buttonLabel: "Mulai Latihan",
    canStart: item.can_attempt,
    className:
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  };
}
// Frontend: Senin = 0 sampai Minggu = 6.
// Database: Senin = 1 sampai Minggu = 7.
function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function toDatabaseDay(frontendDay: number): number {
  return frontendDay + 1;
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
// Pemetaan kelas khusus untuk pengambilan materi kursus.
// Latihan dan ujian TIDAK menggunakan fungsi ini.
function getMaterialGrade(grade: number | null): number | null {
  if (grade === null) return null;

  if (grade >= 1 && grade <= 2) return 1;
  if (grade >= 3 && grade <= 4) return 3;
  if (grade >= 5 && grade <= 6) return 5;
  if (grade >= 7 && grade <= 9) return 7;
  if (grade === 10) return 10;
  if (grade >= 11 && grade <= 12) return 11;

  return grade;
}

function normalizeSubject(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/\s+/g, " ");
}

function normalizeSubjectBase(
  value: string | null | undefined
): string {
  return normalizeSubject(value)
    .replace(
      /\s+(sd\/mi|smp\/mts|sma\/ma\/smk|sma\/ma|smp|mts|sma|ma|smk|sd|mi)$/i,
      ""
    )
    .trim();
}

function categoryMatchesSubject(
  category: string | null | undefined,
  subject: string
): boolean {
  const categoryBase = normalizeSubjectBase(category);
  const subjectBase = normalizeSubjectBase(subject);

  if (!categoryBase || !subjectBase) return false;

  return categoryBase === subjectBase;
}

function isLessonCompleted(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue || typeof rawValue !== "object") return false;

  const progress = rawValue as LearningProgressData;
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

function sortSchedules(rows: ScheduleRow[]): ScheduleRow[] {
  return [...rows].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }

    return a.sort_order - b.sort_order;
  });
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

  const selectedDayRef = useRef(selectedDay);
  const recommendationRequestRef = useRef(0);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [subjectToAdd, setSubjectToAdd] = useState("");

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationError, setRecommendationError] = useState("");
  const [startingPackageId, setStartingPackageId] = useState("");
  const [allLessons, setAllLessons] = useState<LessonInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
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
          setAllLessons([]);
          setLessonError(
            "Jenjang pendidikan pada profil belum dapat dikenali. Periksa kembali profil siswa."
          );
          return;
        }

        // 1. Ambil kursus yang sudah dipublikasikan.
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id,title,premium,level,grade,status,category")
          .eq("status", "Published");

        if (courseError) throw courseError;

        // =====================================================
        // PEMETAAN FASE MATERI
        // =====================================================

        const grade = studentProfile.grade;

        const materialGrade = getMaterialGrade(grade);

        // Tentukan fase berdasarkan kelas siswa.
        const studentPhase =
          grade !== null
            ? grade >= 1 && grade <= 2
              ? "A"
              : grade >= 3 && grade <= 4
                ? "B"
                : grade >= 5 && grade <= 6
                  ? "C"
                  : grade >= 7 && grade <= 9
                    ? "D"
                    : grade === 10
                      ? "E"
                      : grade >= 11 && grade <= 12
                        ? "F"
                        : null
            : null;

        // Rentang kelas untuk masing-masing fase.
        const phaseGradeRanges: Record<string, number[]> = {
          A: [1, 2],
          B: [3, 4],
          C: [5, 6],
          D: [7, 8, 9],
          E: [10],
          F: [11, 12],
        };

        const matchingCourses = ((courseData ?? []) as CourseRow[]).filter(
          (course) => {
            const rawLevel = (course.level ?? "")
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();

            // Deteksi apakah level kursus menggunakan nama fase.
            const phaseMatch = rawLevel.match(/\bfase\s*([a-f])\b/i);
            const coursePhase = phaseMatch?.[1]?.toUpperCase() ?? null;

            // Jika kursus menggunakan nama fase A-F.
            if (coursePhase) {
              // Fase harus sama dengan fase siswa.
              if (!studentPhase || coursePhase !== studentPhase) {
                return false;
              }

              // Jika grade kursus diisi, pastikan masih dalam rentang fase.
              const allowedGrades = phaseGradeRanges[coursePhase];

              if (
                course.grade !== null &&
                !allowedGrades.includes(Number(course.grade))
              ) {
                return false;
              }

              return true;
            }

            // Jika kursus tidak menggunakan nama fase,
            // gunakan jenjang dan pemetaan kelas seperti sebelumnya.
            const courseLevel = normalizeLevel(course.level);

            if (courseLevel !== studentLevel) {
              return false;
            }

            if (
              course.grade !== null &&
              materialGrade !== null &&
              Number(course.grade) !== Number(materialGrade)
            ) {
              return false;
            }

            return true;
          }
        );

        console.info("[GradeUp] Pemetaan fase materi:", {
          studentLevel,
          studentGrade: grade,
          studentPhase,
          materialGrade,
          totalCourses: courseData?.length ?? 0,
          matchingCourses: matchingCourses.length,
          matchingCourseDetails: matchingCourses.map((course) => ({
            title: course.title,
            level: course.level,
            grade: course.grade,
            category: course.category,
          })),
        });

        console.info("[GradeUp] Kursus sesuai profil:", {
          studentLevel,
          studentGrade: studentProfile.grade,
          totalCourses: courseData?.length ?? 0,
          matchingCourses: matchingCourses.length,
        });

        if (matchingCourses.length === 0) {
          setAllLessons([]);
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
          setAllLessons([]);
          return;
        }

        const moduleIds = publishedModules.map((module) => module.id);

        // 3. Ambil materi yang sudah dipublikasikan.
        const { data: lessonData, error: lessonErrorResult } =
          await supabase
            .from("course_lessons")
            .select("id,title,description,estimated_minutes,module_id")
            .in("module_id", moduleIds)
            .eq("is_published", true)
            .order("sort_order", { ascending: true });

        if (lessonErrorResult) throw lessonErrorResult;

        const publishedLessons = (lessonData ?? []) as LessonRow[];

        if (publishedLessons.length === 0) {
          setAllLessons([]);
          return;
        }

        // 4. Hubungkan kursus dengan modul dan kategori.
        const courseMap = new Map(
          matchingCourses.map((course) => [
            course.id,
            {
              id: course.id,
              title: course.title,
              category: course.category ?? null,
              premium: course.premium === true,
            },
          ])
        );

        const moduleMap = new Map(
          publishedModules.map((module) => [module.id, module])
        );

        const validLessons = publishedLessons.filter((lesson) => {
          const module = moduleMap.get(lesson.module_id);
          return Boolean(module && courseMap.has(module.course_id));
        });

        if (validLessons.length === 0) {
          setAllLessons([]);
          return;
        }

        // 5. Periksa progres materi secara paralel.
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
                  "[GradeUp] Load lesson progress:",
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
              console.error("[GradeUp] Check lesson progress:", err);
              progressMap.set(lesson.id, false);
            }
          }
        };

        const workerCount = Math.min(6, validLessons.length);

        await Promise.all(
          Array.from({ length: workerCount }, () => worker())
        );

        // 6. Bentuk data materi.
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

        setAllLessons(mappedLessons);

        console.info("[GradeUp] Materi berhasil dimuat:", {
          total: mappedLessons.length,
          completed: mappedLessons.filter((item) => item.completed).length,
        });
      } catch (err) {
        console.error("[GradeUp] Load course materials:", err);
        setAllLessons([]);
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

  const loadRecommendations = useCallback(async (dayIndex: number) => {
    const requestId = ++recommendationRequestRef.current;

    setLoadingRecommendations(true);
    setRecommendationError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_daily_learning_recommendations_v2",
        {
          p_day_of_week: dayIndex,
        }
      );

      if (rpcError) throw rpcError;

      if (requestId !== recommendationRequestRef.current) return;

      const result = Array.isArray(data)
        ? (data as Recommendation[])
        : [];

      setRecommendations(
        result.sort((a, b) => a.sort_order - b.sort_order)
      );
    } catch (err) {
      if (requestId !== recommendationRequestRef.current) return;

      console.error("[GradeUp] Load recommendations:", err);

      setRecommendations([]);
      setRecommendationError(
        `Rekomendasi latihan gagal dimuat: ${formatError(err)}`
      );
    } finally {
      if (requestId === recommendationRequestRef.current) {
        setLoadingRecommendations(false);
      }
    }
  }, []);

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
      ]);

      if (profileError) throw profileError;
      if (scheduleError) throw scheduleError;

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

      const studentLevel =
        normalizeLevel(normalizedProfile.education_level) ||
        inferLevelFromGrade(normalizedProfile.grade);

      // Ambil kategori latihan yang sudah benar-benar dipublikasikan.
      const { data: packageData, error: packageError } = await supabase
        .from("exam_packages")
        .select("category,grade,level")
        .eq("type", "Latihan")
        .eq("status", "Published")
        .eq("is_active", true)
        .eq("is_published", true);

      if (packageError) throw packageError;

      const matchingPackageCategories = (
        (packageData ?? []) as PackageCategoryRow[]
      ).filter((item) => {
        if (
          item.grade !== null &&
          normalizedProfile.grade !== null &&
          Number(item.grade) !== Number(normalizedProfile.grade)
        ) {
          return false;
        }

        const packageLevel = normalizeLevel(item.level);

        if (packageLevel && studentLevel && packageLevel !== studentLevel) {
          return false;
        }

        return Boolean(item.category?.trim());
      });

      const subjects = Array.from(
        new Set(
          matchingPackageCategories
            .map((item) => item.category?.trim())
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "id"));

      setAvailableSubjects(subjects);

      const schedules = sortSchedules(
        (scheduleData ?? []) as ScheduleRow[]
      );

      setScheduleRows(schedules);

      // Konversi indeks hari sebelum membaca jadwal database.
      const activeDay = selectedDayRef.current;
      const databaseDay = toDatabaseDay(activeDay);

      const currentDaySubjects = schedules
        .filter((item) => item.day_of_week === databaseDay)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.subject);

      setSelectedSubjects(currentDaySubjects);

      await loadCourseMaterials(normalizedProfile);
    } catch (err) {
      console.error("[GradeUp] Load schedule page:", err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [navigate, loadCourseMaterials]);

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
  // FILTER MATERIALS BY SELECTED SCHEDULE
  // ===================================================

  const lessons = useMemo(() => {
    if (selectedSubjects.length === 0) return [];

    return allLessons.filter((lesson) => {
      const courseCategory = lesson.module.course.category;

      return selectedSubjects.some((subject) =>
        categoryMatchesSubject(courseCategory, subject)
      );
    });
  }, [allLessons, selectedSubjects]);

  // ===================================================
  // SELECT DAY
  // ===================================================

  const handleSelectDay = (index: number) => {
    selectedDayRef.current = index;
    setSelectedDay(index);

    const databaseDay = toDatabaseDay(index);

    const daySubjects = scheduleRows
      .filter((item) => item.day_of_week === databaseDay)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.subject);

    setSelectedSubjects(daySubjects);
    setSubjectToAdd("");
    setSuccessMessage("");
    setError("");
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

    setSelectedSubjects((previous) => [...previous, subjectToAdd]);

    setSubjectToAdd("");
    setSuccessMessage("");
    setError("");
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

    setSuccessMessage("");
  };

  // ===================================================
  // RELOAD SCHEDULE FROM DATABASE
  // ===================================================

  const reloadSchedules = useCallback(async () => {
    if (!userId) return [];

    const { data, error: reloadError } = await supabase
      .from("student_learning_schedules")
      .select(
        "id,user_id,day_of_week,subject,sort_order,is_active"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (reloadError) throw reloadError;

    const updatedSchedules = sortSchedules(
      (data ?? []) as ScheduleRow[]
    );

    setScheduleRows(updatedSchedules);

    const databaseDay = toDatabaseDay(selectedDayRef.current);

    const currentSubjects = updatedSchedules
      .filter((item) => item.day_of_week === databaseDay)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.subject);

    setSelectedSubjects(currentSubjects);

    return updatedSchedules;
  }, [userId]);

  // ===================================================
  // SAVE SCHEDULE
  // ===================================================

  const saveSchedule = async () => {
    if (!userId || saving) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const dayIndex = selectedDayRef.current;
      const databaseDay = toDatabaseDay(dayIndex);

      // Hilangkan kemungkinan kategori ganda.
      const desiredSubjects = Array.from(
        new Set(
          selectedSubjects
            .map((subject) => subject.trim())
            .filter(Boolean)
        )
      );

      // Hanya mengambil jadwal untuk hari yang sedang diedit.
      // Jadwal hari lain tidak akan ikut diubah.
      const currentRows = scheduleRows.filter(
        (item) => item.day_of_week === databaseDay
      );

      const currentSubjects = currentRows.map(
        (item) => item.subject
      );

      const removedRows = currentRows.filter(
        (item) => !desiredSubjects.includes(item.subject)
      );

      const newSubjects = desiredSubjects.filter(
        (subject) => !currentSubjects.includes(subject)
      );

      // LANGKAH 1: Tambahkan kategori baru.
      if (newSubjects.length > 0) {
        const newRows = newSubjects.map((subject) => ({
          user_id: userId,
          day_of_week: databaseDay,
          subject,
          sort_order: desiredSubjects.indexOf(subject),
          is_active: true,
        }));

        const { error: insertError } = await supabase
          .from("student_learning_schedules")
          .insert(newRows);

        if (insertError) throw insertError;
      }

      // LANGKAH 2: Perbarui urutan kategori yang sudah tersimpan.
      for (let index = 0; index < desiredSubjects.length; index++) {
        const subject = desiredSubjects[index];

        const existing = currentRows.find(
          (item) => item.subject === subject
        );

        if (!existing) continue;

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

      // LANGKAH 3: Hapus kategori yang tidak lagi dipilih.
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

      // LANGKAH 4: Ambil ulang data jadwal dari database.
      const updatedSchedules = await reloadSchedules();

      const savedSubjects = updatedSchedules
        .filter((item) => item.day_of_week === databaseDay)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.subject);

      setSelectedSubjects(savedSubjects);

      // LANGKAH 5: Muat ulang rekomendasi hari yang disimpan.
      await loadRecommendations(dayIndex);

      setSuccessMessage(
        "Jadwal berhasil disimpan. Materi dan latihan telah disesuaikan dengan jadwal."
      );
    } catch (err) {
      console.error("[GradeUp] Save schedule:", err);

      setError(`Jadwal gagal disimpan: ${formatError(err)}`);

      // Sinkronkan ulang tampilan jika sebagian proses berhasil.
      try {
        await reloadSchedules();
      } catch (reloadError) {
        console.error(
          "[GradeUp] Reload schedule after save failure:",
          reloadError
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // CURRENT DAY DATA
  // ===================================================

  const currentDayName = DAYS[selectedDay].label;

  const currentRecommendations = useMemo(() => {
    if (selectedSubjects.length === 0) return [];

    return recommendations
      .filter((item) =>
        selectedSubjects.some((subject) =>
          categoryMatchesSubject(item.subject, subject)
        )
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

  const completedLessonsCount = lessons.filter(
    (lesson) => lesson.completed
  ).length;

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

  const handleStartPractice = async (item: Recommendation) => {
    if (startingPackageId) return;

    if (!item.can_attempt) {
      return;
    }

    setStartingPackageId(item.package_id);
    setRecommendationError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_daily_learning_recommendations_v2",
        {
          p_day_of_week: selectedDay,
        }
      );

      if (rpcError) throw rpcError;

      const latestRecommendations = Array.isArray(data)
        ? (data as Recommendation[])
        : [];

      const latestPackage = latestRecommendations.find(
        (recommendation) =>
          recommendation.package_id === item.package_id
      );

      if (!latestPackage) {
        setRecommendationError(
          "Paket latihan tidak lagi tersedia pada jadwal hari ini. Muat ulang halaman untuk memperbarui data."
        );
        return;
      }

      if (!latestPackage.can_attempt) {
        setRecommendationError(
          `Paket tidak dapat dibuka. Status saat ini: ${
            getRecommendationStatus(latestPackage).label
          }.`
        );

        await loadRecommendations(selectedDay);
        return;
      }

      navigate(`/dashboard/exams/${item.package_id}/attempt`);
    } catch (err) {
      console.error("[GradeUp] Start practice:", err);

      setRecommendationError(
        `Paket latihan gagal dibuka: ${formatError(err)}`
      );
    } finally {
      setStartingPackageId("");
    }
  };

  // ===================================================
  // MAIN VIEW
  // ===================================================

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-emerald-50 via-white to-teal-50/70 text-foreground dark:from-[#07211b] dark:via-[#0a1a1f] dark:to-slate-900">
      <style>{PAGE_STYLES}</style>

      {/* BACKGROUND DEKORATIF (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Pola grid halus */}
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_55%_at_50%_0%,black,transparent)] dark:opacity-[0.35]" />

        {/* Orb ambient */}
        <div className="gu-drift absolute -left-32 top-24 h-[26rem] w-[26rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/15" />
        <div className="gu-float absolute -right-24 top-[34rem] h-[24rem] w-[24rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
        <div className="absolute -left-20 bottom-24 h-[22rem] w-[22rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-7">

        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-900 p-5 text-white shadow-[0_20px_50px_-20px_rgba(6,78,59,0.7)] sm:p-7 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />
            <div className="gu-drift absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
            <div className="absolute -right-10 bottom-4 h-36 w-36 rounded-full border border-white/10" />
            <div className="absolute -right-24 bottom-[-1.5rem] h-56 w-56 rounded-full border border-white/10" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>

          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50 backdrop-blur">
                <CalendarDays className="h-4 w-4" />
                Jadwal pembelajaran
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Rencanakan belajarmu
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/80 sm:text-base">
                Materi kursus dan latihan tersusun dalam satu tempat.
                Pelajari materi sesuai jadwal belajarmu.
              </p>

              <p className="mt-4 text-sm font-semibold">
                Halo, {profile?.full_name || "Siswa"}!
                {profile?.grade ? (
                  <span className="ml-2 font-normal text-emerald-100/75">
                    {profile.education_level || "Kelas"} {profile.grade}
                  </span>
                ) : null}
              </p>
            </div>

            <button
              onClick={() => void loadPage()}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              <RefreshCw className="h-4 w-4" />
              Muat ulang
            </button>
          </div>
        </section>

        {/* ALERT */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 backdrop-blur dark:text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 backdrop-blur dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* SUMMARY */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={`group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-blue-500/30 motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${GLASS}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-500/15">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Materi tersedia hari ini
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {lessons.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/30 motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${GLASS}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Materi selesai
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {completedLessonsCount}
                </p>
              </div>
            </div>
          </div>

          <div className={`group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-amber-500/30 motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${GLASS}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/15">
                <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
        <section className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 ${GLASS}`}>
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold">
                  Jadwal mingguan
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih hari untuk melihat dan mengatur mata pelajaran.
              </p>
            </div>

            <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {currentDayName}
            </span>
          </div>

          <div className="relative grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DAYS.map((day, index) => {
              const active = selectedDay === index;
              const databaseDay = toDatabaseDay(index);

              const hasSchedule = scheduleRows.some(
                (item) => item.day_of_week === databaseDay
              );

              return (
                <button
                  key={day.label}
                  onClick={() => handleSelectDay(index)}
                  className={`relative flex min-h-[68px] flex-col items-center justify-center rounded-2xl border px-2 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none sm:min-h-[76px] ${
                    active
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-700/25"
                      : "border-emerald-900/10 bg-white/60 hover:border-emerald-500/50 hover:bg-emerald-500/10 dark:border-emerald-400/10 dark:bg-slate-950/40"
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
        <section className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 ${GLASS}`}>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold">
                  Mata pelajaran {currentDayName}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Materi dan latihan akan mengikuti kategori yang dipilih di sini.
              </p>
            </div>

            <button
              onClick={() => void saveSchedule()}
              disabled={saving || !userId}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${BTN_PRIMARY}`}
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
          <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
            <select
              value={subjectToAdd}
              onChange={(event) => setSubjectToAdd(event.target.value)}
              className={`min-h-12 min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${INSET}`}
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
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${BTN_PRIMARY}`}
            >
              <Plus className="h-4 w-4" />
              Tambahkan
            </button>
          </div>

          {selectedSubjects.length > 0 ? (
            <div className="relative mt-6 border-t border-emerald-900/10 pt-5 dark:border-emerald-400/10">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">
                  Kategori terpilih
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {selectedSubjects.length} kategori
                </span>
              </div>

              <div className="space-y-2">
                {selectedSubjects.map((subject, index) => (
                  <div
                    key={subject}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3 transition hover:border-emerald-500/30 motion-reduce:transition-none ${INSET}`}
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
                        className="rounded-lg border border-emerald-900/10 p-2 text-muted-foreground transition hover:bg-emerald-500/10 disabled:opacity-30 dark:border-emerald-400/10 motion-reduce:transition-none"
                        title="Naikkan urutan"
                      >
                        <ChevronLeft className="h-4 w-4 rotate-90" />
                      </button>

                      <button
                        onClick={() => moveSubject(index, "down")}
                        disabled={index === selectedSubjects.length - 1}
                        className="rounded-lg border border-emerald-900/10 p-2 text-muted-foreground transition hover:bg-emerald-500/10 disabled:opacity-30 dark:border-emerald-400/10 motion-reduce:transition-none"
                        title="Turunkan urutan"
                      >
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </button>

                      <button
                        onClick={() => removeSubject(subject)}
                        className="rounded-lg border border-emerald-900/10 p-2 text-red-500 transition hover:bg-red-500/10 dark:border-emerald-400/10 motion-reduce:transition-none"
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
            <div className="relative mt-5 rounded-xl border border-dashed border-emerald-600/25 bg-emerald-500/5 p-5 text-center">
              <GraduationCap className="mx-auto h-7 w-7 text-emerald-600/60 dark:text-emerald-400/60" />
              <p className="mt-2 text-sm font-semibold">
                Belum ada mata pelajaran
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih kategori dari dropdown untuk membuat jadwal belajar.
              </p>
            </div>
          )}

          {availableSubjects.length === 0 && (
            <p className="relative mt-4 rounded-xl bg-muted/70 p-4 text-sm text-muted-foreground">
              Belum ada kategori latihan terpublikasi yang sesuai dengan profil siswa.
            </p>
          )}
        </section>

        {/* COURSE MATERIALS */}
        <section className="relative space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                <BookMarked className="h-4 w-4" />
                Materi pembelajaran
              </div>

              <h2 className="text-xl font-bold sm:text-2xl">
                Materi {currentDayName}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Hanya materi dari mata pelajaran yang dijadwalkan hari ini yang ditampilkan.
              </p>
            </div>

            <span className={`w-fit rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground ${GLASS}`}>
              {lessons.length} materi tersedia
            </span>
          </div>

          {loadingLessons ? (
            <div className={`flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground ${GLASS}`}>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Memeriksa progres materi...
            </div>
          ) : lessonError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-700 backdrop-blur dark:text-amber-300">
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
                  className={`relative overflow-hidden rounded-3xl ${GLASS}`}
                >
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

                  <div className="relative flex flex-col justify-between gap-3 border-b border-emerald-900/10 bg-gradient-to-r from-emerald-500/[0.07] via-transparent to-transparent p-4 dark:border-emerald-400/10 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-500/15">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          KURSUS
                        </p>
                        <h3 className="mt-1 break-words font-bold">
                          {group.course.title}
                        </h3>
                        {group.course.category && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {group.course.category}
                          </p>
                        )}
                      </div>
                    </div>

                    {group.course.premium && (
                      <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        Premium
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-emerald-900/10 dark:divide-emerald-400/10">
                    {group.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex flex-col gap-4 p-4 transition hover:bg-emerald-500/[0.04] motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:p-5"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                              lesson.completed
                                ? "bg-blue-500/10 text-blue-600 ring-blue-500/15 dark:text-blue-400"
                                : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400"
                            }`}
                          >
                            {lesson.completed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <BookMarked className="h-5 w-5" />
                            )}
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

                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  lesson.completed
                                    ? "font-semibold text-blue-600 dark:text-blue-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {lesson.completed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5" />
                                )}
                                {lesson.completed
                                  ? "Sudah selesai"
                                  : "Belum selesai"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartLesson(lesson)}
                          className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none sm:w-auto ${
                            lesson.completed ? BTN_BLUE : BTN_PRIMARY
                          }`}
                        >
                          <Play className="h-4 w-4 fill-current" />
                          {lesson.completed
                            ? "Pelajari Lagi"
                            : "Mulai Belajar"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-emerald-600/25 bg-white/60 px-5 py-12 text-center backdrop-blur-md dark:bg-slate-900/50">
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="relative mt-4 text-lg font-bold">
                {selectedSubjects.length === 0
                  ? "Belum ada jadwal mata pelajaran"
                  : "Belum ada materi untuk mata pelajaran ini"}
              </h3>

              <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {selectedSubjects.length === 0
                  ? `Belum ada mata pelajaran yang dijadwalkan untuk hari ${currentDayName}. Tambahkan mata pelajaran dan simpan jadwal terlebih dahulu.`
                  : `Belum ada materi kursus yang cocok dengan ${selectedSubjects.join(", ")}. Periksa kategori kursus, jenjang, kelas, dan status publikasinya.`}
              </p>

              <button
                onClick={() => {
                  if (profile) void loadCourseMaterials(profile);
                }}
                className={`relative mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10 motion-reduce:transition-none ${INSET}`}
              >
                <RefreshCw className="h-4 w-4" />
                Periksa kembali materi
              </button>
            </div>
          )}
        </section>

        {/* DAILY PRACTICE */}
        <section className="relative space-y-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Latihan harian
            </div>

            <h2 className="text-xl font-bold sm:text-2xl">
              Rekomendasi latihan {currentDayName}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Paket latihan mengikuti mata pelajaran yang dipilih pada jadwal hari ini.
            </p>
          </div>

          {recommendationError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 backdrop-blur dark:text-red-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p>{recommendationError}</p>

                <button
                  onClick={() => void loadRecommendations(selectedDay)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 font-semibold"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {loadingRecommendations ? (
            <div className={`flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground ${GLASS}`}>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Menyiapkan rekomendasi latihan...
            </div>
          ) : currentRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {currentRecommendations.map((item) => {
                const status = getRecommendationStatus(item);
                const isStarting = startingPackageId === item.package_id;
                const canStart = item.can_attempt && !startingPackageId;

                return (
                  <div
                    key={item.package_id}
                    className={`group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${GLASS}`}
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl transition group-hover:bg-emerald-400/20 motion-reduce:transition-none" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400">
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
                        <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          Premium
                        </span>
                      )}
                    </div>

                    <div className="relative mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}
                      >
                        {item.access_status === "open" && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}

                        {item.access_status === "upcoming" && (
                          <Clock3 className="h-3.5 w-3.5" />
                        )}

                        {item.access_status === "closed" && (
                          <Lock className="h-3.5 w-3.5" />
                        )}

                        {item.access_status === "premium_locked" && (
                          <Lock className="h-3.5 w-3.5" />
                        )}

                        {item.access_status === "completed" && (
                          <Trophy className="h-3.5 w-3.5" />
                        )}

                        {status.label}
                      </span>
                    </div>

                    {item.description && (
                      <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <div className="relative mt-3 rounded-xl border border-emerald-900/5 bg-emerald-500/[0.05] p-3 dark:border-emerald-400/10">
                      <p className="text-xs font-medium text-muted-foreground">
                        {status.description}
                      </p>

                      {item.access_status === "open" && item.end_time && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Batas pengerjaan: {formatScheduleDate(item.end_time)} WIB
                        </p>
                      )}
                    </div>

                    <div className="relative mt-4 flex flex-wrap gap-2">
                      {item.total_questions != null && (
                        <span className="rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                          {item.total_questions} soal
                        </span>
                      )}

                      {item.duration_minutes != null && (
                        <span className="rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                          {item.duration_minutes} menit
                        </span>
                      )}

                      {item.passing_score != null && (
                        <span className="rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                          KKM {item.passing_score}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => void handleStartPractice(item)}
                      disabled={!canStart || isStarting}
                      className={`relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                        item.can_attempt
                          ? "border-emerald-500/60 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:to-teal-700"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {isStarting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : item.can_attempt ? (
                        <Play className="h-4 w-4 fill-current" />
                      ) : item.access_status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}

                      {isStarting ? "Memeriksa akses..." : status.buttonLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-emerald-600/25 bg-white/60 px-5 py-10 text-center backdrop-blur-md dark:bg-slate-900/50">
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-36 w-64 -translate-x-1/2 rounded-full bg-teal-400/15 blur-3xl" />

              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                <Trophy className="h-7 w-7 text-emerald-600/70 dark:text-emerald-400/70" />
              </div>

              <h3 className="relative mt-4 font-bold">
                Belum ada rekomendasi latihan
              </h3>

              <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {selectedSubjects.length === 0
                  ? `Belum ada mata pelajaran untuk hari ${currentDayName}. Tambahkan dan simpan jadwal terlebih dahulu.`
                  : `Belum ada paket latihan yang cocok dengan jadwal ${selectedSubjects.join(", ")}. Pastikan kategori, jenjang, kelas, dan status publikasi paket sudah sesuai.`}
              </p>

              <button
                onClick={() => void loadRecommendations(selectedDay)}
                className={`relative mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10 motion-reduce:transition-none ${INSET}`}
              >
                <RefreshCw className="h-4 w-4" />
                Periksa kembali
              </button>
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.07] via-sky-500/[0.04] to-emerald-500/[0.06] p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold">
                Progres belajar tersimpan
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Progres materi diperiksa menggunakan sistem pembelajaran
                GradeUp. Materi yang sudah selesai tetap tersedia sehingga
                siswa dapat mempelajarinya kembali kapan saja. Tampilan
                materi tetap mengikuti mata pelajaran pada hari yang dipilih.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
