
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
  Aktif: {
    title: "Bisa dikerjakan sekarang",
    hint: "Kerjakan sebelum waktunya habis.",
  },
  "Akan Datang": {
    title: "Segera dibuka",
    hint: "Belum bisa dikerjakan, siapkan dirimu dulu.",
  },
  Selesai: {
    title: "Sudah berakhir",
    hint: "Waktu pengerjaan paket ini sudah lewat.",
  },
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
        icon: <Zap className="h-5 w-5 text-sky-600" aria-hidden />,
        iconBox: "bg-sky-50 border-sky-100",
        badge: "text-sky-700 bg-sky-50 border-sky-200",
        strip: "bg-sky-500",
      };
    case "PTS/UTS":
      return {
        icon: <FileText className="h-5 w-5 text-violet-600" aria-hidden />,
        iconBox: "bg-violet-50 border-violet-100",
        badge: "text-violet-700 bg-violet-50 border-violet-200",
        strip: "bg-violet-500",
      };
    case "PAS/UAS":
      return {
        icon: <Award className="h-5 w-5 text-blue-600" aria-hidden />,
        iconBox: "bg-blue-50 border-blue-100",
        badge: "text-blue-700 bg-blue-50 border-blue-200",
        strip: "bg-blue-500",
      };
    case "Harian":
    default:
      return {
        icon: <BookOpen className="h-5 w-5 text-emerald-600" aria-hidden />,
        iconBox: "bg-emerald-50 border-emerald-100",
        badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
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
    <div className="w-full space-y-8 pb-12">

      {/* 1. HERO SECTION */}
      <Card className="relative overflow-hidden rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white shadow-xl shadow-emerald-900/10">
        <Trophy
          className="pointer-events-none absolute -bottom-8 -right-5 h-60 w-60 rotate-12 text-white/[0.07]"
          aria-hidden
        />

        <div className="pointer-events-none absolute right-20 top-0 h-48 w-48 rounded-full bg-white/[0.04] blur-3xl" />

        <CardContent className="relative z-10 space-y-7 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 shadow-inner sm:h-16 sm:w-16"
                aria-label={`Level ${level}`}
              >
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
                <span className="text-2xl font-black leading-none text-amber-200">{level}</span>
              </div>

              <div className="min-w-0 pt-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  Student Dashboard
                </p>
                <h1 className="break-words text-xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Selamat belajar, {studentName}! 👋
                </h1>
                <p className="mt-1 text-sm font-medium text-emerald-100/90">
                  {userClass}
                </p>
              </div>
            </div>

            <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm lg:flex">
              <Trophy className="h-9 w-9 text-amber-300" />
            </div>
          </div>

          {/* XP PROGRESS */}
          <div className="max-w-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-emerald-50">
                {xpRemaining} XP lagi menuju Level {level + 1}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 tabular-nums text-white">
                {currentXp}/{maxXp} XP
              </span>
            </div>

            <Progress
              value={(currentXp / maxXp) * 100}
              className="h-2.5 rounded-full bg-emerald-950/40"
              aria-label="Progres XP"
            />
          </div>

          {/* STATUS SUMMARY */}
          <dl className="grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3">
            {[
              {
                label: "Aktif",
                value: statusCounts.Aktif,
                icon: <Play className="h-3.5 w-3.5" />,
              },
              {
                label: "Akan datang",
                value: statusCounts["Akan Datang"],
                icon: <Calendar className="h-3.5 w-3.5" />,
              },
              {
                label: "Selesai",
                value: statusCounts.Selesai,
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/15 bg-white/[0.09] px-3 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.14] sm:px-4"
              >
                <div className="mb-2 flex items-center gap-1.5 text-emerald-100">
                  {s.icon}
                  <dt className="text-[10px] font-semibold sm:text-xs">{s.label}</dt>
                </div>
                <dd className="text-2xl font-black leading-none tabular-nums text-white sm:text-3xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* 2. SEARCH & FILTER */}
      <section className="space-y-5" aria-labelledby="exam-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Academic Center
              </p>
            </div>
            <h2
              id="exam-heading"
              className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
            >
              Paket Ujian
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih jenis evaluasi dan tingkatkan kemampuanmu.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari paket ujian..."
              aria-label="Cari paket ujian"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>

        {/* CATEGORY FILTER */}
        <div
          role="group"
          aria-label="Filter kategori"
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-2 scrollbar-none"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;

            return (
              <Button
                key={cat}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-10 shrink-0 gap-2 rounded-full border px-4 text-xs font-bold transition-all duration-200",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/15 hover:border-emerald-700 hover:bg-emerald-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                {cat}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
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
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
              <AlertCircle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Paket ujian gagal dimuat
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Periksa koneksi internetmu, lalu coba lagi.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fetchExamsData}
            className="gap-1.5 rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Muat ulang
          </Button>
        </div>
      )}

      {/* 3. EXAM PACKAGES */}
      <div className="space-y-9">
        {!loadError && totalShown === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Search className="h-6 w-6" />
            </div>

            <p className="text-base font-bold text-slate-900">
              Paket ujian tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? "Coba kata kunci lain atau ganti kategori."
                : "Belum ada paket ujian untuk kategori ini."}
            </p>

            {(searchQuery || selectedCategory !== "Semua") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
            <section
              key={status}
              aria-labelledby={`section-${status}`}
              className="space-y-4"
            >
              {/* SECTION HEADER */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 h-9 w-1 rounded-full",
                      status === "Aktif"
                        ? "bg-emerald-500"
                        : status === "Akan Datang"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                    )}
                  />

                  <div>
                    <h3
                      id={`section-${status}`}
                      className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg"
                    >
                      {STATUS_SECTION[status].title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {STATUS_SECTION[status].hint}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold tabular-nums text-slate-600">
                  {items.length} paket
                </span>
              </div>

              <ul className="space-y-3">
                {items.map((pkg) => {
                  const theme = getCategoryTheme(pkg.category);
                  const isAvailable = pkg.status === "Aktif";
                  const isDone = pkg.status === "Selesai";
                  const isUrgent =
                    isAvailable &&
                    pkg.days_left !== undefined &&
                    pkg.days_left <= 3;

                  return (
                    <li key={pkg.id}>
                      <Card
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-200/60",
                          isDone && "opacity-75"
                        )}
                      >
                        {/* CATEGORY STRIP */}
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            isDone ? "bg-slate-300" : theme.strip
                          )}
                          aria-hidden
                        />

                        <CardContent className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-6">
                          {/* EXAM DETAILS */}
                          <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14",
                                isDone
                                  ? "border-slate-200 bg-slate-50"
                                  : theme.iconBox
                              )}
                            >
                              {isDone ? (
                                <CheckCircle2
                                  className="h-5 w-5 text-slate-400"
                                  aria-hidden
                                />
                              ) : (
                                theme.icon
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-extrabold leading-snug text-slate-900 sm:text-base">
                                  {pkg.title}
                                </h4>

                                <span
                                  className={cn(
                                    "rounded-md border px-2 py-1 text-[10px] font-bold",
                                    theme.badge
                                  )}
                                >
                                  {pkg.category}
                                </span>
                              </div>

                              <p className="text-xs font-medium leading-relaxed text-slate-500">
                                {pkg.class_info}
                                {pkg.bab_info && ` • ${pkg.bab_info}`}
                              </p>

                              {/* ACTIVE TIME */}
                              {isAvailable && (
                                <div className="space-y-2 pt-0.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                      isUrgent
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : "border-emerald-100 bg-emerald-50 text-emerald-700"
                                    )}
                                  >
                                    <Clock
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isUrgent
                                          ? "text-rose-500"
                                          : "text-emerald-600"
                                      )}
                                      aria-hidden
                                    />

                                    {pkg.days_left !== undefined ? (
                                      <>
                                        {isUrgent
                                          ? "Segera berakhir:"
                                          : "Berakhir dalam:"}{" "}
                                        <strong className="font-extrabold">
                                          {pkg.days_left} hari lagi
                                        </strong>
                                      </>
                                    ) : (
                                      "Tanpa batas waktu"
                                    )}
                                  </span>

                                  {pkg.time_progress !== undefined && (
                                    <div
                                      className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100"
                                      role="progressbar"
                                      aria-label="Waktu pengerjaan yang sudah berjalan"
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(pkg.time_progress)}
                                    >
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          isUrgent
                                            ? "bg-rose-500"
                                            : "bg-emerald-500"
                                        )}
                                        style={{
                                          width: `${pkg.time_progress}%`,
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* UPCOMING */}
                              {pkg.status === "Akan Datang" && (
                                <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                  <Calendar
                                    className="h-3.5 w-3.5 text-amber-600"
                                    aria-hidden
                                  />
                                  Mulai tersedia:
                                  <strong className="font-extrabold">
                                    {pkg.start_date_str}
                                  </strong>
                                </span>
                              )}

                              {/* COMPLETED */}
                              {isDone && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                  <Calendar
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                  Dibuka sejak {pkg.start_date_str}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ACTION */}
                          <div className="w-full shrink-0 sm:w-auto sm:pl-3">
                            {isAvailable ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  navigate(`/dashboard/exams/${pkg.id}`)
                                }
                                className="h-10 w-full gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:w-auto sm:min-w-[145px]"
                              >
                                <Play
                                  className="h-3.5 w-3.5 fill-current"
                                  aria-hidden
                                />
                                Mulai Ujian
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled
                                variant="outline"
                                className="h-10 w-full gap-2 rounded-xl border-slate-200 bg-slate-50 px-6 text-xs font-bold text-slate-400 sm:w-auto sm:min-w-[145px]"
                              >
                                {isDone ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                    Selesai
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3.5 w-3.5" aria-hidden />
                                    Menunggu
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
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600">
          <Info className="h-5 w-5" aria-hidden />
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-slate-900">
            Info Paket Ujian
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Paket ujian diperbarui setiap 3 bulan sesuai kalender akademik.
          </p>
        </div>
      </div>
    </div>
  );
}
