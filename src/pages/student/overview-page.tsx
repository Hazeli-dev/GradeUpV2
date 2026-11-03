
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Sparkles,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Zap,
  CalendarClock,
  PlayCircle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/shared/states";
import { initials } from "@/utils/format";
import { CHART_COLORS } from "@/constants";
import { supabase } from "@/lib/supabase";

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  is_premium: boolean;
  premium_until?: string | null;
  target_exams?: number | null;
  total_xp?: number;
  total_articles_read?: number;
  total_exams_passed?: number;
}

interface DynamicBadgeItem {
  id: string;
  category: "Membaca Materi" | "Ulangan Harian";
  tier: number;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  isUnlocked: boolean;
}

type ExamStatus = "upcoming" | "active" | "finished";

interface ExamSchedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  instructor: string;
  category: string;
  level: string;
  dateStr: string;
  status: ExamStatus;
}

interface DailyActivity {
  day: string;
  jam: number;
}

interface CourseItem {
  id: string;
  title: string;
  category: string;
  progress: number;
}

interface ExamAttempt {
  id: string;
  status: string | null;
  is_passed: boolean | null;
  created_at: string;
  score: number | null;
  duration_seconds: number | null;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const TIME_ZONE = "Asia/Jakarta";

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getJakartaDateKey(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("id-ID", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}

function formatCountdown(target: string, now: number): string {
  const difference = new Date(target).getTime() - now;

  if (difference <= 0) return "Segera dimulai";

  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);

  if (days > 0) return `${days} hari ${hours} jam lagi`;
  if (hours > 0) return `${hours} jam ${minutes} menit lagi`;

  return `${minutes} menit lagi`;
}

function getExamStatus(
  startTime: string,
  endTime: string | null,
  now: number
): ExamStatus {
  const start = new Date(startTime).getTime();

  if (Number.isNaN(start)) return "finished";
  if (now < start) return "upcoming";

  if (!endTime) return "active";

  const end = new Date(endTime).getTime();

  if (Number.isNaN(end)) return "active";

  return now <= end ? "active" : "finished";
}

function generateMultiTierBadges(
  articlesRead: number,
  examsPassed: number
): DynamicBadgeItem[] {
  const generated: DynamicBadgeItem[] = [];

  for (let tier = 1; tier <= 50; tier++) {
    const rarity: DynamicBadgeItem["rarity"] =
      tier > 35
        ? "legendary"
        : tier > 20
          ? "epic"
          : tier > 10
            ? "rare"
            : "common";

    generated.push({
      id: `reading-tier-${tier}`,
      category: "Membaca Materi",
      tier,
      title: `Pembaca Setia Lv. ${tier}`,
      description: `Selesaikan membaca total ${tier} materi pelajaran di platform GradeUp.`,
      targetCount: tier,
      currentCount: Math.min(articlesRead, tier),
      rarity,
      xp_reward: tier * 50,
      isUnlocked: articlesRead >= tier,
    });
  }

  for (let tier = 1; tier <= 50; tier++) {
    const rarity: DynamicBadgeItem["rarity"] =
      tier > 35
        ? "legendary"
        : tier > 20
          ? "epic"
          : tier > 10
            ? "rare"
            : "common";

    generated.push({
      id: `exam-tier-${tier}`,
      category: "Ulangan Harian",
      tier,
      title: `Pejuang Ujian Lv. ${tier}`,
      description: `Selesaikan total ${tier} paket ulangan harian dengan nilai tuntas.`,
      targetCount: tier,
      currentCount: Math.min(examsPassed, tier),
      rarity,
      xp_reward: tier * 100,
      isUnlocked: examsPassed >= tier,
    });
  }

  return generated;
}

function getStatusLabel(status: ExamStatus): string {
  if (status === "upcoming") return "Akan Datang";
  if (status === "active") return "Aktif";
  return "Selesai";
}

function getStatusClass(status: ExamStatus): string {
  if (status === "upcoming") {
    return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
  }

  if (status === "active") {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
  }

  return "bg-muted text-muted-foreground border-border";
}

export default function StudentOverviewPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const [unlockedBadges, setUnlockedBadges] = useState<DynamicBadgeItem[]>([]);
  const [totalBadgesCount, setTotalBadgesCount] = useState(100);
  const [totalXp, setTotalXp] = useState(0);

  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [currentTargetExams, setCurrentTargetExams] = useState(10);

  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  const [weeklyData, setWeeklyData] = useState<DailyActivity[]>(
    DAY_LABELS.map((day) => ({ day, jam: 0 }))
  );

