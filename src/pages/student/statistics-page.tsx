
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  Clock3,
  GraduationCap,
  Lightbulb,
  Medal,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  salah: number;
  ujian: number;
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

interface ProfileStatistics {
  total_xp: number;
  all_time_xp: number;
  level: number;
  total_articles_read: number;
  total_exams_passed: number;
}

interface CourseStatistics {
  completedLessons: number;
  totalLessons: number;
  completedCourses: number;
  courseCount: number;
  courseXP: number;
}

interface ExamStatistics {
  totalExams: number;
  averageScore: number;
  highestScore: number;
  passCount: number;
  passRate: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredQuestions: number;
}

const pieColors = [CHART_COLORS.secondary, CHART_COLORS.danger, "#94a3b8"];

const emptyExamStatistics: ExamStatistics = {
  totalExams: 0,
  averageScore: 0,
  highestScore: 0,
  passCount: 0,
  passRate: 0,
  totalQuestions: 0,
  answeredQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  unansweredQuestions: 0,
};

const emptyCourseStatistics: CourseStatistics = {
  completedLessons: 0,
  totalLessons: 0,
  completedCourses: 0,
  courseCount: 0,
  courseXP: 0,
};

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Sangat Baik";
  if (score >= 75) return "Baik";
  if (score >= 65) return "Cukup";
  return "Perlu Ditingkatkan";
}

