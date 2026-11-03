
import {
  BookOpen,
  Clock,
  Lock,
  Play,
  Star,
  Users,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/format";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CourseThumbnail({
  course,
  className,
}: {
  course: Course;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-40 items-end overflow-hidden bg-gradient-to-br p-5 sm:h-44",
        course.thumbnail,
        className
      )}
    >
      {/* DEKORASI BACKGROUND */}
      <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/15" />
      <div className="pointer-events-none absolute -right-4 -top-8 h-32 w-32 rounded-full border border-white/15" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-xl" />

      {/* ICON UTAMA */}
      <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
        <BookOpen className="h-7 w-7 text-white" />
      </div>

      {/* LABEL KATEGORI */}
      <div className="relative z-10 flex max-w-[75%] items-center gap-2">
        <Badge className="max-w-full truncate border border-white/30 bg-white/95 px-3 py-1 text-[10px] font-bold text-primary shadow-sm hover:bg-white">
          {course.category}
        </Badge>
      </div>

      {/* LAPISAN BAWAH */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}

export function CourseCard({
  course,
  showProgress = false,
  onClick,
  className,
}: CourseCardProps) {
  const progress = Math.min(
    100,
    Math.max(0, Number(course.progress ?? 0))
  );

  const hasProgress =
    showProgress && typeof course.progress === "number";

  const isCompleted = hasProgress && progress >= 100;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Buka materi ${course.title}`}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      {/* THUMBNAIL */}
      <div className="relative">
        <CourseThumbnail course={course} />

        {/* LABEL PREMIUM / GRATIS */}
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

        {/* INDIKATOR PROGRES */}
        {hasProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* KONTEN KARTU */}
      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
        {/* JENJANG */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="muted"
            className="max-w-full truncate text-[10px] font-semibold"
          >
            {course.level}
          </Badge>

          {hasProgress && isCompleted && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Selesai
            </span>
          )}
        </div>

        {/* JUDUL */}
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-extrabold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {course.title}
          </h3>

          <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {course.description || "Pelajari materi ini untuk meningkatkan pemahaman dan kemampuan Anda."}
          </p>
        </div>

        {/* INFORMASI MATERI */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/70 pt-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Play className="h-3.5 w-3.5" />
            </div>

            <span className="truncate">
              {course.lessons.length} Pelajaran
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-3.5 w-3.5" />
            </div>

            <span className="truncate">
              {formatDuration(course.duration)}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>

            <span className="truncate font-semibold text-foreground">
              {Number(course.rating || 0).toFixed(1)}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-3.5 w-3.5" />
            </div>

            <span className="truncate">
              {Number(course.students || 0).toLocaleString("id-ID")} Siswa
            </span>
          </div>
        </div>

        {/* PROGRES BELAJAR */}
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

            <Progress
              value={progress}
              className="h-2"
            />

            <p className="text-[10px] text-muted-foreground">
              {isCompleted
                ? "Hebat! Seluruh materi telah diselesaikan."
                : progress > 0
                  ? "Lanjutkan belajar untuk menyelesaikan materi."
                  : "Mulai pelajari materi ini sekarang."}
            </p>
          </div>
        )}

        {/* TOMBOL BUKA MATERI */}
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
    </button>
  );
}
