
import {
  BookOpen,
  Clock,
  Lock,
  Play,
  Star,
  Users,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/format";
import type { Course } from "@/types";

export interface StudentCatalogCourse {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  level?: string | null;
  instructor?: string;
  thumbnail?: string | null;
  premium: boolean;
  lessonCount?: number;
  duration?: number;
  rating?: number;
  students?: number;
  progress?: number;
}

type CourseCardData = Course | StudentCatalogCourse;

interface CourseCardProps {
  course: CourseCardData;
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: () => void;
}

function isLegacyCourse(course: CourseCardData): course is Course {
  return "lessons" in course;
}

function getLessonCount(course: CourseCardData): number | undefined {
  return isLegacyCourse(course)
    ? course.lessons.length
    : course.lessonCount;
}

export function CourseThumbnail({
  course,
  className,
}: {
  course: CourseCardData;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const thumbnail = course.thumbnail;

  const isImage =
    typeof thumbnail === "string" &&
    /^https?:\/\//i.test(thumbnail) &&
    !imageError;

  return (
    <div
      className={cn(
        "relative h-44 overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-500 sm:h-48",
        className
      )}
    >
      {isImage ? (
        <img
          src={thumbnail}
          alt={`Ilustrasi ${course.title}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-500" />

          <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/15" />
          <div className="absolute -right-2 -top-8 h-36 w-36 rounded-full border border-white/15" />
          <div className="absolute -bottom-20 left-1/4 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="h-24 w-24 text-white/20" />
          </div>
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/10" />

      <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white shadow-lg backdrop-blur-md">
        <BookOpen className="h-6 w-6" />
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10">
        <Badge className="max-w-full truncate border border-white/30 bg-white/95 px-3 py-1 text-[10px] font-bold text-primary shadow-sm hover:bg-white">
          {course.category || "Materi Pembelajaran"}
        </Badge>
      </div>
    </div>
  );
}

export function CourseCard({
  course,
  showProgress = false,
  onClick,
  className,
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
}: CourseCardProps) {
  const progress = Math.min(
    100,
    Math.max(0, Number(course.progress ?? 0))
  );

  const hasProgress =
    showProgress && typeof course.progress === "number";

  const isCompleted = hasProgress && progress >= 100;

  const lessonCount = getLessonCount(course);
  const duration = course.duration;
  const rating = course.rating;
  const students = course.students;
  const level = course.level || "Umum";

  const description =
    course.description ||
    "Pelajari materi ini untuk meningkatkan pemahaman dan kemampuan Anda.";

  return (
    <article
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      {/* Tombol favorit berada di luar area navigasi kartu. */}
      {onToggleFavorite && (
        <button
          type="button"
          disabled={favoriteLoading}
          onClick={onToggleFavorite}
          aria-label={
            isFavorite
              ? `Hapus ${course.title} dari favorit`
              : `Tambahkan ${course.title} ke favorit`
          }
          aria-pressed={isFavorite}
          title={isFavorite ? "Hapus dari favorit" : "Tambahkan ke favorit"}
          className={cn(
            "absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full",
            "border border-white/30 bg-black/35 text-white shadow-lg backdrop-blur-md",
            "transition-all duration-200 hover:scale-105 hover:bg-black/55",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isFavorite && "border-amber-300/60 bg-amber-400 text-amber-950 hover:bg-amber-300"
          )}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-transform",
              isFavorite && "scale-110 fill-current",
              favoriteLoading && "animate-pulse"
            )}
          />
        </button>
      )}

      {/* Area kartu yang membuka halaman kursus. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.();
          }
        }}
        aria-label={`Buka materi ${course.title}`}
        className={cn(
          "flex w-full flex-1 cursor-pointer flex-col text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        )}
      >
        <div className="relative w-full">
          <CourseThumbnail course={course} />

          <div className="absolute right-3 top-3 z-10">
            {course.premium ? (
              <Badge className="gap-1 border border-amber-300/30 bg-amber-400/95 px-2.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm hover:bg-amber-400">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            ) : (
              <Badge className="gap-1 border border-white/30 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm hover:bg-white">
                <CheckCircle2 className="h-3 w-3" />
                Gratis
              </Badge>
            )}
          </div>

          {hasProgress && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="muted"
              className="max-w-full truncate text-[10px] font-semibold"
            >
              {level}
            </Badge>

            {hasProgress && isCompleted && (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Selesai
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-extrabold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
              {course.title}
            </h3>

            <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              {description}
            </p>
          </div>

          {(lessonCount !== undefined ||
            (typeof duration === "number" && duration > 0) ||
            (typeof rating === "number" && rating > 0) ||
            (typeof students === "number" && students > 0)) && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/70 pt-3">
              {lessonCount !== undefined && (
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Play className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">{lessonCount} Pelajaran</span>
                </div>
              )}

              {typeof duration === "number" && duration > 0 && (
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">{formatDuration(duration)}</span>
                </div>
              )}

              {typeof rating === "number" && rating > 0 && (
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                  <span className="truncate font-semibold text-foreground">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}

              {typeof students === "number" && students > 0 && (
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">
                    {students.toLocaleString("id-ID")} Siswa
                  </span>
                </div>
              )}
            </div>
          )}

          {hasProgress && (
            <div className="space-y-2 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Progres Belajar
                </span>

                <span
                  className={cn(
                    "text-xs font-extrabold tabular-nums",
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-primary"
                  )}
                >
                  {progress}%
                </span>
              </div>

              <Progress value={progress} className="h-2" />

              <p className="text-[10px] text-muted-foreground">
                {isCompleted
                  ? "Hebat! Seluruh materi telah diselesaikan."
                  : progress > 0
                    ? "Lanjutkan belajar untuk menyelesaikan materi."
                    : "Mulai pelajari materi ini sekarang."}
              </p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-xs font-bold text-primary">
              {hasProgress && progress > 0 && !isCompleted
                ? "Lanjutkan Belajar"
                : isCompleted
                  ? "Pelajari Kembali"
                  : "Mulai Belajar"}
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
