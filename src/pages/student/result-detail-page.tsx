
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquareText,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";
import { formatDate } from "@/utils/format";
import { CHART_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionItem {
  id: string;
  text: string;
  options: QuestionOption[];
  correctIndex: number;
  explanation: string;
}

interface ResultData {
  id: string;
  examTitle: string;
  date: string;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalQuestions: number;
  durationUsed: number | null;
  passed: boolean;
  userAnswers: Record<string, number | null>;
}

const getCorrectIndex = (answer: unknown): number => {
  if (typeof answer === "number" && Number.isInteger(answer)) {
    return answer;
  }

  const value = String(answer ?? "").trim().toUpperCase();

  if (/^[A-Z]$/.test(value)) {
    return value.charCodeAt(0) - 65;
  }

  const numericValue = Number(value);

  return Number.isInteger(numericValue) ? numericValue : -1;
};

const parseOptions = (value: unknown): QuestionOption[] => {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((option, index) => {
    if (typeof option === "object" && option !== null) {
      const item = option as Record<string, unknown>;

      return {
        id: String(item.id ?? String.fromCharCode(65 + index)),
        text: String(item.text ?? ""),
      };
    }

    return {
      id: String.fromCharCode(65 + index),
      text: String(option ?? ""),
    };
  });
};

export default function ResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>();

  const [result, setResult] = useState<ResultData | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!resultId) {
      setError("ID hasil ujian tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Pastikan pengguna sudah login.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Silakan login untuk melihat hasil ujian.");
      }

      // 2. Ambil hasil ujian milik pengguna yang sedang login.
      const { data: attempt, error: attemptError } = await supabase
        .from("exam_attempts")
        .select(
          "id, user_id, exam_id, score, answers, status, created_at, correct_count, wrong_count, total_questions, is_passed"
        )
        .eq("id", resultId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (attemptError) throw attemptError;

      if (!attempt) {
        throw new Error(
          "Data hasil ujian tidak ditemukan atau tidak dapat diakses."
        );
      }

      const examId = attempt.exam_id;

      // 3. Ambil informasi paket ujian.
      let examTitle = "Paket Ujian";
      let passingScore = 70;

      if (examId) {
        const { data: examPackage, error: packageError } = await supabase
          .from("exam_packages")
          .select("title, passing_score")
          .eq("id", examId)
          .maybeSingle();

        if (packageError) throw packageError;

        if (examPackage) {
          examTitle = examPackage.title || examTitle;
          passingScore = Number(examPackage.passing_score ?? 70);
        }
      }

      // 4. Baca jawaban siswa.
      const rawAnswers =
        attempt.answers && typeof attempt.answers === "object"
          ? (attempt.answers as Record<string, unknown>)
          : {};

      const userAnswers: Record<string, number | null> = {};

      Object.entries(rawAnswers).forEach(([questionId, answer]) => {
        const numericAnswer = Number(answer);

        userAnswers[questionId] =
          answer === null ||
          answer === undefined ||
          !Number.isInteger(numericAnswer)
            ? null
            : numericAnswer;
      });

      // 5. Ambil soal berdasarkan ID yang tersimpan pada jawaban.
      const questionIds = Object.keys(userAnswers);

      let questionList: QuestionItem[] = [];

      if (questionIds.length > 0) {
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select(
            "id, question_text, options, correct_answer, explanation"
          )
          .in("id", questionIds);

        if (questionError) throw questionError;

        questionList = (questionData ?? []).map((question) => ({
          id: String(question.id),
          text: String(
            question.question_text ?? "Pertanyaan tidak tersedia"
          ),
          options: parseOptions(question.options),
          correctIndex: getCorrectIndex(question.correct_answer),
          explanation: String(
            question.explanation ?? ""
          ),
        }));

        // Susun kembali sesuai urutan ID pada answers.
        const questionMap = new Map(
          questionList.map((question) => [question.id, question])
        );

        questionList = questionIds
          .map((id) => questionMap.get(id))
          .filter(
            (question): question is QuestionItem => Boolean(question)
          );
      }

      setQuestions(questionList);

      // 6. Hitung statistik berdasarkan data yang tersedia.
      const totalQuestions = Math.max(
        0,
        Number(attempt.total_questions ?? questionList.length)
      );

      let correct = 0;

      questionList.forEach((question) => {
        const selectedIndex = userAnswers[question.id];

        if (
          selectedIndex !== null &&
          selectedIndex !== undefined &&
          selectedIndex === question.correctIndex &&
          question.correctIndex >= 0
        ) {
          correct++;
        }
      });

      const answeredCount = Object.values(userAnswers).filter(
        (answer) => answer !== null && answer !== undefined
      ).length;

      const incorrect = Math.max(0, answeredCount - correct);
      const unanswered = Math.max(0, totalQuestions - answeredCount);
      const score = Number(attempt.score ?? 0);

      setResult({
        id: String(attempt.id),
        examTitle,
        date: attempt.created_at ?? new Date().toISOString(),
        score,
        correct,
        incorrect,
        unanswered,
        totalQuestions,
        durationUsed: null,
        passed:
          typeof attempt.is_passed === "boolean"
            ? attempt.is_passed
            : score >= passingScore,
        userAnswers,
      });
    } catch (err) {
      console.error("Fetch result detail error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat rincian hasil ujian."
      );
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <PageSkeleton />;

  if (error || !result) {
    return (
      <ErrorState
        message={error || "Hasil ujian tidak ditemukan."}
        onRetry={fetchData}
      />
    );
  }

  const secondaryColor = CHART_COLORS?.secondary || "#10b981";
  const dangerColor = CHART_COLORS?.danger || "#ef4444";
  const mutedColor = CHART_COLORS?.muted || "#6b7280";

  const pieData = [
    {
      name: "Benar",
      value: result.correct,
      color: secondaryColor,
    },
    {
      name: "Salah",
      value: result.incorrect,
      color: dangerColor,
    },
    {
      name: "Kosong",
      value: result.unanswered,
      color: mutedColor,
    },
  ].filter((item) => item.value > 0);

  const chartData =
    pieData.length > 0
      ? pieData
      : [{ name: "Belum tersedia", value: 1, color: mutedColor }];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <Link
        to="/dashboard/results"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Hasil Belajar
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* RINGKASAN HASIL */}
        <Card className="h-fit overflow-hidden border-border/70 shadow-sm lg:sticky lg:top-6">
          <div className="h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-400" />

          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="relative h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`result-chart-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black tracking-tight">
                  {result.score}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  dari 100
                </span>
              </div>
            </div>

            <h1 className="mt-3 text-lg font-extrabold leading-snug">
              {result.examTitle}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(result.date)}
            </p>

            <div className="mt-4">
              {result.passed ? (
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Lulus
                </Badge>
              ) : (
                <Badge variant="danger">Belum lulus</Badge>
              )}
            </div>

            <div className="mt-6 grid w-full grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Benar
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {result.correct}
                </p>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Salah
                </p>
                <p className="mt-1 text-xl font-extrabold text-red-600 dark:text-red-400">
                  {result.incorrect}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Kosong
                </p>
                <p className="mt-1 text-xl font-extrabold">
                  {result.unanswered}
                </p>
              </div>
            </div>

            <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              Durasi pengerjaan belum tercatat
            </div>

            <div className="mt-4 w-full space-y-1 text-left">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total soal</span>
                <span className="font-bold text-foreground">
                  {result.totalQuestions}
                </span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sudah dijawab</span>
                <span className="font-bold text-foreground">
                  {result.correct + result.incorrect}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TINJAUAN DAN PEMBAHASAN */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Evaluasi Ujian
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pelajari jawaban dan pembahasan untuk meningkatkan pemahamanmu.
            </p>
          </div>

          <Tabs defaultValue="review" className="w-full">
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="review">
                Tinjauan Jawaban
              </TabsTrigger>

              <TabsTrigger value="discussion">
                <MessageSquareText className="mr-1.5 h-4 w-4" />
                Pembahasan
              </TabsTrigger>
            </TabsList>

            {/* TAB TINJAUAN */}
            <TabsContent value="review" className="mt-4 space-y-4">
              {questions.length === 0 ? (
                <EmptyState
                  title="Tinjauan soal belum tersedia"
                  description="ID soal tidak ditemukan dalam data jawaban ujian ini."
                />
              ) : (
                questions.map((question, index) => {
                  const chosen = result.userAnswers[question.id] ?? null;

                  const isAnswered =
                    chosen !== null && chosen !== undefined;

                  const isCorrect =
                    isAnswered &&
                    chosen === question.correctIndex &&
                    question.correctIndex >= 0;

                  const status = !isAnswered
                    ? "blank"
                    : isCorrect
                      ? "correct"
                      : "wrong";

                  return (
                    <Card
                      key={question.id}
                      className="overflow-hidden border-border/70 shadow-sm"
                    >
                      <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
                            status === "correct" &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            status === "wrong" &&
                              "bg-red-500/10 text-red-600 dark:text-red-400",
                            status === "blank" &&
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-bold leading-relaxed">
                            {question.text}
                          </CardTitle>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {status === "correct"
                              ? "Jawaban benar"
                              : status === "wrong"
                                ? "Jawaban belum tepat"
                                : "Tidak dijawab"}
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const correctOption =
                            optionIndex === question.correctIndex;

                          const selectedOption =
                            optionIndex === chosen;

                          return (
                            <div
                              key={option.id}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm",
                                correctOption &&
                                  "border-emerald-500/40 bg-emerald-500/5",
                                selectedOption &&
                                  !correctOption &&
                                  "border-red-500/40 bg-red-500/5"
                              )}
                            >
                              <span className="font-bold text-muted-foreground">
                                {option.id}.
                              </span>

                              <span className="min-w-0 flex-1">
                                {option.text}
                              </span>

                              {correctOption && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                              )}

                              {selectedOption && !correctOption && (
                                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                              )}
                            </div>
                          );
                        })}

                        {!isAnswered && (
                          <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                            <MinusCircle className="h-4 w-4" />
                            Kamu belum memilih jawaban.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* TAB PEMBAHASAN */}
            <TabsContent value="discussion" className="mt-4 space-y-4">
              {questions.length === 0 ? (
                <EmptyState
                  title="Pembahasan belum tersedia"
                  description="Belum ada data soal yang dapat ditampilkan."
                />
              ) : (
                questions.map((question, index) => {
                  const chosen = result.userAnswers[question.id] ?? null;

                  const isAnswered = chosen !== null;

                  const isCorrect =
                    isAnswered &&
                    chosen === question.correctIndex &&
                    question.correctIndex >= 0;

                  const status = !isAnswered
                    ? "blank"
                    : isCorrect
                      ? "correct"
                      : "wrong";

                  const selectedOption =
                    isAnswered &&
                    chosen >= 0 &&
                    chosen < question.options.length
                      ? question.options[chosen]
                      : null;

                  const correctOption =
                    question.correctIndex >= 0 &&
                    question.correctIndex < question.options.length
                      ? question.options[question.correctIndex]
                      : null;

                  return (
                    <Card
                      key={question.id}
                      className="overflow-hidden border-border/70 shadow-sm"
                    >
                      <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
                            status === "correct" &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            status === "wrong" &&
                              "bg-red-500/10 text-red-600 dark:text-red-400",
                            status === "blank" &&
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-bold leading-relaxed">
                            {question.text}
                          </CardTitle>

                          <div className="mt-2">
                            {status === "correct" ? (
                              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Jawaban benar
                              </Badge>
                            ) : status === "wrong" ? (
                              <Badge variant="danger">
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Jawaban salah
                              </Badge>
                            ) : (
                              <Badge variant="muted">
                                <MinusCircle className="mr-1 h-3.5 w-3.5" />
                                Tidak dijawab
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* PILIHAN JAWABAN */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Pilihan jawaban
                          </p>

                          {question.options.map((option, optionIndex) => {
                            const isCorrect =
                              optionIndex === question.correctIndex;

                            const isSelected =
                              optionIndex === chosen;

                            return (
                              <div
                                key={option.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm",
                                  isCorrect &&
                                    "border-emerald-500/40 bg-emerald-500/5",
                                  isSelected &&
                                    !isCorrect &&
                                    "border-red-500/40 bg-red-500/5"
                                )}
                              >
                                <span className="font-bold text-muted-foreground">
                                  {option.id}.
                                </span>

                                <span className="min-w-0 flex-1">
                                  {option.text}
                                </span>

                                {isCorrect && (
                                  <Badge className="border-emerald-500/20 bg-emerald-600 text-white">
                                    Kunci jawaban
                                  </Badge>
                                )}

                                {isSelected && !isCorrect && (
                                  <Badge variant="danger">
                                    Jawabanmu
                                  </Badge>
                                )}

                                {isSelected && isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* PERBANDINGAN JAWABAN */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Jawabanmu
                            </p>

                            <p className="mt-1 text-sm font-bold">
                              {selectedOption
                                ? `${selectedOption.id}. ${selectedOption.text}`
                                : "Tidak menjawab"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Jawaban yang benar
                            </p>

                            <p className="mt-1 text-sm font-bold">
                              {correctOption
                                ? `${correctOption.id}. ${correctOption.text}`
                                : "Kunci jawaban belum tersedia"}
                            </p>
                          </div>
                        </div>

                        {/* PEMBAHASAN */}
                        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-primary">
                            <MessageSquareText className="h-4 w-4" />
                            Pembahasan Soal
                          </div>

                          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                            {question.explanation?.trim()
                              ? question.explanation
                              : "Pembahasan untuk soal ini belum tersedia. Silakan hubungi pengajar atau administrator."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
