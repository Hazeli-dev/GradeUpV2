
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
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

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

function getTodayDay() {
  return new Date().getDay() || 7;
}

function formatGrade(
  grade: number | null,
  educationLevel: string | null,
) {
  if (!grade || !educationLevel) return "Jenjang belum diatur";

  return `Kelas ${grade} ${educationLevel}`;
}

function isPremiumActive(profile: ProfileData | null) {
  if (!profile?.is_premium) return false;
  if (!profile.premium_until) return true;

  return new Date(profile.premium_until).getTime() > Date.now();
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;

  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);

  return result;
}

export default function StudentLearningSchedulePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [selectedDay, setSelectedDay] = useState(getTodayDay());
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

  const dayScheduleCount = useMemo(
    () =>
      scheduleRows.filter(
        (row) => row.day_of_week === selectedDay && row.is_active,
      ).length,
    [scheduleRows, selectedDay],
  );

  const premiumCount = useMemo(
    () => recommendations.filter((item) => item.premium).length,
    [recommendations],
  );

  const freeCount = recommendations.length - premiumCount;

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
          .order("day_of_week")
          .order("sort_order"),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (scheduleResult.error) throw scheduleResult.error;

      const profileData = profileResult.data as ProfileData | null;
      const schedules = (scheduleResult.data ?? []) as ScheduleRow[];

      setProfile(profileData);
      setScheduleRows(schedules);

      if (profileData?.grade && profileData?.education_level) {
        const { data, error } = await supabase
          .from("exam_packages")
          .select("subject")
          .eq("type", "Latihan")
          .eq("grade", profileData.grade)
          .eq("level", profileData.education_level)
          .eq("is_active", true)
          .eq("is_published", true)
          .eq("status", "Published");

        if (error) throw error;

        const subjects = Array.from(
          new Set(
            (data ?? [])
              .map((item) => item.subject?.trim())
              .filter((item): item is string => Boolean(item)),
          ),
        ).sort((a, b) => a.localeCompare(b, "id"));

        setAvailableSubjects(subjects);
      } else {
        setAvailableSubjects([]);
      }
    } catch (error) {
      console.error("Gagal memuat jadwal belajar:", error);
      setErrorMessage(
        "Jadwal belajar belum dapat dimuat. Silakan coba kembali.",
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
      console.error("Gagal memuat rekomendasi:", error);
      setRecommendations([]);
      setErrorMessage(
        "Rekomendasi latihan belum dapat dimuat. Silakan coba kembali.",
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }, [profileComplete, selectedDay]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const subjects = scheduleRows
      .filter(
        (row) => row.day_of_week === selectedDay && row.is_active,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => row.subject);

    setSelectedSubjects(subjects);
  }, [scheduleRows, selectedDay]);

  useEffect(() => {
    if (!loading) {
      void loadRecommendations();
    }
  }, [loading, loadRecommendations]);

  const toggleSubject = (subject: string) => {
    setSuccessMessage("");

    setSelectedSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject],
    );
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

        const { error } = await supabase
          .from("student_learning_schedules")
          .upsert(payload, {
            onConflict: "user_id,day_of_week,subject",
          });

        if (error) throw error;
      }

      const selectedSet = new Set(selectedSubjects);

      const staleIds = (existingRows ?? [])
        .filter((row) => !selectedSet.has(row.subject))
        .map((row) => row.id);

      if (staleIds.length > 0) {
        const { error } = await supabase
          .from("student_learning_schedules")
          .delete()
          .in("id", staleIds);

        if (error) throw error;
      }

      const { data: refreshedRows, error: refreshError } = await supabase
        .from("student_learning_schedules")
        .select(
          "id, user_id, day_of_week, subject, sort_order, is_active",
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("day_of_week")
        .order("sort_order");

      if (refreshError) throw refreshError;

      setScheduleRows((refreshedRows ?? []) as ScheduleRow[]);
      setSuccessMessage(
        `Jadwal belajar hari ${selectedDayInfo.label} berhasil disimpan.`,
      );

      await loadRecommendations();
    } catch (error) {
      console.error("Gagal menyimpan jadwal:", error);
      setErrorMessage(
        "Jadwal belum berhasil disimpan. Silakan periksa koneksi dan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartPractice = (item: Recommendation) => {
    // Tetap menggunakan halaman pengerjaan ujian GradeUp yang sudah ada.
    // Halaman/backend pengerjaan wajib memvalidasi hak akses paket Premium.
    navigate(`/dashboard/exams/${item.package_id}/attempt`);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <PageHeader
        title="Jadwal Belajar"
        description="Atur jadwal belajar mingguan dan temukan latihan yang sesuai dengan target belajarmu."
      />

      {/* IDENTITAS BELAJAR */}
      <Card className="overflow-hidden rounded-2xl border-border/70">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                Profil pendidikan
              </p>
              <p className="font-bold text-foreground">
                {formatGrade(
                  profile?.grade ?? null,
                  profile?.education_level ?? null,
                )}
              </p>
              {profile?.full_name && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile.full_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              {selectedDayInfo.label}
            </Badge>

            {premiumActive ? (
              <Badge className="rounded-full border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                Premium Aktif
              </Badge>
            ) : (
              <Badge variant="muted" className="rounded-full">
                Akun Gratis
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* NOTIFIKASI */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-xs font-semibold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* PROFIL BELUM LENGKAP */}
      {!profileComplete && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  Lengkapi profil pendidikan
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Atur jenjang dan kelas agar GradeUp dapat menampilkan
                  rekomendasi latihan yang sesuai.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/settings")}
              className="shrink-0"
            >
              Lengkapi Profil
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PILIH HARI */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-foreground">
            Jadwal Mingguan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih hari untuk mengatur mata pelajaran.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS.map((day) => {
            const active = selectedDay === day.value;
            const count = scheduleRows.filter(
              (row) => row.day_of_week === day.value && row.is_active,
            ).length;

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  setSelectedDay(day.value);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-card text-foreground hover:bg-muted/60"
                }`}
              >
                <span className="block text-xs font-bold sm:hidden">
                  {day.short}
                </span>
                <span className="hidden text-sm font-bold sm:block">
                  {day.label}
                </span>
                <span
                  className={`mx-auto mt-2 flex h-6 min-w-6 w-fit items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    active
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* PENGATURAN JADWAL */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-extrabold">
                  Mata Pelajaran
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pengaturan hari {selectedDayInfo.label}
                </p>
              </div>
              <Badge variant="outline">
                {selectedSubjects.length} dipilih
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-4 sm:p-6">
            {!profileComplete ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Profil pendidikan belum lengkap
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mata pelajaran akan tersedia setelah profil dilengkapi.
                </p>
              </div>
            ) : availableSubjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Belum ada mata pelajaran
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Belum tersedia paket latihan aktif untuk kelasmu.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-3 text-sm font-bold text-foreground">
                    Pilih mata pelajaran
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {availableSubjects.map((subject) => {
                      const selected = selectedSubjects.includes(subject);

                      return (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleSubject(subject)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            selected
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {selected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-current/40" />
                          )}
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-5">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Urutan belajar
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gunakan tombol panah untuk mengatur prioritas.
                    </p>
                  </div>

                  {selectedSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                      Pilih minimal satu mata pelajaran.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSubjects.map((subject, index) => (
                        <div
                          key={subject}
                          className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {index + 1}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {subject}
                          </span>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={index === 0}
                              onClick={() =>
                                changeSubjectOrder(index, -1)
                              }
                              aria-label={`Naikkan ${subject}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={
                                index === selectedSubjects.length - 1
                              }
                              onClick={() =>
                                changeSubjectOrder(index, 1)
                              }
                              aria-label={`Turunkan ${subject}`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Perubahan hanya berlaku untuk hari {selectedDayInfo.label}.
              </p>

              <Button
                onClick={saveSchedule}
                disabled={saving || !userId || !profileComplete}
                className="w-full sm:w-auto"
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

        {/* RINGKASAN */}
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-extrabold">
              Ringkasan Jadwal
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {selectedSubjects.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mata pelajaran
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="mb-3 inline-flex rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {dayScheduleCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jadwal tersimpan
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-foreground">
                  Tips belajar
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Atur mata pelajaran secara realistis. Kamu bebas memilih
                latihan mana yang ingin dikerjakan terlebih dahulu.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Latihan yang sudah diselesaikan dengan nilai mencapai KKM
                tidak akan muncul lagi sebagai rekomendasi aktif.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REKOMENDASI */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-base font-extrabold text-foreground">
                Rekomendasi Latihan
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Latihan yang sesuai dengan jadwal hari {selectedDayInfo.label}.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadRecommendations()}
            disabled={loadingRecommendations}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loadingRecommendations ? "animate-spin" : ""
              }`}
            />
            Muat Ulang
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4">
            <p className="text-xl font-black text-foreground">
              {recommendations.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total latihan
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {freeCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gratis
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {premiumCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Premium
            </p>
          </div>
        </div>

        {loadingRecommendations ? (
          <Card className="rounded-2xl border-border/70">
            <CardContent className="flex min-h-44 flex-col items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Memuat rekomendasi latihan...
              </p>
            </CardContent>
          </Card>
        ) : !profileComplete ? (
          <Card className="rounded-2xl border-dashed border-border">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <GraduationCap className="h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 font-bold text-foreground">
                Lengkapi profil pendidikan
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Rekomendasi akan muncul setelah jenjang dan kelas pendidikan
                dilengkapi.
              </p>
            </CardContent>
          </Card>
        ) : selectedSubjects.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <CalendarDays className="h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 font-bold text-foreground">
                Belum ada jadwal untuk hari {selectedDayInfo.label}
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Pilih mata pelajaran pada bagian pengaturan jadwal. Jadwal
                hari lain tidak akan dicampurkan.
              </p>
            </CardContent>
          </Card>
        ) : recommendations.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <BookOpen className="h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 font-bold text-foreground">
                Belum ada latihan yang tersedia
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Belum ada paket latihan aktif untuk mata pelajaran yang
                dijadwalkan, atau semua latihan yang tersedia sudah berhasil
                diselesaikan sesuai KKM.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((item) => {
              const isPremium = Boolean(item.premium);

              return (
                <Card
                  key={`${item.package_id}-${item.schedule_id}`}
                  className="flex h-full flex-col rounded-2xl border-border/70 transition-colors hover:border-primary/40"
                >
                  <CardHeader className="space-y-3 px-4 pb-3 pt-4 sm:px-5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="max-w-[65%] truncate">
                        {item.subject}
                      </Badge>

                      {isPremium ? (
                        <Badge className="border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
                          <Crown className="mr-1 h-3.5 w-3.5" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
                          Gratis
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="line-clamp-2 min-h-12 text-base leading-6">
                      {item.package_title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col px-4 pb-4 sm:px-5">
                    <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {item.description ||
                        "Latihan untuk meningkatkan pemahaman materi."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-muted/50 p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span className="text-xs">Durasi</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {item.duration_minutes
                            ? `${item.duration_minutes} menit`
                            : "Fleksibel"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="text-xs">Jumlah soal</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {item.total_questions ?? "—"} soal
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="text-xs text-muted-foreground">
                        Nilai minimum (KKM)
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {item.passing_score ?? 75}
                      </span>
                    </div>

                    {isPremium && !premiumActive && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Paket ini khusus anggota Premium. Akses akan
                          mengikuti validasi langganan pada halaman ujian.
                        </p>
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleStartPractice(item)}
                      >
                        {isPremium && !premiumActive ? (
                          <>
                            <LockKeyhole className="mr-2 h-4 w-4" />
                            Lihat Akses Premium
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Mulai Belajar
                          </>
                        )}
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
