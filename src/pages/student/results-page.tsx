
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock,
  Eye,
  Lightbulb,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  BookOpen,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";

import { formatDate } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// =====================================================
// TYPES
// =====================================================

interface ResultItem {
  id: string;
  examTitle: string;
  category: string;
  date: string;
  correct: number;
  incorrect: number;
  score: number;
  passed: boolean;
  answersExpired: boolean;
}

interface QuestionReview {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  user_answer: string | null;
}

type PeriodType = "7" | "30" | "90" | "365";

// =====================================================
// CONSTANTS
// =====================================================

const periodOptions = [
  { label: "7 Hari", value: "7" },
  { label: "30 Hari", value: "30" },
  { label: "3 Bulan", value: "90" },
  { label: "1 Tahun", value: "365" },
];

// =====================================================
// HELPERS
// =====================================================

const getPeriodStart = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
};

const formatShortDate = (date: string) => {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
};

const getScoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  return "text-amber-600 dark:text-amber-400";
};

// Menyamakan format pilihan jawaban dari database.
const normalizeOptions = (
  value: unknown
): QuestionReview["options"] => {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((option: any, index: number) => {
    if (typeof option === "string") {
      return {
        id: String.fromCharCode(65 + index),
        text: option,
      };
    }

    return {
      id: String(option?.id ?? String.fromCharCode(65 + index)),
      text: String(option?.text ?? option?.value ?? ""),
    };
  });
};

// Mengubah jawaban berupa ID, huruf, atau angka menjadi indeks.
const getAnswerIndex = (
  options: QuestionReview["options"],
  answer: unknown
): number => {
  if (answer === null || answer === undefined) return -1;

  const normalized = String(answer).trim();

  if (!normalized) return -1;

  const byId = options.findIndex(
    (option) =>
      option.id.toLowerCase() === normalized.toLowerCase()
  );

  if (byId !== -1) return byId;

  if (/^[A-Z]$/i.test(normalized)) {
    const index = normalized.toUpperCase().charCodeAt(0) - 65;

    if (index >= 0 && index < options.length) {
      return index;
    }
  }

  const numericIndex = Number(normalized);

  if (
    Number.isInteger(numericIndex) &&
    numericIndex >= 0 &&
    numericIndex < options.length
  ) {
    return numericIndex;
  }

  return -1;
};

// =====================================================
// MAIN PAGE
// =====================================================

