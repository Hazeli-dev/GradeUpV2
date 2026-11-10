
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
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

      // Mengambil materi favorit
      const { data: favoriteRows, error: favoriteError } = await supabase
        .from("student_favorite_courses")
        .select("course_id")
        .eq("user_id", user.id);

      if (favoriteError) throw favoriteError;

      const favoriteIds = (favoriteRows || []).map(
        (item) => item.course_id
      );

      if (favoriteIds.length > 0) {
        const { data: courseRows, error: courseError } = await supabase
          .from("courses")
          .select(
            "id, title, description, thumbnail, category, level, premium"
          )
          .in("id", favoriteIds);

        if (courseError) throw courseError;

        setFavorites((courseRows || []) as FavoriteCourse[]);
      } else {
        setFavorites([]);
      }

      // Mengambil bookmark materi
      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from("student_bookmarks")
        .select("lesson_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarkError) throw bookmarkError;

      const lessonIds = (bookmarkRows || []).map(
        (item) => item.lesson_id
      );

      if (lessonIds.length > 0) {
        const { data: lessonRows, error: lessonError } = await supabase
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
          .in("id", lessonIds);

        if (lessonError) throw lessonError;

        const mappedLessons: BookmarkedLesson[] = (
          lessonRows || []
        ).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          estimated_minutes: lesson.estimated_minutes,
          course_id: lesson.module?.course?.id || "",
          course_title: lesson.module?.course?.title || "Materi",
          module_title: lesson.module?.title || "Modul",
        }));

        const lessonMap = new Map(
          mappedLessons.map((lesson) => [lesson.id, lesson])
        );

        setBookmarks(
          lessonIds
            .map((id) => lessonMap.get(id))
            .filter((item): item is BookmarkedLesson => Boolean(item))
        );
      } else {
        setBookmarks([]);
      }
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

  const removeFavorite = async (courseId: string) => {
    setRemovingId(courseId);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      console.error(err);
      setError("Gagal menghapus materi dari favorit.");
    } finally {
      setRemovingId(null);
    }
  };

  const removeBookmark = async (lessonId: string) => {
    setRemovingId(lessonId);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      console.error(err);
      setError("Gagal menghapus bookmark materi.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-sm dark:border-teal-900/50 dark:from-teal-950/40 dark:via-slate-950 dark:to-slate-900 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-500/10" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-teal-700 shadow-sm dark:border-teal-800 dark:bg-slate-900/70 dark:text-teal-300">
              <Sparkles className="h-3.5 w-3.5" />
              RUANG BELAJAR PRIBADI
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Koleksi Saya
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              Semua materi pilihanmu tersimpan di satu tempat.
              Lanjutkan belajar kapan saja tanpa perlu mencari ulang.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                Tersimpan otomatis
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-teal-600" />
                Akses materi lebih mudah
              </span>
            </div>
          </div>

          <div className="hidden shrink-0 sm:flex">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/80 bg-white/70 text-teal-600 shadow-lg shadow-teal-900/5 backdrop-blur dark:border-slate-700 dark:bg-slate-800/70 dark:text-teal-300">
              <FolderHeart className="h-12 w-12" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* Collection statistics */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Materi Favorit
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {favorites.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kursus yang kamu sukai
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Bookmark Materi
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {bookmarks.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pelajaran yang ditandai
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
              <Bookmark className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tabs */}
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Perpustakaan Pribadi
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola materi yang sudah kamu simpan.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Jenis koleksi"
            className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              onClick={() => setActiveTab("favorites")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
                activeTab === "favorites"
                  ? "bg-white text-amber-700 shadow-sm dark:bg-slate-800 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Star className="h-4 w-4" />
              Favorit
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                {favorites.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "bookmarks"}
              onClick={() => setActiveTab("bookmarks")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
                activeTab === "bookmarks"
                  ? "bg-white text-teal-700 shadow-sm dark:bg-slate-800 dark:text-teal-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Bookmark
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                {bookmarks.length}
              </span>
            </button>
          </div>
        </div>

        {/* Error state */}
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

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/30">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">
              Memuat koleksi belajarmu...
            </p>
          </div>
        ) : activeTab === "favorites" ? (
          /* Favorites */
          favorites.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/30">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <Star className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold">
                Belum Ada Materi Favorit
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Simpan kursus yang menarik dengan menekan ikon bintang.
                Materi pilihanmu akan muncul di halaman ini.
              </p>

              <Button asChild className="mt-6 gap-2">
                <Link to="/dashboard/courses">
                  <LibraryBig className="h-4 w-4" />
                  Jelajahi Materi
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.map((course) => (
                <Card
                  key={course.id}
                  className="group overflow-hidden border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5 dark:border-slate-800 dark:hover:border-teal-900"
                >
                  <div className="relative h-44 overflow-hidden bg-teal-50 dark:bg-teal-950/30">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-teal-600 dark:text-teal-300">
                        <BookOpen className="h-14 w-14" strokeWidth={1.3} />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/50 to-transparent" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {course.premium && (
                        <span className="rounded-full border border-amber-200/70 bg-amber-100/95 px-3 py-1 text-[11px] font-bold text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-300">
                          PREMIUM
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
                      <BookOpen className="h-3.5 w-3.5" />
                      Materi Pembelajaran
                    </div>
                  </div>

                  <CardContent className="space-y-4 p-5">
                    <div>
                      <h3 className="line-clamp-2 min-h-12 font-bold leading-snug text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {course.category && (
                          <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                            {course.category}
                          </span>
                        )}

                        {course.level && (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {course.level}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {course.description || "Belum ada deskripsi materi."}
                    </p>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
                        className="shrink-0 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
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
          /* Empty bookmarks */
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              <BookMarked className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold">
              Belum Ada Bookmark
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Tandai pelajaran menggunakan ikon bookmark saat belajar.
              Kamu bisa melanjutkannya dengan mudah dari halaman ini.
            </p>

            <Button asChild className="mt-6 gap-2">
              <Link to="/dashboard/courses">
                <LibraryBig className="h-4 w-4" />
                Jelajahi Materi
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          /* Bookmarks */
          <div className="space-y-3">
            {bookmarks.map((lesson) => (
              <Card
                key={lesson.id}
                className="group border-slate-200/80 shadow-sm transition-all duration-200 hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:hover:border-teal-900"
              >
                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold leading-snug text-slate-900 dark:text-white">
                        {lesson.title}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-300">
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
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Clock3 className="h-3.5 w-3.5" />
                          {lesson.estimated_minutes} menit belajar
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:pl-4">
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
                      className="shrink-0 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
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
    </div>
  );
}
