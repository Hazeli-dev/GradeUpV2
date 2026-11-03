
import { useCallback, useEffect, useMemo, useState } from "react";
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
  correct_answer: string;
}

interface ExamPackage {
  id: string;
  title: string;
  category: string;
  duration: number;
  passing_score: number;
}

type SavedAnswers = Record<string, number | null>;

export default function ExamAttemptPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [finalScore, setFinalScore] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [finalWrong, setFinalWrong] = useState(0);
  const [finalUnanswered, setFinalUnanswered] = useState(0);

  // 1. Fetch data ujian dan soal
  const fetchData = async () => {
    if (!examId) {
      setError("ID ujian tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: examData, error: examError } = await supabase
        .from("exam_packages")
        .select("id, title, category, duration, passing_score")
        .eq("id", examId)
        .single();

      if (examError) throw examError;

      if (!examData) {
        throw new Error("Paket ujian tidak ditemukan.");
      }

      const normalizedExam: ExamPackage = {
        ...examData,
        duration: Number(examData.duration) || 60,
        passing_score: Number(examData.passing_score) || 70,
      };

      setExam(normalizedExam);
      setSecondsLeft(normalizedExam.duration * 60);

      // Mengambil soal berdasarkan kategori seperti alur CBT sebelumnya.
      const { data: qData, error: questionError } = await supabase
        .from("questions")
        .select(
          "id, category, question_text, options, correct_answer"
        )
        .eq("category", normalizedExam.category)
        .limit(50);

      if (questionError) throw questionError;

      if (!qData || qData.length === 0) {
        setQuestions([]);
        setError(
          "Belum ada soal yang tersedia untuk kategori ujian ini."
        );
        return;
      }

      const normalizedQuestions: QuestionItem[] = qData.map(
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

          return {
            id: String(question.id),
            category: String(question.category || ""),
            question_text: String(question.question_text || ""),
            options: options.map((option: any, index: number) => ({
              id: String(
                option?.id || String.fromCharCode(65 + index)
              ),
              text: String(option?.text ?? option ?? ""),
            })),
            correct_answer: String(question.correct_answer || ""),
          };
        }
      );

      setQuestions(normalizedQuestions);
      setAnswers({});
      setCurrent(0);
      setFlagged(new Set());
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
  };

  useEffect(() => {
    fetchData();
  }, [examId]);

  // 2. Submit dan simpan hasil ujian
  const submit = useCallback(
    async (auto = false) => {
      if (submitting || submitted || !exam || questions.length === 0) {
        return;
      }

      setSubmitting(true);

      try {
        // Pastikan pengguna sudah login.
        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        const userId = userData.user?.id;

        if (!userId) {
          throw new Error(
            "Sesi pengguna tidak ditemukan. Silakan login kembali."
          );
        }

        // SIMPAN SEMUA ID SOAL, TERMASUK YANG TIDAK DIJAWAB.
        // Jawaban kosong akan memiliki nilai null.
        const savedAnswers: SavedAnswers = {};

        questions.forEach((question) => {
          savedAnswers[question.id] =
            answers[question.id] !== undefined
              ? answers[question.id]
              : null;
        });

        // Hitung benar, salah, dan kosong secara terpisah.
        let correctCount = 0;
        let answeredTotal = 0;

        questions.forEach((question) => {
          const selectedIndex = savedAnswers[question.id];

          if (selectedIndex === null) {
            return;
          }

          answeredTotal++;

          const selectedOption =
            question.options[selectedIndex];

          if (
            selectedOption &&
            selectedOption.id === question.correct_answer
          ) {
            correctCount++;
          }
        });

        const totalQuestions = questions.length;
        const wrongCount = answeredTotal - correctCount;
        const unansweredCount = totalQuestions - answeredTotal;

        // Hitung nilai akhir berdasarkan jumlah seluruh soal.
        const score = Math.round(
          (correctCount / totalQuestions) * 100
        );

        const passingScore = exam.passing_score || 70;
        const isPassed = score >= passingScore;

        setFinalScore(score);
        setFinalCorrect(correctCount);
        setFinalWrong(wrongCount);
        setFinalUnanswered(unansweredCount);

        // Hitung XP.
        const baseXP = 250;
        const performanceXP = Math.round(score * 5);
        const bonusPerfectXP = score === 100 ? 500 : 0;

        const passedXP =
          baseXP + performanceXP + bonusPerfectXP;

        const failedXP = Math.round(score * 2);
        const actualXP = isPassed ? passedXP : failedXP;

        setEarnedXp(actualXP);

        // Simpan hasil ujian ke Supabase.
        // Hanya menggunakan kolom yang tersedia pada exam_attempts.
        const { error: insertError } = await supabase
          .from("exam_attempts")
          .insert({
            user_id: userId,
            exam_id: exam.id,
            score,
            correct_count: correctCount,
            wrong_count: wrongCount,
            total_questions: totalQuestions,
            answers: savedAnswers,
            is_passed: isPassed,
            status: "completed",
          });

        if (insertError) {
          throw insertError;
        }

        // Proses XP setelah hasil berhasil disimpan.
        if (isPassed) {
          const { error: xpError } = await supabase.rpc(
            "complete_exam_attempt",
            {
              p_user_id: userId,
              p_xp_reward: passedXP,
            }
          );

          if (xpError) {
            console.error("XP update error:", xpError);

            toast.warning(
              "Hasil ujian tersimpan, tetapi XP belum berhasil diperbarui."
            );
          }
        } else {
          const { error: xpError } = await supabase.rpc(
            "increment_user_xp",
            {
              user_id_param: userId,
              xp_to_add: failedXP,
            }
          );

          if (xpError) {
            console.error("XP update error:", xpError);

            toast.warning(
              "Hasil ujian tersimpan, tetapi XP belum berhasil diperbarui."
            );
          }
        }

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
          "Gagal menyimpan hasil: " +
            (err instanceof Error
              ? err.message
              : "Terjadi kesalahan.")
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      exam,
      questions,
      answers,
      submitting,
      submitted,
    ]
  );

  // 3. Timer countdown
  useEffect(() => {
    if (submitted || submitting || secondsLeft === null) {
      return;
    }

    if (secondsLeft <= 0) {
      submit(true);
      return;
    }

    const timerId = setTimeout(() => {
      setSecondsLeft((previous) =>
        previous === null ? previous : previous - 1
      );
    }, 1000);

    return () => clearTimeout(timerId);
  }, [secondsLeft, submitted, submitting, submit]);

  // 4. Statistik jawaban
  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) => answers[question.id] !== undefined
      ).length,
    [questions, answers]
  );

  const unanswered = questions.length - answeredCount;

  // 5. Kondisi loading
  if (loading) {
    return (
      <div className="container py-10">
        <PageSkeleton />
      </div>
    );
  }

  // 6. Kondisi error
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
          description="Paket ujian ini belum memiliki soal di Supabase."
          action={
            <Button
              onClick={() => navigate("/dashboard/exams")}
            >
              Kembali ke Ujian
            </Button>
          }
        />
      </div>
    );
  }

  // 7. Tampilan hasil setelah ujian dikumpulkan
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
              Anda menjawab {answeredCount} dari{" "}
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
                <p className="text-xs text-muted-foreground">Benar</p>
                <p className="text-lg font-bold text-emerald-600">
                  {finalCorrect}
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-3">
                <p className="text-xs text-muted-foreground">Salah</p>
                <p className="text-lg font-bold text-red-500">
                  {finalWrong}
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Kosong</p>
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

  // 8. Tampilan CBT
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
          value={(answeredCount / questions.length) * 100}
          className="h-1 rounded-none"
        />
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Badge>{q.category || exam.category}</Badge>
              </div>

              <Button
                variant={flagged.has(q.id) ? "soft" : "ghost"}
                size="sm"
                onClick={toggleFlag}
                aria-pressed={flagged.has(q.id)}
              >
                <Flag />
                {flagged.has(q.id) ? "Ditandai" : "Tandai ragu"}
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
                  const selected = answers[q.id] === index;

                  return (
                    <button
                      key={option.id || index}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [q.id]: index,
                        }))
                      }
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                  disabled={current === 0}
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
                      aria-label={`Soal ${index + 1}${
                        done ? ", sudah dijawab" : ""
                      }${isFlag ? ", ditandai" : ""}`}
                      aria-current={
                        index === current ? "step" : undefined
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
