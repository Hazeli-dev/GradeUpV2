import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock,
  Eye,
  FileCheck2,
  Lightbulb,
  Search,
  Target,
  Trophy,
  XCircle,
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
  totalQuestions: number;
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

type StatusType = "all" | "Lulus" | "Belum lulus";

// =====================================================
// CONSTANTS
// =====================================================

const periodOptions = [
  { label: "7 Hari", value: "7" },
  { label: "30 Hari", value: "30" },
  { label: "3 Bulan", value: "90" },
  { label: "1 Tahun", value: "365" },
];

const statusOptions = ["Lulus", "Belum lulus"];

// =====================================================
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card dan panel.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

// Tombol utama emerald.
const BTN_PRIMARY =
  "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:to-teal-700 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/50";

// Animasi ringan. Dimatikan otomatis jika prefers-reduced-motion aktif.
const PAGE_STYLES = `
@keyframes gu-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
}
@keyframes gu-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(16px, 12px, 0) scale(1.05); }
}
.gu-float { animation: gu-float 10s ease-in-out infinite; }
.gu-drift { animation: gu-drift 18s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gu-float, .gu-drift { animation: none !important; }
}
`;

// =====================================================
// HELPERS
// =====================================================

const getPeriodStart = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
};

const getScoreColor = (score: number) => {
  if (score >= 85) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (score >= 70) {
    return "text-blue-600 dark:text-blue-400";
  }

  return "text-amber-600 dark:text-amber-400";
};

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

const getAnswerCount = (answers: unknown): number => {
  if (!answers || typeof answers !== "object") return 0;

  if (Array.isArray(answers)) return answers.length;

  return Object.keys(answers).length;
};

const getStatusBadge = (passed: boolean) => {
  return passed ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Lulus
    </Badge>
  ) : (
    <Badge variant="danger" className="gap-1">
      <XCircle className="h-3 w-3" />
      Belum lulus
    </Badge>
  );
};

// =====================================================
// MAIN PAGE
// =====================================================

