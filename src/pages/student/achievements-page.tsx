import { useEffect, useState } from "react";
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
  BookOpen
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

export default function StudentAchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Auto-reset season check
        try {
          await supabase.rpc("check_and_auto_reset_season");
        } catch (rpcErr) {
          console.warn("Auto-reset RPC notice:", rpcErr);
        }

        // 2. Fetch Profil User, Leaderboard, & Config Season
        const [profileRes, leaderboardRes, seasonConfigRes] = await Promise.all([
          supabase.from("profiles").select("total_xp, total_articles_read, total_exams_passed").eq("id", user.id).single(),
          supabase.from("profiles").select("id, full_name, total_xp").order("total_xp", { ascending: false }).limit(10),
          supabase.from("system_settings").select("value").eq("key", "season_config").single()
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

  if (loading) return <PageSkeleton />;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalBadges = badges.length;

  const filteredBadges = badges.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRarityBadge = (rarity: BadgeItem["rarity"]) => {
    switch (rarity) {
      case "common":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] capitalize">Common</Badge>;
      case "rare":
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] capitalize">Rare</Badge>;
      case "epic":
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] capitalize">Epic</Badge>;
      case "legendary":
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] capitalize">Legendary</Badge>;
      default:
        return null;
    }
  };

  const handleOpenDetail = (badge: BadgeItem) => {
    setSelectedBadge(badge);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Judul & Banner Countdown Season Dinamis */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Pencapaian Saya</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {unlockedCount} dari {totalBadges} badge berhasil dibuka
          </p>
        </div>

        {/* BANNER COUNTDOWN SEASON */}
        <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 shadow-sm self-start sm:self-auto">
          <Timer className="h-4 w-4 animate-pulse" />
          <span>⏳ {seasonName} Berakhir dalam: <strong className="font-mono text-sm">{seasonDaysLeft} Hari</strong></span>
        </div>
      </div>

      {/* Hero Card: XP & Level Banner */}
      <Card className="relative overflow-hidden border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-background to-background p-6 shadow-md">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Level {currentLevel}
                </span>
                <Badge variant="outline" className="bg-amber-400/15 text-amber-400 border-amber-400/30 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" /> Active Student
                </Badge>
              </div>
              <p className="text-3xl font-black text-foreground tracking-tight">
                {totalXp} <span className="text-lg font-extrabold text-emerald-400">XP</span>
              </p>
            </div>
          </div>

          <div className="w-full md:max-w-xs space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Level {currentLevel}</span>
              <span className="text-emerald-400">{xpToNextLevel} XP lagi ke Level {currentLevel + 1}</span>
            </div>
            <Progress value={levelProgress} className="h-3 rounded-full bg-muted" />
          </div>
        </div>
      </Card>

      {/* Tabs & Filter Search */}
      <Tabs defaultValue="badges" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="badges" className="gap-2 font-bold text-xs">
              <Award className="h-4 w-4" /> Badges ({totalBadges})
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2 font-bold text-xs">
              <Crown className="h-4 w-4" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari level/badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* TAB 1: GRID BADGES */}
        <TabsContent value="badges" className="space-y-4">
          {filteredBadges.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-xs text-muted-foreground">Tidak ada badge yang cocok dengan pencarian.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBadges.map((badge) => {
                return (
                  <Card
                    key={badge.id}
                    onClick={() => handleOpenDetail(badge)}
                    className={cn(
                      "relative overflow-hidden transition-all duration-300 border-2 cursor-pointer select-none group",
                      badge.isUnlocked
                        ? "bg-card border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/80 hover:scale-[1.02]"
                        : "bg-muted/20 border-dashed border-border/80 hover:border-amber-500/40 hover:scale-[1.01]"
                    )}
                  >
                    {/* OVERLAY GEMBOK BADGE TERKUNCI */}
                    {!badge.isUnlocked && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] transition-opacity group-hover:bg-background/40">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 border border-amber-500/40 text-amber-400 shadow-lg backdrop-blur-md group-hover:scale-110 transition-transform">
                          <Lock className="h-5 w-5" />
                        </div>
                        <span className="mt-1.5 text-[10px] font-bold tracking-wider uppercase text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {badge.currentCount}/{badge.targetCount} Dikumpulkan
                        </span>
                      </div>
                    )}

                    {/* KONTEN BADGE */}
                    <div className={cn("p-5 flex items-start gap-4 transition-all", !badge.isUnlocked && "filter blur-[1px] grayscale opacity-40")}>
                      <div
                        className={cn(
                          "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 font-bold",
                          badge.isUnlocked
                            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/40 text-emerald-400 shadow-inner"
                            : "bg-muted border-muted-foreground/20 text-muted-foreground"
                        )}
                      >
                        {badge.category === "Membaca Materi" ? (
                          <BookOpen className="h-7 w-7 text-emerald-400" />
                        ) : (
                          <Zap className="h-7 w-7 fill-current text-emerald-400 drop-shadow-sm" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2 pr-2">
                          <h4 className="text-sm font-black truncate leading-snug">
                            {badge.title}
                          </h4>
                          {getRarityBadge(badge.rarity)}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {badge.description}
                        </p>

                        <div className="pt-2.5 flex items-center justify-between border-t border-border/40 text-[11px]">
                          <span className={cn("font-extrabold flex items-center gap-1", badge.isUnlocked ? "text-emerald-400" : "text-muted-foreground")}>
                            <Zap className="h-3.5 w-3.5 fill-current" /> +{badge.xp_reward} XP
                          </span>

                          {badge.isUnlocked && (
                            <span className="text-[10px] font-semibold text-emerald-500/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Terbuka
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: LEADERBOARD SISWA */}
        <TabsContent value="leaderboard">
          <Card className="border shadow-sm">
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-base font-bold">Peringkat 10 Besar Siswa</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold">Real-Time XP</Badge>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Belum ada data peringkat siswa.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {leaderboard.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors",
                        item.is_current_user
                          ? "bg-emerald-500/10 border-emerald-500/40 font-bold"
                          : "bg-card hover:bg-muted/30 border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-black text-xs">
                          {item.rank === 1 && <span className="text-amber-400 text-sm">🥇</span>}
                          {item.rank === 2 && <span className="text-slate-300 text-sm">🥈</span>}
                          {item.rank === 3 && <span className="text-amber-600 text-sm">🥉</span>}
                          {item.rank > 3 && <span className="text-muted-foreground">#{item.rank}</span>}
                        </div>

                        <Avatar className="h-9 w-9 border shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {initials(item.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate leading-none">
                            {item.full_name} {item.is_current_user && <span className="text-[10px] text-emerald-400 font-normal ml-1">(Anda)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-emerald-400">
                          {item.total_xp} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DIALOG DETAIL BADGE DENGAN PROGRESS BAR */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedBadge && (
          <DialogContent className="sm:max-w-md border-2 border-emerald-500/30">
            <DialogHeader className="items-center text-center">
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-3xl border-2 mb-2 shadow-lg",
                  selectedBadge.isUnlocked
                    ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/50 text-emerald-400 shadow-emerald-500/10"
                    : "bg-muted border-amber-500/30 text-amber-400"
                )}
              >
                {selectedBadge.isUnlocked ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                ) : (
                  <Lock className="h-10 w-10 text-amber-400" />
                )}
              </div>

              <div className="flex items-center gap-2 mb-1">
                {getRarityBadge(selectedBadge.rarity)}
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 fill-current" /> +{selectedBadge.xp_reward} XP
                </span>
              </div>

              <DialogTitle className="text-xl font-black text-foreground">
                {selectedBadge.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                {selectedBadge.description}
              </DialogDescription>
            </DialogHeader>

            {/* PROGRESS BAR DI DALAM MODAL DETAIL */}
            <div className="space-y-3 py-3 border-y my-2 text-xs">
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-foreground flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-emerald-400" /> Progres Kemajuan:
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {selectedBadge.currentCount} / {selectedBadge.targetCount}
                  </span>
                </div>

                <Progress 
                  value={(selectedBadge.currentCount / selectedBadge.targetCount) * 100} 
                  className="h-2.5 rounded-full"
                />

                {!selectedBadge.isUnlocked && (
                  <p className="text-[11px] text-amber-400/90 font-medium pt-0.5">
                    💡 Perlu {selectedBadge.targetCount - selectedBadge.currentCount} aktivitas lagi untuk membuka badge ini!
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-muted-foreground font-semibold">Kategori Badges:</span>
                <span className="font-bold text-foreground">{selectedBadge.category}</span>
              </div>
            </div>

            <DialogFooter className="sm:justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Tutup
              </Button>
              {!selectedBadge.isUnlocked && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                    window.location.href = selectedBadge.category === "Membaca Materi" ? "/dashboard/courses" : "/dashboard/exams";
                  }}
                  className="w-full sm:w-auto text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {selectedBadge.category === "Membaca Materi" ? "Baca Materi Sekarang" : "Kerjakan Ujian Sekarang"} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
