
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  BookOpen,
  ArrowLeft,
  Save,
  CheckCircle2,
  Cloud,
  AlertCircle,
} from "lucide-react";

import { toast } from "sonner";

import type { JSONContent } from "@tiptap/core";

import EditorCanvas from "@/components/admin/content-editor/EditorCanvas";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";

import { PublishBadge } from "@/components/admin/badges";
import { FieldError } from "@/components/auth/auth-bits";

import { LEVELS } from "@/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

import type { Level } from "@/types";

/* =========================================
   TYPES
========================================= */

const gradients = [
  "from-teal-600 to-emerald-400",
  "from-emerald-600 to-teal-400",
  "from-green-600 to-lime-400",
  "from-cyan-600 to-emerald-400",
];

interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  instructor: string;
  premium: boolean;
  status: "Published" | "Draft";
  thumbnail?: string;
  created_at?: string;
}

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  instructor: string;
  premium: boolean;
  published: boolean;
};

type SaveStatus =
  | "saved"
  | "dirty"
  | "saving"
  | "error";

interface LessonData {
  id: string;
  title: string;
  content_json: JSONContent;
}

const emptyContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  level: "SMA",
  instructor: "",
  premium: false,
  published: false,
};

/* =========================================
   MAIN PAGE
========================================= */

