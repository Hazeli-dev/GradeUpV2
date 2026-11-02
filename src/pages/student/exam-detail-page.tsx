import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Clock, HelpCircle, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DifficultyBadge } from "@/components/shared/exam-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { formatDate, formatDuration } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import type { ExamPackage } from "@/types";

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

  // Fetch Data dari Supabase
  const fetchData = async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Detail Paket Ujian dari Supabase
      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("*")
        .eq("id", examId)
        .single();

      if (examErr || !examData) throw new Error("Paket ujian tidak ditemukan.");

      const safeExam: ExamPackage = {
        id: examData.id,
        title: examData.title || "Tanpa Judul",
        description: examData.description || "Belum ada deskripsi.",
        category: examData.category || "Umum",
        level: examData.level || "SMA",
        difficulty: examData.difficulty || "Sedang",
        duration: Number(examData.duration) || 30,
        questionCount: Number(examData.question_count || examData.questionCount) || 0,
        participants: Number(examData.participants) || 0,
        premium: Boolean(examData.premium),
        status: examData.status || "Published",
        questionIds: [],
      };

      setExam(safeExam);

      // 2. Fetch Riwayat Pengerjaan dari Supabase (tabel exam_attempts)
      const { data: attemptData } = await supabase
        .from("exam_attempts")
        .select("id, exam_package_id, score, created_at")
        .eq("exam_package_id", examId)
        .order("created_at", { ascending: false });

      if (attemptData) {
        setHistory(
          attemptData.map((r: any) => ({
            id: r.id,
            examId: r.exam_package_id,
            score: r.score || 0,
            date: r.created_at,
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
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!exam) {
    return (
      <EmptyState
        title="Paket ujian tidak ditemukan"
        action={<Button onClick={() => navigate("/dashboard/exams")}>Kembali ke paket ujian</Button>}
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
    `Waktu pengerjaan ${formatDuration(exam.duration)}. Timer berjalan otomatis setelah ujian dimulai.`,
    "Setiap soal memiliki satu jawaban benar. Anda dapat berpindah soal dan mengubah jawaban sebelum mengumpulkan.",
    "Gunakan panel navigasi untuk melompat ke soal tertentu dan menandai soal yang ragu.",
    "Ujian dikumpulkan otomatis saat waktu habis.",
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/exams"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Paket Ujian
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-brand-gradient p-6 text-white sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/90 text-primary">{exam.category}</Badge>
                <Badge className="bg-white/20 text-white">{exam.level}</Badge>
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{exam.title}</h1>
              <p className="mt-2 max-w-2xl text-white/85">{exam.description}</p>
            </div>
            <CardContent className="grid grid-cols-2 gap-4 p-6 pt-6 sm:grid-cols-4 sm:p-8">
              {[
                [Clock, "Durasi", formatDuration(exam.duration)],
                [HelpCircle, "Jumlah soal", `${exam.questionCount} soal`],
                [ClipboardList, "Tingkat", null],
                [Users, "Peserta", exam.participants.toLocaleString("id-ID")],
              ].map(([Icon, label, value]) => {
                const I = Icon as typeof Clock;
                return (
                  <div key={label as string} className="space-y-1">
                    <I className="h-5 w-5 text-primary dark:text-accent" />
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    {value ? (
                      <p className="text-sm font-bold">{value as string}</p>
                    ) : (
                      <DifficultyBadge difficulty={exam.difficulty} />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruksi Ujian</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2.5 pl-5 text-sm text-muted-foreground">
                {rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6 pt-6">
              {exam.premium ? (
                <Badge variant="warning">
                  <Lock className="h-3 w-3 mr-1 inline" /> Paket Premium
                </Badge>
              ) : (
                <Badge variant="success">Paket Gratis</Badge>
              )}
              <Button size="lg" className="w-full" onClick={start}>
                {exam.premium ? "Upgrade untuk Mulai" : "Mulai Ujian"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Jawaban dan hasil ujian Anda akan langsung dihitung dan tersimpan otomatis di database Supabase.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">Belum pernah dikerjakan.</p>}
              {history.map((r) => (
                <Link
                  key={r.id}
                  to={`/dashboard/results/${r.id}`}
                  className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted"
                >
                  <span className="text-sm text-muted-foreground">{formatDate(r.date)}</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Skor: {r.score}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Dialog Konfirmasi Sebelum Mulai */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Instruksi sebelum memulai</DialogTitle>
            <DialogDescription>{exam.title}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm">
            {rules.map((r) => (
              <li key={r} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {r}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Sistem Siap: Timer akan otomatis berjalan secara real-time dan hasil nilai akan langsung tersimpan di akun Anda.
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
            <Label htmlFor="agree" className="font-normal text-muted-foreground">
              Saya sudah membaca dan memahami instruksi ujian.
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button disabled={!agreed} onClick={() => navigate(`/dashboard/exams/${exam.id}/attempt`)}>
              Mulai Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