function generateDetailedLearningInsight(
  subjects: SubjectPerformanceData[],
  accuracy: number,
  examCount: number,
): LearningInsightResult {
  if (examCount === 0 || subjects.length === 0) {
    return {
      title: "Mulai Perjalanan Belajarmu",
      type: "info",
      description:
        "Belum tersedia cukup data untuk menganalisis performa. Selesaikan beberapa ujian agar GradeUp dapat menampilkan pola perkembangan belajarmu.",
      actionPlan: [
        "Mulai dengan satu paket ujian sesuai jenjang dan mata pelajaran.",
        "Periksa pembahasan setelah menyelesaikan ujian.",
        "Pantau perkembangan nilai setelah mengikuti beberapa evaluasi.",
      ],
    };
  }

  const best = [...subjects].sort((a, b) => b.skor - a.skor)[0];
  const weakest = [...subjects].sort((a, b) => a.skor - b.skor)[0];

  const mathSubjects = subjects.filter((subject) =>
    /matematika|math|hitung|kalkulus|fisika|ekonomi/i.test(subject.mapel),
  );

  const scienceSubjects = subjects.filter((subject) =>
    /ipa|biologi|sains|kimia|alam/i.test(subject.mapel),
  );

  const mathAverage = mathSubjects.length
    ? Math.round(
        mathSubjects.reduce((sum, item) => sum + item.skor, 0) /
          mathSubjects.length,
      )
    : null;

  const scienceAverage = scienceSubjects.length
    ? Math.round(
        scienceSubjects.reduce((sum, item) => sum + item.skor, 0) /
          scienceSubjects.length,
      )
    : null;

  if (mathAverage !== null && mathAverage < 65) {
    return {
      title: "Perlu Penguatan Materi Numerik",
      type: "warning",
      description: `Rata-rata kategori hitunganmu masih ${mathAverage}%. Materi seperti ${mathSubjects
        .map((item) => item.mapel)
        .join(", ")} layak mendapatkan perhatian lebih.`,
      actionPlan: [
        "Ulangi konsep dasar sebelum mencoba soal dengan tingkat kesulitan lebih tinggi.",
        "Tuliskan informasi yang diketahui dan yang ditanyakan sebelum menghitung.",
        `Periksa kembali pembahasan soal pada kategori ${mathSubjects
          .map((item) => item.mapel)
          .join(", ")}.`,
      ],
    };
  }

  if (scienceAverage !== null && scienceAverage >= 80) {
    return {
      title: "Penguasaan Sains Menonjol",
      type: "success",
      description: `Rata-rata kategori sains mencapai ${scienceAverage}%. Ini merupakan area dengan hasil yang kuat dalam riwayat evaluasimu.`,
      actionPlan: [
        "Pertahankan hasil dengan mencoba variasi soal dan tingkat kesulitan yang lebih tinggi.",
        "Hubungkan konsep yang dipelajari dengan contoh penerapannya.",
        `Gunakan strategi belajar yang berhasil untuk membantu meningkatkan ${weakest.mapel}.`,
      ],
    };
  }

  if (best.skor >= 85 && weakest.skor < 70) {
    return {
      title: "Ada Perbedaan Penguasaan Antarmapel",
      type: "warning",
      description: `Hasil terbaikmu ada pada ${best.mapel} (${best.skor}%), sedangkan ${weakest.mapel} masih ${weakest.skor}%. Fokus berikutnya adalah memperkuat kategori dengan nilai lebih rendah.`,
      actionPlan: [
        `Prioritaskan materi ${weakest.mapel} dan pelajari kembali konsep yang belum dikuasai.`,
        "Gunakan pembahasan ujian untuk mengenali pola kesalahan.",
        "Lakukan evaluasi ulang setelah mempelajari materi terkait.",
      ],
    };
  }

  if (accuracy >= 80) {
    return {
      title: "Performa Evaluasi Sangat Baik",
      type: "success",
      description: `Akurasi jawabanmu mencapai ${accuracy}%. Hasil ini menunjukkan penguasaan yang baik terhadap soal-soal yang telah dijawab.`,
      actionPlan: [
        "Pertahankan konsistensi belajar dan evaluasi secara berkala.",
        "Coba soal penalaran dan penerapan konsep.",
        "Perhatikan juga waktu pengerjaan agar semakin efisien.",
      ],
    };
  }

  if (accuracy >= 65) {
    return {
      title: "Perkembangan Belajar yang Positif",
      type: "balanced",
      description: `Akurasi jawaban berada di angka ${accuracy}%. Kamu sudah memiliki dasar yang cukup, dan masih ada ruang untuk meningkatkan ketepatan.`,
      actionPlan: [
        "Ulas kembali soal yang pernah dijawab salah.",
        `Prioritaskan penguatan pada ${weakest.mapel}.`,
        "Lakukan latihan secara konsisten dan pantau perubahan nilai.",
      ],
    };
  }

  return {
    title: "Saatnya Memperkuat Pemahaman",
    type: "warning",
    description: `Akurasi jawaban saat ini ${accuracy}%. Hasil evaluasi menunjukkan bahwa beberapa konsep masih perlu dipelajari kembali.`,
    actionPlan: [
      `Mulai dari materi dasar pada ${weakest.mapel}.`,
      "Baca materi pembelajaran sebelum mengerjakan evaluasi berikutnya.",
      "Pelajari penjelasan jawaban agar kesalahan yang sama tidak terulang.",
    ],
  };
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [scoreTrend, setScoreTrend] = useState<ScoreTrendData[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<
    SubjectPerformanceData[]
  >([]);
  const [answerBreakdown, setAnswerBreakdown] = useState<
    AnswerBreakdownData[]
  >([]);

  const [examStats, setExamStats] =
    useState<ExamStatistics>(emptyExamStatistics);

  const [profileStats, setProfileStats] = useState<ProfileStatistics>({
    total_xp: 0,
    all_time_xp: 0,
    level: 1,
    total_articles_read: 0,
    total_exams_passed: 0,
  });

  const [courseStats, setCourseStats] =
    useState<CourseStatistics>(emptyCourseStatistics);

  useEffect(() => {
    let active = true;

    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setErrorMessage("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");
          return;
        }

        const [
          attemptsResult,
          packagesResult,
          profileResult,
          progressResult,
          lessonsResult,
          modulesResult,
          coursesResult,
        ] = await Promise.all([
          supabase
            .from("exam_attempts")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),

          supabase
            .from("exam_packages")
            .select("id, title, category, passing_score"),

          supabase
            .from("profiles")
            .select(
              "total_xp, all_time_xp, level, total_articles_read, total_exams_passed",
            )
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("lesson_progress")
            .select("lesson_id, is_completed, xp_awarded")
            .eq("user_id", user.id),

          supabase
            .from("course_lessons")
            .select("id, module_id"),

          supabase
            .from("course_modules")
            .select("id, course_id"),

          supabase
            .from("courses")
            .select("id, title"),
        ]);

        if (attemptsResult.error) throw attemptsResult.error;

        if (!active) return;

        const attempts = attemptsResult.data || [];
        const packages = packagesResult.data || [];
        const packageMap = new Map(packages.map((item) => [item.id, item]));

        if (profileResult.data) {
          const profile = profileResult.data;

          setProfileStats({
            total_xp: safeNumber(profile.total_xp),
            all_time_xp: safeNumber(profile.all_time_xp),
            level: Math.max(1, safeNumber(profile.level, 1)),
            total_articles_read: safeNumber(profile.total_articles_read),
            total_exams_passed: safeNumber(profile.total_exams_passed),
          });
        }

        // Analisis hasil ujian
        const categoryScores: Record<
          string,
          {
            totalScore: number;
            count: number;
            totalQ: number;
            correct: number;
            wrong: number;
          }
        > = {};

        let totalCorrect = 0;
        let totalWrong = 0;
        let totalUnanswered = 0;
        let totalQuestions = 0;
        let totalScore = 0;
        let highestScore = 0;
        let passCount = 0;

        const trend = attempts.map((item: any) => {
          const score = Math.max(0, Math.min(100, safeNumber(item.score)));
          const packageId = item.exam_package_id || item.exam_id;
          const examPackage = packageMap.get(packageId);
          const category = examPackage?.category || "Umum";

          const questionCount = Math.max(
            0,
            safeNumber(
              item.total_questions,
              item.answers ? Object.keys(item.answers).length : 0,
            ),
          );

          let correct = safeNumber(item.correct_count, NaN);
          let wrong = safeNumber(
            item.wrong_count ?? item.incorrect_count,
            NaN,
          );

          if (
            !Number.isFinite(correct) ||
            (correct === 0 && (!Number.isFinite(wrong) || wrong === 0) && score > 0)
          ) {
            correct = Math.round((score / 100) * questionCount);
          }

          if (!Number.isFinite(wrong)) {
            wrong = Math.max(0, questionCount - correct);
          }

          correct = Math.max(0, Math.min(questionCount, correct));
          wrong = Math.max(0, Math.min(questionCount - correct, wrong));

          const unanswered = Math.max(0, questionCount - correct - wrong);
          const answered = correct + wrong;

          totalCorrect += correct;
          totalWrong += wrong;
          totalUnanswered += unanswered;
          totalQuestions += questionCount;
          totalScore += score;
          highestScore = Math.max(highestScore, score);

          const passingScore = safeNumber(examPackage?.passing_score, 75);
          const passed =
            typeof item.is_passed === "boolean"
              ? item.is_passed
              : score >= passingScore;

          if (passed) passCount += 1;

          if (!categoryScores[category]) {
            categoryScores[category] = {
              totalScore: 0,
              count: 0,
              totalQ: 0,
              correct: 0,
              wrong: 0,
            };
          }

          categoryScores[category].totalScore += score;
          categoryScores[category].count += 1;
          categoryScores[category].totalQ += questionCount;
          categoryScores[category].correct += correct;
          categoryScores[category].wrong += wrong;

          return {
            tanggal: new Date(item.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            }),
            skor: score,
          };
        });

        const answeredQuestions = totalCorrect + totalWrong;
        const accuracy = answeredQuestions
          ? Math.round((totalCorrect / answeredQuestions) * 100)
          : 0;

        setExamStats({
          totalExams: attempts.length,
          averageScore: attempts.length
            ? Math.round(totalScore / attempts.length)
            : 0,
          highestScore,
          passCount,
          passRate: attempts.length
            ? Math.round((passCount / attempts.length) * 100)
            : 0,
          totalQuestions,
          answeredQuestions,
          correctAnswers: totalCorrect,
          wrongAnswers: totalWrong,
          unansweredQuestions: totalUnanswered,
        });

        setScoreTrend(trend);

        setSubjectPerformance(
          Object.entries(categoryScores)
            .map(([category, data]) => ({
              mapel: category,
              skor: Math.round(data.totalScore / data.count),
              totalSoal: data.totalQ,
              benar: data.correct,
              salah: data.wrong,
              ujian: data.count,
            }))
            .sort((a, b) => b.skor - a.skor),
        );

        setAnswerBreakdown([
          { name: "Benar", value: totalCorrect },
          { name: "Salah", value: totalWrong },
          { name: "Belum dijawab", value: totalUnanswered },
        ]);

        // Statistik kursus dan materi
        if (
          !progressResult.error &&
          !lessonsResult.error &&
          !modulesResult.error &&
          !coursesResult.error
        ) {
          const progress = progressResult.data || [];
          const lessons = lessonsResult.data || [];
          const modules = modulesResult.data || [];
          const courses = coursesResult.data || [];

          const completedLessonIds = new Set(
            progress
              .filter((item: any) => item.is_completed)
              .map((item: any) => item.lesson_id),
          );

          const lessonMap = new Map(lessons.map((item) => [item.id, item]));
          const moduleMap = new Map(modules.map((item) => [item.id, item]));

          const completedCourseIds = new Set<string>();
          const courseLessonCounts = new Map<string, number>();
          const completedCourseLessonCounts = new Map<string, number>();

          lessons.forEach((lesson: any) => {
            const module = moduleMap.get(lesson.module_id);
            if (!module) return;

            const courseId = module.course_id;
            courseLessonCounts.set(
              courseId,
              (courseLessonCounts.get(courseId) || 0) + 1,
            );

            if (completedLessonIds.has(lesson.id)) {
              completedCourseLessonCounts.set(
                courseId,
                (completedCourseLessonCounts.get(courseId) || 0) + 1,
              );
            }
          });

          courseLessonCounts.forEach((count, courseId) => {
            if (
              count > 0 &&
              completedCourseLessonCounts.get(courseId) === count
            ) {
              completedCourseIds.add(courseId);
            }
          });

          const courseXP = progress
            .filter((item: any) => item.is_completed)
            .reduce(
              (sum: number, item: any) =>
                sum + safeNumber(item.xp_awarded),
              0,
            );

          setCourseStats({
            completedLessons: completedLessonIds.size,
            totalLessons: lessons.length,
            completedCourses: completedCourseIds.size,
            courseCount: courses.length,
            courseXP,
          });
        }
      } catch (error) {
        console.error("Gagal memuat statistik belajar:", error);
        if (active) {
          setErrorMessage(
            "Statistik belum dapat dimuat. Silakan coba muat ulang halaman.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAnalyticsData();

    return () => {
      active = false;
    };
  }, []);

  const accuracyRate = useMemo(() => {
    if (!examStats.answeredQuestions) return 0;

    return Math.round(
      (examStats.correctAnswers / examStats.answeredQuestions) * 100,
    );
  }, [examStats]);

  const insight = useMemo(
    () =>
      generateDetailedLearningInsight(
        subjectPerformance,
        accuracyRate,
        examStats.totalExams,
      ),
    [subjectPerformance, accuracyRate, examStats.totalExams],
  );

  if (loading) return <PageSkeleton />;

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Statistik Belajar"
          description="Laporan perkembangan aktivitas dan hasil belajarmu di GradeUp."
        />
        <EmptyState
          title="Statistik belum tersedia"
          description={errorMessage}
        />
      </div>
    );
  }

  const hasExamData = examStats.totalExams > 0;
  const courseProgress = courseStats.totalLessons
    ? Math.min(
        100,
        Math.round(
          (courseStats.completedLessons / courseStats.totalLessons) * 100,
        ),
      )
    : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <PageHeader
        title="Statistik Belajar"
        description="Pantau perkembangan akademik, aktivitas kursus, dan pencapaianmu di GradeUp."
      />

      {/* GAMIFIKASI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-emerald-500/10 via-card to-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400">
              <Zap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                Total XP
              </p>
              <p className="text-2xl font-black tabular-nums text-foreground">
                {profileStats.total_xp.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-muted-foreground">
                Akumulasi XP saat ini
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-600 dark:text-violet-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                Level Saat Ini
              </p>
              <p className="text-2xl font-black text-foreground">
                Level {profileStats.level}
              </p>
              <p className="text-xs text-muted-foreground">
                Berdasarkan level profil GradeUp
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <Medal className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                XP dari Kursus
              </p>
              <p className="text-2xl font-black text-foreground">
                {courseStats.courseXP.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-muted-foreground">
                XP penyelesaian materi yang tercatat
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* RINGKASAN UJIAN */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-extrabold text-foreground">
            Ringkasan Akademik
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Rata-rata Nilai"
            value={`${examStats.averageScore}%`}
            icon={Target}
            hint="Rata-rata seluruh ujian"
          />
          <StatCard
            label="Nilai Tertinggi"
            value={`${examStats.highestScore}%`}
            icon={TrendingUp}
            hint="Pencapaian terbaik"
          />
          <StatCard
            label="Ujian Lulus"
            value={`${examStats.passCount}/${examStats.totalExams}`}
            icon={CheckCircle2}
            hint={`${examStats.passRate}% tingkat kelulusan`}
          />
          <StatCard
            label="Akurasi Jawaban"
            value={`${accuracyRate}%`}
            icon={Target}
            hint="Dari soal yang sudah dijawab"
          />
        </div>
      </section>

      {/* ANALISIS SOAL */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Analisis Pengerjaan Soal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
          {[
            {
              label: "Total Soal",
              value: examStats.totalQuestions,
              icon: BookOpen,
              color: "text-foreground",
              bg: "bg-muted",
            },
            {
              label: "Jawaban Benar",
              value: examStats.correctAnswers,
              icon: CheckCircle2,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Jawaban Salah",
              value: examStats.wrongAnswers,
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-rose-500/10",
            },
            {
              label: "Belum Dijawab",
              value: examStats.unansweredQuestions,
              icon: CircleHelp,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-500/10",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/60 bg-card p-3 sm:p-4"
            >
              <div className={`mb-3 inline-flex rounded-xl p-2 ${item.bg} ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-black tabular-nums text-foreground sm:text-2xl">
                {item.value.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PROGRES KURSUS */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold">
            <GraduationCap className="h-5 w-5 text-primary" />
            Aktivitas Pembelajaran Kursus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.courseCount}
              </p>
              <p className="text-xs text-muted-foreground">Kursus tersedia</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.completedLessons}
              </p>
              <p className="text-xs text-muted-foreground">Materi selesai</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.totalLessons}
              </p>
              <p className="text-xs text-muted-foreground">Total materi</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.completedCourses}
              </p>
              <p className="text-xs text-muted-foreground">Kursus tuntas</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">
                Penyelesaian materi
              </span>
              <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {courseProgress}%
              </span>
            </div>
            <Progress value={courseProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Berdasarkan materi yang memiliki catatan progres dan daftar materi
              yang dapat diakses.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Statistik ini menghitung penyelesaian materi kursus. Aktivitas
              membaca artikel ditampilkan terpisah pada data profil.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AKTIVITAS TAMBAHAN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">
                {profileStats.total_articles_read}
              </p>
              <p className="text-sm font-semibold text-foreground">
                Artikel dibaca
              </p>
              <p className="text-xs text-muted-foreground">
                Total artikel yang tercatat di profil
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">
                {profileStats.total_exams_passed}
              </p>
              <p className="text-sm font-semibold text-foreground">
                Ujian lulus tercatat
              </p>
              <p className="text-xs text-muted-foreground">
                Berdasarkan rekap profil
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INSIGHT */}
      <Card className="overflow-hidden rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground">
                  {insight.title}
                </h3>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Analisis Otomatis
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {insight.description}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <Lightbulb className="h-4 w-4" />
              Rekomendasi Belajar
            </h4>
            <ul className="space-y-3">
              {insight.actionPlan.map((action, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* PETA PENGUASAAN */}
      <Card className="overflow-hidden rounded-2xl border-border/70">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold">
            <Award className="h-5 w-5 text-emerald-500" />
            Peta Penguasaan Mata Pelajaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {subjectPerformance.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada data penguasaan mata pelajaran.
            </p>
          ) : (
            subjectPerformance.map((item) => (
              <div
                key={item.mapel}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {item.mapel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.ujian} ujian · {item.benar} benar · {item.salah} salah
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${getScoreColor(item.skor)}`}>
                      {item.skor}%
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {getScoreLabel(item.skor)}
                    </Badge>
                  </div>
                </div>
                <Progress value={item.skor} className="h-2.5" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* GRAFIK */}
      {hasExamData ? (
        <>
          <div className="min-w-0 overflow-hidden rounded-2xl">
            <ChartCard
              title="Perkembangan Nilai Ujian"
              description="Perubahan skor dari setiap ujian yang telah dikerjakan"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={scoreTrend}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="tanggal"
                    {...axisProps}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    {...axisProps}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="skor"
                    name="Skor"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: CHART_COLORS.secondary,
                      strokeWidth: 2,
                      stroke: "hsl(var(--card))",
                    }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-2xl">
              <ChartCard
                title="Perbandingan Skor per Mapel"
                description="Rata-rata nilai pada setiap kategori ujian"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectPerformance}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="mapel"
                      {...axisProps}
                      interval={0}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      {...axisProps}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar
                      dataKey="skor"
                      name="Rata-rata skor"
                      radius={[8, 8, 0, 0]}
                      fill={CHART_COLORS.secondary}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl">
              <ChartCard
                title="Distribusi Jawaban"
                description="Perbandingan jawaban benar, salah, dan belum dijawab"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={answerBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {answerBreakdown.map((_, index) => (
                        <Cell key={index} fill={pieColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipStyle} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </>
      ) : (
        <Card className="rounded-2xl border-dashed border-border/70">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-foreground">
              Grafik ujian belum tersedia
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Setelah menyelesaikan ujian, grafik perkembangan nilai dan
              distribusi jawaban akan muncul di bagian ini.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
