import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Clock,
  Play,
  Lock,
  BookOpen,
  Zap,
  FileText,
  Award,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ExamStatus = "Aktif" | "Akan Datang" | "Selesai";

interface ExamPackageItem {
  id: string;
  title: string;
  category: "Harian" | "Tryout" | "PTS/UTS" | "PAS/UAS" | string;
  class_info: string;
  bab_info?: string;
  start_time?: string;
  end_time?: string;
  status: ExamStatus;
  days_left?: number;
  start_date_str?: string;
  time_progress?: number;
}

const CATEGORIES = ["Semua", "Harian", "Tryout", "PTS/UTS", "PAS/UAS"] as const;
const STATUS_ORDER: ExamStatus[] = ["Aktif", "Akan Datang", "Selesai"];

const STATUS_SECTION: Record<ExamStatus, { title: string; hint: string }> = {
  Aktif: { title: "Bisa dikerjakan sekarang", hint: "Kerjakan sebelum waktunya habis." },
  "Akan Datang": { title: "Segera dibuka", hint: "Belum bisa dikerjakan, siapkan dirimu dulu." },
  Selesai: { title: "Sudah berakhir", hint: "Waktu pengerjaan paket ini sudah lewat." },
};

const FALLBACK_PACKAGES: ExamPackageItem[] = [
  {
    id: "1",
    title: "Ulangan Harian Matematika",
    category: "Harian",
    class_info: "Kelas 6",
    bab_info: "Bab: Pecahan",
    status: "Aktif",
    days_left: 12,
  },
  {
    id: "2",
    title: "Tryout Literasi Numerasi",
    category: "Tryout",
    class_info: "SD",
    bab_info: "Semua Kelas",
    status: "Aktif",
    days_left: 45,
  },
  {
    id: "3",
    title: "Penilaian Tengah Semester",
    category: "PTS/UTS",
    class_info: "Kelas 6",
    bab_info: "Semua Mapel",
    status: "Akan Datang",
    start_date_str: "10 Apr 2026",
  },
  {
    id: "4",
    title: "Penilaian Akhir Semester",
    category: "PAS/UAS",
    class_info: "Kelas 6",
    bab_info: "Semua Mapel",
    status: "Akan Datang",
    start_date_str: "25 Jun 2026",
  },
];