  const [clockNow, setClockNow] = useState(Date.now());

  // Memperbarui countdown setiap menit.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const nextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    return {
      firstDay: new Date(year, month, 1).getDay(),
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  useEffect(() => {
    let cancelled = false;

    async function fetchAllAttempts(userId: string): Promise<ExamAttempt[]> {
      const pageSize = 1000;
      let from = 0;
      const allRows: ExamAttempt[] = [];

      while (true) {
        const { data, error } = await supabase
          .from("exam_attempts")
          .select(
            "id, status, is_passed, created_at, score, duration_seconds"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const rows = (data || []) as ExamAttempt[];
        allRows.push(...rows);

        if (rows.length < pageSize) break;

        from += pageSize;
      }

      return allRows;
    }

    async function fetchOverviewData() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const [
          profRes,
          examsRes,
          attempts,
          coursesRes,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, email, full_name, is_premium, premium_until, target_exams, total_xp, total_articles_read, total_exams_passed"
            )
            .eq("id", user.id)
            .single(),

          supabase
            .from("exam_packages")
            .select(
              "id, title, start_time, end_time, instructor_name, is_published, category, level"
            )
            .eq("is_published", true)
            .not("start_time", "is", null)
            .order("start_time", { ascending: true }),

          fetchAllAttempts(user.id),

          supabase
            .from("courses")
            .select("id, title, category, progress")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (cancelled) return;

        if (profRes.error && profRes.error.code !== "PGRST116") {
          throw profRes.error;
        }

        if (examsRes.error) throw examsRes.error;
        if (coursesRes.error) throw coursesRes.error;

        // PROFIL SISWA
        const profData = profRes.data;

        const userProfile: StudentProfile = profData
          ? (profData as StudentProfile)
          : {
              id: user.id,
              email: user.email || "",
              full_name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "Siswa",
              is_premium: false,
              target_exams: 10,
              total_xp: 0,
              total_articles_read: 0,
              total_exams_passed: 0,
            };

        setProfile(userProfile);

        const userTarget =
          userProfile.target_exams && userProfile.target_exams > 0
            ? userProfile.target_exams
            : 10;

        setCurrentTargetExams(userTarget);

        // BADGE DAN XP
        const articlesRead = Number(userProfile.total_articles_read || 0);
        const examsPassed = Number(userProfile.total_exams_passed || 0);
        const userXp = Number(userProfile.total_xp || 0);

        const allGeneratedBadges = generateMultiTierBadges(
          articlesRead,
          examsPassed
        );

        setUnlockedBadges(
          allGeneratedBadges.filter((badge) => badge.isUnlocked)
        );

        setTotalBadgesCount(allGeneratedBadges.length);
        setTotalXp(userXp);

        // MATERI
        const fetchedCourses: CourseItem[] = (coursesRes.data || []).map(
          (item: any) => ({
            id: item.id,
            title: item.title || "Materi Belajar",
            category: item.category || "Umum",
            progress: Math.min(
              100,
              Math.max(0, Number(item.progress ?? 0))
            ),
          })
        );

        setCourses(fetchedCourses);

        // JADWAL UJIAN
        const now = Date.now();

        const formattedSchedules: ExamSchedule[] = (examsRes.data || [])
          .filter((exam: any) => exam.start_time)
          .map((exam: any) => {
            const start = new Date(exam.start_time);

            return {
              id: exam.id,
              title: exam.title || "Ujian",
              start_time: exam.start_time,
              end_time: exam.end_time || null,
              instructor: exam.instructor_name || "Tim Academic GradeUp",
              category: exam.category || "Umum",
              level: exam.level || "Semua Jenjang",
              dateStr: getJakartaDateKey(start),
              status: getExamStatus(
                exam.start_time,
                exam.end_time || null,
                now
              ),
            };
          })
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          );

        setSchedules(formattedSchedules);

        // STATISTIK UJIAN
        let completed = 0;
        let inProgress = 0;
        let durationTotal = 0;

        attempts.forEach((attempt) => {
          const status = (attempt.status || "").toLowerCase();

          if (status === "completed" || attempt.is_passed === true) {
            completed += 1;
          } else if (
            status === "in_progress" ||
            status === "in-progress"
          ) {
            inProgress += 1;
          }

          durationTotal += Math.max(
            0,
            Number(attempt.duration_seconds || 0)
          );
        });

        setCompletedCount(completed);
        setInProgressCount(inProgress);
        setTotalDurationSeconds(durationTotal);

        setCompletionPercentage(
          Math.min(
            100,
            Number(((completed / userTarget) * 100).toFixed(1))
          )
        );

        // AKTIVITAS MINGGUAN DARI duration_seconds
        // Pengelompokan menggunakan tanggal pembuatan attempt dalam WIB.
        const todayKey = getJakartaDateKey(new Date());
        const todayDate = new Date(`${todayKey}T00:00:00Z`);
        const dayOfWeek = todayDate.getUTCDay();

        const weekStart = new Date(todayDate);
        weekStart.setUTCDate(todayDate.getUTCDate() - dayOfWeek);

        const weekStartKey = weekStart.toISOString().slice(0, 10);

        const dayMap = [0, 0, 0, 0, 0, 0, 0];

        attempts.forEach((attempt) => {
          if (!attempt.created_at) return;

          const attemptDateKey = getJakartaDateKey(attempt.created_at);

          if (attemptDateKey < weekStartKey || attemptDateKey > todayKey) {
            return;
          }

          const attemptDate = new Date(`${attemptDateKey}T00:00:00Z`);
          const dayIndex = attemptDate.getUTCDay();

          dayMap[dayIndex] += Math.max(
            0,
            Number(attempt.duration_seconds || 0)
          );
        });

        setWeeklyData(
          DAY_LABELS.map((day, index) => ({
            day,
            jam: Number((dayMap[index] / 3600).toFixed(2)),
          }))
        );
      } catch (error) {
        console.error("Gagal mengambil data overview:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOverviewData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageSkeleton />;

  const studentName = profile?.full_name || "Siswa";
  const isPremium = profile?.is_premium || false;

  const totalDurationLabel = formatDuration(totalDurationSeconds);

  // Jadwal untuk tanggal yang dipilih.
  const selectedDateKey = getDateKey(selectedDate);

  const selectedSchedules = schedules.filter(
    (schedule) => schedule.dateStr === selectedDateKey
  );

  // Ujian yang belum selesai, diurutkan berdasarkan waktu terdekat.
  const upcomingSchedules = schedules
    .filter(
      (schedule) =>
        schedule.status === "upcoming" ||
        schedule.status === "active"
    )
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
    );

  const nextExam = upcomingSchedules[0];

  const getRarityBadge = (rarity: DynamicBadgeItem["rarity"]) => {
    switch (rarity) {
      case "common":
        return (
          <Badge
            variant="outline"
            className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px]"
          >
            Common
          </Badge>
        );

      case "rare":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px]"
          >
            Rare
          </Badge>
        );

      case "epic":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]"
          >
            Epic
          </Badge>
        );

      case "legendary":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]"
          >
            Legendary
          </Badge>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SISWA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {initials(studentName)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Halo, {studentName} 👋
            </h1>

            <p className="text-xs text-muted-foreground">
              {isPremium && profile?.premium_until
                ? `Member Premium s/d ${new Date(
                    profile.premium_until
                  ).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Selamat datang kembali! Pantau ringkasan belajar Anda hari ini."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPremium ? (
            <Badge className="bg-amber-400/15 text-amber-600 border-amber-500/30 gap-1 font-bold py-1.5 px-3">
              <Crown className="h-4 w-4 fill-current" />
              Premium
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => navigate("/pricing")}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Upgrade Pro
            </Button>
          )}
        </div>
      </div>

      {/* PANEL UJIAN TERDEKAT */}
      {nextExam && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {nextExam.status === "active" ? (
                  <PlayCircle className="h-6 w-6" />
                ) : (
                  <CalendarClock className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {nextExam.status === "active"
                      ? "Ujian Sedang Berlangsung"
                      : "Ujian Berikutnya"}
                  </p>

                  <Badge
                    variant="outline"
                    className={getStatusClass(nextExam.status)}
                  >
                    {getStatusLabel(nextExam.status)}
                  </Badge>
                </div>

                <h2 className="text-base font-extrabold sm:text-lg">
                  {nextExam.title}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {nextExam.category} · {nextExam.level}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(nextExam.start_time).toLocaleDateString(
                    "id-ID",
                    {
                      timeZone: TIME_ZONE,
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                  {" · "}
                  {formatTime(nextExam.start_time)} WIB
                </p>

                <p className="mt-2 text-sm font-bold text-primary">
                  {nextExam.status === "upcoming"
                    ? formatCountdown(nextExam.start_time, clockNow)
                    : "Periksa halaman ujian untuk mengikuti ujian aktif."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/dashboard/exams")}
              className="shrink-0 gap-2"
            >
              Lihat Ujian
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KONTEN UTAMA */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* GRAFIK AKTIVITAS */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">
                  Aktivitas Belajar Saya
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                  Akumulasi durasi pengerjaan ujian minggu ini
                </p>
              </div>

              <Badge variant="outline" className="text-xs font-semibold">
                Mingguan
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -25,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="gradeUpActivityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART_COLORS.secondary}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART_COLORS.secondary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />

                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                      tickFormatter={(value) => `${value}j`}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [
                        `${Number(value).toFixed(2)} jam`,
                        "Durasi Ujian",
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="jam"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#gradeUpActivityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Total durasi seluruh ujian
                </p>
                <p className="text-sm font-extrabold text-primary">
                  {totalDurationLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* STATISTIK PROGRES */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">
                Statistik Progres
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Ketercapaian Target ({completedCount} /{" "}
                    {currentTargetExams} Ujian)
                  </p>

                  <p className="text-2xl font-black tracking-tight text-foreground">
                    {completionPercentage}%
                  </p>
                </div>

                <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Target: {currentTargetExams} Ujian
                </span>
              </div>

              <Progress value={completionPercentage} className="h-2.5" />

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
                      <Clock className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                        {inProgressCount}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Sedang Berjalan
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-background text-[10px]"
                  >
                    In Progress
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {completedCount}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Selesai Dikerjakan
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-background text-[10px]"
                  >
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MATERI SAYA */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">
                Materi Saya
              </CardTitle>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground"
              >
                <Link to="/dashboard/courses">Lihat Semua</Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {courses.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Belum ada materi yang tersedia.
                  </p>
                </div>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col gap-3 rounded-xl border p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div>
                        <h4 className="text-sm font-bold leading-none">
                          {course.title}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {course.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-48">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>Progres</span>
                          <span>{course.progress}%</span>
                        </div>

                        <Progress
                          value={course.progress}
                          className="h-1.5"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs font-semibold"
                        onClick={() => navigate("/dashboard/courses")}
                      >
                        Buka
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* BADGE DAN GAMIFIKASI */}
          <Card className="border-2 border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-transparent shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                <Trophy className="h-5 w-5 text-amber-400" />
                Badge & Gamifikasi
              </CardTitle>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground"
              >
                <Link to="/dashboard/achievements">Lihat Semua</Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/15 text-amber-500">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Akumulasi XP
                    </p>
                    <p className="text-base font-extrabold text-emerald-500">
                      +{totalXp} XP
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground">
                    Badge Terbuka
                  </p>
                  <p className="text-base font-extrabold">
                    {unlockedBadges.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {totalBadgesCount}
                    </span>
                  </p>
                </div>
              </div>

              {unlockedBadges.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Belum ada badge yang terbuka. Kerjakan ujian atau baca
                    materi untuk membuka badge!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {unlockedBadges.slice(0, 4).map((badge) => (
                    <button
                      type="button"
                      key={badge.id}
                      onClick={() => navigate("/dashboard/achievements")}
                      className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-card p-3.5 text-left shadow-sm transition-all hover:scale-[1.01] hover:border-emerald-500/80"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-500">
                        {badge.category === "Membaca Materi" ? (
                          <BookOpen className="h-5 w-5" />
                        ) : (
                          <Zap className="h-5 w-5 fill-current" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="truncate text-xs font-bold leading-snug">
                            {badge.title}
                          </h5>
                          {getRarityBadge(badge.rarity)}
                        </div>

                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-extrabold text-emerald-500">
                          <Zap className="h-3 w-3 fill-current" />
                          +{badge.xp_reward} XP
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR KALENDER DAN JADWAL */}
        <div className="space-y-6">
          {/* KALENDER */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {currentMonth.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={prevMonth}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={nextMonth}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground">
                {DAY_LABELS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                {Array.from({ length: firstDay }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="h-8 w-full"
                  />
                ))}

                {Array.from(
                  { length: daysInMonth },
                  (_, index) => index + 1
                ).map((day) => {
                  const thisDate = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  );

                  const dateString = getDateKey(thisDate);

                  const today = new Date();
                  const isToday = dateString === getDateKey(today);
                  const isSelected =
                    dateString === getDateKey(selectedDate);

                  const hasEvent = schedules.some(
                    (schedule) => schedule.dateStr === dateString
                  );

                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => setSelectedDate(thisDate)}
                      aria-label={`${day} ${currentMonth.toLocaleDateString(
                        "id-ID",
                        { month: "long", year: "numeric" }
                      )}${hasEvent ? ", ada jadwal ujian" : ""}`}
                      className={`relative flex h-8 w-full items-center justify-center rounded-lg transition-all ${
                        isSelected
                          ? "scale-105 bg-primary font-black text-primary-foreground shadow-md"
                          : isToday
                            ? "border border-primary/40 bg-primary/20 font-bold text-primary"
                            : "text-foreground hover:bg-muted/70"
                      }`}
                    >
                      {day}

                      {hasEvent && !isSelected && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] text-muted-foreground">
                  Terdapat jadwal ujian
                </p>
              </div>
            </CardContent>
          </Card>

          {/* JADWAL TANGGAL TERPILIH */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  Jadwal Ujian
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground"
              >
                <Link to="/dashboard/exams">Semua</Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {selectedSchedules.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <CalendarIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Tidak ada agenda ujian pada tanggal ini.
                  </p>
                </div>
              ) : (
                selectedSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="space-y-2 rounded-xl border p-3.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-bold leading-snug">
                        {schedule.title}
                      </h5>

                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${getStatusClass(
                          schedule.status
                        )}`}
                      >
                        {getStatusLabel(schedule.status)}
                      </Badge>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                      {formatTime(schedule.start_time)} WIB
                      {schedule.end_time
                        ? ` - ${formatTime(schedule.end_time)} WIB`
                        : " - Waktu akhir belum ditentukan"}
                    </p>

                    <p className="text-[11px] font-medium text-muted-foreground">
                      {schedule.category} · {schedule.level}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      Pengajar: {schedule.instructor}
                    </p>

                    {schedule.status === "upcoming" && (
                      <p className="text-xs font-bold text-primary">
                        {formatCountdown(schedule.start_time, clockNow)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* RINGKASAN JADWAL */}
          <Card className="border shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Akan Datang
                  </span>
                </div>
                <span className="text-sm font-extrabold">
                  {schedules.filter((item) => item.status === "upcoming").length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Sedang Aktif
                  </span>
                </div>
                <span className="text-sm font-extrabold">
                  {schedules.filter((item) => item.status === "active").length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Selesai
                  </span>
                </div>
                <span className="text-sm font-extrabold">
                  {schedules.filter((item) => item.status === "finished").length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
