import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  MessageSquareText,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { checkAndUnlockAchievements } from "@/services/achievement.service";

interface QuestionItem {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ResultData {
  id: string;
  examId: string;
  examTitle: string;
  date: string;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  durationUsed: number;
  passed: boolean;
  userAnswers: Record<string, number>;
  answersExpired: boolean;
}

// =====================================================
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card dan panel.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

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

function PageDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />

      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] dark:opacity-40" />

      <div className="gu-drift absolute -left-28 top-40 h-[24rem] w-[24rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/12" />
      <div className="gu-float absolute -right-24 top-[32rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
      <div className="absolute -left-20 bottom-24 h-[20rem] w-[20rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
    </div>
  );
}

// Mengubah kunci jawaban menjadi indeks pilihan.
// Mendukung format angka (0, 1, 2), huruf (A, B, C), dan angka string.
const getCorrectIndex = (answer: unknown): number => {
  if (typeof answer === "number" && Number.isInteger(answer)) {
    return answer >= 0 ? answer : 0;
  }

  if (typeof answer === "string") {
    const normalized = answer.trim().toUpperCase();

    if (/^[A-Z]$/.test(normalized)) {
      return normalized.charCodeAt(0) - 65;
    }

    const parsed = Number(normalized);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
};

const parseOptions = (options: unknown): string[] => {
  let parsedOptions = options;

  if (typeof options === "string") {
    try {
      parsedOptions = JSON.parse(options);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsedOptions)) return [];

  return parsedOptions.map((option: any) => {
    if (typeof option === "object" && option !== null) {
      return String(option.text ?? option.label ?? option.value ?? "");
    }

    return String(option);
  });
};

const parseUserAnswers = (answers: unknown): Record<string, number> => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {};
  }

  const parsed: Record<string, number> = {};

  Object.entries(answers as Record<string, unknown>).forEach(([id, value]) => {
    if (typeof value === "number" && Number.isInteger(value)) {
      parsed[id] = value;
    } else if (typeof value === "string") {
      const normalized = value.trim().toUpperCase();

      if (/^[A-Z]$/.test(normalized)) {
        parsed[id] = normalized.charCodeAt(0) - 65;
      } else {
        const numericValue = Number(normalized);
        if (Number.isInteger(numericValue)) {
          parsed[id] = numericValue;
        }
      }
    }
  });

  return parsed;
};

