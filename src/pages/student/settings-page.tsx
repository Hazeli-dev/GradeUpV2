
import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  User,
  GraduationCap,
  School,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";
import { ThemePicker } from "@/components/shared/theme-picker";
import { SettingRow } from "@/components/shared/setting-row";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/auth-bits";

import { isValidEmail } from "@/utils/format";
import { supabase } from "@/lib/supabase";

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

type ProfileData = {
  name: string;
  email: string;
  school: string;
  educationLevel: string;
  grade: string;
  targetExams: number;
};

export default function StudentSettingsPage() {
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

  const [profileErr, setProfileErr] = useState<Record<string, string>>({});

  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [pwErr, setPwErr] = useState<Record<string, string>>({});

  const [prefs, setPrefs] = useState({
    language: "id",
    dailyGoal: "30",
    autoplay: true,
    showTimer: true,
  });

  const [notif, setNotif] = useState({
    email: true,
    reminder: true,
    results: true,
    promo: false,
  });

  const availableGrades =
    GRADES_BY_LEVEL[profile.educationLevel] || [];

  const requiresGrade = Boolean(
    GRADES_BY_LEVEL[profile.educationLevel]
  );

  // Memuat profil siswa dari Supabase.
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

  // Mengubah jenjang pendidikan dan mengosongkan kelas sebelumnya.
  const handleEducationLevelChange = (value: string) => {
    const nextLevel = value === NO_SELECTION ? "" : value;

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

  // Mengubah data profil.
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

  // Validasi data profil.
  const validateProfile = () => {
    const err: Record<string, string> = {};

    if (profile.name.trim().length < 3) {
      err.name = "Nama minimal 3 karakter.";
    }

    if (!isValidEmail(profile.email)) {
      err.email = "Email tidak valid.";
    }

    if (!profile.educationLevel) {
      err.educationLevel = "Silakan pilih jenjang pendidikan.";
    }

    if (requiresGrade && !profile.grade) {
      err.grade = "Silakan pilih kelas.";
    }

    if (
      profile.grade &&
      requiresGrade &&
      !availableGrades.includes(Number(profile.grade))
    ) {
      err.grade = "Kelas tidak sesuai dengan jenjang pendidikan.";
    }

    if (
      !Number.isInteger(profile.targetExams) ||
      profile.targetExams < 1 ||
      profile.targetExams > 100
    ) {
      err.targetExams = "Target ujian harus antara 1–100.";
    }

    setProfileErr(err);

    return Object.keys(err).length === 0;
  };

  // Menyimpan profil siswa.
  // Hanya memperbarui kolom profil yang boleh diedit siswa.
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
        grade: requiresGrade ? Number(profile.grade) : null,
        target_exams: profile.targetExams,
      };

      // UPDATE hanya pada baris milik pengguna yang sedang login.
      // Tidak menggunakan UPSERT agar tidak membuat baris profil baru.
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

  // Memperbarui kata sandi melalui Supabase Auth.
  const savePassword = async (e: FormEvent) => {
    e.preventDefault();

    const err: Record<string, string> = {};

    if (pw.next.length < 8) {
      err.next = "Kata sandi baru minimal 8 karakter.";
    }

    if (pw.confirm !== pw.next) {
      err.confirm = "Konfirmasi kata sandi tidak cocok.";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola profil, target belajar, akun, dan tampilan."
      />

      <Tabs defaultValue="profile">
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

        {/* PROFIL */}
        <TabsContent value="profile">
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
                    <Label htmlFor="p-name">Nama lengkap</Label>

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
                    <Label htmlFor="p-email">Email</Label>

                    <Input
                      id="p-email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted opacity-70"
                    />

                    <p className="text-xs text-muted-foreground">
                      Email terikat pada akun dan tidak dapat diubah
                      langsung.
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
                      Data ini digunakan untuk menyesuaikan rekomendasi
                      dan filter paket ujian.
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
        </TabsContent>

        {/* AKUN */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Ubah Kata Sandi</CardTitle>
              <CardDescription>
                Perbarui kata sandi akun Anda untuk menjaga keamanan
                data.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={savePassword}
                noValidate
                className="max-w-md space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="pw-next">Kata sandi baru</Label>

                  <PasswordInput
                    id="pw-next"
                    value={pw.next}
                    onChange={(e) =>
                      setPw({ ...pw, next: e.target.value })
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
                      setPw({ ...pw, confirm: e.target.value })
                    }
                  />

                  <FieldError message={pwErr.confirm} />
                </div>

                <Button type="submit" disabled={savingPassword}>
                  {savingPassword
                    ? "Memperbarui..."
                    : "Perbarui Kata Sandi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFERENSI */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferensi Belajar & Target</CardTitle>
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

                  <FieldError message={profileErr.targetExams} />

                  <p className="text-xs text-muted-foreground">
                    Digunakan untuk menghitung ketercapaian target
                    di Dashboard.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Target Waktu Belajar Harian</Label>

                  <Select
                    value={prefs.dailyGoal}
                    onValueChange={(value) =>
                      setPrefs({ ...prefs, dailyGoal: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {["15", "30", "60", "90"].map((minutes) => (
                        <SelectItem
                          key={minutes}
                          value={minutes}
                        >
                          {minutes} menit / hari
                        </SelectItem>
                      ))}
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
                  setPrefs({ ...prefs, autoplay: value })
                }
              />

              <SettingRow
                id="timer"
                title="Tampilkan timer saat ujian"
                description="Timer selalu terlihat di ruang ujian."
                checked={prefs.showTimer}
                onChange={(value) =>
                  setPrefs({ ...prefs, showTimer: value })
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

        {/* NOTIFIKASI */}
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
                  setNotif({ ...notif, email: value })
                }
              />

              <SettingRow
                id="n-reminder"
                title="Pengingat belajar"
                description="Ingatkan saya agar menjaga streak harian."
                checked={notif.reminder}
                onChange={(value) =>
                  setNotif({ ...notif, reminder: value })
                }
              />

              <SettingRow
                id="n-results"
                title="Hasil ujian"
                description="Beritahu saya saat hasil ujian tersedia."
                checked={notif.results}
                onChange={(value) =>
                  setNotif({ ...notif, results: value })
                }
              />

              <SettingRow
                id="n-promo"
                title="Info promo"
                description="Kabar tentang fitur baru dan penawaran."
                checked={notif.promo}
                onChange={(value) =>
                  setNotif({ ...notif, promo: value })
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

        {/* TAMPILAN */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan</CardTitle>
              <CardDescription>
                Pilih mode terang atau gelap. Pilihan disimpan di
                perangkat ini.
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
