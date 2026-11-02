import { ClipboardList, Clock, HelpCircle, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/format";
import type { Difficulty, ExamPackage } from "@/types";

const difficultyVariant: Record<Difficulty, "success" | "warning" | "danger"> = {
  Mudah: "success",
  Sedang: "warning",
  Sulit: "danger",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge variant={difficultyVariant[difficulty]}>{difficulty}</Badge>;
}

interface ExamCardProps {
  exam: ExamPackage;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ExamCard({ exam, actionLabel = "Lihat Paket", onAction, className }: ExamCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant="muted">{exam.level}</Badge>
          <DifficultyBadge difficulty={exam.difficulty} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-primary dark:text-accent">{exam.category}</p>
        <h3 className="line-clamp-2 text-base font-bold leading-snug">{exam.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(exam.duration)}</span>
        <span className="inline-flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" />{exam.questionCount} soal</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{exam.participants.toLocaleString("id-ID")}</span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {exam.premium ? (
          <Badge variant="warning"><Lock className="h-3 w-3" /> Premium</Badge>
        ) : (
          <Badge variant="success">Gratis</Badge>
        )}
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}
