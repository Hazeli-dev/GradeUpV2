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
  Sparkles,
  ArrowUpRight,
  X,
  Sun,
  Moon,
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

const STATUS_SECTION: Record<ExamStatus, { title: string; hint: string; icon: React.ReactNode }> = {
  Aktif: { title: "Bisa dikerjakan sekarang", hint: "Kerjakan sebelum waktunya habis", icon: <Play className="h-4 w-4" /> },
  "Akan Datang": { title: "Segera dibuka", hint: "Siapkan dirimu, jadwalkan belajarmu", icon: <Calendar className="h-4 w-4" /> },
  Selesai: { title: "Sudah berakhir", hint: "Lihat riwayat pengerjaan", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const FALLBACK_PACKAGES: ExamPackageItem[] = [
  { id: "1", title: "Ulangan Harian Matematika", category: "Harian", class_info: "Kelas 6", bab_info: "Bab: Pecahan", status: "Aktif", days_left: 12 },
  { id: "2", title: "Tryout Literasi Numerasi", category: "Tryout", class_info: "SD", bab_info: "Semua Kelas", status: "Aktif", days_left: 45 },
  { id: "3", title: "Penilaian Tengah Semester", category: "PTS/UTS", class_info: "Kelas 6", bab_info: "Semua Mapel", status: "Akan Datang", start_date_str: "10 Apr 2026" },
  { id: "4", title: "Penilaian Akhir Semester", category: "PAS/UAS", class_info: "Kelas 6", bab_info: "Semua Mapel", status: "Akan Datang", start_date_str: "25 Jun 2026" },
];

function getCategoryTheme(category: string) {
  switch (category) {
    case "Tryout":
      return {
        icon: <Zap className="h-5 w-5" />,
        gradient: "from-sky-500 to-cyan-500",
        gradientDark: "dark:from-sky-600 dark:to-cyan-600",
        light: "bg-sky-500/10 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/20",
        badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
        ring: "group-hover:ring-sky-200 dark:group-hover:ring-sky-800",
        glow: "group-hover:shadow-sky-500/10 dark:group-hover:shadow-sky-500/20",
      };
    case "PTS/UTS":
      return {
        icon: <FileText className="h-5 w-5" />,
        gradient: "from-violet-500 to-purple-500",
        gradientDark: "dark:from-violet-600 dark:to-purple-600",
        light: "bg-violet-500/10 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/20",
        badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
        ring: "group-hover:ring-violet-200 dark:group-hover:ring-violet-800",
        glow: "group-hover:shadow-violet-500/10 dark:group-hover:shadow-violet-500/20",
      };
    case "PAS/UAS":
      return {
        icon: <Award className="h-5 w-5" />,
        gradient: "from-blue-500 to-indigo-500",
        gradientDark: "dark:from-blue-600 dark:to-indigo-600",
        light: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20",
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        ring: "group-hover:ring-blue-200 dark:group-hover:ring-blue-800",
        glow: "group-hover:shadow-blue-500/10 dark:group-hover:shadow-blue-500/20",
      };
    case "Harian":
    default:
      return {
        icon: <BookOpen className="h-5 w-5" />,
        gradient: "from-emerald-500 to-teal-500",
        gradientDark: "dark:from-emerald-600 dark:to-teal-600",
        light: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        ring: "group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800",
        glow: "group-hover:shadow-emerald-500/10 dark:group-hover:shadow-emerald-500/20",
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
  const [studentName, setStudentName] = useState("Siswa");
  const [userClass] = useState("Kelas 6 SD");
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(10);
  const [maxXp] = useState(1000);
  // Manual toggle for demo - remove if you use next-themes
  const [isDark, setIsDark] = useState(false);

  const fetchExamsData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, total_xp, level").eq("id", user.id).single();
        if (profile) {
          setStudentName(profile.full_name || user.email?.split("@")[0] || "Siswa GradeUp");
          const totalXp = profile.total_xp || 10;
          setCurrentXp(totalXp % 1000);
          setLevel(profile.level || Math.floor(totalXp / 1000) + 1);
        }
      }
      const { data: packages, error } = await supabase.from("exam_packages").select("*").or("is_published.eq.true,status.eq.Published").order("start_time", { ascending: true });
      if (error) throw error;
      const now = new Date().getTime();
      if (packages && packages.length > 0) {
        const formattedPackages: ExamPackageItem[] = packages.map((pkg: any) => {
          const startDate = pkg.start_time ? new Date(pkg.start_time) : new Date(pkg.created_at || Date.now());
          const endDate = pkg.end_time ? new Date(pkg.end_time) : null;
          let status: ExamStatus = "Akan Datang";
          let daysLeft: number | undefined;
          let timeProgress: number | undefined;
          if (startDate.getTime() > now) status = "Akan Datang";
          else if (endDate && now > endDate.getTime()) status = "Selesai";
          else {
            status = "Aktif";
            if (endDate) {
              const diffMs = endDate.getTime() - now;
              daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              const total = endDate.getTime() - startDate.getTime();
              if (total > 0) timeProgress = Math.min(100, Math.max(0, ((now - startDate.getTime()) / total) * 100));
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
            start_date_str: startDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
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

  useEffect(() => { fetchExamsData(); }, [fetchExamsData]);

  // Detect system dark mode - optional
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      // If using Tailwind darkMode: 'class', you would toggle document.documentElement class here
      // For this file we use local state + conditional classes to demonstrate both modes
    }
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: examPackages.length };
    examPackages.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [examPackages]);

  const statusCounts = useMemo(() => ({
    Aktif: examPackages.filter((p) => p.status === "Aktif").length,
    "Akan Datang": examPackages.filter((p) => p.status === "Akan Datang").length,
    Selesai: examPackages.filter((p) => p.status === "Selesai").length,
  }), [examPackages]);

  const groupedPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = examPackages.filter((pkg) => {
      const matchCategory = selectedCategory === "Semua" || pkg.category === selectedCategory;
      const matchSearch = !q || pkg.title.toLowerCase().includes(q) || pkg.class_info.toLowerCase().includes(q) || (pkg.bab_info || "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
    return STATUS_ORDER.map((status) => ({
      status,
      items: filtered.filter((p) => p.status === status).sort((a, b) => status === "Aktif" ? (a.days_left ?? Infinity) - (b.days_left ?? Infinity) : 0),
    })).filter((g) => g.items.length > 0);
  }, [examPackages, selectedCategory, searchQuery]);

  const totalShown = groupedPackages.reduce((sum, g) => sum + g.items.length, 0);
  const xpRemaining = Math.max(0, maxXp - currentXp);

  if (loading) return <PageSkeleton />;

  return (
    <div className={cn("w-full space-y-8 pb-16 transition-colors duration-300", isDark ? "dark" : "")}>
      <div className="dark:bg-slate-950 bg-transparent space-y-8 rounded-[2rem] p-1">
        
        {/* Theme Toggle - Hapus kalau udah pakai next-themes */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsDark(!isDark)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isDark ? <><Moon className="h-3.5 w-3.5" /> Dark</> : <><Sun className="h-3.5 w-3.5" /> Light</>}
          </button>
        </div>

        {/* HERO - Works in both modes */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-700 dark:via-teal-800 dark:to-slate-900" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-[80px] dark:bg-emerald-500/10" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-emerald-300/20 blur-[60px] dark:bg-teal-500/10" />
          <Trophy className="pointer-events-none absolute -bottom-10 -right-6 h-72 w-72 rotate-12 text-white/[0.06]" />

          <div className="relative z-10 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
                  <Star className="h-7 w-7 fill-white text-white" />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-amber-600 shadow-md">{level}</span>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100 ring-1 ring-white/10 backdrop-blur-md">
                    <Sparkles className="h-3 w-3" /> Student Dashboard
                  </div>
                  <h1 className="mt-2 text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                    Selamat belajar,<br className="sm:hidden" /> {studentName}! 👋
                  </h1>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-emerald-100/80">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{userClass}</span>
                    <span className="hidden sm:inline">• Siap naik level hari ini?</span>
                  </p>
                </div>
              </div>

              <div className="lg:text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg dark:bg-slate-900 dark:text-white">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {statusCounts.Aktif} ujian aktif
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-end">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-white/80">
                  <span>{xpRemaining} XP lagi ke Level {level + 1}</span>
                  <span className="tabular-nums">{currentXp}/{maxXp} XP</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-black/20 p-1 backdrop-blur-sm ring-1 ring-white/10">
                  <Progress value={(currentXp / maxXp) * 100} className="h-full rounded-full bg-transparent [&>div]:bg-gradient-to-r [&>div]:from-white [&>div]:to-emerald-100 [&>div]:shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Aktif", value: statusCounts.Aktif, icon: <Play className="h-3.5 w-3.5" />, color: "bg-emerald-400" },
                  { label: "Akan datang", value: statusCounts["Akan Datang"], icon: <Calendar className="h-3.5 w-3.5" />, color: "bg-amber-400" },
                  { label: "Selesai", value: statusCounts.Selesai, icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-slate-400" },
                ].map((s) => (
                  <div key={s.label} className="group relative overflow-hidden rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-white/[0.12] hover:ring-white/20">
                    <div className={cn("absolute top-0 left-0 h-0.5 w-full", s.color)} />
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                      {s.icon} {s.label}
                    </div>
                    <div className="mt-1.5 text-2xl font-black tabular-nums text-white">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER - Light/Dark aware sticky */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/60 sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2.5 text-[22px] font-black tracking-tight text-slate-900 dark:text-white">
                <span className="flex h-7 w-1.5 rounded-full bg-emerald-500" /> Paket Ujian
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">Temukan dan kerjakan evaluasi sesuai target belajarmu</p>
            </div>

            <div className="relative w-full sm:w-[340px] group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500 dark:text-slate-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, kelas, bab..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "group relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-bold transition-all",
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:border-white dark:bg-white dark:text-slate-900 dark:shadow-white/10"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-200 dark:hover:text-white"
                  )}
                >
                  {cat}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-black tabular-nums transition-colors", active ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-700 dark:text-slate-400 dark:group-hover:bg-white dark:group-hover:text-slate-900")}>
                    {count}
                  </span>
                </button>
              );
            })}
            {(searchQuery || selectedCategory !== "Semua") && (
              <button onClick={() => { setSearchQuery(""); setSelectedCategory("Semua"); }} className="ml-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                Reset filter
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}
        {loadError && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/50 dark:to-orange-950/30">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm dark:bg-slate-900"><AlertCircle className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold text-slate-900 dark:text-white">Gagal memuat paket</p><p className="text-xs text-slate-600 dark:text-slate-400">Periksa koneksi dan coba lagi</p></div>
            </div>
            <Button size="sm" onClick={fetchExamsData} className="gap-1.5 rounded-xl"><RefreshCw className="h-4 w-4" /> Coba lagi</Button>
          </div>
        )}

        {/* LIST */}
        <div className="space-y-10">
          {!loadError && totalShown === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50/50 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900"><Search className="h-7 w-7" /></div>
              <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">Tidak ada paket ditemukan</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{searchQuery ? `Tidak ada hasil untuk "${searchQuery}". Coba kata kunci lain.` : "Belum ada paket ujian untuk filter ini."}</p>
            </div>
          ) : (
            groupedPackages.map(({ status, items }) => (
              <section key={status} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm", status === "Aktif" ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400" : status === "Akan Datang" ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400")}>
                    {STATUS_SECTION[status].icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">{STATUS_SECTION[status].title} • {items.length}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{STATUS_SECTION[status].hint}</p>
                  </div>
                </div>

                <ul className="grid gap-3 sm:gap-4">
                  {items.map((pkg) => {
                    const theme = getCategoryTheme(pkg.category);
                    const isAvailable = pkg.status === "Aktif";
                    const isDone = pkg.status === "Selesai";
                    const isUrgent = isAvailable && pkg.days_left !== undefined && pkg.days_left <= 3;

                    return (
                      <li key={pkg.id} className="group">
                        <Card className={cn("relative overflow-hidden rounded-[1.25rem] border bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] ring-1 ring-transparent transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]", theme.ring, theme.glow, isDone && "opacity-70 hover:opacity-90")}>
                          <div className={cn("absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b", theme.gradient, theme.gradientDark, isDone && "from-slate-300 to-slate-300 dark:from-slate-700 dark:to-slate-700")} />
                          
                          <CardContent className="flex flex-col gap-4 p-4 pl-6 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-7">
                            <div className="flex min-w-0 gap-4">
                              <div className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md dark:border-slate-700", theme.light)}>
                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", theme.gradient, theme.gradientDark, isDone && "from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700")}>
                                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : theme.icon}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-[15px] font-extrabold leading-tight text-slate-900 group-hover:text-slate-950 dark:text-white dark:group-hover:text-white sm:text-[16px]">{pkg.title}</h4>
                                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide", theme.badge)}>{pkg.category}</span>
                                  {isUrgent && <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white"><AlertCircle className="h-3 w-3" /> SEGERA</span>}
                                </div>

                                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{pkg.class_info}</span>
                                  <span className="text-slate-300 dark:text-slate-600">•</span> {pkg.bab_info}
                                </p>

                                {isAvailable ? (
                                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", isUrgent ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300")}>
                                      <Clock className="h-3.5 w-3.5" /> {pkg.days_left !== undefined ? `${pkg.days_left} hari lagi` : "Tanpa batas"}
                                    </div>
                                    {pkg.time_progress !== undefined && (
                                      <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", isUrgent ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${pkg.time_progress}%` }} /></div>
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{Math.round(pkg.time_progress)}%</span>
                                      </div>
                                    )}
                                  </div>
                                ) : pkg.status === "Akan Datang" ? (
                                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/50">
                                    <Calendar className="h-3.5 w-3.5" /> Mulai {pkg.start_date_str}
                                  </div>
                                ) : (
                                  <div className="mt-2.5 text-xs font-medium text-slate-400 dark:text-slate-500">Dibuka sejak {pkg.start_date_str}</div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:pl-4">
                              {isAvailable ? (
                                <Button onClick={() => navigate(`/dashboard/exams/${pkg.id}`)} className="group/btn relative h-11 w-full gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 text-[13px] font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-black hover:shadow-xl hover:shadow-slate-900/30 dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100 sm:w-auto sm:min-w-[148px]">
                                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 opacity-0 transition-opacity duration-500 group-hover/btn:opacity-100" />
                                  <Play className="h-4 w-4 fill-white dark:fill-slate-900" /> Mulai Ujian <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                </Button>
                              ) : (
                                <Button disabled variant="outline" className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 sm:w-auto sm:min-w-[148px]">
                                  {isDone ? <><CheckCircle2 className="h-4 w-4" /> Selesai</> : <><Lock className="h-4 w-4" /> Menunggu</>}
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

        <div className="relative overflow-hidden rounded-[1.5rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl dark:bg-emerald-800/20" />
          <div className="relative flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md dark:bg-emerald-500"><Info className="h-5 w-5" /></div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Info Paket Ujian</h4>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed font-medium text-slate-600 dark:text-slate-400">Paket ujian diperbarui setiap 3 bulan sesuai kalender akademik. Selesaikan ujian aktif sebelum batas waktu untuk mendapatkan XP dan naik level. Gunakan filter kategori untuk fokus pada target belajarmu.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
