
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderHeart,
  GraduationCap,
  LibraryBig,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FavoriteCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  level: string | null;
  premium: boolean;
}

interface BookmarkedLesson {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  course_id: string;
  course_title: string;
  module_title: string;
}

type ActiveTab = "favorites" | "bookmarks";

export default function StudentCollectionsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("favorites");
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalCollections = favorites.length + bookmarks.length;

  // ==========================================
  // MEMUAT KOLEKSI
  // ==========================================

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setFavorites([]);
        setBookmarks([]);
        return;
      }

      // Mengambil daftar kursus favorit dan bookmark secara bersamaan.
      const [favoriteResult, bookmarkResult] = await Promise.all([
        supabase
          .from("student_favorite_courses")
          .select("course_id")
          .eq("user_id", user.id),

        supabase
          .from("student_bookmarks")
          .select("lesson_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (favoriteResult.error) throw favoriteResult.error;
      if (bookmarkResult.error) throw bookmarkResult.error;

      const favoriteIds = (favoriteResult.data || []).map(
        (item) => item.course_id
      );

      const lessonIds = (bookmarkResult.data || []).map(
        (item) => item.lesson_id
      );

      // Mengambil detail kursus favorit dan materi bookmark.
      const [courseResult, lessonResult] = await Promise.all([
        favoriteIds.length > 0
          ? supabase
              .from("courses")
              .select(
                "id, title, description, thumbnail, category, level, premium"
              )
              .in("id", favoriteIds)
          : Promise.resolve({ data: [], error: null }),

        lessonIds.length > 0
          ? supabase
              .from("course_lessons")
              .select(`
                id,
                title,
                description,
                estimated_minutes,
                module:course_modules!inner (
                  id,
                  title,
                  course:courses!inner (
                    id,
                    title
                  )
                )
              `)
              .in("id", lessonIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (courseResult.error) throw courseResult.error;
      if (lessonResult.error) throw lessonResult.error;

      setFavorites((courseResult.data || []) as FavoriteCourse[]);

      const mappedLessons: BookmarkedLesson[] = (
        lessonResult.data || []
      ).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        estimated_minutes: lesson.estimated_minutes,
        course_id: lesson.module?.course?.id || "",
        course_title: lesson.module?.course?.title || "Materi",
        module_title: lesson.module?.title || "Modul",
      }));

      // Mempertahankan urutan bookmark terbaru.
      const lessonMap = new Map(
        mappedLessons.map((lesson) => [lesson.id, lesson])
      );

      setBookmarks(
        lessonIds
          .map((id) => lessonMap.get(id))
          .filter((item): item is BookmarkedLesson => Boolean(item))
      );
    } catch (err) {
      console.error("Gagal memuat koleksi:", err);
      setError("Koleksi belum dapat dimuat. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  // ==========================================
  // MENGHAPUS FAVORIT
  // ==========================================

  const removeFavorite = async (courseId: string) => {
    setRemovingId(courseId);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sesi pengguna tidak ditemukan.");

      const { error: deleteError } = await supabase
        .from("student_favorite_courses")
        .delete()
        .eq("user_id", user.id)
        .eq("course_id", courseId);

      if (deleteError) throw deleteError;

      setFavorites((current) =>
        current.filter((course) => course.id !== courseId)
      );
    } catch (err) {
      console.error("Gagal menghapus favorit:", err);
      setError("Gagal menghapus materi dari favorit.");
    } finally {
      setRemovingId(null);
    }
  };

  // ==========================================
  // MENGHAPUS BOOKMARK
  // ==========================================

  const removeBookmark = async (lessonId: string) => {
    setRemovingId(lessonId);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sesi pengguna tidak ditemukan.");

      const { error: deleteError } = await supabase
        .from("student_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);

      if (deleteError) throw deleteError;

      setBookmarks((current) =>
        current.filter((lesson) => lesson.id !== lessonId)
      );
    } catch (err) {
      console.error("Gagal menghapus bookmark:", err);
      setError("Gagal menghapus bookmark materi.");
    } finally {
      setRemovingId(null);
    }
  };

  // ==========================================
  // KOMPONEN TAMPILAN
  // ==========================================

  const EmptyState = ({
    type,
  }: {
    type: ActiveTab;
  }) => {
    const isFavorite = type === "favorites";

    return (
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div
          className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${
            isFavorite
              ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
          }`}
        >
          {isFavorite ? (
            <Star className="h-9 w-9" strokeWidth={1.7} />
          ) : (
            <BookMarked className="h-9 w-9" strokeWidth={1.7} />
          )}
        </div>

        <h3 className="relative text-lg font-bold tracking-tight">
          {isFavorite
            ? "Belum Ada Materi Favorit"
            : "Belum Ada Bookmark"}
        </h3>

        <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {isFavorite
            ? "Simpan kursus yang menarik dengan menekan ikon bintang. Semua pilihanmu akan tersimpan di sini."
            : "Tandai pelajaran menggunakan ikon bookmark saat belajar agar kamu bisa menemukannya kembali dengan mudah."}
        </p>

        <Button asChild className="relative mt-6 gap-2">
          <Link to="/dashboard/courses">
            <LibraryBig className="h-4 w-4" />
            Jelajahi Materi
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  };

  const LoadingState = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden border-border shadow-sm"
        >
          <div className="h-44 animate-pulse bg-muted" />
          <CardContent className="space-y-4 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ==========================================
  // RENDER HALAMAN
  // ==========================================

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-900/20 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-6 shadow-xl shadow-emerald-950/5 sm:p-8 lg:p-9">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 right-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="pointer-events-none absolute right-8 top-8 hidden h-52 w-52 items-center justify-center rounded-full border border-white/10 sm:flex lg:right-16 lg:top-1/2 lg:-translate-y-1/2">
          <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <FolderHeart
              className="h-16 w-16 text-emerald-300"
              strokeWidth={1.2}
            />
          </div>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-[11px] font-bold tracking-[0.12em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            RUANG BELAJAR PRIBADI
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[42px]">
            Koleksi <span className="text-emerald-400">Saya.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Semua materi pilihanmu tersimpan dalam satu tempat.
            Atur koleksi belajar dan lanjutkan perjalanan belajarmu
            kapan saja.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Tersimpan otomatis
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              <GraduationCap className="h-4 w-4 text-emerald-400" />
              Akses lebih mudah
            </div>
          </div>
        </div>

        <div className="relative mt-7 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-400 sm:mt-8">
          <FolderHeart className="h-4 w-4 text-emerald-400" />
          <span>
            {loading
              ? "Sedang memperbarui koleksi..."
              : `${totalCollections} item tersimpan di perpustakaanmu`}
          </span>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="group overflow-hidden border-border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Materi Favorit
              </p>

              <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
                {loading ? "—" : favorites.length}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Kursus yang kamu sukai
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="h-7 w-7" strokeWidth={1.8} />
            </div>
          </CardContent>

          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-300" />
        </Card>

        <Card className="group overflow-hidden border-border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Bookmark Materi
              </p>

              <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
                {loading ? "—" : bookmarks.length}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Pelajaran yang ditandai
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition-transform duration-300 group-hover:scale-110 dark:bg-teal-950/50 dark:text-teal-300">
              <Bookmark className="h-7 w-7" strokeWidth={1.8} />
            </div>
          </CardContent>

          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-400" />
        </Card>
      </section>

      {/* PERPUSTAKAAN */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
              <LibraryBig className="h-4 w-4" />
              Perpustakaan Pribadi
            </div>

            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Materi Tersimpan
            </h2>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Kelola dan temukan kembali materi pilihanmu.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCollections()}
            disabled={loading}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Perbarui
          </Button>
        </div>

        {/* TAB */}
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Jenis koleksi"
            className="grid w-full grid-cols-2 rounded-xl border border-border bg-muted/60 p-1 sm:inline-flex sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              onClick={() => setActiveTab("favorites")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "favorites"
                  ? "bg-background text-amber-600 shadow-sm dark:text-amber-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-4 w-4" />
              Favorit
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  activeTab === "favorites"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {favorites.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "bookmarks"}
              onClick={() => setActiveTab("bookmarks")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "bookmarks"
                  ? "bg-background text-teal-700 shadow-sm dark:text-teal-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Bookmark
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  activeTab === "bookmarks"
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {bookmarks.length}
              </span>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {activeTab === "favorites"
              ? `${favorites.length} kursus favorit`
              : `${bookmarks.length} materi bookmark`}
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCollections()}
              className="gap-2 border-red-200 bg-white text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-transparent dark:text-red-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <LoadingState />
        ) : activeTab === "favorites" ? (
          /* ==================================
             FAVORIT
          ================================== */
          favorites.length === 0 ? (
            <EmptyState type="favorites" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.map((course) => (
                <Card
                  key={course.id}
                  className="group overflow-hidden border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-950/5 dark:hover:border-teal-800"
                >
                  {/* GAMBAR KURSUS */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-50 dark:from-teal-950/60 dark:to-slate-900">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-teal-600 dark:text-teal-300">
                        <BookOpen
                          className="h-16 w-16"
                          strokeWidth={1.2}
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/10" />

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {course.premium && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/95 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-amber-950 shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          PREMIUM
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/15 backdrop-blur">
                          <BookOpen className="h-3.5 w-3.5" />
                        </span>
                        Materi Pembelajaran
                      </div>

                      <span className="rounded-lg border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                        Favorit
                      </span>
                    </div>
                  </div>

                  <CardContent className="space-y-4 p-5">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-snug tracking-tight">
                        {course.title}
                      </h3>

                      <div className="mt-3 flex min-h-6 flex-wrap gap-2">
                        {course.category && (
                          <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                            {course.category}
                          </span>
                        )}

                        {course.level && (
                          <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            {course.level}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {course.description || "Belum ada deskripsi materi."}
                    </p>

                    <div className="flex items-center gap-2 border-t border-border pt-4">
                      <Button asChild className="flex-1 gap-2">
                        <Link to={`/dashboard/courses/${course.id}`}>
                          Buka Materi
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        disabled={removingId === course.id}
                        onClick={() => void removeFavorite(course.id)}
                        aria-label="Hapus dari favorit"
                        title="Hapus dari favorit"
                        className="shrink-0 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                      >
                        {removingId === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : bookmarks.length === 0 ? (
          /* ==================================
             BOOKMARK KOSONG
          ================================== */
          <EmptyState type="bookmarks" />
        ) : (
          /* ==================================
             DAFTAR BOOKMARK
          ================================== */
          <div className="space-y-3">
            {bookmarks.map((lesson, index) => (
              <Card
                key={lesson.id}
                className="group overflow-hidden border-border shadow-sm transition-all duration-200 hover:border-teal-300 hover:shadow-md dark:hover:border-teal-800"
              >
                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition-transform duration-300 group-hover:scale-105 dark:bg-teal-950/50 dark:text-teal-300">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Materi {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-border" />

                        <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                          Tersimpan
                        </span>
                      </div>

                      <h3 className="font-bold leading-snug tracking-tight">
                        {lesson.title}
                      </h3>

                      <p className="mt-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        {lesson.course_title}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Modul: {lesson.module_title}
                      </p>

                      {lesson.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {lesson.description}
                        </p>
                      )}

                      {lesson.estimated_minutes && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {lesson.estimated_minutes} menit belajar
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-border pt-4 sm:border-0 sm:pt-0 sm:pl-4">
                    <Button asChild className="flex-1 gap-2 sm:flex-none">
                      <Link
                        to={`/dashboard/courses/${lesson.course_id}/learn/${lesson.id}`}
                      >
                        Lanjutkan
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={removingId === lesson.id}
                      onClick={() => void removeBookmark(lesson.id)}
                      aria-label="Hapus bookmark"
                      title="Hapus bookmark"
                      className="shrink-0 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                    >
                      {removingId === lesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-5 py-4 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FolderHeart className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Koleksi belajarmu tersimpan di akun GradeUp.
        </div>

        <Link
          to="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-600 dark:text-teal-300"
        >
          Temukan materi lainnya
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
