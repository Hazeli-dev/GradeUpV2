import { BookOpen, Clock, Lock, Play, Star, Users } from "lucide-react";
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

export function CourseThumbnail({ course, className }: { course: Course; className?: string }) {
  return (
    <div className={cn("relative flex h-36 items-end overflow-hidden bg-gradient-to-br p-4", course.thumbnail, className)}>
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute right-10 top-12 h-14 w-14 rounded-full bg-white/10" />
      <BookOpen className="absolute right-5 top-5 h-8 w-8 text-white/80" />
      <Badge className="relative bg-white/90 text-primary">{course.category}</Badge>
    </div>
  );
}

export function CourseCard({ course, showProgress, onClick, className }: CourseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <CourseThumbnail course={course} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Badge variant="muted">{course.level}</Badge>
          {course.premium ? (
            <Badge variant="warning"><Lock className="h-3 w-3" /> Premium</Badge>
          ) : (
            <Badge variant="success">Gratis</Badge>
          )}
        </div>
        <h3 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-primary dark:group-hover:text-accent">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Play className="h-3.5 w-3.5" />{course.lessons.length} pelajaran</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(course.duration)}</span>
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{course.rating}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.students.toLocaleString("id-ID")}</span>
        </div>
        {showProgress && typeof course.progress === "number" && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Progres</span>
              <span>{course.progress}%</span>
            </div>
            <Progress value={course.progress} />
          </div>
        )}
      </div>
    </button>
  );
}
