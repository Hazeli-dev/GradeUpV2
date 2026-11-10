
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
  History,
  Users,
  Trash2,
  Clock,
  CheckCircle2,
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

interface SeasonConfig {
  enabled?: boolean;
  season_name?: string;
  reset_at?: string;
  [key: string]: unknown;
}

interface SeasonResetLog {
  id: string;
  previous_season: string;
  new_season: string;
  reset_source: string;
  affected_students: number;
  deleted_activities: number;
  reset_at: string;
}

interface SeasonResetResult {
  success: boolean;
  previous_season: string;
  new_season: string;
  affected_students: number;
  deleted_activities: number;
  next_reset_at: string;
  reset_source: string;
}

const DEFAULT_CONTACT: PlatformContact = {
  email: CONTACT.email,
  phone: CONTACT.phone,
  address: CONTACT.address,
};

const CONFIRM_KEYWORD = "RESET-XP";

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }) + " WIB";
}

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

  // Konfigurasi Season
  const [seasonName, setSeasonName] = useState("Season 1");
  const [resetDateTime, setResetDateTime] = useState("");
  const [autoResetEnabled, setAutoResetEnabled] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Riwayat Season
  const [seasonLogs, setSeasonLogs] = useState<SeasonResetLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Hasil reset terakhir
  const [resetResult, setResetResult] =
    useState<SeasonResetResult | null>(null);

  // Modal reset manual
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const supabaseReady = isLoadedSupabase();

  // Memuat konfigurasi Season dan informasi platform
  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      try {
        const [seasonResult, contactResult, logsResult] =
          await Promise.all([
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

            supabase.rpc("admin_get_season_reset_logs"),
          ]);

        if (!active) return;

        // Konfigurasi Season
        if (seasonResult.error) {
          console.error(
            "Gagal mengambil konfigurasi Season:",
            seasonResult.error
          );
        } else if (seasonResult.data?.value) {
          const value = seasonResult.data.value as SeasonConfig;

          setSeasonName(value.season_name || "Season 1");
          setAutoResetEnabled(value.enabled !== false);

          if (value.reset_at) {
            const date = new Date(value.reset_at);

            if (!Number.isNaN(date.getTime())) {
              const localIso = new Date(
                date.getTime() -
                  date.getTimezoneOffset() * 60000
              )
                .toISOString()
                .slice(0, 16);

              setResetDateTime(localIso);
            }
          }
        }

        // Informasi platform
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

        // Riwayat reset
        if (logsResult.error) {
          console.error(
            "Gagal mengambil riwayat Season:",
            logsResult.error
          );
        } else {
          setSeasonLogs(
            (logsResult.data || []) as SeasonResetLog[]
          );
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      } finally {
        if (active) {
          setLoadingInfo(false);
          setLoadingSeason(false);
          setLoadingLogs(false);
        }
      }
    }

    fetchSettings();

    return () => {
      active = false;
    };
  }, []);

  // Simpan jadwal dan status auto-reset
  const handleSaveSchedule = async () => {
    if (!seasonName.trim()) {
      toast.error("Nama Season tidak boleh kosong.");
      return;
    }

    if (!resetDateTime) {
      toast.error("Pilih tanggal dan waktu reset terlebih dahulu.");
      return;
    }

    const targetDate = new Date(resetDateTime);

    if (Number.isNaN(targetDate.getTime())) {
      toast.error("Tanggal dan waktu reset tidak valid.");
      return;
    }

    if (targetDate.getTime() <= Date.now()) {
      toast.error("Jadwal reset harus berada di masa mendatang.");
      return;
    }

    setSavingSchedule(true);

    try {
      // Ambil konfigurasi lama agar properti lain tidak hilang
      const { data: currentData, error: readError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "season_config")
        .maybeSingle();

      if (readError) throw readError;

      const currentConfig =
        (currentData?.value as SeasonConfig | null) || {};

      const newConfig: SeasonConfig = {
        ...currentConfig,
        enabled: autoResetEnabled,
        season_name: seasonName.trim(),
        reset_at: targetDate.toISOString(),
      };

      const { error } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "season_config",
            value: newConfig,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;

      toast.success(
        autoResetEnabled
          ? "Konfigurasi Season dan jadwal otomatis berhasil disimpan."
          : "Konfigurasi Season tersimpan. Reset otomatis dinonaktifkan."
      );
    } catch (error: any) {
      console.error("Gagal menyimpan jadwal Season:", error);

      toast.error(
        "Gagal menyimpan jadwal: " +
          (error.message || "Terjadi kesalahan")
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  // Memuat ulang riwayat Season
  const refreshSeasonLogs = async () => {
    setLoadingLogs(true);

    try {
      const { data, error } = await supabase.rpc(
        "admin_get_season_reset_logs"
      );

      if (error) throw error;

      setSeasonLogs((data || []) as SeasonResetLog[]);
    } catch (error: any) {
      console.error("Gagal memperbarui riwayat:", error);
      toast.error("Gagal memuat riwayat Season.");
    } finally {
      setLoadingLogs(false);
    }
  };

  // Reset XP manual
  const handleResetXp = async () => {
    if (confirmText !== CONFIRM_KEYWORD) {
      toast.error(`Ketik "${CONFIRM_KEYWORD}" untuk mengonfirmasi.`);
      return;
    }

    setResetting(true);

    try {
      const { data, error } = await supabase.rpc(
        "admin_reset_season_xp"
      );

      if (error) throw error;

      const result = data as SeasonResetResult;

      if (!result?.success) {
        throw new Error("Server tidak mengembalikan hasil reset yang valid.");
      }

      setResetResult(result);

      setSeasonName(result.new_season);

      if (result.next_reset_at) {
        const nextDate = new Date(result.next_reset_at);

        if (!Number.isNaN(nextDate.getTime())) {
          const localIso = new Date(
            nextDate.getTime() -
              nextDate.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);

          setResetDateTime(localIso);
        }
      }

      toast.success("Reset Season berhasil dijalankan.");

      setResetOpen(false);
      setConfirmText("");

      // Perbarui konfigurasi dan riwayat setelah reset
            // Perbarui riwayat dan konfigurasi setelah reset berhasil.
      // Kegagalan refresh tidak boleh dianggap sebagai kegagalan reset.
      await refreshSeasonLogs();

      const { data: configData, error: configError } =
        await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "season_config")
          .maybeSingle();

      if (configError) {
        console.error(
          "Reset berhasil, tetapi konfigurasi gagal dimuat ulang:",
          configError
        );

        toast.warning(
          "Reset berhasil, tetapi konfigurasi perlu dimuat ulang."
        );
      } else if (configData?.value) {
        const config = configData.value as SeasonConfig;

        setSeasonName(config.season_name || result.new_season);
        setAutoResetEnabled(config.enabled !== false);
      }
    } catch (error: any) {
      console.error("Reset Season error:", error);

      toast.error(
        "Gagal mereset Season: " +
          (error.message || "Terjadi kesalahan")
      );
    } finally {
      setResetting(false);
    }
  };

  // Simpan informasi kontak platform
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
      const { error } = await supabase
        .from("system_settings")
        .upsert(
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi umum, Season, informasi platform, dan tampilan."
      />

      <DemoBanner>
        Pengaturan umum dan notifikasi masih berupa demo.
        Informasi platform dan konfigurasi Season sudah terhubung
        ke database.
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

        {/* TAB UMUM */}
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
                      setGeneral({
                        ...general,
                        name: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="g-tag">Tagline</Label>
                  <Input
                    id="g-tag"
                    value={general.tagline}
                    onChange={(event) =>
                      setGeneral({
                        ...general,
                        tagline: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Zona waktu</Label>

                  <Select
                    value={general.timezone}
                    onValueChange={(value) =>
                      setGeneral({
                        ...general,
                        timezone: value,
                      })
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
                  setGeneral({
                    ...general,
                    registration: value,
                  })
                }
              />

              <SettingRow
                id="g-maint"
                title="Mode pemeliharaan"
                description="Tampilkan halaman pemeliharaan untuk siswa."
                checked={general.maintenance}
                onChange={(value) =>
                  setGeneral({
                    ...general,
                    maintenance: value,
                  })
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

        {/* TAB SEASON & GAMIFIKASI */}
        <TabsContent value="gamification" className="space-y-6">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="h-5 w-5" />

                <CardTitle className="text-lg font-bold">
                  Pengaturan Season
                </CardTitle>
              </div>

              <CardDescription>
                Kelola nama Season, jadwal reset enam bulanan,
                dan status reset otomatis.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {loadingSeason ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat konfigurasi Season...
                </div>
              ) : (
                <>
                  <SettingRow
                    id="season-auto-reset"
                    title="Aktifkan reset otomatis"
                    description="Sistem akan menjalankan reset Season ketika jadwal tiba."
                    checked={autoResetEnabled}
                    onChange={setAutoResetEnabled}
                  />

                  <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="season-name">
                        Nama Season
                      </Label>

                      <Input
                        id="season-name"
                        value={seasonName}
                        onChange={(event) =>
                          setSeasonName(event.target.value)
                        }
                        placeholder="Contoh: Season 1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="reset-datetime"
                        className="flex items-center gap-1.5"
                      >
                        <Calendar className="h-4 w-4 text-emerald-500" />
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

                      <p className="text-xs text-muted-foreground">
                        Menggunakan zona waktu perangkat admin.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />

                      <span className="text-muted-foreground">
                        Reset berikutnya:
                      </span>

                      <strong>
                        {formatDateTime(
                          resetDateTime
                            ? new Date(resetDateTime).toISOString()
                            : undefined
                        )}
                      </strong>
                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        autoResetEnabled
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {autoResetEnabled
                        ? "Reset otomatis aktif"
                        : "Reset otomatis nonaktif"}
                    </span>
                  </div>

                  <div className="flex justify-end">
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

                      Simpan Konfigurasi Season
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* RESET MANUAL */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />

                <CardTitle className="text-lg font-bold">
                  Reset Season Manual
                </CardTitle>
              </div>

              <CardDescription>
                Admin dapat memulai Season baru kapan saja,
                tanpa menunggu jadwal otomatis.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Mulai Season Baru
                  </h4>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    XP Season siswa menjadi 0 dan level kembali ke 1.
                    XP sepanjang masa, badge, pencapaian, dan riwayat
                    ujian tetap dipertahankan.
                  </p>

                  <p className="mt-2 text-xs font-semibold text-destructive">
                    Aktivitas belajar yang lebih lama dari 6 bulan
                    juga akan dihapus.
                  </p>
                </div>

                <Dialog
                  open={resetOpen}
                  onOpenChange={(open) => {
                    if (!resetting) {
                      setResetOpen(open);

                      if (!open) setConfirmText("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="shrink-0 gap-2 font-bold"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Season Sekarang
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                      </div>

                      <DialogTitle className="text-center text-xl font-black">
                        Konfirmasi Reset Season
                      </DialogTitle>

                      <DialogDescription className="text-center text-sm leading-relaxed">
                        Kamu akan mengakhiri{" "}
                        <strong>{seasonName}</strong> dan memulai
                        Season berikutnya.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                      <p className="flex items-start gap-2">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        XP Season seluruh siswa direset menjadi 0
                        dan level menjadi 1.
                      </p>

                      <p className="flex items-start gap-2">
                        <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        Aktivitas belajar yang lebih lama dari
                        6 bulan akan dihapus.
                      </p>

                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        All-time XP, badge, pencapaian,
                        riwayat ujian, dan transaksi tetap dipertahankan.
                      </p>
                    </div>

                    <div className="space-y-3 py-2">
                      <Label
                        htmlFor="confirm-input"
                        className="text-xs font-semibold"
                      >
                        Ketik{" "}
                        <span className="font-mono font-bold text-destructive">
                          {CONFIRM_KEYWORD}
                        </span>{" "}
                        untuk mengonfirmasi:
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
                        className="w-full sm:w-auto"
                      >
                        Batal
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={handleResetXp}
                        disabled={
                          confirmText !== CONFIRM_KEYWORD ||
                          resetting
                        }
                        className="w-full gap-2 font-bold sm:w-auto"
                      >
                        {resetting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          "Ya, Mulai Season Baru"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* HASIL RESET TERAKHIR */}
          {resetResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />

                  <CardTitle>Hasil Reset Terakhir</CardTitle>
                </div>

                <CardDescription>
                  Reset berhasil diselesaikan.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Season sebelumnya
                  </p>

                  <p className="mt-1 font-bold">
                    {resetResult.previous_season}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Season baru
                  </p>

                  <p className="mt-1 font-bold text-emerald-600">
                    {resetResult.new_season}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Siswa terdampak
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {resetResult.affected_students}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                    Aktivitas dihapus
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {resetResult.deleted_activities}
                  </p>
                </div>

                <div className="rounded-lg border p-3 sm:col-span-2 lg:col-span-4">
                  <p className="text-xs text-muted-foreground">
                    Jadwal reset berikutnya
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDateTime(resetResult.next_reset_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RIWAYAT SEASON */}
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />

                    <CardTitle>Riwayat Reset Season</CardTitle>
                  </div>

                  <CardDescription>
                    Maksimal 10 riwayat reset terbaru.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshSeasonLogs}
                  disabled={loadingLogs}
                  className="gap-2"
                >
                  {loadingLogs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}

                  Muat Ulang
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat riwayat Season...
                </div>
              ) : seasonLogs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />

                  <p className="font-semibold">
                    Belum ada riwayat reset
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Riwayat akan muncul setelah reset Season pertama berhasil.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {seasonLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold">
                            {log.previous_season}{" "}
                            <span className="text-muted-foreground">
                              →
                            </span>{" "}
                            {log.new_season}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(log.reset_at)}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                          {log.reset_source === "manual"
                            ? "Manual"
                            : "Otomatis"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Siswa terdampak
                          </p>

                          <p className="font-bold">
                            {log.affected_students}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Aktivitas dihapus
                          </p>

                          <p className="font-bold">
                            {log.deleted_activities}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB INFORMASI PLATFORM */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Platform</CardTitle>

              <CardDescription>
                Kontak yang tampil di footer situs publik.
                Perubahan akan disimpan ke database.
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
                        setInfo({
                          ...info,
                          email: event.target.value,
                        });

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
                        setInfo({
                          ...info,
                          phone: event.target.value,
                        });

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
                        setInfo({
                          ...info,
                          address: event.target.value,
                        });

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
                Kesiapan layanan platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y text-sm">
              {[
                [
                  "Supabase (auth & database)",
                  supabaseReady
                    ? "Terkonfigurasi"
                    : "Belum dikonfigurasi",
                ],
                ["Payment gateway", "Perlu verifikasi"],
                ["Kontrol akses berbasis peran", "Perlu verifikasi"],
                ["Exam engine & penilaian otomatis", "Perlu verifikasi"],
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

        {/* TAB TAMPILAN */}
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

        {/* TAB NOTIFIKASI */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifikasi Admin</CardTitle>

              <CardDescription>
                Pengaturan notifikasi ini masih berupa demo.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y">
              <SettingRow
                id="a-user"
                title="Pengguna baru"
                description="Beritahu saat ada registrasi baru."
                checked={notif.newUser}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    newUser: value,
                  })
                }
              />

              <SettingRow
                id="a-pay"
                title="Pembayaran"
                description="Beritahu saat transaksi berhasil atau gagal."
                checked={notif.payment}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    payment: value,
                  })
                }
              />

              <SettingRow
                id="a-rep"
                title="Laporan mingguan"
                description="Kirim ringkasan analitik tiap minggu."
                checked={notif.report}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    report: value,
                  })
                }
              />

              <SettingRow
                id="a-sys"
                title="Peringatan sistem"
                description="Beritahu saat ada masalah sistem."
                checked={notif.system}
                onChange={(value) =>
                  setNotif({
                    ...notif,
                    system: value,
                  })
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
