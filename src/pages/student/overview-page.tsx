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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BadgeCard } from "@/components/shared/badge-card";
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
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  is_premium_only: boolean;
}

interface ExamSchedule {
  id: string;
  title: string;
  time: string;
  instructor: string;
  dateStr: string;
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

export default function StudentOverviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  // State Gamifikasi
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeItem[]>([]);
  const [totalBadgesCount, setTotalBadgesCount] = useState(0);
  const [totalXp, setTotalXp] = useState(0);

  // State Statistik Real-Time
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [currentTargetExams, setCurrentTargetExams] = useState(10);

  // State Materi Saya (Dinamis dari Supabase)
  const [courses, setCourses] = useState<CourseItem[]>([]);

  // State Kalender & Jadwal
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  // State Aktivitas Mingguan
  const [weeklyData, setWeeklyData] = useState<DailyActivity[]>([
    { day: "Min", jam: 0 },
    { day: "Sen", jam: 0 },
    { day: "Sel", jam: 0 },
    { day: "Rab", jam: 0 },
    { day: "Kam", jam: 0 },
    { day: "Jum", jam: 0 },
    { day: "Sab", jam: 0 },
  ]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // Fetch data secara paralel termasuk materi/courses
        const [
          profRes,
          allBadgesRes,
          userBadgesRes,
          examsRes,
          allAttemptsRes,
          weeklyAttemptsRes,
          coursesRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("badges").select("*"),
          supabase
            .from("student_achievements")
            .select("badge_id, unlocked_at")
            .eq("user_id", user.id)
            .order("unlocked_at", { ascending: false }),
          supabase
            .from("exam_packages")
            .select("id, title, start_time, end_time, instructor_name, is_published")
            .eq("is_published", true)
            .not("start_time", "is", null)
            .order("start_time", { ascending: true })
            .limit(20),
          supabase.from("exam_attempts").select("submitted_at").eq("user_id", user.id),
          supabase
            .from("exam_attempts")
            .select("created_at, submitted_at, duration_seconds")
            .eq("user_id", user.id)
            .gte("created_at", startOfWeek.toISOString()),
          supabase
            .from("courses")
            .select("id, title, category, progress")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        // 1. Profil
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
            };
        setProfile(userProfile);

        const userTarget =
          userProfile.target_exams && userProfile.target_exams > 0
            ? userProfile.target_exams
            : 10;
        setCurrentTargetExams(userTarget);

        // 2. Badges & Gamifikasi
        const allBadges = allBadgesRes.data || [];
        const userBadges = userBadgesRes.data || [];
        setTotalBadgesCount(allBadges.length);

        const unlockedIds = new Set(userBadges.map((b) => b.badge_id));
        const unlockedList = allBadges.filter((b) => unlockedIds.has(b.id)).slice(0, 3);
        const xpSum = allBadges
          .filter((b) => unlockedIds.has(b.id))
          .reduce((acc, curr) => acc + (curr.xp_reward || 0), 0);

        setUnlockedBadges(unlockedList as BadgeItem[]);
        setTotalXp(xpSum);

        // 3. Materi Saya (Courses) Real-Time
        if (coursesRes.data && coursesRes.data.length > 0) {
          const fetchedCourses: CourseItem[] = coursesRes.data.map((item: any) => ({
            id: item.id,
            title: item.title || "Materi Belajar",
            category: item.category || "Umum",
            progress: item.progress ?? 0,
          }));
          setCourses(fetchedCourses);
        } else {
          // Fallback jika belum ada data di tabel courses
          setCourses([]);
        }

        // 4. Jadwal Ujian
        const examsData = examsRes.data || [];
        const formattedSchedules: ExamSchedule[] = examsData.map((exam) => {
          const start = new Date(exam.start_time);
          const end = exam.end_time ? new Date(exam.end_time) : null;
          const year = start.getFullYear();
          const month = String(start.getMonth() + 1).padStart(2, "0");
          const day = String(start.getDate()).padStart(2, "0");

          const startTimeStr = start.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const endTimeStr = end
            ? end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
            : "Selesai";

          return {
            id: exam.id,
            title: exam.title,
            time: `${startTimeStr} - ${endTimeStr} WIB`,
            instructor: exam.instructor_name || "Tim Academic GradeUp",
            dateStr: `${year}-${month}-${day}`,
          };
        });
        setSchedules(formattedSchedules);

        // 5. Attempts Statistik
        const allAttempts = allAttemptsRes.data || [];
        let completed = 0;
        let inProgress = 0;

        allAttempts.forEach((att) => {
          if (att.submitted_at) completed += 1;
          else inProgress += 1;
        });

        setCompletedCount(completed);
        setInProgressCount(inProgress);

        const calculatedPercentage = Math.min(
          100,
          Number(((completed / userTarget) * 100).toFixed(1))
        );
        setCompletionPercentage(calculatedPercentage);

        // 6. Aktivitas Mingguan
        const weeklyAttempts = weeklyAttemptsRes.data || [];
        const dayMap: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        weeklyAttempts.forEach((att) => {
          const date = new Date(att.created_at);
          const dayIndex = date.getDay();

          let durationInHours = 0.5;
          if (att.duration_seconds) {
            durationInHours = att.duration_seconds / 3600;
          } else if (att.submitted_at) {
            const start = new Date(att.created_at).getTime();
            const end = new Date(att.submitted_at).getTime();
            durationInHours = Math.max(0.1, (end - start) / (1000 * 3600));
          }

          dayMap[dayIndex] += Number(durationInHours.toFixed(1));
        });

        const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        setWeeklyData(
          dayLabels.map((label, index) => ({
            day: label,
            jam: dayMap[index],
          }))
        );
      } catch (err) {
        console.error("Gagal mengambil data overview:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverviewData();
  }, []);

