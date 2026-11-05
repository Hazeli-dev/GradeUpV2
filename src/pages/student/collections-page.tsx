import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  Clock3,
  ExternalLink,
  Loader2,
  Star,
  Trash2,
  FolderHeart,
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

      const { data: favoriteRows, error: favoriteError } = await supabase
        .from("student_favorite_courses")
        .select("course_id")
        .eq("user_id", user.id);

      if (favoriteError) throw favoriteError;

      const favoriteIds = (favoriteRows || []).map((item) => item.course_id);

      if (favoriteIds.length > 0) {
        const { data: courseRows, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description, thumbnail, category, level, premium")
          .in("id", favoriteIds);

        if (courseError) throw courseError;

        setFavorites((courseRows || []) as FavoriteCourse[]);
      } else {
        setFavorites([]);
      }

      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from("student_bookmarks")
        .select("lesson_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarkError) throw bookmarkError;

      const lessonIds = (bookmarkRows || []).map((item) => item.lesson_id);

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

        const mappedLessons: BookmarkedLesson[] = (lessonRows || []).map(
          (lesson: any) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            estimated_minutes: lesson.estimated_minutes,
            course_id: lesson.module?.course?.id || "",
            course_title: lesson.module?.course?.title || "Materi",
            module_title: lesson.module?.title || "Modul",
          })
        );

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
    <div className="space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <FolderHeart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Koleksi Saya
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Simpan dan temukan kembali materi pembelajaran pilihanmu.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Materi Favorit</p>
              <p className="text-2xl font-bold">{favorites.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bookmark Materi</p>
              <p className="text-2xl font-bold">{bookmarks.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={activeTab === "favorites" ? "default" : "outline"}
          onClick={() => setActiveTab("favorites")}
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          Favorit ({favorites.length})
        </Button>

        <Button
          variant={activeTab === "bookmarks" ? "default" : "outline"}
          onClick={() => setActiveTab("bookmarks")}
          className="gap-2"
        >
          <Bookmark className="h-4 w-4" />
          Bookmark ({bookmarks.length})
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
          <button
            onClick={() => void loadCollections()}
            className="ml-2 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        </div>
      ) : activeTab === "favorites" ? (
        favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-semibold">Belum ada materi favorit</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tekan ikon bintang pada kartu materi untuk menyimpannya di sini.
            </p>
            <Button asChild className="mt-5">
              <Link to="/dashboard/courses">Jelajahi Materi</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <BookOpen className="h-12 w-12" />
                  </div>
                )}

                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[course.category, course.level]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    {course.premium && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Premium
                      </span>
                    )}
                  </div>

                  {course.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button asChild className="flex-1 gap-2">
                      <Link to={`/dashboard/courses/${course.id}`}>
                        Buka Materi
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={removingId === course.id}
                      onClick={() => void removeFavorite(course.id)}
                      aria-label="Hapus dari favorit"
                    >
                      {removingId === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-semibold">Belum ada bookmark</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tandai materi dengan ikon bookmark agar mudah ditemukan kembali.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard/courses">Jelajahi Materi</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lesson.course_title} · {lesson.module_title}
                    </p>

                    {lesson.estimated_minutes && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {lesson.estimated_minutes} menit
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button asChild className="flex-1 gap-2 sm:flex-none">
                    <Link
                      to={`/dashboard/courses/${lesson.course_id}/learn/${lesson.id}`}
                    >
                      Buka Materi
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={removingId === lesson.id}
                    onClick={() => void removeBookmark(lesson.id)}
                    aria-label="Hapus bookmark"
                  >
                    {removingId === lesson.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
