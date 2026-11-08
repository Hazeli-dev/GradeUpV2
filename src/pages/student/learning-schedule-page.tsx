
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Save,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  grade: number | null;
  education_level: string | null;
  full_name: string | null;
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
  grade: number;
  level: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  premium: boolean;
}

export default function StudentLearningSchedulePage() {
  const navigate = useNavigate();

  const today = new Date().getDay() || 7;

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [selectedDay, setSelectedDay] = useState(today);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedDayLabel =
    DAYS.find((day) => day.value === selectedDay)?.label ?? "Hari ini";

  const profileComplete = Boolean(
    profile?.grade && profile?.education_level
  );

  const selectedDayRows = useMemo(
    () =>
      scheduleRows
        .filter(
          (row) =>
            row.day_of_week === selectedDay && row.is_active
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    [scheduleRows, selectedDay]
  );

  // ==========================================
  // LOAD PROFILE, SUBJECTS, AND WEEKLY SCHEDULE
  // ==========================================

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("grade, education_level, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error("Profil siswa tidak ditemukan.");
      }

      const safeProfile: ProfileData = {
        grade: profileData.grade,
        education_level: profileData.education_level,
        full_name: profileData.full_name,
      };

      setProfile(safeProfile);

      const { data: scheduleData, error: scheduleError } = await supabase
        .from("student_learning_schedules")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week")
        .order("sort_order");

      if (scheduleError) throw scheduleError;

      setScheduleRows((scheduleData || []) as ScheduleRow[]);

      if (
        safeProfile.grade &&
        safeProfile.education_level
      ) {
        const { data: packageData, error: packageError } = await supabase
          .from("exam_packages")
          .select("subject")
          .eq("type", "Latihan")
          .eq("grade", safeProfile.grade)
          .eq("level", safeProfile.education_level)
          .eq("is_active", true)
          .eq("is_published", true)
          .eq("status", "Published")
          .eq("premium", false);

        if (packageError) throw packageError;

        const uniqueSubjects = Array.from(
          new Set(
            (packageData || [])
              .map((item) => item.subject?.trim())
              .filter((subject): subject is string => Boolean(subject))
          )
        ).sort((a, b) => a.localeCompare(b, "id"));

        setSubjects(uniqueSubjects);
      } else {
        setSubjects([]);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat Jadwal Belajar:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data Jadwal Belajar."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  // ==========================================
  // SYNC SELECTED SUBJECTS WHEN DAY CHANGES
  // ==========================================

  useEffect(() => {
    setSelectedSubjects(
      scheduleRows
        .filter(
          (row) =>
            row.day_of_week === selectedDay && row.is_active
        )
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => row.subject)
    );

    setSaveMessage("");
  }, [scheduleRows, selectedDay]);

  // ==========================================
  // LOAD DAILY RECOMMENDATIONS
  // ==========================================

  const loadRecommendations = useCallback(async () => {
    if (!userId) return;

    setRecommendationLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_daily_learning_recommendations",
        {
          p_day_of_week: selectedDay,
        }
      );

      if (rpcError) throw rpcError;

      setRecommendations((data || []) as Recommendation[]);
    } catch (err: unknown) {
      console.error("Gagal memuat rekomendasi:", err);

      setRecommendations([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil rekomendasi latihan."
      );
    } finally {
      setRecommendationLoading(false);
    }
  }, [userId, selectedDay]);

  useEffect(() => {
    if (userId && profileComplete) {
      void loadRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [userId, profileComplete, loadRecommendations]);

  // ==========================================
  // TOGGLE SUBJECT
  // ==========================================

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter((item) => item !== subject);
      }

      return [...current, subject];
    });

    setSaveMessage("");
  };

  // ==========================================
  // SAVE WEEKLY SCHEDULE FOR SELECTED DAY
  // ==========================================

  const handleSaveSchedule = async () => {
    if (!userId) {
      setError("Sesi login tidak ditemukan.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage("");

    try {
      const currentRows = scheduleRows.filter(
        (row) => row.day_of_week === selectedDay
      );

      const selectedPayload = selectedSubjects.map(
        (subject, index) => ({
          user_id: userId,
          day_of_week: selectedDay,
          subject,
          sort_order: index,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
      );

      if (selectedPayload.length > 0) {
        const { error: upsertError } = await supabase
          .from("student_learning_schedules")
          .upsert(selectedPayload, {
            onConflict: "user_id,day_of_week,subject",
          });

        if (upsertError) throw upsertError;
      }

      const staleIds = currentRows
        .filter((row) => !selectedSubjects.includes(row.subject))
        .map((row) => row.id);

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("student_learning_schedules")
          .delete()
          .eq("user_id", userId)
          .in("id", staleIds);

        if (deleteError) throw deleteError;
      }

      const { data: refreshedRows, error: refreshError } =
        await supabase
          .from("student_learning_schedules")
          .select("*")
          .eq("user_id", userId)
          .order("day_of_week")
          .order("sort_order");

      if (refreshError) throw refreshError;

      setScheduleRows((refreshedRows || []) as ScheduleRow[]);
      setSaveMessage(`Jadwal ${selectedDayLabel} berhasil disimpan.`);

      await loadRecommendations();
    } catch (err: unknown) {
      console.error("Gagal menyimpan jadwal:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan jadwal belajar."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            Menyiapkan jadwal belajar...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <div className="w-full space-y-6 pb-12">
      {/* HEADER */}

      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
            <Sparkles className="h-4 w-4" />
            PERSONAL LEARNING PLANNER
          </div>

          <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
            Jadwal Belajar
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/80">
            Atur jadwal belajar mingguanmu dan temukan latihan harian
            yang sesuai dengan mata pelajaran, kelas, dan jenjangmu.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs">
              <span className="text-emerald-100/70">Jenjang</span>
              <p className="mt-0.5 font-bold">
                {profile?.education_level || "Belum diatur"}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs">
              <span className="text-emerald-100/70">Kelas</span>
              <p className="mt-0.5 font-bold">
                {profile?.grade
                  ? `Kelas ${profile.grade}`
                  : "Belum diatur"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              Terjadi kesalahan
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setError(null);
                void loadPage();
              }}
            >
              Coba lagi
            </Button>
          </div>
        </div>
      )}

      {!profileComplete ? (
        <Card className="rounded-2xl border-amber-500/30">
          <CardContent className="flex gap-3 p-5">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <h2 className="font-bold text-foreground">
                Lengkapi profil belajar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Jenjang dan kelas belum tersedia. Lengkapi profil terlebih
                dahulu agar GradeUp dapat memilih latihan yang sesuai.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/dashboard/settings")}
              >
                Lengkapi Profil
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* WEEKLY SCHEDULE */}

          <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
            <div className="border-b border-border p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black text-foreground">
                    Jadwal Mingguan
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pilih hari, lalu tentukan mata pelajaran yang ingin
                    kamu pelajari.
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAYS.map((day) => {
                  const active = selectedDay === day.value;
                  const count = scheduleRows.filter(
                    (row) =>
                      row.day_of_week === day.value && row.is_active
                  ).length;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setSelectedDay(day.value)}
                      className={`rounded-xl border px-2 py-3 text-center transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/15"
                          : "border-border bg-background text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5"
                      }`}
                    >
                      <span className="block text-xs font-bold">
                        <span className="sm:hidden">{day.short}</span>
                        <span className="hidden sm:inline">{day.label}</span>
                      </span>
                      <span className="mt-1 block text-[10px] opacity-80">
                        {count} mapel
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      Mata Pelajaran — {selectedDayLabel}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Kamu bebas memilih lebih dari satu mata pelajaran.
                    </p>
                  </div>

                  <Badge variant="muted">
                    {selectedSubjects.length} dipilih
                  </Badge>
                </div>

                {subjects.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
                    <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-sm font-bold text-foreground">
                      Belum ada latihan tersedia
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Belum ada paket latihan gratis yang cocok dengan
                      kelas dan jenjang profilmu.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subjects.map((subject) => {
                      const selected = selectedSubjects.includes(subject);

                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                            selected
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-border bg-background text-muted-foreground hover:border-emerald-500/50"
                          }`}
                        >
                          {selected && (
                            <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                          )}
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Jadwal setiap hari disimpan secara terpisah.
                </div>

                <Button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Jadwal
                </Button>
              </div>

              {saveMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {saveMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DAILY RECOMMENDATIONS */}

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-black text-foreground">
                    Rekomendasi Latihan
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latihan harian untuk {selectedDayLabel}.
                </p>
              </div>

              <Badge variant="outline">
                {recommendations.length} latihan
              </Badge>
            </div>

            {recommendationLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="ml-3 text-sm text-muted-foreground">
                  Memuat rekomendasi...
                </span>
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="rounded-2xl border-dashed shadow-none">
                <CardContent className="px-5 py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <CalendarDays className="h-7 w-7" />
                  </div>

                  <h3 className="mt-4 font-black text-foreground">
                    {selectedDayRows.length === 0
                      ? "Belum ada jadwal belajar"
                      : "Belum ada latihan untuk hari ini"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {selectedDayRows.length === 0
                      ? `Kamu belum mengatur mata pelajaran untuk hari ${selectedDayLabel}. Pilih mata pelajaran di bagian Jadwal Mingguan.`
                      : "Belum ada paket latihan harian yang sesuai, atau semua latihan yang tersedia sudah berhasil kamu selesaikan."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendations.map((item) => (
                  <Card
                    key={`${item.schedule_id}-${item.package_id}`}
                    className="overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                          Latihan Harian
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.subject}
                        </p>

                        <h3 className="mt-1 text-base font-black text-foreground">
                          {item.package_title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.description || "Latihan untuk meningkatkan pemahaman materi."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.duration_minutes} menit
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          {item.total_questions} soal
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          KKM {item.passing_score}
                        </span>
                      </div>

                      <Button
                        className="w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                        onClick={() =>
                          navigate(
                            `/dashboard/exams/${item.package_id}/attempt`
                          )
                        }
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Mulai Belajar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
