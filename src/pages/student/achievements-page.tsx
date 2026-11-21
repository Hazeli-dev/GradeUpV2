import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Zap,
  Lock,
  Medal,
  Crown,
  Sparkles,
  Award,
  Search,
  Timer,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Target,
  ChevronDown,
  History,
  TrendingUp,
  CalendarDays,
  BookMarked,
  GraduationCap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { PageSkeleton } from "@/components/shared/states";
import { initials } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/* =========================================================
   TYPES
========================================================= */

interface BadgeItem {
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

interface LeaderboardUser {
  id: string;
  full_name: string;
  total_xp: number;
  rank: number;
  is_current_user: boolean;
}

interface XpTransaction {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

type StatusFilter = "Semua" | "Terbuka" | "Terkunci";
type CategoryFilter = "Semua" | BadgeItem["category"];

const PAGE_SIZE = 12;
const XP_PER_LEVEL = 1500;

/* =========================================================
   THEME
========================================================= */

const RARITY_THEME: Record<
  BadgeItem["rarity"],
  {
    label: string;
    badge: string;
    iconBox: string;
    icon: string;
    bar: string;
  }
> = {
  common: {
    label: "Common",
    badge:
      "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-400",
    iconBox: "border-slate-500/30 bg-slate-500/10",
    icon: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-500",
  },
  rare: {
    label: "Rare",
    badge:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconBox: "border-blue-500/40 bg-blue-500/10",
    icon: "text-blue-500",
    bar: "bg-blue-500",
  },
  epic: {
    label: "Epic",
    badge:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    iconBox: "border-purple-500/40 bg-purple-500/10",
    icon: "text-purple-500",
    bar: "bg-purple-500",
  },
  legendary: {
    label: "Legendary",
    badge:
      "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
    iconBox: "border-amber-500/50 bg-amber-500/15",
    icon: "text-amber-500",
    bar: "bg-amber-500",
  },
};

/* Token gaya (disamakan dengan HomePage dan dashboard) */

const headingText = "text-slate-950 dark:text-white";

const mutedText = "text-slate-600 dark:text-slate-300";

const cardSurface =
  "border border-slate-200/80 bg-white/90 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/85";

const tileSurface =
  "border border-emerald-100/80 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/60";

const tabTrigger =
  "gap-1.5 rounded-lg py-2.5 text-xs font-bold text-slate-600 transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-teal-800 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-300 sm:gap-2";

const progressBar =
  "[&>div]:bg-gradient-to-r [&>div]:from-teal-600 [&>div]:to-emerald-400";

/* =========================================================
   HELPERS
========================================================= */

function generateMultiTierBadges(
  articlesRead: number,
  examsPassed: number
): BadgeItem[] {
  const generated: BadgeItem[] = [];

  for (let tier = 1; tier <= 50; tier++) {
    const target = tier;
    const isUnlocked = articlesRead >= target;

    let rarity: BadgeItem["rarity"] = "common";

    if (tier > 35) rarity = "legendary";
    else if (tier > 20) rarity = "epic";
    else if (tier > 10) rarity = "rare";

    generated.push({
      id: `reading-tier-${tier}`,
      category: "Membaca Materi",
      tier,
      title: `Pembaca Setia Lv. ${tier}`,
      description: `Selesaikan membaca total ${target} materi pelajaran di platform GradeUp.`,
      targetCount: target,
      currentCount: Math.min(articlesRead, target),
      rarity,
      xp_reward: tier * 50,
      isUnlocked,
    });
  }

  for (let tier = 1; tier <= 50; tier++) {
    const target = tier;
    const isUnlocked = examsPassed >= target;

    let rarity: BadgeItem["rarity"] = "common";

    if (tier > 35) rarity = "legendary";
    else if (tier > 20) rarity = "epic";
    else if (tier > 10) rarity = "rare";

    generated.push({
      id: `exam-tier-${tier}`,
      category: "Ulangan Harian",
      tier,
      title: `Pejuang Ujian Lv. ${tier}`,
      description: `Selesaikan total ${target} paket ulangan harian dengan nilai tuntas.`,
      targetCount: target,
      currentCount: Math.min(examsPassed, target),
      rarity,
      xp_reward: tier * 100,
      isUnlocked,
    });
  }

  return generated;
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getXpSourceLabel(source: string) {
  const labels: Record<string, string> = {
    lesson_completion: "Menyelesaikan sesi belajar",
    exam_completion: "Menyelesaikan ujian",
    badge_reward: "Hadiah badge",
    achievement: "Pencapaian",
    bonus: "Bonus XP",
  };

  return labels[source] || source.replace(/_/g, " ");
}

function RarityTag({
  rarity,
}: {
  rarity: BadgeItem["rarity"];
}) {
  const theme = RARITY_THEME[rarity];

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[10px] font-semibold",
        theme.badge
      )}
    >
      {theme.label}
    </Badge>
  );
}

