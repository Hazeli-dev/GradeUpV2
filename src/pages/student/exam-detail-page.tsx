
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  BookOpen,
  CalendarDays,
  Play,
  Info,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { DifficultyBadge } from "@/components/shared/exam-card";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/shared/states";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { formatDate, formatDuration } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import type { ExamPackage } from "@/types";
import { cn } from "@/lib/utils";

interface ExamResultHistory {
  id: string;
  examId: string;
  score: number;
  date: string;
}

export default function StudentExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { openUpgrade } = useUpgradeModal();

  const [exam, setExam] = useState<ExamPackage | null>(null);
  const [history, setHistory] = useState<ExamResultHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Mengambil detail ujian dan riwayat pengerjaan
  const fetchData = async () => {
    if (!examId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("*")
        .eq("id", examId)
        .single();

      if (examErr || !examData) {
        throw new Error("Paket ujian tidak ditemukan.");
      }

      const safeExam: ExamPackage = {
        id: examData.id,
        title: examData.title || "Tanpa Judul",
        description: examData.description || "Belum ada deskripsi.",
        category: examData.category || "Umum",
        level: examData.level || "SMA",
        difficulty: examData.difficulty || "Sedang",
        duration: Number(examData.duration) || 30,
        questionCount:
          Number(examData.question_count || examData.questionCount) || 0,
        participants: Number(examData.participants) || 0,
        premium: Boolean(examData.premium),
        status: examData.status || "Published",
        questionIds: [],
      };

      setExam(safeExam);

      const { data: attemptData } = await supabase
        .from("exam_attempts")
        .select("id, exam_package_id, score, created_at")
        .eq("exam_package_id", examId)
        .order("created_at", { ascending: false });

      if (attemptData) {
        setHistory(
          attemptData.map((item: any) => ({
            id: item.id,
            examId: item.exam_package_id,
            score: item.score || 0,
            date: item.created_at,
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail paket ujian.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examId]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  if (!exam) {
    return (
      <EmptyState
        title="Paket ujian tidak ditemukan"
        action={
          <Button onClick={() => navigate("/dashboard/exams")}>
            Kembali ke paket ujian
          </Button>
        }
      />
    );
  }

  const start = () => {
    if (exam.premium) {
      openUpgrade();
      return;
    }

    setAgreed(false);
    setOpen(true);
  };

  const rules = [
    {
      title: "Perhatikan waktu pengerjaan",
      description: `Waktu yang tersedia adalah ${formatDuration(
        exam.duration
      )}. Timer akan berjalan otomatis setelah ujian dimulai.`,
      icon: Clock,
    },
    {
      title: "Pilih jawaban dengan teliti",
      description:
        "Setiap soal memiliki satu jawaban benar. Kamu dapat mengubah jawaban sebelum mengumpulkan ujian.",
      icon: Target,
    },
    {
      title: "Gunakan navigasi soal",
      description:
        "Kamu dapat berpindah ke nomor soal tertentu dan menandai soal yang masih diragukan.",
      icon: ClipboardList,
    },
    {
      title: "Perhatikan batas waktu",
      description:
        "Ujian akan dikumpulkan secara otomatis ketika waktu pengerjaan berakhir.",
      icon: ShieldCheck,
    },
  ];

  const examStats = [
    {
      label: "Durasi",
      value: formatDuration(exam.duration),
      icon: Clock,
      description: "Waktu pengerjaan",
      color: "text-sky-600 dark:text-sky-400",
      background: "bg-sky-500/10",
    },
    {
      label: "Jumlah soal",
      value: `${exam.questionCount} soal`,
      icon: HelpCircle,
      description: "Total pertanyaan",
      color: "text-violet-600 dark:text-violet-400",
      background: "bg-violet-500/10",
    },
    {
      label: "Tingkat",
      value: exam.difficulty,
      icon: Target,
      description: "Kesulitan ujian",
      color: "text-amber-600 dark:text-amber-400",
      background: "bg-amber-500/10",
    },
    {
      label: "Peserta",
      value: exam.participants.toLocaleString("id-ID"),
      icon: Users,
      description: "Jumlah peserta",
      color: "text-emerald-600 dark:text-emerald-400",
      background: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12 text-foreground">
      {/* NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard/exams"
          className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Kembali ke Paket Ujian
        </Link>

        <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          GradeUp Exam Center
        </div>
      </div>

      {/* MAIN HERO */}
      <section className="relative isolate overflow-hidden rounded-[28px] border border-emerald-500/20 bg-slate-950 shadow-xl shadow-emerald-950/10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950" />

        <div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute right-6 top-6 hidden opacity-[0.07] sm:block">
          <ClipboardCheck className="h-52 w-52 text-white" />
        </div>

        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Detail Paket Ujian
            </span>

            <Badge className="border-0 bg-white text-emerald-800 hover:bg-white">
              {exam.category}
            </Badge>

            <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/15">
              {exam.level}
            </Badge>

            {exam.premium && (
              <Badge className="border border-amber-300/30 bg-amber-400/15 text-amber-200 hover:bg-amber-400/20">
                <Lock className="mr-1 h-3 w-3" />
                PREMIUM
              </Badge>
            )}
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              {exam.title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/80 sm:text-base">
              {exam.description}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-md">
              <BookOpen className="h-4 w-4 text-emerald-200" />
              {exam.questionCount} Pertanyaan
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-md">
              <Clock className="h-4 w-4 text-emerald-200" />
              {formatDuration(exam.duration)}
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-md">
              <Users className="h-4 w-4 text-emerald-200" />
              {exam.participants.toLocaleString("id-ID")} Peserta
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* EXAM STATISTICS */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {examStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card
                  key={stat.label}
                  className="rounded-2xl border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        stat.background,
                        stat.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <p className="mt-4 text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>

                    <p className="mt-1 text-lg font-black tracking-tight text-foreground sm:text-xl">
                      {stat.value}
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* INSTRUCTIONS */}
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <div>
                  <CardTitle className="text-base font-black">
                    Instruksi Ujian
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Baca panduan berikut sebelum memulai
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <div className="space-y-5">
                {rules.map((rule, index) => {
                  const Icon = rule.icon;

                  return (
                    <div key={rule.title} className="flex gap-3.5">
                      <div className="relative">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        {index !== rules.length - 1 && (
                          <div className="absolute left-1/2 top-11 h-5 w-px -translate-x-1/2 bg-border" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            0{index + 1}
                          </span>

                          <h3 className="text-sm font-bold text-foreground">
                            {rule.title}
                          </h3>
                        </div>

                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* EXAM PREPARATION NOTE */}
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Info className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Persiapkan dirimu
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Pastikan perangkat dan koneksi internet siap digunakan.
                  Kerjakan setiap soal dengan teliti dan perhatikan waktu yang
                  tersedia.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5 lg:sticky lg:top-5">
          {/* START EXAM CARD */}
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-md">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status Paket
                </span>

                {exam.premium ? (
                  <Badge variant="warning">
                    <Lock className="mr-1 h-3 w-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Gratis
                  </Badge>
                )}
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  {exam.premium ? "Akses Premium" : "Siap untuk ujian?"}
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {exam.premium
                    ? "Paket ini termasuk konten Premium GradeUp. Upgrade untuk mendapatkan akses."
                    : "Pastikan kamu sudah memahami instruksi sebelum masuk ke ruang ujian."}
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Durasi</span>
                  <span className="font-bold text-foreground">
                    {formatDuration(exam.duration)}
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Jumlah soal</span>
                  <span className="font-bold text-foreground">
                    {exam.questionCount} soal
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Kesulitan</span>
                  <DifficultyBadge difficulty={exam.difficulty} />
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/15 transition-all hover:bg-emerald-700 hover:shadow-xl"
                onClick={start}
              >
                {exam.premium ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Upgrade untuk Mulai
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Mulai Ujian
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Jawaban dan hasil ujian diproses melalui sistem GradeUp dan
                  disimpan sesuai mekanisme pengerjaan ujian.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* HISTORY */}
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <History className="h-4 w-4" />
                </div>

                <div>
                  <CardTitle className="text-sm font-black">
                    Riwayat Pengerjaan
                  </CardTitle>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Hasil pengerjaan sebelumnya
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {history.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-xs font-bold text-foreground">
                    Belum ada riwayat
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Hasil pengerjaan akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item) => (
                    <Link
                      key={item.id}
                      to={`/dashboard/results/${item.id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition-all hover:border-emerald-500/40 hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <ClipboardCheck className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">
                            Hasil Ujian
                          </p>

                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDate(item.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {item.score}
                        </span>

                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl border-border bg-card">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ClipboardCheck className="h-6 w-6" />
            </div>

            <DialogTitle className="text-xl font-black">
              Siap memulai ujian?
            </DialogTitle>

            <DialogDescription className="text-sm leading-relaxed">
              Pastikan kamu sudah memahami seluruh ketentuan berikut untuk
              paket ujian <strong className="text-foreground">{exam.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Durasi</span>
              </div>

              <p className="mt-2 text-sm font-black text-foreground">
                {formatDuration(exam.duration)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Jumlah soal</span>
              </div>

              <p className="mt-2 text-sm font-black text-foreground">
                {exam.questionCount} soal
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {rules.map((rule, index) => {
              const Icon = rule.icon;

              return (
                <div key={rule.title} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">
                      {index + 1}. {rule.title}
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>
                <p className="text-xs font-bold text-foreground">
                  Perhatikan sebelum memulai
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Setelah masuk ke ruang ujian, perhatikan timer dan ikuti
                  petunjuk pengerjaan. Pastikan kamu siap sebelum melanjutkan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(value) => setAgreed(value === true)}
              className="mt-0.5"
            />

            <Label
              htmlFor="agree"
              className="cursor-pointer text-xs font-medium leading-relaxed text-muted-foreground"
            >
              Saya sudah membaca dan memahami instruksi serta siap mengerjakan
              ujian ini.
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>

            <Button
              disabled={!agreed}
              onClick={() =>
                navigate(`/dashboard/exams/${exam.id}/attempt`)
              }
              className="gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              <Play className="h-4 w-4 fill-current" />
              Mulai Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
