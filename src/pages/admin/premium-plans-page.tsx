
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
  Wallet,
  Sparkles,
  AlertTriangle,
  X,
  Package,
  Power,
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
  if (months === 1) return "1 Bulan";
  return `${months} Bulan`;
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
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [search, setSearch] = useState("");
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
        features: Array.isArray(item.features)
          ? item.features
          : [],
      })) as PremiumPlan[];

      setItems(mapped);
    } catch (error) {
      console.error("Fetch premium plans error:", error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activePlans = items.filter((item) => item.is_active).length;

  const totalDuration = items.reduce(
    (total, item) => total + item.duration_months,
    0
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return items;

    return items.filter((item) =>
      [
        item.name,
        item.code,
        item.description ?? "",
      ].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [items, search]);

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
    if (!draft) return;

    const errors: Record<string, string> = {};

    const name = draft.name.trim();
    const code = createCode(draft.code || name);

    const parsedPrice =
      draft.price.trim() === ""
        ? null
        : Number(draft.price.replace(/[^\d]/g, ""));

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
      errors.price = "Harga tidak valid.";
    }

    if (draft.is_active && (!parsedPrice || parsedPrice <= 0)) {
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

    if (
      !DURATION_OPTIONS.includes(draft.duration_months)
    ) {
      errors.duration_months = "Durasi paket tidak valid.";
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
    } catch (error) {
      console.error("Save premium plan error:", error);
      toast.error(
        "Gagal menyimpan paket: " + getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: PremiumPlan) => {
    if (!item.is_active && (!item.price || item.price <= 0)) {
      toast.error("Tentukan harga paket sebelum mengaktifkannya.");
      return;
    }

    const newStatus = !item.is_active;

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
    } catch (error) {
      console.error("Toggle premium plan error:", error);
      toast.error(
        "Gagal mengubah status: " + getErrorMessage(error)
      );
    }
  };

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Manajemen Paket Premium"
        description="Atur harga, durasi berlangganan, fasilitas, dan ketersediaan paket Premium GradeUp."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Paket
            </Button>
          </div>
        }
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background/70 text-primary"
            >
              <Crown className="mr-1.5 h-3 w-3" />
              PENGELOLAAN LANGGANAN
            </Badge>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Kelola Penawaran Premium
              </h2>

              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Atur paket berlangganan GradeUp secara fleksibel.
                Perubahan harga dan fasilitas dapat dilakukan
                langsung dari dashboard admin.
              </p>
            </div>
          </div>

          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:flex">
            <Crown className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : items.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Total paket
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : activePlans}
              </p>
              <p className="text-xs text-muted-foreground">
                Paket aktif
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : totalDuration}
              </p>
              <p className="text-xs text-muted-foreground">
                Total durasi (bulan)
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* DAFTAR PAKET */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Daftar Paket
            </h3>
            <p className="text-xs text-muted-foreground">
              Kelola paket yang tersedia untuk pelanggan GradeUp.
            </p>
          </div>

          {!loading && !error && (
            <Badge variant="muted">
              {filteredItems.length} paket
            </Badge>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau kode paket..."
            className="h-11 pl-9 pr-10"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-10">
            <EmptyState
              title="Belum ada paket Premium"
              description="Tambahkan paket pertama untuk mulai mengelola langganan."
              action={
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Paket
                </Button>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-10">
            <EmptyState
              title="Paket tidak ditemukan"
              description="Coba kata kunci pencarian lain."
              action={
                <Button
                  variant="outline"
                  onClick={() => setSearch("")}
                >
                  Reset pencarian
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

                <CardContent className="space-y-5 p-5 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Crown className="h-6 w-6" />
                    </div>

                    <Badge
                      variant={item.is_active ? "success" : "outline"}
                    >
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-extrabold tracking-tight">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {item.code}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-[11px] text-muted-foreground">
                      Harga berlangganan
                    </p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight">
                      {formatRupiah(item.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDuration(item.duration_months)}
                    </p>
                  </div>

                  <div className="min-h-[110px] space-y-2">
                    <p className="text-xs font-bold">
                      Fasilitas paket
                    </p>

                    {item.features.length > 0 ? (
                      <ul className="space-y-2">
                        {item.features.slice(0, 5).map((feature, index) => (
                          <li
                            key={`${item.id}-${index}`}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {item.features.length > 5 && (
                          <li className="text-[11px] text-muted-foreground">
                            +{item.features.length - 5} fasilitas lainnya
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Belum ada fasilitas yang ditambahkan.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      Urutan tampilan
                    </span>
                    <span className="text-xs font-bold">
                      {item.sort_order}
                    </span>
                  </div>

                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant={item.is_active ? "ghost" : "soft"}
                      className={
                        item.is_active
                          ? "gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "gap-1.5"
                      }
                      onClick={() => void toggleActive(item)}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* FORM TAMBAH / EDIT */}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setValidation({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {draft.id ? "Edit Paket Premium" : "Tambah Paket Premium"}
                </DialogTitle>
                <DialogDescription>
                  Atur identitas, harga, durasi, dan fasilitas paket.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
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
                        code: draft.id ? draft.code : createCode(event.target.value),
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
                  <p className="text-[10px] text-muted-foreground">
                    Kode unik untuk identifikasi paket di database.
                  </p>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plan-price">
                      Harga (Rupiah) <span className="text-destructive">*</span>
                    </Label>
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
                      disabled={saving}
                    />
                    {validation.price && (
                      <p className="text-xs text-destructive">
                        {validation.price}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-duration">Durasi</Label>
                    <select
                      id="plan-duration"
                      value={draft.duration_months}
                      onChange={(event) =>
                        updateDraft({
                          duration_months: Number(event.target.value),
                        })
                      }
                      disabled={saving}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

                <div className="space-y-2">
                  <Label htmlFor="plan-features">Fasilitas Paket</Label>
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
                  <p className="text-[10px] text-muted-foreground">
                    Tulis satu fasilitas per baris.
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
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {draft.is_active ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        Status Paket
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draft.is_active
                          ? "Paket dapat ditampilkan kepada calon pelanggan."
                          : "Paket tidak ditampilkan kepada calon pelanggan."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.is_active}
                    disabled={saving}
                    onClick={() =>
                      updateDraft({ is_active: !draft.is_active })
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      draft.is_active ? "bg-primary" : "bg-muted-foreground/30"
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
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs text-muted-foreground">
                      Paket nonaktif tetap tersimpan di database dan dapat
                      diaktifkan kembali kapan saja.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
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
                      <Plus className="h-4 w-4" />
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
              Pengelolaan paket dan riwayat transaksi
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Sebaiknya nonaktifkan paket yang tidak lagi ditawarkan,
              bukan menghapusnya. Riwayat transaksi perlu tetap dapat
              ditelusuri meskipun harga atau nama paket berubah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
