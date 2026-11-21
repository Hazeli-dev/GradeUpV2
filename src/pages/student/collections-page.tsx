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

const primaryBtn =
  "rounded-xl bg-teal-700 font-bold text-white shadow-md shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400";

const dangerIconBtn =
  "shrink-0 rounded-xl border-slate-300 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/30";

const listCard =
  "group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_10px_30px_-22px_rgba(15,118,110,0.3)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-[0_22px_48px_-26px_rgba(15,118,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-700/70 dark:bg-slate-900/80 dark:hover:border-emerald-700/70";

/** Garis aksen tipis di tepi atas kartu. */
function CardAccent({ via = "via-emerald-400/70" }: { via?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-6 top-0 z-10 h-px bg-gradient-to-r from-transparent ${via} to-transparent`}
    />
  );
}

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
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-teal-300/70 bg-white/60 px-6 py-14 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.22)_1.2px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000,transparent_80%)] dark:bg-[radial-gradient(rgba(110,231,183,0.14)_1.2px,transparent_1.5px)]" />

        <div
          className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-sm ${
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

        <h3
          className={`relative text-lg font-bold tracking-tight ${headingText}`}
        >
          {isFavorite
            ? "Belum Ada Materi Favorit"
            : "Belum Ada Bookmark"}
        </h3>

        <p
          className={`relative mx-auto mt-2 max-w-md text-sm leading-relaxed ${mutedSoft}`}
        >
          {isFavorite
            ? "Simpan kursus yang menarik dengan menekan ikon bintang. Semua pilihanmu akan tersimpan di sini."
            : "Tandai pelajaran menggunakan ikon bookmark saat belajar agar kamu bisa menemukannya kembali dengan mudah."}
        </p>

        <Button asChild className={`relative mt-6 gap-2 ${primaryBtn}`}>
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
        <Card key={index} className={cardGlass}>
          <div className="h-44 animate-pulse bg-emerald-100/70 dark:bg-slate-800" />
          <CardContent className="space-y-4 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-emerald-100/70 dark:bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-emerald-100/70 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-xl bg-emerald-100/70 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-xl bg-emerald-100/70 dark:bg-slate-800" />
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
      <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-[#0f3324] via-[#174b34] to-[#0b2e22] p-6 shadow-[0_30px_80px_-40px_rgba(6,78,59,0.7)] ring-1 ring-inset ring-white/10 sm:p-8 lg:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(52,211,153,0.25),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(20,184,166,0.22),transparent_45%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(167,243,208,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(167,243,208,0.08)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_right,#000,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 right-1/3 -z-10 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
        />

        <div className="pointer-events-none absolute right-8 top-8 hidden h-52 w-52 items-center justify-center rounded-full border border-emerald-300/30 sm:flex lg:right-16 lg:top-1/2 lg:-translate-y-1/2">
          <div className="flex h-36 w-36 items-center justify-center rounded-full border border-emerald-300/20 bg-white/5 backdrop-blur-sm">
            <FolderHeart
              className="h-16 w-16 text-emerald-300"
              strokeWidth={1.2}
            />
          </div>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold tracking-[0.12em] text-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            RUANG BELAJAR PRIBADI
          </div>

          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-[42px]">
            Koleksi <span className="text-emerald-300">Saya.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Semua materi pilihanmu tersimpan dalam satu tempat.
            Atur koleksi belajar dan lanjutkan perjalanan belajarmu
            kapan saja.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Tersimpan otomatis
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              <GraduationCap className="h-4 w-4 text-emerald-400" />
              Akses lebih mudah
            </div>
          </div>
        </div>

        <div className="relative mt-7 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-300 sm:mt-8">
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
        <Card className={`group ${listCard}`}>
          <CardAccent via="via-amber-400/70" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-400/10"
          />

          <CardContent className="relative flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className={`text-sm font-medium ${mutedSoft}`}>
                Materi Favorit
              </p>

              <p
                className={`mt-2 text-3xl font-extrabold tracking-tight tabular-nums ${headingText}`}
              >
                {loading ? "—" : favorites.length}
              </p>

              <p className={`mt-1 text-xs ${mutedSoft}`}>
                Kursus yang kamu sukai
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="h-7 w-7" strokeWidth={1.8} />
            </div>
          </CardContent>

          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-300" />
        </Card>

        <Card className={`group ${listCard}`}>
          <CardAccent via="via-teal-400/70" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-500/10"
          />

          <CardContent className="relative flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className={`text-sm font-medium ${mutedSoft}`}>
                Bookmark Materi
              </p>

              <p
                className={`mt-2 text-3xl font-extrabold tracking-tight tabular-nums ${headingText}`}
              >
                {loading ? "—" : bookmarks.length}
              </p>

              <p className={`mt-1 text-xs ${mutedSoft}`}>
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200">
              <LibraryBig className="h-3.5 w-3.5" />
              Perpustakaan Pribadi
            </div>

            <h2
              className={`text-xl font-extrabold tracking-tight sm:text-2xl ${headingText}`}
            >
              Materi Tersimpan
            </h2>

            <p className={`mt-1.5 text-sm ${mutedSoft}`}>
              Kelola dan temukan kembali materi pilihanmu.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCollections()}
            disabled={loading}
            className={`gap-2 self-start sm:self-auto ${outlineBtn}`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Perbarui
          </Button>
        </div>

        {/* TAB */}
        <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Jenis koleksi"
            className="grid w-full grid-cols-2 rounded-2xl border border-slate-200/80 bg-white/70 p-1 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70 sm:inline-flex sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              onClick={() => setActiveTab("favorites")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "favorites"
                  ? "bg-white text-amber-600 shadow-md shadow-amber-900/5 dark:bg-slate-800 dark:text-amber-300"
                  : "text-slate-500 hover:text-teal-800 dark:text-slate-400 dark:hover:text-emerald-200"
              }`}
            >
              <Star className="h-4 w-4" />
              Favorit
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  activeTab === "favorites"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-emerald-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
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
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "bookmarks"
                  ? "bg-white text-teal-700 shadow-md shadow-teal-900/5 dark:bg-slate-800 dark:text-teal-300"
                  : "text-slate-500 hover:text-teal-800 dark:text-slate-400 dark:hover:text-emerald-200"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Bookmark
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  activeTab === "bookmarks"
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                    : "bg-emerald-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {bookmarks.length}
              </span>
            </button>
          </div>

          <p className={`text-xs ${mutedSoft}`}>
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
              className="gap-2 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-transparent dark:text-red-300"
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
                  className={`${listCard} hover:-translate-y-1`}
                >
                  <CardAccent via="via-emerald-400/70" />

                  {/* GAMBAR KURSUS */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-950 dark:to-slate-800">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-teal-600 dark:text-emerald-300">
                        <BookOpen
                          className="h-16 w-16"
                          strokeWidth={1.2}
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b2e22]/70 via-transparent to-slate-950/10" />

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
                      <h3
                        className={`line-clamp-2 min-h-12 text-base font-bold leading-snug tracking-tight ${headingText}`}
                      >
                        {course.title}
                      </h3>

                      <div className="mt-3 flex min-h-6 flex-wrap gap-2">
                        {course.category && (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:bg-emerald-950 dark:text-emerald-200">
                            {course.category}
                          </span>
                        )}

                        {course.level && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {course.level}
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      className={`line-clamp-2 min-h-10 text-sm leading-relaxed ${mutedText}`}
                    >
                      {course.description || "Belum ada deskripsi materi."}
                    </p>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <Button
                        asChild
                        className={`flex-1 gap-2 ${primaryBtn}`}
                      >
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
                        className={dangerIconBtn}
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
              <Card key={lesson.id} className={listCard}>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-teal-600 to-emerald-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 transition-transform duration-300 group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-300">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Materi {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

                        <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                          Tersimpan
                        </span>
                      </div>

                      <h3
                        className={`font-bold leading-snug tracking-tight ${headingText}`}
                      >
                        {lesson.title}
                      </h3>

                      <p className="mt-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        {lesson.course_title}
                      </p>

                      <p className={`mt-1 text-xs ${mutedSoft}`}>
                        Modul: {lesson.module_title}
                      </p>

                      {lesson.description && (
                        <p
                          className={`mt-2 line-clamp-2 text-sm leading-relaxed ${mutedText}`}
                        >
                          {lesson.description}
                        </p>
                      )}

                      {lesson.estimated_minutes && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Clock3 className="h-3.5 w-3.5 text-teal-600 dark:text-emerald-400" />
                          {lesson.estimated_minutes} menit belajar
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:border-0 sm:pt-0 sm:pl-4">
                    <Button
                      asChild
                      className={`flex-1 gap-2 sm:flex-none ${primaryBtn}`}
                    >
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
                      className={dangerIconBtn}
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
      <div className="relative flex flex-col items-center justify-between gap-3 overflow-hidden rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-100/70 via-white/80 to-white/80 px-5 py-4 backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/50 dark:via-slate-900/80 dark:to-slate-900/80 sm:flex-row">
        <div className={`flex items-center gap-2 text-xs ${mutedSoft}`}>
          <FolderHeart className="h-4 w-4 text-teal-600 dark:text-emerald-400" />
          Koleksi belajarmu tersimpan di akun GradeUp.
        </div>

        <Link
          to="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-600 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Temukan materi lainnya
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
