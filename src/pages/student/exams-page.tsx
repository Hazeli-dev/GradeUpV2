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
  GraduationCap,
  ChevronRight,
  Target,
  Layers3,
  RotateCcw,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ExamStatus = "Aktif" | "Akan Datang" | "Selesai";
type StudentExamResultStatus = "LULUS" | "BELUM LULUS";

interface ExamPackageItem {
  id: string;
  title: string;
  subject: string;
  category: string;
  education_level: string;
  grade: number | null;
  class_info: string;
  bab_info?: string;
  start_time?: string;
  end_time?: string;
  status: ExamStatus;
  days_left?: number;
  start_date_str?: string;
  time_progress?: number;
  premium?: boolean;
  passing_score: number;
}

interface StudentExamResult {
  status: StudentExamResultStatus;
  score: number;
  passingScore: number;
}

const STATUS_ORDER: ExamStatus[] = ["Aktif", "Akan Datang", "Selesai"];

const GRADES_BY_LEVEL: Record<string, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

const EDUCATION_LEVELS = ["SD", "SMP", "SMA", "SMK"];
const ALL = "Semua";
const DEFAULT_PASSING_SCORE = 70;

// =====================================================
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card dan panel.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

// Input dan select.
const FIELD =
  "h-11 w-full rounded-xl border border-emerald-900/10 bg-white/70 px-3 text-sm text-foreground outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-emerald-400/10 dark:bg-slate-950/40 dark:focus:bg-slate-950/60";

// Tombol utama emerald.
const BTN_PRIMARY =
  "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-700/25 focus-visible:ring-2 focus-visible:ring-emerald-500/50";

// Animasi ringan. Dimatikan otomatis jika prefers-reduced-motion aktif.
const PAGE_STYLES = `
@keyframes gu-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
}
@keyframes gu-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(16px, 12px, 0) scale(1.05); }
}
.gu-float { animation: gu-float 10s ease-in-out infinite; }
.gu-drift { animation: gu-drift 18s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gu-float, .gu-drift { animation: none !important; }
}
`;

/**
 * Menyeragamkan penulisan jenjang agar profil dan paket ujian
 * menggunakan format yang sama.
 *
 * Fungsi ini hanya menormalisasi nama jenjang.
 * Fungsi ini TIDAK mengubah kelas menjadi fase pembelajaran.
 */
function normalizeLevel(value: unknown): string {
  const level = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  if (!level) return "";

  if (level === "SD" || level === "MI") return "SD";

  if (level === "SMP" || level === "MTS" || level === "MTs".toUpperCase()) {
    return "SMP";
  }

  if (level === "SMA" || level === "MA") return "SMA";

  if (level === "SMK") return "SMK";

  return level;
}

const STATUS_CONFIG: Record<
  ExamStatus,
  {
    title: string;
    subtitle: string;
    icon: typeof Play;
    color: string;
    background: string;
    border: string;
  }
