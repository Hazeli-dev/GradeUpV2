import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ArrowLeft, CheckCircle2, Clock, MessageSquareText, MinusCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { formatDate } from "@/utils/format";
import { CHART_COLORS } from "@/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
// IMPORT SERVICE PENCAPAIAN (LANGKAH 2)
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
}

export default function ResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();

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
      // 1. Fetch Attempt Record
      const { data: attempt, error: errAttempt } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", resultId)
        .maybeSingle();

      if (errAttempt) throw new Error(errAttempt.message);
      if (!attempt) throw new Error("Data hasil ujian tidak ditemukan.");

      const examId = attempt.exam_package_id || attempt.exam_id;

      // 2. Fetch Exam Package Title & Passing Score
      let examTitle = "Paket Ujian";
      let passingScore = 60;

      if (examId) {
        const { data: pkg } = await supabase
          .from("exam_packages")
          .select("title, passing_score")
          .eq("id", examId)
          .maybeSingle();

        if (pkg) {
          examTitle = pkg.title || examTitle;
          passingScore = pkg.passing_score ?? 60;
        }
      }

      // 3. Fetch Questions
      let qList: QuestionItem[] = [];
      if (examId) {
        const { data: qData } = await supabase
          .from("questions")
          .select("*")
          .eq("exam_package_id", examId);

        if (qData) {
          qList = qData.map((q: any) => {
            let rawText = q.question_text || q.text || "Pertanyaan";
            if (typeof rawText === "object" && rawText !== null) {
              rawText = rawText.text || rawText.question || JSON.stringify(rawText);
            }

            let rawExp = q.explanation || "Belum ada pembahasan.";
            if (typeof rawExp === "object" && rawExp !== null) {
              rawExp = rawExp.text || JSON.stringify(rawExp);
            }

            let opts: string[] = [];
            if (Array.isArray(q.options)) {
              opts = q.options.map((o: any) => (typeof o === "object" ? o.text || String(o) : String(o)));
            } else if (typeof q.options === "string") {
              try {
                const parsed = JSON.parse(q.options);
                opts = Array.isArray(parsed)
                  ? parsed.map((o: any) => (typeof o === "object" ? o.text || String(o) : String(o)))
                  : [];
              } catch {
                opts = [];
              }
            }

            return {
              id: String(q.id),
              text: String(rawText),
              options: opts,
              correctIndex: Number(q.correct_answer ?? q.correctIndex) || 0,
              explanation: String(rawExp),
            };
          });
        }
      }

      setQuestions(qList);

      const totalQ = qList.length || Number(attempt.total_questions) || 0;
      const correct = Number(attempt.correct_count) || 0;
      const incorrect = Number(attempt.incorrect_count) || 0;
      const unanswered = Math.max(0, totalQ - (correct + incorrect));
      const score = Number(attempt.score) || 0;

      let userAnswers: Record<string, number> = {};
      if (attempt.answers && typeof attempt.answers === "object") {
        userAnswers = attempt.answers;
      }

      setResult({
        id: String(attempt.id),
        examId: examId ? String(examId) : "",
        examTitle,
        date: attempt.created_at || new Date().toISOString(),
        score,
        correct,
        incorrect,
        unanswered,
        durationUsed: Math.ceil((Number(attempt.duration_seconds) || 0) / 60),
        passed: score >= passingScore,
        userAnswers,
      });

      // PEMICU AUTOMATIS BADGE UNLOCK (LANGKAH 2)
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
    return <ErrorState message={error || "Hasil tidak ditemukan"} onRetry={fetchData} />;
  }

  const secondaryColor = CHART_COLORS?.secondary || "#10b981";
  const dangerColor = CHART_COLORS?.danger || "#ef4444";
  const mutedColor = CHART_COLORS?.muted || "#6b7280";

  const rawPie = [
    { name: "Benar", value: result.correct, color: secondaryColor },
    { name: "Salah", value: result.incorrect, color: dangerColor },
    { name: "Kosong", value: result.unanswered, color: mutedColor },
  ].filter((d) => d.value > 0);

  const pieData = rawPie.length > 0 ? rawPie : [{ name: "Kosong", value: 1, color: mutedColor }];

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/results"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Hasil Belajar
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ringkasan Skor */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 pt-6 text-center">
            <div className="relative h-48 w-48">
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold">{result.score}</span>
                <span className="text-xs text-muted-foreground">dari 100</span>
              </div>
            </div>
            <h1 className="mt-4 text-lg font-extrabold leading-snug">{result.examTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(result.date)}</p>
            <div className="mt-3">
              {result.passed ? (
                <Badge variant="success">Lulus</Badge>
              ) : (
                <Badge variant="danger">Belum lulus</Badge>
              )}
            </div>
            <dl className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                <dt className="text-xs text-muted-foreground">Benar</dt>
                <dd className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {result.correct}
                </dd>
              </div>
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                <dt className="text-xs text-muted-foreground">Salah</dt>
                <dd className="text-lg font-extrabold text-red-500">{result.incorrect}</dd>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">Kosong</dt>
                <dd className="text-lg font-extrabold">{result.unanswered}</dd>
              </div>
            </dl>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Waktu terpakai {result.durationUsed} menit
            </p>
          </CardContent>
        </Card>

        {/* Tab Tinjauan Jawaban & Pembahasan */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="review">
            <TabsList>
              <TabsTrigger value="review">Tinjauan Jawaban</TabsTrigger>
              <TabsTrigger value="discussion">
                <MessageSquareText className="h-4 w-4 mr-1 inline" /> Pembahasan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="space-y-4">
              {questions.length === 0 && <EmptyState title="Tinjauan soal belum tersedia" />}
              {questions.map((q, i) => {
                const chosen = result.userAnswers[q.id] ?? null;
                const status =
                  chosen === null ? "blank" : chosen === q.correctIndex ? "correct" : "wrong";

                return (
                  <Card key={q.id || i}>
                    <CardHeader className="flex-row items-start gap-3 space-y-0">
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
                        {i + 1}
                      </span>
                      <CardTitle className="text-sm leading-relaxed">{q.text}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(q.options || []).map((o: string, oi: number) => {
                        const isCorrect = oi === q.correctIndex;
                        const isChosen = oi === chosen;
                        return (
                          <div
                            key={oi}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                              isCorrect && "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/10",
                              isChosen && !isCorrect && "border-red-400/60 bg-red-50 dark:bg-red-500/10"
                            )}
                          >
                            <span className="font-bold text-muted-foreground">
                              {String.fromCharCode(65 + oi)}.
                            </span>
                            <span className="flex-1">{o}</span>
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
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <MinusCircle className="h-3.5 w-3.5" /> Tidak dijawab
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* TAB PEMBAHASAN */}
            <TabsContent value="discussion" className="space-y-4">
              {questions.length === 0 && <EmptyState title="Pembahasan belum tersedia" />}
              {questions.map((q, i) => (
                <Card key={q.id || i}>
                  <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-extrabold text-emerald-400">
                      {i + 1}
                    </span>
                    <CardTitle className="text-base font-semibold leading-relaxed text-foreground">
                      {q.text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* List Pilihan Jawaban */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(q.options || []).map((o: string, oi: number) => {
                        const isCorrect = oi === q.correctIndex;
                        return (
                          <div
                            key={oi}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs transition-colors",
                              isCorrect
                                ? "border-emerald-500/60 bg-emerald-500/10 font-semibold text-emerald-300"
                                : "border-border/60 bg-muted/20 text-muted-foreground"
                            )}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{o}</span>
                            {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Box Pembahasan */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-2">
                      <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                        <MessageSquareText className="h-4 w-4" /> Pembahasan:
                      </p>
                      <p className="leading-relaxed text-sm text-slate-100 font-normal">
                        {q.explanation}
                      </p>
                      <div className="pt-1">
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                          Kunci Jawaban: {String.fromCharCode(65 + q.correctIndex)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