function getCategoryTheme(category: string) {
  switch (category) {
    case "Tryout":
      return {
        icon: <Zap className="h-6 w-6 text-sky-500" aria-hidden />,
        iconBox: "bg-sky-500/10 border-sky-500/25",
        badge: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
        strip: "bg-sky-500",
      };
    case "PTS/UTS":
      return {
        icon: <FileText className="h-6 w-6 text-purple-500" aria-hidden />,
        iconBox: "bg-purple-500/10 border-purple-500/25",
        badge: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
        strip: "bg-purple-500",
      };
    case "PAS/UAS":
      return {
        icon: <Award className="h-6 w-6 text-blue-500" aria-hidden />,
        iconBox: "bg-blue-500/10 border-blue-500/25",
        badge: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        strip: "bg-blue-500",
      };
    case "Harian":
    default:
      return {
        icon: <BookOpen className="h-6 w-6 text-emerald-500" aria-hidden />,
        iconBox: "bg-emerald-500/10 border-emerald-500/25",
        badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        strip: "bg-emerald-500",
      };
  }
}

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [examPackages, setExamPackages] = useState<ExamPackageItem[]>([]);

  // State Profile Siswa & Level GAMIFIKASI
  const [studentName, setStudentName] = useState("Siswa");
  const [userClass] = useState("Kelas 6 SD");
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(10);
  const [maxXp] = useState(1000);

  const fetchExamsData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, total_xp, level")
          .eq("id", user.id)
          .single();

        if (profile) {
          setStudentName(profile.full_name || user.email?.split("@")[0] || "Siswa GradeUp");
          const totalXp = profile.total_xp || 10;
          setCurrentXp(totalXp % 1000);
          setLevel(profile.level || Math.floor(totalXp / 1000) + 1);
        }
      }

      const { data: packages, error } = await supabase
        .from("exam_packages")
        .select("*")
        .or("is_published.eq.true,status.eq.Published")
        .order("start_time", { ascending: true });

      if (error) throw error;

      const now = new Date().getTime();

      if (packages && packages.length > 0) {
        const formattedPackages: ExamPackageItem[] = packages.map((pkg: any) => {
          const startDate = pkg.start_time ? new Date(pkg.start_time) : new Date(pkg.created_at || Date.now());
          const endDate = pkg.end_time ? new Date(pkg.end_time) : null;

          let status: ExamStatus = "Akan Datang";
          let daysLeft: number | undefined;
          let timeProgress: number | undefined;

          if (startDate.getTime() > now) {
            status = "Akan Datang";
          } else if (endDate && now > endDate.getTime()) {
            status = "Selesai";
          } else {
            status = "Aktif";
            if (endDate) {
              const diffMs = endDate.getTime() - now;
              daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              const total = endDate.getTime() - startDate.getTime();
              if (total > 0) {
                timeProgress = Math.min(100, Math.max(0, ((now - startDate.getTime()) / total) * 100));
              }
            }
          }

          return {
            id: pkg.id,
            title: pkg.title || "Paket Ujian",
            category: pkg.category || "Harian",
            class_info: pkg.class_info || pkg.level || "Kelas 6",
            bab_info: pkg.bab_info || pkg.description || "Semua Materi",
            start_time: pkg.start_time,
            end_time: pkg.end_time,
            status,
            days_left: daysLeft,
            time_progress: timeProgress,
            start_date_str: startDate.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          };
        });

        setExamPackages(formattedPackages);
      } else {
        setExamPackages(FALLBACK_PACKAGES);
      }
    } catch (err) {
      console.error("Gagal mengambil data paket ujian:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamsData();
  }, [fetchExamsData]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: examPackages.length };
    examPackages.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [examPackages]);

  const statusCounts = useMemo(
    () => ({
      Aktif: examPackages.filter((p) => p.status === "Aktif").length,
      "Akan Datang": examPackages.filter((p) => p.status === "Akan Datang").length,
      Selesai: examPackages.filter((p) => p.status === "Selesai").length,
    }),
    [examPackages]
  );

  const groupedPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = examPackages.filter((pkg) => {
      const matchCategory = selectedCategory === "Semua" || pkg.category === selectedCategory;
      const matchSearch =
        !q ||
        pkg.title.toLowerCase().includes(q) ||
        pkg.class_info.toLowerCase().includes(q) ||
        (pkg.bab_info || "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });

    return STATUS_ORDER.map((status) => ({
      status,
      items: filtered
        .filter((p) => p.status === status)
        .sort((a, b) =>
          status === "Aktif" ? (a.days_left ?? Infinity) - (b.days_left ?? Infinity) : 0
        ),
    })).filter((g) => g.items.length > 0);
  }, [examPackages, selectedCategory, searchQuery]);

  const totalShown = groupedPackages.reduce((sum, g) => sum + g.items.length, 0);
  const xpRemaining = Math.max(0, maxXp - currentXp);

  if (loading) return <PageSkeleton />;

  return (
    /* PERBAIKAN: Melebarkan container utama dari max-w-4xl ke w-full */
    <div className="w-full space-y-8 pb-12">
      {/* 1. HERO: SAPAAN, LEVEL & XP */}
      <Card className="relative overflow-hidden rounded-3xl border-none bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl">
        <Trophy
          className="pointer-events-none absolute -bottom-6 -right-4 h-56 w-56 rotate-12 text-white/10"
          aria-hidden
        />
        <CardContent className="relative z-10 space-y-6 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-300/15"
                aria-label={`Level ${level}`}
              >
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
                <span className="text-2xl font-black leading-none text-amber-200">{level}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight sm:text-3xl">
                  Selamat belajar, {studentName}! 👋
                </h1>
                <p className="mt-1 text-sm font-medium text-emerald-100">{userClass}</p>
              </div>
            </div>

            {/* Aksen Tropi untuk layar besar */}
            <div className="hidden lg:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <Trophy className="h-10 w-10 text-amber-300" />
            </div>
          </div>

          <div className="max-w-xl space-y-2">
            <div className="flex items-baseline justify-between text-xs font-semibold">
              <span className="text-emerald-50">
                {xpRemaining} XP lagi menuju Level {level + 1}
              </span>
              <span className="tabular-nums text-emerald-100">
                {currentXp}/{maxXp} XP
              </span>
            </div>
            <Progress
              value={(currentXp / maxXp) * 100}
              className="h-2.5 rounded-full bg-emerald-950/40"
              aria-label="Progres XP"
            />
          </div>

          {/* Ringkasan status paket */}
          <dl className="grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: "Aktif", value: statusCounts.Aktif },
              { label: "Akan datang", value: statusCounts["Akan Datang"] },
              { label: "Selesai", value: statusCounts.Selesai },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <dd className="text-2xl font-black tabular-nums leading-none">{s.value}</dd>
                <dt className="mt-1 text-xs font-medium text-emerald-100">{s.label}</dt>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* 2. JUDUL, PENCARIAN & FILTER */}
      <section className="space-y-4" aria-labelledby="exam-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="exam-heading" className="text-2xl font-black tracking-tight text-foreground">
              Paket Ujian
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pilih jenis evaluasi dan tingkatkan kemampuanmu.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari paket ujian..."
              aria-label="Cari paket ujian"
              className="h-10 w-full rounded-xl border border-border/70 bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
          </div>
        </div>

        {/* PILL FILTERS */}
        <div
          role="group"
          aria-label="Filter kategori"
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Button
                key={cat}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-9 shrink-0 gap-2 rounded-full px-4 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {cat}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] tabular-nums",
                    active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {categoryCounts[cat] || 0}
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      {/* ERROR STATE */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
            <div>
              <p className="text-sm font-bold text-foreground">Paket ujian gagal dimuat</p>
              <p className="text-xs text-muted-foreground">
                Periksa koneksi internetmu, lalu coba lagi.
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={fetchExamsData} className="gap-1.5 rounded-xl">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Muat ulang
          </Button>
        </div>
      )}

      {/* 3. DAFTAR PAKET UJIAN */}
      <div className="space-y-8">
        {!loadError && totalShown === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="text-sm font-semibold text-foreground">Paket ujian tidak ditemukan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? "Coba kata kunci lain atau ganti kategori."
                : "Belum ada paket ujian untuk kategori ini."}
            </p>
            {(searchQuery || selectedCategory !== "Semua") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Semua");
                }}
              >
                Reset filter
              </Button>
            )}
          </div>
        ) : (
          groupedPackages.map(({ status, items }) => (
            <section key={status} aria-labelledby={`section-${status}`} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <div>
                  <h3 id={`section-${status}`} className="text-base font-extrabold text-foreground">
                    {STATUS_SECTION[status].title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{STATUS_SECTION[status].hint}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {items.length} paket
                </span>
              </div>

              <ul className="space-y-3">
                {items.map((pkg) => {
                  const theme = getCategoryTheme(pkg.category);
                  const isAvailable = pkg.status === "Aktif";
                  const isDone = pkg.status === "Selesai";
                  const isUrgent = isAvailable && pkg.days_left !== undefined && pkg.days_left <= 3;

                  return (
                    <li key={pkg.id}>
                      <Card
                        className={cn(
                          "relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all hover:shadow-md hover:border-emerald-500/40",
                          isDone && "opacity-75"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1.5",
                            isDone ? "bg-muted-foreground/30" : theme.strip
                          )}
                          aria-hidden
                        />
                        <CardContent className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-6">
                          {/* DETAIL UJIAN */}
                          <div className="flex min-w-0 items-start gap-4">
                            <div
                              className={cn(
                                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border",
                                isDone ? "border-border bg-muted" : theme.iconBox
                              )}
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-6 w-6 text-muted-foreground" aria-hidden />
                              ) : (
                                theme.icon
                              )}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-extrabold leading-snug text-foreground sm:text-base">
                                  {pkg.title}
                                </h4>
                                <span
                                  className={cn(
                                    "rounded-md border px-2 py-0.5 text-[10px] font-bold",
                                    theme.badge
                                  )}
                                >
                                  {pkg.category}
                                </span>
                              </div>

                              <p className="text-xs font-medium text-muted-foreground">
                                {pkg.class_info}
                                {pkg.bab_info && ` • ${pkg.bab_info}`}
                              </p>

                              {/* WAKTU */}
                              {isAvailable && (
                                <div className="space-y-1.5 pt-0.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                      isUrgent
                                        ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                        : "border-border/60 bg-muted/60 text-muted-foreground"
                                    )}
                                  >
                                    <Clock
                                      className={cn("h-3.5 w-3.5", isUrgent ? "text-rose-500" : "text-emerald-500")}
                                      aria-hidden
                                    />
                                    {pkg.days_left !== undefined ? (
                                      <>
                                        {isUrgent ? "Segera berakhir:" : "Berakhir dalam:"}{" "}
                                        <strong className="font-bold">{pkg.days_left} hari lagi</strong>
                                      </>
                                    ) : (
                                      "Tanpa batas waktu"
                                    )}
                                  </span>
                                  {pkg.time_progress !== undefined && (
                                    <div
                                      className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-muted"
                                      role="progressbar"
                                      aria-label="Waktu pengerjaan yang sudah berjalan"
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(pkg.time_progress)}
                                    >
                                      <div
                                        className={cn("h-full rounded-full", isUrgent ? "bg-rose-500" : "bg-emerald-500")}
                                        style={{ width: `${pkg.time_progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {pkg.status === "Akan Datang" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                                  Mulai tersedia:{" "}
                                  <strong className="font-bold text-amber-600 dark:text-amber-400">
                                    {pkg.start_date_str}
                                  </strong>
                                </span>
                              )}

                              {isDone && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                                  Dibuka sejak {pkg.start_date_str}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* AKSI */}
                          <div className="w-full shrink-0 sm:w-auto">
                            {isAvailable ? (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/dashboard/exams/${pkg.id}`)}
                                className="h-10 w-full gap-1.5 rounded-xl bg-emerald-600 px-6 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:w-auto sm:min-w-[140px]"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> Mulai Ujian
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled
                                variant="outline"
                                className="h-10 w-full gap-1.5 rounded-xl px-6 text-xs font-bold sm:w-auto sm:min-w-[140px]"
                              >
                                {isDone ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Selesai
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3.5 w-3.5" aria-hidden /> Menunggu
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* 4. INFO FOOTER */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-500">
          <Info className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-foreground">Info Paket Ujian</h4>
          <p className="text-xs text-muted-foreground">
            Paket ujian diperbarui setiap 3 bulan sesuai kalender akademik.
          </p>
        </div>
      </div>
    </div>
  );
}