export default function ResultsPage() {
  const [data, setData] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<PeriodType>("30");

  const [selectedResult, setSelectedResult] =
    useState<ResultItem | null>(null);

  const [reviewQuestions, setReviewQuestions] =
    useState<QuestionReview[]>([]);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // ===================================================
  // FETCH EXAM RESULTS
  // ===================================================

  const fetchResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setData([]);
        return;
      }

      // RLS nantinya memastikan siswa hanya membaca
      // riwayat ujian miliknya sendiri.
      const { data: attempts, error: attemptsError } =
        await supabase
          .from("exam_attempts")
          .select(
            "id, user_id, exam_id, exam_package_id, score, status, created_at, correct_count, wrong_count, incorrect_count, total_questions, is_passed, answers"
          )
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      const packageIds = [
        ...new Set(
          (attempts || [])
            .map((attempt: any) =>
              String(
                attempt.exam_package_id || attempt.exam_id || ""
              )
            )
            .filter(Boolean)
        ),
      ];

      let packageMap = new Map<
        string,
        {
          title: string;
          category: string;
          passing_score: number;
        }
      >();

      if (packageIds.length > 0) {
        const { data: packages, error: packagesError } =
          await supabase
            .from("exam_packages")
            .select("id, title, category, passing_score")
            .in("id", packageIds);

        if (packagesError) throw packagesError;

        packageMap = new Map(
          (packages || []).map((pkg: any) => [
            String(pkg.id),
            {
              title: pkg.title || "Paket Ujian",
              category: pkg.category || "Umum",
              passing_score: Number(pkg.passing_score ?? 60),
            },
          ])
        );
      }

      const mappedData: ResultItem[] = (attempts || []).map(
        (attempt: any) => {
          const packageId = String(
            attempt.exam_package_id || attempt.exam_id || ""
          );

          const pkg = packageMap.get(packageId);

          const passingScore = pkg?.passing_score ?? 60;
          const currentScore = Number(attempt.score) || 0;

          const totalQuestions =
            Number(attempt.total_questions) ||
            (attempt.answers &&
            typeof attempt.answers === "object"
              ? Object.keys(attempt.answers).length
              : 0);

          let correct = Number(attempt.correct_count);
          let incorrect = Number(
            attempt.wrong_count ?? attempt.incorrect_count
          );

          if (
            !Number.isFinite(correct) ||
            (correct === 0 &&
              incorrect === 0 &&
              currentScore > 0)
          ) {
            correct = Math.round(
              (currentScore / 100) * totalQuestions
            );

            incorrect = Math.max(0, totalQuestions - correct);
          } else if (!Number.isFinite(incorrect)) {
            incorrect = Math.max(0, totalQuestions - correct);
          }

          return {
            id: String(attempt.id),
            examTitle: pkg?.title || "Paket Ujian",
            category: pkg?.category || "Umum",
            date: attempt.created_at,
            correct,
            incorrect,
            score: currentScore,
            passed:
              attempt.is_passed !== null &&
              attempt.is_passed !== undefined
                ? Boolean(attempt.is_passed)
                : currentScore >= passingScore,
            answersExpired: attempt.answers === null,
          };
        }
      );

      setData(mappedData);
    } catch (err: any) {
      setError(
        err.message || "Gagal memuat hasil belajar dari database."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // ===================================================
  // SECURE REVIEW RPC
  // ===================================================

  const handleOpenDetail = async (item: ResultItem) => {
    setSelectedResult(item);
    setReviewQuestions([]);
    setDetailOpen(true);

    if (item.answersExpired) {
      setReviewLoading(false);
      return;
    }

    setReviewLoading(true);

    try {
      // Tidak ada lagi SELECT langsung ke tabel questions.
      // RPC memvalidasi kepemilikan dan status ujian.
      const { data: reviewData, error: reviewError } =
        await supabase.rpc("get_exam_attempt_review", {
          p_attempt_id: item.id,
        });

      if (reviewError) throw reviewError;

      const mappedQuestions: QuestionReview[] = (
        reviewData || []
      ).map((question: any) => ({
        id: String(question.question_id),
        question_text: String(
          question.question_text || "Pertanyaan"
        ),
        options: normalizeOptions(question.options),
        correct_answer: String(
          question.correct_answer ?? ""
        ),
        explanation:
          question.explanation === null ||
          question.explanation === undefined
            ? null
            : String(question.explanation),
        user_answer:
          question.user_answer === null ||
          question.user_answer === undefined
            ? null
            : String(question.user_answer),
      }));

      setReviewQuestions(mappedQuestions);
    } catch (err: any) {
      console.error("Gagal memuat tinjauan jawaban:", err);
      setReviewQuestions([]);
    } finally {
      setReviewLoading(false);
    }
  };

  // ===================================================
  // PERIOD FILTER
  // ===================================================

  const periodData = useMemo(() => {
    const days = Number(period);
    const startDate = getPeriodStart(days);

    return data.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate && date <= new Date();
    });
  }, [data, period]);

  // ===================================================
  // SEARCH AND STATUS FILTER
  // ===================================================

  const filtered = useMemo(() => {
    return periodData
      .filter(
        (item) =>
          item.examTitle.toLowerCase().includes(q.toLowerCase()) ||
          item.category.toLowerCase().includes(q.toLowerCase())
      )
      .filter(
        (item) =>
          status === "all" ||
          (status === "Lulus" ? item.passed : !item.passed)
      );
  }, [periodData, q, status]);

  // ===================================================
  // MAIN STATISTICS
  // ===================================================

  const avg =
    periodData.length > 0
      ? (
          periodData.reduce((sum, item) => sum + item.score, 0) /
          periodData.length
        ).toFixed(1)
      : "0";

  const best =
    periodData.length > 0
      ? Math.max(...periodData.map((item) => item.score))
      : 0;

  const passedCount = periodData.filter(
    (item) => item.passed
  ).length;

  const passRate =
    periodData.length > 0
      ? Math.round(
          (passedCount / periodData.length) * 100
        )
      : 0;

  // ===================================================
  // SCORE CHART
  // ===================================================

  const chartData = useMemo(() => {
    return [...periodData]
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      )
      .slice(-8);
  }, [periodData]);

  const chartPoints = useMemo(() => {
    const width = 600;
    const height = 180;
    const paddingX = 25;
    const paddingY = 15;

    if (chartData.length === 0) return [];

    return chartData.map((item, index) => {
      const x =
        chartData.length === 1
          ? width / 2
          : paddingX +
            (index / (chartData.length - 1)) *
              (width - paddingX * 2);

      const y =
        height -
        paddingY -
        (Math.min(100, Math.max(0, item.score)) / 100) *
          (height - paddingY * 2);

      return {
        ...item,
        x,
        y,
      };
    });
  }, [chartData]);

  const linePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  // ===================================================
  // CATEGORY ANALYSIS
  // ===================================================

  const categoryStats = useMemo(() => {
    const groups = new Map<
      string,
      { total: number; score: number }
    >();

    periodData.forEach((item) => {
      const current = groups.get(item.category) || {
        total: 0,
        score: 0,
      };

      current.total += 1;
      current.score += item.score;

      groups.set(item.category, current);
    });

    return Array.from(groups.entries())
      .map(([name, value]) => ({
        name,
        average: Math.round(value.score / value.total),
        total: value.total,
      }))
      .sort((a, b) => b.average - a.average);
  }, [periodData]);

  const strongestCategory = categoryStats[0];

  const weakestCategory =
    categoryStats.length > 0
      ? [...categoryStats].sort(
          (a, b) => a.average - b.average
        )[0]
      : null;

  // ===================================================
  // LOADING AND ERROR
  // ===================================================

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchResults}
      />
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <PageHeader
          title="Hasil Belajar"
          description="Pantau perkembangan dan pencapaian belajarmu dari waktu ke waktu."
        />

        <div className="flex flex-wrap items-center gap-2">
          {periodOptions.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={
                period === item.value ? "default" : "outline"
              }
              className={cn(
                "rounded-full px-4",
                period === item.value &&
                  "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
              onClick={() =>
                setPeriod(item.value as PeriodType)
              }
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* MAIN STATISTICS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-card">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Rata-rata Nilai
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-foreground">
              {avg}
            </h3>
            <span className="text-xs font-semibold text-emerald-600">
              / 100
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Berdasarkan {periodData.length} ujian
          </p>
        </Card>

        <Card className="relative overflow-hidden border-blue-200/70 bg-gradient-to-br from-blue-50 to-white p-5 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-400">
            <CalendarDays className="h-6 w-6" />
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Total Ujian
          </p>

          <h3 className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {periodData.length}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Ujian dalam periode terpilih
          </p>
        </Card>

        <Card className="relative overflow-hidden border-violet-200/70 bg-gradient-to-br from-violet-50 to-white p-5 dark:border-violet-900/50 dark:from-violet-950/40 dark:to-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-400">
            <Trophy className="h-6 w-6" />
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Nilai Tertinggi
          </p>

          <h3 className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {best}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Pencapaian terbaikmu
          </p>
        </Card>

        <Card className="relative overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400">
            <Target className="h-6 w-6" />
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Tingkat Kelulusan
          </p>

          <h3 className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {passRate}%
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            {passedCount} dari {periodData.length} ujian lulus
          </p>
        </Card>
      </div>

      {/* CHART AND CATEGORY ANALYSIS */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* SCORE DEVELOPMENT CHART */}
        <Card className="overflow-hidden p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-foreground">
                  Grafik Perkembangan Nilai
                </h3>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Perjalanan hasil ujianmu dalam periode terpilih.
              </p>
            </div>

            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
            >
              Target 80
            </Badge>
          </div>

          {chartPoints.length === 0 ? (
            <div className="flex h-[230px] flex-col items-center justify-center text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">
                Belum ada data grafik
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Selesaikan ujian untuk melihat perkembangan nilaimu.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between pb-7 pt-2">
                  {[100, 75, 50, 25, 0].map((value) => (
                    <div
                      key={value}
                      className="flex items-center gap-3"
                    >
                      <span className="w-7 text-right text-[10px] text-muted-foreground">
                        {value}
                      </span>
                      <div className="flex-1 border-t border-dashed border-border/70" />
                    </div>
                  ))}
                </div>

                <svg
                  viewBox="0 0 600 210"
                  className="relative z-10 h-[230px] w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="scoreGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity="0.24"
                      />
                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>

                  <line
                    x1="25"
                    y1="58"
                    x2="575"
                    y2="58"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="6 5"
                  />

                  {chartPoints.length > 1 && (
                    <polygon
                      points={`25,195 ${linePoints} 575,195`}
                      fill="url(#scoreGradient)"
                    />
                  )}

                  {chartPoints.length > 1 && (
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {chartPoints.map((point) => (
                    <g key={point.id}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#059669"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={point.x}
                        y={Math.max(12, point.y - 12)}
                        fontSize="12"
                        textAnchor="middle"
                        fill="currentColor"
                        fontWeight="700"
                      >
                        {point.score}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {chartPoints.slice(-4).map((point) => (
                  <div
                    key={point.id}
                    className="rounded-lg bg-muted/50 p-2 text-center"
                  >
                    <p className="text-xs font-bold text-foreground">
                      {point.score}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatShortDate(point.date)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* CATEGORY ANALYSIS */}
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-foreground">
                Analisis Kategori Ujian
              </h3>
              <p className="text-xs text-muted-foreground">
                Rata-rata nilai berdasarkan kategori paket.
              </p>
            </div>
          </div>

          {categoryStats.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center text-center">
              <Target className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">
                Belum ada data analisis
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Analisis muncul setelah kamu menyelesaikan ujian.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900">
                  <Award className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Kategori dengan rata-rata tertinggi
                  </p>
                  <p className="truncate text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {strongestCategory?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rata-rata nilai {strongestCategory?.average}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {categoryStats.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>

                      <span
                        className={cn(
                          "text-sm font-bold",
                          getScoreColor(item.average)
                        )}
                      >
                        {item.average}%
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          index === 0
                            ? "bg-emerald-500"
                            : index === 1
                              ? "bg-blue-500"
                              : index === 2
                                ? "bg-violet-500"
                                : "bg-amber-500"
                        )}
                        style={{
                          width: `${Math.min(100, item.average)}%`,
                        }}
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      {item.total} kali ujian
                    </p>
                  </div>
                ))}
              </div>

              {weakestCategory &&
                weakestCategory.name !== strongestCategory?.name && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                      <Lightbulb className="h-4 w-4" />
                      Perlu ditingkatkan
                    </p>

                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Kategori {weakestCategory.name} memiliki
                      rata-rata nilai terendah, yaitu{" "}
                      {weakestCategory.average}.
                    </p>
                  </div>
                )}
            </div>
          )}
        </Card>
      </div>

      {/* EXAM HISTORY */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-foreground">
                Riwayat Hasil Ujian
              </h3>
              <p className="text-xs text-muted-foreground">
                Catatan seluruh ujian yang telah kamu kerjakan.
              </p>
            </div>
          </div>

          <Badge variant="outline">
            {filtered.length} hasil ditemukan
          </Badge>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Cari nama paket atau kategori..."
            className="flex-1"
          />

          <FilterSelect
            value={status}
            onChange={setStatus}
            options={["Lulus", "Belum lulus"]}
            allLabel="Semua status"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 pb-5">
            <EmptyState
              title="Hasil tidak ditemukan"
              description="Belum ada riwayat ujian pada periode atau filter yang dipilih."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Paket Ujian</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Benar / Salah</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-foreground">
                          {item.examTitle}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {item.category}
                        </p>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-mono text-sm font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {item.correct}
                        </span>
                        <span className="px-1 text-muted-foreground">
                          /
                        </span>
                        <span className="text-rose-500">
                          {item.incorrect}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={cn(
                            "text-base font-black",
                            getScoreColor(item.score)
                          )}
                        >
                          {item.score}
                        </span>
                      </TableCell>

                      <TableCell>
                        {item.passed ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Lulus
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Belum lulus
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => handleOpenDetail(item)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE HISTORY */}
            <div className="space-y-3 px-4 pb-4 md:hidden">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {item.examTitle}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {item.category}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-xl font-black",
                        getScoreColor(item.score)
                      )}
                    >
                      {item.score}
                    </span>
                  </div>

                  <div className="my-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(item.date)}
                    </span>

                    <span>
                      <span className="font-bold text-emerald-600">
                        {item.correct}
                      </span>
                      {" / "}
                      <span className="font-bold text-rose-500">
                        {item.incorrect}
                      </span>
                      {" benar/salah"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    {item.passed ? (
                      <Badge variant="success">Lulus</Badge>
                    ) : (
                      <Badge variant="danger">
                        Belum lulus
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* STUDY RECOMMENDATION */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-card sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
              <Lightbulb className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-bold text-emerald-900 dark:text-emerald-300">
                Tips Belajar untukmu!
              </h3>

              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-400">
                {periodData.length === 0
                  ? "Mulailah mengerjakan latihan untuk mengetahui kemampuan dan perkembangan belajarmu."
                  : weakestCategory && weakestCategory.average < 80
                    ? `Terus tingkatkan kemampuanmu pada kategori ${weakestCategory.name}. Coba pelajari kembali materi dan kerjakan latihan tambahan.`
                    : "Pertahankan konsistensi belajar dan terus tingkatkan hasil ujianmu."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Trophy className="h-4 w-4" />
            Terus tingkatkan prestasimu!
          </div>
        </div>
      </div>

      {/* RESULT DETAIL DIALOG */}
      <Dialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
      >
        {selectedResult && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <Award className="h-5 w-5 text-emerald-600" />
                {selectedResult.examTitle}
              </DialogTitle>

              <DialogDescription className="text-xs">
                Evaluasi hasil dan pelajari kembali jawaban ujianmu.
              </DialogDescription>
            </DialogHeader>

            {/* SCORE SUMMARY */}
            <div className="my-3 grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-3 text-center sm:gap-3 sm:p-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Skor Akhir
                </p>
                <p className="mt-1 text-xl font-black text-foreground">
                  {selectedResult.score}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Jawaban Benar
                </p>
                <p className="mt-1 text-xl font-black text-emerald-600">
                  {selectedResult.correct}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Jawaban Salah
                </p>
                <p className="mt-1 text-xl font-black text-rose-500">
                  {selectedResult.incorrect}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Tanggal pengerjaan
              </span>
              <span className="font-semibold text-foreground">
                {formatDate(selectedResult.date)}
              </span>
            </div>

            {selectedResult.answersExpired ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-6 text-center dark:border-blue-900 dark:bg-blue-950/20">
                <Clock className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                <p className="font-bold text-foreground">
                  Detail Evaluasi Tidak Tersedia
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Detail jawaban sudah melewati masa penyimpanan.
                  Nilai dan riwayat ujian tetap tersimpan.
                </p>
              </div>
            ) : (
              <div className="pt-3">
                <Tabs defaultValue="review" className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2">
                    <TabsTrigger
                      value="review"
                      className="gap-2 py-2.5 text-xs sm:text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      Tinjauan Jawaban
                    </TabsTrigger>

                    <TabsTrigger
                      value="discussion"
                      className="gap-2 py-2.5 text-xs sm:text-sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      Pembahasan
                    </TabsTrigger>
                  </TabsList>

                  {/* ANSWER REVIEW */}
                  <TabsContent
                    value="review"
                    className="mt-4 space-y-4"
                  >
                    {reviewLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 animate-pulse" />
                        Memuat lembar jawaban...
                      </div>
                    ) : reviewQuestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-center">
                        <CircleHelp className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground">
                          Detail soal belum tersedia
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Data soal untuk riwayat ujian ini belum
                          tersedia atau tidak dapat ditampilkan.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Jawaban benar
                          </span>
                          <span className="flex items-center gap-1 text-rose-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Jawaban salah
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <CircleHelp className="h-3.5 w-3.5" />
                            Tidak dijawab
                          </span>
                        </div>

                        {reviewQuestions.map((question, index) => {
                          const userIndex = getAnswerIndex(
                            question.options,
                            question.user_answer
                          );

                          const correctIndex = getAnswerIndex(
                            question.options,
                            question.correct_answer
                          );

                          const hasAnswered = userIndex >= 0;

                          const isCorrect =
                            hasAnswered &&
                            correctIndex >= 0 &&
                            userIndex === correctIndex;

                          const isUnanswered = !hasAnswered;

                          return (
                            <div
                              key={question.id}
                              className={cn(
                                "space-y-3 rounded-xl border p-4 text-xs",
                                isCorrect
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : isUnanswered
                                    ? "border-amber-500/30 bg-amber-500/5"
                                    : "border-rose-500/30 bg-rose-500/5"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-bold leading-relaxed text-foreground">
                                  {index + 1}. {question.question_text}
                                </p>

                                {isCorrect ? (
                                  <Badge
                                    variant="success"
                                    className="shrink-0 gap-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Benar
                                  </Badge>
                                ) : isUnanswered ? (
                                  <Badge
                                    variant="warning"
                                    className="shrink-0 gap-1"
                                  >
                                    <CircleHelp className="h-3 w-3" />
                                    Kosong
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="danger"
                                    className="shrink-0 gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Salah
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1.5 border-l-2 border-border/80 pl-2">
                                {question.options.map((option, optionIndex) => {
                                  const isUserChoice =
                                    hasAnswered && userIndex === optionIndex;

                                  const isCorrectOption =
                                    correctIndex === optionIndex;

                                  return (
                                    <div
                                      key={`${question.id}-${optionIndex}`}
                                      className={cn(
                                        "flex items-center justify-between gap-2 rounded-lg p-2",
                                        isCorrectOption &&
                                          "bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-400",
                                        isUserChoice &&
                                          !isCorrectOption &&
                                          "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                                      )}
                                    >
                                      <span className="leading-relaxed">
                                        <strong className="mr-1.5">
                                          {option.id}.
                                        </strong>
                                        {option.text}
                                      </span>

                                      <span className="flex shrink-0 items-center gap-1">
                                        {isUserChoice && (
                                          <span className="text-[9px] font-semibold">
                                            Jawabanmu
                                          </span>
                                        )}

                                        {isCorrectOption && (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
                                <div className="rounded-lg bg-muted/50 p-2">
                                  <p className="text-[10px] text-muted-foreground">
                                    Jawabanmu
                                  </p>
                                  <p className="mt-1 font-semibold text-foreground">
                                    {hasAnswered
                                      ? question.options[userIndex]?.text ||
                                        "Tidak diketahui"
                                      : "Tidak dijawab"}
                                  </p>
                                </div>

                                <div className="rounded-lg bg-emerald-500/10 p-2">
                                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    Jawaban benar
                                  </p>
                                  <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                                    {correctIndex >= 0
                                      ? question.options[correctIndex]?.text
                                      : "Belum dapat ditentukan"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </TabsContent>

                  {/* DISCUSSION */}
                  <TabsContent
                    value="discussion"
                    className="mt-4 space-y-4"
                  >
                    {reviewLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 animate-pulse" />
                        Memuat pembahasan...
                      </div>
                    ) : reviewQuestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-center">
                        <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground">
                          Pembahasan belum tersedia
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Data soal belum ditemukan untuk ujian ini.
                        </p>
                      </div>
                    ) : (
                      reviewQuestions.map((question, index) => {
                        const userIndex = getAnswerIndex(
                          question.options,
                          question.user_answer
                        );

                        const correctIndex = getAnswerIndex(
                          question.options,
                          question.correct_answer
                        );

                        const hasAnswered = userIndex >= 0;

                        const isCorrect =
                          hasAnswered &&
                          correctIndex >= 0 &&
                          userIndex === correctIndex;

                        return (
                          <div
                            key={question.id}
                            className="space-y-3 rounded-xl border bg-card p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-bold leading-relaxed text-foreground">
                                {index + 1}. {question.question_text}
                              </p>

                              {isCorrect ? (
                                <Badge
                                  variant="success"
                                  className="shrink-0"
                                >
                                  Benar
                                </Badge>
                              ) : !hasAnswered ? (
                                <Badge
                                  variant="warning"
                                  className="shrink-0"
                                >
                                  Kosong
                                </Badge>
                              ) : (
                                <Badge
                                  variant="danger"
                                  className="shrink-0"
                                >
                                  Salah
                                </Badge>
                              )}
                            </div>

                            <div className="rounded-lg bg-emerald-500/10 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Jawaban yang benar
                              </p>
                              <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                {correctIndex >= 0
                                  ? `${question.options[correctIndex]?.id}. ${question.options[correctIndex]?.text}`
                                  : "Jawaban benar belum dapat ditentukan."}
                              </p>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                Jawaban siswa
                              </p>
                              <p className="mt-1 text-xs font-medium text-foreground">
                                {hasAnswered
                                  ? `${question.options[userIndex]?.id}. ${question.options[userIndex]?.text}`
                                  : "Soal ini tidak dijawab."}
                              </p>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                              <p className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                                <Lightbulb className="h-4 w-4" />
                                Pembahasan
                              </p>

                              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-blue-900 dark:text-blue-200">
                                {question.explanation?.trim()
                                  ? question.explanation
                                  : "Pembahasan untuk soal ini belum ditambahkan oleh pengajar."}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
