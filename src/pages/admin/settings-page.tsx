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
  name: string;
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
  name: "Tim GradeUp",
  email: CONTACT.email,
  phone: CONTACT.phone,
  address: CONTACT.address,
};

const CONFIRM_KEYWORD = "RESET-XP";

// =====================================================
// TAMPILAN (murni visual, tidak memengaruhi logika)
// =====================================================

const cardGlass =
  "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_12px_36px_-24px_rgba(15,118,110,0.35)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80";

const headingText = "text-slate-950 dark:text-white";

const mutedSoft = "text-slate-500 dark:text-slate-400";

const outlineBtn =
  "rounded-xl border-slate-300 text-slate-700 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800";

const primaryBtn =
  "rounded-xl bg-teal-700 font-bold text-white shadow-md shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400";

const inputField =
  "rounded-xl border-slate-300 bg-white/80 focus-visible:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900/80";

const tabTrigger =
  "gap-2 rounded-xl text-slate-600 transition-all duration-300 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-md dark:text-slate-300 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-slate-950";

const subTile =
  "rounded-2xl border border-emerald-100/70 bg-emerald-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/30";

/** Garis aksen tipis di tepi atas kartu. */
function CardAccent({ via = "via-emerald-400/70" }: { via?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-6 top-0 z-10 h-px bg-gradient-to-r from-transparent ${via} to-transparent`}
    />
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return (
    date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

function toLocalDateTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
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

  // Memuat konfigurasi Season, informasi kontak, dan riwayat.
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
            seasonResult.error,
          );
        } else if (seasonResult.data?.value) {
          const value = seasonResult.data.value as SeasonConfig;

          setSeasonName(value.season_name || "Season 1");
          setAutoResetEnabled(value.enabled !== false);
          setResetDateTime(toLocalDateTime(value.reset_at));
        }

        // Informasi kontak platform
        if (contactResult.error) {
          console.error(
            "Gagal mengambil informasi platform:",
            contactResult.error,
          );
        } else if (contactResult.data?.value) {
          const value =
            contactResult.data.value as Partial<PlatformContact>;

          setInfo({
            name: value.name?.trim() || DEFAULT_CONTACT.name,
            email: value.email?.trim() || DEFAULT_CONTACT.email,
            phone: value.phone?.trim() || DEFAULT_CONTACT.phone,
            address:
              value.address?.trim() || DEFAULT_CONTACT.address,
          });
        }

        // Riwayat Season
        if (logsResult.error) {
          console.error(
            "Gagal mengambil riwayat Season:",
            logsResult.error,
          );
        } else {
          setSeasonLogs((logsResult.data || []) as SeasonResetLog[]);
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
          { onConflict: "key" },
        );

      if (error) throw error;

      toast.success(
        autoResetEnabled
          ? "Konfigurasi Season dan jadwal otomatis berhasil disimpan."
          : "Konfigurasi Season tersimpan. Reset otomatis dinonaktifkan.",
      );
    } catch (error: any) {
      console.error("Gagal menyimpan jadwal Season:", error);

      toast.error(
        "Gagal menyimpan jadwal: " +
          (error.message || "Terjadi kesalahan"),
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
        "admin_get_season_reset_logs",
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
        "admin_reset_season_xp",
      );

      if (error) throw error;

      const result = data as SeasonResetResult;

      if (!result?.success) {
        throw new Error(
          "Server tidak mengembalikan hasil reset yang valid.",
        );
      }

      setResetResult(result);
      setSeasonName(result.new_season);

      if (result.next_reset_at) {
        setResetDateTime(toLocalDateTime(result.next_reset_at));
      }

      toast.success("Reset Season berhasil dijalankan.");

      setResetOpen(false);
      setConfirmText("");

      // Refresh riwayat.
      await refreshSeasonLogs();

      // Muat ulang konfigurasi tanpa membatalkan hasil reset.
      const { data: configData, error: configError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "season_config")
        .maybeSingle();

      if (configError) {
        console.error(
          "Reset berhasil, tetapi konfigurasi gagal dimuat ulang:",
          configError,
        );

        toast.warning(
          "Reset berhasil, tetapi konfigurasi perlu dimuat ulang.",
        );
      } else if (configData?.value) {
        const config = configData.value as SeasonConfig;

        setSeasonName(config.season_name || result.new_season);
        setAutoResetEnabled(config.enabled !== false);
        setResetDateTime(toLocalDateTime(config.reset_at));
      }
    } catch (error: any) {
      console.error("Reset Season error:", error);

      toast.error(
        "Gagal mereset Season: " +
          (error.message || "Terjadi kesalahan"),
      );
    } finally {
      setResetting(false);
    }
  };

  // Simpan informasi kontak platform.
  const saveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedInfo: PlatformContact = {
      name: info.name.trim(),
      email: info.email.trim(),
      phone: info.phone.trim(),
      address: info.address.trim(),
    };

    const errors: Record<string, string> = {};

    if (!cleanedInfo.name) {
      errors.name = "Nama kontak wajib diisi.";
    } else if (cleanedInfo.name.length > 100) {
      errors.name = "Nama kontak maksimal 100 karakter.";
    }

    if (!isValidEmail(cleanedInfo.email)) {
      errors.email = "Email tidak valid.";
    } else if (cleanedInfo.email.length > 254) {
      errors.email = "Email terlalu panjang.";
    }

    if (cleanedInfo.phone.length < 6) {
      errors.phone = "Nomor telepon tidak valid.";
    } else if (cleanedInfo.phone.length > 30) {
      errors.phone = "Nomor telepon maksimal 30 karakter.";
    }

    if (!cleanedInfo.address) {
      errors.address = "Alamat kantor tidak boleh kosong.";
    } else if (cleanedInfo.address.length > 500) {
      errors.address = "Alamat maksimal 500 karakter.";
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
          { onConflict: "key" },
        );

      if (error) throw error;

      setInfo(cleanedInfo);
      setInfoErr({});

      toast.success("Informasi kontak berhasil disimpan!", {
        description:
          "Nama, email, telepon, dan alamat telah diperbarui.",
      });
    } catch (error: any) {
      console.error("Gagal menyimpan informasi platform:", error);

      toast.error(
        "Gagal menyimpan informasi platform: " +
          (error.message || "Terjadi kesalahan"),
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
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-2xl border border-slate-200/80 bg-white/70 p-1.5 shadow-[0_10px_30px_-20px_rgba(15,118,110,0.3)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <TabsTrigger value="general" className={tabTrigger}>
            <Settings /> Umum
          </TabsTrigger>

          <TabsTrigger value="gamification" className={tabTrigger}>
            <ShieldAlert /> Season & Gamifikasi
          </TabsTrigger>

          <TabsTrigger value="platform" className={tabTrigger}>
            <Info /> Informasi Platform
          </TabsTrigger>

          <TabsTrigger value="appearance" className={tabTrigger}>
            <Palette /> Tampilan
          </TabsTrigger>

          <TabsTrigger value="notifications" className={tabTrigger}>
            <Bell /> Notifikasi
          </TabsTrigger>
        </TabsList>

        {/* TAB UMUM */}
        <TabsContent value="general">
          <Card className={cardGlass}>
            <CardAccent via="via-teal-400/70" />

            <CardHeader>
              <CardTitle className={headingText}>
                Pengaturan Umum
              </CardTitle>
              <CardDescription>
                Identitas dan perilaku dasar platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y divide-slate-200/70 dark:divide-slate-800">
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
                    className={inputField}
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
                    className={inputField}
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
                    <SelectTrigger className="rounded-xl border-slate-300 focus:ring-teal-500/30 dark:border-slate-700">
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
                  className={primaryBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SEASON & GAMIFIKASI */}
        <TabsContent value="gamification" className="space-y-6">
          <Card className="relative overflow-hidden rounded-3xl border border-emerald-300/50 bg-gradient-to-br from-emerald-100/70 via-white/80 to-white/80 shadow-[0_14px_40px_-26px_rgba(15,118,110,0.4)] backdrop-blur-sm dark:border-emerald-800/50 dark:from-emerald-950/50 dark:via-slate-900/80 dark:to-slate-900/80">
            <CardAccent via="via-emerald-400/70" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10"
            />

            <CardHeader className="relative">
              <div className="flex items-center gap-2 text-teal-700 dark:text-emerald-400">
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

            <CardContent className="relative space-y-5">
              {loadingSeason ? (
                <div
                  className={`flex items-center gap-2 py-4 text-sm ${mutedSoft}`}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-emerald-400" />
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

                  <div className="grid gap-4 border-t border-emerald-200/60 pt-5 dark:border-emerald-900/50 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="season-name">Nama Season</Label>

                      <Input
                        id="season-name"
                        value={seasonName}
                        onChange={(event) =>
                          setSeasonName(event.target.value)
                        }
                        placeholder="Contoh: Season 1"
                        className={inputField}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="reset-datetime"
                        className="flex items-center gap-1.5"
                      >
                        <Calendar className="h-4 w-4 text-teal-600 dark:text-emerald-400" />
                        Tanggal & Jam Reset
                      </Label>

                      <Input
                        id="reset-datetime"
                        type="datetime-local"
                        value={resetDateTime}
                        onChange={(event) =>
                          setResetDateTime(event.target.value)
                        }
                        className={`font-mono ${inputField}`}
                      />

                      <p className={`text-xs ${mutedSoft}`}>
                        Menggunakan zona waktu perangkat admin.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/70 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock
                        className={`h-4 w-4 ${mutedSoft}`}
                      />
                      <span className={mutedSoft}>
                        Reset berikutnya:
                      </span>
                      <strong className={headingText}>
                        {formatDateTime(
                          resetDateTime
                            ? new Date(resetDateTime).toISOString()
                            : undefined,
                        )}
                      </strong>
                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        autoResetEnabled
                          ? "text-emerald-600 dark:text-emerald-400"
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
                      className={`gap-2 ${primaryBtn}`}
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
          <Card className="relative overflow-hidden rounded-3xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-white/80 to-white/80 shadow-[0_14px_40px_-26px_rgba(220,38,38,0.3)] backdrop-blur-sm dark:from-destructive/15 dark:via-slate-900/80 dark:to-slate-900/80">
            <CardAccent via="via-rose-400/60" />

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
              <div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-white/80 p-4 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4
                    className={`text-sm font-bold ${headingText}`}
                  >
                    Mulai Season Baru
                  </h4>

                  <p
                    className={`mt-1 text-xs leading-relaxed ${mutedSoft}`}
                  >
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
                      className="shrink-0 gap-2 rounded-xl font-bold"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Season Sekarang
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="rounded-3xl border-destructive/20 sm:max-w-md">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent"
                    />

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

                    <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm">
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
                        className={`text-center font-mono tracking-wider ${inputField}`}
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
                        className={`w-full sm:w-auto ${outlineBtn}`}
                      >
                        Batal
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={handleResetXp}
                        disabled={
                          confirmText !== CONFIRM_KEYWORD || resetting
                        }
                        className="w-full gap-2 rounded-xl font-bold sm:w-auto"
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
            <Card className={cardGlass}>
              <CardAccent via="via-emerald-400/70" />

              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <CardTitle className={headingText}>
                    Hasil Reset Terakhir
                  </CardTitle>
                </div>

                <CardDescription>
                  Reset berhasil diselesaikan.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={subTile}>
                  <p className={`text-xs ${mutedSoft}`}>
                    Season sebelumnya
                  </p>
                  <p className={`mt-1 font-bold ${headingText}`}>
                    {resetResult.previous_season}
                  </p>
                </div>

                <div className={subTile}>
                  <p className={`text-xs ${mutedSoft}`}>
                    Season baru
                  </p>
                  <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                    {resetResult.new_season}
                  </p>
                </div>

                <div className={subTile}>
                  <p
                    className={`flex items-center gap-1 text-xs ${mutedSoft}`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Siswa terdampak
                  </p>
                  <p
                    className={`mt-1 text-xl font-extrabold ${headingText}`}
                  >
                    {resetResult.affected_students}
                  </p>
                </div>

                <div className={subTile}>
                  <p
                    className={`flex items-center gap-1 text-xs ${mutedSoft}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Aktivitas dihapus
                  </p>
                  <p
                    className={`mt-1 text-xl font-extrabold ${headingText}`}
                  >
                    {resetResult.deleted_activities}
                  </p>
                </div>

                <div className={`${subTile} sm:col-span-2 lg:col-span-4`}>
                  <p className={`text-xs ${mutedSoft}`}>
                    Jadwal reset berikutnya
                  </p>
                  <p className={`mt-1 font-semibold ${headingText}`}>
                    {formatDateTime(resetResult.next_reset_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RIWAYAT SEASON */}
          <Card className={cardGlass}>
            <CardAccent via="via-teal-400/70" />

            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-teal-600 dark:text-emerald-400" />
                    <CardTitle className={headingText}>
                      Riwayat Reset Season
                    </CardTitle>
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
                  className={`gap-2 ${outlineBtn}`}
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
                <div
                  className={`flex items-center gap-2 py-6 text-sm ${mutedSoft}`}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-emerald-400" />
                  Memuat riwayat Season...
                </div>
              ) : seasonLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-300/70 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                  <History className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
                  <p className={`font-semibold ${headingText}`}>
                    Belum ada riwayat reset
                  </p>
                  <p className={`mt-1 text-xs ${mutedSoft}`}>
                    Riwayat akan muncul setelah reset Season pertama berhasil.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {seasonLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 transition-colors duration-300 hover:border-emerald-300/80 hover:bg-emerald-50/70 dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:border-emerald-700/70 dark:hover:bg-emerald-950/40"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p
                            className={`font-semibold ${headingText}`}
                          >
                            {log.previous_season}{" "}
                            <span className="text-muted-foreground">→</span>{" "}
                            {log.new_season}
                          </p>
                          <p className={`mt-1 text-xs ${mutedSoft}`}>
                            {formatDateTime(log.reset_at)}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/60 dark:text-teal-200">
                          {log.reset_source === "manual"
                            ? "Manual"
                            : "Otomatis"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-800">
                        <div>
                          <p className={`text-xs ${mutedSoft}`}>
                            Siswa terdampak
                          </p>
                          <p className={`font-bold ${headingText}`}>
                            {log.affected_students}
                          </p>
                        </div>

                        <div>
                          <p className={`text-xs ${mutedSoft}`}>
                            Aktivitas dihapus
                          </p>
                          <p className={`font-bold ${headingText}`}>
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
          <Card className={cardGlass}>
            <CardAccent via="via-teal-400/70" />

            <CardHeader>
              <CardTitle className={headingText}>
                Informasi Platform
              </CardTitle>

              <CardDescription>
                Kelola nama kontak, email, telepon, dan alamat yang
                ditampilkan di halaman kontak publik GradeUp.
                Perubahan akan disimpan ke Supabase.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loadingInfo ? (
                <div
                  className={`flex items-center gap-2 py-6 text-sm ${mutedSoft}`}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-emerald-400" />
                  Memuat informasi platform...
                </div>
              ) : (
                <form
                  onSubmit={saveInfo}
                  noValidate
                  className="grid max-w-2xl gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="i-name">Nama Kontak</Label>

                    <Input
                      id="i-name"
                      value={info.name}
                      onChange={(event) => {
                        setInfo({
                          ...info,
                          name: event.target.value,
                        });

                        setInfoErr((previous) => ({
                          ...previous,
                          name: "",
                        }));
                      }}
                      placeholder="Contoh: Tim GradeUp"
                      maxLength={100}
                      aria-invalid={!!infoErr.name}
                      className={inputField}
                    />

                    <FieldError message={infoErr.name} />
                  </div>

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
                      maxLength={254}
                      aria-invalid={!!infoErr.email}
                      className={inputField}
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
                      maxLength={30}
                      aria-invalid={!!infoErr.phone}
                      className={inputField}
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
                      maxLength={500}
                      aria-invalid={!!infoErr.address}
                      className={inputField}
                    />

                    <FieldError message={infoErr.address} />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={savingInfo || loadingInfo}
                      className={`gap-2 ${primaryBtn}`}
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

          <Card className={cardGlass}>
            <CardAccent via="via-emerald-400/70" />

            <CardHeader>
              <CardTitle className={headingText}>
                Status Integrasi
              </CardTitle>
              <CardDescription>
                Kesiapan layanan platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
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
                  <span className={`font-semibold ${headingText}`}>
                    {key}
                  </span>
                  <span className={`text-right ${mutedSoft}`}>
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB TAMPILAN */}
        <TabsContent value="appearance">
          <Card className={cardGlass}>
            <CardAccent via="via-teal-400/70" />

            <CardHeader>
              <CardTitle className={headingText}>Tampilan</CardTitle>
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
          <Card className={cardGlass}>
            <CardAccent via="via-emerald-400/70" />

            <CardHeader>
              <CardTitle className={headingText}>
                Notifikasi Admin
              </CardTitle>
              <CardDescription>
                Pengaturan notifikasi ini masih berupa demo.
              </CardDescription>
            </CardHeader>

            <CardContent className="max-w-2xl divide-y divide-slate-200/70 dark:divide-slate-800">
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
                  className={primaryBtn}
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
