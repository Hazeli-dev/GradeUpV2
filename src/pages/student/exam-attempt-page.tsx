
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
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Mencegah pengumpulan ganda.
  const submittingRef = useRef(false);

  // Menjaga urutan penyimpanan jawaban agar jawaban terbaru
  // tidak tertimpa permintaan penyimpanan yang lebih lama.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Mengubah indeks pilihan lokal menjadi ID pilihan A/B/C/D.
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

        result[question.id] =
          question.options[selectedIndex].id;
      });

      return result;
    },
    [questions]
  );

  // Memulihkan jawaban dari database ke indeks pilihan lokal.
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
            option.id.toUpperCase() ===
            savedOptionId.toUpperCase()
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

    saveQueueRef.current = Promise.resolve();

    try {
      // Ambil informasi paket.
      const { data: examData, error: examError } = await supabase
        .from("exam_packages")
        .select("id, title, category, passing_score")
        .eq("id", examId)
        .single();

      if (examError) throw examError;

      if (!examData) {
        throw new Error("Paket ujian tidak ditemukan.");
      }

      // Mulai atau lanjutkan sesi melalui RPC.
      const { data: sessionData, error: sessionError } =
        await supabase.rpc("start_exam_secure", {
          p_exam_id: examId,
        });

      if (sessionError) throw sessionError;

      if (!sessionData) {
        throw new Error("Server tidak mengembalikan sesi ujian.");
      }

      const session =
        sessionData as unknown as StartExamResponse;

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

      const expiryTimestamp = new Date(
        session.expires_at
      ).getTime();

      if (Number.isNaN(expiryTimestamp)) {
        throw new Error("Format waktu ujian tidak valid.");
      }

      // Normalisasi soal yang dikirim RPC.
      const normalizedQuestions: QuestionItem[] =
        session.questions.map((question) => {
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

          return {
            id: String(question.id),
            category: String(question.category || ""),
            question_text: String(
              question.question_text || ""
            ),
            options: options.map(
              (option: any, index: number) => ({
                id: String(
                  option?.id ||
                    String.fromCharCode(65 + index)
                ).toUpperCase(),
                text: String(option?.text ?? option ?? ""),
              })
            ),
          };
        });

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

      // Pulihkan jawaban yang sebelumnya tersimpan.
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

      // Timer mengikuti waktu kedaluwarsa server.
      const remainingSeconds = Math.max(
        0,
        Math.ceil(
          (expiryTimestamp - Date.now()) / 1000
        )
      );

      setSecondsLeft(remainingSeconds);

      if (session.resumed) {
        toast.info(
          "Sesi ujian sebelumnya berhasil dipulihkan."
        );
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

  // 2. Simpan progres jawaban melalui RPC.
  const queueSaveProgress = useCallback(
    (localAnswers: LocalAnswers): Promise<void> => {
      if (!attemptId) {
        return Promise.reject(
          new Error("Sesi ujian belum tersedia.")
        );
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

  // 3. Pilih jawaban dan simpan ke server.
  const handleAnswerSelect = useCallback(
    (questionId: string, selectedIndex: number) => {
      const nextAnswers = {
        ...answers,
        [questionId]: selectedIndex,
      };

      setAnswers(nextAnswers);

      void queueSaveProgress(nextAnswers).catch(
        (saveError: unknown) => {
          console.error(
            "Save progress error:",
            saveError
          );
        }
      );
    },
    [answers, queueSaveProgress]
  );

  // 4. Submit ujian melalui RPC server.
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

        // Untuk submit manual, upayakan simpan jawaban terbaru.
        // Jika tenggat sudah terlewati, server akan menggunakan
        // progres terakhir yang sudah tersimpan.
        if (!auto) {
          try {
            await queueSaveProgress(answers);
          } catch (saveError) {
            console.warn(
              "Final progress save warning:",
              saveError
            );
          }
        } else {
          // Tunggu permintaan penyimpanan sebelumnya selesai.
          // Ini menghindari submit mendahului penyimpanan jawaban.
          try {
            await saveQueueRef.current;
          } catch (saveError) {
            console.warn(
              "Pending progress save warning:",
              saveError
            );
          }
        }

        const { data, error: submitError } =
          await supabase.rpc(
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
          throw new Error(
            "Server tidak mengembalikan hasil ujian."
          );
        }

        // Semua nilai berasal dari server.
        setFinalScore(Number(result.score) || 0);
        setFinalCorrect(
          Number(result.correct_count) || 0
        );
        setFinalWrong(
          Number(result.wrong_count) || 0
        );
        setFinalUnanswered(
          Number(result.unanswered_count) || 0
        );
        setEarnedXp(Number(result.xp_earned) || 0);

        setSubmitted(true);
        setConfirmOpen(false);

        toast.success(
          auto
            ? "Waktu habis, ujian otomatis dikumpulkan!"
            : "Ujian berhasil dikumpulkan! Hasil dapat dilihat di menu Hasil Belajar."
        );
      } catch (err: unknown) {
        console.error("Submit exam error:", err);

        toast.error(
          "Gagal mengumpulkan ujian: " +
            (err instanceof Error
              ? err.message
              : "Terjadi kesalahan.")
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

  // 5. Timer berdasarkan expires_at dari server.
  useEffect(() => {
    if (
      !expiresAt ||
      submitted ||
      submitting
    ) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) /
            1000
        )
      );

      setSecondsLeft(remaining);
    };

    updateTimer();

    const timerId = window.setInterval(
      updateTimer,
      1000
    );

    return () => window.clearInterval(timerId);
  }, [expiresAt, submitted, submitting]);

  // 6. Otomatis kumpulkan ketika timer mencapai nol.
  useEffect(() => {
    if (
      secondsLeft === 0 &&
      !submitted &&
      !submitting &&
      attemptId
    ) {
      void submit(true);
    }
  }, [
    secondsLeft,
    submitted,
    submitting,
    attemptId,
    submit,
  ]);

  // 7. Statistik jawaban.
  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          answers[question.id] !== undefined
      ).length,
    [questions, answers]
  );

  const unanswered = Math.max(
    0,
    questions.length - answeredCount
  );

  // 8. Kondisi loading.
  if (loading) {
    return (
      <div className="container py-10">
        <PageSkeleton />
      </div>
    );
  }

  // 9. Kondisi error.
  if (error) {
    return (
      <div className="container py-10">
        <ErrorState
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Soal tidak tersedia"
          description="Paket ujian ini belum memiliki soal yang dapat dikerjakan."
          action={
            <Button
              onClick={() =>
                navigate("/dashboard/exams")
              }
            >
              Kembali ke Ujian
            </Button>
          }
        />
      </div>
    );
  }

  // 10. Tampilan hasil setelah ujian dikumpulkan.
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-2 border-emerald-500/20 text-center shadow-lg">
          <CardContent className="space-y-5 p-8 pt-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </span>

            <h1 className="text-2xl font-extrabold">
              Ujian Berhasil Dikumpulkan
            </h1>

            <p className="text-sm text-muted-foreground">
              Anda menjawab{" "}
              {finalCorrect + finalWrong} dari{" "}
              {questions.length} soal pada "{exam.title}".
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  Skor Akhir
                </p>
                <p className="text-2xl font-black text-primary">
                  {finalScore} / 100
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  XP Didapatkan
                </p>

                <p className="flex items-center justify-center gap-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-5 w-5 fill-current" />
                  +{earnedXp}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Benar
                </p>
                <p className="text-lg font-bold text-emerald-600">
                  {finalCorrect}
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Salah
                </p>
                <p className="text-lg font-bold text-red-500">
                  {finalWrong}
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  Kosong
                </p>
                <p className="text-lg font-bold">
                  {finalUnanswered}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <Link to="/dashboard/exams">
                  Daftar Paket Ujian
                </Link>
              </Button>

              <Button
                asChild
                className="bg-emerald-600 font-bold hover:bg-emerald-700"
              >
                <Link to="/dashboard/results">
                  Lihat Hasil Belajar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 11. Tampilan CBT.
  const q = questions[current];
  const timeLow = (secondsLeft ?? 0) <= 60;

  const toggleFlag = () => {
    setFlagged((previous) => {
      const next = new Set(previous);

      if (next.has(q.id)) {
        next.delete(q.id);
      } else {
        next.add(q.id);
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Logo compact />

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {exam.title}
              </p>

              <p className="text-xs text-muted-foreground">
                Soal {current + 1} dari {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-sm font-bold tabular-nums",
                timeLow
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "bg-card"
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
              className="hidden sm:inline-flex"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send /> Kumpulkan
                </>
              )}
            </Button>
          </div>
        </div>

        <Progress
          value={
            (answeredCount / questions.length) * 100
          }
          className="h-1 rounded-none"
        />
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Badge>
                  {q.category || exam.category}
                </Badge>
              </div>

              <Button
                variant={
                  flagged.has(q.id) ? "soft" : "ghost"
                }
                size="sm"
                onClick={toggleFlag}
                aria-pressed={flagged.has(q.id)}
              >
                <Flag />
                {flagged.has(q.id)
                  ? "Ditandai"
                  : "Tandai ragu"}
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              <h2 className="text-lg font-bold leading-relaxed sm:text-xl">
                {q.question_text}
              </h2>

              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="Pilihan jawaban"
              >
                {q.options?.map((option, index) => {
                  const selected =
                    answers[q.id] === index;

                  return (
                    <button
                      key={option.id || index}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        handleAnswerSelect(q.id, index)
                      }
                      disabled={submitting}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
                        selected
                          ? "border-primary bg-soft/70 shadow-soft"
                          : "border-border hover:border-primary/40 hover:bg-muted/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition-colors",
                          selected
                            ? "bg-brand-gradient text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {option.id ||
                          String.fromCharCode(65 + index)}
                      </span>

                      <span className="text-sm font-medium sm:text-base">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-5">
                <Button
                  variant="outline"
                  disabled={current === 0 || submitting}
                  onClick={() =>
                    setCurrent((previous) => previous - 1)
                  }
                >
                  <ArrowLeft /> Sebelumnya
                </Button>

                {current < questions.length - 1 ? (
                  <Button
                    onClick={() =>
                      setCurrent((previous) => previous + 1)
                    }
                    disabled={submitting}
                  >
                    Berikutnya <ArrowRight />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={submitting}
                  >
                    <Send /> Kumpulkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="lg:sticky lg:top-28">
            <CardHeader>
              <CardTitle>Navigasi Soal</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((item, index) => {
                  const done =
                    answers[item.id] !== undefined;

                  const isFlag = flagged.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrent(index)}
                      disabled={submitting}
                      aria-label={`Soal ${index + 1}${
                        done ? ", sudah dijawab" : ""
                      }${isFlag ? ", ditandai" : ""}`}
                      aria-current={
                        index === current
                          ? "step"
                          : undefined
                      }
                      className={cn(
                        "relative flex h-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all",
                        index === current &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        done
                          ? "border-transparent bg-brand-gradient text-white"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      {index + 1}

                      {isFlag && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-card" />
                      )}
                    </button>
                  );
                })}
              </div>

              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-brand-gradient" />
                  Dijawab ({answeredCount})
                </li>

                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border-2" />
                  Belum dijawab ({unanswered})
                </li>

                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  Ditandai ({flagged.size})
                </li>
              </ul>

              <Button
                className="w-full sm:hidden"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
              >
                <Send /> Kumpulkan
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Kumpulkan ujian?"
        description={
          unanswered > 0
            ? `Masih ada ${unanswered} soal yang belum dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah.`
            : "Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah."
        }
        confirmLabel={
          submitting ? "Menyimpan..." : "Ya, kumpulkan"
        }
        cancelLabel="Kembali mengerjakan"
        onConfirm={() => submit(false)}
      />
    </div>
  );
}