export default function ResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>();

  const [result, setResult] = useState<ResultData | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!resultId) {
      setError("ID hasil ujian tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Ambil data hasil ujian milik pengguna yang sedang login.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw new Error(authError.message);
      if (!user) throw new Error("Silakan login kembali.");

      const { data: attempt, error: attemptError } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", resultId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (attemptError) throw new Error(attemptError.message);
      if (!attempt) throw new Error("Data hasil ujian tidak ditemukan.");

      const examId = attempt.exam_package_id || attempt.exam_id;

      // 2. Ambil informasi paket ujian.
      let examTitle = "Paket Ujian";
      let passingScore = 60;

      if (examId) {
        const { data: examPackage, error: packageError } = await supabase
          .from("exam_packages")
          .select("title, passing_score")
          .eq("id", examId)
          .maybeSingle();

        if (packageError) throw new Error(packageError.message);

        if (examPackage) {
          examTitle = examPackage.title || examTitle;
          passingScore = examPackage.passing_score ?? 60;
        }
      }

      // 3. Deteksi apakah detail jawaban sudah dihapus oleh cron.
      // Cron mengubah kolom answers menjadi NULL setelah 6 bulan.
      const answersExpired = attempt.answers === null;

      let userAnswers = parseUserAnswers(attempt.answers);


      // 4. Ambil soal dan pembahasan melalui RPC yang aman.
      let questionList: QuestionItem[] = [];

      if (!answersExpired && examId) {
        const { data: reviewData, error: reviewError } =
          await supabase.rpc("get_exam_attempt_review", {
            p_attempt_id: resultId,
          });

        if (reviewError) throw new Error(reviewError.message);

        if (reviewData && Array.isArray(reviewData)) {
          const reviewAnswers: Record<string, unknown> = {};

          questionList = reviewData.map((question: any) => {
            const id = String(question.question_id);

            if (question.user_answer !== null) {
              reviewAnswers[id] = question.user_answer;
            }

            let rawText = question.question_text || "Pertanyaan";

            if (typeof rawText === "object" && rawText !== null) {
              rawText =
                rawText.text ||
                rawText.question ||
                JSON.stringify(rawText);
            }

            let rawExplanation =
              question.explanation || "Belum ada pembahasan.";

            if (
              typeof rawExplanation === "object" &&
              rawExplanation !== null
            ) {
              rawExplanation =
                rawExplanation.text || JSON.stringify(rawExplanation);
            }

            return {
              id,
              text: String(rawText),
              options: parseOptions(question.options),
              correctIndex: getCorrectIndex(question.correct_answer),
              explanation: String(rawExplanation),
            };
          });

          // Gunakan jawaban dari RPC agar format lama dan baru didukung.
          const rpcUserAnswers = parseUserAnswers(reviewAnswers);

          Object.keys(userAnswers).forEach((key) => {
            delete userAnswers[key];
          });

          Object.assign(userAnswers, rpcUserAnswers);
        }
      }

      setQuestions(questionList);


      // 5. Gunakan statistik yang tersimpan di database.
      // Statistik ini tetap tersedia meskipun answers sudah NULL.
      const totalQuestions =
        Number(attempt.total_questions) || questionList.length || 0;

      const correct = Number(attempt.correct_count) || 0;

      // Skema GradeUp menggunakan wrong_count.
      // incorrect_count disediakan sebagai fallback untuk data lama.
      const incorrect =
        Number(attempt.wrong_count ?? attempt.incorrect_count) || 0;

      const unanswered = Math.max(
        0,
        totalQuestions - correct - incorrect
      );

      const score = Number(attempt.score) || 0;

      const durationUsed = Math.ceil(
        (Number(attempt.duration_seconds) || 0) / 60
      );

      setResult({
        id: String(attempt.id),
        examId: examId ? String(examId) : "",
        examTitle,
        date: attempt.created_at || new Date().toISOString(),
        score,
        correct,
        incorrect,
        unanswered,
        durationUsed,
        passed:
          attempt.is_passed !== null && attempt.is_passed !== undefined
            ? Boolean(attempt.is_passed)
            : score >= passingScore,
        userAnswers,
        answersExpired,
      });

      // 6. Pemicu otomatis pencapaian.
      if (attempt.user_id) {
        checkAndUnlockAchievements(attempt.user_id);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat rincian hasil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [resultId]);

  if (loading) return <PageSkeleton />;

  if (error || !result) {
    return (
      <ErrorState
        message={error || "Hasil tidak ditemukan"}
        onRetry={fetchData}
      />
    );
  }

  const secondaryColor = CHART_COLORS?.secondary || "#10b981";
  const dangerColor = CHART_COLORS?.danger || "#ef4444";
  const mutedColor = CHART_COLORS?.muted || "#6b7280";

  const rawPie = [
    { name: "Benar", value: result.correct, color: secondaryColor },
    { name: "Salah", value: result.incorrect, color: dangerColor },
    { name: "Kosong", value: result.unanswered, color: mutedColor },
  ].filter((item) => item.value > 0);

  const pieData =
    rawPie.length > 0
      ? rawPie
      : [{ name: "Kosong", value: 1, color: mutedColor }];

  return (
    <div className="relative isolate">
      <style>{PAGE_STYLES}</style>
      <PageDecor />

      <div className="relative space-y-6 pb-8">
        <Link
          to="/dashboard/results"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/10 bg-white/60 px-3 py-1.5 text-sm font-semibold text-muted-foreground backdrop-blur-md transition-colors hover:bg-emerald-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-emerald-400/10 dark:bg-slate-900/50 motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Hasil Belajar
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* RINGKASAN SKOR */}
          <Card
            className={cn(
              "relative overflow-hidden lg:sticky lg:top-24 lg:col-span-1 lg:self-start",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.12] via-transparent to-transparent" />
              <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(5,150,105,0.22)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]" />
              <div className="gu-drift absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/25 blur-3xl" />
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            </div>

            <CardContent className="relative flex flex-col items-center p-6 pt-6 text-center">
              <div className="relative h-48 w-48">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-4 rounded-full bg-emerald-400/10 blur-2xl"
                />

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold">
                    {result.score}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    dari 100
                  </span>
                </div>
              </div>

              <h1 className="mt-4 text-lg font-extrabold leading-snug">
                {result.examTitle}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(result.date)}
              </p>

              <div className="mt-3">
                {result.passed ? (
                  <Badge variant="success">Lulus</Badge>
                ) : (
                  <Badge variant="danger">Belum lulus</Badge>
                )}
              </div>

              <dl className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-50 p-3 dark:bg-emerald-500/10">
                  <dt className="text-xs text-muted-foreground">Benar</dt>
                  <dd className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {result.correct}
                  </dd>
                </div>

                <div className="rounded-xl border border-red-500/15 bg-red-50 p-3 dark:bg-red-500/10">
                  <dt className="text-xs text-muted-foreground">Salah</dt>
                  <dd className="text-lg font-extrabold text-red-500">
                    {result.incorrect}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">Kosong</dt>
                  <dd className="text-lg font-extrabold">
                    {result.unanswered}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.08] px-3 py-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Waktu terpakai {result.durationUsed} menit
              </p>
            </CardContent>
          </Card>

          {/* DETAIL JAWABAN DAN PEMBAHASAN */}
          <div className="space-y-4 lg:col-span-2">
            {result.answersExpired ? (
              <Card className="relative overflow-hidden border-blue-200 bg-blue-50/70 backdrop-blur-md dark:border-blue-900 dark:bg-blue-950/20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-0 h-36 w-64 -translate-x-1/2 rounded-full bg-blue-400/15 blur-3xl"
                />
                <CardContent className="relative flex flex-col items-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-1 ring-blue-500/20 dark:bg-blue-900/50 dark:text-blue-300">
                    <Info className="h-7 w-7" />
                  </div>

                  <h2 className="text-lg font-bold text-foreground">
                    Detail Evaluasi Tidak Tersedia
                  </h2>

                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    Detail jawaban dan pembahasan sudah melewati masa
                    penyimpanan. Nilai dan hasil ujian tetap tersimpan
                    dalam riwayat belajar Anda.
                  </p>

                  <Badge variant="outline" className="mt-5">
                    Riwayat nilai tetap tersimpan
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="review" className="w-full">
                <TabsList className={cn("backdrop-blur-md", GLASS)}>
                  <TabsTrigger value="review">
                    Tinjauan Jawaban
                  </TabsTrigger>

                  <TabsTrigger value="discussion">
                    <MessageSquareText className="mr-1 inline h-4 w-4" />
                    Pembahasan
                  </TabsTrigger>
                </TabsList>

                {/* TAB TINJAUAN JAWABAN */}
                <TabsContent value="review" className="space-y-4">
                  {questions.length === 0 && (
                    <EmptyState title="Tinjauan soal belum tersedia" />
                  )}

                  {questions.map((question, index) => {
                    const chosen =
                      result.userAnswers[question.id] ?? null;

                    const status =
                      chosen === null
                        ? "blank"
                        : chosen === question.correctIndex
                        ? "correct"
                        : "wrong";

                    return (
                      <Card
                        key={question.id || index}
                        className={cn(
                          "relative overflow-hidden transition-colors hover:border-emerald-500/30 motion-reduce:transition-none",
                          GLASS
                        )}
                      >
                        <div
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            status === "correct"
                              ? "bg-gradient-to-b from-emerald-400 to-teal-500"
                              : status === "wrong"
                              ? "bg-gradient-to-b from-red-400 to-rose-500"
                              : "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
                          )}
                        />

                        <CardHeader className="flex-row items-start gap-3 space-y-0 pl-6">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold",
                              status === "correct"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : status === "wrong"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {index + 1}
                          </span>

                          <CardTitle className="text-sm leading-relaxed">
                            {question.text}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-2 pl-6">
                          {(question.options || []).map((option, optionIndex) => {
                            const isCorrect =
                              optionIndex === question.correctIndex;
                            const isChosen = optionIndex === chosen;

                            return (
                              <div
                                key={optionIndex}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white/50 px-3.5 py-2.5 text-sm dark:border-emerald-400/10 dark:bg-slate-950/30",
                                  isCorrect &&
                                    "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/10",
                                  isChosen &&
                                    !isCorrect &&
                                    "border-red-400/60 bg-red-50 dark:bg-red-500/10"
                                )}
                              >
                                <span className="font-bold text-muted-foreground">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>

                                <span className="flex-1">{option}</span>

                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                )}

                                {isChosen && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            );
                          })}

                          {status === "blank" && (
                            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                              <MinusCircle className="h-3.5 w-3.5" />
                              Tidak dijawab
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* TAB PEMBAHASAN */}
                <TabsContent value="discussion" className="space-y-4">
                  {questions.length === 0 && (
                    <EmptyState title="Pembahasan belum tersedia" />
                  )}

                  {questions.map((question, index) => (
                    <Card
                      key={question.id || index}
                      className={cn(
                        "relative overflow-hidden transition-colors hover:border-emerald-500/30 motion-reduce:transition-none",
                        GLASS
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl"
                      />

                      <CardHeader className="relative flex-row items-start gap-3 space-y-0 pb-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-extrabold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                          {index + 1}
                        </span>

                        <CardTitle className="text-base font-semibold leading-relaxed text-foreground">
                          {question.text}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="relative space-y-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(question.options || []).map((option, optionIndex) => {
                            const isCorrect =
                              optionIndex === question.correctIndex;

                            return (
                              <div
                                key={optionIndex}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs transition-colors motion-reduce:transition-none",
                                  isCorrect
                                    ? "border-emerald-500/60 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                                    : "border-emerald-900/10 bg-white/40 text-muted-foreground dark:border-emerald-400/10 dark:bg-slate-950/30"
                                )}
                              >
                                <span className="font-bold">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>

                                <span className="flex-1">{option}</span>

                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="relative space-y-2 overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 dark:from-emerald-950/40 dark:to-teal-950/20">
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl"
                          />

                          <p className="relative flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            <MessageSquareText className="h-4 w-4" />
                            Pembahasan:
                          </p>

                          <p className="relative text-sm font-normal leading-relaxed text-foreground">
                            {question.explanation}
                          </p>

                          <div className="relative pt-1">
                            <Badge
                              variant="default"
                              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                            >
                              Kunci Jawaban:{" "}
                              {String.fromCharCode(
                                65 + question.correctIndex
                              )}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
