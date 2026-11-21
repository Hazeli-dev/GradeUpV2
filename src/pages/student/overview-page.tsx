import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Award,
  BookOpen,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
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
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";

// ======================================================
// TYPES
// ======================================================

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  plan: string | null;
  is_premium: boolean;
  premium_until: string | null;
  target_exams: number;
  total_xp: number;
  total_exams_passed: number;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  category: string;
  rarity: string;
  xp_reward: number;
  earned_at: string;
}

interface CourseItem {
  id: string;
  title: string;
  category: string;
  status: string | null;
}

interface ExamSchedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  instructor: string;
  category: string;
  level: string;
  dateStr: string;
}

interface ExamAttempt {
  id: string;
  status: string | null;
  is_passed: boolean | null;
  created_at: string | null;
  score: number | null;
  duration_seconds: number | null;
}

interface DailyActivity {
  day: string;
  jam: number;
}

type ExamStatus = "upcoming" | "active" | "finished";

// ======================================================
// CONSTANTS
// ======================================================

const DAY_LABELS = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
];

const TIME_ZONE = "Asia/Jakarta";

// ======================================================
// TAMPILAN (murni visual, tidak memengaruhi logika)
// ======================================================

const cardGlass =
  "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_12px_36px_-24px_rgba(15,118,110,0.35)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80";

const headingText = "text-slate-950 dark:text-white";

const listItem =
  "rounded-2xl border border-slate-200/80 bg-white/70 transition-colors duration-300 hover:border-emerald-300/80 hover:bg-emerald-50/70 dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:border-emerald-700/70 dark:hover:bg-emerald-950/40";

const outlineBtn =
  "rounded-xl border-slate-300 text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800";

const ghostLink =
  "rounded-xl text-xs font-semibold text-teal-700 hover:bg-emerald-50 hover:text-teal-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200";

const primaryBtn =
  "rounded-xl bg-teal-700 font-bold text-white shadow-md shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400";

const accentTones = {
  emerald: "via-emerald-400/70",
  teal: "via-teal-400/70",
  amber: "via-amber-400/70",
  blue: "via-blue-400/60",
  slate: "via-slate-400/50",
} as const;