> = {
  Aktif: {
    title: "Ujian tersedia",
    subtitle: "Paket ujian yang dapat kamu kerjakan sekarang",
    icon: Play,
    color: "text-emerald-600 dark:text-emerald-400",
    background: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  "Akan Datang": {
    title: "Segera dibuka",
    subtitle: "Persiapkan dirimu sebelum jadwal ujian dimulai",
    icon: Calendar,
    color: "text-sky-600 dark:text-sky-400",
    background: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  Selesai: {
    title: "Periode berakhir",
    subtitle: "Paket ujian yang sudah melewati batas waktu",
    icon: CheckCircle2,
    color: "text-slate-500 dark:text-slate-400",
    background: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
};

function getCategoryTheme(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("tryout")) {
    return {
      icon: Zap,
      color: "text-sky-700 dark:text-sky-300",
      badge: "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/50",
      gradient: "from-sky-500 to-cyan-500",
    };
  }

  if (normalized.includes("pts") || normalized.includes("uts")) {
    return {
      icon: FileText,
      color: "text-violet-700 dark:text-violet-300",
      badge: "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/50",
      gradient: "from-violet-500 to-purple-500",
    };
  }

  if (normalized.includes("pas") || normalized.includes("uas")) {
    return {
      icon: Award,
      color: "text-blue-700 dark:text-blue-300",
      badge: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50",
      gradient: "from-blue-500 to-indigo-500",
    };
  }

  return {
    icon: BookOpen,
    color: "text-emerald-700 dark:text-emerald-300",
    badge: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
    gradient: "from-emerald-500 to-teal-500",
  };
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLevelLabel(level: string) {
  const labels: Record<string, string> = {
    SD: "SD / MI",
    SMP: "SMP / MTs",
    SMA: "SMA / MA",
    SMK: "SMK",
    Kedinasan: "Kedinasan",
    Umum: "Umum",
  };

  return labels[level] || level || "Semua Jenjang";
}

export default function StudentExamsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [examPackages, setExamPackages] = useState<ExamPackageItem[]>([]);
  const [examResults, setExamResults] = useState<
    Record<string, StudentExamResult>
  >({});

  const [studentName, setStudentName] = useState("Siswa");
  const [userClass, setUserClass] = useState("Profil belum dilengkapi");

  const [profileLevel, setProfileLevel] = useState("");
  const [profileGrade, setProfileGrade] = useState<number | null>(null);

  const [selectedLevel, setSelectedLevel] = useState(ALL);
  const [selectedGrade, setSelectedGrade] = useState(ALL);
  const [selectedSubject, setSelectedSubject] = useState(ALL);
  const [selectedExamType, setSelectedExamType] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");

  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(10);

  const maxXp = 1000;
  const xpRemaining = Math.max(0, maxXp - currentXp);
  const xpPercentage = Math.min(100, (currentXp / maxXp) * 100);


  const fetchExamsData = useCallback(async () => {
    let currentStep = "Memeriksa sesi login";

    const logError = (label: string, error: any) => {
      console.error(`[GradeUp] ${label}`, {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error,
      });
    };

    try {
      setLoading(true);
      setLoadError(false);
      setErrorMessage("");

      // 1. Periksa sesi login
      currentStep = "Memeriksa sesi login";

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // 2. Ambil profil siswa
      currentStep = "Mengambil profil siswa";

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, name, total_xp, level, education_level, grade")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        logError("Profil siswa gagal dimuat", profileError);
      }

      if (profile) {
        setStudentName(
          profile.full_name ||
            profile.name ||
            user.email?.split("@")[0] ||
            "Siswa GradeUp"
        );

        const educationLevel = normalizeLevel(profile.education_level);
        const grade =
          profile.grade != null && Number.isFinite(Number(profile.grade))
            ? Number(profile.grade)
            : null;

        setProfileLevel(educationLevel);
        setProfileGrade(grade);

        setSelectedLevel(educationLevel || ALL);
        setSelectedGrade(grade != null ? String(grade) : ALL);
        setSelectedSubject(ALL);
        setSelectedExamType(ALL);

        setUserClass(
          educationLevel
            ? `${getLevelLabel(educationLevel)}${
                grade != null ? ` • Kelas ${grade}` : ""
              }`
            : "Profil pendidikan belum dilengkapi"
        );

        const totalXp = Number(profile.total_xp ?? 10);

        setCurrentXp(totalXp % maxXp);
        setLevel(Number(profile.level) || Math.floor(totalXp / maxXp) + 1);
      } else {
        setStudentName(user.email?.split("@")[0] || "Siswa GradeUp");
        setProfileLevel("");
        setProfileGrade(null);
        setSelectedLevel(ALL);
        setSelectedGrade(ALL);
        setSelectedSubject(ALL);
        setSelectedExamType(ALL);
        setUserClass("Profil pendidikan belum dilengkapi");
      }

      // 3. Ambil paket ujian
      currentStep = "Mengambil data paket ujian";

      const { data: rawPackages, error: packagesError } = await supabase
        .from("exam_packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (packagesError) {
        logError("Paket ujian gagal dimuat", packagesError);
        throw packagesError;
      }

      // Pertahankan aturan publikasi:
      // is_published = true ATAU status = Published.
      const packages = (rawPackages || []).filter(
        (pkg: any) =>
          pkg.is_published === true || pkg.status === "Published"
      );

      const now = Date.now();

      const formattedPackages: ExamPackageItem[] = packages.map(
        (pkg: any) => {
          const startDate = pkg.start_time
            ? new Date(pkg.start_time)
            : new Date(pkg.created_at || Date.now());

          const endDate = pkg.end_time ? new Date(pkg.end_time) : null;

          let status: ExamStatus = "Aktif";
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

              daysLeft = Math.max(
                1,
                Math.ceil(diffMs / (1000 * 60 * 60 * 24))
              );

              const total = endDate.getTime() - startDate.getTime();

              if (total > 0) {
                timeProgress = Math.min(
                  100,
                  Math.max(
                    0,
                    ((now - startDate.getTime()) / total) * 100
                  )
                );
              }
            }
          }

          const packageLevel = normalizeLevel(pkg.level);

          const packageGrade =
            pkg.grade != null && Number.isFinite(Number(pkg.grade))
              ? Number(pkg.grade)
              : null;

          return {
            id: pkg.id,
            title: pkg.title || "Paket Ujian",
            subject: pkg.category || "Belum ditentukan",
            category: pkg.type || "Ujian",
            education_level: packageLevel,
            grade: packageGrade,
            class_info: packageLevel
              ? `${getLevelLabel(packageLevel)}${
                  packageGrade != null ? ` • Kelas ${packageGrade}` : ""
                }`
              : "Semua Jenjang",
            bab_info: pkg.description || "Materi Ujian",
            start_time: pkg.start_time,
            end_time: pkg.end_time,
            status,
            days_left: daysLeft,
            time_progress: timeProgress,
            premium: Boolean(pkg.premium),
            passing_score:
              pkg.passing_score != null &&
              Number.isFinite(Number(pkg.passing_score))
                ? Number(pkg.passing_score)
                : DEFAULT_PASSING_SCORE,
            start_date_str: formatDate(pkg.start_time || pkg.created_at),
          };
        }
      );

      // Tampilkan paket terlebih dahulu.
      // Riwayat ujian tidak boleh menggagalkan daftar paket.
      setExamPackages(formattedPackages);

      // 4. Ambil riwayat ujian secara terpisah
      const resultsMap: Record<string, StudentExamResult> = {};
      const packageIds = formattedPackages.map((pkg) => pkg.id);

      if (packageIds.length > 0) {
        currentStep = "Mengambil riwayat ujian";

        try {
          const {
            data: completedAttempts,
            error: attemptsError,
          } = await supabase
            .from("exam_attempts")
            .select("exam_id, score, created_at")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .not("exam_id", "is", null)
            .in("exam_id", packageIds)
            .order("created_at", { ascending: false });

          if (attemptsError) {
            logError("Riwayat ujian gagal dimuat", attemptsError);
          } else {
            const attemptsByExam: Record<
              string,
              { score: number; createdAt: string }[]
            > = {};

            (completedAttempts || []).forEach((attempt) => {
              if (!attempt.exam_id) return;

              if (!attemptsByExam[attempt.exam_id]) {
                attemptsByExam[attempt.exam_id] = [];
              }

              attemptsByExam[attempt.exam_id].push({
                score: Number(attempt.score ?? 0),
                createdAt: attempt.created_at || "",
              });
            });

            formattedPackages.forEach((pkg) => {
              const attempts = attemptsByExam[pkg.id] || [];

              if (attempts.length === 0) return;

              const passingScore = pkg.passing_score;
              const latestAttempt = attempts[0];

              const passedAttempt = attempts.find(
                (attempt) => attempt.score >= passingScore
              );

              resultsMap[pkg.id] = passedAttempt
                ? {
                    status: "LULUS",
                    score: passedAttempt.score,
                    passingScore,
                  }
                : {
                    status: "BELUM LULUS",
                    score: latestAttempt.score,
                    passingScore,
                  };
            });
          }
        } catch (attemptError) {
          logError("Kesalahan mengambil riwayat ujian", attemptError);
        }
      }

      setExamResults(resultsMap);

      console.log("[GradeUp] Data ujian berhasil dimuat", {
        totalPackages: formattedPackages.length,
        totalResults: Object.keys(resultsMap).length,
      });
    } catch (error: any) {
      logError(`Gagal pada tahap: ${currentStep}`, error);

      setLoadError(true);
      setErrorMessage(
        `${currentStep}: ${
          error?.message || "Terjadi kesalahan saat mengambil data."
        }${error?.code ? ` (Kode: ${error.code})` : ""}`
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchExamsData();
  }, [fetchExamsData]);

  const availableLevels = useMemo(() => {
    const levels = new Set(
      examPackages
        .map((item) => item.education_level)
        .filter(Boolean)
    );

    return [
      ...EDUCATION_LEVELS.filter((item) => levels.has(item)),
      ...Array.from(levels).filter(
        (item) => !EDUCATION_LEVELS.includes(item)
      ),
    ];
  }, [examPackages]);

  const availableGrades = useMemo(() => {
    if (selectedLevel === ALL) return [];

    const configuredGrades = GRADES_BY_LEVEL[selectedLevel] || [];

    const packageGrades = examPackages
      .filter((item) => item.education_level === selectedLevel)
      .map((item) => item.grade)
      .filter((grade): grade is number => grade != null);

    return Array.from(new Set([...configuredGrades, ...packageGrades])).sort(
      (a, b) => a - b
    );
  }, [examPackages, selectedLevel]);

  const availableSubjects = useMemo(() => {
    const subjects = examPackages
      .filter((item) => {
        const matchLevel =
          selectedLevel === ALL ||
          item.education_level === selectedLevel;

        const matchGrade =
          selectedGrade === ALL ||
          item.grade === Number(selectedGrade);

        return matchLevel && matchGrade;
      })
      .map((item) => item.subject)
      .filter(
        (subject) => subject && subject !== "Belum ditentukan"
      );

    return Array.from(new Set(subjects)).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  }, [examPackages, selectedLevel, selectedGrade]);

  const availableExamTypes = useMemo(() => {
    const types = examPackages
      .filter((item) => {
        const matchLevel =
          selectedLevel === ALL ||
          item.education_level === selectedLevel;

        const matchGrade =
          selectedGrade === ALL ||
          item.grade === Number(selectedGrade);

        return matchLevel && matchGrade;
      })
      .map((item) => item.category)
      .filter(Boolean);

    return Array.from(new Set(types)).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  }, [examPackages, selectedLevel, selectedGrade]);

  const statusCounts = useMemo(
    () => ({
      Aktif: examPackages.filter((item) => item.status === "Aktif").length,
      "Akan Datang": examPackages.filter(
        (item) => item.status === "Akan Datang"
      ).length,
      Selesai: examPackages.filter((item) => item.status === "Selesai").length,
    }),
    [examPackages]
  );

  const resultCounts = useMemo(() => {
    const results = Object.values(examResults);

    return {
      passed: results.filter((result) => result.status === "LULUS").length,
      failed: results.filter(
        (result) => result.status === "BELUM LULUS"
      ).length,
      new: Math.max(0, examPackages.length - results.length),
    };
  }, [examPackages, examResults]);

  const resetToProfile = () => {
    setSelectedLevel(profileLevel || ALL);
    setSelectedGrade(profileGrade != null ? String(profileGrade) : ALL);
    setSelectedSubject(ALL);
    setSelectedExamType(ALL);
    setSearchQuery("");
  };

  const resetAllFilters = () => {
    setSelectedLevel(ALL);
    setSelectedGrade(ALL);
    setSelectedSubject(ALL);
    setSelectedExamType(ALL);
    setSearchQuery("");
  };

  const groupedPackages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = examPackages.filter((pkg) => {
      // Filter jenjang.
      const matchLevel =
        selectedLevel === ALL ||
        pkg.education_level === selectedLevel;

      // Filter kelas individual, bukan fase.
      const matchGrade =
        selectedGrade === ALL ||
        pkg.grade === Number(selectedGrade);

      const matchSubject =
        selectedSubject === ALL ||
        pkg.subject === selectedSubject;

      const matchExamType =
        selectedExamType === ALL ||
        pkg.category === selectedExamType;

      const matchSearch =
        !query ||
        pkg.title.toLowerCase().includes(query) ||
        pkg.subject.toLowerCase().includes(query) ||
        pkg.class_info.toLowerCase().includes(query) ||
        pkg.category.toLowerCase().includes(query) ||
        (pkg.bab_info || "").toLowerCase().includes(query);

      return (
        matchLevel &&
        matchGrade &&
        matchSubject &&
        matchExamType &&
        matchSearch
      );
    });

    return STATUS_ORDER.map((status) => ({
      status,
      items: filtered
        .filter((item) => item.status === status)
        .sort((a, b) =>
          status === "Aktif"
            ? (a.days_left ?? Infinity) - (b.days_left ?? Infinity)
            : 0
        ),
    })).filter((group) => group.items.length > 0);
  }, [
    examPackages,
    selectedLevel,
    selectedGrade,
    selectedSubject,
    selectedExamType,
    searchQuery,
  ]);

  const totalShown = groupedPackages.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const hasActiveFilters =
    selectedLevel !== ALL ||
    selectedGrade !== ALL ||
    selectedSubject !== ALL ||
    selectedExamType !== ALL ||
    Boolean(searchQuery);

  if (loading) return <PageSkeleton />;

  return (
    <div className="relative isolate min-h-full w-full text-foreground">
      <style>{PAGE_STYLES}</style>

      {/* BACKGROUND DEKORATIF (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Wash gradient halaman */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />

        {/* Grid halus, memudar ke bawah */}
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] dark:opacity-40" />

        {/* Orb ambient */}
        <div className="gu-drift absolute -left-28 top-[28rem] h-[24rem] w-[24rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/12" />
        <div className="gu-float absolute -right-24 top-[46rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
        <div className="absolute -left-20 bottom-20 h-[20rem] w-[20rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
      </div>

      <div className="relative space-y-6 pb-10 sm:space-y-7">
        {/* HERO */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-950 shadow-[0_24px_60px_-24px_rgba(6,78,59,0.6)]">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-600 via-teal-800 to-[#06241c]" />
          <div className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />
          <div className="gu-drift absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="absolute -right-14 bottom-6 -z-10 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute -right-28 -bottom-8 -z-10 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="absolute right-5 top-5 hidden opacity-[0.06] sm:block">
            <GraduationCap className="h-56 w-56 text-white" />
          </div>

          <div className="relative p-5 sm:p-8 lg:p-9">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg ring-1 ring-inset ring-white/10 backdrop-blur-md sm:h-16 sm:w-16">
                    <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-md">
                      <Sparkles className="h-3.5 w-3.5" />
                      GradeUp Exam Center
                    </div>

                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                      Ruang Ujian <span className="text-emerald-300">Siswa</span>
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/75 sm:text-[15px]">
                      Selamat datang,{" "}
                      <span className="font-bold text-white">{studentName}</span>.
                      Siapkan dirimu dan tunjukkan kemampuan terbaikmu hari ini.
                    </p>
                  </div>
                </div>

                <div className="flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </span>
                  {statusCounts.Aktif} ujian tersedia
                </div>
              </div>

              <div className="grid gap-4 border-t border-white/15 pt-5 sm:pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                {/* XP */}
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4 shadow-inner shadow-black/10 backdrop-blur-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                        <Star className="h-4 w-4" />
                      </div>
                      Level {level}
                    </div>
                    <span className="text-xs font-semibold text-emerald-100/80">
                      Progres XP
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black tracking-tight text-white tabular-nums">
                        {currentXp.toLocaleString("id-ID")}
                        <span className="ml-1 text-sm font-semibold text-emerald-100/70">
                          XP
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-emerald-100/70">
                        {xpRemaining.toLocaleString("id-ID")} XP menuju target
                        progres berikutnya
                      </p>
                    </div>
                    <Zap className="mb-1 h-7 w-7 text-amber-300" />
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-200 to-white shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-all duration-700 motion-reduce:transition-none"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[10px] font-semibold text-emerald-100/60">
                    <span>Level {level}</span>
                    <span>{maxXp.toLocaleString("id-ID")} XP</span>
                  </div>
                </div>

                {/* STATUS SUMMARY */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {[
                    {
                      label: "Aktif",
                      value: statusCounts.Aktif,
                      icon: Play,
                      color: "text-emerald-300",
                      bg: "bg-emerald-400/10",
                    },
                    {
                      label: "Mendatang",
                      value: statusCounts["Akan Datang"],
                      icon: Calendar,
                      color: "text-sky-300",
                      bg: "bg-sky-400/10",
                    },
                    {
                      label: "Berakhir",
                      value: statusCounts.Selesai,
                      icon: CheckCircle2,
                      color: "text-slate-300",
                      bg: "bg-white/10",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-md transition-colors hover:bg-white/[0.12] motion-reduce:transition-none sm:p-4"
                      >
                        <div className="flex flex-col gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              item.bg,
                              item.color
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-white tabular-nums sm:text-3xl">
                              {item.value}
                            </p>
                            <p className="mt-0.5 text-[10px] font-bold text-white/55 sm:text-xs">
                              {item.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RINGKASAN HASIL */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={cn(
              "group relative overflow-hidden rounded-2xl border-rose-500/20 p-4 transition hover:-translate-y-0.5 hover:border-rose-500/40 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/15">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold sm:text-sm">
                  Belum dikerjakan
                </span>
              </div>
              <span className="text-2xl font-black tabular-nums text-rose-700 dark:text-rose-300">
                {resultCounts.new}
              </span>
            </div>
            <p className="relative mt-2 text-xs text-muted-foreground">
              Paket berstatus NEW
            </p>
          </div>

          <div
            className={cn(
              "group relative overflow-hidden rounded-2xl border-emerald-500/20 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold sm:text-sm">Lulus</span>
              </div>
              <span className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                {resultCounts.passed}
              </span>
            </div>
            <p className="relative mt-2 text-xs text-muted-foreground">
              Memenuhi nilai KKM
            </p>
          </div>

          <div
            className={cn(
              "group relative overflow-hidden rounded-2xl border-amber-500/20 p-4 transition hover:-translate-y-0.5 hover:border-amber-500/40 motion-reduce:transform-none motion-reduce:transition-none",
              GLASS
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/15">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold sm:text-sm">
                  Belum lulus
                </span>
              </div>
              <span className="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-300">
                {resultCounts.failed}
              </span>
            </div>
            <p className="relative mt-2 text-xs text-muted-foreground">
              Belum mencapai KKM
            </p>
          </div>
        </section>

        {/* KONTEKS SISWA */}
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            GLASS
          )}
        >
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate font-semibold text-foreground">
              {userClass}
            </span>
            <span className="text-border">/</span>
            <span className="truncate">Daftar evaluasi pembelajaran</span>
          </div>

          <button
            type="button"
            onClick={fetchExamsData}
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Perbarui data
          </button>
        </div>

        {/* FILTER PAKET UJIAN */}
        <section
          className={cn("relative overflow-hidden rounded-2xl", GLASS)}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    Paket Ujian
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Temukan ujian sesuai jenjang dan mata pelajaran
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetToProfile}
                className="w-fit gap-2 rounded-xl border-emerald-900/10 bg-white/60 hover:bg-emerald-500/10 dark:border-emerald-400/10 dark:bg-slate-950/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Profil Saya
              </Button>
            </div>

            {!profileLevel && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Profil pendidikan belum dilengkapi
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Saat ini semua jenjang ditampilkan. Lengkapi jenjang dan
                    kelas melalui Pengaturan Profil agar filter otomatis
                    mengikuti profilmu.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="exam-level"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Jenjang Pendidikan
                </label>
                <select
                  id="exam-level"
                  value={selectedLevel}
                  onChange={(event) => {
                    setSelectedLevel(event.target.value);
                    setSelectedGrade(ALL);
                    setSelectedSubject(ALL);
                    setSelectedExamType(ALL);
                  }}
                  className={FIELD}
                >
                  <option value={ALL}>Semua Jenjang</option>
                  {availableLevels.map((item) => (
                    <option key={item} value={item}>
                      {getLevelLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="exam-grade"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Kelas
                </label>
                <select
                  id="exam-grade"
                  value={selectedGrade}
                  disabled={selectedLevel === ALL}
                  onChange={(event) => {
                    setSelectedGrade(event.target.value);
                    setSelectedSubject(ALL);
                    setSelectedExamType(ALL);
                  }}
                  className={cn(
                    FIELD,
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <option value={ALL}>Semua Kelas</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={String(grade)}>
                      Kelas {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="exam-subject"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Mata Pelajaran
                </label>
                <select
                  id="exam-subject"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                  className={FIELD}
                >
                  <option value={ALL}>Semua Mata Pelajaran</option>
                  {availableSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="exam-type"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Jenis Ujian
                </label>
                <select
                  id="exam-type"
                  value={selectedExamType}
                  onChange={(event) => setSelectedExamType(event.target.value)}
                  className={FIELD}
                >
                  <option value={ALL}>Semua Jenis Ujian</option>
                  {availableExamTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-emerald-900/10 pt-4 dark:border-emerald-400/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari paket, mapel, atau materi..."
                  className={cn(
                    FIELD,
                    "pl-10 pr-10 placeholder:text-muted-foreground"
                  )}
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-foreground motion-reduce:transition-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <strong className="text-foreground">{totalShown}</strong>{" "}
                paket ujian
              </p>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Filter aktif:
                </span>

                {selectedLevel !== ALL && (
                  <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {getLevelLabel(selectedLevel)}
                  </span>
                )}

                {selectedGrade !== ALL && (
                  <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Kelas {selectedGrade}
                  </span>
                )}

                {selectedSubject !== ALL && (
                  <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {selectedSubject}
                  </span>
                )}

                {selectedExamType !== ALL && (
                  <span className="rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    {selectedExamType}
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="ml-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
                >
                  Hapus semua filter
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ERROR STATE */}
        {loadError && (
          <div className="flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  Gagal memuat paket ujian
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={fetchExamsData}
              className={cn("gap-2 rounded-xl", BTN_PRIMARY)}
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* DAFTAR UJIAN */}
        {!loadError && (
          <div className="space-y-8">
            {totalShown === 0 ? (
              <div className="relative overflow-hidden rounded-3xl border border-dashed border-emerald-600/25 bg-white/60 px-5 py-16 text-center backdrop-blur-md dark:bg-slate-900/50">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
                />

                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <Search className="h-7 w-7" />
                </div>

                <h3 className="relative mt-5 text-lg font-black text-foreground">
                  Tidak ada paket ujian ditemukan
                </h3>

                <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Tidak ada paket yang sesuai dengan kombinasi filter saat ini.
                  Coba pilih jenjang, kelas, atau mata pelajaran lain.
                </p>

                <Button
                  variant="outline"
                  onClick={resetAllFilters}
                  className="relative mt-5 rounded-xl border-emerald-900/10 bg-white/70 hover:bg-emerald-500/10 dark:border-emerald-400/10 dark:bg-slate-950/40"
                >
                  Tampilkan semua ujian
                </Button>
              </div>
            ) : (
              groupedPackages.map(({ status, items }) => {
                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;

                return (
                  <section key={status} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                          config.background,
                          config.border,
                          config.color
                        )}
                      >
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-foreground">
                            {config.title}
                          </h3>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                            {items.length} paket
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {config.subtitle}
                        </p>
                      </div>

                      <div className="hidden h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent sm:block" />
                    </div>

                    <div className="grid gap-4">
                      {items.map((pkg) => {
                        const theme = getCategoryTheme(pkg.category);
                        const CategoryIcon = theme.icon;

                        const isAvailable = pkg.status === "Aktif";
                        const isDone = pkg.status === "Selesai";

                        const examResult = examResults[pkg.id];
                        const isNew = !examResult;
                        const isPassed = examResult?.status === "LULUS";
                        const isFailed = examResult?.status === "BELUM LULUS";

                        const isUrgent =
                          isAvailable &&
                          pkg.days_left !== undefined &&
                          pkg.days_left <= 3;

                        return (
                          <Card
                            key={pkg.id}
                            className={cn(
                              "group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-[0_20px_45px_-20px_rgba(6,78,59,0.35)] motion-reduce:transform-none motion-reduce:transition-none",
                              GLASS,
                              isDone && "opacity-80"
                            )}
                          >
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/0 blur-2xl transition-colors duration-500 group-hover:bg-emerald-400/15 motion-reduce:transition-none"
                            />

                            <div
                              className={cn(
                                "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
                                theme.gradient,
                                isDone && "from-slate-400 to-slate-500"
                              )}
                            />

                            <CardContent className="relative p-4 pl-5 sm:p-5 sm:pl-6">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 gap-3.5 sm:gap-4">
                                  <div
                                    className={cn(
                                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ring-1 ring-inset ring-white/20 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none sm:h-14 sm:w-14",
                                      theme.gradient,
                                      isDone && "from-slate-400 to-slate-500"
                                    )}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="h-6 w-6" />
                                    ) : (
                                      <CategoryIcon className="h-6 w-6" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isNew && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white shadow-md shadow-rose-500/20">
                                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                          NEW
                                        </span>
                                      )}

                                      {isPassed && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black tracking-wider text-emerald-700 dark:text-emerald-300">
                                          <CheckCircle2 className="h-3 w-3" />
                                          LULUS
                                        </span>
                                      )}

                                      {isFailed && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black tracking-wider text-rose-700 dark:text-rose-300">
                                          <AlertCircle className="h-3 w-3" />
                                          BELUM LULUS
                                        </span>
                                      )}

                                      <h4 className="text-[15px] font-extrabold leading-snug text-foreground sm:text-base">
                                        {pkg.title}
                                      </h4>

                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold",
                                          theme.badge,
                                          theme.color
                                        )}
                                      >
                                        {pkg.category}
                                      </span>

                                      {pkg.premium && (
                                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-300">
                                          <Star className="h-3 w-3 fill-current" />
                                          PREMIUM
                                        </span>
                                      )}

                                      {isUrgent && (
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-600 dark:text-rose-400">
                                          <AlertCircle className="h-3 w-3" />
                                          SEGERA BERAKHIR
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                      {pkg.bab_info}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                        <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        {pkg.subject}
                                      </span>

                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                        <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        {pkg.class_info}
                                      </span>

                                      {examResult && (
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-bold",
                                            isPassed
                                              ? "text-emerald-700 dark:text-emerald-400"
                                              : "text-rose-700 dark:text-rose-400"
                                          )}
                                        >
                                          <Target className="h-3.5 w-3.5" />
                                          Nilai {examResult.score} / KKM{" "}
                                          {examResult.passingScore}
                                        </span>
                                      )}

                                      {isAvailable && (
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-bold",
                                            isUrgent
                                              ? "text-rose-600 dark:text-rose-400"
                                              : "text-emerald-700 dark:text-emerald-400"
                                          )}
                                        >
                                          <Clock className="h-3.5 w-3.5" />
                                          {pkg.days_left !== undefined
                                            ? `${pkg.days_left} hari tersisa`
                                            : "Tanpa batas waktu"}
                                        </span>
                                      )}

                                      {pkg.status === "Akan Datang" && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                                          <Calendar className="h-3.5 w-3.5" />
                                          Mulai {pkg.start_date_str}
                                        </span>
                                      )}

                                      {isDone && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Periode ujian berakhir
                                        </span>
                                      )}
                                    </div>

                                    {isAvailable &&
                                      pkg.time_progress !== undefined && (
                                        <div className="mt-3 flex max-w-xs items-center gap-2">
                                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-white/10">
                                            <div
                                              className={cn(
                                                "h-full rounded-full transition-all motion-reduce:transition-none",
                                                isUrgent
                                                  ? "bg-rose-500"
                                                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
                                              )}
                                              style={{
                                                width: `${pkg.time_progress}%`,
                                              }}
                                            />
                                          </div>
                                          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                                            {Math.round(pkg.time_progress)}%
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-3 border-t border-emerald-900/10 pt-4 dark:border-emerald-400/10 lg:border-0 lg:pt-0">
                                  {isAvailable ? (
                                    <Button
                                      onClick={() =>
                                        navigate(`/dashboard/exams/${pkg.id}`)
                                      }
                                      className={cn(
                                        "h-11 w-full gap-2 rounded-xl px-5 text-xs font-bold transition-all motion-reduce:transition-none sm:w-auto sm:min-w-[160px]",
                                        BTN_PRIMARY
                                      )}
                                    >
                                      <Play className="h-4 w-4 fill-current" />
                                      {isPassed
                                        ? "Ulangi Ujian"
                                        : isFailed
                                          ? "Coba Lagi"
                                          : "Mulai Ujian"}
                                      <ArrowUpRight className="h-4 w-4 opacity-70" />
                                    </Button>
                                  ) : (
                                    <Button
                                      disabled
                                      variant="outline"
                                      className="h-11 w-full gap-2 rounded-xl border-border bg-muted/50 text-xs font-bold text-muted-foreground sm:w-auto sm:min-w-[160px]"
                                    >
                                      {isDone ? (
                                        <>
                                          <CheckCircle2 className="h-4 w-4" />
                                          Periode Berakhir
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="h-4 w-4" />
                                          Belum Dibuka
                                        </>
                                      )}
                                    </Button>
                                  )}

                                  <ChevronRight className="hidden h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500 motion-reduce:transform-none motion-reduce:transition-none lg:block" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}

        {/* FOOTER INFORMATION */}
        <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-white/60 to-teal-500/10 p-5 shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] backdrop-blur-md dark:via-slate-900/60 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(5,150,105,0.25)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom_left,black,transparent_65%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
          />

          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25">
              <Target className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-black text-foreground">
                Persiapkan dirimu sebelum ujian
              </h4>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Perhatikan jadwal dan batas waktu setiap paket ujian. Pastikan
                koneksi internet stabil dan baca petunjuk pengerjaan sebelum
                memulai evaluasi.
              </p>
            </div>

            <Info className="ml-auto hidden h-5 w-5 shrink-0 text-emerald-600/60 dark:text-emerald-400/60 sm:block" />
          </div>
        </section>
      </div>
    </div>
  );
}
