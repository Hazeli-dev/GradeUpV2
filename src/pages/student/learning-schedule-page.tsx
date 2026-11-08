import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DAYS = [
  { value: 1, label: "Senin", short: "Sen" },
  { value: 2, label: "Selasa", short: "Sel" },
  { value: 3, label: "Rabu", short: "Rab" },
  { value: 4, label: "Kamis", short: "Kam" },
  { value: 5, label: "Jumat", short: "Jum" },
  { value: 6, label: "Sabtu", short: "Sab" },
  { value: 7, label: "Minggu", short: "Min" },
];

interface ScheduleRow {
  id: string;
  user_id: string;
  day_of_week: number;
  subject: string;
  sort_order: number;
  is_active: boolean;
}

interface ProfileData {
  full_name: string | null;
  grade: number | null;
  education_level: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
}

interface Recommendation {
  schedule_id: string;
  day_of_week: number;
  subject: string;
  sort_order: number;
  package_id: string;
  package_title: string;
  description: string | null;
  category: string | null;
  grade: number | null;
  level: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  passing_score: number | null;
  premium: boolean | null;
}

function getTodayDay(): number {
  return new Date().getDay() || 7;
}

function formatGrade(grade: number | null, level: string | null) {
  if (!grade || !level) return "Jenjang belum diatur";

  const normalizedLevel = level.toUpperCase();

  if (normalizedLevel === "SD") return `Kelas ${grade} SD`;
  if (normalizedLevel === "SMP") return `Kelas ${grade} SMP`;
  if (normalizedLevel === "SMA") return `Kelas ${grade} SMA`;

  return `Kelas ${grade} ${level}`;
}

function isPremiumActive(profile: ProfileData | null): boolean {
  if (!profile?.is_premium) return false;

  if (!profile.premium_until) return true;

  return new Date(profile.premium_until).getTime() > Date.now();
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;

  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);

  return updated;
}

