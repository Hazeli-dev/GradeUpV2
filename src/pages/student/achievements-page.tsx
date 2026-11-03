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
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type StatusFilter = "Semua" | "Terbuka" | "Terkunci";
type CategoryFilter = "Semua" | BadgeItem["category"];

const PAGE_SIZE = 12;

const RARITY_THEME: Record<
  BadgeItem["rarity"],
  { label: string; badge: string; iconBox: string; icon: string; bar: string }
> = {
  common: {
    label: "Common",
    badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/25",
    iconBox: "bg-slate-500/10 border-slate-500/30",
    icon: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-500",
  },
  rare: {
    label: "Rare",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    iconBox: "bg-blue-500/10 border-blue-500/40",
    icon: "text-blue-500",
    bar: "bg-blue-500",
  },
  epic: {
    label: "Epic",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    iconBox: "bg-purple-500/10 border-purple-500/40",
    icon: "text-purple-500",
    bar: "bg-purple-500",
  },
  legendary: {
    label: "Legendary",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40",
    iconBox: "bg-amber-500/15 border-amber-500/50",
    icon: "text-amber-500",
    bar: "bg-amber-500",
  },
};

// GENERATOR BADGE DINAMIS (50 TIER MEMBACA + 50 TIER UJIAN)
function generateMultiTierBadges(articlesRead: number, examsPassed: number): BadgeItem[] {
  const generated: BadgeItem[] = [];

  // 1. Generate 50 Level Badge Membaca
  for (let tier = 1; tier <= 50; tier++) {
    const target = tier; // Target: 1, 2, ..., 50 materi
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

  // 2. Generate 50 Level Badge Ulangan Harian
  for (let tier = 1; tier <= 50; tier++) {
    const target = tier; // Target: 1, 2, ..., 50 paket ujian
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

function RarityTag({ rarity }: { rarity: BadgeItem["rarity"] }) {
  const t = RARITY_THEME[rarity];
  return (
    <Badge variant="outline" className={cn("shrink-0 text-[10px] font-semibold", t.badge)}>
      {t.label}
    </Badge>
  );
}

function CategoryIcon({ category, className }: { category: BadgeItem["category"]; className?: string }) {
  return category === "Membaca Materi" ? (
    <BookOpen className={className} aria-hidden />
  ) : (
    <Zap className={cn("fill-current", className)} aria-hidden />
  );
}

export default function StudentAchievementsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("Semua");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // State Modal Detail Badge
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // State Gamifikasi / Level
  const [totalXp, setTotalXp] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(1500);
  const [levelProgress, setLevelProgress] = useState(0);

  // State Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  // State Season Dinamis dari Supabase
  const [seasonName, setSeasonName] = useState("Season 1");
  const [seasonDaysLeft, setSeasonDaysLeft] = useState<number>(28);

  useEffect(() => {
    async function fetchAchievementsData() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Auto-reset season check
        try {
          await supabase.rpc("check_and_auto_reset_season");
        } catch (rpcErr) {
          console.warn("Auto-reset RPC notice:", rpcErr);
        }

        // 2. Fetch Profil User, Leaderboard, & Config Season
        const [profileRes, leaderboardRes, seasonConfigRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("total_xp, total_articles_read, total_exams_passed")
            .eq("id", user.id)
            .single(),
          supabase
            .from("profiles")
            .select("id, full_name, total_xp")
            .order("total_xp", { ascending: false })
            .limit(10),
          supabase.from("system_settings").select("value").eq("key", "season_config").single(),
        ]);

        // Hitung Sisa Hari Season
        if (seasonConfigRes.data?.value) {
          const config = seasonConfigRes.data.value;
          setSeasonName(config.season_name || "Season 1");

          if (config.reset_at) {
            const targetDate = new Date(config.reset_at).getTime();
            const now = new Date().getTime();
            const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            setSeasonDaysLeft(diffDays > 0 ? diffDays : 0);
          }
        }

        // 3. Ambil Total XP & Aktivitas User
        const userTotalXp = profileRes.data?.total_xp || 0;
        const articlesRead = profileRes.data?.total_articles_read || 0;
        const examsPassed = profileRes.data?.total_exams_passed || 0;

        setTotalXp(userTotalXp);

        // LOGIC LEVELING (1.500 XP PER LEVEL)
        const XP_PER_LEVEL = 1500;
        const lvl = Math.floor(userTotalXp / XP_PER_LEVEL) + 1;
        const currentLvlXp = userTotalXp % XP_PER_LEVEL;
        const needed = XP_PER_LEVEL - currentLvlXp;

        setCurrentLevel(lvl);
        setXpToNextLevel(needed);
        setLevelProgress((currentLvlXp / XP_PER_LEVEL) * 100);

        // 4. Generate 100 Badge Multi-Tier
        const allDynamicBadges = generateMultiTierBadges(articlesRead, examsPassed);
        setBadges(allDynamicBadges);

        // 5. Olah Leaderboard
        if (leaderboardRes.data) {
          const rankedList: LeaderboardUser[] = leaderboardRes.data.map((p, index) => ({
            id: p.id,
            full_name: p.full_name || "Siswa GradeUp",
            total_xp: p.total_xp || 0,
            rank: index + 1,
            is_current_user: p.id === user.id,
          }));
          setLeaderboard(rankedList);
        }
      } catch (err) {
        console.error("Gagal memuat data pencapaian:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAchievementsData();
  }, []);

  // Semua hook turunan harus berada sebelum early return
  const unlockedCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);
  const totalBadges = badges.length;

  // Badge terkunci pertama per kategori = target berikutnya
  const nextTargets = useMemo(
    () =>
      (["Membaca Materi", "Ulangan Harian"] as const)
        .map((cat) => badges.find((b) => b.category === cat && !b.isUnlocked))
        .filter((b): b is BadgeItem => Boolean(b)),
    [badges]
  );

  const filteredBadges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return badges.filter((b) => {
      const matchSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "Semua" || (statusFilter === "Terbuka" ? b.isUnlocked : !b.isUnlocked);
      const matchCategory = categoryFilter === "Semua" || b.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [badges, searchQuery, statusFilter, categoryFilter]);

  if (loading) return <PageSkeleton />;

  const shownBadges = filteredBadges.slice(0, visibleCount);
  const myRank = leaderboard.find((l) => l.is_current_user)?.rank;
  const hasActiveFilter = searchQuery !== "" || statusFilter !== "Semua" || categoryFilter !== "Semua";

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
  const restOfBoard = leaderboard.length >= 3 ? leaderboard.slice(3) : leaderboard;
  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : [];
  const podiumStyle: Record<number, { height: string; medal: string; ring: string }> = {
    1: { height: "h-24", medal: "🥇", ring: "border-amber-400/60 bg-amber-400/10" },
    2: { height: "h-16", medal: "🥈", ring: "border-slate-400/50 bg-slate-400/10" },
    3: { height: "h-12", medal: "🥉", ring: "border-amber-700/50 bg-amber-700/10" },
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-1 pb-12 sm:px-2">
      {/* Header + Countdown Season */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Pencapaian Saya</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unlockedCount} dari {totalBadges} badge berhasil dibuka
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2.5 self-start rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm sm:self-auto"
          role="status"
        >
          <Timer className="h-4 w-4" aria-hidden />
          <span>
            {seasonName} berakhir dalam{" "}
            <strong className="text-sm tabular-nums">{seasonDaysLeft} hari</strong>
          </span>
        </div>
      </div>

      {/* Hero: XP & Level */}
      <Card className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 sm:h-16 sm:w-16">
                <Trophy className="h-8 w-8" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">Level {currentLevel}</span>
                  <Badge
                    variant="outline"
                    className="border-amber-400/30 bg-amber-400/15 text-[10px] text-amber-600 dark:text-amber-400"
                  >
                    <Sparkles className="mr-1 h-3 w-3" aria-hidden /> Active Student
                  </Badge>
                  {myRank && (
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      Peringkat #{myRank}
                    </Badge>
                  )}
                </div>
                <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {totalXp.toLocaleString("id-ID")}{" "}
                  <span className="text-lg font-extrabold text-emerald-500">XP</span>
                </p>
              </div>
            </div>

            <div className="w-full space-y-2 md:max-w-xs">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Level {currentLevel}</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {xpToNextLevel} XP lagi ke Level {currentLevel + 1}
                </span>
              </div>
              <Progress value={levelProgress} className="h-2.5 rounded-full bg-muted sm:h-3" aria-label="Progres level" />
            </div>
          </div>

          {/* Target berikutnya */}
          {nextTargets.length > 0 && (
            <div className="space-y-2 border-t border-emerald-500/15 pt-5">
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Target className="h-4 w-4 text-emerald-500" aria-hidden /> Target berikutnya
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {nextTargets.map((b) => {
                  const theme = RARITY_THEME[b.rarity];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleOpenDetail(b)}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                          theme.iconBox
                        )}
                      >
                        <CategoryIcon category={b.category} className={cn("h-5 w-5", theme.icon)} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-bold">{b.title}</span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                            {b.currentCount}/{b.targetCount}
                          </span>
                        </div>
                        <Progress value={(b.currentCount / b.targetCount) * 100} className="h-1.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="space-y-5">
        <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 rounded-xl border border-border/70 bg-muted/50 p-1">
          <TabsTrigger value="badges" className="gap-2 rounded-lg py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Award className="h-4 w-4" aria-hidden /> Badges ({totalBadges})
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2 rounded-lg py-2.5 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Crown className="h-4 w-4" aria-hidden /> Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BADGES */}
        <TabsContent value="badges" className="space-y-4">
          {/* Toolbar filter */}
          <div className="space-y-3">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Cari level atau badge"
                aria-label="Cari badge"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-11 rounded-xl border-border/80 bg-background pl-10 text-sm shadow-sm placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div role="group" aria-label="Filter status" className="flex gap-1.5 overflow-x-auto">
                {(["Semua", "Terbuka", "Terkunci"] as StatusFilter[]).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={statusFilter === s ? "default" : "outline"}
                    aria-pressed={statusFilter === s}
                    onClick={() => {
                      setStatusFilter(s);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3.5 text-xs font-bold",
                      statusFilter === s && "bg-emerald-600 text-white hover:bg-emerald-700"
                    )}
                  >
                    {s}
                    {s === "Terbuka" && <span className="ml-1.5 tabular-nums opacity-80">{unlockedCount}</span>}
                    {s === "Terkunci" && (
                      <span className="ml-1.5 tabular-nums opacity-80">{totalBadges - unlockedCount}</span>
                    )}
                  </Button>
                ))}
              </div>

              <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />

              <div role="group" aria-label="Filter kategori" className="flex gap-1.5 overflow-x-auto">
                {(["Semua", "Membaca Materi", "Ulangan Harian"] as CategoryFilter[]).map((c) => (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={categoryFilter === c ? "soft" : "outline"}
                    aria-pressed={categoryFilter === c}
                    onClick={() => {
                      setCategoryFilter(c);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3.5 text-xs font-bold",
                      categoryFilter === c && "border border-emerald-500/40 text-foreground"
                    )}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {filteredBadges.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-sm font-semibold">Badge tidak ditemukan</p>
              <p className="mt-1 text-xs text-muted-foreground">Coba kata kunci atau filter yang lain.</p>
              {hasActiveFilter && (
                <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={resetFilters}>
                  Reset filter
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Menampilkan {shownBadges.length} dari {filteredBadges.length} badge
              </p>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownBadges.map((badge) => {
                  const theme = RARITY_THEME[badge.rarity];
                  const pct = (badge.currentCount / badge.targetCount) * 100;

                  return (
                    <li key={badge.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(badge)}
                        aria-label={`${badge.title}, ${badge.isUnlocked ? "terbuka" : "terkunci"}. Lihat detail`}
                        className={cn(
                          "flex h-full w-full flex-col gap-4 rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:p-5",
                          badge.isUnlocked
                            ? "border-emerald-500/30 bg-card shadow-sm hover:-translate-y-0.5 hover:border-emerald-500/70 hover:shadow-md"
                            : "border-dashed border-border bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/35"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                              badge.isUnlocked ? theme.iconBox : "border-muted-foreground/20 bg-muted"
                            )}
                          >
                            <CategoryIcon
                              category={badge.category}
                              className={cn("h-6 w-6", badge.isUnlocked ? theme.icon : "text-muted-foreground/60")}
                            />
                            {!badge.isUnlocked && (
                              <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                                <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={cn(
                                  "text-sm font-bold leading-snug tracking-tight",
                                  !badge.isUnlocked && "text-muted-foreground"
                                )}
                              >
                                {badge.title}
                              </h4>
                              <RarityTag rarity={badge.rarity} />
                            </div>
                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                              {badge.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto space-y-3">
                          {!badge.isUnlocked && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                                <span>Progres</span>
                                <span className="tabular-nums">
                                  {badge.currentCount}/{badge.targetCount}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn("h-full rounded-full", theme.bar)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px]">
                            <span
                              className={cn(
                                "flex items-center gap-1 font-extrabold",
                                badge.isUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                              )}
                            >
                              <Zap className="h-3.5 w-3.5 fill-current" aria-hidden /> +{badge.xp_reward} XP
                            </span>
                            {badge.isUnlocked && (
                              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" aria-hidden /> Terbuka
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
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="gap-1.5 rounded-xl text-xs font-bold"
                  >
                    Tampilkan lebih banyak <ChevronDown className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 2: LEADERBOARD */}
        <TabsContent value="leaderboard">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardContent className="space-y-6 p-4 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-amber-500" aria-hidden />
                  <CardTitle className="text-base font-bold">Peringkat 10 Besar Siswa</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  Real-Time XP
                </Badge>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Belum ada data peringkat siswa.
                </div>
              ) : (
                <>
                  {/* Podium 3 teratas */}
                  {podiumOrder.length === 3 && (
                    <div className="mx-auto grid w-full max-w-xl grid-cols-3 items-end gap-3 rounded-2xl bg-muted/25 px-2 pt-5 sm:gap-5 sm:px-5">
                      {podiumOrder.map((item) => {
                        const s = podiumStyle[item.rank];
                        return (
                          <div key={item.id} className="flex flex-col items-center gap-2 text-center">
                            <span className="text-2xl" aria-hidden>
                              {s.medal}
                            </span>
                            <Avatar
                              className={cn(
                                "border-2",
                                item.rank === 1 ? "h-14 w-14" : "h-11 w-11",
                                item.is_current_user && "ring-2 ring-emerald-500"
                              )}
                            >
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {initials(item.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="w-full min-w-0">
                              <p className="truncate text-xs font-bold sm:text-sm">
                                {item.full_name}
                                {item.is_current_user && (
                                  <span className="ml-1 text-[10px] font-normal text-emerald-500">(Anda)</span>
                                )}
                              </p>
                              <p className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                {item.total_xp.toLocaleString("id-ID")} XP
                              </p>
                            </div>
                            <div
                              className={cn(
                                "flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-2 text-sm font-extrabold text-muted-foreground",
                                s.height,
                                s.ring
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

                  {/* Peringkat lainnya */}
                  {restOfBoard.length > 0 && (
                    <ol className="space-y-2">
                      {restOfBoard.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                            item.is_current_user
                              ? "border-emerald-500/40 bg-emerald-500/10"
                              : "border-border bg-card hover:bg-muted/30"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-8 shrink-0 text-center text-xs font-black text-muted-foreground">
                              #{item.rank}
                            </span>
                            <Avatar className="h-9 w-9 shrink-0 border">
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {initials(item.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="truncate text-sm font-bold">
                              {item.full_name}
                              {item.is_current_user && (
                                <span className="ml-1.5 text-[10px] font-normal text-emerald-500">(Anda)</span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 pl-2 text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                            {item.total_xp.toLocaleString("id-ID")} XP
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

      {/* MODAL DETAIL BADGE */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedBadge && (
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/20 p-5 sm:max-w-md sm:p-6">
            <DialogHeader className="items-center text-center">
              <div
                className={cn(
                  "mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border-2 shadow-lg",
                  selectedBadge.isUnlocked
                    ? RARITY_THEME[selectedBadge.rarity].iconBox
                    : "border-border bg-muted"
                )}
              >
                {selectedBadge.isUnlocked ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden />
                ) : (
                  <Lock className="h-10 w-10 text-muted-foreground" aria-hidden />
                )}
              </div>

              <div className="mb-1 flex items-center gap-2">
                <RarityTag rarity={selectedBadge.rarity} />
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-3.5 w-3.5 fill-current" aria-hidden /> +{selectedBadge.xp_reward} XP
                </span>
              </div>

              <DialogTitle className="text-xl font-black text-foreground">{selectedBadge.title}</DialogTitle>
              <DialogDescription className="pt-1 text-sm text-muted-foreground">
                {selectedBadge.description}
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 space-y-3 border-y border-border/70 py-4 text-xs">
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <HelpCircle className="h-4 w-4 text-emerald-500" aria-hidden /> Progres
                  </span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                    {selectedBadge.currentCount} / {selectedBadge.targetCount}
                  </span>
                </div>

                <Progress
                  value={(selectedBadge.currentCount / selectedBadge.targetCount) * 100}
                  className="h-2.5 rounded-full"
                />

                {!selectedBadge.isUnlocked && (
                  <p className="pt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Tinggal {selectedBadge.targetCount - selectedBadge.currentCount} aktivitas lagi untuk membuka
                    badge ini.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="font-semibold text-muted-foreground">Kategori</span>
                <span className="font-bold text-foreground">{selectedBadge.category}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(false)}
                className="w-full text-xs sm:w-auto"
              >
                Tutup
              </Button>
              {!selectedBadge.isUnlocked && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                    navigate(selectedBadge.category === "Membaca Materi" ? "/dashboard/courses" : "/dashboard/exams");
                  }}
                  className="w-full gap-1 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
                >
                  {selectedBadge.category === "Membaca Materi" ? "Baca Materi Sekarang" : "Kerjakan Ujian Sekarang"}{" "}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
