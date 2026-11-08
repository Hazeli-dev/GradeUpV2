import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flame,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

type ActivityType = "exam" | "course" | "achievement" | "other";

interface ActivityRecord {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string;
  amount?: number;
  score?: number | null;
  correct?: number | null;
  incorrect?: number | null;
  examId?: string;
}

interface ExamRecord {
  id: string;
  examTitle: string;
  date: string;
  score: number | null;
  correct: number | null;
  incorrect: number | null;
  passed: boolean;
}

const activityMeta: Record<
  ActivityType,
  {
    label: string;
    icon: typeof Activity;
    color: string;
    background: string;
  }
> = {
  exam: {
    label: "Ujian",
    icon: ClipboardCheck,
    color: "text-blue-600 dark:text-blue-400",
    background: "bg-blue-500/10",
  },
  course: {
    label: "Materi",
    icon: BookOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    background: "bg-emerald-500/10",
  },
  achievement: {
    label: "Pencapaian",
    icon: Trophy,
    color: "text-amber-600 dark:text-amber-400",
    background: "bg-amber-500/10",
  },
  other: {
    label: "Aktivitas",
    icon: Sparkles,
    color: "text-primary",
    background: "bg-primary/10",
  },
};

function formatTime(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatXP(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString("id-ID")} XP`;
}

function mapXPActivity(transaction: {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}): ActivityRecord | null {
  const source = (transaction.source ?? "").toLowerCase();

  // Aktivitas ujian diambil langsung dari exam_attempts
  // agar tidak muncul dua kali.
  if (source === "exam_completion") return null;

  let type: ActivityType = "other";
  let title = "Aktivitas belajar";

  if (source === "lesson_completion") {
    type = "course";
    title = "Menyelesaikan materi";
  } else if (source === "badge_reward" || source === "achievement") {
    type = "achievement";
    title = "Mendapatkan pencapaian";
  } else if (source === "bonus") {
    type = "achievement";
    title = "Mendapatkan bonus XP";
  }

  return {
    id: `xp-${transaction.id}`,
    type,
    title,
    description:
      transaction.description?.trim() || "Kamu mendapatkan XP dari aktivitas belajar.",
    date: transaction.created_at,
    amount: transaction.amount,
  };
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Silakan login untuk melihat riwayat aktivitas.");

      const [attemptResult, xpResult] = await Promise.all([
        supabase
          .from("exam_attempts")
          .select(
            "id, exam_id, score, status, created_at, correct_count, wrong_count, total_questions, is_passed"
          )
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false }),

        supabase
          .from("xp_transactions")
          .select("id, amount, source, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (attemptResult.error) throw attemptResult.error;
      if (xpResult.error) throw xpResult.error;

      const attempts = attemptResult.data ?? [];
      const xpTransactions = xpResult.data ?? [];

      // Mengambil judul paket ujian agar riwayat lebih informatif.
      const packageIds = [
        ...new Set(
          attempts
            .map((attempt) => attempt.exam_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      let packageMap = new Map<
        string,
        { title: string; passing_score: number | null }
      >();

      if (packageIds.length > 0) {
        const { data: packages, error: packageError } = await supabase
          .from("exam_packages")
          .select("id, title, passing_score")
          .in("id", packageIds);

        if (packageError) throw packageError;

        packageMap = new Map(
          (packages ?? []).map((item) => [
            item.id,
            {
              title: item.title,
              passing_score: item.passing_score,
            },
          ])
        );
      }

      const mappedExams: ExamRecord[] = attempts.map((attempt) => {
        const examPackage = packageMap.get(attempt.exam_id);

        return {
          id: attempt.id,
          examTitle: examPackage?.title || "Paket Ujian",
          date: attempt.created_at,
          score: attempt.score,
          correct: attempt.correct_count,
          incorrect: attempt.wrong_count,
          passed:
            attempt.is_passed ??
            (attempt.score != null && examPackage?.passing_score != null
              ? attempt.score >= examPackage.passing_score
              : false),
        };
      });

      const examActivities: ActivityRecord[] = attempts.map((attempt) => {
        const examPackage = packageMap.get(attempt.exam_id);
        const score = attempt.score;
        const correct = attempt.correct_count;
        const incorrect = attempt.wrong_count;

        return {
          id: `exam-${attempt.id}`,
          type: "exam",
          title: examPackage?.title || "Menyelesaikan ujian",
          description: [
            score != null ? `Nilai ${score}` : "Ujian telah diselesaikan",
            correct != null ? `${correct} benar` : null,
            incorrect != null ? `${incorrect} salah` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          date: attempt.created_at,
          score,
          correct,
          incorrect,
          examId: attempt.id,
        };
      });

      const xpActivities = xpTransactions
        .map((transaction) =>
          mapXPActivity({
            id: transaction.id,
            amount: transaction.amount,
            source: transaction.source,
            description: transaction.description,
            created_at: transaction.created_at,
          })
        )
        .filter(
          (item): item is ActivityRecord => item !== null
        );

      const combinedActivities = [
        ...examActivities,
        ...xpActivities,
      ].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setActivities(combinedActivities);
      setExamRecords(mappedExams);
    } catch (err) {
      console.error("Gagal memuat riwayat aktivitas:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil riwayat aktivitas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (activity) => filter === "all" || activity.type === filter
      ),
    [activities, filter]
  );

  const statistics = useMemo(() => {
    const totalXP = activities.reduce(
      (total, activity) => total + (activity.amount ?? 0),
      0
    );

    return {
      total: activities.length,
      exams: activities.filter((item) => item.type === "exam").length,
      courses: activities.filter((item) => item.type === "course").length,
      achievements: activities.filter(
        (item) => item.type === "achievement"
      ).length,
      totalXP,
    };
  }, [activities]);

  const recentExams = examRecords.slice(0, 5);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => void loadActivities()}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Riwayat Aktivitas"
        description="Pantau perjalanan belajar, ujian, dan pencapaianmu di GradeUp."
      />

      {/* RINGKASAN AKTIVITAS */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {statistics.total}
              </p>
              <p className="text-xs text-muted-foreground">
                Total aktivitas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {statistics.exams}
              </p>
              <p className="text-xs text-muted-foreground">
                Ujian selesai
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {statistics.courses}
              </p>
              <p className="text-xs text-muted-foreground">
                Materi selesai
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {statistics.totalXP.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-muted-foreground">
                XP tercatat
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* KONTEN UTAMA */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Linimasa Aktivitas
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Catatan aktivitas belajar berdasarkan data akunmu.
              </p>
            </div>

            <Badge variant="muted">
              {filteredActivities.length} aktivitas
            </Badge>
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="exam">Ujian</TabsTrigger>
              <TabsTrigger value="course">Materi</TabsTrigger>
              <TabsTrigger value="achievement">Pencapaian</TabsTrigger>
              <TabsTrigger value="other">Lainnya</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardContent className="p-4 sm:p-6">
              {filteredActivities.length === 0 ? (
                <EmptyState
                  title={
                    activities.length === 0
                      ? "Belum ada aktivitas"
                      : "Tidak ada aktivitas pada kategori ini"
                  }
                  description={
                    activities.length === 0
                      ? "Aktivitas belajarmu akan muncul di sini setelah tercatat di GradeUp."
                      : "Coba pilih kategori aktivitas lainnya."
                  }
                />
              ) : (
                <ol className="relative space-y-7 border-l-2 border-border pl-7">
                  {filteredActivities.map((activity) => {
                    const meta = activityMeta[activity.type];
                    const Icon = meta.icon;

                    return (
                      <li key={activity.id} className="relative">
                        <div
                          className={cn(
                            "absolute -left-[43px] flex h-9 w-9 items-center justify-center rounded-xl border-4 border-card",
                            meta.background,
                            meta.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold leading-snug">
                              {activity.title}
                            </p>
                            <Badge variant="muted">{meta.label}</Badge>
                          </div>

                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {activity.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(activity.date)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTime(activity.date)}
                            </span>
                            {activity.amount != null && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 font-bold",
                                  activity.amount >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                )}
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                {formatXP(activity.amount)}
                              </span>
                            )}
                          </div>

                          {activity.type === "exam" && activity.examId && (
                            <Link
                              to={`/dashboard/results/${activity.examId}`}
                              className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-primary transition-colors hover:underline"
                            >
                              Lihat hasil ujian
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>

        {/* PANEL SAMPING */}
        <aside className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-amber-500" />
                Ringkasan Pencapaian
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Ujian selesai
                </div>
                <span className="font-bold tabular-nums">
                  {statistics.exams}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Materi selesai
                </div>
                <span className="font-bold tabular-nums">
                  {statistics.courses}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-4 w-4 text-amber-500" />
                  Pencapaian
                </div>
                <span className="font-bold tabular-nums">
                  {statistics.achievements}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Total XP tercatat
                  </div>
                  <span className="font-extrabold text-primary tabular-nums">
                    {statistics.totalXP.toLocaleString("id-ID")} XP
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" />
                Ujian Terbaru
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {recentExams.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Belum ada ujian yang diselesaikan.
                </p>
              ) : (
                recentExams.map((exam) => (
                  <Link
                    key={exam.id}
                    to={`/dashboard/results/${exam.id}`}
                    className="block rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {exam.examTitle}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(exam.date)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-extrabold tabular-nums">
                          {exam.score ?? "—"}
                        </p>
                        <Badge
                          variant="muted"
                          className={
                            exam.passed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }
                        >
                          {exam.passed ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Lulus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Belum lulus
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {(exam.correct != null || exam.incorrect != null) && (
                      <div className="mt-3 flex gap-3 border-t pt-2 text-xs text-muted-foreground">
                        {exam.correct != null && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {exam.correct} benar
                          </span>
                        )}
                        {exam.incorrect != null && (
                          <span>{exam.incorrect} salah</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))
              )}

              {examRecords.length > 5 && (
                <Link
                  to="/dashboard/results"
                  className="block pt-1 text-center text-xs font-bold text-primary hover:underline"
                >
                  Lihat semua hasil ujian
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="flex gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  Terus tingkatkan progresmu!
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Selesaikan materi dan ikuti ujian untuk membangun
                  perkembangan belajar yang konsisten.
                </p>
                <Link
                  to="/dashboard/courses"
                  className="mt-2 inline-flex text-xs font-bold text-primary hover:underline"
                >
                  Jelajahi materi belajar
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadActivities()}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          Muat ulang aktivitas
        </Button>
      </div>
    </div>
  );
}
