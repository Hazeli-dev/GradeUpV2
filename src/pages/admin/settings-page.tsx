
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
  Sparkles,
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
import { Input, Textarea } from "@/components/ui/input";
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

interface PlatformContact {
  email: string;
  phone: string;
  address: string;
}

const DEFAULT_CONTACT: PlatformContact = {
  email: CONTACT.email,
  phone: CONTACT.phone,
  address: CONTACT.address,
};

export default function AdminSettingsPage() {
  const [general, setGeneral] = useState({
    name: APP_NAME,
    tagline: "Naik Kelas Lebih Cepat",
    timezone: "Asia/Jakarta",
    maintenance: false,
    registration: true,
  });

  const [info, setInfo] = useState<PlatformContact>(DEFAULT_CONTACT);
  const [infoErr, setInfoErr] = useState<Record<string, string>>({});
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);

  const [notif, setNotif] = useState({
    newUser: true,
    payment: true,
    report: false,
    system: true,
  });

  // Konfigurasi Kalender Auto-Reset Season
  const [seasonName, setSeasonName] = useState("Season 1");
  const [resetDateTime, setResetDateTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Modal Reset Manual XP
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const CONFIRM_KEYWORD = "RESET-XP";

  // Ambil konfigurasi Season dan informasi kontak dari Supabase
  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      try {
        const [seasonResult, contactResult] = await Promise.all([
          supabase
            .from("system_settings")
            .select("value")
            .eq("key", "season_config")
            .maybeSingle(),

          supabase
            .from("system_settings")
            .select("value")
            .eq("key", "platform_contact")
            .maybeSingle(),
        ]);

        if (!active) return;

        if (seasonResult.error) {
          console.error(
            "Gagal mengambil konfigurasi season:",
            seasonResult.error
          );
        } else if (seasonResult.data?.value) {
          const value = seasonResult.data.value as {
            season_name?: string;
            reset_at?: string;
          };

          setSeasonName(value.season_name || "Season 1");

          if (value.reset_at) {
            const date = new Date(value.reset_at);

            if (!Number.isNaN(date.getTime())) {
              const localIso = new Date(
                date.getTime() - date.getTimezoneOffset() * 60000
              )
                .toISOString()
                .slice(0, 16);

              setResetDateTime(localIso);
            }
          }
        }

        if (contactResult.error) {
          console.error(
            "Gagal mengambil informasi platform:",
            contactResult.error
          );
        } else if (contactResult.data?.value) {
          const value = contactResult.data.value as Partial<PlatformContact>;

          setInfo({
            email: value.email ?? CONTACT.email,
            phone: value.phone ?? CONTACT.phone,
            address: value.address ?? CONTACT.address,
          });
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      } finally {
        if (active) setLoadingInfo(false);
      }
    }

    fetchSettings();

    return () => {
      active = false;
    };
  }, []);

  // Simpan Jadwal Auto-Reset Season
  const handleSaveSchedule = async () => {
    if (!resetDateTime) {
      toast.error("Pilih tanggal dan waktu reset terlebih dahulu.");
      return;
    }

    const targetDate = new Date(resetDateTime);

    if (Number.isNaN(targetDate.getTime())) {
      toast.error("Tanggal dan waktu reset tidak valid.");
      return;
    }

    setSavingSchedule(true);

    try {
      const { error } = await supabase.from("system_settings").upsert(
        {
          key: "season_config",
          value: {
            reset_at: targetDate.toISOString(),
            season_name: seasonName.trim() || "Season 1",
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) throw error;

      toast.success("Jadwal auto-reset season berhasil disimpan!");
    } catch (error: any) {
      toast.error("Gagal menyimpan jadwal: " + error.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // Eksekusi Reset Manual XP
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
    } catch (error: any) {
      console.error("Reset XP error:", error);
      toast.error(
        "Gagal mereset XP: " + (error.message || "Terjadi kesalahan")
      );
    } finally {
      setResetting(false);
    }
  };

  // Simpan Informasi Kontak Platform ke Supabase
  const saveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedInfo: PlatformContact = {
      email: info.email.trim(),
      phone: info.phone.trim(),
      address: info.address.trim(),
    };

    const errors: Record<string, string> = {};

    if (!isValidEmail(cleanedInfo.email)) {
      errors.email = "Email tidak valid.";
    }

    if (cleanedInfo.phone.length < 6) {
      errors.phone = "Nomor telepon tidak valid.";
    }

    if (!cleanedInfo.address) {
      errors.address = "Alamat kantor tidak boleh kosong.";
    }

    setInfoErr(errors);

    if (Object.keys(errors).length > 0) return;

    setSavingInfo(true);

    try {
      const { error } = await supabase.from("system_settings").upsert(
        {
          key: "platform_contact",
          value: cleanedInfo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) throw error;

      setInfo(cleanedInfo);
      setInfoErr({});
      toast.success("Informasi platform berhasil disimpan!");
    } catch (error: any) {
      console.error("Gagal menyimpan informasi platform:", error);

      toast.error(
        "Gagal menyimpan informasi platform: " +
          (error.message || "Terjadi kesalahan")
      );
    } finally {
      setSavingInfo(false);
    }
  };

  const supabaseReady = isLoadedSupabase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi umum, informasi platform, tampilan, dan notifikasi."
      />

      <DemoBanner>
        Pengaturan umum dan notifikasi masih berupa demo. Informasi platform
        serta konfigurasi Season sudah terhubung ke database.
      </DemoBanner>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings /> Umum
          </TabsTrigger>
          <TabsTrigger value="gamification">
            <ShieldAlert /> Season & Gamifikasi
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Info /> Informasi Platform
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette /> Tampilan
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell /> Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Umum</CardTitle>
              <CardDescription>
                Identitas dan perilaku dasar platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y">
              <div className="grid gap-4 pb-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="g-name">Nama platform</Label>
                  <Input
                    id="g-name"
                    value={general.name}
                    onChange={(event) =>
                      setGeneral({ ...general, name: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="g-tag">Tagline</Label>
                  <Input
                    id="g-tag"
                    value={general.tagline}
                    onChange={(event) =>
                      setGeneral({ ...general, tagline: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Zona waktu</Label>
                  <Select
                    value={general.timezone}
                    onValueChange={(value) =>
                      setGeneral({ ...general, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Asia/Jakarta",
                        "Asia/Makassar",
                        "Asia/Jayapura",
                      ].map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SettingRow
                id="g-reg"
                title="Izinkan pendaftaran baru"
                description="Pengguna baru dapat membuat akun sendiri."
                checked={general.registration}
                onChange={(value) =>
                  setGeneral({ ...general, registration: value })
                }
              />

              <SettingRow
                id="g-maint"
                title="Mode pemeliharaan"
                description="Tampilkan halaman pemeliharaan untuk siswa."
                checked={general.maintenance}
                onChange={(value) =>
                  setGeneral({ ...general, maintenance: value })
                }
              />

              <div className="pt-5">
                <Button
                  onClick={() =>
                    toast.success("Pengaturan umum disimpan (demo)")
                  }
                >
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SEASON & GAMIFIKASI */}
        <TabsContent value="gamification" className="space-y-6">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">
                  Jadwal Auto-Reset Season (Otomatis)
                </CardTitle>
              </div>
              <CardDescription>
                Tentukan tanggal dan jam di kalender kapan sistem akan
                mereset XP musiman siswa secara otomatis.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="season-name">Nama Season</Label>
                  <Input
                    id="season-name"
                    value={seasonName}
                    onChange={(event) => setSeasonName(event.target.value)}
                    placeholder="Contoh: Season 1 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reset-datetime"
                    className="flex items-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    Tanggal & Jam Reset
                  </Label>
                  <Input
                    id="reset-datetime"
                    type="datetime-local"
                    value={resetDateTime}
                    onChange={(event) =>
                      setResetDateTime(event.target.value)
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                  className="gap-2 font-bold"
                >
                  {savingSchedule ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Jadwal Season
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">
                  Reset XP Manual (Darurat)
                </CardTitle>
              </div>
              <CardDescription>
                Eksekusi reset nilai XP musiman seluruh siswa secara langsung
                tanpa menunggu jadwal otomatis.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Reset XP Musiman Sekarang
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Mengubah angka{" "}
                    <code className="font-mono text-primary">total_xp</code>{" "}
                    seluruh siswa menjadi 0 secara instan. Badge dan{" "}
                    <code className="font-mono text-primary">
                      all_time_xp
                    </code>{" "}
                    siswa tetap tersimpan aman.
                  </p>
                </div>

                <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="shrink-0 gap-2 font-bold"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset XP Instan
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <div className="mb-2 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <DialogTitle className="text-center text-xl font-black">
                        Konfirmasi Reset XP Season
                      </DialogTitle>
                      <DialogDescription className="text-center text-xs leading-relaxed">
                        Tindakan ini akan mereset akumulasi XP seluruh siswa
                        menjadi 0 dan memperbarui Papan Peringkat
                        (Leaderboard). Tindakan ini tidak dapat dibatalkan.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                      <Label
                        htmlFor="confirm-input"
                        className="text-xs font-semibold"
                      >
                        Ketik{" "}
                        <span className="font-mono font-bold text-destructive">
                          {CONFIRM_KEYWORD}
                        </span>{" "}
                        untuk melanjutkan:
                      </Label>
                      <Input
                        id="confirm-input"
                        placeholder="Ketik RESET-XP di sini"
                        value={confirmText}
                        onChange={(event) =>
                          setConfirmText(event.target.value)
                        }
                        className="text-center font-mono tracking-wider"
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
                        className="w-full text-xs sm:w-auto"
                      >
                        Batal
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={handleResetXp}
                        disabled={
                          confirmText !== CONFIRM_KEYWORD || resetting
                        }
                        className="w-full gap-2 text-xs font-bold sm:w-auto"
                      >
                        {resetting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
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

        {/* TAB: INFORMASI PLATFORM */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Platform</CardTitle>
              <CardDescription>
                Kontak yang tampil di footer situs publik. Perubahan akan
                disimpan ke database dan ditampilkan pada situs.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loadingInfo ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat informasi platform...
                </div>
              ) : (
                <form
                  onSubmit={saveInfo}
                  noValidate
                  className="grid max-w-2xl gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="i-email">Email</Label>
                    <Input
                      id="i-email"
                      type="email"
                      value={info.email}
                      onChange={(event) => {
                        setInfo({ ...info, email: event.target.value });
                        setInfoErr((previous) => ({
                          ...previous,
                          email: "",
                        }));
                      }}
                      placeholder="contoh@gradeup.id"
                      aria-invalid={!!infoErr.email}
                    />
                    <FieldError message={infoErr.email} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="i-phone">Telepon</Label>
                    <Input
                      id="i-phone"
                      type="tel"
                      value={info.phone}
                      onChange={(event) => {
                        setInfo({ ...info, phone: event.target.value });
                        setInfoErr((previous) => ({
                          ...previous,
                          phone: "",
                        }));
                      }}
                      placeholder="+62..."
                      aria-invalid={!!infoErr.phone}
                    />
                    <FieldError message={infoErr.phone} />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="i-addr">Alamat Kantor</Label>
                    <Textarea
                      id="i-addr"
                      value={info.address}
                      onChange={(event) => {
                        setInfo({ ...info, address: event.target.value });
                        setInfoErr((previous) => ({
                          ...previous,
                          address: "",
                        }));
                      }}
                      placeholder="Masukkan alamat kantor..."
                      aria-invalid={!!infoErr.address}
                    />
                    <FieldError message={infoErr.address} />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={savingInfo || loadingInfo}
                      className="gap-2"
                    >
                      {savingInfo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Simpan Informasi
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Integrasi</CardTitle>
              <CardDescription>
                Kesiapan layanan produksi.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y text-sm">
              {[
                [
                  "Supabase (auth & database)",
                  supabaseReady
                    ? "Terkonfigurasi"
                    : "Belum dikonfigurasi (mode demo)",
                ],
                ["Payment gateway", "Belum terintegrasi"],
                ["Kontrol akses berbasis peran", "Belum aktif"],
                ["Exam engine & penilaian otomatis", "Belum tersedia"],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="font-semibold">{key}</span>
                  <span className="text-right text-muted-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan</CardTitle>
              <CardDescription>
                Mode terang atau gelap untuk perangkat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl">
              <ThemePicker />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifikasi Admin</CardTitle>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y">
              <SettingRow
                id="a-user"
                title="Pengguna baru"
                description="Beritahu saat ada registrasi baru."
                checked={notif.newUser}
                onChange={(value) =>
                  setNotif({ ...notif, newUser: value })
                }
              />

              <SettingRow
                id="a-pay"
                title="Pembayaran"
                description="Beritahu saat transaksi berhasil atau gagal."
                checked={notif.payment}
                onChange={(value) =>
                  setNotif({ ...notif, payment: value })
                }
              />

              <SettingRow
                id="a-rep"
                title="Laporan mingguan"
                description="Kirim ringkasan analitik tiap minggu."
                checked={notif.report}
                onChange={(value) =>
                  setNotif({ ...notif, report: value })
                }
              />

              <SettingRow
                id="a-sys"
                title="Peringatan sistem"
                description="Beritahu saat ada masalah sistem."
                checked={notif.system}
                onChange={(value) =>
                  setNotif({ ...notif, system: value })
                }
              />

              <div className="pt-5">
                <Button
                  onClick={() =>
                    toast.success("Notifikasi disimpan (demo)")
                  }
                >
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
