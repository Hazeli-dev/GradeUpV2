import { useEffect, useState } from "react";
import { 
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, 
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts";
import { 
  Target, Award, CheckCircle2, Clock, BookOpen, BrainCircuit, Lightbulb, AlertTriangle, Sparkles 
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ChartCard, axisProps, chartTooltipStyle } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { PageSkeleton, EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/constants";
import { supabase } from "@/lib/supabase";

interface ScoreTrendData {
  tanggal: string;
  skor: number;
}

interface SubjectPerformanceData {
  mapel: string;
  skor: number;
  totalSoal: number;
  benar: number;
}

interface AnswerBreakdownData {
  name: string;
  value: number;
}

interface LearningInsightResult {
  title: string;
  type: "warning" | "success" | "balanced" | "info";
  description: string;
  actionPlan: string[];
}

const pieColors = [CHART_COLORS.secondary, CHART_COLORS.danger];

// HELPER: Menganalisis Performa & Menghasilkan Insight Sangat Detail
function generateDetailedLearningInsight(
  subjects: SubjectPerformanceData[], 
  accuracy: number
): LearningInsightResult {
  if (!subjects || subjects.length === 0) {
    return {
      title: "Belum Ada Data Cukup",
      type: "info",
      description: "Selesaikan lebih banyak ujian untuk mengaktifkan analisis tipe belajar presisi.",
      actionPlan: ["Selesaikan minimal 2 paket ujian dari kategori berbeda."]
    };
  }

  // 1. Kategorisasi Mapel
  const mathSubjects = subjects.filter((s) => 
    /matematika|math|hitung|kalkulus|fisika|ekonomi/i.test(s.mapel)
  );
  const scienceSubjects = subjects.filter((s) => 
    /ipa|biologi|sains|kimia|alam/i.test(s.mapel)
  );

  // Hitung rata-rata hitungan vs sains
  const mathAvg = mathSubjects.length > 0 
    ? Math.round(mathSubjects.reduce((acc, curr) => acc + curr.skor, 0) / mathSubjects.length) 
    : null;
    
  const scienceAvg = scienceSubjects.length > 0 
    ? Math.round(scienceSubjects.reduce((acc, curr) => acc + curr.skor, 0) / scienceSubjects.length) 
    : null;

  const bestSubject = [...subjects].sort((a, b) => b.skor - a.skor)[0];
  const weakestSubject = [...subjects].sort((a, b) => a.skor - b.skor)[0];

  // KONDISI A: Jelek di Hitung-hitungan (Skor < 65) tapi Bagus di IPA (Skor >= 80)
  if (mathAvg !== null && mathAvg < 65 && scienceAvg !== null && scienceAvg >= 80) {
    return {
      title: "Tipe Pembelajar Visual-Eksploratif (Kuat Teori Sains, Perlu Penguatan Logika Hitungan)",
      type: "warning",
      description: `Kemampuan analitis dan pemahaman konsep sains (${scienceSubjects.map(s => s.mapel).join(", ")}) kamu sangat unggul dengan rata-rata ${scienceAvg}%. Namun, penguasaan pada mapel hitungan (${mathSubjects.map(s => s.mapel).join(", ")}) masih di angka ${mathAvg}%. Kamu cenderung memahami konsep secara menyeluruh tetapi terkendala pada penyelesaian langkah numerik & rumus.`,
      actionPlan: [
        `💡 alokasikan waktu 30 menit/hari khusus berlatihan pembongkaran rumus dasar pada mapel ${weakestSubject.mapel}.`,
        `Gunakan metode "Kerjakan Soal Bertahap": Baca soal ➔ Tulis Variabel Diketahui ➔ Pilih Rumus. Jangan langsung menghitung di luar kepala.`,
        `Manfaatkan kekuatan visual IPA milikmu: Buat grafik atau diagram saat menyelesaikan soal cerita matematika/fisika.`
      ]
    };
  }

  // KONDISI B: Jelek di Hitung-hitungan (< 65) secara umum
  if (mathAvg !== null && mathAvg < 65) {
    return {
      title: "Perhatian Khusus: Diperlukan Evaluasi Dasar Matematika & Numerik",
      type: "warning",
      description: `Hasil evaluasi menunjukkan tantangan pada kelompok kuantitatif (${mathSubjects.map(s => s.mapel).join(", ")}) dengan rata-rata nilai ${mathAvg}%. Kesalahan terbanyak biasanya terletak pada ketidaktelitian operasi dasar dan pemahaman konsep logika rumus.`,
      actionPlan: [
        `Fokus pada pembongkaran soal latihan tingkat mudah (Basic) sebelum masuk ke level HOTS.`,
        `Pelajari kembali konsep dasar/operasional matematika pembentuk (seperti aljabar dasar, pecahan, & perbandingan).`,
        `Kerjakan minimal 5 soal hitungan setiap pagi saat pikiran masih segar.`
      ]
    };
  }

  // KONDISI C: Sangat Baik di IPA (>= 80) secara umum
  if (scienceAvg !== null && scienceAvg >= 80) {
    return {
      title: "Dominasi Sains & IPA Logis",
      type: "success",
      description: `Luar biasa! Penguasaan materi ilmu pengetahuan alam (${scienceSubjects.map(s => s.mapel).join(", ")}) berada di tingkat optimal dengan skor rata-rata ${scienceAvg}%. Kamu memiliki daya tangkap yang baik terhadap konsep sebab-akibat dan fenomena sains.`,
      actionPlan: [
        `Pertahankan keunggulan ini dengan mencoba paket ujian dengan kompleksitas tinggi (Soal Penalaran HOTS).`,
        `Bantu daya ingat jangka panjang dengan membuat Mind Map / Catatan Rangkuman Visual per bab.`,
        `Transfer metode analisa sains ini saat mengerjakan materi mapel lain yang nilai penguasannya masih di bawah 70%.`
      ]
    };
  }

  // KONDISI D: Performa Unggul di Satu Mapel Utama
  if (bestSubject.skor >= 85 && weakestSubject.skor < 70) {
    return {
      title: `Ketimpangan Penguasaan: Unggul di ${bestSubject.mapel}, Perlu Dorongan di ${weakestSubject.mapel}`,
      type: "warning",
      description: `Performa kamu sangat dominan pada ${bestSubject.mapel} (${bestSubject.skor}%), namun terdapat gap pada ${weakestSubject.mapel} (${weakestSubject.skor}%). Ketimpangan ini bisa memengaruhi batas kelulusan rata-rata ujian secara keseluruhan.`,
      actionPlan: [
        `Gunakan teknik Pomodoro: Belajar 25 menit ${weakestSubject.mapel}, lalu gunakan 10 menit mengulas ${bestSubject.mapel} sebagai penyegaran.`,
        `Evaluasi riwayat pengerjaan soal ${weakestSubject.mapel} untuk mengetahui sub-bab mana yang paling banyak menghasilkan jawaban salah.`
      ]
    };
  }

  // KONDISI E: Performa Seimbang dan Tinggi (Semua >= 75)
  if (accuracy >= 75) {
    return {
      title: "Performa Perimbang Tinggi (High Performing Student)",
      type: "success",
      description: `Penguasaan materi kamu tergolong konsisten di seluruh spektrum pelajaran dengan tingkat akurasi ${accuracy}%. Kamu memiliki adaptasi belajar yang seimbang antara logika hitungan dan hafalan konsep.`,
      actionPlan: [
        `Tingkatkan kecepatan waktu pengerjaan soal per butir (manajemen waktu ujian).`,
        `Simulasikan tryout dalam kondisi pengawasan waktu nyata tanpa melihat kunci jawaban.`
      ]
    };
  }

  // DEFAULT / PERFORMA BERKEMBANG
  return {
    title: "Modus Pembelajaran Berkembang",
    type: "balanced",
    description: `Akurasi pengerjaan soal berada di angka ${accuracy}%. Mata pelajaran terkuatmu saat ini adalah ${bestSubject.mapel} (${bestSubject.skor}%), sedangkan area utama yang butuh dorongan adalah ${weakestSubject.mapel} (${weakestSubject.skor}%).`,
    actionPlan: [
      `Ulas kembali pembahasan soal yang salah di setiap sesi ujian.`,
      `Konsisten mengerjakan minimal 1 paket ujian per hari untuk meningkatkan daya tahan belajar.`
    ]
  };
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrendData[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformanceData[]>([]);
  const [answerBreakdown, setAnswerBreakdown] = useState<AnswerBreakdownData[]>([]);
  
  // Metrik Ringkasan
  const [totalExams, setTotalExams] = useState(0);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [accuracyRate, setAccuracyRate] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState(0);

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch riwayat dari exam_attempts
        const { data: attempts, error: errAttempts } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (errAttempts) throw errAttempts;

        // 2. Fetch seluruh data paket ujian
        const { data: packages, error: errPackages } = await supabase
          .from("exam_packages")
          .select("id, title, category");

        if (errPackages) throw errPackages;

        const packageMap = new Map((packages || []).map((p) => [p.id, p]));

        if (!attempts || attempts.length === 0) {
          setLoading(false);
          return;
        }

        setTotalExams(attempts.length);

        // A. Process Tren Skor
        const trendData: ScoreTrendData[] = attempts.map((item: any) => ({
          tanggal: new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          }),
          skor: Number(item.score) || 0,
        }));
        setScoreTrend(trendData);

        // B. Aggregasi Mapel & Metrik Soal
        const categoryScores: Record<string, { totalScore: number; count: number; totalQ: number; correct: number }> = {};
        let totalCorrectAll = 0;
        let totalWrongAll = 0;
        let totalQuestionsCount = 0;

        attempts.forEach((item: any) => {
          const packageId = item.exam_package_id || item.exam_id;
          const pkg = packageMap.get(packageId);
          const categoryName = pkg?.category || "Umum";

          const currentScore = Number(item.score) || 0;
          const totalQ = Number(item.total_questions) || (item.answers ? Object.keys(item.answers).length : 10);

          let correctVal = Number(item.correct_count);
          let wrongVal = Number(item.wrong_count ?? item.incorrect_count);

          if (isNaN(correctVal) || (correctVal === 0 && wrongVal === 0 && currentScore > 0)) {
            correctVal = Math.round((currentScore / 100) * totalQ);
            wrongVal = Math.max(0, totalQ - correctVal);
          } else if (isNaN(wrongVal)) {
            wrongVal = Math.max(0, totalQ - correctVal);
          }

          totalCorrectAll += correctVal;
          totalWrongAll += wrongVal;
          totalQuestionsCount += totalQ;

          if (!categoryScores[categoryName]) {
            categoryScores[categoryName] = { totalScore: 0, count: 0, totalQ: 0, correct: 0 };
          }
          categoryScores[categoryName].totalScore += currentScore;
          categoryScores[categoryName].count += 1;
          categoryScores[categoryName].totalQ += totalQ;
          categoryScores[categoryName].correct += correctVal;
        });

        // Set Metrik Atas
        setTotalQuestionsAnswered(totalQuestionsCount);
        const accuracy = totalQuestionsCount > 0 ? Math.round((totalCorrectAll / totalQuestionsCount) * 100) : 0;
        setAccuracyRate(accuracy);
        
        // Asumsi rata-rata pengerjaan 1 ujian = 15 menit
        setEstimatedHours(Math.round(((attempts.length * 15) / 60) * 10) / 10);

        // Mapel Performance
        const subjectData: SubjectPerformanceData[] = Object.keys(categoryScores).map((cat) => ({
          mapel: cat,
          skor: Math.round(categoryScores[cat].totalScore / categoryScores[cat].count),
          totalSoal: categoryScores[cat].totalQ,
          benar: categoryScores[cat].correct,
        }));
        setSubjectPerformance(subjectData);

        // Pie Breakdown
        setAnswerBreakdown([
          { name: "Jawaban Benar", value: totalCorrectAll },
          { name: "Jawaban Salah", value: totalWrongAll },
        ]);

      } catch (err) {
        console.error("Gagal memuat statistik belajar:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, []);

  if (loading) return <PageSkeleton />;

  if (scoreTrend.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistik Belajar" description="Pantau perkembangan belajar dan penguasaan materi Anda." />
        <EmptyState 
          title="Belum Ada Aktivitas Ujian" 
          description="Selesaikan ujian pertama Anda untuk membuka analisis grafik belajar interaktif ini." 
        />
      </div>
    );
  }

  // Hitung Insight Belajar Otomatis
  const insight = generateDetailedLearningInsight(subjectPerformance, accuracyRate);

  return (
    <div className="space-y-6">
      <PageHeader title="Statistik Belajar" description="Personal Learning Analytics — Pantau evaluasi dan performa belajarmu secara mendalam." />

      {/* 1. RINGKASAN METRIK UTAMA */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Akurasi Jawaban" value={`${accuracyRate}%`} icon={Target} hint="Rata-rata ketepatan soal" />
        <StatCard label="Soal Dikerjakan" value={String(totalQuestionsAnswered)} icon={BookOpen} hint="Total butir soal dijawab" />
        <StatCard label="Ujian Diselesaikan" value={String(totalExams)} icon={CheckCircle2} hint="Paket ujian tuntas" />
        <StatCard label="Estimasi Waktu Belajar" value={`${estimatedHours}j`} icon={Clock} hint="Durasi pengerjaan aktif" />
      </div>

      {/* 2. AUTOMATED LEARNING INSIGHT DENGAN KONDISI RINCI */}
      <Card className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-background to-background shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/30 shadow-inner">
              <BrainCircuit className="h-7 w-7 animate-pulse" />
            </span>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-foreground tracking-tight">
                  {insight.title}
                </h3>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  <Sparkles className="h-3 w-3 mr-1" /> AI Diagnostic
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                {insight.description}
              </p>
            </div>
          </div>

          {/* Rencana Aksi Lanjutan */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Lightbulb className="h-4 w-4" /> Rekomendasi Langkah Belajar Khusus:
            </h4>
            <ul className="space-y-1.5 text-xs text-foreground/90 pl-1">
              {insight.actionPlan.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 font-bold select-none">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 3. PETA PENGUASAAN MATA PELAJARAN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" /> Peta Penguasaan Mata Pelajaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectPerformance.map((item) => {
            const isHigh = item.skor >= 80;
            const isMid = item.skor >= 65 && item.skor < 80;

            return (
              <div key={item.mapel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="capitalize text-foreground font-bold">{item.mapel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.skor}% ({item.benar}/{item.totalSoal} Soal Benar)</span>
                    {isHigh && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Menguasai</Badge>}
                    {isMid && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">Berkembang</Badge>}
                    {!isHigh && !isMid && <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]">Perlu Tingkatkan</Badge>}
                  </div>
                </div>
                <Progress value={item.skor} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 4. GRAFIK TREN & DISTRIBUSI JAWABAN */}
      <ChartCard title="Tren Skor Ujian" description="Progres peningkatan nilai dari waktu ke waktu" height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scoreTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="tanggal" {...axisProps} />
            <YAxis domain={[0, 100]} {...axisProps} />
            <Tooltip {...chartTooltipStyle} />
            <Line type="monotone" dataKey="skor" name="Skor" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 5, fill: CHART_COLORS.secondary, strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Rata-rata Skor per Mapel" description="Perbandingan nilai antar kategori">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectPerformance} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mapel" {...axisProps} interval={0} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="skor" name="Skor" radius={[8, 8, 0, 0]} fill={CHART_COLORS.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribusi Jawaban Benar vs Salah" description="Akumulasi seluruh butir soal yang dijawab">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={answerBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none">
                {answerBreakdown.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip {...chartTooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}