
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  SlidersHorizontal,
  RotateCcw,
  GraduationCap,
  Layers3,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { CourseCard } from "@/components/shared/course-card";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";

import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import {
  listCategories,
  listCourses,
} from "@/services/catalog.service";
import { LEVELS } from "@/constants";

export default function StudentCoursesPage() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(listCourses);

  const {
    data: categories,
  } = useAsync(listCategories);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  // Hanya materi yang sudah dipublikasikan.
  const publishedCourses = useMemo(
    () =>
      (data ?? []).filter(
        (course) => course.status === "Published"
      ),
    [data]
  );

  // Filter materi berdasarkan pencarian, kategori, dan jenjang.
  const filtered = useMemo(() => {
    const keyword = q.trim().toLocaleLowerCase("id-ID");

    return publishedCourses
      .filter((course) => {
        if (!keyword) return true;

        return course.title
          .toLocaleLowerCase("id-ID")
          .includes(keyword);
      })
      .filter(
        (course) =>
          category === "all" ||
          course.category === category
      )
      .filter(
        (course) =>
          level === "all" ||
          course.level === level
      );
  }, [publishedCourses, q, category, level]);

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
    <div className="space-y-6 pb-6">

      {/* HEADER HALAMAN */}
      <PageHeader
        title="Materi Belajar"
        description="Temukan materi pembelajaran sesuai jenjang dan mata pelajaran untuk meningkatkan pemahaman Anda."
      />

      {/* HERO INFORMASI */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-[11px] font-bold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              PUSAT MATERI PEMBELAJARAN
            </div>

            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Belajar Lebih Terarah,
              <span className="text-primary"> Raih Prestasi Lebih Tinggi.</span>
            </h2>

            <p className="max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Jelajahi berbagai materi pembelajaran, pilih jenjang
              pendidikan, dan pelajari topik sesuai kebutuhan Anda.
            </p>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-2xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:h-24 sm:w-24 sm:self-center">
            <GraduationCap className="h-11 w-11 sm:h-14 sm:w-14" />
          </div>
        </div>
      </div>

      {/* RINGKASAN MATERI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xl font-extrabold">
              {loading ? "—" : publishedCourses.length}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
              Total Materi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers3 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xl font-extrabold">
              {loading ? "—" : filtered.length}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
              Materi Ditemukan
            </p>
          </div>
        </div>
      </div>

      {/* AREA PENCARIAN DAN FILTER */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">
              Temukan Materi
            </h3>
          </div>

          <p className="text-xs text-muted-foreground">
            Gunakan pencarian dan filter untuk menemukan materi yang sesuai.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            {/* PENCARIAN */}
            <div className="relative">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Cari judul materi..."
                className="w-full"
              />
            </div>

            {/* FILTER */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Kategori Materi
                </label>

                <FilterSelect
                  value={category}
                  onChange={setCategory}
                  options={(categories ?? []).map(
                    (item) => item.name
                  )}
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

            {/* FILTER AKTIF */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Filter:
                </span>

                {q.trim() && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
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
                    Semua materi
                  </span>
                )}
              </div>

              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset filter
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DAFTAR MATERI */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Jelajahi Materi
            </h3>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Pilih materi untuk mulai belajar.
            </p>
          </div>

          {!loading && !error && (
            <span className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {filtered.length} materi
            </span>
          )}
        </div>

        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={reload}
          />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10">
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
                  showProgress
                  onClick={() =>
                    navigate(`/dashboard/courses/${course.id}`)
                  }
                />
              ))}
            </div>

            <p className="border-t pt-4 text-center text-[11px] text-muted-foreground">
              Menampilkan {filtered.length} dari{" "}
              {publishedCourses.length} materi yang tersedia.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
