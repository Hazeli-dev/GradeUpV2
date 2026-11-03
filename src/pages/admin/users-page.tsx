```tsx
import { useEffect, useState } from "react";
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

// Pemeriksaan Premium berdasarkan status dan tanggal kedaluwarsa.
function isPremiumActive(user: UserProfile): boolean {
  if (user.role === "admin") return false;

  if (!user.is_premium || !user.premium_until) return false;

  const expiryTime = new Date(user.premium_until).getTime();

  return (
    !Number.isNaN(expiryTime) &&
    expiryTime > Date.now()
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [durationUnit, setDurationUnit] = useState<DurationUnit>("months");
  const [durationValue, setDurationValue] = useState(1);
  const [customDate, setCustomDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // Mengambil data pengguna
  const fetchUsers = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data pengguna:", error);
        setErrorMessage(error.message);
        return;
      }

      setUsers((data ?? []) as UserProfile[]);
      setErrorMessage("");
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Terjadi kesalahan saat mengambil data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // Statistik Premium aktif dan Gratis.
  const premiumUsers = users.filter(isPremiumActive);

  const freeUsers = users.filter(
    (user) => user.role !== "admin" && !isPremiumActive(user)
  );

  // Pencarian pengguna
  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    return (
      (user.full_name ?? "").toLowerCase().includes(keyword) ||
      (user.email ?? "").toLowerCase().includes(keyword)
    );
  });

  // Membuka dialog pengaturan
  const handleOpenSetting = (user: UserProfile) => {
    if (user.role === "admin") return;

    setSelectedUser(user);
    setDurationUnit("months");
    setDurationValue(1);
    setCustomDate("");
    setErrorMessage("");
    setIsDialogOpen(true);
  };

  // Menghitung tanggal berakhir Premium
  const calculateExpiryDate = (): string | null => {
    if (durationUnit === "custom") {
      if (!customDate) return null;

      const [year, month, day] = customDate.split("-").map(Number);

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

    if (
      !Number.isInteger(durationValue) ||
      durationValue < 1
    ) {
      return null;
    }

    const targetDate = new Date();

    if (durationUnit === "days") {
      targetDate.setDate(targetDate.getDate() + durationValue);
    } else if (durationUnit === "months") {
      const originalDay = targetDate.getDate();

      targetDate.setDate(1);
      targetDate.setMonth(targetDate.getMonth() + durationValue);

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

  // Mengaktifkan Premium melalui RPC
  const handleSavePremium = async () => {
    if (!selectedUser || saving || selectedUser.role === "admin") return;

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
      const { error } = await supabase.rpc("admin_set_user_premium", {
        target_user_id: selectedUser.id,
        premium_status: true,
        expiry_date: formattedDate,
      });

      if (error) {
        console.error("Gagal mengaktifkan Premium:", error);
        setErrorMessage(error.message);
        return;
      }

      setIsDialogOpen(false);
      setSelectedUser(null);

      await fetchUsers();

      window.alert("Akses Premium berhasil diaktifkan.");
    } catch (error) {
      console.error("Premium activation error:", error);
      setErrorMessage("Terjadi kesalahan saat mengaktifkan Premium.");
    } finally {
      setSaving(false);
    }
  };

  // Mencabut Premium melalui RPC
  const handleRevokePremium = async () => {
    if (!selectedUser || saving || selectedUser.role === "admin") return;

    const confirmed = window.confirm(
      `Cabut akses Premium untuk ${
        selectedUser.full_name || selectedUser.email || "pengguna ini"
      }?`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSaving(true);

    try {
      const { error } = await supabase.rpc("admin_set_user_premium", {
        target_user_id: selectedUser.id,
        premium_status: false,
        expiry_date: null,
      });

      if (error) {
        console.error("Gagal mencabut Premium:", error);
        setErrorMessage(error.message);
        return;
      }

      setIsDialogOpen(false);
      setSelectedUser(null);

      await fetchUsers();

      window.alert("Akses Premium berhasil dicabut.");
    } catch (error) {
      console.error("Premium revoke error:", error);
      setErrorMessage("Terjadi kesalahan saat mencabut Premium.");
    } finally {
      setSaving(false);
    }
  };

  // Format tanggal
  const formatDate = (date: string | null) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Label status paket
  const getPackageStatus = (user: UserProfile) => {
    if (user.role === "admin") {
      return "admin";
    }

    if (isPremiumActive(user)) {
      return "premium";
    }

    if (user.is_premium && !user.premium_until) {
      return "missing-date";
    }

    if (user.is_premium && user.premium_until) {
      return "expired";
    }

    return "free";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola data pengguna dan akses paket Premium GradeUp.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchUsers()}
          disabled={loading || saving}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Pengguna</p>
          <p className="mt-2 text-2xl font-bold">{users.length}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Premium Aktif
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {premiumUsers.length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Pengguna Gratis
          </p>
          <p className="mt-2 text-2xl font-bold">
            {freeUsers.length}
          </p>
        </div>
      </div>

      {/* Pencarian */}
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau email pengguna..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Pesan Error */}
      {errorMessage && !isDialogOpen && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status Paket</TableHead>
              <TableHead>Masa Aktif Premium</TableHead>
              <TableHead>Tanggal Daftar</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Memuat data pengguna...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  {search
                    ? "Tidak ada pengguna yang cocok dengan pencarian."
                    : "Belum ada data pengguna."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const packageStatus = getPackageStatus(user);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">
                          {user.full_name || "Tanpa Nama"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email || "-"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="gap-1">
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
                      {packageStatus === "admin" ? (
                        <Badge className="gap-1">
                          <Shield className="h-3 w-3" />
                          Akses Admin
                        </Badge>
                      ) : packageStatus === "premium" ? (
                        <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-600">
                          <Crown className="h-3 w-3" />
                          Premium Aktif
                        </Badge>
                      ) : packageStatus === "expired" ? (
                        <Badge variant="destructive">
                          Kedaluwarsa
                        </Badge>
                      ) : packageStatus === "missing-date" ? (
                        <Badge variant="outline">
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
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(user.premium_until)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
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
                          className="gap-1.5"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Atur Paket Premium
            </DialogTitle>

            <DialogDescription>
              Kelola akses Premium untuk{" "}
              <strong>
                {selectedUser?.full_name ||
                  selectedUser?.email ||
                  "pengguna"}
              </strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Status Saat Ini */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              Status paket saat ini
            </p>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {selectedUser && isPremiumActive(selectedUser)
                  ? "Premium Aktif"
                  : selectedUser?.is_premium
                    ? selectedUser.premium_until
                      ? "Premium Kedaluwarsa"
                      : "Perlu Pemeriksaan"
                    : "Gratis"}
              </span>

              {selectedUser && isPremiumActive(selectedUser) ? (
                <Badge className="bg-amber-500 text-white">
                  <Crown className="mr-1 h-3 w-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="outline">
                  {selectedUser?.is_premium ? "Tidak Aktif" : "Free"}
                </Badge>
              )}
            </div>

            {selectedUser?.premium_until && (
              <p className="mt-2 text-xs text-muted-foreground">
                Berakhir: {formatDate(selectedUser.premium_until)}
              </p>
            )}
          </div>

          {/* Pilihan Durasi */}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold">
                Pilih Satuan Waktu
              </label>

              <Select
                value={durationUnit}
                onValueChange={(value) =>
                  setDurationUnit(value as DurationUnit)
                }
                disabled={saving}
              >
                <SelectTrigger>
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
                <label className="text-xs font-semibold">
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
                    setDurationValue(Number(event.target.value))
                  }
                  disabled={saving}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold">
                  Berlaku Sampai Tanggal
                </label>

                <Input
                  type="date"
                  value={customDate}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={(event) => setCustomDate(event.target.value)}
                  disabled={saving}
                />
              </div>
            )}
          </div>

          {/* Error Dialog */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {selectedUser?.is_premium ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokePremium}
                disabled={saving}
              >
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cabut Premium
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>

              <Button onClick={handleSavePremium} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Paket"
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
```