export default function AdminCoursesPage() {
  const [items, setItems] = useState<CourseItem[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CourseItem | null>(null);

  /* STUDIO STATE */

  const [activeCourse, setActiveCourse] =
    useState<CourseItem | null>(null);

  const [activeModuleId, setActiveModuleId] =
    useState<string | null>(null);

  const [activeLessonId, setActiveLessonId] =
    useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");

  const [lessonContent, setLessonContent] =
    useState<JSONContent>(emptyContent);

  const [studioLoading, setStudioLoading] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("saved");

  const [dirty, setDirty] = useState(false);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lessonIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);

  const contentRef = useRef<JSONContent>(emptyContent);
  const titleRef = useRef("");

  /* =========================================
     FETCH COURSES
  ========================================= */

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (catError) throw catError;

      if (catData) {
        setCategories(catData);
      }

      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (courseErr) throw courseErr;

      if (courseData) {
        setItems(courseData as CourseItem[]);
      }
    } catch (err: unknown) {
      console.error("Fetch courses error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data dari Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================================
     FILTER COURSES
  ========================================= */

  const filtered = useMemo(
    () =>
      items
        .filter((c) =>
          c.title.toLowerCase().includes(q.toLowerCase())
        )
        .filter(
          (c) => category === "all" || c.category === category
        )
        .filter(
          (c) => status === "all" || c.status === status
        ),
    [items, q, category, status]
  );

  /* =========================================
     CREATE / UPDATE COURSE
  ========================================= */

  const saveCourse = async () => {
    if (!draft) return;

    const e: Record<string, string> = {};

    if (draft.title.trim().length < 5) {
      e.title = "Judul minimal 5 karakter.";
    }

    if (!draft.instructor.trim()) {
      e.instructor = "Nama pengajar wajib diisi.";
    }

    setErrs(e);

    if (Object.keys(e).length) return;

    setSaving(true);

    const payload = {
      title: draft.title.trim(),
      description:
        draft.description || "Belum ada deskripsi.",
      category: draft.category,
      level: draft.level,
      instructor: draft.instructor.trim(),
      premium: draft.premium,
      status: draft.published ? "Published" : "Draft",
      thumbnail:
        gradients[Math.floor(Math.random() * gradients.length)],
    };

    try {
      if (draft.id) {
        const { error: err } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", draft.id);

        if (err) throw err;

        toast.success("Kursus berhasil diperbarui");
      } else {
        const { error: err } = await supabase
          .from("courses")
          .insert([payload]);

        if (err) throw err;

        toast.success("Kursus berhasil ditambahkan");
      }

      setDraft(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menyimpan: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan")
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     DELETE COURSE SAFELY
  ========================================= */

  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { data: modules, error: moduleError } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", removing.id)
        .limit(1);

      if (moduleError) throw moduleError;

      if (modules && modules.length > 0) {
        toast.error(
          "Kursus memiliki modul pembelajaran. Hapus atau kelola modulnya terlebih dahulu."
        );

        setRemoving(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from("courses")
        .delete()
        .eq("id", removing.id);

      if (deleteError) throw deleteError;

      toast.success("Kursus berhasil dihapus");

      setRemoving(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menghapus: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan")
      );
    }
  };

  /* =========================================
     OPEN GRADEUP STUDIO
  ========================================= */

  const openStudio = async (course: CourseItem) => {
    setStudioLoading(true);
    setStudioError(null);

    try {
      let moduleId: string | null = null;

      const { data: modules, error: moduleError } = await supabase
        .from("course_modules")
        .select("id, title, sort_order")
        .eq("course_id", course.id)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (moduleError) throw moduleError;

      if (modules && modules.length > 0) {
        moduleId = modules[0].id;
      } else {
        const { data: newModule, error: createModuleError } =
          await supabase
            .from("course_modules")
            .insert({
              course_id: course.id,
              title: "Materi Utama",
              description: "Modul utama pembelajaran.",
              sort_order: 0,
              is_published: false,
            })
            .select("id")
            .single();

        if (createModuleError) throw createModuleError;

        moduleId = newModule.id;

        toast.success("Modul Materi Utama berhasil dibuat");
      }

      const { data: lessons, error: lessonError } = await supabase
        .from("course_lessons")
        .select("id, title, content_json")
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (lessonError) throw lessonError;

      let selectedLesson: LessonData | null = null;

      if (lessons && lessons.length > 0) {
        selectedLesson = lessons[0] as LessonData;
      }

      const initialTitle = selectedLesson
        ? selectedLesson.title
        : `${course.title} - Materi 1`;

      const initialDocument =
        selectedLesson?.content_json ?? emptyContent;

      setActiveCourse(course);
      setActiveModuleId(moduleId);
      setActiveLessonId(selectedLesson?.id ?? null);

      lessonIdRef.current = selectedLesson?.id ?? null;

      setLessonTitle(initialTitle);
      titleRef.current = initialTitle;

      setLessonContent(initialDocument);
      contentRef.current = initialDocument;

      revisionRef.current = 0;

      setDirty(false);
      setSaveStatus("saved");
    } catch (err: unknown) {
      console.error("Open GradeUp Studio error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Gagal membuka editor.";

      setStudioError(message);
      toast.error(message);
    } finally {
      setStudioLoading(false);
    }
  };

  /* =========================================
     UPDATE DOCUMENT
  ========================================= */

  const handleContentChange = (content: JSONContent) => {
    contentRef.current = content;

    revisionRef.current += 1;

    setLessonContent(content);
    setDirty(true);
    setSaveStatus("dirty");
  };

  const handleTitleChange = (value: string) => {
    titleRef.current = value;

    revisionRef.current += 1;

    setLessonTitle(value);
    setDirty(true);
    setSaveStatus("dirty");
  };

  /* =========================================
     SAVE LESSON
     Serialized queue prevents overlapping saves.
  ========================================= */

  const saveLesson = useCallback(async () => {
    if (!activeCourse || !activeModuleId) return;

    const snapshotContent = contentRef.current;
    const snapshotTitle = titleRef.current.trim();
    const snapshotRevision = revisionRef.current;

    if (!snapshotTitle) {
      toast.error("Judul materi wajib diisi.");
      return;
    }

    setSaveStatus("saving");

    const task = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const currentLessonId = lessonIdRef.current;

        const payload = {
          title: snapshotTitle,
          content_json: snapshotContent,
          description: "",
          estimated_minutes: 10,
        };

        if (currentLessonId) {
          const { error: updateError } = await supabase
            .from("course_lessons")
            .update(payload)
            .eq("id", currentLessonId);

          if (updateError) throw updateError;
        } else {
          const { data: newLesson, error: insertError } =
            await supabase
              .from("course_lessons")
              .insert({
                ...payload,
                module_id: activeModuleId,
                sort_order: 0,
                is_published: false,
              })
              .select("id")
              .single();

          if (insertError) throw insertError;

          lessonIdRef.current = newLesson.id;
          setActiveLessonId(newLesson.id);
        }

        if (revisionRef.current === snapshotRevision) {
          setDirty(false);
          setSaveStatus("saved");
        }
      });

    saveQueueRef.current = task;

    try {
      await task;
    } catch (err: unknown) {
      console.error("Save lesson error:", err);

      setSaveStatus("error");

      toast.error(
        "Gagal menyimpan materi: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan")
      );
    }
  }, [activeCourse, activeModuleId]);

  /* =========================================
     AUTOSAVE
  ========================================= */

  useEffect(() => {
    if (!activeCourse || !activeModuleId || !dirty) return;

    const timer = window.setTimeout(() => {
      void saveLesson();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    activeCourse,
    activeModuleId,
    dirty,
    lessonContent,
    lessonTitle,
    saveLesson,
  ]);

  /* =========================================
     BACK TO COURSE LIST
  ========================================= */

  const closeStudio = async () => {
    if (dirty) {
      await saveLesson();
    }

    await saveQueueRef.current.catch(() => undefined);

    setActiveCourse(null);
    setActiveModuleId(null);
    setActiveLessonId(null);

    lessonIdRef.current = null;

    setDirty(false);
    setSaveStatus("saved");
  };

  /* =========================================
     SAVE STATUS
  ========================================= */

  const renderSaveStatus = () => {
    if (saveStatus === "saving") {
      return (
        <span className="flex items-center gap-2 text-amber-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menyimpan...
        </span>
      );
    }

    if (saveStatus === "error") {
      return (
        <span className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          Gagal menyimpan
        </span>
      );
    }

    if (saveStatus === "dirty") {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Cloud className="h-4 w-4" />
          Perubahan belum disimpan
        </span>
      );
    }

    return (
      <span className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        Tersimpan
      </span>
    );
  };

  /* =========================================
     STUDIO VIEW
  ========================================= */

  if (activeCourse) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={closeStudio}
              aria-label="Kembali ke daftar kursus"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                GradeUp Studio
              </p>

              <h2 className="truncate text-lg font-bold">
                {activeCourse.title}
              </h2>

              <p className="text-xs text-muted-foreground">
                Modul: Materi Utama
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs">
              {renderSaveStatus()}
            </div>

            <Button
              onClick={() => void saveLesson()}
              disabled={saveStatus === "saving" || !lessonTitle.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </div>

        {studioError ? (
          <Card className="p-5">
            <ErrorState
              message={studioError}
              onRetry={() => void openStudio(activeCourse)}
            />
          </Card>
        ) : (
          <>
            <Card className="space-y-3 p-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">
                  Judul Sesi Materi
                </Label>

                <Input
                  id="lesson-title"
                  value={lessonTitle}
                  onChange={(e) =>
                    handleTitleChange(e.target.value)
                  }
                  placeholder="Masukkan judul materi..."
                  className="text-base font-semibold"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">
                  {activeCourse.category}
                </Badge>

                <Badge variant="outline">
                  {activeCourse.level}
                </Badge>

                <Badge variant="outline">
                  {activeLessonId ? "Materi tersimpan" : "Materi baru"}
                </Badge>
              </div>
            </Card>

            <EditorCanvas
              key={activeLessonId ?? `${activeCourse.id}-new`}
              initialContent={lessonContent}
              onChange={handleContentChange}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                Perubahan otomatis disimpan setelah 1,5 detik.
              </div>

              <Button
                onClick={() => void saveLesson()}
                disabled={saveStatus === "saving" || !lessonTitle.trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Simpan Materi
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* =========================================
     COURSE LIST VIEW
  ========================================= */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Materi"
        description="Tambah, ubah, dan kelola kursus serta materi pembelajaran GradeUp."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button
              onClick={() => {
                setErrs({});
                setDraft(emptyDraft);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Tambah Materi
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Cari materi..."
          className="flex-1"
        />

        <FilterSelect
          value={category}
          onChange={setCategory}
          options={categories.map((c) => c.name)}
          allLabel="Semua kategori"
        />

        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Published", "Draft"]}
          allLabel="Semua status"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              message={error}
              onRetry={fetchData}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Materi tidak ditemukan" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kursus</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Akses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-11 w-16 shrink-0 rounded-lg bg-gradient-to-br",
                          c.thumbnail || gradients[0]
                        )}
                        aria-hidden
                      />

                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold">
                          {c.title}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {c.instructor}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{c.category}</TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {c.level}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {c.premium ? (
                      <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                        Premium
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-600"
                      >
                        Gratis
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <PublishBadge status={c.status} />
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Aksi untuk ${c.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setErrs({});

                            setDraft({
                              id: c.id,
                              title: c.title,
                              description: c.description,
                              category: c.category,
                              level: c.level,
                              instructor: c.instructor,
                              premium: c.premium,
                              published: c.status === "Published",
                            });
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Kursus
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => void openStudio(c)}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          Buka GradeUp Studio
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setRemoving(c)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Kursus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* COURSE FORM DIALOG */}

      <Dialog
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="max-w-xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {draft.id ? "Edit Kursus" : "Tambah Kursus"}
                </DialogTitle>

                <DialogDescription>
                  Isi informasi kursus sebelum membuat materi pembelajaran.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="c-title">
                    Judul Kursus
                  </Label>

                  <Input
                    id="c-title"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        title: e.target.value,
                      })
                    }
                  />

                  <FieldError message={errs.title} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-desc">
                    Deskripsi
                  </Label>

                  <textarea
                    id="c-desc"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kategori</Label>

                    <Select
                      value={draft.category}
                      onValueChange={(v) =>
                        setDraft({
                          ...draft,
                          category: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {categories.length > 0 ? (
                          categories.map((c) => (
                            <SelectItem
                              key={c.id}
                              value={c.name}
                            >
                              {c.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="Matematika">
                            Matematika
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jenjang</Label>

                    <Select
                      value={draft.level}
                      onValueChange={(v) =>
                        setDraft({
                          ...draft,
                          level: v as Level,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-ins">
                    Nama Pengajar
                  </Label>

                  <Input
                    id="c-ins"
                    value={draft.instructor}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        instructor: e.target.value,
                      })
                    }
                  />

                  <FieldError message={errs.instructor} />
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="c-prem"
                      checked={draft.premium}
                      onCheckedChange={(v) =>
                        setDraft({
                          ...draft,
                          premium: v,
                        })
                      }
                    />

                    <Label htmlFor="c-prem">
                      Kursus Premium
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="c-pub"
                      checked={draft.published}
                      onCheckedChange={(v) =>
                        setDraft({
                          ...draft,
                          published: v,
                        })
                      }
                    />

                    <Label htmlFor="c-pub">
                      Terbitkan Kursus
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  onClick={saveCourse}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan Kursus"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Hapus kursus?"
        description={`Kursus "${removing?.title ?? ""}" akan dihapus jika belum memiliki modul pembelajaran.`}
        destructive
        confirmLabel="Hapus Kursus"
        onConfirm={handleDelete}
      />
    </div>
  );
}
