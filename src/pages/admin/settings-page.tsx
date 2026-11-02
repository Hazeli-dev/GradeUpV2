import { useEffect, useState, type FormEvent } from "react";
import { 
  Bell, 
  Info, 
  Palette, 
  Settings, 
  RotateCcw, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert, 
  Calendar, 
  Save, 
  Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { ThemePicker } from "@/components/shared/theme-picker";
import { SettingRow } from "@/components/shared/setting-row";
import { FieldError } from "@/components/auth/auth-bits";
import { isLoadedSupabase } from "@/utils/settings-helpers";
import { APP_NAME, CONTACT } from "@/constants";
import { isValidEmail } from "@/utils/format";
import { supabase } from "@/lib/supabase";

export default function AdminSettingsPage() {
  const [general, setGeneral] = useState({ name: APP_NAME, tagline: "Naik Kelas Lebih Cepat", timezone: "Asia/Jakarta", maintenance: false, registration: true });
  const [info, setInfo] = useState({ email: CONTACT.email, phone: CONTACT.phone, address: CONTACT.address });
  const [infoErr, setInfoErr] = useState<Record<string, string>>({});
  const [notif, setNotif] = useState({ newUser: true, payment: true, report: false, system: true });

  // State untuk Pengaturan Kalender Auto-Reset Season
  const [seasonName, setSeasonName] = useState("Season 1");
  const [resetDateTime, setResetDateTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // State untuk Modal Reset Manual XP
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const CONFIRM_KEYWORD = "RESET-XP";

  // Ambil Konfigurasi Season dari Supabase saat Halaman Dimuat
  useEffect(() => {
    async function fetchSeasonSettings() {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "season_config")
          .single();

        if (data?.value) {
          setSeasonName(data.value.season_name || "Season 1");
          if (data.value.reset_at) {
            // Format ISO ke format input datetime-local (YYYY-MM-DDTHH:mm)
            const dt = new Date(data.value.reset_at);
            const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setResetDateTime(localIso);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil konfigurasi season:", err);
      }
    }

    fetchSeasonSettings();
  }, []);

  // Simpan Jadwal Auto-Reset Berbasis Kalender & Jam
  const handleSaveSchedule = async () => {
    if (!resetDateTime) {
      toast.error("Pilih tanggal dan waktu reset terlebih dahulu.");
      return;
    }

    setSavingSchedule(true);
    try {
      const isoTarget = new Date(resetDateTime).toISOString();

      const { error } = await supabase.from("system_settings").upsert({
        key: "season_config",
        value: {
          reset_at: isoTarget,
          season_name: seasonName,
        },
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Jadwal auto-reset season berhasil disimpan!");
    } catch (err: any) {
      toast.error("Gagal menyimpan jadwal: " + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // Eksekusi Reset Manual Instan
  const handleResetXp = async () => {
    if (confirmText !== CONFIRM_KEYWORD) {
      toast.error(`Ketik "${CONFIRM_KEYWORD}" untuk mengonfirmasi.`);
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.rpc("admin_reset_season_xp");

      if (error) throw error;

      toast.success("XP Musiman seluruh siswa berhasil direset ke 0!");
      setResetOpen(false);
      setConfirmText("");
    } catch (err: any) {
      console.error("Reset XP error:", err);
      toast.error("Gagal mereset XP: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setResetting(false);
    }
  };

  const saveInfo = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!isValidEmail(info.email)) err.email = "Email tidak valid.";
    if (info.phone.trim().length < 6) err.phone = "Nomor telepon tidak valid.";
    setInfoErr(err);
    if (Object.keys(err).length) return;
    toast.success("Informasi platform disimpan (demo)");
  };

  const supabaseReady = isLoadedSupabase();

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan Sistem" description="Konfigurasi umum, informasi platform, tampilan, dan notifikasi." />
      <DemoBanner>Pengaturan belum disimpan ke database dan tidak memengaruhi sistem nyata.</DemoBanner>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><Settings /> Umum</TabsTrigger>
          <TabsTrigger value="gamification"><ShieldAlert /> Season & Gamifikasi</TabsTrigger>
          <TabsTrigger value="platform"><Info /> Informasi Platform</TabsTrigger>
          <TabsTrigger value="appearance"><Palette /> Tampilan</TabsTrigger>
          <TabsTrigger value="notifications"><Bell /> Notifikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>Pengaturan Umum</CardTitle><CardDescription>Identitas dan perilaku dasar platform.</CardDescription></CardHeader>
            <CardContent className="max-w-2xl divide-y">
              <div className="grid gap-4 pb-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="g-name">Nama platform</Label><Input id="g-name" value={general.name} onChange={(e) => setGeneral({ ...general, name: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="g-tag">Tagline</Label><Input id="g-tag" value={general.tagline} onChange={(e) => setGeneral({ ...general, tagline: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Zona waktu</Label>
                  <Select value={general.timezone} onValueChange={(v) => setGeneral({ ...general, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"].map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <SettingRow id="g-reg" title="Izinkan pendaftaran baru" description="Pengguna baru dapat membuat akun sendiri." checked={general.registration} onChange={(v) => setGeneral({ ...general, registration: v })} />
              <SettingRow id="g-maint" title="Mode pemeliharaan" description="Tampilkan halaman pemeliharaan untuk siswa." checked={general.maintenance} onChange={(v) => setGeneral({ ...general, maintenance: v })} />
              <div className="pt-5"><Button onClick={() => toast.success("Pengaturan umum disimpan (demo)")}>Simpan Perubahan</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SEASON & GAMIFIKASI */}
        <TabsContent value="gamification" className="space-y-6">
          {/* BAGIAN 1: KALENDER & OTOMATISASI RESET */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Jadwal Auto-Reset Season (Otomatis)</CardTitle>
              </div>
              <CardDescription>
                Tentukan tanggal dan jam di kalender kapan sistem akan mereset XP musiman siswa secara otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="season-name">Nama Season</Label>
                  <Input
                    id="season-name"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="Contoh: Season 1 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-datetime" className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-400" /> Tanggal & Jam Reset
                  </Label>
                  <Input
                    id="reset-datetime"
                    type="datetime-local"
                    value={resetDateTime}
                    onChange={(e) => setResetDateTime(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={handleSaveSchedule} disabled={savingSchedule} className="gap-2 font-bold">
                  {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Jadwal Season
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* BAGIAN 2: RESET MANUAL DARURAT */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Reset XP Manual (Darurat)</CardTitle>
              </div>
              <CardDescription>
                Eksekusi reset nilai XP musiman seluruh siswa secara langsung tanpa menunggu jadwal otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-destructive/20 bg-background p-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Reset XP Musiman Sekarang</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mengubah angka <code className="font-mono text-primary">total_xp</code> seluruh siswa menjadi 0 secara instan. Badge dan <code className="font-mono text-primary">all_time_xp</code> siswa tetap tersimpan aman.
                  </p>
                </div>

                <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 shrink-0 font-bold">
                      <RotateCcw className="h-4 w-4" /> Reset XP Instan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <DialogTitle className="text-center font-black text-xl">
                        Konfirmasi Reset XP Season
                      </DialogTitle>
                      <DialogDescription className="text-center text-xs leading-relaxed">
                        Tindakan ini akan **mereset akumulasi XP seluruh siswa menjadi 0** dan memperbarui Papan Peringkat (Leaderboard). Tindakan ini **tidak dapat dibatalkan**.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                      <Label htmlFor="confirm-input" className="text-xs font-semibold">
                        Ketik <span className="font-mono font-bold text-destructive">{CONFIRM_KEYWORD}</span> untuk melanjutkan:
                      </Label>
                      <Input
                        id="confirm-input"
                        placeholder="Ketik RESET-XP di sini"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="font-mono text-center tracking-wider"
                      />
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setResetOpen(false);
                          setConfirmText("");
                        }}
                        disabled={resetting}
                        className="w-full sm:w-auto text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleResetXp}
                        disabled={confirmText !== CONFIRM_KEYWORD || resetting}
                        className="w-full sm:w-auto text-xs font-bold gap-2"
                      >
                        {resetting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                          </>
                        ) : (
                          "Ya, Reset Sekarang"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informasi Platform</CardTitle><CardDescription>Kontak yang tampil di situs publik.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={saveInfo} noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="i-email">Email</Label><Input id="i-email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /><FieldError message={infoErr.email} /></div>
                <div className="space-y-2"><Label htmlFor="i-phone">Telepon</Label><Input id="i-phone" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /><FieldError message={infoErr.phone} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="i-addr">Alamat</Label><Textarea id="i-addr" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></div>
                <div className="sm:col-span-2"><Button type="submit">Simpan</Button></div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status Integrasi</CardTitle><CardDescription>Kesiapan layanan produksi.</CardDescription></CardHeader>
            <CardContent className="max-w-2xl divide-y text-sm">
              {[
                ["Supabase (auth & database)", supabaseReady ? "Terkonfigurasi" : "Belum dikonfigurasi (mode demo)"],
                ["Payment gateway", "Belum terintegrasi"],
                ["Kontrol akses berbasis peran", "Belum aktif"],
                ["Exam engine & penilaian otomatis", "Belum tersedia"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-3"><span className="font-semibold">{k}</span><span className="text-right text-muted-foreground">{v}</span></div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Tampilan</CardTitle><CardDescription>Mode terang atau gelap untuk perangkat ini.</CardDescription></CardHeader>
            <CardContent className="max-w-2xl"><ThemePicker /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notifikasi Admin</CardTitle></CardHeader>
            <CardContent className="max-w-2xl divide-y">
              <SettingRow id="a-user" title="Pengguna baru" description="Beritahu saat ada registrasi baru." checked={notif.newUser} onChange={(v) => setNotif({ ...notif, newUser: v })} />
              <SettingRow id="a-pay" title="Pembayaran" description="Beritahu saat transaksi berhasil atau gagal." checked={notif.payment} onChange={(v) => setNotif({ ...notif, payment: v })} />
              <SettingRow id="a-rep" title="Laporan mingguan" description="Kirim ringkasan analitik tiap minggu." checked={notif.report} onChange={(v) => setNotif({ ...notif, report: v })} />
              <SettingRow id="a-sys" title="Peringatan sistem" description="Beritahu saat ada masalah sistem." checked={notif.system} onChange={(v) => setNotif({ ...notif, system: v })} />
              <div className="pt-5"><Button onClick={() => toast.success("Notifikasi disimpan (demo)")}>Simpan</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
