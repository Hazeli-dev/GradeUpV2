import { useEffect, useState } from "react";
import { 
  Search, 
  Shield, 
  Crown, 
  UserCheck, 
  Calendar, 
  Sliders,
  RefreshCw,
  Loader2
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
  email: string;
  full_name: string;
  role: string;
  is_premium: boolean;
  premium_until?: string | null;
  created_at: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  
  // Dialog State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form Premium State
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years" | "custom">("months");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [customDate, setCustomDate] = useState<string>("");

  // Fetch Data Pengguna dari Supabase
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data pengguna:", error.message);
      } else if (data) {
        setUsers(data as UserProfile[]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter Pengguna berdasarkan kata kunci pencarian
  const filteredUsers = users.filter(
    (u) =>
      (u.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleOpenSetting = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  // Simpan Akses Premium ke Supabase
  const handleSavePremium = async () => {
    if (!selectedUser) return;
    setSaving(true);

    let targetDate = new Date();

    if (durationUnit === "days") {
      targetDate.setDate(targetDate.getDate() + Number(durationValue));
    } else if (durationUnit === "months") {
      targetDate.setMonth(targetDate.getMonth() + Number(durationValue));
    } else if (durationUnit === "years") {
      targetDate.setFullYear(targetDate.getFullYear() + Number(durationValue));
    } else if (durationUnit === "custom" && customDate) {
      targetDate = new Date(customDate);
    }

    const formattedDate = targetDate.toISOString();

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: formattedDate,
        })
        .eq("id", selectedUser.id);

      if (error) {
        alert("Gagal memperbarui status premium: " + error.message);
      } else {
        setIsDialogOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Cabut Paket Premium di Supabase
  const handleRevokePremium = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: false,
          premium_until: null,
        })
        .eq("id", selectedUser.id);

      if (error) {
        alert("Gagal mencabut status premium: " + error.message);
      } else {
        setIsDialogOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Data pengguna tersinkronisasi langsung dari database Supabase.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      {/* Bar Pencarian */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau email pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabel Data Pengguna */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Memuat data pengguna dari Supabase...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Tidak ada data pengguna yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.full_name || "Tanpa Nama"}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="default" className="gap-1 bg-primary">
                        <Shield className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <UserCheck className="h-3 w-3" /> Siswa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_premium ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-white">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Gratis
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_premium && user.premium_until ? (
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(user.premium_until).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSetting(user)}
                      className="gap-1.5"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Atur Paket
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal / Dialog Pengaturan Paket Premium */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Atur Paket Premium
            </DialogTitle>
            <DialogDescription>
              Ubah masa berlaku akses Premium untuk <b>{selectedUser?.full_name || selectedUser?.email}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Pilih Satuan Waktu</label>
              <Select
                value={durationUnit}
                onValueChange={(val: any) => setDurationUnit(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih satuan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Hari</SelectItem>
                  <SelectItem value="months">Bulan</SelectItem>
                  <SelectItem value="years">Tahun</SelectItem>
                  <SelectItem value="custom">Pilih Tanggal Spesifik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationUnit !== "custom" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold">
                  Jumlah ({durationUnit === "days" ? "Hari" : durationUnit === "months" ? "Bulan" : "Tahun"})
                </label>
                <Input
                  type="number"
                  min={1}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Berlaku Sampai Tanggal</label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {selectedUser?.is_premium ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokePremium}
                disabled={saving}
              >
                {saving ? "Memproses..." : "Cabut Premium"}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSavePremium} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Paket"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminUsersPage;
