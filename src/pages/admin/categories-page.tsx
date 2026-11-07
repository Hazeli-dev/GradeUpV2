
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Tag,
  BookOpen,
  Hash,
  FolderOpen,
  AlertTriangle,
  X,
  Layers3,
  Palette,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ChevronDown,
  ShieldAlert,
  FileSpreadsheet,
  Upload,
  Download,
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

interface ExcelCategoryRow {
  name: string;
  description: string;
  color: string;
  slug: string;
  valid: boolean;
  message: string;
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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ??
        "Terjadi kesalahan."
    );
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
};

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const normalizeExcelValue = (value: unknown) =>
  String(value ?? "").trim();

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<CategoryItem> | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CategoryItem | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "courses" | "newest">(
    "name"
  );

  // State import Excel.
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [excelRows, setExcelRows] = useState<ExcelCategoryRow[]>([]);
  const [excelFileName, setExcelFileName] = useState("");

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

        supabase.from("courses").select("category"),
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
    } catch (fetchError) {
      console.error("Fetch categories error:", fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const countFor = useCallback(
    (name: string) => courseCounts[name] || 0,
    [courseCounts]
  );

  // Statistik.
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
    [items, countFor]
  );

  const unusedCategories = items.length - usedCategories;

  // Pencarian dan pengurutan.
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");

    const result = items.filter((item) =>
      [item.name, item.slug, item.description ?? ""].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(keyword)
      )
    );

    return [...result].sort((a, b) => {
      if (sortBy === "courses") {
        return countFor(b.name) - countFor(a.name);
      }

      if (sortBy === "newest") {
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      }

      return a.name.localeCompare(b.name, "id");
    });
  }, [items, search, sortBy, countFor]);

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
    if (!draft || saving) return;

    const validationErrors: Record<string, string> = {};
    const trimmedName = draft.name?.trim() ?? "";
    const generatedSlug = slugify(trimmedName);

    if (!trimmedName) {
      validationErrors.name = "Nama kategori wajib diisi.";
    } else if (trimmedName.length > 80) {
      validationErrors.name = "Nama kategori maksimal 80 karakter.";
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

    if ((draft.description?.length ?? 0) > 300) {
      validationErrors.description =
        "Deskripsi maksimal 300 karakter.";
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
    } catch (saveError) {
      console.error("Save category error:", saveError);
      toast.error(
        "Gagal menyimpan kategori: " + getErrorMessage(saveError)
      );
    } finally {
      setSaving(false);
    }
  };

  // Hapus kategori.
  const handleDelete = async () => {
    if (!removing || deleting) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", removing.id);

      if (error) throw error;

      toast.success("Kategori berhasil dihapus.");
      setRemoving(null);
      await fetchData();
    } catch (deleteError) {
      console.error("Delete category error:", deleteError);
      toast.error(
        "Gagal menghapus kategori: " + getErrorMessage(deleteError)
      );
    } finally {
      setDeleting(false);
    }
  };

  // Mengunduh template Excel.
  const downloadCategoryTemplate = () => {
    const data = [
      ["name", "description", "color"],
      [
        "Matematika",
        "Materi pembelajaran matematika untuk siswa SD.",
        "#3B82F6",
      ],
      [
        "IPA",
        "Materi ilmu pengetahuan alam.",
        "#10B981",
      ],
      [
        "Bahasa Inggris",
        "Materi pembelajaran bahasa Inggris.",
        "#8B5CF6",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 65 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Kategori"
    );

    const instructionSheet = XLSX.utils.aoa_to_sheet([
      ["PETUNJUK PENGISIAN TEMPLATE KATEGORI GRADEUP"],
      [""],
      ["Kolom", "Keterangan"],
      ["name", "Wajib diisi. Nama kategori maksimal 80 karakter."],
      ["description", "Opsional. Deskripsi maksimal 300 karakter."],
      ["color", "Opsional. Gunakan format HEX, contoh #3B82F6."],
      [""],
      ["CATATAN"],
      ["1. Jangan mengubah nama kolom pada baris pertama sheet Kategori."],
      ["2. Setiap baris mewakili satu kategori."],
      ["3. Slug akan dibuat otomatis oleh GradeUp."],
      ["4. Hapus contoh data sebelum memasukkan data sebenarnya."],
      ["5. Kategori dengan nama yang sudah terdaftar akan dilewati."],
    ]);

    instructionSheet["!cols"] = [
      { wch: 24 },
      { wch: 85 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      instructionSheet,
      "Petunjuk"
    );

    XLSX.writeFile(
      workbook,
      "Template-Kategori-GradeUp.xlsx"
    );
  };

  // Membaca dan memvalidasi file Excel.
  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["xlsx", "xls"].includes(extension ?? "")) {
        toast.error("Gunakan file Excel .xlsx atau .xls.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 10 MB.");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        toast.error("Sheet Excel tidak ditemukan.");
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(firstSheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        toast.error("File Excel belum berisi data.");
        return;
      }

      const existingNames = new Set(
        items.map((item) =>
          item.name.trim().toLocaleLowerCase("id-ID")
        )
      );

      const usedSlugs = new Set(
        items.map((item) => item.slug.trim().toLowerCase())
      );

      const seenNames = new Set<string>();

      const rows: ExcelCategoryRow[] = rawRows.map((raw) => {
        const normalized: Record<string, unknown> = {};

        Object.entries(raw).forEach(([key, value]) => {
          normalized[key.trim().toLowerCase()] = value;
        });

        const name = normalizeExcelValue(normalized.name);
        const description = normalizeExcelValue(
          normalized.description
        );
        const rawColor = normalizeExcelValue(normalized.color);

        const normalizedName = name.toLocaleLowerCase("id-ID");

        let valid = true;
        let message = "Siap diimpor";

        if (!name) {
          valid = false;
          message = "Nama kategori wajib diisi.";
        } else if (name.length > 80) {
          valid = false;
          message = "Nama maksimal 80 karakter.";
        } else if (description.length > 300) {
          valid = false;
          message = "Deskripsi maksimal 300 karakter.";
        } else if (
          rawColor &&
          !/^#[0-9A-Fa-f]{6}$/.test(rawColor)
        ) {
          valid = false;
          message = "Format warna harus HEX, contoh #10B981.";
        } else if (
          existingNames.has(normalizedName) ||
          seenNames.has(normalizedName)
        ) {
          valid = false;
          message =
            "Nama kategori sudah terdaftar atau duplikat.";
        }

        const generatedSlug = slugify(name);

        if (valid && !generatedSlug) {
          valid = false;
          message =
            "Nama harus mengandung huruf atau angka.";
        }

        let uniqueSlug = generatedSlug;
        let suffix = 2;

        while (
          uniqueSlug &&
          usedSlugs.has(uniqueSlug.toLowerCase())
        ) {
          uniqueSlug = `${generatedSlug}-${suffix}`;
          suffix++;
        }

        if (valid) {
          seenNames.add(normalizedName);
          usedSlugs.add(uniqueSlug.toLowerCase());
        }

        return {
          name,
          description,
          color: rawColor ? rawColor.toUpperCase() : DEFAULT_COLOR,
          slug: uniqueSlug,
          valid,
          message,
        };
      });

      setExcelRows(rows);
      setExcelFileName(file.name);
      setImportOpen(true);

      const validCount = rows.filter((row) => row.valid).length;
      const invalidCount = rows.length - validCount;

      toast.success(
        `File berhasil dibaca. ${validCount} kategori siap diimpor${
          invalidCount > 0
            ? ` dan ${invalidCount} baris perlu diperbaiki`
            : ""
        }.`
      );
    } catch (uploadError) {
      console.error("Read Excel error:", uploadError);
      toast.error("Gagal membaca file Excel.");
    } finally {
      event.target.value = "";
    }
  };

  // Menyimpan kategori hasil import ke Supabase.
  const importExcelCategories = async () => {
    if (importing) return;

    const validRows = excelRows.filter((row) => row.valid);

    if (validRows.length === 0) {
      toast.error("Tidak ada kategori valid untuk diimpor.");
      return;
    }

    setImporting(true);

    try {
      const payload = validRows.map((row) => ({
        name: row.name,
        slug: row.slug,
        description: row.description,
        color: row.color,
      }));

      const { error } = await supabase
        .from("categories")
        .insert(payload);

      if (error) throw error;

      toast.success(
        `${payload.length} kategori berhasil diimpor ke GradeUp.`
      );

      setImportOpen(false);
      setExcelRows([]);
      setExcelFileName("");

      await fetchData();
    } catch (importError) {
      console.error("Import categories error:", importError);

      toast.error(
        "Import gagal: " + getErrorMessage(importError)
      );
    } finally {
      setImporting(false);
    }
  };

  // Menutup dialog import dan membersihkan pratinjau.
  const closeImportDialog = () => {
    if (importing) return;

    setImportOpen(false);
    setExcelRows([]);
    setExcelFileName("");
  };

  return (
    <div className="min-w-0 space-y-6 pb-10">
      {/* HEADER */}
      <PageHeader
        title="Kategori Materi"
        description="Kelola pengelompokan materi pembelajaran dan struktur katalog GradeUp."
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

            <Button
              variant="outline"
              onClick={downloadCategoryTemplate}
              className="h-9 gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">
                Template Excel
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="h-9 gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Import Excel</span>
            </Button>

            <Button onClick={openCreate} className="h-9 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </Button>
          </div>
        }
      />

      {/* INTRODUCTION */}
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="h-6 w-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Pengelolaan Katalog Pembelajaran
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  CONTENT MANAGEMENT
                </Badge>
              </div>

              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Atur kategori berdasarkan mata pelajaran, jenjang,
                bidang keahlian, atau topik pembelajaran agar katalog
                kursus lebih mudah dikelola dan ditemukan siswa.
              </p>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Modul administrasi
              </p>
              <p className="text-xs font-semibold">
                Kategori Materi
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STATISTICS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Total kategori
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : items.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Total kursus
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : totalCourses}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Kategori digunakan
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : usedCategories}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <CircleDashed className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Belum digunakan
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {loading ? "—" : unusedCategories}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CATEGORY TABLE */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              Daftar Kategori
            </h3>
            <p className="text-xs text-muted-foreground">
              Kelola identitas, warna, dan penggunaan kategori pembelajaran.
            </p>
          </div>

          {!loading && !error && (
            <span className="text-xs text-muted-foreground">
              {filteredItems.length} dari {items.length} kategori
            </span>
          )}
        </div>

        {/* TOOLBAR */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama kategori, slug, atau deskripsi..."
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

            <div className="relative sm:w-48">
              <Palette className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <select
                aria-label="Urutkan kategori"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as "name" | "courses" | "newest"
                  )
                }
                className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-ring"
              >
                <option value="name">Nama kategori</option>
                <option value="courses">Jumlah kursus</option>
                <option value="newest">Kategori terbaru</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* CONTENT STATES */}
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
          <div className="rounded-xl border border-dashed px-4 py-10">
            <EmptyState
              title="Kategori tidak ditemukan"
              description="Tidak ada kategori yang sesuai dengan kata kunci pencarian."
              action={
                <Button
                  variant="outline"
                  onClick={() => setSearch("")}
                >
                  Reset Pencarian
                </Button>
              }
            />
          </div>
        ) : (
          <Card className="overflow-hidden">
            {/* TABLE HEADER */}
            <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  Data Kategori Pembelajaran
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Terhubung dengan data kursus GradeUp
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
                      Informasi Kategori
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Identitas Slug
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Kursus
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Warna
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Dibuat
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tindakan
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredItems.map((item, index) => {
                    const count = countFor(item.name);
                    const color = item.color || DEFAULT_COLOR;

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-muted/20"
                      >
                        <td className="px-5 py-4 text-center text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </td>

                        <td className="max-w-[280px] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `${color}18`,
                                color,
                              }}
                            >
                              <Tag className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {item.name}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                {item.description ||
                                  "Belum ada deskripsi kategori."}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[160px] truncate">
                              {item.slug}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant={count > 0 ? "success" : "outline"}
                            className="font-medium"
                          >
                            {count} kursus
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className="h-5 w-5 rounded-md border shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[10px] font-medium uppercase text-muted-foreground">
                              {color}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(item.created_at)}
                          </div>
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
                              variant="ghost"
                              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setRemoving(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}
            <div className="divide-y md:hidden">
              {filteredItems.map((item, index) => {
                const count = countFor(item.name);
                const color = item.color || DEFAULT_COLOR;

                return (
                  <div key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${color}18`,
                            color,
                          }}
                        >
                          <Tag className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {item.name}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {item.slug}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={count > 0 ? "success" : "outline"}
                      >
                        {count} kursus
                      </Badge>
                    </div>

                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description ||
                        "Belum ada deskripsi kategori."}
                    </p>

                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Warna identitas
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-medium uppercase">
                            {color}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Tanggal dibuat
                        </p>
                        <p className="mt-1.5 text-xs font-medium">
                          {formatDate(item.created_at)}
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
                        Edit Kategori
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRemoving(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>

                    <p className="text-right text-[10px] text-muted-foreground">
                      Kategori #{index + 1}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* TABLE FOOTER */}
            <div className="flex flex-col gap-1 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[11px] text-muted-foreground">
                Menampilkan {filteredItems.length} kategori
              </p>
              <p className="text-[11px] text-muted-foreground">
                Data tersimpan di Supabase
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* DIALOG IMPORT EXCEL */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeImportDialog();
          } else {
            setImportOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div>
                <DialogTitle>
                  Import Kategori dari Excel
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Unggah file Excel untuk menambahkan banyak kategori
                  sekaligus.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* UPLOAD AREA */}
            <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-2 text-sm font-semibold">
                Pilih file Excel
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Format yang didukung: .xlsx dan .xls. Maksimal 10 MB.
              </p>

              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => void handleExcelUpload(event)}
                disabled={importing}
                className="mx-auto mt-4 max-w-sm cursor-pointer"
              />

              {excelFileName && (
                <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <p className="truncate text-xs font-medium text-primary">
                    {excelFileName}
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={downloadCategoryTemplate}
                className="mt-2 gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh template Excel
              </Button>
            </div>

            {/* FORMAT INFORMATION */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold">
                Format kolom Excel
              </p>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium">
                    name <span className="text-destructive">*</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Nama kategori, wajib diisi.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium">
                    description
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Deskripsi maksimal 300 karakter.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium">
                    color
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Warna HEX, contoh #3B82F6.
                  </p>
                </div>
              </div>
            </div>

            {/* PREVIEW */}
            {excelRows.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Total baris
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums">
                        {excelRows.length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Siap diimpor
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600">
                        {excelRows.filter((row) => row.valid).length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2 sm:col-span-1">
                    <CardContent className="p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Perlu diperbaiki
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-destructive">
                        {excelRows.filter((row) => !row.valid).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-bold">
                      Pratinjau Data
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Baris yang tidak valid akan dilewati. Periksa
                      kembali data sebelum menyimpannya.
                    </p>
                  </div>

                  <div className="max-h-72 overflow-auto rounded-lg border">
                    <table className="w-full min-w-[650px] text-left text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="px-3 py-3">
                            Nama kategori
                          </th>
                          <th className="px-3 py-3">
                            Deskripsi
                          </th>
                          <th className="px-3 py-3">
                            Warna
                          </th>
                          <th className="px-3 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {excelRows.map((row, index) => (
                          <tr
                            key={`${row.name}-${index}`}
                            className={
                              row.valid ? "" : "bg-destructive/5"
                            }
                          >
                            <td className="px-3 py-3 font-medium">
                              {row.name || "-"}
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {row.slug || "Slug tidak tersedia"}
                              </p>
                            </td>

                            <td className="max-w-[220px] px-3 py-3">
                              <p className="line-clamp-2 text-muted-foreground">
                                {row.description || "Tanpa deskripsi"}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-4 w-4 shrink-0 rounded border"
                                  style={{
                                    backgroundColor: row.color,
                                  }}
                                />
                                <span>{row.color}</span>
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              {row.valid ? (
                                <Badge variant="success">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Siap
                                </Badge>
                              ) : (
                                <div className="max-w-[150px]">
                                  <Badge variant="destructive">
                                    Dilewati
                                  </Badge>
                                  <p className="mt-1 text-[10px] leading-relaxed text-destructive">
                                    {row.message}
                                  </p>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-4 sm:gap-2">
            <Button
              variant="outline"
              onClick={closeImportDialog}
              disabled={importing}
            >
              Batal
            </Button>

            <Button
              onClick={() => void importExcelCategories()}
              disabled={
                importing ||
                !excelRows.some((row) => row.valid)
              }
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import{" "}
                  {excelRows.filter((row) => row.valid).length} Kategori
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          {draft && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {draft.id ? (
                      <Pencil className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <DialogTitle className="text-base font-bold">
                      {draft.id ? "Edit Kategori" : "Tambah Kategori"}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs">
                      Atur identitas dan tampilan kategori pembelajaran.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* IDENTITAS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Identitas Kategori
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Nama dan alamat identifikasi kategori.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="k-name">
                      Nama Kategori{" "}
                      <span className="text-destructive">*</span>
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
                          setErr((current) => ({
                            ...current,
                            name: "",
                          }));
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

                  <div className="space-y-2">
                    <Label>Slug URL</Label>

                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
                      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-medium text-muted-foreground">
                        {slugify(draft.name ?? "") || "slug-kategori"}
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Slug dibuat otomatis berdasarkan nama kategori.
                    </p>
                  </div>
                </section>

                {/* DESKRIPSI */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Deskripsi Kategori
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Penjelasan singkat mengenai kategori.
                      </p>
                    </div>
                  </div>

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

                  <div className="flex items-center justify-between">
                    <FieldError message={err.description} />
                    <p className="text-right text-[10px] text-muted-foreground">
                      {(draft.description ?? "").length}/300 karakter
                    </p>
                  </div>
                </section>

                {/* WARNA */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold">
                        Identitas Visual
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Tentukan warna pembeda kategori.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border p-3">
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
                      className="h-11 w-14 cursor-pointer p-1"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        Warna kategori
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase text-muted-foreground">
                        {draft.color || DEFAULT_COLOR}
                      </p>
                    </div>

                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        backgroundColor: `${draft.color || DEFAULT_COLOR}18`,
                        color: draft.color || DEFAULT_COLOR,
                      }}
                    >
                      <Tag className="h-5 w-5" />
                    </div>
                  </div>
                </section>

                {/* PREVIEW */}
                <section className="space-y-2">
                  <Label>Pratinjau Kategori</Label>

                  <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${draft.color || DEFAULT_COLOR}18`,
                        color: draft.color || DEFAULT_COLOR,
                      }}
                    >
                      <Tag className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {draft.name?.trim() || "Nama Kategori"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {slugify(draft.name ?? "") || "slug-kategori"}
                      </p>
                    </div>

                    <Badge variant="outline" className="ml-auto shrink-0">
                      Preview
                    </Badge>
                  </div>
                </section>
              </div>

              <DialogFooter className="gap-2 border-t pt-4 sm:gap-2">
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
                      {draft.id
                        ? "Simpan Perubahan"
                        : "Tambah Kategori"}
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
        onOpenChange={(open) => {
          if (!open && !deleting) setRemoving(null);
        }}
        title="Hapus kategori?"
        description={
          removing && countFor(removing.name) > 0
            ? `Kategori "${removing.name}" masih digunakan oleh ${countFor(removing.name)} kursus. Penghapusan mungkin ditolak oleh database jika masih ada relasi yang mengharuskan kategori tetap tersedia.`
            : `Kategori "${removing?.name ?? ""}" akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`
        }
        destructive
        confirmLabel={deleting ? "Menghapus..." : "Hapus Permanen"}
        onConfirm={handleDelete}
      />

      {/* INFORMATION */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-bold">
              Catatan pengelolaan kategori
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Jika nama kategori diubah, nilai kategori pada kursus yang
              sudah tersimpan tidak otomatis ikut berubah karena kursus
              saat ini menggunakan nama kategori. Periksa kembali kursus
              terkait setelah melakukan perubahan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
