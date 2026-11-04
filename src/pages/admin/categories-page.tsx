
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Tag,
  BookOpen,
  Palette,
  Hash,
  FolderOpen,
  AlertTriangle,
  X,
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";

import { supabase } from "@/lib/supabase";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  created_at?: string;
}

const DEFAULT_COLOR = "#10B981";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Terjadi kesalahan. Silakan coba kembali.";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<CategoryItem> | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CategoryItem | null>(null);
  const [search, setSearch] = useState("");

  // Mengambil kategori dan jumlah kursus dari Supabase.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoryResult, courseResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, slug, description, color, created_at")
          .order("name", { ascending: true }),

        supabase
          .from("courses")
          .select("category"),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (courseResult.error) throw courseResult.error;

      const counts: Record<string, number> = {};

      (courseResult.data ?? []).forEach((course) => {
        if (course.category) {
          counts[course.category] = (counts[course.category] || 0) + 1;
        }
      });

      setCourseCounts(counts);
      setItems((categoryResult.data ?? []) as CategoryItem[]);
    } catch (error) {
      console.error("Fetch categories error:", error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const countFor = (name: string) => courseCounts[name] || 0;

  // Statistik kategori.
  const totalCourses = useMemo(
    () =>
      Object.values(courseCounts).reduce(
        (total, count) => total + count,
        0
      ),
    [courseCounts]
  );

  const usedCategories = useMemo(
    () => items.filter((item) => countFor(item.name) > 0).length,
    [items, courseCounts]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");

    if (!keyword) return items;

    return items.filter((item) =>
      [
        item.name,
        item.slug,
        item.description ?? "",
      ].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(keyword)
      )
    );
  }, [items, search]);

  // Membuka form tambah kategori.
  const openCreate = () => {
    setErr({});
    setDraft({
      name: "",
      description: "",
      color: DEFAULT_COLOR,
    });
  };

  // Membuka form edit kategori.
  const openEdit = (item: CategoryItem) => {
    setErr({});
    setDraft({ ...item });
  };

  // Simpan kategori baru atau perbarui kategori.
  const save = async () => {
    if (!draft) return;

    const validationErrors: Record<string, string> = {};
    const trimmedName = draft.name?.trim() ?? "";
    const generatedSlug = slugify(trimmedName);

    if (!trimmedName) {
      validationErrors.name = "Nama kategori wajib diisi.";
    } else if (
      items.some(
        (item) =>
          item.name.toLowerCase() === trimmedName.toLowerCase() &&
          item.id !== draft.id
      )
    ) {
      validationErrors.name = "Nama kategori sudah digunakan.";
    }

    if (trimmedName && !generatedSlug) {
      validationErrors.name =
        "Nama kategori harus mengandung huruf atau angka.";
    }

    if (
      generatedSlug &&
      items.some(
        (item) =>
          item.slug.toLowerCase() === generatedSlug.toLowerCase() &&
          item.id !== draft.id
      )
    ) {
      validationErrors.name =
        "Slug kategori sudah digunakan. Gunakan nama yang berbeda.";
    }

    setErr(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);

    const payload = {
      name: trimmedName,
      slug: generatedSlug,
      description: draft.description?.trim() || "",
      color: draft.color || DEFAULT_COLOR,
    };

    try {
      if (draft.id) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", draft.id);

        if (error) throw error;

        toast.success("Kategori berhasil diperbarui.");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([payload]);

        if (error) throw error;

        toast.success("Kategori berhasil ditambahkan.");
      }

      setDraft(null);
      setErr({});
      await fetchData();
    } catch (error) {
      console.error("Save category error:", error);
      toast.error("Gagal menyimpan kategori: " + getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Hapus kategori.
  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", removing.id);

      if (error) throw error;

      toast.success("Kategori berhasil dihapus.");
      setRemoving(null);
      await fetchData();
    } catch (error) {
      console.error("Delete category error:", error);
      toast.error("Gagal menghapus kategori: " + getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-7 pb-8">
      {/* HEADER */}
      <PageHeader
        title="Kategori Materi"
        description="Kelola pengelompokan materi pembelajaran agar katalog GradeUp lebih terstruktur."
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
              Tambah Kategori
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
              <Tag className="mr-1.5 h-3 w-3" />
              MANAJEMEN KATALOG
            </Badge>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Atur Materi Lebih Terstruktur
              </h2>

              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Buat dan kelola kategori pembelajaran untuk membantu
                siswa menemukan kursus berdasarkan mata pelajaran,
                bidang keahlian, dan topik yang diminati.
              </p>
            </div>
          </div>

          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:flex">
            <FolderOpen className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : items.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Total kategori
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : totalCourses}
              </p>
              <p className="text-xs text-muted-foreground">
                Total materi
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderOpen className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : usedCategories}
              </p>
              <p className="text-xs text-muted-foreground">
                Kategori digunakan
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* DAFTAR KATEGORI */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold tracking-tight">
              Daftar Kategori
            </h3>
            <p className="text-xs text-muted-foreground">
              Kelola identitas, deskripsi, dan penggunaan setiap kategori.
            </p>
          </div>

          {!loading && !error && (
            <Badge variant="secondary" className="w-fit">
              {filteredItems.length} kategori
            </Badge>
          )}
        </div>

        {/* PENCARIAN */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama kategori, deskripsi, atau slug..."
            className="h-11 pl-9 pr-10"
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

        {/* STATUS */}
        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10">
            <EmptyState
              title="Belum ada kategori"
              description="Tambahkan kategori pertama untuk mulai mengelompokkan materi pembelajaran."
              action={
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Kategori
                </Button>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10">
            <EmptyState
              title="Kategori tidak ditemukan"
              description="Coba gunakan kata kunci pencarian yang berbeda."
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
            {filteredItems.map((item) => {
              const count = countFor(item.name);
              const color = item.color || DEFAULT_COLOR;

              return (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: color }}
                  />

                  <CardContent className="space-y-5 p-5 pt-6">
                    {/* IDENTITAS */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
                          style={{
                            backgroundColor: `${color}18`,
                            color,
                          }}
                        >
                          <Tag className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="truncate font-bold tracking-tight">
                            {item.name}
                          </h4>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            Kategori pembelajaran
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={count > 0 ? "secondary" : "outline"}
                        className="shrink-0"
                      >
                        {count} materi
                      </Badge>
                    </div>

                    {/* DESKRIPSI */}
                    <div className="min-h-[76px] space-y-2">
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {item.description || "Belum ada deskripsi kategori."}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Hash className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.slug}</span>
                      </div>
                    </div>

                    {/* PENGGUNAAN */}
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        Penggunaan kategori
                      </span>

                      <span className="text-xs font-bold tabular-nums">
                        {count > 0
                          ? `${count} kursus`
                          : "Belum digunakan"}
                      </span>
                    </div>

                    {/* AKSI */}
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(item)}
                        className="flex-1 gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoving(item)}
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* FORM TAMBAH / EDIT */}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setErr({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {draft.id ? "Edit Kategori" : "Tambah Kategori"}
                </DialogTitle>

                <DialogDescription>
                  Lengkapi identitas kategori yang akan digunakan
                  untuk mengelompokkan kursus GradeUp.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* NAMA */}
                <div className="space-y-2">
                  <Label htmlFor="k-name">
                    Nama Kategori <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    id="k-name"
                    value={draft.name ?? ""}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        name: event.target.value,
                      });

                      if (err.name) {
                        setErr({});
                      }
                    }}
                    placeholder="Contoh: Matematika"
                    maxLength={80}
                    disabled={saving}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <FieldError message={err.name} />
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {(draft.name ?? "").length}/80
                    </span>
                  </div>
                </div>

                {/* SLUG PREVIEW */}
                <div className="space-y-2">
                  <Label>Slug URL</Label>

                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs text-muted-foreground">
                      {slugify(draft.name ?? "") || "slug-kategori"}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Slug dibuat otomatis berdasarkan nama kategori.
                  </p>
                </div>

                {/* DESKRIPSI */}
                <div className="space-y-2">
                  <Label htmlFor="k-desc">Deskripsi</Label>

                  <Textarea
                    id="k-desc"
                    value={draft.description ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        description: event.target.value,
                      })
                    }
                    placeholder="Tuliskan deskripsi singkat kategori ini..."
                    rows={4}
                    maxLength={300}
                    disabled={saving}
                  />

                  <p className="text-right text-[10px] text-muted-foreground">
                    {(draft.description ?? "").length}/300 karakter
                  </p>
                </div>

                {/* WARNA */}
                <div className="space-y-2">
                  <Label htmlFor="k-color">Warna Identitas</Label>

                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Input
                      id="k-color"
                      type="color"
                      value={draft.color || DEFAULT_COLOR}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          color: event.target.value,
                        })
                      }
                      disabled={saving}
                      className="h-10 w-14 cursor-pointer p-1"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        Warna kategori
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.color || DEFAULT_COLOR}
                      </p>
                    </div>

                    <div
                      className="h-8 w-8 shrink-0 rounded-lg border shadow-sm"
                      style={{
                        backgroundColor: draft.color || DEFAULT_COLOR,
                      }}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(null);
                    setErr({});
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  onClick={save}
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
                      {draft.id ? "Simpan Perubahan" : "Tambah Kategori"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* KONFIRMASI HAPUS */}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Hapus kategori?"
        description={
          removing && countFor(removing.name) > 0
            ? `Kategori "${removing.name}" masih digunakan oleh ${countFor(removing.name)} materi. Penghapusan dapat ditolak oleh database jika masih ada relasi yang mengharuskan kategori tetap tersedia.`
            : `Kategori "${removing?.name ?? ""}" akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`
        }
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />

      {/* INFORMASI */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold">
              Perhatikan penggunaan kategori
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Sebelum menghapus kategori, pastikan tidak ada kursus
              yang masih menggunakannya. Mengubah nama kategori juga
              tidak otomatis mengubah nilai kategori pada kursus yang
              sudah tersimpan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
