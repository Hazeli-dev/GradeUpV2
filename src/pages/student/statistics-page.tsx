
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  Lightbulb,
  Medal,
  Sparkles,
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
import {
  ChartCard,
  axisProps,
  chartTooltipStyle,
} from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { PageSkeleton, EmptyState } from "@/components/shared/states";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/constants";
import { supabase } from "@/lib/supabase";

interface ScoreTrendData {
  tanggal: string;
  skor: number;
}

interface CategoryPerformanceData {
  kategori: string;
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
  totalXP: number;
  level: number;
  totalArticlesRead: number;
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

const pieColors = [
  CHART_COLORS.secondary,
  CHART_COLORS.danger,
  "#94a3b8",
];

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

const emptyProfileStatistics: ProfileStatistics = {
  totalXP: 0,
  level: 1,
  totalArticlesRead: 0,
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

function getQuestionCount(attempt: any): number {
  const storedCount = safeNumber(attempt.total_questions, -1);

  if (storedCount >= 0) return storedCount;

  if (
    attempt.answers &&
    typeof attempt.answers === "object" &&
    !Array.isArray(attempt.answers)
  ) {
    return Object.keys(attempt.answers).length;
  }

  return 0;
}

function getAnswerCounts(attempt: any, questionCount: number) {
  let correct = safeNumber(attempt.correct_count, NaN);
  let wrong = safeNumber(
    attempt.wrong_count ?? attempt.incorrect_count,
    NaN,
  );

  const hasCorrect = Number.isFinite(correct);
  const hasWrong = Number.isFinite(wrong);

  if (!hasCorrect && !hasWrong) {
    correct = Math.round(
      (Math.max(0, Math.min(100, safeNumber(attempt.score))) / 100) *
        questionCount,
    );
    wrong = Math.max(0, questionCount - correct);
  } else if (!hasCorrect) {
    correct = Math.max(0, questionCount - wrong);
  } else if (!hasWrong) {
    wrong = Math.max(0, questionCount - correct);
  } else if (correct === 0 && wrong === 0 && questionCount > 0) {
    correct = Math.round(
      (Math.max(0, Math.min(100, safeNumber(attempt.score))) / 100) *
        questionCount,
    );
    wrong = Math.max(0, questionCount - correct);
  }

  correct = Math.max(0, Math.min(questionCount, correct));
  wrong = Math.max(0, Math.min(questionCount - correct, wrong));

  return {
    correct,
    wrong,
    unanswered: Math.max(0, questionCount - correct - wrong),
  };
}

function generateDetailedLearningInsight(
  categories: CategoryPerformanceData[],
  accuracy: number,
  examCount: number,
): LearningInsightResult {
  if (examCount === 0 || categories.length === 0) {
    return {
      title: "Mulai Perjalanan Belajarmu",
      type: "info",
      description:
        "Belum tersedia cukup data untuk menganalisis performa. Selesaikan beberapa ujian agar GradeUp dapat menampilkan pola perkembangan belajarmu.",
      actionPlan: [
        "Mulai dengan satu paket ujian yang sesuai dengan jenjangmu.",
        "Periksa pembahasan setelah menyelesaikan ujian.",
        "Pantau perkembangan nilai setelah mengikuti beberapa evaluasi.",
      ],
    };
  }

  const best = [...categories].sort((a, b) => b.skor - a.skor)[0];
  const weakest = [...categories].sort((a, b) => a.skor - b.skor)[0];

  if (best.skor >= 85 && weakest.skor < 70 && best.kategori !== weakest.kategori) {
    return {
      title: "Ada Kategori yang Perlu Ditingkatkan",
      type: "warning",
      description: `Hasil terbaikmu ada pada kategori ${best.kategori} (${best.skor}%), sedangkan kategori ${weakest.kategori} masih ${weakest.skor}%. Fokus berikutnya adalah memperkuat kategori dengan nilai lebih rendah.`,
      actionPlan: [
        `Prioritaskan latihan pada kategori ${weakest.kategori}.`,
        "Gunakan pembahasan ujian untuk mengenali pola kesalahan.",
        "Lakukan evaluasi ulang setelah mempelajari materi terkait.",
      ],
    };
  }

  if (accuracy >= 85) {
    return {
      title: "Performa Evaluasi Sangat Baik",
      type: "success",
      description: `Akurasi jawabanmu mencapai ${accuracy}%. Hasil ini menunjukkan ketepatan yang sangat baik pada soal-soal yang telah dijawab.`,
      actionPlan: [
        "Pertahankan konsistensi belajar dan evaluasi secara berkala.",
        "Coba soal penalaran dan penerapan konsep.",
        "Perhatikan juga waktu pengerjaan agar semakin efisien.",
      ],
    };
  }

  if (accuracy >= 70) {
    return {
      title: "Perkembangan Belajar yang Positif",
      type: "balanced",
      description: `Akurasi jawaban berada di angka ${accuracy}%. Kamu sudah memiliki dasar yang cukup dan masih memiliki peluang untuk meningkatkan ketepatan.`,
      actionPlan: [
        "Ulas kembali soal yang pernah dijawab salah.",
        `Prioritaskan latihan pada kategori ${weakest.kategori}.`,
        "Lakukan latihan secara konsisten dan pantau perubahan nilai.",
      ],
    };
  }

  return {
    title: "Saatnya Memperkuat Pemahaman",
    type: "warning",
    description: `Akurasi jawaban saat ini ${accuracy}%. Hasil evaluasi menunjukkan bahwa beberapa konsep masih perlu dipelajari kembali.`,
    actionPlan: [
      `Mulai dengan mengevaluasi hasil ujian kategori ${weakest.kategori}.`,
      "Baca kembali materi pembelajaran sebelum mengerjakan evaluasi berikutnya.",
      "Pelajari penjelasan jawaban agar kesalahan yang sama tidak terulang.",
    ],
  };
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [scoreTrend, setScoreTrend] = useState<ScoreTrendData[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<
    CategoryPerformanceData[]
  >([]);
  const [answerBreakdown, setAnswerBreakdown] = useState<
    AnswerBreakdownData[]
  >([]);

  const [examStats, setExamStats] =
    useState<ExamStatistics>(emptyExamStatistics);

  const [profileStats, setProfileStats] = useState<ProfileStatistics>(
    emptyProfileStatistics,
  );

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
          throw new Error(
            "Sesi pengguna tidak ditemukan. Silakan masuk kembali.",
          );
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
            .eq("status", "completed")
            .order("created_at", { ascending: true }),

          supabase
            .from("exam_packages")
            .select("id, title, category, passing_score"),

          supabase
            .from("profiles")
            .select("total_xp, level, total_articles_read")
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

        const packageMap = new Map(
          packages.map((item) => [item.id, item]),
        );

        // Data profil
        if (!profileResult.error && profileResult.data) {
          const profile = profileResult.data;

          setProfileStats({
            totalXP: safeNumber(profile.total_xp),
            level: Math.max(1, safeNumber(profile.level, 1)),
            totalArticlesRead: safeNumber(profile.total_articles_read),
          });
        } else {
          setProfileStats(emptyProfileStatistics);
        }

        // Analisis hasil ujian yang telah selesai
        const categoryScores: Record<
          string,
          {
            totalScore: number;
            count: number;
            totalQuestions: number;
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

        const trend: ScoreTrendData[] = [];

        attempts.forEach((item: any) => {
          const score = Math.max(
            0,
            Math.min(100, safeNumber(item.score)),
          );

          // exam_attempts.exam_id mengarah ke exam_packages.id
          const examPackage = item.exam_id
            ? packageMap.get(item.exam_id)
            : undefined;

          const category = examPackage?.category || "Umum";
          const questionCount = getQuestionCount(item);

          const answerCounts = getAnswerCounts(item, questionCount);

          totalCorrect += answerCounts.correct;
          totalWrong += answerCounts.wrong;
          totalUnanswered += answerCounts.unanswered;
          totalQuestions += questionCount;
          totalScore += score;
          highestScore = Math.max(highestScore, score);

          const passingScore = safeNumber(
            examPackage?.passing_score,
            75,
          );

          const passed =
            typeof item.is_passed === "boolean"
              ? item.is_passed
              : score >= passingScore;

          if (passed) passCount += 1;

          if (!categoryScores[category]) {
            categoryScores[category] = {
              totalScore: 0,
              count: 0,
              totalQuestions: 0,
              correct: 0,
              wrong: 0,
            };
          }

          categoryScores[category].totalScore += score;
          categoryScores[category].count += 1;
          categoryScores[category].totalQuestions += questionCount;
          categoryScores[category].correct += answerCounts.correct;
          categoryScores[category].wrong += answerCounts.wrong;

          const createdAt = new Date(item.created_at);

          trend.push({
            tanggal: Number.isNaN(createdAt.getTime())
              ? "-"
              : createdAt.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                }),
            skor: score,
          });
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

        setCategoryPerformance(
          Object.entries(categoryScores)
            .map(([category, data]) => ({
              kategori: category,
              skor: data.count
                ? Math.round(data.totalScore / data.count)
                : 0,
              totalSoal: data.totalQuestions,
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
        const courseQueriesSucceeded =
          !progressResult.error &&
          !lessonsResult.error &&
          !modulesResult.error &&
          !coursesResult.error;

        if (courseQueriesSucceeded) {
          const progress = progressResult.data || [];
          const lessons = lessonsResult.data || [];
          const modules = modulesResult.data || [];
          const courses = coursesResult.data || [];

          const lessonIds = new Set(
            lessons.map((lesson) => lesson.id),
          );

          const completedLessonIds = new Set(
            progress
              .filter(
                (item: any) =>
                  item.is_completed && lessonIds.has(item.lesson_id),
              )
              .map((item: any) => item.lesson_id),
          );

          const moduleMap = new Map(
            modules.map((module) => [module.id, module]),
          );

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

          let completedCourses = 0;

          courseLessonCounts.forEach((count, courseId) => {
            if (
              count > 0 &&
              completedCourseLessonCounts.get(courseId) === count
            ) {
              completedCourses += 1;
            }
          });

          const courseXP = progress
            .filter(
              (item: any) =>
                item.is_completed && lessonIds.has(item.lesson_id),
            )
            .reduce(
              (sum: number, item: any) =>
                sum + safeNumber(item.xp_awarded),
              0,
            );

          setCourseStats({
            completedLessons: completedLessonIds.size,
            totalLessons: lessons.length,
            completedCourses,
            courseCount: courses.length,
            courseXP,
          });
        } else {
          setCourseStats(emptyCourseStatistics);
        }
      } catch (error) {
        console.error("Gagal memuat statistik belajar:", error);

        if (active) {
          setErrorMessage(
            error instanceof Error &&
              error.message.includes("Sesi pengguna")
              ? error.message
              : "Statistik belum dapat dimuat. Silakan coba muat ulang halaman.",
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
        categoryPerformance,
        accuracyRate,
        examStats.totalExams,
      ),
    [categoryPerformance, accuracyRate, examStats.totalExams],
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
                {profileStats.totalXP.toLocaleString("id-ID")}
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
            hint="Rata-rata seluruh ujian selesai"
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
              <div
                className={`mb-3 inline-flex rounded-xl p-2 ${item.bg} ${item.color}`}
              >
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
              <p className="text-xs text-muted-foreground">
                Kursus tersedia
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.completedLessons}
              </p>
              <p className="text-xs text-muted-foreground">
                Materi selesai
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.totalLessons}
              </p>
              <p className="text-xs text-muted-foreground">
                Total materi
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xl font-black text-foreground">
                {courseStats.completedCourses}
              </p>
              <p className="text-xs text-muted-foreground">
                Kursus tuntas
              </p>
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
              Berdasarkan seluruh materi yang terdaftar di GradeUp.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Statistik ini menghitung penyelesaian materi kursus.
              Aktivitas membaca artikel ditampilkan terpisah pada data profil.
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
                {profileStats.totalArticlesRead.toLocaleString("id-ID")}
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
                {examStats.passCount}
              </p>
              <p className="text-sm font-semibold text-foreground">
                Ujian lulus
              </p>
              <p className="text-xs text-muted-foreground">
                Berdasarkan hasil ujian yang telah selesai
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
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-foreground/90"
                >
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
            Peta Penguasaan Kategori Ujian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {categoryPerformance.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada data penguasaan kategori ujian.
            </p>
          ) : (
            categoryPerformance.map((item) => (
              <div
                key={item.kategori}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {item.kategori}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.ujian} ujian · {item.benar} benar · {item.salah} salah
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-black ${getScoreColor(item.skor)}`}
                    >
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
              description="Perubahan skor dari setiap ujian yang telah diselesaikan"
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
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    {...axisProps}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
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
                title="Perbandingan Skor per Kategori"
                description="Rata-rata nilai pada setiap kategori ujian"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryPerformance}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="kategori"
                      {...axisProps}
                      interval={0}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      {...axisProps}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
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
                        <Cell
                          key={index}
                          fill={pieColors[index % pieColors.length]}
                        />
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
