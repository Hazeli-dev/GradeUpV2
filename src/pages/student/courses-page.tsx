import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
  GraduationCap,
  Layers3,
  LibraryBig,
  Sparkles,
  ArrowRight,
  BookMarked,
  RefreshCw,
  Info,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  CourseCard,
  type StudentCatalogCourse,
} from "@/components/shared/course-card";

import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { LEVELS } from "@/constants";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string | null;
  grade: number | null;
  instructor: string;
  premium: boolean | null;
  thumbnail: string | null;
  course_modules: {
    id: string;
    course_lessons: {
      id: string;
    }[];
  }[];
}

type CatalogCourseWithGrade = StudentCatalogCourse & {
  grade: number | null;
};

const ALL = "Semua";

const GRADES_BY_LEVEL: Record<string, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

const EDUCATION_LEVELS = ["SD", "SMP", "SMA", "SMK"];

// ======================================================
// TAMPILAN (murni visual, tidak memengaruhi logika)
// ======================================================

const cardGlass =
  "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_12px_36px_-24px_rgba(15,118,110,0.35)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80";

const headingText = "text-slate-950 dark:text-white";

const mutedText = "text-slate-600 dark:text-slate-300";

const mutedSoft = "text-slate-500 dark:text-slate-400";

const outlineBtn =
  "rounded-xl border-slate-300 text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800";

const nativeSelect =
  "h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

const filterChip =
  "rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200";

const statCard =
  "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.3)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-[0_20px_44px_-24px_rgba(15,118,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-700/70 dark:bg-slate-900/80 dark:hover:border-emerald-700/70";