export default function ResultsPage() {
  const [data, setData] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusType>("all");
  const [period, setPeriod] = useState<PeriodType>("30");

  const [selectedResult, setSelectedResult] =
    useState<ResultItem | null>(null);

  const [reviewQuestions, setReviewQuestions] =
    useState<QuestionReview[]>([]);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ===================================================
  // FETCH EXAM RESULTS
  // ===================================================

  const fetchResults = useCallback(async () => {
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

      const { data: attempts, error: attemptsError } =
        await supabase
          .from("exam_attempts")
          .select(
            "id, user_id, exam_id, score, status, created_at, correct_count, wrong_count, total_questions, is_passed, answers"
          )
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      const packageIds = [
        ...new Set(
          (attempts || [])
            .map((attempt: any) => String(attempt.exam_id || ""))
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
            }]
          )
        );
      }

      const mappedData: ResultItem[] = (attempts || []).map(
        (attempt: any) => {
          const packageId = String(attempt.exam_id || "");
          const pkg = packageMap.get(packageId);

          const passingScore = pkg?.passing_score ?? 60;
          const currentScore = Math.min(
            100,
            Math.max(0, Number(attempt.score) || 0)
          );

          const totalQuestions = Math.max(
            0,
            Number(attempt.total_questions) ||
              getAnswerCount(attempt.answers)
          );

          const hasCorrectCount =
            attempt.correct_count !== null &&
            attempt.correct_count !== undefined;

          const hasWrongCount =
            attempt.wrong_count !== null &&
            attempt.wrong_count !== undefined;

          let correct = hasCorrectCount
            ? Math.max(0, Number(attempt.correct_count) || 0)
            : 0;

          let incorrect = hasWrongCount
            ? Math.max(0, Number(attempt.wrong_count) || 0)
            : 0;

          if (!hasCorrectCount && !hasWrongCount) {
            correct = Math.round(
              (currentScore / 100) * totalQuestions
            );

            incorrect = Math.max(0, totalQuestions - correct);
          } else if (!hasCorrectCount) {
            correct = Math.max(0, totalQuestions - incorrect);
          } else if (!hasWrongCount) {
            incorrect = Math.max(0, totalQuestions - correct);
          }

          return {
            id: String(attempt.id),
            examTitle: pkg?.title || "Paket Ujian",
            category: pkg?.category || "Umum",
            date: attempt.created_at,
            correct,
            incorrect,
            totalQuestions,
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
      console.error("Gagal memuat hasil belajar:", err);

      setError(
        err.message || "Gagal memuat hasil belajar dari database."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  // ===================================================
  // SECURE REVIEW RPC
  // ===================================================

  const handleOpenDetail = async (item: ResultItem) => {
    setSelectedResult(item);
    setReviewQuestions([]);
    setReviewError(null);
    setDetailOpen(true);

    if (item.answersExpired) {
      setReviewLoading(false);
      return;
    }

    setReviewLoading(true);

    try {
      // Tetap menggunakan RPC untuk menjaga keamanan.
      // Tidak ada SELECT langsung ke tabel questions.
      const { data: reviewData, error: reviewRpcError } =
        await supabase.rpc("get_exam_attempt_review", {
          p_attempt_id: item.id,
        });

      if (reviewRpcError) throw reviewRpcError;

      const mappedQuestions: QuestionReview[] = (
        reviewData || []
      ).map((question: any) => ({
        id: String(question.question_id),
        question_text: String(
          question.question_text || "Pertanyaan"
        ),
        options: normalizeOptions(question.options),
        correct_answer: String(question.correct_answer ?? ""),
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

      setReviewError(
        err.message || "Tinjauan jawaban gagal dimuat."
      );

      setReviewQuestions([]);
    } finally {
      setReviewLoading(false);
    }
  };

  // ===================================================
  // PERIOD FILTER
  // ===================================================

  const periodData = useMemo(() => {
    const startDate = getPeriodStart(Number(period));
    const now = Date.now();

    return data.filter((item) => {
      const timestamp = new Date(item.date).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp >= startDate.getTime() &&
        timestamp <= now
      );
    });
  }, [data, period]);

  // ===================================================
  // SEARCH AND STATUS FILTER
  // ===================================================

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return periodData
      .filter((item) => {
        if (!keyword) return true;

        return (
          item.examTitle.toLowerCase().includes(keyword) ||
          item.category.toLowerCase().includes(keyword)
        );
      })
      .filter((item) => {
        if (status === "all") return true;
        if (status === "Lulus") return item.passed;

        return !item.passed;
      });
  }, [periodData, q, status]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    const passed = periodData.filter((item) => item.passed).length;
    const failed = periodData.length - passed;

    return {
      total: periodData.length,
      passed,
      failed,
    };
  }, [periodData]);

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
    <div className="relative isolate">
      <style>{PAGE_STYLES}</style>

      {/* BACKGROUND DEKORATIF (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />

        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] dark:opacity-40" />

        <div className="gu-drift absolute -left-28 top-72 h-[24rem] w-[24rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/12" />
        <div className="gu-float absolute -right-24 top-[40rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
        <div className="absolute -left-20 bottom-24 h-[20rem] w-[20rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
      </div>

      <div className="relative space-y-6 pb-8">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageHeader
            title="Hasil Belajar"
            description="Lihat riwayat ujian, periksa hasil, dan pelajari kembali jawabanmu."
          />

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5",
              GLASS
            )}
          >
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Periode:
            </span>

            {periodOptions.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={
                  period === item.value ? "default" : "outline"
                }
                className={cn(
                  "rounded-full border-transparent bg-transparent px-3 transition-all hover:bg-emerald-500/10 motion-reduce:transition-none",
                  period === item.value && BTN_PRIMARY
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

        {/* INTRODUCTION */}
        <Card className="relative overflow-hidden rounded-3xl border-emerald-400/20 bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-900 p-5 text-white shadow-[0_20px_50px_-20px_rgba(6,78,59,0.7)] dark:border-emerald-400/20 dark:from-emerald-700 dark:via-emerald-900 dark:to-teal-950 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />
            <div className="gu-drift absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
            <div className="absolute -right-10 bottom-2 h-32 w-32 rounded-full border border-white/10" />
            <div className="absolute -right-24 -bottom-6 h-52 w-52 rounded-full border border-white/10" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-emerald-100 shadow-lg ring-1 ring-inset ring-white/10 backdrop-blur-md">
                <FileCheck2 className="h-6 w-6" />
              </div>

              <div>
                <h2 className="font-bold text-white">
                  Evaluasi hasil ujianmu
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-emerald-50/80">
                  Semua ujian yang sudah diselesaikan tersimpan di sini.
                  Periksa nilai, status kelulusan, dan pembahasan untuk
                  mengetahui bagian yang perlu dipelajari kembali.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-emerald-50 backdrop-blur-md sm:self-center">
              <Trophy className="h-4 w-4" />
              Terus berkembang
            </div>
          </div>
        </Card>

        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            className={cn(
              "group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-blue-500/30 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15 dark:bg-blue-950/50 dark:text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                Periode terpilih
              </Badge>
            </div>

            <p className="relative mt-4 text-sm font-medium text-muted-foreground">
              Total Ujian
            </p>
            <p className="relative mt-1 text-3xl font-black tracking-tight text-foreground">
              {summary.total}
            </p>
            <p className="relative mt-1 text-xs text-muted-foreground">
              Ujian yang telah diselesaikan
            </p>
          </Card>

          <Card
            className={cn(
              "group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/40 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <Badge variant="success">Lulus</Badge>
            </div>

            <p className="relative mt-4 text-sm font-medium text-muted-foreground">
              Ujian Lulus
            </p>
            <p className="relative mt-1 text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.passed}
            </p>
            <p className="relative mt-1 text-xs text-muted-foreground">
              Berhasil mencapai nilai kelulusan
            </p>
          </Card>

          <Card
            className={cn(
              "group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-amber-500/40 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/15 dark:bg-amber-950/50 dark:text-amber-400">
                <Target className="h-5 w-5" />
              </div>
              <Badge variant="warning">Evaluasi</Badge>
            </div>

            <p className="relative mt-4 text-sm font-medium text-muted-foreground">
              Belum Lulus
            </p>
            <p className="relative mt-1 text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {summary.failed}
            </p>
            <p className="relative mt-1 text-xs text-muted-foreground">
              Kesempatan untuk belajar lebih baik
            </p>
          </Card>
        </div>

        {/* EXAM HISTORY */}
        <Card className={cn("relative overflow-hidden", GLASS)}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
          />

          <div className="relative flex flex-col gap-3 border-b border-emerald-900/10 p-5 dark:border-emerald-400/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Award className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-foreground">
                  Riwayat Hasil Ujian
                </h3>
                <p className="text-xs text-muted-foreground">
                  Daftar ujian yang telah kamu kerjakan.
                </p>
              </div>
            </div>

            <Badge variant="outline">
              {filtered.length} hasil ditemukan
            </Badge>
          </div>

          {/* FILTERS */}
          <div className="relative flex flex-col gap-3 border-b border-emerald-900/10 p-4 dark:border-emerald-400/10 sm:flex-row">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Cari nama paket atau kategori..."
              className="flex-1"
            />

            <FilterSelect
              value={status}
              onChange={(value) =>
                setStatus(value as StatusType)
              }
              options={statusOptions}
              allLabel="Semua status"
            />
          </div>

          {/* EMPTY STATE */}
          {filtered.length === 0 ? (
            <div className="relative px-4 py-8">
              {data.length === 0 ? (
                <EmptyState
                  title="Belum ada hasil ujian"
                  description="Hasil ujian yang sudah kamu selesaikan akan muncul di halaman ini."
                />
              ) : (
                <EmptyState
                  title="Hasil tidak ditemukan"
                  description="Coba ubah kata pencarian, status kelulusan, atau periode yang dipilih."
                />
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="relative hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-500/[0.06] hover:bg-emerald-500/[0.06]">
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
                        className="transition-colors hover:bg-emerald-500/[0.05] motion-reduce:transition-none"
                      >
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        <TableCell className="min-w-[190px]">
                          <p className="font-semibold text-foreground">
                            {item.examTitle}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
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
                          {item.totalQuestions > 0 && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              / {item.totalQuestions}
                            </span>
                          )}
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
                          <span className="ml-0.5 text-xs text-muted-foreground">
                            /100
                          </span>
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(item.passed)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="soft"
                            className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
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
              <div className="relative space-y-3 p-4 md:hidden">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-emerald-900/10 bg-white/70 p-4 dark:border-emerald-400/10 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug text-foreground">
                          {item.examTitle}
                        </p>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {item.category}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-2xl font-black",
                            getScoreColor(item.score)
                          )}
                        >
                          {item.score}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          dari 100
                        </p>
                      </div>
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
                        {" benar "}
                        <span className="font-bold text-rose-500">
                          {item.incorrect}
                        </span>
                        {" salah"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-emerald-900/10 pt-3 dark:border-emerald-400/10">
                      {getStatusBadge(item.passed)}

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/40 font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"
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

        {/* LEARNING GUIDANCE */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.08] via-sky-500/[0.04] to-emerald-500/[0.07] p-4 backdrop-blur-md sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-blue-400/15 blur-3xl"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 ring-1 ring-blue-500/15 dark:bg-blue-900/60 dark:text-blue-400">
              <Lightbulb className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-300">
                Jadikan hasil ujian sebagai bahan belajar
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                Periksa jawaban yang salah, baca pembahasannya, lalu
                pelajari kembali materi terkait. Setiap hasil ujian
                adalah kesempatan untuk meningkatkan pemahamanmu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RESULT DETAIL DIALOG */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);

          if (!open) {
            setSelectedResult(null);
            setReviewQuestions([]);
            setReviewError(null);
            setReviewLoading(false);
          }
        }}
      >
        {selectedResult && (
          <DialogContent className="max-h-[90vh] overflow-y-auto border-emerald-900/10 bg-gradient-to-b from-white to-emerald-50/70 dark:border-emerald-400/10 dark:from-slate-900 dark:to-[#0a1f1b] sm:max-w-3xl">
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
            <div className="relative grid grid-cols-3 gap-2 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-white/50 to-teal-500/10 p-3 text-center dark:via-slate-900/40 sm:gap-3 sm:p-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/15 blur-2xl"
              />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Skor Akhir
                </p>
                <p
                  className={cn(
                    "mt-1 text-xl font-black",
                    getScoreColor(selectedResult.score)
                  )}
                >
                  {selectedResult.score}
                </p>
              </div>

              <div className="relative">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Jawaban Benar
                </p>
                <p className="mt-1 text-xl font-black text-emerald-600">
                  {selectedResult.correct}
                </p>
              </div>

              <div className="relative">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Jawaban Salah
                </p>
                <p className="mt-1 text-xl font-black text-rose-500">
                  {selectedResult.incorrect}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Tanggal pengerjaan
              </span>
              <span className="font-semibold text-foreground">
                {formatDate(selectedResult.date)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Status hasil ujian
              </span>
              {getStatusBadge(selectedResult.passed)}
            </div>

            {selectedResult.answersExpired ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-6 text-center dark:border-blue-900 dark:bg-blue-950/20">
                <Clock className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                <p className="font-bold text-foreground">
                  Detail Evaluasi Tidak Tersedia
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Data jawaban tidak tersimpan pada riwayat ujian ini.
                  Nilai dan riwayat ujian tetap dapat dilihat.
                </p>
              </div>
            ) : (
              <div className="pt-2">
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
                        <Clock className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
                        Memuat lembar jawaban...
                      </div>
                    ) : reviewError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-900 dark:bg-rose-950/20">
                        <CircleHelp className="mx-auto mb-2 h-8 w-8 text-rose-500" />
                        <p className="text-sm font-semibold text-foreground">
                          Gagal memuat tinjauan jawaban
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reviewError}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() =>
                            handleOpenDetail(selectedResult)
                          }
                        >
                          Coba Lagi
                        </Button>
                      </div>
                    ) : reviewQuestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-emerald-600/25 p-6 text-center">
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

                              <div className="space-y-1.5 border-l-2 border-emerald-500/20 pl-2">
                                {question.options.map(
                                  (option, optionIndex) => {
                                    const isUserChoice =
                                      hasAnswered &&
                                      userIndex === optionIndex;

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
                                  }
                                )}
                              </div>

                              <div className="grid gap-2 border-t border-emerald-900/10 pt-3 dark:border-emerald-400/10 sm:grid-cols-2">
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
                        <Clock className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
                        Memuat pembahasan...
                      </div>
                    ) : reviewError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-900 dark:bg-rose-950/20">
                        <CircleHelp className="mx-auto mb-2 h-8 w-8 text-rose-500" />
                        <p className="text-sm font-semibold text-foreground">
                          Pembahasan gagal dimuat
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reviewError}
                        </p>
                      </div>
                    ) : reviewQuestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-emerald-600/25 p-6 text-center">
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
                            className="space-y-3 rounded-xl border border-emerald-900/10 bg-white/70 p-4 dark:border-emerald-400/10 dark:bg-slate-950/40"
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
