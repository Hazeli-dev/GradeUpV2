import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CheckCircle2, Eye, Target, TrendingUp, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { formatDate } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ResultItem {
  id: string;
  examTitle: string;
  category: string;
  date: string;
  correct: number;
  incorrect: number;
  score: number;
  passed: boolean;
  answers?: Record<string, number>;
}

interface QuestionReview {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  // State Modal Detail Tinjau Jawaban
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<QuestionReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: attempts, error: errAttempts } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (errAttempts) throw errAttempts;

      const { data: packages, error: errPackages } = await supabase
        .from("exam_packages")
        .select("id, title, category, passing_score");

      if (errPackages) throw errPackages;

      const packageMap = new Map((packages || []).map((p) => [p.id, p]));

      const mappedData: ResultItem[] = (attempts || []).map((r: any) => {
        const packageId = r.exam_package_id || r.exam_id;
        const pkg = packageMap.get(packageId);

        const passingScore = pkg?.passing_score ?? 60;
        const currentScore = Number(r.score) || 0;

        const totalQ = Number(r.total_questions) || (r.answers ? Object.keys(r.answers).length : 10);

        let correctVal = Number(r.correct_count);
        let wrongVal = Number(r.wrong_count ?? r.incorrect_count);

        if (isNaN(correctVal) || (correctVal === 0 && wrongVal === 0 && currentScore > 0)) {
          correctVal = Math.round((currentScore / 100) * totalQ);
          wrongVal = Math.max(0, totalQ - correctVal);
        } else if (isNaN(wrongVal)) {
          wrongVal = Math.max(0, totalQ - correctVal);
        }

        return {
          id: r.id,
          examTitle: pkg?.title || "Paket Ujian",
          category: pkg?.category || "Umum",
          date: r.created_at,
          correct: correctVal,
          incorrect: wrongVal,
          score: currentScore,
          passed: r.is_passed !== undefined ? r.is_passed : currentScore >= passingScore,
          answers: r.answers || {},
        };
      });

      setData(mappedData);
    } catch (err: any) {
      setError(err.message || "Gagal memuat hasil belajar dari database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleOpenDetail = async (item: ResultItem) => {
    setSelectedResult(item);
    setDetailOpen(true);
    setReviewLoading(true);

    try {
      if (item.category) {
        const { data: qData } = await supabase
          .from("questions")
          .select("id, question_text, options, correct_answer")
          .eq("category", item.category)
          .limit(50);

        setReviewQuestions((qData as QuestionReview[]) || []);
      }
    } catch (err) {
      console.error("Gagal memuat soal untuk tinjauan:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      data
        .filter((r) => r.examTitle.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase()))
        .filter((r) => status === "all" || (status === "Lulus" ? r.passed : !r.passed)),
    [data, q, status]
  );

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchResults} />;

  const avg = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : 0;
  const best = data.length > 0 ? Math.max(...data.map((r) => r.score)) : 0;
  const passedCount = data.filter((r) => r.passed).length;
  const passRate = data.length > 0 ? Math.round((passedCount / data.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Hasil Belajar" description="Ringkasan nilai dan riwayat ujian Anda." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rata-rata Nilai" value={String(avg)} icon={TrendingUp} />
        <StatCard label="Nilai Tertinggi" value={String(best)} icon={Award} />
        <StatCard label="Ujian Selesai" value={String(data.length)} icon={CheckCircle2} />
        <StatCard label="Tingkat Kelulusan" value={`${passRate}%`} icon={Target} hint="Berdasarkan KKM" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari hasil ujian..." className="flex-1" />
        <FilterSelect value={status} onChange={setStatus} options={["Lulus", "Belum lulus"]} allLabel="Semua status" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Hasil tidak ditemukan" description="Belum ada riwayat ujian yang diselesaikan." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket Ujian</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Benar / Salah</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => handleOpenDetail(r)}>
                  <TableCell>
                    <p className="font-semibold">{r.examTitle}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.category}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{r.correct}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-red-500">{r.incorrect}</span>
                  </TableCell>
                  <TableCell className="text-base font-extrabold">{r.score}</TableCell>
                  <TableCell>
                    {r.passed ? <Badge variant="success">Lulus</Badge> : <Badge variant="danger">Belum lulus</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(r);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* MODAL DIALOG TINJAU JAWABAN */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedResult && (
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" />
                {selectedResult.examTitle}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Evaluasi lembar jawaban dan pembahasan soal ujian.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 my-3 p-4 rounded-xl border bg-muted/30 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Skor Akhir</p>
                <p className="text-xl font-black text-foreground">{selectedResult.score} / 100</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Jawaban Benar</p>
                <p className="text-xl font-black text-emerald-400">{selectedResult.correct} Soal</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Jawaban Salah</p>
                <p className="text-xl font-black text-rose-400">{selectedResult.incorrect} Soal</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-emerald-400" /> Lembar Jawaban Siswa
              </h4>

              {reviewLoading ? (
                <p className="text-xs text-muted-foreground text-center py-6">Memuat lembar jawaban...</p>
              ) : reviewQuestions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Belum ada detail pembahasan soal.</p>
              ) : (
                reviewQuestions.map((qItem, idx) => {
                  const userSelectedIndex = selectedResult.answers?.[qItem.id];
                  // ✅ FIX TS2538: Melakukan pengecekan eksplisit !== undefined
                  const userSelectedOption =
                    userSelectedIndex !== undefined ? qItem.options?.[userSelectedIndex] : undefined;
                  const isCorrect = userSelectedOption?.id === qItem.correct_answer;

                  return (
                    <div
                      key={qItem.id}
                      className={cn(
                        "p-4 rounded-xl border space-y-3 text-xs",
                        isCorrect ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-foreground">
                          {idx + 1}. {qItem.question_text}
                        </p>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Benar
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">
                            <XCircle className="h-3 w-3" /> Salah
                          </span>
                        )}
                      </div>

                      <div className="grid gap-1.5 pl-2 border-l-2 border-border/80">
                        {qItem.options?.map((opt, optIdx) => {
                          const isUserChoice = userSelectedIndex === optIdx;
                          const isCorrectOption = opt.id === qItem.correct_answer;

                          return (
                            <div
                              key={optIdx}
                              className={cn(
                                "p-2 rounded-lg text-[11px] flex items-center justify-between",
                                isCorrectOption && "bg-emerald-500/20 text-emerald-300 font-bold",
                                isUserChoice && !isCorrectOption && "bg-rose-500/20 text-rose-300 line-through"
                              )}
                            >
                              <span>
                                <strong className="mr-1.5">{opt.id || String.fromCharCode(65 + optIdx)}.</strong>
                                {opt.text}
                              </span>
                              {isUserChoice && <span className="text-[9px] opacity-80">(Jawaban Anda)</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
