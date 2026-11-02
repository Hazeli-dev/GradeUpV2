import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Send, Timer, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { formatTimer } from "@/utils/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface QuestionOption {
  id: string; // "A", "B", "C", "D"
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
  duration: number; // Dalam menit
  passing_score: number;
}

export default function ExamAttemptPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // { questionId: optionIndex }
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [earnedXp, setEarnedXp] = useState<number>(0);

  // 1. Fetch Ujian & Soal dari Supabase
  const fetchData = async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch detail paket ujian
      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("id, title, category, duration, passing_score")
        .eq("id", examId)
        .single();

      if (examErr) throw examErr;
      setExam(examData as ExamPackage);
      setSecondsLeft(examData.duration * 60);

      // Fetch soal berdasarkan kategori ujian (limit 50)
      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select("id, category, question_text, options, correct_answer")
        .eq("category", examData.category)
        .limit(50);

      if (qErr) throw qErr;

      if (!qData || qData.length === 0) {
        setError("Belum ada soal yang tersedia untuk kategori ujian ini.");
      } else {
        setQuestions(qData as QuestionItem[]);
      }
    } catch (err: any) {
      console.error("Fetch exam error:", err);
      setError(err.message || "Gagal memuat ujian dari Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examId]);

  // 2. Submit & Simpan Detail Lengkap (Benar/Salah/Total/Jawaban) ke Supabase
  const submit = useCallback(
    async (auto = false) => {
      if (submitting || !exam) return;
      setSubmitting(true);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        // Hitung Jawaban Benar & Salah Secara Presisi
        let correctCount = 0;
        questions.forEach((q) => {
          const selectedOptionIndex = answers[q.id];
          if (selectedOptionIndex !== undefined) {
            const selectedOption = q.options[selectedOptionIndex];
            if (selectedOption && selectedOption.id === q.correct_answer) {
              correctCount++;
            }
          }
        });

        const totalQuestions = questions.length;
        const wrongCount = totalQuestions - correctCount;
        const score = Math.round((correctCount / totalQuestions) * 100) || 0;
        const passingScore = exam.passing_score || 70;
        const isPassed = score >= passingScore;

        setFinalScore(score);

        // Kalkulasi XP
        const baseXP = 250;
        const performanceXP = Math.round(score * 5);
        const bonusPerfectXP = score === 100 ? 500 : 0;
        const totalXpCalculated = baseXP + performanceXP + bonusPerfectXP;
        setEarnedXp(totalXpCalculated);

        if (userId) {
          // Simpan Data Riwayat Lengkap ke exam_attempts
          await supabase.from("exam_attempts").insert([
            {
              user_id: userId,
              exam_id: exam.id,
              score: score,
              correct_count: correctCount,
              wrong_count: wrongCount,
              total_questions: totalQuestions,
              answers: answers,
              is_passed: isPassed,
            },
          ]);

          // Eksekusi RPC untuk Gamifikasi (XP & Increment Counter Badge)
          if (isPassed) {
            await supabase.rpc("complete_exam_attempt", {
              p_user_id: userId,
              p_xp_reward: totalXpCalculated,
            });
          } else {
            await supabase.rpc("increment_user_xp", {
              user_id_param: userId,
              xp_to_add: Math.round(score * 2),
            });
          }
        }

        setSubmitted(true);
        toast.success(
          auto
            ? "Waktu habis, ujian otomatis dikumpulkan!"
            : "Ujian berhasil dikumpulkan! Hasil dapat dilihat di menu Hasil Belajar."
        );
      } catch (err: any) {
        toast.error("Gagal menyimpan hasil: " + err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [exam, questions, answers, submitting]
  );

  // 3. Timer Countdown
  useEffect(() => {
    if (submitted || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submit(true);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, submitted, submit]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers]
  );

  if (loading) return <div className="container py-10"><PageSkeleton /></div>;
  if (error) return <div className="container py-10"><ErrorState message={error} onRetry={fetchData} /></div>;
  if (!exam || questions.length === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Soal tidak tersedia"
          description="Paket ujian ini belum memiliki soal di Supabase."
          action={<Button onClick={() => navigate("/dashboard/exams")}>Kembali ke Ujian</Button>}
        />
      </div>
    );
  }

  // Tampilan Hasil Setelah Dikumpulkan
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center shadow-lg border-2 border-emerald-500/20">
          <CardContent className="space-y-5 p-8 pt-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-extrabold">Ujian Berhasil Dikumpulkan</h1>
            <p className="text-sm text-muted-foreground">
              Anda menjawab {answeredCount} dari {questions.length} soal pada "{exam.title}".
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">Skor Akhir</p>
                <p className="text-2xl font-black text-primary">{finalScore} / 100</p>
              </div>
              <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/30 p-4">
                <p className="text-xs text-emerald-400 font-semibold">XP Didapatkan</p>
                <p className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                  <Zap className="h-5 w-5 fill-current" /> +{earnedXp}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-2">
              <Button variant="outline" asChild><Link to="/dashboard/exams">Daftar Paket Ujian</Link></Button>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 font-bold"><Link to="/dashboard/results">Lihat Hasil Belajar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[current];
  const timeLow = (secondsLeft ?? 0) <= 60;
  const unanswered = questions.length - answeredCount;

  const toggleFlag = () =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Logo compact />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{exam.title}</p>
              <p className="text-xs text-muted-foreground">Soal {current + 1} dari {questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-sm font-bold tabular-nums",
                timeLow ? "border-destructive/40 bg-destructive/10 text-destructive" : "bg-card"
              )}
              role="timer"
              aria-label="Sisa waktu"
            >
              <Timer className="h-4 w-4" />
              {formatTimer(secondsLeft ?? 0)}
            </div>
            <ThemeToggle />
            <Button onClick={() => setConfirmOpen(true)} className="hidden sm:inline-flex" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send /> Kumpulkan</>}
            </Button>
          </div>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />
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
                <Flag /> {flagged.has(q.id) ? "Ditandai" : "Tandai ragu"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <h2 className="text-lg font-bold leading-relaxed sm:text-xl">{q.question_text}</h2>
              <div className="space-y-3" role="radiogroup" aria-label="Pilihan jawaban">
                {q.options?.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
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
                          selected ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {opt.id || String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm font-medium sm:text-base">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-5">
                <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
                  <ArrowLeft /> Sebelumnya
                </Button>
                {current < questions.length - 1 ? (
                  <Button onClick={() => setCurrent((c) => c + 1)}>
                    Berikutnya <ArrowRight />
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                    <Send /> Kumpulkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="lg:sticky lg:top-28">
            <CardHeader><CardTitle>Navigasi Soal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((item, i) => {
                  const done = answers[item.id] !== undefined;
                  const isFlag = flagged.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrent(i)}
                      aria-label={`Soal ${i + 1}${done ? ", sudah dijawab" : ""}${isFlag ? ", ditandai" : ""}`}
                      aria-current={i === current}
                      className={cn(
                        "relative flex h-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all",
                        i === current && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        done ? "border-transparent bg-brand-gradient text-white" : "border-border hover:border-primary/40"
                      )}
                    >
                      {i + 1}
                      {isFlag && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-card" />}
                    </button>
                  );
                })}
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand-gradient" /> Dijawab ({answeredCount})</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded border-2" /> Belum dijawab ({unanswered})</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Ditandai ({flagged.size})</li>
              </ul>
              <Button className="w-full sm:hidden" onClick={() => setConfirmOpen(true)} disabled={submitting}>
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
        confirmLabel="Ya, kumpulkan"
        cancelLabel="Kembali mengerjakan"
        onConfirm={() => submit(false)}
      />
    </div>
  );
}
