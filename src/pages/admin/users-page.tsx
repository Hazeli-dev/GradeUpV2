
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Shield,
  Crown,
  UserCheck,
  Calendar,
  Sliders,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  UserRound,
  CheckCircle2,
  Clock3,
  X,
  Sparkles,
  Mail,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_premium: boolean;
  premium_until: string | null;
  created_at: string | null;
}

type DurationUnit = "days" | "months" | "years" | "custom";

function isPremiumActive(user: UserProfile): boolean {
  if (user.role === "admin") return false;
  if (!user.is_premium || !user.premium_until) return false;

  const expiry = new Date(user.premium_until).getTime();

  return Number.isFinite(expiry) && expiry > Date.now();
}

function getInitials(name: string | null, email: string | null) {
  const value = name?.trim() || email?.trim() || "U";

  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getErrorMessage(error: any): string {
  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    "Terjadi kesalahan yang tidak diketahui."
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [durationUnit, setDurationUnit] =
    useState<DurationUnit>("months");
  const [durationValue, setDurationValue] = useState(1);
  const [customDate, setCustomDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // AMBIL DATA PENGGUNA
  // =====================================================

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Periksa sesi login
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("GRADEUP ADMIN SESSION:", {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        sessionError: sessionError?.message ?? null,
      });

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setUsers([]);
        setErrorMessage(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
        return;
      }

      // 2. Pastikan akun yang login adalah admin
      const { data: currentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", session.user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Gagal memeriksa role admin:", profileError);
        throw profileError;
      }

      if (currentProfile?.role !== "admin") {
        setUsers([]);
        setErrorMessage(
          "Akun ini tidak memiliki hak akses administrator."
        );
        return;
      }

      // 3. Ambil seluruh profil pengguna
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, role, is_premium, premium_until, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("DETAIL ERROR PENGAMBILAN PENGGUNA:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        throw error;
      }

      setUsers((data ?? []) as UserProfile[]);
      setErrorMessage("");

      console.log(
        "GRADEUP: Data pengguna berhasil dimuat:",
        data?.length ?? 0
      );
    } catch (error: any) {
      console.error("GAGAL MENGAMBIL DATA PENGGUNA:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
      });

      setUsers([]);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // =====================================================
  // STATISTIK DAN PENCARIAN
  // =====================================================

  const premiumUsers = useMemo(
    () => users.filter(isPremiumActive),
    [users]
  );

  const freeUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role !== "admin" && !isPremiumActive(user)
      ),
    [users]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => user.role === "admin"),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      return (
        (user.full_name ?? "").toLowerCase().includes(keyword) ||
        (user.email ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  // =====================================================
  // PENGATURAN PREMIUM
  // =====================================================

  const handleOpenSetting = (user: UserProfile) => {
    if (user.role === "admin") return;

    setSelectedUser(user);
    setDurationUnit("months");
    setDurationValue(1);
    setCustomDate("");
    setErrorMessage("");
    setIsDialogOpen(true);
  };

  const calculateExpiryDate = (): string | null => {
    if (durationUnit === "custom") {
      if (!customDate) return null;

      const [year, month, day] = customDate
        .split("-")
        .map(Number);

      const selectedDate = new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999
      );

      if (
        selectedDate.getFullYear() !== year ||
        selectedDate.getMonth() !== month - 1 ||
        selectedDate.getDate() !== day ||
        selectedDate <= new Date()
      ) {
        return null;
      }

      return selectedDate.toISOString();
    }

    if (!Number.isInteger(durationValue) || durationValue < 1) {
      return null;
    }

    const targetDate = new Date();

    if (durationUnit === "days") {
      targetDate.setDate(
        targetDate.getDate() + durationValue
      );
    } else if (durationUnit === "months") {
      const originalDay = targetDate.getDate();

      targetDate.setDate(1);
      targetDate.setMonth(
        targetDate.getMonth() + durationValue
      );

      const lastDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0
      ).getDate();

      targetDate.setDate(Math.min(originalDay, lastDay));
    } else if (durationUnit === "years") {
      const originalMonth = targetDate.getMonth();
      const originalDay = targetDate.getDate();

      targetDate.setDate(1);
      targetDate.setFullYear(
        targetDate.getFullYear() + durationValue
      );
      targetDate.setMonth(originalMonth);

      const lastDay = new Date(
        targetDate.getFullYear(),
        originalMonth + 1,
        0
      ).getDate();

      targetDate.setDate(Math.min(originalDay, lastDay));
    }

    return targetDate.toISOString();
  };

  // =====================================================
  // AKTIVASI PREMIUM
  // =====================================================

  const handleSavePremium = async () => {
    if (!selectedUser || saving || selectedUser.role === "admin") {
      return;
    }

    setErrorMessage("");

    const formattedDate = calculateExpiryDate();

    if (!formattedDate) {
      setErrorMessage(
        durationUnit === "custom"
          ? "Pilih tanggal berakhir Premium yang valid dan masih di masa depan."
          : "Jumlah durasi harus berupa bilangan bulat minimal 1."
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        "admin_set_user_premium",
        {
          target_user_id: selectedUser.id,
          premium_status: true,
          expiry_date: formattedDate,
        }
      );

      if (error) {
        console.error("GAGAL MENGAKTIFKAN PREMIUM:", error);
        throw error;
      }

      setIsDialogOpen(false);
      setSelectedUser(null);

      await fetchUsers();

      window.alert("Akses Premium berhasil diaktifkan.");
    } catch (error: any) {
      console.error("PREMIUM ACTIVATION ERROR:", error);

      setErrorMessage(
        "Gagal mengaktifkan Premium: " +
          getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // PENCABUTAN PREMIUM
  // =====================================================

  const handleRevokePremium = async () => {
    if (!selectedUser || saving || selectedUser.role === "admin") {
      return;
    }

    const confirmed = window.confirm(
      `Cabut akses Premium untuk ${
        selectedUser.full_name ||
        selectedUser.email ||
        "pengguna ini"
      }?`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        "admin_set_user_premium",
        {
          target_user_id: selectedUser.id,
          premium_status: false,
          expiry_date: null,
        }
      );

      if (error) {
        console.error("GAGAL MENCABUT PREMIUM:", error);
        throw error;
      }

      setIsDialogOpen(false);
      setSelectedUser(null);

      await fetchUsers();

      window.alert("Akses Premium berhasil dicabut.");
    } catch (error: any) {
      console.error("PREMIUM REVOKE ERROR:", error);

      setErrorMessage(
        "Gagal mencabut Premium: " +
          getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // FORMAT DATA
  // =====================================================

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPackageStatus = (user: UserProfile) => {
    if (user.role === "admin") return "admin";
    if (isPremiumActive(user)) return "premium";

    if (user.is_premium && !user.premium_until) {
      return "missing-date";
    }

    if (user.is_premium && user.premium_until) {
      return "expired";
    }

    return "free";
  };

  const getRemainingDays = (date: string | null) => {
    if (!date) return null;

    const difference =
      new Date(date).getTime() - Date.now();

    if (!Number.isFinite(difference)) return null;

    return Math.max(
      0,
      Math.ceil(difference / (1000 * 60 * 60 * 24))
    );
  };

  // =====================================================
  // TAMPILAN
  // =====================================================

  return (
    <div className="min-h-full space-y-6 p-4 md:space-y-8 md:p-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.10] via-card to-card p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-primary/[0.07] blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-primary">
                ADMINISTRATION
              </Badge>
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Manajemen Pengguna
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Kelola akun, pantau status keanggotaan, dan atur akses
              Premium seluruh pengguna GradeUp.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void fetchUsers()}
            disabled={loading || saving}
            className="gap-2 self-start bg-background/80 md:self-center"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh Data
          </Button>
        </div>
      </section>

      {/* Error utama */}
      {errorMessage && !isDialogOpen && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Gagal memuat data pengguna
            </p>
            <p className="mt-1 break-words">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchUsers()}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/20 md:p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Total Pengguna
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {users.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Seluruh akun terdaftar
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Crown className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Premium Aktif
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
            {premiumUsers.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Memiliki akses Premium
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Pengguna Gratis
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
            {freeUsers.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Belum memiliki Premium aktif
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <Shield className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Administrator
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {adminUsers.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Akun dengan hak admin
          </p>
        </div>
      </section>

      {/* Daftar pengguna */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="font-semibold">Daftar Pengguna</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredUsers.length} dari {users.length} pengguna
              ditampilkan
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-xl pl-9 pr-9"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[230px] pl-5">
                  Pengguna
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status Paket</TableHead>
                <TableHead className="min-w-[175px]">
                  Masa Aktif Premium
                </TableHead>
                <TableHead className="min-w-[130px]">
                  Tanggal Daftar
                </TableHead>
                <TableHead className="pr-5 text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <span className="text-sm">
                        Memuat data pengguna...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {search
                            ? "Pengguna tidak ditemukan"
                            : "Belum ada pengguna"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {search
                            ? "Coba gunakan kata kunci lain."
                            : "Data pengguna akan muncul di sini."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const status = getPackageStatus(user);
                  const remainingDays = getRemainingDays(
                    user.premium_until
                  );

                  return (
                    <TableRow
                      key={user.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="py-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              user.role === "admin"
                                ? "bg-violet-500/10 text-violet-600"
                                : isPremiumActive(user)
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-primary/10 text-primary"
                            }`}
                          >
                            {getInitials(
                              user.full_name,
                              user.email
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {user.full_name || "Tanpa Nama"}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              {user.email || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge className="gap-1 bg-violet-600 text-white hover:bg-violet-700">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Siswa
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {status === "admin" ? (
                          <Badge variant="muted" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Akses Admin
                          </Badge>
                        ) : status === "premium" ? (
                          <Badge className="gap-1 border-0 bg-amber-500 text-white hover:bg-amber-600">
                            <Crown className="h-3 w-3" />
                            Premium Aktif
                          </Badge>
                        ) : status === "expired" ? (
                          <Badge variant="danger">Kedaluwarsa</Badge>
                        ) : status === "missing-date" ? (
                          <Badge variant="warning">
                            Perlu Pemeriksaan
                          </Badge>
                        ) : (
                          <Badge variant="outline">Gratis</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {user.role === "admin" ? (
                          <span className="text-xs text-muted-foreground">
                            Tidak dibatasi
                          </span>
                        ) : user.premium_until ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(user.premium_until)}
                            </div>

                            {isPremiumActive(user) &&
                              remainingDays !== null && (
                                <p className="text-[11px] text-emerald-600">
                                  {remainingDays === 0
                                    ? "Berakhir hari ini"
                                    : `${remainingDays} hari tersisa`}
                                </p>
                              )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Belum berlangganan
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>

                      <TableCell className="pr-5 text-right">
                        {user.role === "admin" ? (
                          <span className="text-xs text-muted-foreground">
                            Khusus Admin
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSetting(user)}
                            disabled={saving}
                            className="gap-1.5 rounded-lg"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                            Atur Paket
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && users.length > 0 && (
          <div className="flex flex-col gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Menampilkan {filteredUsers.length} pengguna
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Data dari database GradeUp
            </span>
          </div>
        )}
      </section>

      {/* Dialog Premium */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setIsDialogOpen(open);

            if (!open) {
              setErrorMessage("");
            }
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Crown className="h-5 w-5" />
              </div>
              Atur Paket Premium
            </DialogTitle>

            <DialogDescription>
              Kelola masa aktif Premium untuk{" "}
              <strong className="text-foreground">
                {selectedUser?.full_name ||
                  selectedUser?.email ||
                  "pengguna"}
              </strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Status saat ini */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Status paket saat ini
                </p>

                <p className="mt-1 font-semibold">
                  {selectedUser && isPremiumActive(selectedUser)
                    ? "Premium Aktif"
                    : selectedUser?.is_premium
                      ? selectedUser.premium_until
                        ? "Premium Kedaluwarsa"
                        : "Perlu Pemeriksaan"
                      : "Paket Gratis"}
                </p>
              </div>

              {selectedUser && isPremiumActive(selectedUser) ? (
                <Badge className="gap-1 bg-amber-500 text-white">
                  <Crown className="h-3 w-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="outline">
                  {selectedUser?.is_premium
                    ? "Tidak Aktif"
                    : "Free"}
                </Badge>
              )}
            </div>

            {selectedUser?.premium_until && (
              <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Berakhir: {formatDate(selectedUser.premium_until)}
              </div>
            )}
          </div>

          {/* Informasi Premium */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Akses Premium memberikan pengguna hak akses ke kursus
              Premium sesuai ketentuan langganan GradeUp.
            </span>
          </div>

          {/* Durasi */}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Pilih Satuan Waktu
              </label>

              <Select
                value={durationUnit}
                onValueChange={(value) =>
                  setDurationUnit(value as DurationUnit)
                }
                disabled={saving}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Pilih satuan..." />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="days">Hari</SelectItem>
                  <SelectItem value="months">Bulan</SelectItem>
                  <SelectItem value="years">Tahun</SelectItem>
                  <SelectItem value="custom">
                    Pilih Tanggal Spesifik
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationUnit !== "custom" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Jumlah Durasi (
                  {durationUnit === "days"
                    ? "Hari"
                    : durationUnit === "months"
                      ? "Bulan"
                      : "Tahun"}
                  )
                </label>

                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={durationValue}
                  onChange={(event) =>
                    setDurationValue(
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  disabled={saving}
                  className="h-11 rounded-xl"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Berlaku Sampai Tanggal
                </label>

                <Input
                  type="date"
                  value={customDate}
                  min={new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Jakarta",
                  })}
                  onChange={(event) =>
                    setCustomDate(event.target.value)
                  }
                  disabled={saving}
                  className="h-11 rounded-xl"
                />

                <p className="text-xs text-muted-foreground">
                  Akses berlaku sampai akhir tanggal yang dipilih.
                </p>
              </div>
            )}
          </div>

          {/* Error dialog */}
          {errorMessage && isDialogOpen && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-between">
            {selectedUser?.is_premium ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokePremium}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Cabut Premium
              </Button>
            ) : (
              <div />
            )}

            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                Batal
              </Button>

              <Button
                onClick={handleSavePremium}
                disabled={saving}
                className="flex-1 gap-2 sm:flex-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Simpan Paket
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminUsersPage;
