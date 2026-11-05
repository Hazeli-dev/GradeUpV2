
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
  CalendarClock,
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

type PublishMode = "Draft" | "Now" | "Schedule";

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
  scheduledAt: string;
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

// Mengubah ISO date menjadi format datetime-local sesuai zona waktu browser.
const toLocalDateTime = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

// Mengambil waktu lokal saat ini untuk batas minimum jadwal.
const getLocalNow = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

const formatDate = (value: string | null) => {
  if (!value) return "Belum diterbitkan";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date) + " WIB";
};

const isScheduled = (item: Announcement) => {
  return (
    item.status === "Published" &&
    !!item.published_at &&
    new Date(item.published_at).getTime() > Date.now()
  );
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
    "Semua" | "Draft" | "Published" | "Terjadwal"
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
    () =>
      items.filter(
        (item) => item.status === "Published" && !isScheduled(item)
      ).length,
    [items]
  );

  const scheduledCount = useMemo(
    () => items.filter(isScheduled).length,
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

      const scheduled = isScheduled(item);

      const matchesStatus =
        statusFilter === "Semua" ||
        (statusFilter === "Terjadwal" && scheduled) ||
        (statusFilter === "Draft" && item.status === "Draft") ||
        (statusFilter === "Published" &&
          item.status === "Published" &&
          !scheduled);

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
      scheduledAt: "",
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
      scheduledAt: toLocalDateTime(item.published_at),
    });
  };

  // Menyimpan, menerbitkan, atau menjadwalkan pengumuman.
  const save = async (mode: PublishMode) => {
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

    if (mode !== "Draft" && content.length < 10) {
      setFormError("Isi pengumuman minimal 10 karakter sebelum diterbitkan.");
      return;
    }

    let publishedAt: string | null = null;

    if (mode === "Now") {
      publishedAt = new Date().toISOString();
    }

    if (mode === "Schedule") {
      if (!draft.scheduledAt) {
        setFormError("Silakan tentukan tanggal dan jam penerbitan.");
        return;
      }

      const selectedDate = new Date(draft.scheduledAt);

      if (Number.isNaN(selectedDate.getTime())) {
        setFormError("Tanggal dan waktu penerbitan tidak valid.");
        return;
      }

      if (selectedDate.getTime() <= Date.now()) {
        setFormError(
          "Jadwal penerbitan harus lebih dari waktu sekarang."
        );
        return;
      }

      publishedAt = selectedDate.toISOString();
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

      const targetStatus: AnnouncementStatus =
        mode === "Draft" ? "Draft" : "Published";

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
      } else {
        const { error: insertError } = await supabase
          .from("announcements")
          .insert({
            ...payload,
            created_by: authData.user.id,
          });

        if (insertError) throw insertError;
      }

      if (mode === "Draft") {
        toast.success("Draft pengumuman berhasil disimpan.");
      } else if (mode === "Now") {
        toast.success(
          "Pengumuman berhasil diterbitkan untuk semua siswa."
        );
      } else {
        toast.success(
          "Pengumuman berhasil dijadwalkan."
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

  // Mengubah status pengumuman menjadi Draft.
  const changeStatus = async (item: Announcement) => {
    try {
      const { error: updateError } = await supabase
        .from("announcements")
        .update({
          status: "Draft",
          published_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast.success(
        isScheduled(item)
          ? "Jadwal penerbitan berhasil dibatalkan."
          : "Pengumuman berhasil ditarik dari publikasi."
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
        description="Buat, terbitkan, dan jadwalkan informasi resmi GradeUp untuk seluruh siswa."
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
                Buat pengumuman sekarang atau atur tanggal dan jam agar
                informasi tersedia otomatis pada waktu yang ditentukan.
              </p>
            </div>
          </div>

          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background/70 text-primary shadow-sm sm:flex">
            <CalendarClock className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarClock className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold tabular-nums">
                {loading ? "—" : scheduledCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Terjadwal
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
              Pantau pengumuman aktif, jadwal mendatang, dan draft.
            </p>
          </div>

          {!loading && !error && (
            <Badge variant="muted" className="w-fit">
              {filteredItems.length} pengumuman
            </Badge>
          )}
        </div>

        {/* PENCARIAN DAN FILTER */}
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
                event.target.value as
                  | "Semua"
                  | "Draft"
                  | "Published"
                  | "Terjadwal"
              )
            }
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary sm:w-48"
            aria-label="Filter status pengumuman"
          >
            <option value="Semua">Semua Status</option>
            <option value="Published">Sudah Terbit</option>
            <option value="Terjadwal">Terjadwal</option>
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
              const scheduled = isScheduled(item);
              const isPublished =
                item.status === "Published" && !scheduled;

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
                              : scheduled
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {scheduled ? (
                            <CalendarClock className="h-5 w-5" />
                          ) : (
                            <Megaphone className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <h4 className="font-bold tracking-tight">
                            {item.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.category}</Badge>

                            {scheduled ? (
                              <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400">
                                <CalendarClock className="mr-1 h-3 w-3" />
                                Terjadwal
                              </Badge>
                            ) : isPublished ? (
                              <Badge variant="success">
                                <Eye className="mr-1 h-3 w-3" />
                                Published
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                <FileText className="mr-1 h-3 w-3" />
                                Draft
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:shrink-0">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          {scheduled
                            ? `Terbit ${formatDate(item.published_at)}`
                            : isPublished
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

                    {/* INFORMASI STATUS */}
                    {scheduled && (
                      <div className="flex items-center gap-2 rounded-xl bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                        <Clock3 className="h-4 w-4 shrink-0" />
                        Pengumuman akan tersedia otomatis pada jadwal yang
                        ditentukan.
                      </div>
                    )}

                    {isPublished && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <Bell className="h-4 w-4 shrink-0" />
                        Pengumuman sudah tersedia untuk semua siswa.
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
                        variant={item.status === "Published" ? "outline" : "default"}
                        onClick={() => void changeStatus(item)}
                        className="gap-1.5"
                      >
                        {item.status === "Published" ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            {scheduled ? "Batalkan Jadwal" : "Tarik Publikasi"}
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Terbitkan Sekarang
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
                  Buat informasi untuk seluruh siswa dan tentukan kapan
                  pengumuman akan tersedia.
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

                {/* JADWAL PENERBITAN */}
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <CalendarClock className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold">
                        Jadwal Penerbitan
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Tentukan kapan pengumuman tersedia untuk seluruh siswa.
                        Kosongkan jika ingin menerbitkan sekarang.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="announcement-schedule">
                      Tanggal dan Jam Terbit
                    </Label>

                    <Input
                      id="announcement-schedule"
                      type="datetime-local"
                      value={draft.scheduledAt}
                      min={getLocalNow()}
                      onChange={(event) => {
                        setDraft({
                          ...draft,
                          scheduledAt: event.target.value,
                        });
                        setFormError("");
                      }}
                      disabled={saving}
                      className="h-11"
                    />

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Zona waktu mengikuti pengaturan perangkat admin.
                      Jadwal ditampilkan dalam WIB (Asia/Jakarta).
                    </p>
                  </div>

                  {draft.scheduledAt && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                      <Clock3 className="h-4 w-4 shrink-0" />
                      Jadwal:{" "}
                      {formatDate(new Date(draft.scheduledAt).toISOString())}
                    </div>
                  )}
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
                      Pengumuman yang sudah mencapai waktu penerbitan dapat
                      dilihat oleh seluruh akun siswa yang login ke GradeUp.
                    </p>
                  </div>
                </div>

                {formError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {formError}
                  </p>
                )}
              </div>

              {/* TOMBOL SIMPAN */}
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

                {draft.scheduledAt ? (
                  <Button
                    onClick={() => void save("Schedule")}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                    Jadwalkan
                  </Button>
                ) : (
                  <Button
                    onClick={() => void save("Now")}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Terbitkan Sekarang
                  </Button>
                )}
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
