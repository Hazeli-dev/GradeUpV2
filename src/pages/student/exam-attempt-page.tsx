
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  Send,
  Timer,
  Loader2,
  Zap,
  CircleHelp,
  AlertCircle,
  LayoutGrid,
  Trophy,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

import { formatTimer } from "@/utils/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionItem {
  id: string;
  category: string;
  question_text: string;
  image_url: string | null;
  options: QuestionOption[];
}

interface ExamPackage {
  id: string;
  title: string;
  category: string;
  duration: number;
  passing_score: number;
}

interface StartExamResponse {
  attempt_id: string;
  duration: number;
  started_at: string;
  expires_at: string;
  questions: QuestionItem[];
  saved_answers: Record<string, string | null>;
  resumed: boolean;
}

interface SubmitExamResponse {
  attempt_id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  total_questions: number;
  is_passed: boolean;
  xp_earned: number;
}

type LocalAnswers = Record<string, number>;
type ServerAnswers = Record<string, string | null>;

export default function ExamAttemptPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<LocalAnswers>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [finalScore, setFinalScore] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [finalWrong, setFinalWrong] = useState(0);
  const [finalUnanswered, setFinalUnanswered] = useState(0);
  const [finalPassed, setFinalPassed] = useState(false);

  const submittingRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Mengubah pilihan lokal menjadi ID pilihan untuk server.
  const toServerAnswers = useCallback(
    (localAnswers: LocalAnswers): ServerAnswers => {
      const result: ServerAnswers = {};

      questions.forEach((question) => {
        const selectedIndex = localAnswers[question.id];

        if (
          selectedIndex === undefined ||
          !question.options[selectedIndex]
        ) {
          result[question.id] = null;
          return;
        }

        result[question.id] = question.options[selectedIndex].id;
      });

      return result;
    },
    [questions]
  );

  // Memulihkan jawaban yang sebelumnya tersimpan.
  const restoreLocalAnswers = useCallback(
    (
      questionList: QuestionItem[],
      savedAnswers: Record<string, string | null> | null
    ): LocalAnswers => {
      const restored: LocalAnswers = {};

      if (!savedAnswers) return restored;

      questionList.forEach((question) => {
        const savedOptionId = savedAnswers[question.id];

        if (!savedOptionId) return;

        const selectedIndex = question.options.findIndex(
          (option) =>
            option.id.toUpperCase() === savedOptionId.toUpperCase()
        );

        if (selectedIndex >= 0) {
          restored[question.id] = selectedIndex;
        }
      });

      return restored;
    },
    []
  );

  // 1. Memulai atau melanjutkan sesi ujian.
  const fetchData = useCallback(async () => {
    if (!examId) {
      setError("ID ujian tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    setSubmitted(false);
    setSubmitting(false);
    submittingRef.current = false;

    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setCurrent(0);
    setFlagged(new Set());
    setSecondsLeft(null);
    setExpiresAt(null);
    setFinalPassed(false);

    saveQueueRef.current = Promise.resolve();

    try {
      const { data: examData, error: examError } = await supabase
        .from("exam_packages")
        .select("id, title, category, passing_score")
        .eq("id", examId)
        .single();

      if (examError) throw examError;
      if (!examData) throw new Error("Paket ujian tidak ditemukan.");

      const { data: sessionData, error: sessionError } =
        await supabase.rpc("start_exam_secure", {
          p_exam_id: examId,
        });

      if (sessionError) throw sessionError;
      if (!sessionData) {
        throw new Error("Server tidak mengembalikan sesi ujian.");
      }

      const session = sessionData as unknown as StartExamResponse;

      if (
        !session.attempt_id ||
        !Array.isArray(session.questions) ||
        session.questions.length === 0
      ) {
        throw new Error("Data sesi ujian tidak lengkap.");
      }

      if (!session.expires_at) {
        throw new Error("Waktu kedaluwarsa ujian tidak tersedia.");
      }

      const expiryTimestamp = new Date(session.expires_at).getTime();

      if (Number.isNaN(expiryTimestamp)) {
        throw new Error("Format waktu ujian tidak valid.");
      }

      const normalizedQuestions: QuestionItem[] = session.questions.map(
        (question) => {
          let parsedOptions: unknown = question.options;

          if (typeof parsedOptions === "string") {
            try {
              parsedOptions = JSON.parse(parsedOptions);
            } catch {
              parsedOptions = [];
            }
          }

          const options = Array.isArray(parsedOptions)
            ? parsedOptions
            : [];

          const rawImageUrl =
            typeof question.image_url === "string"
              ? question.image_url.trim()
              : "";

          return {
            id: String(question.id),
            category: String(question.category || ""),
            question_text: String(question.question_text || ""),
            image_url: rawImageUrl || null,
            options: options.map((option: any, index: number) => ({
              id: String(
                option?.id || String.fromCharCode(65 + index)
              ).toUpperCase(),
              text: String(option?.text ?? option ?? ""),
            })),
          };
        }
      );

      if (
        normalizedQuestions.some(
          (question) =>
            !question.id ||
            !question.question_text ||
            question.options.length === 0
        )
      ) {
        throw new Error("Terdapat data soal yang tidak valid.");
      }

      const restoredAnswers = restoreLocalAnswers(
        normalizedQuestions,
        session.saved_answers || {}
      );

      const normalizedExam: ExamPackage = {
        id: examData.id,
        title: examData.title,
        category: examData.category || "",
        duration: Number(session.duration) || 30,
        passing_score: Number(examData.passing_score ?? 70),
      };

      setExam(normalizedExam);
      setAttemptId(session.attempt_id);
      setQuestions(normalizedQuestions);
      setAnswers(restoredAnswers);
      setExpiresAt(session.expires_at);

      const remainingSeconds = Math.max(
        0,
        Math.ceil((expiryTimestamp - Date.now()) / 1000)
      );

      setSecondsLeft(remainingSeconds);

      if (session.resumed) {
        toast.info("Sesi ujian sebelumnya berhasil dipulihkan.");
      }
    } catch (err: unknown) {
      console.error("Fetch exam error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat ujian dari Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, [examId, restoreLocalAnswers]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // 2. Antrean penyimpanan jawaban.
  const queueSaveProgress = useCallback(
    (localAnswers: LocalAnswers): Promise<void> => {
      if (!attemptId) {
        return Promise.reject(new Error("Sesi ujian belum tersedia."));
      }

      const serverAnswers = toServerAnswers(localAnswers);

      const task = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const { error: saveError } = await supabase.rpc(
            "save_exam_session_progress_secure",
            {
              p_attempt_id: attemptId,
              p_answers: serverAnswers,
            }
          );

          if (saveError) throw saveError;
        });

      saveQueueRef.current = task;
      return task;
    },
    [attemptId, toServerAnswers]
  );

  // 3. Memilih jawaban.
  const handleAnswerSelect = useCallback(
    (questionId: string, selectedIndex: number) => {
      const nextAnswers = {
        ...answers,
        [questionId]: selectedIndex,
      };

      setAnswers(nextAnswers);

      void queueSaveProgress(nextAnswers).catch((saveError: unknown) => {
        console.error("Save progress error:", saveError);
        toast.error("Jawaban belum berhasil tersimpan. Silakan coba lagi.");
      });
    },
    [answers, queueSaveProgress]
  );

  // 4. Mengumpulkan ujian.
  const submit = useCallback(
    async (auto = false) => {
      if (
        submittingRef.current ||
        submitted ||
        !attemptId ||
        questions.length === 0
      ) {
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);

      try {
        const serverAnswers = toServerAnswers(answers);

        if (!auto) {
          try {
            await queueSaveProgress(answers);
          } catch (saveError) {
            console.warn("Final progress save warning:", saveError);
          }
        } else {
          try {
            await saveQueueRef.current;
          } catch (saveError) {
            console.warn("Pending progress save warning:", saveError);
          }
        }

        const { data, error: submitError } = await supabase.rpc(
          "submit_exam_session_secure",
          {
            p_attempt_id: attemptId,
            p_answers: serverAnswers,
          }
        );

        if (submitError) throw submitError;

        const result = (
          Array.isArray(data) ? data[0] : data
        ) as SubmitExamResponse | null;

        if (!result) {
          throw new Error("Server tidak mengembalikan hasil ujian.");
        }

        setFinalScore(Number(result.score) || 0);
        setFinalCorrect(Number(result.correct_count) || 0);
        setFinalWrong(Number(result.wrong_count) || 0);
        setFinalUnanswered(Number(result.unanswered_count) || 0);
        setEarnedXp(Number(result.xp_earned) || 0);
        setFinalPassed(Boolean(result.is_passed));

        setSubmitted(true);
        setConfirmOpen(false);

        toast.success(
          auto
            ? "Waktu habis, ujian otomatis dikumpulkan!"
            : "Ujian berhasil dikumpulkan!"
        );
      } catch (err: unknown) {
        console.error("Submit exam error:", err);

        toast.error(
          "Gagal mengumpulkan ujian: " +
            (err instanceof Error ? err.message : "Terjadi kesalahan.")
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      attemptId,
      answers,
      questions,
      submitted,
      toServerAnswers,
      queueSaveProgress,
    ]
  );

  // 5. Timer mengikuti waktu kedaluwarsa server.
  useEffect(() => {
    if (!expiresAt || submitted || submitting) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) / 1000
        )
      );

      setSecondsLeft(remaining);
    };

    updateTimer();

    const timerId = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timerId);
  }, [expiresAt, submitted, submitting]);

  // 6. Otomatis mengumpulkan saat waktu habis.
  useEffect(() => {
    if (
      secondsLeft === 0 &&
      !submitted &&
      !submitting &&
      attemptId
    ) {
      void submit(true);
    }
  }, [secondsLeft, submitted, submitting, attemptId, submit]);

  // 7. Statistik jawaban.
  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) => answers[question.id] !== undefined
      ).length,
    [questions, answers]
  );

  const unanswered = Math.max(0, questions.length - answeredCount);
  const progressPercentage =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const currentQuestion = questions[current];
  const timeLow = (secondsLeft ?? 0) <= 60;
  const timeCritical = (secondsLeft ?? 0) <= 15;

  const toggleFlag = () => {
    if (!currentQuestion) return;

    setFlagged((previous) => {
      const next = new Set(previous);

      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }

      return next;
    });
  };

  // 8. Loading.
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <PageSkeleton />
      </div>
    );
  }

  // 9. Error.
  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!exam || questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <EmptyState
          title="Soal tidak tersedia"
          description="Paket ujian ini belum memiliki soal yang dapat dikerjakan."
          action={
            <Button onClick={() => navigate("/dashboard/exams")}>
              Kembali ke Ujian
            </Button>
          }
        />
      </div>
    );
  }

  // 10. Halaman hasil.
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-2xl overflow-hidden border-border shadow-xl">
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white/15 shadow-lg">
              {finalPassed ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <CheckCircle2 className="h-10 w-10" />
              )}
            </div>

            <Badge className="border-white/25 bg-white/15 text-white hover:bg-white/20">
              Ujian selesai
            </Badge>

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              {finalPassed
                ? "Selamat, kamu berhasil!"
                : "Ujian berhasil dikumpulkan"}
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Hasil pengerjaan untuk <strong>{exam.title}</strong> telah
              diproses dan disimpan.
            </p>
          </div>

          <CardContent className="space-y-6 p-5 sm:p-8">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Skor akhir
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
                  {finalScore}
                  <span className="text-base font-semibold text-muted-foreground">
                    {" "}/ 100
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  XP diperoleh
                </p>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  <Zap className="h-6 w-6 fill-current" />
                  +{earnedXp}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 text-xs text-muted-foreground">Benar</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {finalCorrect}
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-3 text-center">
                <AlertCircle className="mx-auto h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="mt-2 text-xs text-muted-foreground">Salah</p>
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400">
                  {finalWrong}
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3 text-center">
                <CircleHelp className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Kosong</p>
                <p className="text-xl font-extrabold text-foreground">
                  {finalUnanswered}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">
                  Status kelulusan
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Batas nilai kelulusan: {exam.passing_score}
                </p>
              </div>

              <Badge
                className={cn(
                  "w-fit px-3 py-1.5",
                  finalPassed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                )}
              >
                {finalPassed ? "Lulus" : "Belum mencapai batas"}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/dashboard/exams">Daftar Paket Ujian</Link>
              </Button>

              <Button
                className="flex-1 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                asChild
              >
                <Link to="/dashboard/results">Lihat Hasil Belajar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 11. Tampilan utama CBT.
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header ujian */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-sm backdrop-blur-xl">
        <div className="container flex min-h-[68px] items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Logo compact />

            <div className="min-w-0 border-l border-border pl-3 sm:pl-4">
              <p className="max-w-[180px] truncate text-sm font-bold text-foreground sm:max-w-md">
                {exam.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">{exam.category}</span>
                <span className="hidden sm:inline">•</span>
                <span>
                  Soal {current + 1} dari {questions.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className={cn(
                "flex min-w-[112px] items-center justify-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-extrabold tabular-nums transition-colors sm:min-w-[132px] sm:px-4",
                timeCritical
                  ? "animate-pulse border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400"
                  : timeLow
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-border bg-card text-foreground"
              )}
              role="timer"
              aria-label="Sisa waktu"
            >
              <Timer className="h-4 w-4" />
              {formatTimer(secondsLeft ?? 0)}
            </div>

            <ThemeToggle />

            <Button
              onClick={() => setConfirmOpen(true)}
              className="hidden bg-primary font-bold text-primary-foreground shadow-sm sm:inline-flex"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Kumpulkan
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="h-1.5 bg-muted">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      <main className="container grid gap-5 py-5 sm:gap-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_310px]">
        {/* Area soal */}
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lembar pengerjaan
              </p>
              <h1 className="mt-1 text-lg font-extrabold tracking-tight sm:text-xl">
                Soal nomor {current + 1}
              </h1>
            </div>

            <Badge
              variant="outline"
              className="border-border bg-card px-3 py-1 text-muted-foreground"
            >
              {currentQuestion.category || exam.category || "Umum"}
            </Badge>
          </div>

          <Card className="overflow-hidden border-border shadow-sm">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-muted/20 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                  {current + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Pertanyaan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pilih satu jawaban yang paling tepat
                  </p>
                </div>
              </div>

              <Button
                variant={flagged.has(currentQuestion.id) ? "soft" : "outline"}
                size="sm"
                onClick={toggleFlag}
                aria-pressed={flagged.has(currentQuestion.id)}
                className={cn(
                  "shrink-0",
                  flagged.has(currentQuestion.id) &&
                    "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                )}
              >
                <Flag
                  className={cn(
                    "mr-1.5 h-4 w-4",
                    flagged.has(currentQuestion.id) && "fill-current"
                  )}
                />
                <span className="hidden sm:inline">
                  {flagged.has(currentQuestion.id)
                    ? "Ditandai"
                    : "Tandai ragu"}
                </span>
                <span className="sm:hidden">
                  {flagged.has(currentQuestion.id) ? "Ditandai" : "Ragu"}
                </span>
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
              <h2 className="whitespace-pre-wrap text-base font-semibold leading-[1.85] text-foreground sm:text-lg">
                {currentQuestion.question_text}
              </h2>

              {/* Gambar soal */}
              {currentQuestion.image_url && (
                <QuestionImage
                  key={currentQuestion.id}
                  src={currentQuestion.image_url}
                />
              )}

              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="Pilihan jawaban"
              >
                {currentQuestion.options.map((option, index) => {
                  const selected = answers[currentQuestion.id] === index;

                  return (
                    <button
                      key={option.id || index}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        handleAnswerSelect(currentQuestion.id, index)
                      }
                      disabled={submitting}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 sm:items-center sm:gap-4 sm:p-4",
                        selected
                          ? "border-primary bg-primary/[0.07] shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition-all",
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}
                      >
                        {option.id || String.fromCharCode(65 + index)}
                      </span>

                      <span
                        className={cn(
                          "flex-1 pt-1 text-sm leading-relaxed sm:pt-0 sm:text-base",
                          selected
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/85"
                        )}
                      >
                        {option.text}
                      </span>

                      {selected && (
                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary sm:mt-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={current === 0 || submitting}
                  onClick={() => setCurrent((previous) => previous - 1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Sebelumnya
                </Button>

                {current < questions.length - 1 ? (
                  <Button
                    className="w-full font-bold sm:w-auto"
                    onClick={() => setCurrent((previous) => previous + 1)}
                    disabled={submitting}
                  >
                    Berikutnya
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:w-auto"
                    onClick={() => setConfirmOpen(true)}
                    disabled={submitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Selesaikan Ujian
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigasi ringkas untuk layar kecil */}
          <Card className="border-border lg:hidden">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">Navigasi soal</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {answeredCount}/{questions.length} dijawab
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {questions.map((item, index) => {
                  const done = answers[item.id] !== undefined;
                  const isFlag = flagged.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrent(index)}
                      disabled={submitting}
                      aria-label={`Soal ${index + 1}${
                        done ? ", sudah dijawab" : ", belum dijawab"
                      }${isFlag ? ", ditandai" : ""}`}
                      aria-current={index === current ? "step" : undefined}
                      className={cn(
                        "relative flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all",
                        index === current &&
                          "border-primary bg-primary text-primary-foreground ring-2 ring-primary/20",
                        index !== current &&
                          done &&
                          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        index !== current &&
                          !done &&
                          "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {index + 1}
                      {isFlag && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Panel samping desktop */}
        <aside className="hidden space-y-4 lg:block">
          <Card className="sticky top-24 overflow-hidden border-border shadow-sm">
            <div className="border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Navigasi Soal</CardTitle>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih nomor untuk berpindah soal.
              </p>
            </div>

            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((item, index) => {
                  const done = answers[item.id] !== undefined;
                  const isFlag = flagged.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrent(index)}
                      disabled={submitting}
                      aria-label={`Soal ${index + 1}${
                        done ? ", sudah dijawab" : ", belum dijawab"
                      }${isFlag ? ", ditandai" : ""}`}
                      aria-current={index === current ? "step" : undefined}
                      className={cn(
                        "relative flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-all",
                        index === current &&
                          "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20",
                        index !== current &&
                          done &&
                          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300",
                        index !== current &&
                          !done &&
                          "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {index + 1}
                      {isFlag && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-card" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 border-t border-border pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progres jawaban</span>
                  <span className="font-bold text-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <p className="text-xs text-muted-foreground">Dijawab</p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                      {answeredCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Belum dijawab
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-foreground">
                      {unanswered}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <Flag className="h-3.5 w-3.5" />
                    Soal ditandai
                  </span>
                  <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                    {flagged.size}
                  </span>
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
              >
                <Send className="mr-2 h-4 w-4" />
                Kumpulkan Ujian
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Pastikan jawaban sudah diperiksa sebelum mengumpulkan ujian.
              </p>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Konfirmasi pengumpulan */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Kumpulkan ujian?"
        description={
          unanswered > 0
            ? `Masih ada ${unanswered} soal yang belum dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah.`
            : "Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah."
        }
        confirmLabel={submitting ? "Menyimpan..." : "Ya, kumpulkan"}
        cancelLabel="Kembali mengerjakan"
        onConfirm={() => submit(false)}
      />
    </div>
  );
}

// Komponen gambar terpisah agar kegagalan gambar tidak mengganggu halaman CBT.
function QuestionImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex min-h-24 items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        <ImageOff className="h-5 w-5 shrink-0" />
        <span>Gambar soal tidak dapat dimuat.</span>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-muted/20 p-2 sm:p-3">
      <img
        src={src}
        alt="Gambar pendukung soal"
        loading="eager"
        onError={() => setFailed(true)}
        className="mx-auto max-h-[520px] w-auto max-w-full rounded-xl object-contain"
      />
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        Gambar pendukung soal
      </figcaption>
    </figure>
  );
}
