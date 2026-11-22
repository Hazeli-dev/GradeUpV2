import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  User,
  GraduationCap,
  School,
  Copy,
  Share2,
  Gift,
  Users,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";
import { ThemePicker } from "@/components/shared/theme-picker";
import { SettingRow } from "@/components/shared/setting-row";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/auth-bits";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// =====================================================
// KONFIGURASI PENDIDIKAN
// =====================================================

const GRADES_BY_LEVEL: Record<string, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

const EDUCATION_LEVELS = [
  { value: "SD", label: "SD / MI" },
  { value: "SMP", label: "SMP / MTs" },
  { value: "SMA", label: "SMA / MA" },
  { value: "SMK", label: "SMK" },
  { value: "Kedinasan", label: "Kedinasan" },
  { value: "Umum", label: "Umum" },
];

const NO_SELECTION = "belum-dipilih";

// =====================================================
// TYPES
// =====================================================

type ProfileData = {
  name: string;
  email: string;
  school: string;
  educationLevel: string;
  grade: string;
};

type PreferencesData = {
  targetExams: number;
  dailyGoal: string;
  autoplay: boolean;
  showTimer: boolean;
};

type ReferralItem = {
  id: string;
  status: string;
  created_at: string;
  qualified_at: string | null;
  qualifying_invoice_number: string | null;
};

type ReferralReward = {
  id: string;
  referral_id: string;
  reward_days: number;
  status: string;
  issued_at: string | null;
  created_at: string;
};

