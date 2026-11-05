
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
  Star,
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

export default function StudentCoursesPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<StudentCatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<Set<string>>(
    new Set()
  );
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  // Mengambil katalog kursus dan daftar favorit siswa.
  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFavoriteError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const { data, error: queryError } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          category,
          level,
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

      if (queryError) {
        throw queryError;
      }

      const rows = (data ?? []) as unknown as CourseRow[];

      const mappedCourses: StudentCatalogCourse[] = rows.map((course) => {
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
          instructor: course.instructor,
          premium: Boolean(course.premium),
          thumbnail: course.thumbnail,
          lessonCount,
        };
      });

      setCourses(mappedCourses);

      // Ambil favorit milik siswa yang sedang login.
      if (user) {
        const { data: favoriteData, error: favoriteQueryError } =
          await supabase
            .from("student_favorite_courses")
            .select("course_id")
            .eq("user_id", user.id);

        if (favoriteQueryError) {
          throw favoriteQueryError;
        }

        setFavoriteIds(
          new Set((favoriteData ?? []).map((item) => item.course_id))
        );
      } else {
        setFavoriteIds(new Set());
      }
    } catch (err) {
      console.error("Gagal mengambil katalog atau favorit:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data materi."
      );
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
      if (favoriteLoadingIds.has(courseId)) return;

      setFavoriteLoadingIds((previous) => {
        const next = new Set(previous);
        next.add(courseId);
        return next;
      });

      setFavoriteError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error("Silakan login terlebih dahulu untuk menyimpan favorit.");
        }

        const alreadyFavorite = favoriteIds.has(courseId);

        if (alreadyFavorite) {
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
        console.error("Gagal mengubah favorit:", err);

        setFavoriteError(
          err instanceof Error
            ? err.message
            : "Favorit belum berhasil diperbarui. Silakan coba lagi."
        );
      } finally {
        setFavoriteLoadingIds((previous) => {
          const next = new Set(previous);
          next.delete(courseId);
          return next;
        });
      }
    },
    [favoriteIds, favoriteLoadingIds]
  );

  // Daftar kategori yang tersedia.
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((course) => course.category)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "id")),
    [courses]
  );

  // Statistik katalog.
  const totalLessons = useMemo(
    () =>
      courses.reduce(
        (total, course) => total + (course.lessonCount ?? 0),
        0
      ),
    [courses]
  );

  // Filter pencarian, kategori, dan jenjang.
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
          (course.instructor ?? "").toLocaleLowerCase("id-ID").includes(keyword)
        );
      })
      .filter(
        (course) =>
          category === "all" || course.category === category
      )
      .filter(
        (course) =>
          level === "all" || course.level === level
      );
  }, [courses, q, category, level]);

  const hasActiveFilter =
    q.trim() !== "" ||
    category !== "all" ||
    level !== "all";

  const resetFilters = () => {
    setQ("");
    setCategory("all");
    setLevel("all");
  };

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Materi Belajar"
        description="Temukan kursus dan materi pembelajaran yang sesuai dengan jenjang serta kebutuhan belajarmu."
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1.5 text-[10px] font-bold tracking-wider text-primary shadow-sm sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              GRADEUP LEARNING CENTER
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                Belajar Lebih Terarah,
                <span className="block text-primary">
                  Berkembang Tanpa Batas.
                </span>
              </h2>

              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Jelajahi berbagai kursus, pelajari materi secara bertahap,
                dan bangun pemahaman melalui pengalaman belajar interaktif
                bersama GradeUp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                Materi terstruktur
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
                <GraduationCap className="h-4 w-4 text-primary" />
                Berbagai jenjang
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-primary/15 bg-background/70 text-primary shadow-lg shadow-primary/5 lg:h-40 lg:w-40">
              <div className="absolute inset-3 rounded-[1.5rem] border border-primary/10" />
              <GraduationCap className="h-16 w-16 lg:h-20 lg:w-20" />
              <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-primary shadow-md">
                <BookMarked className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK KATALOG */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <LibraryBig className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-2xl font-extrabold tracking-tight tabular-nums">
              {loading ? "—" : courses.length}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Kursus tersedia
            </p>
          </div>
        </div>

        <div className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
            <Layers3 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-2xl font-extrabold tracking-tight tabular-nums">
              {loading ? "—" : categories.length}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Kategori materi
            </p>
          </div>
        </div>

        <div className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-2xl font-extrabold tracking-tight tabular-nums">
              {loading ? "—" : totalLessons}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Sesi pembelajaran
            </p>
          </div>
        </div>
      </section>

      {/* PENCARIAN DAN FILTER */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold tracking-tight">
                Temukan Materi
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Cari berdasarkan judul, pengajar, kategori, atau jenjang.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {filtered.length} dari {courses.length} kursus
            </span>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="relative">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Cari judul, deskripsi, atau pengajar..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
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
              <label className="text-xs font-semibold text-muted-foreground">
                Jenjang Pendidikan
              </label>

              <FilterSelect
                value={level}
                onChange={setLevel}
                options={[...LEVELS]}
                allLabel="Semua jenjang"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Filter aktif:
              </span>

              {q.trim() && (
                <span className="max-w-full truncate rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  Pencarian: {q.trim()}
                </span>
              )}

              {category !== "all" && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  {category}
                </span>
              )}

              {level !== "all" && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  {level}
                </span>
              )}

              {!hasActiveFilter && (
                <span className="text-[11px] text-muted-foreground">
                  Menampilkan seluruh kursus
                </span>
              )}
            </div>

            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 shrink-0 gap-1.5 self-start px-2 text-xs text-muted-foreground hover:text-destructive sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filter
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* DAFTAR KURSUS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold tracking-tight">
              Jelajahi Materi
            </h3>
            <p className="text-xs text-muted-foreground">
              Pilih kursus dan lanjutkan perjalanan belajarmu.
            </p>
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              {filtered.length} kursus ditemukan
            </div>
          )}
        </div>

        {favoriteError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          >
            <Star className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{favoriteError}</span>
          </div>
        )}

        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <div className="rounded-2xl border bg-card p-4">
            <ErrorState
              message={error}
              onRetry={loadCourses}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-12">
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
                    onClick={resetFilters}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset pencarian dan filter
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
                  favoriteLoading={favoriteLoadingIds.has(course.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={() =>
                    navigate(`/dashboard/courses/${course.id}`)
                  }
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-1 border-t pt-5 text-center">
              <p className="text-xs font-semibold text-foreground">
                Kamu sedang melihat {filtered.length} kursus
              </p>
              <p className="text-[11px] text-muted-foreground">
                Dari total {courses.length} kursus yang tersedia di GradeUp.
              </p>
            </div>
          </>
        )}
      </section>

      {/* FOOTER INFORMASI */}
      {!loading && !error && courses.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              Mulai dari satu langkah kecil.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pilih kursus yang sesuai dengan kebutuhanmu, pelajari setiap
              sesi secara bertahap, dan pantau perkembangan belajarmu
              melalui fitur pencapaian GradeUp.
            </p>
          </div>

          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
        </div>
      )}
    </div>
  );
}
