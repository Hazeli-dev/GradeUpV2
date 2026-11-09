
import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
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

import { isValidEmail } from "@/utils/format";
import { supabase } from "@/lib/supabase";

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
  targetExams: number;
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
// MAIN COMPONENT
// =====================================================

export default function StudentSettingsPage() {
  // ---------------------------------------------------
  // PROFILE STATE
  // ---------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    school: "",
    educationLevel: "",
    grade: "",
    targetExams: 10,
  });

  const [profileErr, setProfileErr] = useState<
    Record<string, string>
  >({});

  // ---------------------------------------------------
  // PASSWORD STATE
  // ---------------------------------------------------

  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [pwErr, setPwErr] = useState<
    Record<string, string>
  >({});

  // ---------------------------------------------------
  // PREFERENCES STATE
  // ---------------------------------------------------

  const [prefs, setPrefs] = useState({
    language: "id",
    dailyGoal: "30",
    autoplay: true,
    showTimer: true,
  });

  // ---------------------------------------------------
  // NOTIFICATION STATE
  // ---------------------------------------------------

  const [notif, setNotif] = useState({
    email: true,
    reminder: true,
    results: true,
    promo: false,
  });

  // ---------------------------------------------------
  // REFERRAL STATE
  // ---------------------------------------------------

  const [referralLoading, setReferralLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
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

  const referralLink =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${encodeURIComponent(
          referralCode
        )}`
      : "";

  const rewardedCount = referrals.filter(
    (item) => item.status === "rewarded"
  ).length;

  const pendingCount = referrals.filter(
    (item) => item.status === "pending"
  ).length;

  const totalRewardDays = referralRewards
    .filter((item) => item.status === "issued")
    .reduce(
      (total, item) => total + Number(item.reward_days || 0),
      0
    );

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    let mounted = true;

    async function loadUserData() {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = session?.user;

        if (!user) {
          throw new Error(
            "Sesi login tidak ditemukan. Silakan login kembali."
          );
        }

        const { data: profData, error } = await supabase
          .from("profiles")
          .select(
            "full_name, name, school, education_level, grade, target_exams"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!mounted) return;

        setProfile({
          name:
            profData?.full_name ||
            profData?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          school: profData?.school || "",
          educationLevel: profData?.education_level || "",
          grade:
            profData?.grade != null
              ? String(profData.grade)
              : "",
          targetExams: profData?.target_exams ?? 10,
        });
      } catch (error) {
        console.error("Gagal memuat profil user:", error);

        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Gagal memuat data profil."
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
  // LOAD REFERRAL
  // =====================================================

  useEffect(() => {
    let mounted = true;

    async function loadReferralData() {
      try {
        setReferralLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          throw new Error("Sesi login tidak ditemukan.");
        }

        // Membuat kode referral jika belum tersedia.
        // Fungsi RPC sudah membatasi pembuatan kode
        // hanya untuk akun siswa.
        const {
          data: codeData,
          error: codeError,
        } = await supabase.rpc("get_or_create_referral_code");

        if (codeError) throw codeError;

        // Memuat data undangan dan hadiah milik siswa.
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

        if (!mounted) return;

        setReferralCode(
          typeof codeData === "string" ? codeData : ""
        );

        setReferrals(
          (referralData || []) as ReferralItem[]
        );

        setReferralRewards(
          (rewardData || []) as ReferralReward[]
        );
      } catch (error) {
        console.error("Gagal memuat data referral:", error);

        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Gagal memuat kode referral."
          );
        }
      } finally {
        if (mounted) {
          setReferralLoading(false);
        }
      }
    }

    loadReferralData();

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
      toast.error("Tidak dapat menyalin. Silakan salin secara manual.");
    }
  };

  const copyReferralCode = () => {
    copyText(referralCode, "Kode referral berhasil disalin!");
  };

  const copyReferralLink = () => {
    copyText(referralLink, "Link undangan berhasil disalin!");
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
      setReferralLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Sesi login tidak ditemukan.");

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

      setReferrals((referralData || []) as ReferralItem[]);
      setReferralRewards((rewardData || []) as ReferralReward[]);

      toast.success("Data referral berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal memperbarui referral:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui data referral."
      );
    } finally {
      setReferralLoading(false);
    }
  };

  // =====================================================
  // REFERRAL STATUS
  // =====================================================

  const getReferralStatus = (
    status: string
  ): ReferralStatusInfo => {
    switch (status) {
      case "rewarded":
        return {
          label: "Hadiah diberikan",
          className:
            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };

      case "qualified":
        return {
          label: "Memenuhi syarat",
          className:
            "bg-blue-500/10 text-blue-600 border-blue-500/20",
        };

      case "rejected":
        return {
          label: "Tidak memenuhi syarat",
          className:
            "bg-destructive/10 text-destructive border-destructive/20",
        };

      default:
        return {
          label: "Menunggu pembelian Premium",
          className:
            "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
    }
  };

  const formatReferralDate = (value: string) => {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =====================================================
  // EDUCATION LEVEL
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

  // =====================================================
  // UPDATE PROFILE STATE
  // =====================================================

  const updateProfile = (
    field: keyof ProfileData,
    value: string | number
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

  // =====================================================
  // PROFILE VALIDATION
  // =====================================================

  const validateProfile = () => {
    const err: Record<string, string> = {};

    if (profile.name.trim().length < 3) {
      err.name = "Nama minimal 3 karakter.";
    }

    if (!isValidEmail(profile.email)) {
      err.email = "Email tidak valid.";
    }

    if (!profile.educationLevel) {
      err.educationLevel =
        "Silakan pilih jenjang pendidikan.";
    }

    if (requiresGrade && !profile.grade) {
      err.grade = "Silakan pilih kelas.";
    }

    if (
      profile.grade &&
      requiresGrade &&
      !availableGrades.includes(Number(profile.grade))
    ) {
      err.grade =
        "Kelas tidak sesuai dengan jenjang pendidikan.";
    }

    if (
      !Number.isInteger(profile.targetExams) ||
      profile.targetExams < 1 ||
      profile.targetExams > 100
    ) {
      err.targetExams =
        "Target ujian harus antara 1–100.";
    }

    setProfileErr(err);

    return Object.keys(err).length === 0;
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!validateProfile()) return;

    try {
      setSavingProfile(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;

      if (!user) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
      }

      const profilePayload = {
        full_name: profile.name.trim(),
        school: profile.school.trim() || null,
        education_level: profile.educationLevel,
        grade: requiresGrade
          ? Number(profile.grade)
          : null,
        target_exams: profile.targetExams,
      };

      const { error } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil berhasil diperbarui!");
      setProfileErr({});
    } catch (error: unknown) {
      console.error("DETAIL ERROR SIMPAN PROFIL:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";

      toast.error("Gagal menyimpan profil: " + message);
    } finally {
      setSavingProfile(false);
    }
  };

  // =====================================================
  // SAVE PASSWORD
  // =====================================================

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();

    const err: Record<string, string> = {};

    if (pw.next.length < 8) {
      err.next =
        "Kata sandi baru minimal 8 karakter.";
    }

    if (pw.confirm !== pw.next) {
      err.confirm =
        "Konfirmasi kata sandi tidak cocok.";
    }

    setPwErr(err);

    if (Object.keys(err).length > 0) return;

    try {
      setSavingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: pw.next,
      });

      if (error) throw error;

      setPw({
        current: "",
        next: "",
        confirm: "",
      });

      setPwErr({});

      toast.success("Kata sandi berhasil diperbarui!");
    } catch (error: unknown) {
      toast.error(
        "Gagal memperbarui kata sandi: " +
          (error instanceof Error
            ? error.message
            : "Terjadi kesalahan.")
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola profil, target belajar, akun, dan tampilan."
      />

      <Tabs defaultValue="profile">
        {/* TAB NAVIGATION */}
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-4 w-4" />
            Profil
          </TabsTrigger>

          <TabsTrigger value="account">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Akun
          </TabsTrigger>

          <TabsTrigger value="preferences">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Preferensi
          </TabsTrigger>

          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-4 w-4" />
            Notifikasi
          </TabsTrigger>

          <TabsTrigger value="appearance">
            <Palette className="mr-1.5 h-4 w-4" />
            Tampilan
          </TabsTrigger>
        </TabsList>

        {/* ================================================= */}
        {/* PROFIL */}
        {/* ================================================= */}

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <CardTitle>Informasi Profil</CardTitle>
                  <CardDescription>
                    Lengkapi data pendidikan agar GradeUp dapat
                    menampilkan ujian sesuai jenjang dan kelas Anda.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={saveProfile}
                noValidate
                className="max-w-2xl space-y-6"
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
                      disabled={loading}
                      placeholder="Masukkan nama lengkap"
                    />

                    <FieldError message={profileErr.name} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-email">
                      Email
                    </Label>

                    <Input
                      id="p-email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted opacity-70"
                    />

                    <p className="text-xs text-muted-foreground">
                      Email terikat pada akun dan tidak dapat
                      diubah langsung.
                    </p>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="p-school">
                      <span className="inline-flex items-center gap-2">
                        <School className="h-4 w-4" />
                        Nama Sekolah / Instansi
                      </span>
                    </Label>

                    <Input
                      id="p-school"
                      value={profile.school}
                      onChange={(e) =>
                        updateProfile("school", e.target.value)
                      }
                      disabled={loading}
                      placeholder="Contoh: SMP Negeri 1 Jakarta"
                    />

                    <p className="text-xs text-muted-foreground">
                      Masukkan nama sekolah atau instansi Anda.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <div>
                    <h3 className="font-semibold">
                      Informasi Pendidikan
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Data ini digunakan untuk menyesuaikan
                      rekomendasi dan filter paket ujian.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Jenjang Pendidikan</Label>

                      <Select
                        value={
                          profile.educationLevel || NO_SELECTION
                        }
                        onValueChange={handleEducationLevelChange}
                        disabled={loading}
                      >
                        <SelectTrigger>
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
                          value={profile.grade || NO_SELECTION}
                          onValueChange={(value) =>
                            updateProfile(
                              "grade",
                              value === NO_SELECTION ? "" : value
                            )
                          }
                          disabled={loading}
                        >
                          <SelectTrigger>
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

                        <FieldError message={profileErr.grade} />
                      </div>
                    )}
                  </div>

                  {!requiresGrade && profile.educationLevel && (
                    <p className="text-xs text-muted-foreground">
                      Jenjang ini tidak memerlukan pilihan kelas
                      sekolah formal.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="max-w-md text-xs text-muted-foreground">
                    Pastikan jenjang dan kelas sudah benar agar
                    rekomendasi ujian lebih sesuai.
                  </p>

                  <Button
                    type="submit"
                    disabled={savingProfile || loading}
                  >
                    {savingProfile
                      ? "Menyimpan..."
                      : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ================================================= */}
          {/* REFERRAL CARD */}
          {/* ================================================= */}

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Gift className="h-6 w-6" />
                  </div>

                  <div>
                    <CardTitle>
                      Undang Teman & Dapatkan Premium
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Ajak teman belajar di GradeUp dan dapatkan
                      tambahan Premium 7 hari.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </div>

            <CardContent className="space-y-6 pt-6">
              {/* REWARD INFO */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                  <div>
                    <p className="font-semibold">
                      Hadiah Premium 7 Hari
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Setiap teman yang mendaftar menggunakan kode
                      Anda dan menyelesaikan pembelian Premium
                      pertamanya akan memberikan Anda tambahan
                      Premium selama 7 hari.
                    </p>
                  </div>
                </div>
              </div>

              {/* REFERRAL CODE */}
              <div className="space-y-3">
                <div>
                  <Label>Kode referral Anda</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bagikan kode ini kepada teman yang ingin
                    mendaftar di GradeUp.
                  </p>
                </div>

                {referralLoading ? (
                  <div className="h-14 animate-pulse rounded-lg bg-muted" />
                ) : referralCode ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex min-h-12 flex-1 items-center justify-center rounded-lg border bg-muted/30 px-4">
                      <span className="font-mono text-xl font-bold tracking-[0.2em]">
                        {referralCode}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyReferralCode}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Salin Kode
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Kode referral belum berhasil dimuat.
                    </p>
                  </div>
                )}
              </div>

              {/* REFERRAL LINK */}
              <div className="space-y-3">
                <Label>Link undangan Anda</Label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border bg-muted/30 px-3">
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />

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
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Salin Link
                  </Button>
                </div>

                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={shareReferralLink}
                  disabled={!referralLink || referralLoading}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Bagikan Undangan
                </Button>
              </div>

              {/* REFERRAL STATISTICS */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">
                      Total pendaftar
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold">
                    {referralLoading ? "—" : referrals.length}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Teman menggunakan kode Anda
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs">
                      Menunggu
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold">
                    {referralLoading ? "—" : pendingCount}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Belum menyelesaikan pembelian
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">
                      Berhasil
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold">
                    {referralLoading ? "—" : rewardedCount}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Referral mendapatkan hadiah
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gift className="h-4 w-4" />
                    <span className="text-xs">
                      Premium tambahan
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold">
                    {referralLoading
                      ? "—"
                      : `${totalRewardDays} hari`}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Total hadiah yang diberikan
                  </p>
                </div>
              </div>

              {/* REFERRAL HISTORY */}
              <div className="space-y-4 border-t pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />

                    <p className="font-semibold">
                      Belum ada teman yang mendaftar
                    </p>

                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      Bagikan kode referral atau link undangan
                      Anda untuk mulai mengajak teman belajar
                      bersama di GradeUp.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((item) => {
                      const statusInfo = getReferralStatus(
                        item.status
                      );

                      const reward = referralRewards.find(
                        (entry) =>
                          entry.referral_id === item.id
                      );

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              Pendaftaran teman
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatReferralDate(
                                item.created_at
                              )}
                            </p>

                            {reward?.status === "issued" && (
                              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Hadiah Premium{" "}
                                {reward.reward_days} hari telah
                                diberikan
                              </p>
                            )}
                          </div>

                          <span
                            className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${statusInfo.className}`}
                          >
                            {item.status === "rewarded" ? (
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

              {/* REFERRAL TERMS */}
              <div className="rounded-xl bg-muted/40 p-4">
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

        {/* ================================================= */}
        {/* AKUN */}
        {/* ================================================= */}

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Ubah Kata Sandi</CardTitle>

              <CardDescription>
                Perbarui kata sandi akun Anda untuk menjaga
                keamanan data.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={savePassword}
                noValidate
                className="max-w-md space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="pw-next">
                    Kata sandi baru
                  </Label>

                  <PasswordInput
                    id="pw-next"
                    value={pw.next}
                    onChange={(e) =>
                      setPw({
                        ...pw,
                        next: e.target.value,
                      })
                    }
                  />

                  <FieldError message={pwErr.next} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pw-confirm">
                    Konfirmasi kata sandi baru
                  </Label>

                  <PasswordInput
                    id="pw-confirm"
                    value={pw.confirm}
                    onChange={(e) =>
                      setPw({
                        ...pw,
                        confirm: e.target.value,
                      })
                    }
                  />

                  <FieldError message={pwErr.confirm} />
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword}
                >
                  {savingPassword
                    ? "Memperbarui..."
                    : "Perbarui Kata Sandi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================= */}
        {/* PREFERENSI */}
        {/* ================================================= */}

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>
                Preferensi Belajar & Target
              </CardTitle>

              <CardDescription>
                Atur target belajar pribadi Anda.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y">
              <div className="grid gap-4 pb-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-target">
                    Target Paket Ujian (Bulan Ini)
                  </Label>

                  <Input
                    id="p-target"
                    type="number"
                    min={1}
                    max={100}
                    value={profile.targetExams}
                    onChange={(e) =>
                      updateProfile(
                        "targetExams",
                        Number(e.target.value)
                      )
                    }
                  />

                  <FieldError
                    message={profileErr.targetExams}
                  />

                  <p className="text-xs text-muted-foreground">
                    Digunakan untuk menghitung ketercapaian
                    target di Dashboard.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Target Waktu Belajar Harian
                  </Label>

                  <Select
                    value={prefs.dailyGoal}
                    onValueChange={(value) =>
                      setPrefs({
                        ...prefs,
                        dailyGoal: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                </div>
              </div>

              <SettingRow
                id="autoplay"
                title="Putar pelajaran berikutnya otomatis"
                description="Lanjut ke pembahasan berikutnya secara otomatis."
                checked={prefs.autoplay}
                onChange={(value) =>
                  setPrefs({
                    ...prefs,
                    autoplay: value,
                  })
                }
              />

              <SettingRow
                id="timer"
                title="Tampilkan timer saat ujian"
                description="Timer selalu terlihat di ruang ujian."
                checked={prefs.showTimer}
                onChange={(value) =>
                  setPrefs({
                    ...prefs,
                    showTimer: value,
                  })
                }
              />

              <div className="pt-5">
                <Button
                  onClick={() => saveProfile()}
                  disabled={savingProfile || loading}
                >
                  {savingProfile
                    ? "Menyimpan Target..."
                    : "Simpan Preferensi & Target"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================= */}
        {/* NOTIFIKASI */}
        {/* ================================================= */}

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifikasi</CardTitle>

              <CardDescription>
                Atur pemberitahuan yang ingin Anda terima.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y">
              <SettingRow
                id="n-email"
                title="Notifikasi email"
                description="Terima ringkasan aktivitas melalui email."
                checked={notif.email}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    email: value,
                  })
                }
              />

              <SettingRow
                id="n-reminder"
                title="Pengingat belajar"
                description="Ingatkan saya agar menjaga streak harian."
                checked={notif.reminder}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    reminder: value,
                  })
                }
              />

              <SettingRow
                id="n-results"
                title="Hasil ujian"
                description="Beritahu saya saat hasil ujian tersedia."
                checked={notif.results}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    results: value,
                  })
                }
              />

              <SettingRow
                id="n-promo"
                title="Info promo"
                description="Kabar tentang fitur baru dan penawaran."
                checked={notif.promo}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    promo: value,
                  })
                }
              />

              <div className="pt-5">
                <Button
                  onClick={() =>
                    toast.success(
                      "Preferensi notifikasi diperbarui"
                    )
                  }
                >
                  Simpan Notifikasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================= */}
        {/* TAMPILAN */}
        {/* ================================================= */}

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan</CardTitle>

              <CardDescription>
                Pilih mode terang atau gelap. Pilihan disimpan
                di perangkat ini.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl">
              <ThemePicker />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