type ReferralStatusInfo = {
  label: string;
  className: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_PREFERENCES: PreferencesData = {
  targetExams: 10,
  dailyGoal: "30",
  autoplay: true,
  showTimer: true,
};

// =====================================================
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card dan panel.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

// Permukaan kecil di dalam card (kotak informasi, baris).
const INSET =
  "border border-emerald-900/10 bg-white/70 dark:border-emerald-400/10 dark:bg-slate-950/40";

// Header card dengan tint emerald lembut.
const CARD_HEADER =
  "border-b border-emerald-900/10 bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent dark:border-emerald-400/10";

// Kotak ikon pada header card.
const ICON_BOX =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/25";

// Tombol utama emerald.
const BTN_PRIMARY =
  "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 transition-all hover:from-emerald-600 hover:to-teal-700 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none";

// Tombol sekunder.
const BTN_OUTLINE =
  "border-emerald-900/10 bg-white/60 hover:bg-emerald-500/10 dark:border-emerald-400/10 dark:bg-slate-950/40";

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

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function StudentSettingsPage() {
  // ---------------------------------------------------
  // GENERAL STATE
  // ---------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ---------------------------------------------------
  // PROFILE STATE
  // ---------------------------------------------------

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    school: "",
    educationLevel: "",
    grade: "",
  });

  const [profileErr, setProfileErr] = useState<
    Record<string, string>
  >({});

  // ---------------------------------------------------
  // PASSWORD STATE
  // ---------------------------------------------------

  const [pw, setPw] = useState({
    next: "",
    confirm: "",
  });

  const [pwErr, setPwErr] = useState<
    Record<string, string>
  >({});

  // ---------------------------------------------------
  // LEARNING PREFERENCES
  // ---------------------------------------------------

  const [prefs, setPrefs] = useState<PreferencesData>(
    DEFAULT_PREFERENCES
  );

  const [prefsErr, setPrefsErr] = useState<
    Record<string, string>
  >({});

  // ---------------------------------------------------
  // REFERRAL STATE
  // ---------------------------------------------------

  const [referralLoading, setReferralLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [referralRewards, setReferralRewards] = useState<
    ReferralReward[]
  >([]);

  // ---------------------------------------------------
  // DERIVED PROFILE DATA
  // ---------------------------------------------------

  const availableGrades =
    GRADES_BY_LEVEL[profile.educationLevel] || [];

  const requiresGrade = Boolean(
    GRADES_BY_LEVEL[profile.educationLevel]
  );

  // ---------------------------------------------------
  // REFERRAL DERIVED DATA
  // ---------------------------------------------------

  const referralLink = useMemo(() => {
    if (!referralCode || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/register?ref=${encodeURIComponent(
      referralCode
    )}`;
  }, [referralCode]);

  const issuedReferralIds = useMemo(
    () =>
      new Set(
        referralRewards
          .filter((item) => item.status === "issued")
          .map((item) => item.referral_id)
      ),
    [referralRewards]
  );

  const rewardedCount = referrals.filter(
    (item) =>
      item.status === "rewarded" ||
      issuedReferralIds.has(item.id)
  ).length;

  const pendingCount = referrals.filter(
    (item) => item.status === "pending"
  ).length;

  const totalRewardDays = referralRewards
    .filter((item) => item.status === "issued")
    .reduce(
      (total, item) =>
        total + Number(item.reward_days || 0),
      0
    );

  // =====================================================
  // LOAD PROFILE & PREFERENCES
  // =====================================================

  useEffect(() => {
    let mounted = true;

    async function loadUserData() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          throw new Error(
            "Sesi login tidak ditemukan. Silakan login kembali."
          );
        }

        const [
          { data: profileData, error: profileError },
          { data: settingsData, error: settingsError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "full_name, name, school, education_level, grade, target_exams"
            )
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("user_settings")
            .select(
              "daily_goal_minutes, autoplay, show_timer"
            )
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (profileError) throw profileError;
        if (settingsError) throw settingsError;

        if (!mounted) return;

        setProfile({
          name:
            profileData?.full_name ||
            profileData?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          school: profileData?.school || "",
          educationLevel:
            profileData?.education_level || "",
          grade:
            profileData?.grade != null
              ? String(profileData.grade)
              : "",
        });

        setPrefs({
          targetExams:
            profileData?.target_exams ?? 10,
          dailyGoal: String(
            settingsData?.daily_goal_minutes ?? 30
          ),
          autoplay: settingsData?.autoplay ?? true,
          showTimer: settingsData?.show_timer ?? true,
        });
      } catch (error) {
        console.error("Gagal memuat pengaturan:", error);

        if (mounted) {
          toast.error(
            getErrorMessage(
              error,
              "Gagal memuat pengaturan akun."
            )
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // REFERRAL DATA LOADER
  // =====================================================

  const loadReferralData = async (
    showSuccess = false,
    mountedCheck?: () => boolean
  ) => {
    try {
      setReferralLoading(true);
      setReferralError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("Sesi login tidak ditemukan.");
      }

      const [
        { data: referralData, error: referralError },
        { data: rewardData, error: rewardError },
      ] = await Promise.all([
        supabase
          .from("referrals")
          .select(
            "id, status, created_at, qualified_at, qualifying_invoice_number"
          )
          .eq("referrer_user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("referral_rewards")
          .select(
            "id, referral_id, reward_days, status, issued_at, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (referralError) throw referralError;
      if (rewardError) throw rewardError;

      if (mountedCheck && !mountedCheck()) return;

      setReferrals((referralData || []) as ReferralItem[]);
      setReferralRewards(
        (rewardData || []) as ReferralReward[]
      );

      if (showSuccess) {
        toast.success("Data referral berhasil diperbarui.");
      }
    } catch (error) {
      console.error("Gagal memuat referral:", error);

      const message = getErrorMessage(
        error,
        "Gagal memuat data referral."
      );

      if (!mountedCheck || mountedCheck()) {
        setReferralError(message);
        toast.error(message);
      }

      throw error;
    } finally {
      if (!mountedCheck || mountedCheck()) {
        setReferralLoading(false);
      }
    }
  };

  // =====================================================
  // INITIAL REFERRAL LOAD
  // =====================================================

  useEffect(() => {
    let mounted = true;

    async function initializeReferral() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          throw new Error("Sesi login tidak ditemukan.");
        }

        const { data: codeData, error: codeError } =
          await supabase.rpc("get_or_create_referral_code");

        if (codeError) throw codeError;

        if (!mounted) return;

        setReferralCode(
          typeof codeData === "string" ? codeData : ""
        );

        await loadReferralData(false, () => mounted);
      } catch (error) {
        console.error("Gagal memuat referral:", error);

        if (mounted) {
          const message = getErrorMessage(
            error,
            "Kode referral belum berhasil dimuat."
          );

          setReferralError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) {
          setReferralLoading(false);
        }
      }
    }

    initializeReferral();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // REFERRAL ACTIONS
  // =====================================================

  const copyText = async (
    value: string,
    successMessage: string
  ) => {
    if (!value) return;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard tidak tersedia.");
      }

      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (error) {
      console.error("Gagal menyalin:", error);
      toast.error(
        "Tidak dapat menyalin. Silakan salin secara manual."
      );
    }
  };

  const copyReferralCode = () => {
    void copyText(
      referralCode,
      "Kode referral berhasil disalin!"
    );
  };

  const copyReferralLink = () => {
    void copyText(
      referralLink,
      "Link undangan berhasil disalin!"
    );
  };

  const shareReferralLink = async () => {
    if (!referralLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Gabung GradeUp",
          text: `Ayo belajar di GradeUp! Gunakan kode referral saya: ${referralCode}`,
          url: referralLink,
        });
      } else {
        await copyReferralLink();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "AbortError"
      ) {
        toast.error("Link referral belum dapat dibagikan.");
      }
    }
  };

  const refreshReferralData = async () => {
    try {
      await loadReferralData(true);
    } catch {
      // Pesan error sudah ditampilkan oleh loader.
    }
  };

  // =====================================================
  // REFERRAL STATUS
  // =====================================================

  const getReferralStatus = (
    status: string,
    hasReward: boolean
  ): ReferralStatusInfo => {
    if (status === "rejected") {
      return {
        label: "Tidak memenuhi syarat",
        className:
          "border-destructive/20 bg-destructive/10 text-destructive",
      };
    }

    if (status === "rewarded" || hasReward) {
      return {
        label: "Hadiah diberikan",
        className:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      };
    }

    if (status === "qualified") {
      return {
        label: "Memenuhi syarat",
        className:
          "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      };
    }

    return {
      label: "Menunggu pembelian Premium",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  };

  const formatReferralDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Tanggal tidak tersedia";
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =====================================================
  // PROFILE HANDLERS
  // =====================================================

  const handleEducationLevelChange = (value: string) => {
    const nextLevel =
      value === NO_SELECTION ? "" : value;

    setProfile((prev) => ({
      ...prev,
      educationLevel: nextLevel,
      grade: "",
    }));

    setProfileErr((prev) => ({
      ...prev,
      educationLevel: "",
      grade: "",
    }));
  };

  const updateProfile = (
    field: keyof ProfileData,
    value: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));

    setProfileErr((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validateProfile = () => {
    const errors: Record<string, string> = {};

    if (profile.name.trim().length < 3) {
      errors.name = "Nama minimal 3 karakter.";
    }

    if (profile.name.trim().length > 100) {
      errors.name = "Nama maksimal 100 karakter.";
    }

    if (profile.school.trim().length > 150) {
      errors.school =
        "Nama sekolah maksimal 150 karakter.";
    }

    if (!profile.educationLevel) {
      errors.educationLevel =
        "Silakan pilih jenjang pendidikan.";
    } else if (
      !EDUCATION_LEVELS.some(
        (item) => item.value === profile.educationLevel
      )
    ) {
      errors.educationLevel =
        "Jenjang pendidikan tidak valid.";
    }

    if (requiresGrade && !profile.grade) {
      errors.grade = "Silakan pilih kelas.";
    }

    if (
      profile.grade &&
      requiresGrade &&
      !availableGrades.includes(Number(profile.grade))
    ) {
      errors.grade =
        "Kelas tidak sesuai dengan jenjang pendidikan.";
    }

    setProfileErr(errors);

    return Object.keys(errors).length === 0;
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateProfile()) return;

    try {
      setSavingProfile(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error(
          "Sesi login berakhir. Silakan login kembali."
        );
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.name.trim(),
          school: profile.school.trim() || null,
          education_level: profile.educationLevel,
          grade: requiresGrade
            ? Number(profile.grade)
            : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil berhasil diperbarui.");
      setProfileErr({});
    } catch (error) {
      console.error("Gagal menyimpan profil:", error);

      toast.error(
        getErrorMessage(
          error,
          "Gagal menyimpan perubahan profil."
        )
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // =====================================================
  // PREFERENCES HANDLERS
  // =====================================================

  const updatePreferences = (
    field: keyof PreferencesData,
    value: string | number | boolean
  ) => {
    setPrefs((prev) => ({
      ...prev,
      [field]: value,
    }));

    setPrefsErr((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validatePreferences = () => {
    const errors: Record<string, string> = {};
    const target = Number(prefs.targetExams);
    const dailyGoal = Number(prefs.dailyGoal);

    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > 100
    ) {
      errors.targetExams =
        "Target ujian harus berupa angka 1–100.";
    }

    if (![15, 30, 60, 90].includes(dailyGoal)) {
      errors.dailyGoal =
        "Target waktu belajar tidak valid.";
    }

    setPrefsErr(errors);

    return Object.keys(errors).length === 0;
  };

  // =====================================================
  // SAVE PREFERENCES
  // =====================================================

  const savePreferences = async () => {
    if (!validatePreferences()) return;

    try {
      setSavingPreferences(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error(
          "Sesi login berakhir. Silakan login kembali."
        );
      }

      // Simpan target ujian pada tabel profiles.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          target_exams: Number(prefs.targetExams),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Simpan preferensi belajar pada user_settings.
      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            daily_goal_minutes: Number(prefs.dailyGoal),
            autoplay: prefs.autoplay,
            show_timer: prefs.showTimer,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (settingsError) throw settingsError;

      setPrefsErr({});
      toast.success("Preferensi belajar berhasil disimpan.");
    } catch (error) {
      console.error(
        "Gagal menyimpan preferensi belajar:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Gagal menyimpan preferensi belajar."
        )
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  // =====================================================
  // PASSWORD
  // =====================================================

  const updatePasswordField = (
    field: "next" | "confirm",
    value: string
  ) => {
    setPw((prev) => ({
      ...prev,
      [field]: value,
    }));

    setPwErr((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (pw.next.length < 8) {
      errors.next =
        "Kata sandi baru minimal 8 karakter.";
    }

    if (pw.next.length > 72) {
      errors.next =
        "Kata sandi terlalu panjang.";
    }

    if (!/[a-zA-Z]/.test(pw.next)) {
      errors.next =
        "Kata sandi harus memiliki setidaknya satu huruf.";
    }

    if (!/[0-9]/.test(pw.next)) {
      errors.next =
        "Kata sandi harus memiliki setidaknya satu angka.";
    }

    if (pw.confirm !== pw.next) {
      errors.confirm =
        "Konfirmasi kata sandi tidak cocok.";
    }

    setPwErr(errors);

    if (Object.keys(errors).length > 0) return;

    try {
      setSavingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: pw.next,
      });

      if (error) throw error;

      setPw({
        next: "",
        confirm: "",
      });

      setPwErr({});
      toast.success("Kata sandi berhasil diperbarui.");
    } catch (error) {
      console.error("Gagal memperbarui password:", error);

      toast.error(
        getErrorMessage(
          error,
          "Gagal memperbarui kata sandi."
        )
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="relative isolate mx-auto w-full max-w-6xl">
      <style>{PAGE_STYLES}</style>

      {/* BACKGROUND DEKORATIF (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />

        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] dark:opacity-40" />

        <div className="gu-drift absolute -left-28 top-72 h-[24rem] w-[24rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/12" />
        <div className="gu-float absolute -right-24 top-[44rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
        <div className="absolute -left-20 bottom-24 h-[20rem] w-[20rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
      </div>

      <div className="relative space-y-6 pb-8">
        <PageHeader
          title="Pengaturan"
          description="Kelola profil, keamanan akun, target belajar, dan tampilan GradeUp."
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList
            className={cn(
              "grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 sm:grid-cols-4",
              GLASS
            )}
          >
            <TabsTrigger value="profile" className="gap-2 py-2.5">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>

            <TabsTrigger value="account" className="gap-2 py-2.5">
              <ShieldCheck className="h-4 w-4" />
              Akun
            </TabsTrigger>

            <TabsTrigger
              value="preferences"
              className="gap-2 py-2.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Preferensi
            </TabsTrigger>

            <TabsTrigger
              value="appearance"
              className="gap-2 py-2.5"
            >
              <Palette className="h-4 w-4" />
              Tampilan
            </TabsTrigger>
          </TabsList>

          {/* ============================================= */}
          {/* PROFIL */}
          {/* ============================================= */}

          <TabsContent
            value="profile"
            className="mt-5 space-y-6"
          >
            <Card className={cn("relative overflow-hidden", GLASS)}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
              />

              <CardHeader className={cn("relative", CARD_HEADER)}>
                <div className="flex items-center gap-3">
                  <div className={ICON_BOX}>
                    <GraduationCap className="h-5 w-5" />
                  </div>

                  <div>
                    <CardTitle>Informasi Profil</CardTitle>
                    <CardDescription className="mt-1">
                      Lengkapi data pendidikan agar rekomendasi
                      GradeUp lebih sesuai.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative pt-6">
                {loading ? (
                  <div className="max-w-2xl space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                      <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                      <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none sm:col-span-2" />
                    </div>
                    <div className="h-36 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                  </div>
                ) : (
                  <form
                    onSubmit={saveProfile}
                    noValidate
                    className="max-w-3xl space-y-6"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="p-name">
                          Nama lengkap
                        </Label>

                        <Input
                          id="p-name"
                          value={profile.name}
                          onChange={(e) =>
                            updateProfile("name", e.target.value)
                          }
                          maxLength={100}
                          placeholder="Masukkan nama lengkap"
                          aria-invalid={Boolean(profileErr.name)}
                        />

                        <FieldError message={profileErr.name} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p-email">
                          Email akun
                        </Label>

                        <Input
                          id="p-email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted/60"
                        />

                        <p className="text-xs text-muted-foreground">
                          Email terhubung dengan akun dan tidak
                          dapat diubah dari halaman ini.
                        </p>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="p-school">
                          <span className="inline-flex items-center gap-2">
                            <School className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Nama sekolah / instansi
                          </span>
                        </Label>

                        <Input
                          id="p-school"
                          value={profile.school}
                          onChange={(e) =>
                            updateProfile("school", e.target.value)
                          }
                          maxLength={150}
                          placeholder="Contoh: SMP Negeri 1 Jakarta"
                          aria-invalid={Boolean(profileErr.school)}
                        />

                        <FieldError
                          message={profileErr.school}
                        />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "space-y-4 rounded-xl bg-emerald-500/[0.05] p-4 dark:bg-emerald-500/[0.06] sm:p-5",
                        INSET
                      )}
                    >
                      <div>
                        <h3 className="font-semibold">
                          Informasi pendidikan
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Pilih jenjang dan kelas saat ini.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Jenjang pendidikan</Label>

                          <Select
                            value={
                              profile.educationLevel || NO_SELECTION
                            }
                            onValueChange={
                              handleEducationLevelChange
                            }
                          >
                            <SelectTrigger
                              aria-invalid={Boolean(
                                profileErr.educationLevel
                              )}
                            >
                              <SelectValue placeholder="Pilih jenjang" />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value={NO_SELECTION}>
                                Pilih jenjang pendidikan
                              </SelectItem>

                              {EDUCATION_LEVELS.map((item) => (
                                <SelectItem
                                  key={item.value}
                                  value={item.value}
                                >
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <FieldError
                            message={profileErr.educationLevel}
                          />
                        </div>

                        {requiresGrade && (
                          <div className="space-y-2">
                            <Label>Kelas</Label>

                            <Select
                              value={
                                profile.grade || NO_SELECTION
                              }
                              onValueChange={(value) =>
                                updateProfile(
                                  "grade",
                                  value === NO_SELECTION ? "" : value
                                )
                              }
                            >
                              <SelectTrigger
                                aria-invalid={Boolean(
                                  profileErr.grade
                                )}
                              >
                                <SelectValue placeholder="Pilih kelas" />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectItem value={NO_SELECTION}>
                                  Pilih kelas
                                </SelectItem>

                                {availableGrades.map((grade) => (
                                  <SelectItem
                                    key={grade}
                                    value={String(grade)}
                                  >
                                    Kelas {grade}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <FieldError
                              message={profileErr.grade}
                            />
                          </div>
                        )}
                      </div>

                      {!requiresGrade &&
                        profile.educationLevel && (
                          <p className="text-xs text-muted-foreground">
                            Jenjang ini tidak memerlukan pilihan
                            kelas sekolah formal.
                          </p>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-emerald-900/10 pt-5 dark:border-emerald-400/10 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Perubahan profil akan disimpan ke akun Anda.
                      </p>

                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className={cn("w-full sm:w-auto", BTN_PRIMARY)}
                      >
                        {savingProfile
                          ? "Menyimpan..."
                          : "Simpan Profil"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* =========================================== */}
            {/* REFERRAL */}
            {/* =========================================== */}

            <Card className={cn("relative overflow-hidden", GLASS)}>
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(5,150,105,0.25)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom_left,black,transparent_65%)]"
                />
                <div
                  aria-hidden="true"
                  className="gu-drift pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/25 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                />

                <CardHeader className="relative">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div
                      className={cn(
                        ICON_BOX,
                        "h-12 w-12"
                      )}
                    >
                      <Gift className="h-6 w-6" />
                    </div>

                    <div>
                      <CardTitle>
                        Undang Teman & Dapatkan Premium
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Ajak teman belajar bersama dan dapatkan
                        tambahan Premium 7 hari.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>

              <CardContent className="relative space-y-6 pt-6">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold">
                        Hadiah Premium 7 Hari
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Setiap teman yang mendaftar menggunakan
                        kode Anda dan menyelesaikan pembelian
                        Premium pertamanya akan memberikan tambahan
                        Premium selama 7 hari.
                      </p>
                    </div>
                  </div>
                </div>

                {/* KODE REFERRAL */}
                <div className="space-y-3">
                  <div>
                    <Label>Kode referral Anda</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bagikan kode ini kepada teman yang ingin
                      mendaftar di GradeUp.
                    </p>
                  </div>

                  {referralLoading ? (
                    <div className="h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                  ) : referralCode ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex min-h-12 flex-1 items-center justify-center overflow-hidden rounded-lg border border-dashed border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.06] px-4">
                        <span className="break-all font-mono text-xl font-bold tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                          {referralCode}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyReferralCode}
                        className={cn("w-full sm:w-auto", BTN_OUTLINE)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Salin Kode
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-emerald-600/25 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        {referralError ||
                          "Kode referral belum tersedia."}
                      </p>
                    </div>
                  )}
                </div>

                {/* LINK UNDANGAN */}
                <div className="space-y-3">
                  <div>
                    <Label>Link undangan Anda</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Teman dapat membuka link ini untuk mendaftar.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div
                      className={cn(
                        "flex min-h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-3",
                        INSET
                      )}
                    >
                      <Link2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate text-sm text-muted-foreground">
                        {referralLoading
                          ? "Memuat link undangan..."
                          : referralLink || "Link belum tersedia"}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyReferralLink}
                      disabled={!referralLink || referralLoading}
                      className={cn("w-full sm:w-auto", BTN_OUTLINE)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Salin Link
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={shareReferralLink}
                    disabled={!referralLink || referralLoading}
                    className={cn("w-full sm:w-auto", BTN_PRIMARY)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Bagikan Undangan
                  </Button>
                </div>

                {/* STATISTIK */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/30 motion-reduce:transform-none motion-reduce:transition-none",
                      INSET
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl"
                    />
                    <div className="relative flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">
                        Total pendaftar
                      </span>
                    </div>
                    <p className="relative mt-2 text-2xl font-bold tabular-nums">
                      {referralLoading ? "—" : referrals.length}
                    </p>
                    <p className="relative mt-1 text-xs text-muted-foreground">
                      Teman menggunakan kode Anda
                    </p>
                  </div>

                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-amber-500/30 motion-reduce:transform-none motion-reduce:transition-none",
                      INSET
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl"
                    />
                    <div className="relative flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-xs">Menunggu</span>
                    </div>
                    <p className="relative mt-2 text-2xl font-bold tabular-nums">
                      {referralLoading ? "—" : pendingCount}
                    </p>
                    <p className="relative mt-1 text-xs text-muted-foreground">
                      Belum menyelesaikan pembelian
                    </p>
                  </div>

                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/30 motion-reduce:transform-none motion-reduce:transition-none",
                      INSET
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/15 blur-2xl"
                    />
                    <div className="relative flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Berhasil</span>
                    </div>
                    <p className="relative mt-2 text-2xl font-bold tabular-nums">
                      {referralLoading ? "—" : rewardedCount}
                    </p>
                    <p className="relative mt-1 text-xs text-muted-foreground">
                      Referral mendapatkan hadiah
                    </p>
                  </div>

                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-teal-500/30 motion-reduce:transform-none motion-reduce:transition-none",
                      INSET
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-teal-500/10 blur-2xl"
                    />
                    <div className="relative flex items-center gap-2 text-muted-foreground">
                      <Gift className="h-4 w-4" />
                      <span className="text-xs">
                        Premium tambahan
                      </span>
                    </div>
                    <p className="relative mt-2 text-2xl font-bold tabular-nums">
                      {referralLoading
                        ? "—"
                        : `${totalRewardDays} hari`}
                    </p>
                    <p className="relative mt-1 text-xs text-muted-foreground">
                      Total hadiah yang sudah diberikan
                    </p>
                  </div>
                </div>

                {/* RIWAYAT */}
                <div className="space-y-4 border-t border-emerald-900/10 pt-5 dark:border-emerald-400/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        Riwayat undangan
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pantau status teman yang menggunakan kode
                        referral Anda.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshReferralData}
                      disabled={referralLoading}
                      className={cn("w-full sm:w-auto", BTN_OUTLINE)}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          referralLoading ? "animate-spin" : ""
                        }`}
                      />
                      Perbarui
                    </Button>
                  </div>

                  {referralLoading ? (
                    <div className="space-y-3">
                      <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                      <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <div className="relative overflow-hidden rounded-xl border border-dashed border-emerald-600/25 bg-emerald-500/[0.04] p-8 text-center">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-0 h-28 w-56 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
                      />
                      <Users className="relative mx-auto mb-3 h-9 w-9 text-emerald-600/70 dark:text-emerald-400/70" />
                      <p className="relative font-semibold">
                        Belum ada teman yang mendaftar
                      </p>
                      <p className="relative mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                        Bagikan kode referral atau link undangan
                        Anda untuk mulai mengajak teman belajar
                        bersama di GradeUp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referrals.map((item) => {
                        const reward = referralRewards.find(
                          (entry) =>
                            entry.referral_id === item.id &&
                            entry.status === "issued"
                        );

                        const statusInfo = getReferralStatus(
                          item.status,
                          Boolean(reward)
                        );

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex flex-col gap-3 rounded-xl p-4 transition hover:border-emerald-500/30 motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between",
                              INSET
                            )}
                          >
                            <div className="min-w-0">
                              <p className="font-medium">
                                Pendaftaran teman
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatReferralDate(item.created_at)}
                              </p>

                              {reward && (
                                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Hadiah Premium {reward.reward_days}{" "}
                                  hari telah diberikan
                                </p>
                              )}
                            </div>

                            <span
                              className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${statusInfo.className}`}
                            >
                              {reward ||
                              item.status === "rewarded" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Clock3 className="h-3.5 w-3.5" />
                              )}
                              {statusInfo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* KETENTUAN */}
                <div className="rounded-xl border border-emerald-900/5 bg-emerald-500/[0.05] p-4 dark:border-emerald-400/10">
                  <p className="text-sm font-semibold">
                    Ketentuan program referral
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      Kode referral hanya dapat digunakan saat
                      pendaftaran akun baru.
                    </li>
                    <li>
                      Setiap siswa hanya dapat menggunakan satu
                      kode referral.
                    </li>
                    <li>
                      Hadiah diberikan setelah pembelian Premium
                      pertama teman berhasil dikonfirmasi.
                    </li>
                    <li>
                      Hadiah berupa tambahan Premium selama
                      7 hari untuk pemberi referral.
                    </li>
                    <li>
                      Satu teman hanya dapat menghasilkan satu
                      hadiah referral.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================= */}
          {/* AKUN */}
          {/* ============================================= */}

          <TabsContent value="account" className="mt-5">
            <Card className={cn("relative overflow-hidden", GLASS)}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl"
              />
              <CardHeader className={cn("relative", CARD_HEADER)}>
                <div className="flex items-center gap-3">
                  <div className={ICON_BOX}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Keamanan Akun</CardTitle>
                    <CardDescription className="mt-1">
                      Gunakan kata sandi yang kuat untuk menjaga
                      keamanan akun GradeUp.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative pt-6">
                <form
                  onSubmit={savePassword}
                  noValidate
                  className="max-w-md space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="pw-next">
                      Kata sandi baru
                    </Label>
                    <PasswordInput
                      id="pw-next"
                      value={pw.next}
                      onChange={(e) =>
                        updatePasswordField("next", e.target.value)
                      }
                      autoComplete="new-password"
                    />
                    <FieldError message={pwErr.next} />
                    <p className="text-xs text-muted-foreground">
                      Minimal 8 karakter, terdiri dari huruf dan angka.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pw-confirm">
                      Konfirmasi kata sandi baru
                    </Label>
                    <PasswordInput
                      id="pw-confirm"
                      value={pw.confirm}
                      onChange={(e) =>
                        updatePasswordField(
                          "confirm",
                          e.target.value
                        )
                      }
                      autoComplete="new-password"
                    />
                    <FieldError message={pwErr.confirm} />
                  </div>

                  <div className="border-t border-emerald-900/10 pt-4 dark:border-emerald-400/10">
                    <Button
                      type="submit"
                      disabled={savingPassword}
                      className={cn("w-full sm:w-auto", BTN_PRIMARY)}
                    >
                      {savingPassword
                        ? "Memperbarui..."
                        : "Perbarui Kata Sandi"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================= */}
          {/* PREFERENSI */}
          {/* ============================================= */}

          <TabsContent value="preferences" className="mt-5">
            <Card className={cn("relative overflow-hidden", GLASS)}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
              />
              <CardHeader className={cn("relative", CARD_HEADER)}>
                <div className="flex items-center gap-3">
                  <div className={ICON_BOX}>
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Preferensi Belajar</CardTitle>
                    <CardDescription className="mt-1">
                      Sesuaikan target dan pengalaman belajar Anda.
                      Pengaturan tersimpan di akun.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative max-w-3xl pt-6">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="p-target">
                          Target paket ujian per bulan
                        </Label>
                        <Input
                          id="p-target"
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={prefs.targetExams}
                          onChange={(e) =>
                            updatePreferences(
                              "targetExams",
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value)
                            )
                          }
                          aria-invalid={Boolean(
                            prefsErr.targetExams
                          )}
                        />
                        <FieldError
                          message={prefsErr.targetExams}
                        />
                        <p className="text-xs text-muted-foreground">
                          Digunakan untuk menghitung ketercapaian
                          target di Dashboard.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Target waktu belajar harian</Label>
                        <Select
                          value={prefs.dailyGoal}
                          onValueChange={(value) =>
                            updatePreferences("dailyGoal", value)
                          }
                        >
                          <SelectTrigger
                            aria-invalid={Boolean(
                              prefsErr.dailyGoal
                            )}
                          >
                            <SelectValue placeholder="Pilih target belajar" />
                          </SelectTrigger>
                          <SelectContent>
                            {["15", "30", "60", "90"].map(
                              (minutes) => (
                                <SelectItem
                                  key={minutes}
                                  value={minutes}
                                >
                                  {minutes} menit / hari
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FieldError
                          message={prefsErr.dailyGoal}
                        />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "divide-y divide-emerald-900/10 rounded-xl px-4 dark:divide-emerald-400/10",
                        INSET
                      )}
                    >
                      <SettingRow
                        id="autoplay"
                        title="Putar pelajaran berikutnya otomatis"
                        description="Lanjut ke pembahasan berikutnya secara otomatis."
                        checked={prefs.autoplay}
                        onChange={(value) =>
                          updatePreferences("autoplay", value)
                        }
                      />

                      <SettingRow
                        id="timer"
                        title="Tampilkan timer saat ujian"
                        description="Tampilkan sisa waktu selama mengerjakan ujian."
                        checked={prefs.showTimer}
                        onChange={(value) =>
                          updatePreferences("showTimer", value)
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-3 border-t border-emerald-900/10 pt-5 dark:border-emerald-400/10 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Preferensi ini mengikuti akun saat Anda
                        masuk dari perangkat lain.
                      </p>

                      <Button
                        type="button"
                        onClick={savePreferences}
                        disabled={savingPreferences}
                        className={cn("w-full sm:w-auto", BTN_PRIMARY)}
                      >
                        {savingPreferences
                          ? "Menyimpan..."
                          : "Simpan Preferensi"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================= */}
          {/* TAMPILAN */}
          {/* ============================================= */}

          <TabsContent value="appearance" className="mt-5">
            <Card className={cn("relative overflow-hidden", GLASS)}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime-400/10 blur-3xl"
              />
              <CardHeader className={cn("relative", CARD_HEADER)}>
                <div className="flex items-center gap-3">
                  <div className={ICON_BOX}>
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Tampilan GradeUp</CardTitle>
                    <CardDescription className="mt-1">
                      Pilih tema yang paling nyaman digunakan.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative max-w-2xl pt-6">
                <ThemePicker />
                <p className="mt-4 text-xs text-muted-foreground">
                  Pilihan tema disimpan secara otomatis di
                  perangkat ini.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
