
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
  Sparkles,
  ArrowUpDown,
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

const DURATION_OPTIONS = [1, 3, 6, 12];

const formatRupiah = (value: number | null) => {
  if (value === null) return "Belum ditentukan";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDuration = (months: number) => {
  return months === 1 ? "1 Bulan" : `${months} Bulan`;
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

  const longestDuration = useMemo(
    () =>
      items.length > 0
        ? Math.max(...items.map((item) => item.duration_months))
        : 0,
    [items]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
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
  }, [items, search, statusFilter]);

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

    const parsedPrice =
      rawPrice === "" ? null : Number(rawPrice);

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
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Manajemen Paket Premium"
        description="Kelola harga, durasi berlangganan, fasilitas, dan ketersediaan paket GradeUp."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void fetchData()}
              disabled={loading}
              className="h-10 gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button onClick={openCreate} className="h-10 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Paket
            </Button>
          </div>
        }
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 p-5 shadow-sm sm:rounded-3xl sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background/70 text-primary"
            >
              <Crown className="mr-1.5 h-3 w-3" />
              PENGELOLAAN LANGGANAN
            </Badge>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Kelola Penawaran Premium
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Atur pilihan langganan GradeUp dengan fleksibel. Harga,
                masa aktif, dan fasilitas paket dapat disesuaikan melalui
                dashboard admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Harga dapat diubah
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Durasi fleksibel
              </span>
            </div>
          </div>

          <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:flex">
            <Crown className="h-12 w-12" />
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : items.length}
              </p>
              <p className="text-xs text-muted-foreground">Total paket</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : activePlans}
              </p>
              <p className="text-xs text-muted-foreground">Paket aktif</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : inactivePlans}
              </p>
              <p className="text-xs text-muted-foreground">Paket nonaktif</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : longestDuration}
                {!loading && (
                  <span className="ml-1 text-sm font-semibold text-muted-foreground">
                    bulan
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Durasi terpanjang
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* DAFTAR PAKET */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Daftar Paket
            </h3>
            <p className="text-xs text-muted-foreground">
              Kelola paket yang tersedia untuk pelanggan GradeUp.
            </p>
          </div>

          {!loading && !error && (
            <p className="text-xs text-muted-foreground">
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {filteredItems.length}
              </span>{" "}
              dari {items.length} paket
            </p>
          )}
        </div>

        {/* SEARCH & FILTER */}
        <Card>
          <CardContent className="space-y-3 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, kode, atau deskripsi paket..."
                  className="h-10 pl-9 pr-10"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="grid flex-1 grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1 sm:flex">
                  {(
                    [
                      ["all", "Semua"],
                      ["active", "Aktif"],
                      ["inactive", "Nonaktif"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                        statusFilter === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void fetchData()} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-10">
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
          <div className="rounded-2xl border border-dashed px-4 py-10">
            <EmptyState
              title="Paket tidak ditemukan"
              description="Tidak ada paket yang sesuai dengan pencarian atau filter status."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Reset pencarian dan filter
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  item.is_active
                    ? "border-primary/20"
                    : "border-border opacity-90"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${
                    item.is_active ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />

                <CardContent className="space-y-4 p-5 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        item.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Crown className="h-6 w-6" />
                    </div>

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
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-extrabold tracking-tight">
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                      KODE: {item.code.toUpperCase()}
                    </p>
                    {item.description && (
                      <p className="line-clamp-2 pt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CircleDollarSign className="h-3.5 w-3.5" />
                      Harga berlangganan
                    </div>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
                      {formatRupiah(item.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDuration(item.duration_months)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">Fasilitas paket</p>
                      <span className="text-[10px] text-muted-foreground">
                        {item.features.length} fasilitas
                      </span>
                    </div>

                    {item.features.length > 0 ? (
                      <ul className="space-y-2">
                        {item.features.slice(0, 4).map((feature, index) => (
                          <li
                            key={`${item.id}-${index}`}
                            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {item.features.length > 4 && (
                          <li className="pl-5 text-[11px] font-medium text-primary">
                            +{item.features.length - 4} fasilitas lainnya
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                        Belum ada fasilitas yang ditambahkan.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Urutan tampilan
                    </span>
                    <span className="font-bold tabular-nums">
                      {item.sort_order}
                    </span>
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
                          ? "gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "gap-1.5"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* DIALOG TAMBAH / EDIT */}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setValidation({});
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          {draft && (
            <>
              <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {draft.id ? (
                      <Pencil className="h-5 w-5" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base">
                      {draft.id ? "Edit Paket Premium" : "Tambah Paket Premium"}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs">
                      Lengkapi informasi paket berlangganan GradeUp.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {/* IDENTITAS PAKET */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold">Informasi Paket</h4>
                    <p className="text-xs text-muted-foreground">
                      Identitas yang akan digunakan untuk mengenali paket.
                    </p>
                  </div>

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
                        updateDraft({ code: createCode(event.target.value) })
                      }
                      placeholder="premium-bulanan"
                      disabled={saving}
                    />
                    {validation.code && (
                      <p className="text-xs text-destructive">
                        {validation.code}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Kode unik untuk identifikasi paket di database.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-description">Deskripsi Paket</Label>
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
                </div>

                <div className="border-t" />

                {/* HARGA DAN DURASI */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold">Harga dan Durasi</h4>
                    <p className="text-xs text-muted-foreground">
                      Tentukan harga serta masa aktif langganan.
                    </p>
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
                      <Label htmlFor="plan-duration">Durasi Langganan</Label>
                      <select
                        id="plan-duration"
                        value={draft.duration_months}
                        onChange={(event) =>
                          updateDraft({
                            duration_months: Number(event.target.value),
                          })
                        }
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                </div>

                <div className="border-t" />

                {/* FASILITAS */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold">Fasilitas Paket</h4>
                    <p className="text-xs text-muted-foreground">
                      Daftar manfaat yang akan diterima pelanggan.
                    </p>
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
                    Tulis satu fasilitas per baris. Setiap baris akan
                    ditampilkan sebagai satu poin fasilitas.
                  </p>
                </div>

                <div className="border-t" />

                {/* PENGATURAN TAMPILAN */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold">Pengaturan Tampilan</h4>
                    <p className="text-xs text-muted-foreground">
                      Atur urutan dan ketersediaan paket.
                    </p>
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
                      Angka lebih kecil akan ditampilkan lebih dahulu.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
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
                      <div className="min-w-0">
                        <p className="text-sm font-bold">Aktifkan Paket</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {draft.is_active
                            ? "Paket dapat ditampilkan kepada calon pelanggan."
                            : "Paket disimpan tetapi tidak ditampilkan kepada pelanggan."}
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
                    <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Paket nonaktif tetap tersimpan dan dapat diaktifkan
                        kembali kapan saja.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t bg-background px-5 py-4 sm:px-6">
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

      {/* INFORMASI */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold">
              Pertahankan riwayat paket dan transaksi
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Jika paket tidak lagi ditawarkan, nonaktifkan paket tersebut
              daripada menghapusnya. Dengan begitu, riwayat transaksi lama
              tetap dapat ditelusuri meskipun harga atau nama paket berubah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