function CategoryIcon({
  category,
  className,
}: {
  category: BadgeItem["category"];
  className?: string;
}) {
  return category === "Membaca Materi" ? (
    <BookOpen className={className} aria-hidden />
  ) : (
    <Zap className={cn("fill-current", className)} aria-hidden />
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function StudentAchievementsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [xpHistory, setXpHistory] = useState<XpTransaction[]>([]);

  const [totalXp, setTotalXp] = useState(0);
  const [allTimeXp, setAllTimeXp] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(XP_PER_LEVEL);
  const [levelProgress, setLevelProgress] = useState(0);

  const [seasonName, setSeasonName] = useState("Season 1");
  const [seasonDaysLeft, setSeasonDaysLeft] = useState(28);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Semua");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("Semua");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedBadge, setSelectedBadge] =
    useState<BadgeItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* =======================================================
     FETCH DATA
  ======================================================= */

  useEffect(() => {
    let active = true;

    async function fetchAchievementsData() {
      try {
        setLoading(true);
        setLoadError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          if (active) setLoadError("Silakan masuk untuk melihat pencapaian.");
          return;
        }

        // Season check tetap dipertahankan.
        try {
          await supabase.rpc("check_and_auto_reset_season");
        } catch (rpcError) {
          console.warn("Auto-reset season notice:", rpcError);
        }

        const [
          profileRes,
          leaderboardRes,
          seasonConfigRes,
          historyRes,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "total_xp, all_time_xp, level, total_articles_read, total_exams_passed"
            )
            .eq("id", user.id)
            .single(),

          supabase
            .from("profiles")
            .select("id, full_name, total_xp")
            .order("total_xp", { ascending: false })
            .limit(10),

          supabase
            .from("system_settings")
            .select("value")
            .eq("key", "season_config")
            .maybeSingle(),

          supabase
            .from("xp_transactions")
            .select("id, amount, source, description, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (profileRes.error) throw profileRes.error;

        if (!active) return;

        /* XP DAN LEVEL */

        const userTotalXp = Number(profileRes.data?.total_xp ?? 0);
        const userAllTimeXp = Number(
          profileRes.data?.all_time_xp ?? userTotalXp
        );

        setTotalXp(userTotalXp);
        setAllTimeXp(userAllTimeXp);

        // Mempertahankan aturan level lama: 1.500 XP per level.
        const calculatedLevel =
          Math.floor(userTotalXp / XP_PER_LEVEL) + 1;

        const currentLevelXp = userTotalXp % XP_PER_LEVEL;
        const needed = XP_PER_LEVEL - currentLevelXp;

        setCurrentLevel(calculatedLevel);
        setXpToNextLevel(needed);
        setLevelProgress(
          (currentLevelXp / XP_PER_LEVEL) * 100
        );

        /* BADGES */

        const articlesRead = Number(
          profileRes.data?.total_articles_read ?? 0
        );

        const examsPassed = Number(
          profileRes.data?.total_exams_passed ?? 0
        );

        setBadges(
          generateMultiTierBadges(articlesRead, examsPassed)
        );

        /* LEADERBOARD */

        if (leaderboardRes.data) {
          const rankedList: LeaderboardUser[] =
            leaderboardRes.data.map((profile, index) => ({
              id: profile.id,
              full_name: profile.full_name || "Siswa GradeUp",
              total_xp: Number(profile.total_xp ?? 0),
              rank: index + 1,
              is_current_user: profile.id === user.id,
            }));

          setLeaderboard(rankedList);
        }

        /* RIWAYAT XP */

        if (historyRes.error) {
          console.warn(
            "Riwayat XP belum dapat dimuat:",
            historyRes.error
          );
          setXpHistory([]);
        } else {
          setXpHistory(
            (historyRes.data || []) as XpTransaction[]
          );
        }

        /* SEASON */

        if (seasonConfigRes.data?.value) {
          const config = seasonConfigRes.data.value;

          setSeasonName(config.season_name || "Season 1");

          if (config.reset_at) {
            const targetDate = new Date(
              config.reset_at
            ).getTime();

            const now = Date.now();

            const diffDays = Math.ceil(
              (targetDate - now) / (1000 * 60 * 60 * 24)
            );

            setSeasonDaysLeft(
              diffDays > 0 ? diffDays : 0
            );
          }
        }
      } catch (error) {
        console.error(
          "Gagal memuat data pencapaian:",
          error
        );

        if (active) {
          setLoadError(
            "Data pencapaian belum dapat dimuat. Silakan coba kembali."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAchievementsData();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const unlockedCount = useMemo(
    () => badges.filter((badge) => badge.isUnlocked).length,
    [badges]
  );

  const totalBadges = badges.length;

  const nextTargets = useMemo(
    () =>
      ([
        "Membaca Materi",
        "Ulangan Harian",
      ] as const)
        .map((category) =>
          badges.find(
            (badge) =>
              badge.category === category &&
              !badge.isUnlocked
          )
        )
        .filter((badge): badge is BadgeItem =>
          Boolean(badge)
        ),
    [badges]
  );

  const filteredBadges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return badges.filter((badge) => {
      const matchSearch =
        !query ||
        badge.title.toLowerCase().includes(query) ||
        badge.description.toLowerCase().includes(query) ||
        badge.category.toLowerCase().includes(query);

      const matchStatus =
        statusFilter === "Semua" ||
        (statusFilter === "Terbuka"
          ? badge.isUnlocked
          : !badge.isUnlocked);

      const matchCategory =
        categoryFilter === "Semua" ||
        badge.category === categoryFilter;

      return (
        matchSearch &&
        matchStatus &&
        matchCategory
      );
    });
  }, [
    badges,
    searchQuery,
    statusFilter,
    categoryFilter,
  ]);

  if (loading) return <PageSkeleton />;

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-xl items-center justify-center px-4">
        <Card
          className={cn(
            "w-full rounded-3xl shadow-[0_24px_60px_-34px_rgba(6,78,59,0.4)]",
            cardSurface
          )}
        >
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div>
              <h2 className={cn("font-bold", headingText)}>
                Pencapaian belum tersedia
              </h2>
              <p className={cn("mt-1 text-sm", mutedText)}>
                {loadError}
              </p>
            </div>

            <Button
              onClick={() => window.location.reload()}
              className="gap-2 rounded-xl bg-teal-700 font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
            >
              <RefreshCw className="h-4 w-4" />
              Muat ulang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shownBadges = filteredBadges.slice(
    0,
    visibleCount
  );

  const myRank = leaderboard.find(
    (item) => item.is_current_user
  )?.rank;

  const hasActiveFilter =
    searchQuery !== "" ||
    statusFilter !== "Semua" ||
    categoryFilter !== "Semua";

  const handleOpenDetail = (badge: BadgeItem) => {
    setSelectedBadge(badge);
    setDetailOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("Semua");
    setCategoryFilter("Semua");
    setVisibleCount(PAGE_SIZE);
  };

  const podium = leaderboard.slice(0, 3);
  const restOfBoard =
    leaderboard.length >= 3
      ? leaderboard.slice(3)
      : leaderboard;

  const podiumOrder =
    podium.length === 3
      ? [podium[1], podium[0], podium[2]]
      : [];

  const podiumStyle: Record<
    number,
    { height: string; medal: string; ring: string }
  > = {
    1: {
      height: "h-24",
      medal: "🥇",
      ring: "border-amber-400/60 bg-amber-400/10",
    },
    2: {
      height: "h-16",
      medal: "🥈",
      ring: "border-slate-400/50 bg-slate-400/10",
    },
    3: {
      height: "h-12",
      medal: "🥉",
      ring: "border-amber-700/50 bg-amber-700/10",
    },
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1 pb-12 sm:px-2 sm:space-y-8">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200 sm:text-[11px]">
            <Trophy className="h-3.5 w-3.5 text-emerald-500" />
            Student Achievement
          </div>

          <h1
            className={cn(
              "text-2xl font-black tracking-[-0.04em] sm:text-3xl",
              headingText
            )}
          >
            Pencapaian Saya
          </h1>

          <p className={cn("mt-1 text-sm", mutedText)}>
            Terus belajar, kumpulkan XP, dan buka pencapaian baru.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2.5 self-start rounded-full border border-emerald-200/70 bg-white/80 px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300 sm:self-auto"
          role="status"
        >
          <Timer className="h-4 w-4 text-emerald-500" />
          <span>
            {seasonName} berakhir dalam{" "}
            <strong
              className={cn("text-sm tabular-nums", headingText)}
            >
              {seasonDaysLeft} hari
            </strong>
          </span>
        </div>
      </div>

      {/* XP HERO */}

      <Card className="relative isolate overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 shadow-[0_24px_60px_-34px_rgba(6,78,59,0.45)] dark:border-emerald-900/50 dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900">
        {/* Dekorasi hero (tidak interaktif) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
          <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-600/15" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.18)_1px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_80%_0%,#000_20%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_70%_60%_at_80%_0%,#000_20%,transparent_100%)] dark:bg-[radial-gradient(rgba(110,231,183,0.14)_1px,transparent_1.5px)]" />
          <div className="absolute -right-10 top-8 h-44 w-44 rounded-full border border-emerald-400/40 dark:border-emerald-400/10" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/40" />
        </div>

        <CardContent className="relative space-y-6 p-5 sm:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-600 text-white shadow-lg shadow-teal-700/25 ring-4 ring-emerald-100/80 dark:from-emerald-400 dark:to-teal-400 dark:text-[#123b29] dark:shadow-emerald-500/20 dark:ring-emerald-900/40 sm:h-20 sm:w-20">
                <Trophy className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Active Student
                  </Badge>

                  {myRank && (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white/70 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      <Medal className="mr-1 h-3 w-3 text-amber-500" />
                      Peringkat #{myRank}
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Total XP kamu
                </p>

                <p
                  className={cn(
                    "text-3xl font-black tabular-nums tracking-tight sm:text-4xl",
                    headingText
                  )}
                >
                  {formatNumber(totalXp)}
                  <span className="ml-2 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    XP
                  </span>
                </p>
              </div>
            </div>

            <div
              className={cn(
                "w-full space-y-3 rounded-2xl p-4 shadow-sm md:max-w-xs",
                tileSurface
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Level saat ini
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-black",
                      headingText
                    )}
                  >
                    Level {currentLevel}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Medal className="h-6 w-6" />
                </div>
              </div>

              <Progress
                value={levelProgress}
                className={cn(
                  "h-2.5 rounded-full bg-emerald-100 dark:bg-slate-800",
                  progressBar
                )}
                aria-label="Progres level"
              />

              <div className="flex justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {formatNumber(totalXp % XP_PER_LEVEL)} /{" "}
                  {formatNumber(XP_PER_LEVEL)} XP
                </span>

                <span className="font-bold text-teal-700 dark:text-emerald-400">
                  {formatNumber(xpToNextLevel)} XP lagi
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Menuju Level {currentLevel + 1}
              </p>
            </div>
          </div>

          {/* SUMMARY STATS */}

          <div className="grid grid-cols-2 gap-3 border-t border-emerald-200/60 pt-5 dark:border-emerald-900/40 sm:grid-cols-3">
            <div className={cn("rounded-2xl p-3.5", tileSurface)}>
              <div className="mb-2 flex items-center gap-2 text-teal-700 dark:text-emerald-400">
                <Award className="h-4 w-4" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Badge terbuka
                </span>
              </div>
              <p
                className={cn(
                  "text-xl font-black tabular-nums",
                  headingText
                )}
              >
                {unlockedCount}
                <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  / {totalBadges}
                </span>
              </p>
            </div>

            <div className={cn("rounded-2xl p-3.5", tileSurface)}>
              <div className="mb-2 flex items-center gap-2 text-blue-500">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  XP sepanjang waktu
                </span>
              </div>
              <p
                className={cn(
                  "text-xl font-black tabular-nums",
                  headingText
                )}
              >
                {formatNumber(allTimeXp)}
              </p>
            </div>

            <div
              className={cn(
                "col-span-2 rounded-2xl p-3.5 sm:col-span-1",
                tileSurface
              )}
            >
              <div className="mb-2 flex items-center gap-2 text-amber-500">
                <Crown className="h-4 w-4" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Peringkat
                </span>
              </div>
              <p
                className={cn(
                  "text-xl font-black tabular-nums",
                  headingText
                )}
              >
                {myRank ? `#${myRank}` : "-"}
              </p>
            </div>
          </div>

          {/* NEXT BADGE TARGETS */}

          {nextTargets.length > 0 && (
            <div className="space-y-3 border-t border-emerald-200/60 pt-5 dark:border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" />
                <p className={cn("text-sm font-bold", headingText)}>
                  Target pencapaian berikutnya
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {nextTargets.map((badge) => {
                  const theme = RARITY_THEME[badge.rarity];

                  return (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => {
                        setSelectedBadge(badge);
                        setDetailOpen(true);
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-white/80 p-3.5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/70 hover:shadow-[0_18px_40px_-24px_rgba(15,118,110,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-emerald-700/70"
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                          theme.iconBox
                        )}
                      >
                        <CategoryIcon
                          category={badge.category}
                          className={cn(
                            "h-5 w-5",
                            theme.icon
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-bold",
                              headingText
                            )}
                          >
                            {badge.title}
                          </span>

                          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                            {badge.currentCount}/{badge.targetCount}
                          </span>
                        </div>

                        <Progress
                          value={
                            (badge.currentCount /
                              badge.targetCount) *
                            100
                          }
                          className={cn(
                            "h-1.5 bg-emerald-100 dark:bg-slate-800",
                            progressBar
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MAIN TABS */}

      <Tabs defaultValue="badges" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl border border-emerald-200/60 bg-white/60 p-1 shadow-sm shadow-emerald-900/5 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/50 dark:shadow-none">
          <TabsTrigger value="badges" className={tabTrigger}>
            <Award className="h-4 w-4" />
            <span>Badge</span>
            <span className="hidden sm:inline">
              ({totalBadges})
            </span>
          </TabsTrigger>

          <TabsTrigger value="history" className={tabTrigger}>
            <History className="h-4 w-4" />
            Riwayat XP
          </TabsTrigger>

          <TabsTrigger value="leaderboard" className={tabTrigger}>
            <Crown className="h-4 w-4" />
            Peringkat
          </TabsTrigger>
        </TabsList>

        {/* =================================================
            TAB BADGES
        ================================================= */}

        <TabsContent value="badges" className="space-y-4">
          <div className="space-y-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />

              <Input
                placeholder="Cari level atau badge..."
                aria-label="Cari badge"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-11 rounded-xl border-slate-200 bg-white/80 pl-10 text-sm text-slate-900 shadow-sm transition-all duration-300 placeholder:text-slate-400 hover:border-teal-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-teal-700 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/25"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div
                role="group"
                aria-label="Filter status"
                className="flex gap-1.5 overflow-x-auto pb-1"
              >
                {(
                  ["Semua", "Terbuka", "Terkunci"] as StatusFilter[]
                ).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={
                      statusFilter === status
                        ? "default"
                        : "outline"
                    }
                    aria-pressed={statusFilter === status}
                    onClick={() => {
                      setStatusFilter(status);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition-colors duration-300",
                      statusFilter === status
                        ? "bg-teal-700 text-white hover:bg-teal-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                        : "border-slate-300 bg-white/80 text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                    )}
                  >
                    {status}

                    {status === "Terbuka" && (
                      <span className="ml-1.5 opacity-80">
                        {unlockedCount}
                      </span>
                    )}

                    {status === "Terkunci" && (
                      <span className="ml-1.5 opacity-80">
                        {totalBadges - unlockedCount}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              <span className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

              <div
                role="group"
                aria-label="Filter kategori"
                className="flex gap-1.5 overflow-x-auto pb-1"
              >
                {(
                  [
                    "Semua",
                    "Membaca Materi",
                    "Ulangan Harian",
                  ] as CategoryFilter[]
                ).map((category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={
                      categoryFilter === category
                        ? "soft"
                        : "outline"
                    }
                    aria-pressed={categoryFilter === category}
                    onClick={() => {
                      setCategoryFilter(category);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3.5 text-xs font-bold transition-colors duration-300",
                      categoryFilter === category
                        ? "border border-teal-400/60 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100"
                        : "border-slate-300 bg-white/80 text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                    )}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {filteredBadges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-10 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/40">
              <Search className="mx-auto mb-3 h-8 w-8 text-slate-400" />

              <p className={cn("text-sm font-semibold", headingText)}>
                Badge tidak ditemukan
              </p>

              <p className={cn("mt-1 text-xs", mutedText)}>
                Coba kata kunci atau filter yang lain.
              </p>

              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl border-slate-300 bg-white/80 font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                  onClick={resetFilters}
                >
                  Reset filter
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn("text-xs", mutedText)}
                  aria-live="polite"
                >
                  Menampilkan {shownBadges.length} dari{" "}
                  {filteredBadges.length} badge
                </p>

                <span className="text-xs font-semibold text-teal-700 dark:text-emerald-400">
                  {unlockedCount} terbuka
                </span>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownBadges.map((badge) => {
                  const theme = RARITY_THEME[badge.rarity];

                  const percentage =
                    (badge.currentCount /
                      badge.targetCount) *
                    100;

                  return (
                    <li key={badge.id}>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDetail(badge)
                        }
                        aria-label={`${badge.title}, ${
                          badge.isUnlocked
                            ? "terbuka"
                            : "terkunci"
                        }. Lihat detail`}
                        className={cn(
                          "flex h-full w-full flex-col gap-4 rounded-2xl border p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5",
                          badge.isUnlocked
                            ? "border-emerald-300/60 bg-gradient-to-br from-white to-emerald-50/60 hover:border-emerald-500/70 hover:shadow-[0_18px_40px_-24px_rgba(15,118,110,0.45)] dark:border-emerald-700/50 dark:from-slate-900 dark:to-emerald-950/30"
                            : "border-dashed border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-500 dark:hover:bg-slate-900/60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                              badge.isUnlocked
                                ? theme.iconBox
                                : "border-slate-300/60 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                            )}
                          >
                            <CategoryIcon
                              category={badge.category}
                              className={cn(
                                "h-6 w-6",
                                badge.isUnlocked
                                  ? theme.icon
                                  : "text-slate-400 dark:text-slate-500"
                              )}
                            />

                            {!badge.isUnlocked && (
                              <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={cn(
                                  "text-sm font-bold leading-snug tracking-tight",
                                  badge.isUnlocked
                                    ? headingText
                                    : "text-slate-500 dark:text-slate-400"
                                )}
                              >
                                {badge.title}
                              </h4>

                              <RarityTag rarity={badge.rarity} />
                            </div>

                            <p
                              className={cn(
                                "line-clamp-2 text-xs leading-relaxed",
                                mutedText
                              )}
                            >
                              {badge.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto space-y-3">
                          {!badge.isUnlocked && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                <span>Progres</span>

                                <span className="tabular-nums">
                                  {badge.currentCount}/
                                  {badge.targetCount}
                                </span>
                              </div>

                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    theme.bar
                                  )}
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 text-[11px] dark:border-slate-700/60">
                            <span
                              className={cn(
                                "flex items-center gap-1 font-bold",
                                badge.isUnlocked
                                  ? "text-teal-700 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              <CategoryIcon
                                category={badge.category}
                                className="h-3.5 w-3.5"
                              />
                              Level {badge.tier}
                            </span>

                            {badge.isUnlocked ? (
                              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Terbuka
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Lock className="h-3 w-3" />
                                Belum terbuka
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {shownBadges.length < filteredBadges.length && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setVisibleCount(
                        (count) => count + PAGE_SIZE
                      )
                    }
                    className="gap-1.5 rounded-xl border-slate-300 bg-white/80 text-xs font-bold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                  >
                    Tampilkan lebih banyak
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* =================================================
            TAB RIWAYAT XP
        ================================================= */}

        <TabsContent value="history" className="space-y-4">
          <Card
            className={cn(
              "overflow-hidden rounded-2xl shadow-[0_20px_50px_-34px_rgba(15,118,110,0.4)]",
              cardSurface
            )}
          >
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <History className="h-5 w-5" />
                  </div>

                  <div>
                    <CardTitle
                      className={cn("text-base font-bold", headingText)}
                    >
                      Riwayat XP
                    </CardTitle>
                    <p className={cn("mt-0.5 text-xs", mutedText)}>
                      Aktivitas perolehan XP terbaru
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="border-teal-200/80 bg-teal-50 text-[10px] text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200"
                >
                  10 transaksi terbaru
                </Badge>
              </div>

              {xpHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Zap className="h-6 w-6" />
                  </div>

                  <p className={cn("text-sm font-bold", headingText)}>
                    Belum ada riwayat XP
                  </p>

                  <p
                    className={cn(
                      "mx-auto mt-1 max-w-sm text-xs leading-relaxed",
                      mutedText
                    )}
                  >
                    XP yang diperoleh dari aktivitas pembelajaran
                    berikutnya akan muncul di sini. Total XP lama
                    tetap tersimpan di profil.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {xpHistory.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3.5 transition-colors duration-300 hover:border-emerald-300/70 hover:bg-emerald-50/50 dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:border-emerald-800/70 dark:hover:bg-slate-800/60 sm:p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-teal-700 dark:text-emerald-400">
                        <Zap className="h-5 w-5 fill-current" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-bold",
                            headingText
                          )}
                        >
                          {transaction.description ||
                            getXpSourceLabel(transaction.source)}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <span>
                            {getXpSourceLabel(transaction.source)}
                          </span>

                          <span aria-hidden>•</span>

                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(transaction.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black tabular-nums text-teal-700 dark:text-emerald-400">
                          +{formatNumber(transaction.amount)}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/50">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-emerald-400" />

                  <p className={cn("text-xs leading-relaxed", mutedText)}>
                    Riwayat ini menampilkan transaksi yang tercatat
                    di sistem XP GradeUp. Total XP sebelumnya tetap
                    dihitung dari profil dan tidak dihapus ketika
                    riwayat transaksi masih kosong.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================
            TAB LEADERBOARD
        ================================================= */}

        <TabsContent value="leaderboard">
          <Card
            className={cn(
              "overflow-hidden rounded-2xl shadow-[0_20px_50px_-34px_rgba(15,118,110,0.4)]",
              cardSurface
            )}
          >
            <CardContent className="space-y-6 p-4 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-amber-500" />

                  <div>
                    <CardTitle
                      className={cn("text-base font-bold", headingText)}
                    >
                      Peringkat 10 Besar Siswa
                    </CardTitle>
                    <p className={cn("mt-0.5 text-xs", mutedText)}>
                      Berdasarkan total XP
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="border-teal-200/80 bg-teal-50 text-[10px] font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200"
                >
                  Total XP
                </Badge>
              </div>

              {leaderboard.length === 0 ? (
                <div className={cn("p-8 text-center text-sm", mutedText)}>
                  Belum ada data peringkat siswa.
                </div>
              ) : (
                <>
                  {podiumOrder.length === 3 && (
                    <div className="mx-auto grid w-full max-w-xl grid-cols-3 items-end gap-3 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-transparent px-2 pt-5 dark:from-emerald-950/30 sm:gap-5 sm:px-5">
                      {podiumOrder.map((item) => {
                        const style = podiumStyle[item.rank];

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col items-center gap-2 text-center"
                          >
                            <span
                              className="text-2xl"
                              aria-hidden
                            >
                              {style.medal}
                            </span>

                            <Avatar
                              className={cn(
                                "border-2",
                                item.rank === 1
                                  ? "h-14 w-14"
                                  : "h-11 w-11",
                                item.is_current_user &&
                                  "ring-2 ring-emerald-500"
                              )}
                            >
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {initials(item.full_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="w-full min-w-0">
                              <p
                                className={cn(
                                  "truncate text-xs font-bold sm:text-sm",
                                  headingText
                                )}
                              >
                                {item.full_name}

                                {item.is_current_user && (
                                  <span className="ml-1 text-[10px] font-normal text-teal-700 dark:text-emerald-400">
                                    (Anda)
                                  </span>
                                )}
                              </p>

                              <p className="text-xs font-black tabular-nums text-teal-700 dark:text-emerald-400">
                                {formatNumber(item.total_xp)} XP
                              </p>
                            </div>

                            <div
                              className={cn(
                                "flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-2 text-sm font-extrabold text-slate-600 dark:text-slate-300",
                                style.height,
                                style.ring
                              )}
                              aria-label={`Peringkat ${item.rank}`}
                            >
                              #{item.rank}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {restOfBoard.length > 0 && (
                    <ol className="space-y-2">
                      {restOfBoard.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors duration-300",
                            item.is_current_user
                              ? "border-emerald-400/50 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/40"
                              : "border-slate-200/80 bg-white/80 hover:border-emerald-300/70 hover:bg-emerald-50/50 dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:border-emerald-800/70 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-8 shrink-0 text-center text-xs font-black text-slate-600 dark:text-slate-300">
                              #{item.rank}
                            </span>

                            <Avatar className="h-9 w-9 shrink-0 border">
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {initials(item.full_name)}
                              </AvatarFallback>
                            </Avatar>

                            <p
                              className={cn(
                                "truncate text-sm font-bold",
                                headingText
                              )}
                            >
                              {item.full_name}

                              {item.is_current_user && (
                                <span className="ml-1.5 text-[10px] font-normal text-teal-700 dark:text-emerald-400">
                                  (Anda)
                                </span>
                              )}
                            </p>
                          </div>

                          <span className="shrink-0 pl-2 text-xs font-black tabular-nums text-teal-700 dark:text-emerald-400">
                            {formatNumber(item.total_xp)} XP
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =====================================================
          MODAL DETAIL BADGE
      ===================================================== */}

      <Dialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
      >
        {selectedBadge && (
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-200/70 p-5 shadow-[0_30px_80px_-40px_rgba(6,78,59,0.5)] dark:border-emerald-900/50 sm:max-w-md sm:p-6">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
            />

            <DialogHeader className="items-center text-center">
              <div
                className={cn(
                  "mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border-2 shadow-lg",
                  selectedBadge.isUnlocked
                    ? RARITY_THEME[selectedBadge.rarity].iconBox
                    : "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                )}
              >
                {selectedBadge.isUnlocked ? (
                  <CategoryIcon
                    category={selectedBadge.category}
                    className={cn(
                      "h-10 w-10",
                      RARITY_THEME[selectedBadge.rarity].icon
                    )}
                  />
                ) : (
                  <Lock className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                )}
              </div>

              <div className="mb-1 flex items-center gap-2">
                <RarityTag rarity={selectedBadge.rarity} />

                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Level {selectedBadge.tier}
                </span>
              </div>

              <DialogTitle
                className={cn("text-xl font-black", headingText)}
              >
                {selectedBadge.title}
              </DialogTitle>

              <DialogDescription
                className={cn("pt-1 text-sm", mutedText)}
              >
                {selectedBadge.description}
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 space-y-3 border-y border-slate-200/70 py-4 text-xs dark:border-slate-700/60">
              <div className="space-y-2 rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-3 dark:border-slate-700/70 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      headingText
                    )}
                  >
                    <HelpCircle className="h-4 w-4 text-emerald-500" />
                    Progres pencapaian
                  </span>

                  <span className="tabular-nums text-teal-700 dark:text-emerald-400">
                    {selectedBadge.currentCount} /{" "}
                    {selectedBadge.targetCount}
                  </span>
                </div>

                <Progress
                  value={
                    (selectedBadge.currentCount /
                      selectedBadge.targetCount) *
                    100
                  }
                  className={cn(
                    "h-2.5 rounded-full bg-emerald-100 dark:bg-slate-800",
                    progressBar
                  )}
                />

                {!selectedBadge.isUnlocked && (
                  <p className="pt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Tinggal{" "}
                    {selectedBadge.targetCount -
                      selectedBadge.currentCount}{" "}
                    aktivitas lagi untuk membuka badge ini.
                  </p>
                )}

                {selectedBadge.isUnlocked && (
                  <p className="pt-0.5 text-[11px] font-semibold text-teal-700 dark:text-emerald-400">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                    Badge berhasil dibuka.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Kategori
                </span>

                <span className={cn("font-bold", headingText)}>
                  {selectedBadge.category}
                </span>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Tingkat badge
                </span>

                <span className={cn("font-bold", headingText)}>
                  Level {selectedBadge.tier} dari 50
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(false)}
                className="w-full rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800 sm:w-auto"
              >
                Tutup
              </Button>

              {!selectedBadge.isUnlocked && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);

                    navigate(
                      selectedBadge.category ===
                        "Membaca Materi"
                        ? "/dashboard/courses"
                        : "/dashboard/exams"
                    );
                  }}
                  className="w-full gap-1 rounded-xl bg-teal-700 text-xs font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 sm:w-auto"
                >
                  {selectedBadge.category ===
                  "Membaca Materi"
                    ? "Baca Materi Sekarang"
                    : "Kerjakan Ujian Sekarang"}

                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
