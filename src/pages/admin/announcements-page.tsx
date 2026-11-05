
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Bell,
  Send,
  FileText,
  CalendarDays,
  Clock3,
  X,
  Eye,
  EyeOff,
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

import { supabase } from "@/lib/supabase";

type AnnouncementStatus = "Draft" | "Published";

type AnnouncementCategory =
  | "Umum"
  | "Akademik"
  | "Ujian"
  | "Sistem"
  | "Lainnya";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AnnouncementDraft {
  id?: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  published_at?: string | null;
}

const CATEGORIES: AnnouncementCategory[] = [
  "Umum",
  "Akademik",
  "Ujian",
  "Sistem",
  "Lainnya",
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Terjadi kesalahan. Silakan coba kembali.";

const formatDate = (value: string | null) => {
  if (!value) return "Belum diterbitkan";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<AnnouncementDraft | null>(null);
  const [removing, setRemoving] = useState<Announcement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Semua" | AnnouncementStatus
  >("Semua");
  const [formError, setFormError] = useState("");

  // Mengambil seluruh pengumuman.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("announcements")
        .select(
          "id, title, content, category, status, published_at, created_by, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setItems((data ?? []) as Announcement[]);
    } catch (err) {
      console.error("Fetch announcements error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Statistik.
  const publishedCount = useMemo(
    () => items.filter((item) => item.status === "Published").length,
    [items]
  );

  const draftCount = useMemo(
    () => items.filter((item) => item.status === "Draft").length,
    [items]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        [item.title, item.content, item.category].some((value) =>
          value.toLocaleLowerCase("id-ID").includes(keyword)
        );

      const matchesStatus =
        statusFilter === "Semua" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  // Form pengumuman baru.
  const openCreate = () => {
    setFormError("");
    setDraft({
      title: "",
      content: "",
      category: "Umum",
      status: "Draft",
      published_at: null,
    });
  };

  // Form edit.
  const openEdit = (item: Announcement) => {
    setFormError("");
    setDraft({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      status: item.status,
      published_at: item.published_at,
    });
  };

  // Menyimpan atau menerbitkan pengumuman.
  const save = async (targetStatus: AnnouncementStatus) => {
    if (!draft || saving) return;

    const title = draft.title.trim();
    const content = draft.content.trim();

    if (!title) {
      setFormError("Judul pengumuman wajib diisi.");
      return;
    }

    if (title.length < 5) {
      setFormError("Judul pengumuman minimal 5 karakter.");
      return;
    }

    if (!content) {
      setFormError("Isi pengumuman wajib diisi.");
      return;
    }

    if (targetStatus === "Published" && content.length < 10) {
      setFormError("Isi pengumuman minimal 10 karakter sebelum diterbitkan.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Sesi admin tidak ditemukan. Silakan login kembali.");
      }

      const publishedAt =
        targetStatus === "Published"
          ? draft.published_at || new Date().toISOString()
          : null;

      const payload = {
        title,
        content,
        category: draft.category,
        status: targetStatus,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      };

      if (draft.id) {
        const { error: updateError } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", draft.id);

        if (updateError) throw updateError;

        toast.success(
          targetStatus === "Published"
            ? "Pengumuman berhasil diterbitkan untuk semua siswa."
            : "Pengumuman berhasil diperbarui."
        );
      } else {
        const { error: insertError } = await supabase
          .from("announcements")
          .insert({
            ...payload,
            created_by: authData.user.id,
          });

        if (insertError) throw insertError;

        toast.success(
          targetStatus === "Published"
            ? "Pengumuman berhasil diterbitkan untuk semua siswa."
            : "Draft pengumuman berhasil disimpan."
        );
      }

      setDraft(null);
      await fetchData();
    } catch (err) {
      console.error("Save announcement error:", err);
      toast.error("Gagal menyimpan pengumuman: " + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Mengubah status Draft / Published dari daftar.
  const changeStatus = async (
    item: Announcement,
    targetStatus: AnnouncementStatus
  ) => {
    const publishedAt =
      targetStatus === "Published"
        ? item.published_at || new Date().toISOString()
        : null;

    try {
      const { error: updateError } = await supabase
        .from("announcements")
        .update({
          status: targetStatus,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast.success(
        targetStatus === "Published"
          ? "Pengumuman berhasil diterbitkan."
          : "Pengumuman dikembalikan menjadi Draft."
      );

      await fetchData();
    } catch (err) {
      console.error("Change announcement status error:", err);
      toast.error("Gagal mengubah status: " + getErrorMessage(err));
    }
  };

  // Hapus pengumuman.
  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { error: deleteError } = await supabase
        .from("announcements")
        .delete()
        .eq("id", removing.id);

      if (deleteError) throw deleteError;

      toast.success("Pengumuman berhasil dihapus.");
      setRemoving(null);
      await fetchData();
    } catch (err) {
      console.error("Delete announcement error:", err);
      toast.error("Gagal menghapus pengumuman: " + getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-7 pb-8">
      {/* HEADER */}
      <PageHeader
        title="Manajemen Pengumuman"
        description="Buat dan kelola informasi resmi GradeUp yang akan ditampilkan kepada seluruh siswa."
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
              Buat Pengumuman
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
              <Megaphone className="mr-1.5 h-3 w-3" />
              KOMUNIKASI GRADEUP
            </Badge>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Sampaikan Informasi kepada Semua Siswa
              </h2>

              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Terbitkan informasi akademik, jadwal ujian, pembaruan sistem,
                dan informasi penting lainnya melalui menu notifikasi siswa.
              </p>
            </div>
          </div>

          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:flex">
            <Megaphone className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : items.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Total pengumuman
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : publishedCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Sudah diterbitkan
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : draftCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Masih berupa Draft
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* DAFTAR PENGUMUMAN */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold tracking-tight">
              Daftar Pengumuman
            </h3>
            <p className="text-xs text-muted-foreground">
              Kelola informasi yang akan atau sudah ditampilkan kepada siswa.
            </p>
          </div>

          {!loading && !error && (
            <Badge variant="muted" className="w-fit">
              {filteredItems.length} pengumuman
            </Badge>
          )}
        </div>

        {/* PENCARIAN */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, isi, atau kategori pengumuman..."
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

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "Semua" | AnnouncementStatus
              )
            }
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary sm:w-44"
            aria-label="Filter status pengumuman"
          >
            <option value="Semua">Semua Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {/* KONTEN */}
        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10">
            <EmptyState
              title="Belum ada pengumuman"
              description="Buat pengumuman pertama untuk menyampaikan informasi kepada seluruh siswa GradeUp."
              action={
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Buat Pengumuman
                </Button>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10">
            <EmptyState
              title="Pengumuman tidak ditemukan"
              description="Coba ubah kata kunci atau filter status."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("Semua");
                  }}
                >
                  Reset Filter
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => {
              const isPublished = item.status === "Published";

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <CardContent className="space-y-4 p-5">
                    {/* IDENTITAS */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isPublished
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <Megaphone className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <h4 className="font-bold tracking-tight">
                            {item.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.category}</Badge>

                            <Badge
                              variant={isPublished ? "success" : "warning"}
                            >
                              {isPublished ? (
                                <>
                                  <Eye className="mr-1 h-3 w-3" />
                                  Published
                                </>
                              ) : (
                                <>
                                  <FileText className="mr-1 h-3 w-3" />
                                  Draft
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:shrink-0">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          {isPublished
                            ? formatDate(item.published_at)
                            : `Dibuat ${formatDate(item.created_at)}`}
                        </span>
                      </div>
                    </div>

                    {/* ISI */}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {item.content.length > 320
                        ? `${item.content.slice(0, 320)}...`
                        : item.content}
                    </p>

                    {/* TARGET */}
                    {isPublished && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <Bell className="h-4 w-4 shrink-0" />
                        Pengumuman ini sudah diterbitkan untuk semua siswa.
                      </div>
                    )}

                    {/* AKSI */}
                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(item)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant={isPublished ? "outline" : "default"}
                        onClick={() =>
                          void changeStatus(
                            item,
                            isPublished ? "Draft" : "Published"
                          )
                        }
                        className="gap-1.5"
                      >
                        {isPublished ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Tarik Publikasi
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Terbitkan
                          </>
                        )}
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
            setFormError("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {draft.id ? "Edit Pengumuman" : "Buat Pengumuman"}
                </DialogTitle>

                <DialogDescription>
                  Informasi yang diterbitkan akan muncul pada menu notifikasi
                  seluruh siswa GradeUp.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* JUDUL */}
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">
                    Judul Pengumuman <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    id="announcement-title"
                    value={draft.title}
                    onChange={(event) => {
                      setDraft({ ...draft, title: event.target.value });
                      setFormError("");
                    }}
                    placeholder="Contoh: Informasi Jadwal Tryout Nasional"
                    maxLength={120}
                    disabled={saving}
                  />

                  <p className="text-right text-[10px] text-muted-foreground">
                    {draft.title.length}/120 karakter
                  </p>
                </div>

                {/* KATEGORI */}
                <div className="space-y-2">
                  <Label htmlFor="announcement-category">Kategori</Label>

                  <select
                    id="announcement-category"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        category: event.target.value as AnnouncementCategory,
                      })
                    }
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ISI */}
                <div className="space-y-2">
                  <Label htmlFor="announcement-content">
                    Isi Pengumuman <span className="text-destructive">*</span>
                  </Label>

                  <Textarea
                    id="announcement-content"
                    value={draft.content}
                    onChange={(event) => {
                      setDraft({ ...draft, content: event.target.value });
                      setFormError("");
                    }}
                    placeholder="Tuliskan informasi yang ingin disampaikan kepada siswa..."
                    rows={8}
                    maxLength={10000}
                    disabled={saving}
                    className="resize-y"
                  />

                  <p className="text-right text-[10px] text-muted-foreground">
                    {draft.content.length}/10.000 karakter
                  </p>
                </div>

                {/* TARGET */}
                <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold">
                      Target penerima: Semua siswa
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Pengumuman yang diterbitkan dapat dilihat oleh seluruh
                      akun siswa yang sudah login ke GradeUp.
                    </p>
                  </div>
                </div>

                {formError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {formError}
                  </p>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(null);
                    setFormError("");
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  variant="soft"
                  onClick={() => void save("Draft")}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Draft
                </Button>

                <Button
                  onClick={() => void save("Published")}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Terbitkan
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
        title="Hapus pengumuman?"
        description={`Pengumuman "${removing?.title ?? ""}" akan dihapus permanen. Riwayat baca pengumuman tersebut juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`}
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />
    </div>
  );
}
