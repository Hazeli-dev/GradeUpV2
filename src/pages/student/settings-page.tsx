import { useEffect, useState, type FormEvent } from "react";
import { Bell, Palette, ShieldCheck, SlidersHorizontal, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ThemePicker } from "@/components/shared/theme-picker";
import { SettingRow } from "@/components/shared/setting-row";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/auth-bits";
import { isValidEmail } from "@/utils/format";
import { supabase } from "@/lib/supabase";

export default function StudentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // State Profile dari Supabase
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    school: "",
    level: "SMA",
    targetExams: 10,
  });
  const [profileErr, setProfileErr] = useState<Record<string, string>>({});

  // State Password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<Record<string, string>>({});

  // State Preferensi & Notifikasi
  const [prefs, setPrefs] = useState({ language: "id", dailyGoal: "30", autoplay: true, showTimer: true });
  const [notif, setNotif] = useState({ email: true, reminder: true, results: true, promo: false });

  // Load Data User Aktif dari Supabase
  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          setProfile({
            name: profData?.full_name || user.user_metadata?.full_name || "",
            email: user.email || "",
            school: profData?.school || "",
            level: profData?.level || "SMA",
            targetExams: profData?.target_exams || 10,
          });
        }
      } catch (err) {
        console.error("Gagal memuat profil user:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  // Simpan Profil ke Supabase Database
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (profile.name.trim().length < 3) err.name = "Nama minimal 3 karakter.";
    if (!isValidEmail(profile.email)) err.email = "Email tidak valid.";
    if (profile.targetExams < 1) err.targetExams = "Target minimal 1 ujian.";

    setProfileErr(err);
    if (Object.keys(err).length) return;

    try {
      setSavingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: profile.name,
          school: profile.school,
          level: profile.level,
          target_exams: profile.targetExams,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Profil berhasil diperbarui di database!");
      }
    } catch (error: any) {
      toast.error("Gagal menyimpan profil: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Perbarui Kata Sandi via Supabase Auth API
  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (pw.next.length < 8) err.next = "Kata sandi baru minimal 8 karakter.";
    if (pw.confirm !== pw.next) err.confirm = "Konfirmasi kata sandi tidak cocok.";
    setPwErr(err);
    if (Object.keys(err).length) return;

    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: pw.next,
      });

      if (error) throw error;

      setPw({ current: "", next: "", confirm: "" });
      toast.success("Kata sandi berhasil diperbarui!");
    } catch (error: any) {
      toast.error("Gagal memperbarui kata sandi: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Kelola profil, target belajar, akun, dan tampilan." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" /> Profil</TabsTrigger>
          <TabsTrigger value="account"><ShieldCheck className="h-4 w-4 mr-1.5" /> Akun</TabsTrigger>
          <TabsTrigger value="preferences"><SlidersHorizontal className="h-4 w-4 mr-1.5" /> Preferensi</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1.5" /> Tampilan</TabsTrigger>
        </TabsList>

        {/* TAB PROFIL */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>Data ini digunakan untuk laporan pencapaian dan sertifikat Anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Nama lengkap</Label>
                  <Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={loading} />
                  <FieldError message={profileErr.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" type="email" value={profile.email} disabled className="bg-muted opacity-70" />
                  <p className="text-[11px] text-muted-foreground">Email terikat pada akun Anda dan tidak dapat diubah langsung.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-school">Sekolah / Instansi</Label>
                  <Input id="p-school" value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label>Jenjang Pendidikan</Label>
                  <Select value={profile.level} onValueChange={(v) => setProfile({ ...profile, level: v })} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["SD", "SMP", "SMA", "Kedinasan", "Umum"].map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 pt-2">
                  <Button type="submit" disabled={savingProfile || loading}>
                    {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB AKUN & KATA SANDI */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Ubah Kata Sandi</CardTitle>
              <CardDescription>Perbarui kata sandi akun Anda untuk menjaga keamanan data.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} noValidate className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw-next">Kata sandi baru</Label>
                  <PasswordInput id="pw-next" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                  <FieldError message={pwErr.next} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-confirm">Konfirmasi kata sandi baru</Label>
                  <PasswordInput id="pw-confirm" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                  <FieldError message={pwErr.confirm} />
                </div>
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? "Memperbarui..." : "Perbarui Kata Sandi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PREFERENSI & TARGET UJIAN */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferensi Belajar & Target</CardTitle>
              <CardDescription>Atur target belajar pribadi Anda yang akan ditampilkan pada statistik dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl divide-y">
              <div className="grid gap-4 pb-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-target">Target Paket Ujian (Bulan Ini)</Label>
                  <Input
                    id="p-target"
                    type="number"
                    min={1}
                    max={100}
                    value={profile.targetExams}
                    onChange={(e) => setProfile({ ...profile, targetExams: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">Digunakan untuk menghitung % Ketercapaian Target di Dashboard.</p>
                </div>
                <div className="space-y-2">
                  <Label>Target Waktu Belajar Harian</Label>
                  <Select value={prefs.dailyGoal} onValueChange={(v) => setPrefs({ ...prefs, dailyGoal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["15", "30", "60", "90"].map((m) => (
                        <SelectItem key={m} value={m}>{m} menit / hari</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SettingRow id="autoplay" title="Putar pelajaran berikutnya otomatis" description="Lanjut ke pembahasan berikutnya secara otomatis." checked={prefs.autoplay} onChange={(v) => setPrefs({ ...prefs, autoplay: v })} />
              <SettingRow id="timer" title="Tampilkan timer saat ujian" description="Timer selalu terlihat di ruang ujian." checked={prefs.showTimer} onChange={(v) => setPrefs({ ...prefs, showTimer: v })} />
              <div className="pt-5">
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Menyimpan Target..." : "Simpan Preferensi & Target"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB NOTIFIKASI */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifikasi</CardTitle>
              <CardDescription>Atur pemberitahuan yang ingin Anda terima.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl divide-y">
              <SettingRow id="n-email" title="Notifikasi email" description="Terima ringkasan aktivitas melalui email." checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />
              <SettingRow id="n-reminder" title="Pengingat belajar" description="Ingatkan saya agar menjaga streak harian." checked={notif.reminder} onChange={(v) => setNotif({ ...notif, reminder: v })} />
              <SettingRow id="n-results" title="Hasil ujian" description="Beritahu saya saat hasil ujian tersedia." checked={notif.results} onChange={(v) => setNotif({ ...notif, results: v })} />
              <SettingRow id="n-promo" title="Info promo" description="Kabar tentang fitur baru dan penawaran." checked={notif.promo} onChange={(v) => setNotif({ ...notif, promo: v })} />
              <div className="pt-5"><Button onClick={() => toast.success("Preferensi notifikasi diperbarui")}>Simpan Notifikasi</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB TAMPILAN */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan</CardTitle>
              <CardDescription>Pilih mode terang atau gelap. Pilihan disimpan di perangkat ini.</CardDescription>
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