  if (loading) return <PageSkeleton />;

  const studentName = profile?.full_name || "Siswa";
  const isPremium = profile?.is_premium || false;

  return (
    <div className="space-y-6">
      {/* Header Salam */}
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
                ? `Member Premium s/d ${new Date(profile.premium_until).toLocaleDateString("id-ID", {
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
            <Badge className="bg-amber-400/15 text-amber-500 border-amber-500/30 gap-1 font-bold py-1.5 px-3">
              <Crown className="h-4 w-4 fill-current" /> Premium
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => navigate("/pricing")}
            >
              <Sparkles className="h-4 w-4 text-amber-400" /> Upgrade Pro
            </Button>
          )}
        </div>
      </div>

      {/* Grid Utama 2-Kolom */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* KOLOM KIRI */}
        <div className="space-y-6 lg:col-span-2">
          {/* Grafik Aktivitas Belajar */}
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
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="lixcoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={CHART_COLORS.secondary}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART_COLORS.secondary}
                          stopOpacity={0.0}
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
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [`${Number(v)} jam`, "Waktu Belajar"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="jam"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#lixcoFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Statistik Progres */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">
                Statistik Progres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Ketercapaian Target ({completedCount} / {currentTargetExams} Ujian)
                  </p>
                  <p className="text-2xl font-black tracking-tight text-foreground">
                    {completionPercentage}%
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Target: {currentTargetExams} Ujian
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2.5" />

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="flex items-center justify-between rounded-xl bg-blue-500/10 p-3.5 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white font-bold">
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
                  <Badge variant="outline" className="bg-background text-[10px]">
                    In Progress
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-3.5 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">
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
                  <Badge variant="outline" className="bg-background text-[10px]">
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List Materi Saya (Dinamis) */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Materi Saya</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground hover:text-foreground"
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
                courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold leading-none">
                          {c.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:w-48">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>Progres</span>
                          <span>{c.progress}%</span>
                        </div>
                        <Progress value={c.progress} className="h-1.5" />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold shrink-0"
                        onClick={() => navigate(`/dashboard/courses`)}
                      >
                        Buka
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Gamifikasi & Badge */}
          <Card className="border-2 border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-transparent shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                Badge & Gamifikasi
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Link to="/dashboard/achievements">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5 border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Total Akumulasi XP
                    </p>
                    <p className="text-base font-extrabold text-emerald-400">
                      +{totalXp} XP
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium">
                    Badge Terbuka
                  </p>
                  <p className="text-base font-extrabold text-foreground">
                    {unlockedBadges.length}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      / {totalBadgesCount}
                    </span>
                  </p>
                </div>
              </div>

              {unlockedBadges.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Belum ada badge yang terbuka. Kerjakan ujian pertama untuk membuka badge!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {unlockedBadges.map((b) => (
                    <BadgeCard
                      key={b.id}
                      title={b.title}
                      description={b.description}
                      iconName={b.icon_name}
                      rarity={b.rarity}
                      xpReward={b.xp_reward}
                      isUnlocked={true}
                      isPremiumOnly={b.is_premium_only}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN */}
        <div className="space-y-6">
          {/* Mini Calendar Widget */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {currentMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground mb-2">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 w-full" />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const thisDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dateString = `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                  const isToday =
                    day === new Date().getDate() &&
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear();

                  const isSelected =
                    day === selectedDate.getDate() &&
                    currentMonth.getMonth() === selectedDate.getMonth() &&
                    currentMonth.getFullYear() === selectedDate.getFullYear();

                  const hasEvent = schedules.some((s) => s.dateStr === dateString);

                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => setSelectedDate(thisDate)}
                      className={`relative flex h-8 w-full items-center justify-center rounded-lg transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-black shadow-md scale-105"
                          : isToday
                          ? "bg-primary/20 text-primary font-bold border border-primary/40"
                          : "hover:bg-muted/70 text-foreground"
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
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  Jadwal Mendatang
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Link to="/dashboard/exams">Semua</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const day = String(selectedDate.getDate()).padStart(2, "0");
                const selDateStr = `${year}-${month}-${day}`;

                const activeSchedules = schedules.filter((s) => s.dateStr === selDateStr);

                if (activeSchedules.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Tidak ada agenda ujian pada tanggal ini.
                      </p>
                    </div>
                  );
                }

                return activeSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border p-3.5 space-y-1.5 hover:bg-muted/20 transition-colors"
                  >
                    <h5 className="text-sm font-bold leading-snug">{s.title}</h5>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" /> {s.time}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground pt-1">
                      👤 {s.instructor}
                    </p>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
