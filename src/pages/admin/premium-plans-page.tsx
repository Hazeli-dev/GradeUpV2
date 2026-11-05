
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Crown,
  Plus,
  Pencil,
  RefreshCw,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  CalendarDays,
  AlertTriangle,
  X,
  Package,
  Power,
  Filter,
  Clock3,
  CircleDollarSign,
  ArrowUpDown,
  MoreHorizontal,
  ListFilter,
  ShieldCheck,
  Layers3,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PageHeader } from "@/components/shared/page-header";
import {
  EmptyState,
  ErrorState,
  CardGridSkeleton,
} from "@/components/shared/states";

import { supabase } from "@/lib/supabase";

interface PremiumPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_months: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PlanDraft {
  id?: string;
  code: string;
  name: string;
  description: string;
  price: string;
  duration_months: number;
  features: string;
  is_active: boolean;
  sort_order: number;
}

type StatusFilter = "all" | "active" | "inactive";
type SortOption = "position" | "name" | "price-low" | "price-high";

const DURATION_OPTIONS = [1, 3, 6, 12];

const formatRupiah = (value: number | null) => {
  if (value === null) return "Belum ditentukan";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDuration = (months: number) =>
  months === 1 ? "1 Bulan" : `${months} Bulan`;

const formatDate = (value: string) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Terjadi kesalahan. Silakan coba kembali.";

const createCode = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const emptyDraft = (): PlanDraft => ({
  code: "",
  name: "",
  description: "",
  price: "",
  duration_months: 1,
  features: "",
  is_active: false,
  sort_order: 0,
});

export default function AdminPremiumPlansPage() {
  const [items, setItems] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("position");
  const [validation, setValidation] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("premium_plans")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("duration_months", { ascending: true });

      if (error) throw error;

      const mapped = (data ?? []).map((item) => ({
        ...item,
        features: Array.isArray(item.features) ? item.features : [],
      })) as PremiumPlan[];

      setItems(mapped);
    } catch (fetchError) {
      console.error("Fetch premium plans error:", fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activePlans = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items]
  );

  const inactivePlans = items.length - activePlans;

  const averagePrice = useMemo(() => {
    const pricedPlans = items.filter(
      (item) => item.price !== null && item.price > 0
    );

    if (!pricedPlans.length) return 0;

    return (
      pricedPlans.reduce((sum, item) => sum + (item.price ?? 0), 0) /
      pricedPlans.length
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = items.filter((item) => {
      const matchesSearch =
        !keyword ||
        [item.name, item.code, item.description ?? ""].some((value) =>
          value.toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return (a.price ?? 0) - (b.price ?? 0);
        case "price-high":
          return (b.price ?? 0) - (a.price ?? 0);
        default:
          return (
            a.sort_order - b.sort_order ||
            a.duration_months - b.duration_months
          );
      }
    });
  }, [items, search, statusFilter, sortBy]);

  const openCreate = () => {
    setValidation({});
    setDraft(emptyDraft());
  };

  const openEdit = (item: PremiumPlan) => {
    setValidation({});

    setDraft({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      price: item.price === null ? "" : String(item.price),
      duration_months: item.duration_months,
      features: item.features.join("\n"),
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  };

  const updateDraft = (changes: Partial<PlanDraft>) => {
    setDraft((current) =>
      current ? { ...current, ...changes } : current
    );
  };

  const save = async () => {
    if (!draft || saving) return;

    const errors: Record<string, string> = {};

    const name = draft.name.trim();
    const code = createCode(draft.code || name);
    const rawPrice = draft.price.trim();
    const parsedPrice = rawPrice === "" ? null : Number(rawPrice);

    if (!name) {
      errors.name = "Nama paket wajib diisi.";
    }

    if (!code) {
      errors.code = "Kode paket tidak valid.";
    }

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      errors.price = "Masukkan harga yang valid.";
    }

    if (
      draft.is_active &&
      (parsedPrice === null || parsedPrice <= 0)
    ) {
      errors.price = "Paket aktif wajib memiliki harga lebih dari Rp0.";
    }

    if (
      items.some(
        (item) =>
          item.code.toLowerCase() === code.toLowerCase() &&
          item.id !== draft.id
      )
    ) {
      errors.code = "Kode paket sudah digunakan.";
    }

    if (!DURATION_OPTIONS.includes(draft.duration_months)) {
      errors.duration_months = "Durasi paket tidak valid.";
    }

    if (
      !Number.isFinite(Number(draft.sort_order)) ||
      Number(draft.sort_order) < 0
    ) {
      errors.sort_order = "Urutan tampilan tidak valid.";
    }

    setValidation(errors);

    if (Object.keys(errors).length > 0) return;

    const features = draft.features
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean);

    const payload = {
      code,
      name,
      description: draft.description.trim() || null,
      price: parsedPrice,
      duration_months: draft.duration_months,
      features,
      is_active: draft.is_active,
      sort_order: Number(draft.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    try {
      if (draft.id) {
        const { error } = await supabase
          .from("premium_plans")
          .update(payload)
          .eq("id", draft.id);

        if (error) throw error;

        toast.success("Paket Premium berhasil diperbarui.");
      } else {
        const { error } = await supabase
          .from("premium_plans")
          .insert([payload]);

        if (error) throw error;

        toast.success("Paket Premium berhasil ditambahkan.");
      }

      setDraft(null);
      setValidation({});
      await fetchData();
    } catch (saveError) {
      console.error("Save premium plan error:", saveError);
      toast.error(`Gagal menyimpan paket: ${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: PremiumPlan) => {
    if (togglingId) return;

    if (!item.is_active && (!item.price || item.price <= 0)) {
      toast.error("Tentukan harga paket sebelum mengaktifkannya.");
      return;
    }

    const newStatus = !item.is_active;
    setTogglingId(item.id);

    try {
      const { error } = await supabase
        .from("premium_plans")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success(
        newStatus
          ? "Paket berhasil diaktifkan."
          : "Paket berhasil dinonaktifkan."
      );

      await fetchData();
    } catch (toggleError) {
      console.error("Toggle premium plan error:", toggleError);
      toast.error(
        `Gagal mengubah status: ${getErrorMessage(toggleError)}`
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-w-0 space-y-6 pb-10">
      {/* HEADER */}
      <PageHeader
        title="Manajemen Paket Premium"
        description="Kelola produk langganan, harga, durasi, dan ketersediaan paket GradeUp."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void fetchData()}
              disabled={loading}
              className="h-9 gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Muat Ulang</span>
              <span className="sm:hidden">Refresh</span>
            </Button>

            <Button onClick={openCreate} className="h-9 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Paket
            </Button>
          </div>
        }
      />

      {/* PAGE INTRO */}
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="h-6 w-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Pengelolaan Produk Langganan
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  ADMIN CONTROL
                </Badge>
              </div>

              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Semua konfigurasi paket Premium dikelola dari satu tempat.
                Paket yang dinonaktifkan tetap tersimpan agar riwayat
                transaksi dapat ditelusuri.
              </p>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Akses pengelolaan
              </p>
              <p className="text-xs font-semibold">Admin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total paket</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : items.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Paket aktif</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : activePlans}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Paket nonaktif</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : inactivePlans}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Rata-rata harga paket
              </p>
              <p className="mt-0.5 truncate text-xl font-bold tabular-nums">
                {loading ? "—" : formatRupiah(averagePrice)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Berdasarkan paket dengan harga terisi
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* TABLE SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              Daftar Paket Langganan
            </h3>
            <p className="text-xs text-muted-foreground">
              Data paket yang tersimpan di database GradeUp.
            </p>
          </div>

          {!loading && !error && (
            <span className="text-xs text-muted-foreground">
              {filteredItems.length} dari {items.length} paket
            </span>
          )}
        </div>

        {/* FILTER TOOLBAR */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama paket, kode, atau deskripsi..."
                className="h-10 pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="relative">
                <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  aria-label="Filter status paket"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-ring sm:w-36"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  aria-label="Urutkan paket"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortOption)
                  }
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-ring sm:w-40"
                >
                  <option value="position">Urutan tampilan</option>
                  <option value="name">Nama paket</option>
                  <option value="price-low">Harga terendah</option>
                  <option value="price-high">Harga tertinggi</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => void fetchData()}
          />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10">
            <EmptyState
              title="Belum ada paket Premium"
              description="Tambahkan paket pertama untuk mulai mengelola langganan GradeUp."
              action={
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Paket
                </Button>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10">
            <EmptyState
              title="Data tidak ditemukan"
              description="Tidak ada paket yang sesuai dengan pencarian atau filter."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSortBy("position");
                  }}
                >
                  Reset Filter
                </Button>
              }
            />
          </div>
        ) : (
          <Card className="overflow-hidden">
            {/* TABLE HEADER */}
            <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Data Paket Premium</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Terakhir diperbarui berdasarkan data database
              </p>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="w-12 px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      No.
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Informasi Paket
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Harga
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Durasi
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Fasilitas
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tindakan
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4 text-center text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="max-w-[260px] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              item.is_active
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Crown className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {item.code}
                            </p>
                            {item.description && (
                              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="whitespace-nowrap text-sm font-bold tabular-nums">
                          {formatRupiah(item.price)}
                        </p>
                        {item.price === null && (
                          <span className="text-[10px] text-amber-600">
                            Perlu ditentukan
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDuration(item.duration_months)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <Badge variant="outline" className="font-medium">
                          {item.features.length} fasilitas
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant={item.is_active ? "success" : "outline"}
                          className="gap-1"
                        >
                          {item.is_active ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant={item.is_active ? "ghost" : "soft"}
                            disabled={togglingId !== null}
                            className={
                              item.is_active
                                ? "h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                : "h-8 gap-1.5"
                            }
                            onClick={() => void toggleActive(item)}
                          >
                            {togglingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}
            <div className="divide-y md:hidden">
              {filteredItems.map((item, index) => (
                <div key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Crown className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {item.code}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={item.is_active ? "success" : "outline"}
                    >
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Harga
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Durasi
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDuration(item.duration_months)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Fasilitas
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {item.features.length} fasilitas
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Urutan
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {item.sort_order}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Paket
                    </Button>
                    <Button
                      size="sm"
                      variant={item.is_active ? "ghost" : "soft"}
                      disabled={togglingId !== null}
                      className={
                        item.is_active
                          ? "flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "flex-1 gap-1.5"
                      }
                      onClick={() => void toggleActive(item)}
                    >
                      {togglingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>

                  <p className="text-right text-[10px] text-muted-foreground">
                    Paket #{index + 1} · Diperbarui{" "}
                    {formatDate(item.updated_at)}
                  </p>
                </div>
              ))}
            </div>

            {/* TABLE FOOTER */}
            <div className="flex flex-col gap-1 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[11px] text-muted-foreground">
                Menampilkan {filteredItems.length} paket
              </p>
              <p className="text-[11px] text-muted-foreground">
                Data tersimpan di Supabase
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* FORM DIALOG */}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setValidation({});
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {draft && (
            <>
              <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {draft.id ? (
                      <Pencil className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-bold">
                      {draft.id ? "Edit Paket Premium" : "Tambah Paket Premium"}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs">
                      Konfigurasikan detail produk langganan GradeUp.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                {/* IDENTITAS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Identitas Paket
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Nama dan kode identifikasi produk.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-name">
                        Nama Paket <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="plan-name"
                        value={draft.name}
                        onChange={(event) =>
                          updateDraft({
                            name: event.target.value,
                            code: draft.id
                              ? draft.code
                              : createCode(event.target.value),
                          })
                        }
                        placeholder="Contoh: Premium Bulanan"
                        maxLength={80}
                        disabled={saving}
                      />
                      {validation.name && (
                        <p className="text-xs text-destructive">
                          {validation.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-code">Kode Paket</Label>
                      <Input
                        id="plan-code"
                        value={draft.code}
                        onChange={(event) =>
                          updateDraft({
                            code: createCode(event.target.value),
                          })
                        }
                        placeholder="premium-bulanan"
                        disabled={saving}
                      />
                      {validation.code && (
                        <p className="text-xs text-destructive">
                          {validation.code}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-description">Deskripsi</Label>
                    <Textarea
                      id="plan-description"
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft({ description: event.target.value })
                      }
                      placeholder="Jelaskan manfaat paket ini..."
                      rows={3}
                      maxLength={300}
                      disabled={saving}
                    />
                    <p className="text-right text-[10px] text-muted-foreground">
                      {draft.description.length}/300 karakter
                    </p>
                  </div>
                </section>

                {/* HARGA DAN DURASI */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Harga dan Durasi
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Pengaturan biaya dan masa aktif langganan.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-price">
                        Harga (Rupiah){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                          Rp
                        </span>
                        <Input
                          id="plan-price"
                          type="number"
                          min="0"
                          step="1000"
                          value={draft.price}
                          onChange={(event) =>
                            updateDraft({ price: event.target.value })
                          }
                          placeholder="49000"
                          className="pl-10"
                          disabled={saving}
                        />
                      </div>
                      {validation.price && (
                        <p className="text-xs text-destructive">
                          {validation.price}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-duration">
                        Durasi Langganan
                      </Label>
                      <select
                        id="plan-duration"
                        value={draft.duration_months}
                        onChange={(event) =>
                          updateDraft({
                            duration_months: Number(event.target.value),
                          })
                        }
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      >
                        {DURATION_OPTIONS.map((duration) => (
                          <option key={duration} value={duration}>
                            {formatDuration(duration)}
                          </option>
                        ))}
                      </select>
                      {validation.duration_months && (
                        <p className="text-xs text-destructive">
                          {validation.duration_months}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* FASILITAS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Fasilitas Paket
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Daftar manfaat yang diterima pelanggan.
                      </p>
                    </div>
                  </div>

                  <Textarea
                    id="plan-features"
                    value={draft.features}
                    onChange={(event) =>
                      updateDraft({ features: event.target.value })
                    }
                    placeholder={
                      "Akses seluruh materi Premium\nLatihan dan evaluasi\nRiwayat perkembangan belajar"
                    }
                    rows={5}
                    disabled={saving}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Satu fasilitas per baris. Baris kosong akan diabaikan.
                  </p>
                </section>

                {/* PENGATURAN */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Power className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Pengaturan Publikasi
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Atur posisi dan ketersediaan paket.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-order">Urutan Tampilan</Label>
                    <Input
                      id="plan-order"
                      type="number"
                      min="0"
                      value={draft.sort_order}
                      onChange={(event) =>
                        updateDraft({
                          sort_order: Number(event.target.value),
                        })
                      }
                      disabled={saving}
                    />
                    {validation.sort_order && (
                      <p className="text-xs text-destructive">
                        {validation.sort_order}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Angka lebih kecil ditampilkan lebih dahulu.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          draft.is_active
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {draft.is_active ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Status Paket
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {draft.is_active
                            ? "Paket tersedia untuk pelanggan."
                            : "Paket tidak ditampilkan kepada pelanggan."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-label="Status paket"
                      aria-checked={draft.is_active}
                      disabled={saving}
                      onClick={() =>
                        updateDraft({ is_active: !draft.is_active })
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        draft.is_active
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          draft.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {!draft.is_active && (
                    <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Paket nonaktif tetap tersimpan dan dapat diaktifkan
                        kembali kapan saja.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <DialogFooter className="border-t bg-muted/20 px-5 py-4 sm:px-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(null);
                    setValidation({});
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button
                  onClick={() => void save()}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {draft.id ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {draft.id ? "Simpan Perubahan" : "Tambah Paket"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* INFORMATION */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold">
              Catatan pengelolaan paket
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Jika paket tidak lagi ditawarkan, nonaktifkan paket tersebut
              daripada menghapusnya. Riwayat transaksi lama tetap perlu
              dapat ditelusuri meskipun harga atau nama paket berubah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