/** Garis aksen tipis di tepi atas kartu. */
function CardAccent({ via = "via-emerald-400/70" }: { via?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${via} to-transparent`}
    />
  );
}

function getLevelLabel(level: string) {
  const labels: Record<string, string> = {
    SD: "SD / MI",
    SMP: "SMP / MTs",
    SMA: "SMA / MA",
    SMK: "SMK",
    Kedinasan: "Kedinasan",
    Umum: "Umum",
  };

  return labels[level] || level || "Semua Jenjang";
}

// Mengembalikan kelas-kelas yang berada dalam fase yang sama.
function getGradesInSamePhase(
  level: string | null | undefined,
  courseGrade: number | null
): number[] {
  if (!level || courseGrade == null) return [];

  // SD: Fase A, B, dan C.
  if (level === "SD") {
    if ([1, 2].includes(courseGrade)) return [1, 2];
    if ([3, 4].includes(courseGrade)) return [3, 4];
    if ([5, 6].includes(courseGrade)) return [5, 6];
  }

  // SMP: Fase D, kelas 7–9.
  if (level === "SMP" && [7, 8, 9].includes(courseGrade)) {
    return [7, 8, 9];
  }

  // SMA/SMK: Fase E, kelas 10.
  if (
    ["SMA", "SMK"].includes(level) &&
    courseGrade === 10
  ) {
    return [10];
  }

  // SMA/SMK: Fase F, kelas 11–12.
  if (
    ["SMA", "SMK"].includes(level) &&
    [11, 12].includes(courseGrade)
  ) {
    return [11, 12];
  }

  // Jenjang atau kelas lainnya menggunakan kelas persis.
  return [courseGrade];
}

export default function StudentCoursesPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CatalogCourseWithGrade[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingFavorites, setPendingFavorites] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ALL);

  // Filter jenjang dan kelas mengikuti profil siswa.
  const [profileLevel, setProfileLevel] = useState("");
  const [profileGrade, setProfileGrade] = useState<number | null>(null);
  const [userClass, setUserClass] = useState(
    "Profil pendidikan belum dilengkapi"
  );

  const [selectedLevel, setSelectedLevel] = useState(ALL);
  const [selectedGrade, setSelectedGrade] = useState(ALL);

  // Mengambil profil, katalog kursus, dan daftar favorit siswa.
  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFavoriteError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // 1. Ambil jenjang dan kelas dari profil siswa.
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, name, education_level, grade")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Gagal mengambil profil siswa:", profileError);
      }

      const educationLevel =
        typeof profile?.education_level === "string"
          ? profile.education_level
          : "";

      const grade =
        profile?.grade != null && Number.isFinite(Number(profile.grade))
          ? Number(profile.grade)
          : null;

      setProfileLevel(educationLevel);
      setProfileGrade(grade);

      // Filter awal otomatis mengikuti profil siswa.
      setSelectedLevel(educationLevel || ALL);
      setSelectedGrade(grade != null ? String(grade) : ALL);

      setUserClass(
        educationLevel
          ? `${getLevelLabel(educationLevel)}${
              grade != null ? ` • Kelas ${grade}` : ""
            }`
          : "Profil pendidikan belum dilengkapi"
      );

      // 2. Ambil kursus yang sudah dipublikasikan.
      const {
        data,
        error: queryError,
      } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          category,
          level,
          grade,
          instructor,
          premium,
          thumbnail,
          course_modules (
            id,
            course_lessons (
              id
            )
          )
        `)
        .eq("status", "Published")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      const rows = (data ?? []) as unknown as CourseRow[];

      const mappedCourses: CatalogCourseWithGrade[] = rows.map((course) => {
        const lessonCount = (course.course_modules ?? []).reduce(
          (total, module) =>
            total + (module.course_lessons?.length ?? 0),
          0
        );

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level || "Umum",
          grade:
            course.grade != null && Number.isFinite(Number(course.grade))
              ? Number(course.grade)
              : null,
          instructor: course.instructor,
          premium: Boolean(course.premium),
          thumbnail: course.thumbnail,
          lessonCount,
        };
      });

      setCourses(mappedCourses);

      // 3. Ambil daftar favorit siswa.
      const {
        data: favorites,
        error: favoritesError,
      } = await supabase
        .from("student_favorite_courses")
        .select("course_id")
        .eq("user_id", user.id);

      if (favoritesError) {
        console.error("Gagal mengambil daftar favorit:", favoritesError);
        setFavoriteError("Daftar favorit belum dapat dimuat.");
        setFavoriteIds(new Set());
      } else {
        setFavoriteIds(
          new Set((favorites ?? []).map((item) => item.course_id))
        );
      }
    } catch (err) {
      console.error("Gagal mengambil katalog atau profil:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  // Menambah atau menghapus kursus dari daftar favorit.
  const toggleFavorite = useCallback(
    async (courseId: string) => {
      if (pendingFavorites.has(courseId)) return;

      setFavoriteError(null);

      setPendingFavorites((previous) => {
        const next = new Set(previous);
        next.add(courseId);
        return next;
      });

      const isFavorite = favoriteIds.has(courseId);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setFavoriteError("Silakan login untuk menyimpan kursus favorit.");
          return;
        }

        if (isFavorite) {
          const { error: deleteError } = await supabase
            .from("student_favorite_courses")
            .delete()
            .eq("user_id", user.id)
            .eq("course_id", courseId);

          if (deleteError) throw deleteError;

          setFavoriteIds((previous) => {
            const next = new Set(previous);
            next.delete(courseId);
            return next;
          });
        } else {
          const { error: insertError } = await supabase
            .from("student_favorite_courses")
            .insert({
              user_id: user.id,
              course_id: courseId,
            });

          if (insertError) throw insertError;

          setFavoriteIds((previous) => {
            const next = new Set(previous);
            next.add(courseId);
            return next;
          });
        }
      } catch (err) {
        console.error("Gagal memperbarui kursus favorit:", err);

        setFavoriteError(
          err instanceof Error
            ? err.message
            : "Favorit gagal diperbarui. Silakan coba lagi."
        );
      } finally {
        setPendingFavorites((previous) => {
          const next = new Set(previous);
          next.delete(courseId);
          return next;
        });
      }
    },
    [favoriteIds, pendingFavorites]
  );

  // Daftar kategori yang tersedia.
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          courses.map((course) => course.category).filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "id")),
    [courses]
  );

  // Jenjang yang tersedia berdasarkan katalog dan profil.
  const availableLevels = useMemo(() => {
    const levels = new Set<string>(
      courses
        .map((course) => course.level)
        .filter(
          (level): level is string =>
            typeof level === "string" && level.trim().length > 0
        )
    );

    if (profileLevel) {
      levels.add(profileLevel);
    }

    return [
      ...EDUCATION_LEVELS.filter((item) => levels.has(item)),
      ...Array.from(levels).filter(
        (item) => !EDUCATION_LEVELS.includes(item)
      ),
    ];
  }, [courses, profileLevel]);

  // Kelas yang tersedia mengikuti jenjang yang dipilih.
  const availableGrades = useMemo(() => {
    if (selectedLevel === ALL) return [];

    const configuredGrades = GRADES_BY_LEVEL[selectedLevel] || [];

    const courseGrades = courses
      .filter((course) => course.level === selectedLevel)
      .map((course) => course.grade)
      .filter((grade): grade is number => grade != null);

    return Array.from(
      new Set([...configuredGrades, ...courseGrades])
    ).sort((a, b) => a - b);
  }, [courses, selectedLevel]);

  const totalLessons = useMemo(
    () =>
      courses.reduce(
        (total, course) => total + (course.lessonCount ?? 0),
        0
      ),
    [courses]
  );

  // Filter katalog berdasarkan pencarian, kategori, jenjang, dan fase kelas.
  const filtered = useMemo(() => {
    const keyword = q.trim().toLocaleLowerCase("id-ID");

    return courses
      .filter((course) => {
        if (!keyword) return true;

        return (
          course.title.toLocaleLowerCase("id-ID").includes(keyword) ||
          (course.description ?? "")
            .toLocaleLowerCase("id-ID")
            .includes(keyword) ||
          course.category.toLocaleLowerCase("id-ID").includes(keyword) ||
          (course.instructor ?? "")
            .toLocaleLowerCase("id-ID")
            .includes(keyword)
        );
      })
      .filter(
        (course) => category === ALL || course.category === category
      )
      .filter(
        (course) =>
          selectedLevel === ALL || course.level === selectedLevel
      )
      .filter((course) => {
        if (selectedGrade === ALL) return true;
        if (course.grade == null) return false;

        return getGradesInSamePhase(
          course.level,
          course.grade
        ).includes(Number(selectedGrade));
      });
  }, [courses, q, category, selectedLevel, selectedGrade]);

  // Reset seluruh filter.
  const resetFilters = () => {
    setQ("");
    setCategory(ALL);
    setSelectedLevel(ALL);
    setSelectedGrade(ALL);
  };

  // Kembali ke jenjang dan kelas sesuai profil siswa.
  const resetToProfile = () => {
    setQ("");
    setCategory(ALL);
    setSelectedLevel(profileLevel || ALL);
    setSelectedGrade(
      profileGrade != null ? String(profileGrade) : ALL
    );
  };

  const hasActiveFilter =
    q.trim() !== "" ||
    category !== ALL ||
    selectedLevel !== ALL ||
    selectedGrade !== ALL;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Materi Belajar"
        description="Temukan kursus dan materi pembelajaran yang sesuai dengan jenjang serta kebutuhan belajarmu."
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-300/50 bg-gradient-to-br from-emerald-100/90 via-white/80 to-teal-50/80 p-5 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.45)] dark:border-emerald-800/50 dark:from-emerald-950/60 dark:via-slate-900/80 dark:to-slate-900/80 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-300/50 blur-3xl dark:bg-emerald-500/15" />
          <div className="absolute -bottom-24 right-1/4 h-52 w-52 rounded-full bg-teal-300/50 blur-3xl dark:bg-teal-600/15" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.3)_1.2px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_80%_at_85%_20%,#000,transparent_75%)] dark:bg-[radial-gradient(rgba(110,231,183,0.2)_1.2px,transparent_1.5px)]" />
          <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full border border-emerald-400/40 dark:border-emerald-400/10" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
        </div>

        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              GRADEUP LEARNING CENTER
            </div>

            <div className="space-y-2">
              <h2
                className={`text-2xl font-extrabold leading-tight tracking-[-0.035em] sm:text-3xl lg:text-4xl ${headingText}`}
              >
                Belajar Lebih Terarah,
                <span className="block bg-gradient-to-r from-teal-700 to-emerald-500 bg-clip-text text-transparent dark:from-teal-300 dark:to-emerald-300">
                  Berkembang Tanpa Batas.
                </span>
              </h2>

              <p
                className={`max-w-xl text-xs leading-relaxed sm:text-sm ${mutedText}`}
              >
                Jelajahi berbagai kursus, pelajari materi secara bertahap,
                dan bangun pemahaman melalui pengalaman belajar interaktif
                bersama GradeUp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                <BookOpen className="h-4 w-4 text-teal-600 dark:text-emerald-400" />
                Materi terstruktur
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                <GraduationCap className="h-4 w-4 text-teal-600 dark:text-emerald-400" />
                Berbagai jenjang
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-teal-700 to-emerald-500 text-white shadow-xl shadow-teal-700/25 ring-1 ring-inset ring-white/30 dark:from-emerald-500 dark:to-teal-400 dark:text-slate-950 lg:h-40 lg:w-40">
              <div className="absolute inset-3 rounded-[1.5rem] border border-white/25" />
              <GraduationCap className="h-16 w-16 lg:h-20 lg:w-20" />
              <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-teal-700 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300">
                <BookMarked className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK KATALOG */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={statCard}>
          <CardAccent via="via-emerald-400/70" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 transition-transform group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-300">
            <LibraryBig className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-2xl font-extrabold tracking-tight tabular-nums ${headingText}`}
            >
              {loading ? "—" : courses.length}
            </p>
            <p className={`text-xs font-medium ${mutedSoft}`}>
              Kursus tersedia
            </p>
          </div>
        </div>

        <div className={statCard}>
          <CardAccent via="via-blue-400/60" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-105 dark:text-blue-400">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-2xl font-extrabold tracking-tight tabular-nums ${headingText}`}
            >
              {loading ? "—" : categories.length}
            </p>
            <p className={`text-xs font-medium ${mutedSoft}`}>
              Kategori materi
            </p>
          </div>
        </div>

        <div className={statCard}>
          <CardAccent via="via-teal-400/70" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-transform group-hover:scale-105 dark:text-teal-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-2xl font-extrabold tracking-tight tabular-nums ${headingText}`}
            >
              {loading ? "—" : totalLessons}
            </p>
            <p className={`text-xs font-medium ${mutedSoft}`}>
              Sesi pembelajaran
            </p>
          </div>
        </div>
      </section>

      {/* KONTEKS PROFIL SISWA */}
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-100/70 via-white/80 to-white/80 p-4 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.3)] backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/50 dark:via-slate-900/80 dark:to-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-teal-600 to-emerald-400"
        />

        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className={`text-xs font-semibold ${mutedSoft}`}>
              Materi berdasarkan profil pendidikan
            </p>
            <p
              className={`mt-1 truncate text-sm font-extrabold ${headingText}`}
            >
              {userClass}
            </p>
            <p
              className={`mt-1 text-[11px] leading-relaxed ${mutedSoft}`}
            >
              Filter awal mengikuti jenjang dan kelas yang tersimpan di profilmu.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={loadCourses}
          disabled={loading}
          className={`w-fit shrink-0 gap-2 ${outlineBtn}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Perbarui data
        </Button>
      </section>

      {/* PENCARIAN DAN FILTER */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h3
                className={`text-base font-bold tracking-tight ${headingText}`}
              >
                Temukan Materi
              </h3>
            </div>
            <p className={`text-xs ${mutedSoft}`}>
              Cari berdasarkan judul, pengajar, kategori, jenjang, atau kelas.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
              {filtered.length} dari {courses.length} kursus
            </span>
          )}
        </div>

        <div className={`space-y-4 p-4 sm:p-5 ${cardGlass}`}>
          <CardAccent via="via-teal-400/70" />

          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari judul, deskripsi, atau pengajar..."
            className="w-full"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${mutedSoft}`}>
                Kategori Materi
              </label>
              <FilterSelect
                value={category}
                onChange={setCategory}
                options={categories}
                allLabel="Semua kategori"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="course-level"
                className={`text-xs font-semibold ${mutedSoft}`}
              >
                Jenjang Pendidikan
              </label>

              <select
                id="course-level"
                value={selectedLevel}
                onChange={(event) => {
                  setSelectedLevel(event.target.value);
                  setSelectedGrade(ALL);
                }}
                className={nativeSelect}
              >
                <option value={ALL}>Semua Jenjang</option>
                {availableLevels.map((item) => (
                  <option key={item} value={item}>
                    {getLevelLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="course-grade"
                className={`text-xs font-semibold ${mutedSoft}`}
              >
                Kelas
              </label>

              <select
                id="course-grade"
                value={selectedGrade}
                disabled={selectedLevel === ALL}
                onChange={(event) => setSelectedGrade(event.target.value)}
                className={`${nativeSelect} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value={ALL}>Semua Kelas</option>
                {availableGrades.map((grade) => (
                  <option key={grade} value={String(grade)}>
                    Kelas {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!profileLevel && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className={`text-xs font-bold ${headingText}`}>
                  Profil pendidikan belum dilengkapi
                </p>
                <p
                  className={`mt-1 text-xs leading-relaxed ${mutedSoft}`}
                >
                  Saat ini semua jenjang ditampilkan. Lengkapi jenjang dan
                  kelas melalui Pengaturan Profil agar filter materi otomatis
                  mengikuti profilmu.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold ${mutedSoft}`}>
                Filter aktif:
              </span>

              {q.trim() && (
                <span className={`max-w-full truncate ${filterChip}`}>
                  Pencarian: {q.trim()}
                </span>
              )}

              {category !== ALL && (
                <span className={filterChip}>{category}</span>
              )}

              {selectedLevel !== ALL && (
                <span className={filterChip}>
                  {getLevelLabel(selectedLevel)}
                </span>
              )}

              {selectedGrade !== ALL && (
                <span className={filterChip}>
                  Kelas {selectedGrade}
                </span>
              )}

              {!hasActiveFilter && (
                <span className={`text-[11px] ${mutedSoft}`}>
                  Menampilkan seluruh kursus
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToProfile}
                className={`h-8 shrink-0 gap-1.5 px-2 text-xs ${outlineBtn}`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Reset ke Profil
              </Button>

              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 shrink-0 gap-1.5 rounded-xl px-2 text-xs text-slate-500 hover:text-destructive dark:text-slate-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset semua
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DAFTAR KURSUS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3
              className={`text-lg font-extrabold tracking-tight ${headingText}`}
            >
              Jelajahi Materi
            </h3>
            <p className={`text-xs ${mutedSoft}`}>
              Pilih kursus dan lanjutkan perjalanan belajarmu.
            </p>
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-emerald-300">
              <BookOpen className="h-3.5 w-3.5" />
              {filtered.length} kursus ditemukan
            </div>
          )}
        </div>

        {favoriteError && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive"
          >
            {favoriteError}
          </div>
        )}

        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <div className={`p-4 ${cardGlass}`}>
            <ErrorState message={error} onRetry={loadCourses} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-teal-300/70 bg-white/60 px-4 py-12 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
            <EmptyState
              title={
                hasActiveFilter
                  ? "Materi tidak ditemukan"
                  : "Belum ada materi tersedia"
              }
              action={
                hasActiveFilter ? (
                  <Button
                    variant="outline"
                    onClick={resetToProfile}
                    className={`gap-2 ${outlineBtn}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Kembali ke kelas profil
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isFavorite={favoriteIds.has(course.id)}
                  favoriteLoading={pendingFavorites.has(course.id)}
                  onToggleFavorite={() => void toggleFavorite(course.id)}
                  onClick={() =>
                    navigate(`/dashboard/courses/${course.id}`)
                  }
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-1 border-t border-slate-200/70 pt-5 text-center dark:border-slate-800">
              <p className={`text-xs font-semibold ${headingText}`}>
                Kamu sedang melihat {filtered.length} kursus
              </p>
              <p className={`text-[11px] ${mutedSoft}`}>
                Dari total {courses.length} kursus yang tersedia di GradeUp.
              </p>
            </div>
          </>
        )}
      </section>

      {/* FOOTER INFORMASI */}
      {!loading && !error && courses.length > 0 && (
        <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-100/70 via-white/80 to-white/80 p-4 backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/50 dark:via-slate-900/80 dark:to-slate-900/80">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/30 blur-2xl dark:bg-emerald-500/10"
          />

          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="relative min-w-0 flex-1">
            <p className={`text-sm font-bold ${headingText}`}>
              Mulai dari satu langkah kecil.
            </p>
            <p
              className={`mt-1 text-xs leading-relaxed ${mutedSoft}`}
            >
              Pilih kursus yang sesuai dengan kebutuhanmu, pelajari setiap
              sesi secara bertahap, dan pantau perkembangan belajarmu
              melalui fitur pencapaian GradeUp.
            </p>
          </div>

          <ArrowRight className="relative mt-1 h-4 w-4 shrink-0 text-teal-600 dark:text-emerald-400" />
        </div>
      )}
    </div>
  );
}