/** Garis aksen tipis di tepi atas kartu, warna berbeda per kartu. */
function CardAccent({
  tone = "emerald",
}: {
  tone?: keyof typeof accentTones;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${accentTones[tone]} to-transparent`}
    />
  );
}

// ======================================================
// HELPERS
// ======================================================

function getJakartaDateKey(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";

  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);

  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;

  return hours > 0
    ? `${hours} jam ${remainingMinutes} menit`
    : `${remainingMinutes} menit`;
}

function formatCountdown(target: string, now: number): string {
  const difference = new Date(target).getTime() - now;

  if (difference <= 0) {
    return "Segera dimulai";
  }

  const days = Math.floor(difference / 86400000);

  const hours = Math.floor(
    (difference % 86400000) / 3600000
  );

  const minutes = Math.floor(
    (difference % 3600000) / 60000
  );

  if (days > 0) {
    return `${days} hari ${hours} jam lagi`;
  }

  if (hours > 0) {
    return `${hours} jam ${minutes} menit lagi`;
  }

  return `${minutes} menit lagi`;
}

function getExamStatus(
  startTime: string,
  endTime: string | null,
  now: number
): ExamStatus {
  const start = new Date(startTime).getTime();

  if (Number.isNaN(start)) {
    return "finished";
  }

  if (now < start) {
    return "upcoming";
  }

  if (!endTime) {
    return "active";
  }

  const end = new Date(endTime).getTime();

  if (Number.isNaN(end)) {
    return "active";
  }

  return now <= end ? "active" : "finished";
}

function getStatusLabel(status: ExamStatus): string {
  if (status === "upcoming") return "Akan Datang";

  if (status === "active") return "Aktif";

  return "Selesai";
}

function getStatusClass(status: ExamStatus): string {
  if (status === "upcoming") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }

  if (status === "active") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }

  return "border-border bg-muted text-muted-foreground";
}

function getBadgeIcon(iconName: string, category: string) {
  const name = (iconName || "").toLowerCase();

  const categoryName = (category || "").toLowerCase();

  if (
    name.includes("book") ||
    categoryName.includes("baca")
  ) {
    return <BookOpen className="h-5 w-5" />;
  }

  if (
    name.includes("trophy") ||
    categoryName.includes("ujian")
  ) {
    return <Trophy className="h-5 w-5" />;
  }

  if (
    name.includes("zap") ||
    name.includes("xp")
  ) {
    return <Zap className="h-5 w-5 fill-current" />;
  }

  return <Award className="h-5 w-5" />;
}

// ======================================================
// COMPONENT
// ======================================================

export default function StudentOverviewPage() {
  const navigate = useNavigate();

  const { openUpgrade } = useUpgradeModal();

  const [loading, setLoading] = useState(true);

  const [profile, setProfile] =
    useState<StudentProfile | null>(null);

  const [totalXp, setTotalXp] = useState(0);

  const [unlockedBadges, setUnlockedBadges] =
    useState<BadgeItem[]>([]);

  const [totalBadgesCount, setTotalBadgesCount] =
    useState(0);

  const [courses, setCourses] =
    useState<CourseItem[]>([]);

  const [schedules, setSchedules] =
    useState<ExamSchedule[]>([]);

  const [weeklyData, setWeeklyData] =
    useState<DailyActivity[]>(
      DAY_LABELS.map((day) => ({
        day,
        jam: 0,
      }))
    );

  const [inProgressCount, setInProgressCount] =
    useState(0);

  const [completedCount, setCompletedCount] =
    useState(0);

  const [completionPercentage, setCompletionPercentage] =
    useState(0);

  const [currentTargetExams, setCurrentTargetExams] =
    useState(10);

  const [totalDurationSeconds, setTotalDurationSeconds] =
    useState(0);

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  const [clockNow, setClockNow] =
    useState(Date.now());

  // ====================================================
  // CLOCK
  // ====================================================

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  // ====================================================
  // CALENDAR
  // ====================================================

  const monthInfo = useMemo(
    () => ({
      firstDay: new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      ).getDay(),

      daysInMonth: new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      ).getDate(),
    }),
    [currentMonth]
  );

  // ====================================================
  // FETCH ALL EXAM ATTEMPTS
  // ====================================================

  async function fetchAllAttempts(
    userId: string
  ): Promise<ExamAttempt[]> {
    const pageSize = 1000;

    let from = 0;

    const rows: ExamAttempt[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select(
          "id,status,is_passed,created_at,score,duration_seconds"
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const page = (data ?? []) as ExamAttempt[];

      rows.push(...page);

      if (page.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return rows;
  }

  // ====================================================
  // FETCH DASHBOARD DATA
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function fetchOverviewData() {
      setLoading(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (!cancelled) {
            navigate("/login");
          }

          return;
        }

        const [
          profileResult,
          examsResult,
          attempts,
          coursesResult,
          achievementsResult,
          badgesResult,
        ] = await Promise.all([
          // PROFILE
          supabase
            .from("profiles")
            .select(
              "id,email,full_name,plan,is_premium,premium_until,target_exams,total_xp,total_exams_passed"
            )
            .eq("id", user.id)
            .maybeSingle(),

          // EXAM SCHEDULE
          supabase
            .from("exam_packages")
            .select(
              "id,title,start_time,end_time,instructor_name,is_published,category,level"
            )
            .eq("is_published", true)
            .not("start_time", "is", null)
            .order("start_time", {
              ascending: true,
            }),

          // EXAM ATTEMPTS
          fetchAllAttempts(user.id),

          // AVAILABLE COURSES
          supabase
            .from("courses")
            .select("id,title,category,status")
            .order("created_at", {
              ascending: false,
            })
            .limit(3),

          // STUDENT ACHIEVEMENTS
          supabase
            .from("student_achievements")
            .select("badge_id,earned_at")
            .eq("user_id", user.id),

          // BADGE CATALOG
          supabase
            .from("badges")
            .select(
              "id,title,description,icon_name,category,rarity,xp_reward,is_premium_only,required_value"
            ),
        ]);

        if (cancelled) return;

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (examsResult.error) {
          throw examsResult.error;
        }

        if (coursesResult.error) {
          throw coursesResult.error;
        }

        if (achievementsResult.error) {
          throw achievementsResult.error;
        }

        if (badgesResult.error) {
          throw badgesResult.error;
        }

        // ----------------------------------------------
        // PROFILE
        // ----------------------------------------------

        const rawProfile = profileResult.data;

        const nextProfile: StudentProfile = rawProfile
          ? {
              id: rawProfile.id,

              email:
                rawProfile.email ??
                user.email ??
                "",

              full_name:
                rawProfile.full_name ||
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "Siswa",

              plan: rawProfile.plan ?? "Free",

              is_premium:
                rawProfile.is_premium === true,

              premium_until:
                rawProfile.premium_until ?? null,

              target_exams:
                Number(rawProfile.target_exams ?? 10),

              total_xp:
                Number(rawProfile.total_xp ?? 0),

              total_exams_passed:
                Number(
                  rawProfile.total_exams_passed ?? 0
                ),
            }
          : {
              id: user.id,
              email: user.email ?? "",
              full_name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "Siswa",
              plan: "Free",
              is_premium: false,
              premium_until: null,
              target_exams: 10,
              total_xp: 0,
              total_exams_passed: 0,
            };

        setProfile(nextProfile);

        setTotalXp(nextProfile.total_xp);

        const target =
          nextProfile.target_exams > 0
            ? nextProfile.target_exams
            : 10;

        setCurrentTargetExams(target);

        // ----------------------------------------------
        // REAL BADGES
        // ----------------------------------------------

        const badgeCatalog = (badgesResult.data ??
          []) as Array<{
          id: string;
          title: string | null;
          description: string | null;
          icon_name: string | null;
          category: string | null;
          rarity: string | null;
          xp_reward: number | null;
        }>;

        const earnedRows = (
          achievementsResult.data ?? []
        ) as Array<{
          badge_id: string;
          earned_at: string | null;
        }>;

        const earnedMap = new Map(
          earnedRows.map((row) => [
            row.badge_id,
            row.earned_at,
          ])
        );

        setTotalBadgesCount(badgeCatalog.length);

        setUnlockedBadges(
          badgeCatalog
            .filter((badge) =>
              earnedMap.has(badge.id)
            )
            .map((badge) => ({
              id: badge.id,
              title: badge.title || "Badge",
              description: badge.description || "",
              icon_name: badge.icon_name || "",
              category: badge.category || "Umum",
              rarity: badge.rarity || "common",
              xp_reward: Number(
                badge.xp_reward ?? 0
              ),
              earned_at:
                earnedMap.get(badge.id) || "",
            }))
        );

        // ----------------------------------------------
        // COURSES
        // ----------------------------------------------

        setCourses(
          (coursesResult.data ?? []).map((course) => ({
            id: course.id,
            title: course.title || "Materi Belajar",
            category: course.category || "Umum",
            status: course.status ?? null,
          }))
        );

        // ----------------------------------------------
        // EXAM SCHEDULES
        // ----------------------------------------------

        setSchedules(
          (examsResult.data ?? [])
            .filter(
              (exam) =>
                exam.start_time &&
                !Number.isNaN(
                  new Date(exam.start_time).getTime()
                )
            )
            .map((exam) => ({
              id: exam.id,
              title: exam.title || "Ujian",
              start_time: exam.start_time,
              end_time: exam.end_time ?? null,
              instructor:
                exam.instructor_name ||
                "Tim Academic GradeUp",
              category: exam.category || "Umum",
              level: exam.level || "Semua Jenjang",
              dateStr: getJakartaDateKey(
                exam.start_time
              ),
            }))
            .sort(
              (a, b) =>
                new Date(a.start_time).getTime() -
                new Date(b.start_time).getTime()
            )
        );

        // ----------------------------------------------
        // WEEKLY PERIOD (WIB)
        // ----------------------------------------------

        const todayKey = getJakartaDateKey(new Date());

        const todayUtc = new Date(`${todayKey}T00:00:00Z`);

        const weekStart = new Date(todayUtc);

        weekStart.setUTCDate(
          todayUtc.getUTCDate() - todayUtc.getUTCDay()
        );

        const weekStartKey = weekStart
          .toISOString()
          .slice(0, 10);

        // ----------------------------------------------
        // WEEKLY EXAM STATISTICS
        // ----------------------------------------------

        let completed = 0;
        let inProgress = 0;
        let durationTotal = 0;

        const secondsByDay = Array(7).fill(0) as number[];

        attempts.forEach((attempt) => {
          const status = (
            attempt.status ?? ""
          ).toLowerCase();

          const isOngoing =
            status === "in_progress" ||
            status === "in-progress" ||
            status === "started";

          // Ujian yang masih berjalan tetap ditampilkan
          // berdasarkan status saat ini.
          if (isOngoing) {
            inProgress += 1;
          }

          if (!attempt.created_at) return;

          const key = getJakartaDateKey(
            attempt.created_at
          );

          // Hanya aktivitas minggu berjalan yang dihitung
          if (key < weekStartKey || key > todayKey) {
            return;
          }

          const index = new Date(
            `${key}T00:00:00Z`
          ).getUTCDay();

          const duration = Math.max(
            0,
            Number(attempt.duration_seconds ?? 0)
          );

          secondsByDay[index] += duration;

          durationTotal += duration;

          if (
            status === "completed" ||
            status === "finished"
          ) {
            completed += 1;
          }
        });

        setCompletedCount(completed);

        setInProgressCount(inProgress);

        setTotalDurationSeconds(durationTotal);

        // Target dihitung dari ujian selesai minggu ini
        setCompletionPercentage(
          Math.min(
            100,
            Number(
              ((completed / target) * 100).toFixed(1)
            )
          )
        );

        // ----------------------------------------------
        // WEEKLY ACTIVITY CHART
        // ----------------------------------------------

        setWeeklyData(
          DAY_LABELS.map((day, index) => ({
            day,
            jam: Number(
              (secondsByDay[index] / 3600).toFixed(2)
            ),
          }))
        );
      } catch (error) {
        console.error(
          "Gagal memuat dashboard siswa:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOverviewData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return <PageSkeleton />;
  }

  // ====================================================
  // PREMIUM VALIDATION
  // ====================================================

  const premiumUntil = profile?.premium_until
    ? new Date(profile.premium_until).getTime()
    : 0;

  const isPremium = Boolean(
    profile?.plan === "Premium" &&
      profile?.is_premium === true &&
      Number.isFinite(premiumUntil) &&
      premiumUntil > clockNow
  );

  const studentName =
    profile?.full_name || "Siswa";

  // ====================================================
  // SCHEDULE DATA
  // ====================================================

  const selectedDateKey =
    getJakartaDateKey(selectedDate);

  const schedulesWithStatus = schedules.map(
    (schedule) => ({
      ...schedule,
      status: getExamStatus(
        schedule.start_time,
        schedule.end_time,
        clockNow
      ),
    })
  );

  const selectedSchedules = schedulesWithStatus
    .filter(
      (schedule) =>
        schedule.dateStr === selectedDateKey
    )
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
    );

  const upcomingSchedules = schedulesWithStatus
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

  const upcomingCount =
    schedulesWithStatus.filter(
      (item) => item.status === "upcoming"
    ).length;

  const activeCount =
    schedulesWithStatus.filter(
      (item) => item.status === "active"
    ).length;

  const finishedCount =
    schedulesWithStatus.filter(
      (item) => item.status === "finished"
    ).length;

  // ====================================================
  // BADGE RARITY
  // ====================================================

  const rarityBadge = (rarity: string) => {
    const styles: Record<string, string> = {
      common:
        "border-slate-500/20 bg-slate-500/10 text-slate-500",

      rare:
        "border-blue-500/30 bg-blue-500/15 text-blue-500",

      epic:
        "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",

      legendary:
        "border-amber-500/30 bg-amber-500/15 text-amber-500",
    };

    const normalized = rarity.toLowerCase();

    return (
      <Badge
        variant="outline"
        className={`text-[10px] ${
          styles[normalized] || styles.common
        }`}
      >
        {normalized.charAt(0).toUpperCase() +
          normalized.slice(1)}
      </Badge>
    );
  };

  // ====================================================
  // CALENDAR NAVIGATION
  // ====================================================

  const changeMonth = (amount: number) => {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1
        )
    );
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-[#0f3324] via-[#174b34] to-[#1e6842] p-5 text-white shadow-[0_30px_80px_-40px_rgba(6,78,59,0.7)] ring-1 ring-inset ring-white/10 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(52,211,153,0.25),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(20,184,166,0.22),transparent_45%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(167,243,208,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(167,243,208,0.08)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_right,#000,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full border border-emerald-300/30"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-10 -z-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-emerald-300/60 shadow-lg shadow-emerald-950/30">
              <AvatarFallback className="bg-emerald-400 font-bold text-[#123b29]">
                {initials(studentName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Halo, {studentName} 👋
              </h1>

              <p className="mt-1 text-xs leading-5 text-emerald-100/80 sm:text-sm">
                {isPremium && profile?.premium_until
                  ? `Member Premium s/d ${new Date(
                      profile.premium_until
                    ).toLocaleDateString("id-ID", {
                      timeZone: TIME_ZONE,
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : "Selamat datang kembali! Pantau ringkasan belajar Anda hari ini."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
                  <Zap className="h-3 w-3 fill-current text-amber-300" />
                  +{totalXp} XP
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  {completedCount} / {currentTargetExams} ujian minggu ini
                </span>
              </div>
            </div>
          </div>

          {isPremium ? (
            <Badge className="shrink-0 gap-1 self-start border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 font-bold text-amber-200 sm:self-center">
              <Crown className="h-4 w-4 fill-current" />
              Premium
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 self-start rounded-xl border-emerald-300/40 bg-white/10 font-bold text-white transition-colors duration-300 hover:border-emerald-200/60 hover:bg-white/20 hover:text-white sm:self-center"
              onClick={openUpgrade}
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              Upgrade Premium
            </Button>
          )}
        </div>
      </div>

      {/* NEXT EXAM */}

      {nextExam && (
        <Card className="relative overflow-hidden rounded-3xl border border-emerald-300/60 bg-gradient-to-r from-emerald-100/80 via-white/90 to-white/90 shadow-[0_14px_40px_-26px_rgba(15,118,110,0.45)] backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/60 dark:via-slate-900/85 dark:to-slate-900/85">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-teal-600 to-emerald-400"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10"
          />

          <CardContent className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 text-white shadow-md shadow-teal-700/25 dark:from-emerald-500 dark:to-teal-400 dark:text-slate-950">
                {nextExam.status === "active" ? (
                  <PlayCircle className="h-6 w-6" />
                ) : (
                  <CalendarClock className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-emerald-300">
                    {nextExam.status === "active"
                      ? "Ujian Sedang Berlangsung"
                      : "Ujian Berikutnya"}
                  </p>

                  <Badge
                    variant="outline"
                    className={getStatusClass(
                      nextExam.status
                    )}
                  >
                    {getStatusLabel(nextExam.status)}
                  </Badge>
                </div>

                <h2
                  className={`text-base font-extrabold sm:text-lg ${headingText}`}
                >
                  {nextExam.title}
                </h2>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {nextExam.category} · {nextExam.level}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-emerald-400" />
                  {formatDate(nextExam.start_time)} ·{" "}
                  {formatTime(nextExam.start_time)} WIB
                </p>

                <p className="mt-2 text-sm font-bold text-teal-700 dark:text-emerald-300">
                  {nextExam.status === "upcoming"
                    ? formatCountdown(
                        nextExam.start_time,
                        clockNow
                      )
                    : "Periksa halaman ujian untuk mengikuti ujian aktif."}
                </p>
              </div>
            </div>

            <Button
              onClick={() =>
                navigate("/dashboard/exams")
              }
              className={`shrink-0 gap-2 ${primaryBtn}`}
            >
              Lihat Ujian
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MAIN GRID */}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT CONTENT */}

        <div className="space-y-6 lg:col-span-2">
          {/* WEEKLY ACTIVITY */}

          <Card className={cardGlass}>
            <CardAccent tone="emerald" />

            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle
                  className={`text-base font-bold ${headingText}`}
                >
                  Aktivitas Belajar Saya
                </CardTitle>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Akumulasi durasi pengerjaan ujian minggu ini
                </p>
              </div>

              <Badge
                variant="outline"
                className="border-teal-200/80 bg-teal-50 text-xs font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200"
              >
                Mingguan
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="rounded-2xl border border-emerald-100/70 bg-emerald-50/40 p-2 dark:border-slate-800 dark:bg-slate-950/30">
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
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
                        tickFormatter={(value) =>
                          `${value}j`
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor:
                            "hsl(var(--card))",
                          borderColor:
                            "hsl(var(--border))",
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
              </div>
            </CardContent>
          </Card>

          {/* STATISTICS */}

          <Card className={cardGlass}>
            <CardAccent tone="teal" />

            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base font-bold ${headingText}`}
              >
                Statistik Progres
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Target Mingguan ({completedCount} / {currentTargetExams} Ujian)
                  </p>

                  <p
                    className={`text-2xl font-black tracking-tight ${headingText}`}
                  >
                    {completionPercentage}%
                  </p>
                </div>

                <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Target: {currentTargetExams} Ujian
                </span>
              </div>

              <Progress
                value={completionPercentage}
                className="h-2.5 bg-emerald-100 dark:bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-teal-600 [&>div]:to-emerald-400"
              />

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/[0.03] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white shadow-md shadow-blue-500/25">
                      <Clock className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                        {inProgressCount}
                      </p>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Sedang Berjalan
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-background/70 text-[10px]"
                  >
                    In Progress
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.03] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {completedCount}
                      </p>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Ujian Selesai Minggu Ini
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-background/70 text-[10px]"
                  >
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AVAILABLE COURSES */}

          <Card className={cardGlass}>
            <CardAccent tone="emerald" />

            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle
                className={`text-base font-bold ${headingText}`}
              >
                Materi Tersedia
              </CardTitle>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className={ghostLink}
              >
                <Link to="/dashboard/courses">
                  Lihat Semua
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-300/70 bg-white/50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum ada materi yang tersedia.
                  </p>
                </div>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between ${listItem}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold leading-none ${headingText}`}
                        >
                          {course.title}
                        </h4>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {course.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {course.status || "Tersedia"}
                      </Badge>

                      <Button
                        size="sm"
                        variant="outline"
                        className={`shrink-0 text-xs font-semibold ${outlineBtn}`}
                        onClick={() =>
                          navigate(
                            `/dashboard/courses/${course.id}`
                          )
                        }
                      >
                        Buka
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* BADGES */}

          <Card className="relative overflow-hidden rounded-3xl border border-emerald-300/50 bg-gradient-to-b from-emerald-100/70 via-white/85 to-white/85 shadow-[0_14px_40px_-26px_rgba(15,118,110,0.4)] backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/50 dark:via-slate-900/80 dark:to-slate-900/80">
            <CardAccent tone="amber" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-400/10"
            />

            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle
                className={`flex items-center gap-2 text-base font-extrabold ${headingText}`}
              >
                <Trophy className="h-5 w-5 text-amber-400" />
                Badge & Gamifikasi
              </CardTitle>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className={ghostLink}
              >
                <Link to="/dashboard/achievements">
                  Lihat Semua
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/15 text-amber-500">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total Akumulasi XP
                    </p>

                    <p className="text-base font-extrabold text-emerald-500">
                      +{totalXp} XP
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Badge Terbuka
                  </p>

                  <p
                    className={`text-base font-extrabold ${headingText}`}
                  >
                    {unlockedBadges.length}

                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {" "}
                      / {totalBadgesCount}
                    </span>
                  </p>
                </div>
              </div>

              {unlockedBadges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-300/70 bg-white/50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum ada badge yang terbuka.
                    Selesaikan tantangan untuk memperoleh badge!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {unlockedBadges
                    .slice(0, 4)
                    .map((badge) => (
                      <button
                        type="button"
                        key={badge.id}
                        onClick={() =>
                          navigate(
                            "/dashboard/achievements"
                          )
                        }
                        className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-white/80 p-3.5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/80 hover:shadow-lg hover:shadow-emerald-900/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-slate-900/70"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-500">
                          {getBadgeIcon(
                            badge.icon_name,
                            badge.category
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5
                              className={`truncate text-xs font-bold leading-snug ${headingText}`}
                            >
                              {badge.title}
                            </h5>

                            {rarityBadge(badge.rarity)}
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

        {/* RIGHT CONTENT */}

        <div className="space-y-6">
          {/* CALENDAR */}

          <Card className={cardGlass}>
            <CardAccent tone="teal" />

            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle
                className={`flex items-center gap-2 text-sm font-bold ${headingText}`}
              >
                <CalendarIcon className="h-4 w-4 text-teal-600 dark:text-emerald-400" />

                {currentMonth.toLocaleDateString(
                  "id-ID",
                  {
                    timeZone: TIME_ZONE,
                    month: "long",
                    year: "numeric",
                  }
                )}
              </CardTitle>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                  onClick={() => changeMonth(-1)}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                  onClick={() => changeMonth(1)}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {DAY_LABELS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                {Array.from({
                  length: monthInfo.firstDay,
                }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="h-8 w-full"
                  />
                ))}

                {Array.from(
                  {
                    length: monthInfo.daysInMonth,
                  },
                  (_, index) => index + 1
                ).map((day) => {
                  const date = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  );

                  const dateKey =
                    getJakartaDateKey(date);

                  const isToday =
                    dateKey ===
                    getJakartaDateKey(new Date());

                  const isSelected =
                    dateKey === selectedDateKey;

                  const hasEvent = schedules.some(
                    (schedule) =>
                      schedule.dateStr === dateKey
                  );

                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() =>
                        setSelectedDate(date)
                      }
                      aria-label={`${day} ${currentMonth.toLocaleDateString(
                        "id-ID",
                        {
                          month: "long",
                          year: "numeric",
                        }
                      )}${
                        hasEvent
                          ? ", ada jadwal ujian"
                          : ""
                      }`}
                      className={`relative flex h-8 w-full items-center justify-center rounded-lg transition-all ${
                        isSelected
                          ? "scale-105 bg-gradient-to-br from-teal-700 to-emerald-500 font-black text-white shadow-md shadow-teal-700/30 dark:from-emerald-500 dark:to-teal-400 dark:text-slate-950"
                          : isToday
                            ? "border border-teal-400/50 bg-teal-100/70 font-bold text-teal-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "text-foreground hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
                      }`}
                    >
                      {day}

                      {hasEvent && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${
                            isSelected
                              ? "bg-emerald-300"
                              : "bg-emerald-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Terdapat jadwal ujian
                </p>
              </div>
            </CardContent>
          </Card>

          {/* EXAM SCHEDULE */}

          <Card className={cardGlass}>
            <CardAccent tone="blue" />

            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle
                  className={`text-base font-bold ${headingText}`}
                >
                  Jadwal Ujian
                </CardTitle>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDate.toLocaleDateString(
                    "id-ID",
                    {
                      timeZone: TIME_ZONE,
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className={ghostLink}
              >
                <Link to="/dashboard/exams">
                  Semua
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {selectedSchedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-300/70 bg-white/50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                  <CalendarIcon className="mx-auto mb-2 h-6 w-6 text-slate-400 dark:text-slate-500" />

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tidak ada agenda ujian pada tanggal ini.
                  </p>
                </div>
              ) : (
                selectedSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`space-y-2 p-3.5 ${listItem}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5
                        className={`text-sm font-bold leading-snug ${headingText}`}
                      >
                        {schedule.title}
                      </h5>

                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${getStatusClass(
                          schedule.status
                        )}`}
                      >
                        {getStatusLabel(
                          schedule.status
                        )}
                      </Badge>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />

                      {formatTime(schedule.start_time)} WIB

                      {schedule.end_time
                        ? ` - ${formatTime(
                            schedule.end_time
                          )} WIB`
                        : " - Waktu akhir belum ditentukan"}
                    </p>

                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {schedule.category} · {schedule.level}
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pengajar: {schedule.instructor}
                    </p>

                    {schedule.status === "upcoming" && (
                      <p className="text-xs font-bold text-teal-700 dark:text-emerald-300">
                        {formatCountdown(
                          schedule.start_time,
                          clockNow
                        )}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SCHEDULE COUNTS */}

          <Card className={cardGlass}>
            <CardAccent tone="slate" />

            <CardContent className="grid grid-cols-3 gap-2 p-4 text-center">
              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/10 px-2 py-3">
                <CalendarClock className="mx-auto h-4 w-4 text-blue-500" />

                <p
                  className={`mt-1.5 text-lg font-extrabold ${headingText}`}
                >
                  {upcomingCount}
                </p>

                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Akan Datang
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-2 py-3">
                <PlayCircle className="mx-auto h-4 w-4 text-emerald-500" />

                <p
                  className={`mt-1.5 text-lg font-extrabold ${headingText}`}
                >
                  {activeCount}
                </p>

                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Sedang Aktif
                </span>
              </div>

              <div className="rounded-2xl border border-slate-400/15 bg-slate-500/10 px-2 py-3">
                <CheckCircle2 className="mx-auto h-4 w-4 text-slate-500 dark:text-slate-400" />

                <p
                  className={`mt-1.5 text-lg font-extrabold ${headingText}`}
                >
                  {finishedCount}
                </p>

                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Selesai
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