export default function StudentLearningSchedulePage() {
  const navigate = useNavigate();
  const { openUpgrade } = useUpgradeModal();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [selectedDay, setSelectedDay] = useState<number>(getTodayDay());
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedDayInfo = useMemo(
    () => DAYS.find((day) => day.value === selectedDay) ?? DAYS[0],
    [selectedDay],
  );

  const profileComplete = Boolean(
    profile?.grade && profile?.education_level,
  );

  const premiumActive = isPremiumActive(profile);

  const selectedCount = selectedSubjects.length;

  const dayScheduleCount = useMemo(
    () =>
      scheduleRows.filter(
        (row) => row.day_of_week === selectedDay && row.is_active,
      ).length,
    [scheduleRows, selectedDay],
  );

  const activeRecommendations = useMemo(
    () => recommendations.filter((item) => item.package_id),
    [recommendations],
  );

  const premiumCount = useMemo(
    () => activeRecommendations.filter((item) => item.premium).length,
    [activeRecommendations],
  );

  const freeCount = activeRecommendations.length - premiumCount;

  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      const [profileResult, scheduleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, grade, education_level, is_premium, premium_until",
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("student_learning_schedules")
          .select(
            "id, user_id, day_of_week, subject, sort_order, is_active",
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("day_of_week", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (scheduleResult.error) throw scheduleResult.error;

      const profileData = profileResult.data as ProfileData | null;
      const schedules = (scheduleResult.data ?? []) as ScheduleRow[];

      setProfile(profileData);
      setScheduleRows(schedules);

      if (
        profileData?.grade &&
        profileData?.education_level
      ) {
        const { data: packageSubjects, error: subjectError } =
          await supabase
            .from("exam_packages")
            .select("subject")
            .eq("type", "Latihan")
            .eq("grade", profileData.grade)
            .eq("level", profileData.education_level)
            .eq("is_active", true)
            .eq("is_published", true)
            .eq("status", "Published");

        if (subjectError) throw subjectError;

        const uniqueSubjects = Array.from(
          new Set(
            (packageSubjects ?? [])
              .map((item) => item.subject?.trim())
              .filter((subject): subject is string => Boolean(subject)),
          ),
        ).sort((a, b) => a.localeCompare(b, "id"));

        setAvailableSubjects(uniqueSubjects);
      } else {
        setAvailableSubjects([]);
      }
    } catch (error) {
      console.error("Gagal memuat jadwal belajar:", error);
      setErrorMessage(
        "Jadwal belajar belum dapat dimuat. Silakan coba beberapa saat lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadRecommendations = useCallback(async () => {
    if (!profileComplete) {
      setRecommendations([]);
      return;
    }

    setLoadingRecommendations(true);

    try {
      const { data, error } = await supabase.rpc(
        "get_daily_learning_recommendations",
        {
          p_day_of_week: selectedDay,
        },
      );

      if (error) throw error;

      setRecommendations((data ?? []) as Recommendation[]);
    } catch (error) {
      console.error("Gagal memuat rekomendasi latihan:", error);
      setRecommendations([]);
      setErrorMessage(
        "Rekomendasi latihan belum dapat dimuat. Silakan muat ulang halaman.",
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }, [profileComplete, selectedDay]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const subjectsForDay = scheduleRows
      .filter(
        (row) => row.day_of_week === selectedDay && row.is_active,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => row.subject);

    setSelectedSubjects(subjectsForDay);
  }, [scheduleRows, selectedDay]);

  useEffect(() => {
    if (!loading) {
      void loadRecommendations();
    }
  }, [loading, loadRecommendations]);

  const toggleSubject = (subject: string) => {
    setSuccessMessage("");

    setSelectedSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter((item) => item !== subject);
      }

      return [...current, subject];
    });
  };

  const changeSubjectOrder = (index: number, direction: -1 | 1) => {
    setSelectedSubjects((current) =>
      moveItem(current, index, index + direction),
    );

    setSuccessMessage("");
  };

  const saveSchedule = async () => {
    if (!userId) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("student_learning_schedules")
        .select("id, subject")
        .eq("user_id", userId)
        .eq("day_of_week", selectedDay);

      if (existingError) throw existingError;

      if (selectedSubjects.length > 0) {
        const payload = selectedSubjects.map((subject, index) => ({
          user_id: userId,
          day_of_week: selectedDay,
          subject,
          sort_order: index,
          is_active: true,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from("student_learning_schedules")
          .upsert(payload, {
            onConflict: "user_id,day_of_week,subject",
          });

        if (upsertError) throw upsertError;
      }

      const selectedSet = new Set(selectedSubjects);

      const staleIds = (existingRows ?? [])
        .filter((row) => !selectedSet.has(row.subject))
        .map((row) => row.id);

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("student_learning_schedules")
          .delete()
          .in("id", staleIds);

        if (deleteError) throw deleteError;
      }

      const { data: refreshedRows, error: refreshError } = await supabase
        .from("student_learning_schedules")
        .select(
          "id, user_id, day_of_week, subject, sort_order, is_active",
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("sort_order", { ascending: true });

      if (refreshError) throw refreshError;

      setScheduleRows((refreshedRows ?? []) as ScheduleRow[]);
      setSuccessMessage(
        `Jadwal belajar hari ${selectedDayInfo.label} berhasil disimpan.`,
      );

      await loadRecommendations();
    } catch (error) {
      console.error("Gagal menyimpan jadwal:", error);
      setErrorMessage(
        "Jadwal belum berhasil disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartPractice = (item: Recommendation) => {
    if (item.premium && !premiumActive) {
      openUpgrade();
      return;
    }

    navigate(`/dashboard/exams/${item.package_id}/attempt`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Menyiapkan jadwal belajar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <Badge className="mb-4 border border-white/20 bg-white/10 text-white hover:bg-white/10">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              PERSONAL LEARNING PLAN
            </Badge>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Jadwal Belajar
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Atur mata pelajaran mingguanmu dan temukan latihan yang sesuai
              dengan target belajar setiap hari.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <GraduationCap className="h-4 w-4" />
                {formatGrade(
                  profile?.grade ?? null,
                  profile?.education_level ?? null,
                )}
              </span>

              {profile?.full_name && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                  {profile.full_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-100">
                Hari ini
              </p>
              <p className="text-lg font-bold">
                {DAYS.find((day) => day.value === getTodayDay())?.label}
              </p>
              <p className="text-xs text-blue-100">
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error and success messages */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-xs font-semibold text-red-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile incomplete */}
      {!profileComplete && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/70 shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-amber-950">
                  Lengkapi profil pendidikan
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Atur jenjang dan kelas terlebih dahulu agar GradeUp dapat
                  menampilkan latihan yang sesuai. Rekomendasi belum
                  ditampilkan sebelum data ini lengkap.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/dashboard/settings")}
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
            >
              Lengkapi Profil
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weekly schedule */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Perencanaan Mingguan
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Atur jadwal belajarmu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih hari, lalu tentukan mata pelajaran yang ingin dipelajari.
            </p>
          </div>

          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            {scheduleRows.length} jadwal tersimpan
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.value;
            const count = scheduleRows.filter(
              (row) => row.day_of_week === day.value && row.is_active,
            ).length;

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  setSelectedDay(day.value);
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
                className={`group rounded-2xl border p-3 text-center transition-all sm:p-4 ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/15"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <span className="block text-xs font-semibold sm:hidden">
                  {day.short}
                </span>
                <span className="hidden text-sm font-semibold sm:block">
                  {day.label}
                </span>
                <span
                  className={`mx-auto mt-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Subject planner */}
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Mata pelajaran
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Jadwal hari {selectedDayInfo.label}
                </p>
              </div>
              <Badge variant="muted" className="rounded-full">
                {selectedCount} dipilih
              </Badge>
            </div>
          </div>

          <CardContent className="space-y-5 p-5 sm:p-6">
            {!profileComplete ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Profil pendidikan diperlukan
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mata pelajaran akan tersedia setelah jenjang dan kelas
                  dilengkapi.
                </p>
              </div>
            ) : availableSubjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Belum ada mata pelajaran tersedia
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Belum ada paket latihan aktif untuk jenjang dan kelasmu.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    Pilih mata pelajaran
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {availableSubjects.map((subject) => {
                      const isSelected = selectedSubjects.includes(subject);

                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          aria-pressed={isSelected}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600/10"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-slate-300" />
                          )}
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Urutan belajar
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Atur prioritas mata pelajaran dengan tombol panah.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {selectedSubjects.length} mapel
                    </Badge>
                  </div>

                  {selectedSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                      <p className="text-sm text-slate-500">
                        Belum ada mata pelajaran yang dipilih.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSubjects.map((subject, index) => (
                        <div
                          key={subject}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                            {index + 1}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                            {subject}
                          </span>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                changeSubjectOrder(index, -1)
                              }
                              disabled={index === 0}
                              aria-label={`Naikkan ${subject}`}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                changeSubjectOrder(index, 1)
                              }
                              disabled={
                                index === selectedSubjects.length - 1
                              }
                              aria-label={`Turunkan ${subject}`}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Perubahan hanya berlaku untuk hari {selectedDayInfo.label}.
              </p>

              <Button
                onClick={saveSchedule}
                disabled={saving || !userId || !profileComplete}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule summary */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <h3 className="font-bold text-slate-900">
              Ringkasan jadwal
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Rencana belajar hari {selectedDayInfo.label}
            </p>
          </div>

          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-blue-900">
                  {selectedCount}
                </p>
                <p className="text-xs font-medium text-blue-700">
                  Mata pelajaran
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Target className="h-5 w-5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-emerald-900">
                  {dayScheduleCount}
                </p>
                <p className="text-xs font-medium text-emerald-700">
                  Tersimpan
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">
                Target belajar
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Selesaikan latihan sesuai jadwal dan capai nilai minimal
                KKM untuk menuntaskan rekomendasi harian.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Belajar lebih terarah
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    Rekomendasi latihan akan mengikuti mata pelajaran yang
                    kamu pilih untuk hari ini. Kamu bebas menentukan latihan
                    mana yang ingin dimulai.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily recommendations */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <Target className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Rekomendasi Harian
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Latihan untuk hari {selectedDayInfo.label}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih latihan yang ingin kamu kerjakan. Paket gratis dan Premium
              tersedia sesuai jadwalmu.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void loadRecommendations()}
            disabled={loadingRecommendations}
            className="w-fit"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loadingRecommendations ? "animate-spin" : ""
              }`}
            />
            Muat ulang
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <p className="text-xl font-bold text-slate-900">
              {activeRecommendations.length}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
              Total latihan
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4">
            <p className="text-xl font-bold text-emerald-700">
              {freeCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-700 sm:text-xs">
              Gratis
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4">
            <p className="text-xl font-bold text-amber-700">
              {premiumCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-amber-700 sm:text-xs">
              Premium
            </p>
          </div>
        </div>

        {loadingRecommendations ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">
              Mencari latihan yang sesuai...
            </p>
          </div>
        ) : !profileComplete ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              Lengkapi profil terlebih dahulu
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Rekomendasi latihan akan muncul setelah jenjang dan kelas
              pendidikanmu terisi.
            </p>
          </div>
        ) : selectedCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              Belum ada jadwal untuk hari {selectedDayInfo.label}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              Pilih mata pelajaran pada bagian pengaturan jadwal agar
              rekomendasi latihan bisa ditampilkan. Hari lain tidak akan
              dicampurkan ke jadwal ini.
            </p>
          </div>
        ) : activeRecommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              Belum ada latihan yang tersedia
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              Belum ada paket latihan aktif untuk mata pelajaran yang kamu
              jadwalkan hari ini, atau semua latihan yang tersedia sudah
              berhasil kamu tuntaskan sesuai KKM.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeRecommendations.map((item) => {
              const isPremium = Boolean(item.premium);
              const isLocked = isPremium && !premiumActive;

              return (
                <Card
                  key={`${item.package_id}-${item.schedule_id}`}
                  className="group overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div
                    className={`h-1.5 w-full ${
                      isPremium
                        ? "bg-gradient-to-r from-amber-400 to-orange-500"
                        : "bg-gradient-to-r from-blue-500 to-cyan-400"
                    }`}
                  />

                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Badge
                        variant="outline"
                        className="max-w-[65%] truncate rounded-full border-slate-200 text-slate-600"
                      >
                        {item.subject}
                      </Badge>

                      {isPremium ? (
                        <Badge className="shrink-0 border-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                          <Crown className="mr-1 h-3.5 w-3.5" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="shrink-0 border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Gratis
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900">
                      {item.package_title}
                    </h3>

                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                      {item.description ||
                        "Latihan untuk membantu meningkatkan pemahaman materi."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Durasi</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {item.duration_minutes
                            ? `${item.duration_minutes} menit`
                            : "Fleksibel"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Soal</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {item.total_questions ?? "—"} soal
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        Nilai minimum (KKM)
                      </span>
                      <span className="font-bold text-slate-700">
                        {item.passing_score ?? 75}
                      </span>
                    </div>

                    {isLocked && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <p className="text-xs leading-5 text-amber-800">
                          Latihan ini khusus Premium. Upgrade akun untuk
                          membuka dan mengerjakannya.
                        </p>
                      </div>
                    )}

                    <div className="mt-auto pt-5">
                      <Button
                        onClick={() => handleStartPractice(item)}
                        className={`w-full ${
                          isLocked
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <Crown className="mr-2 h-4 w-4" />
                            Upgrade untuk Membuka
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Mulai Belajar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {premiumCount > 0 && !premiumActive && (
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950">
                  Buka semua latihan Premium
                </h3>
                <p className="mt-1 text-sm leading-5 text-amber-800">
                  Ada {premiumCount} latihan Premium yang sesuai dengan
                  jadwal belajarmu. Upgrade untuk mendapatkan akses penuh.
                </p>
              </div>
            </div>

            <Button
              onClick={() => openUpgrade()}
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
            >
              Lihat Paket Premium
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
