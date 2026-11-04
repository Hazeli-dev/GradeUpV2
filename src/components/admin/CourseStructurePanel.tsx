
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
}

interface LessonItem {
  id: string;
  module_id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
}

interface SectionItem {
  id: string;
  lesson_id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
}

interface CourseStructurePanelProps {
  courseId: string;
  activeModuleId: string | null;
  activeLessonId: string | null;
  activeSectionId?: string | null;
  onModuleChange: (moduleId: string) => void;
  onLessonSelect: (lessonId: string) => void;
  onSectionSelect?: (sectionId: string) => void;
  onSectionTitleChange?: (sectionId: string, title: string) => void;
}

const EMPTY_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export default function CourseStructurePanel({
  courseId,
  activeModuleId,
  activeLessonId,
  activeSectionId,
  onModuleChange,
  onLessonSelect,
  onSectionSelect,
  onSectionTitleChange,
}: CourseStructurePanelProps) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [showModuleInput, setShowModuleInput] = useState(false);
  const [showLessonInputFor, setShowLessonInputFor] =
    useState<string | null>(null);
  const [showSectionInput, setShowSectionInput] = useState(false);

  const [editingSectionId, setEditingSectionId] =
    useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");

  const [deletingSectionId, setDeletingSectionId] =
    useState<string | null>(null);

  const sectionFetchRequestRef = useRef(0);
  const structureFetchRequestRef = useRef(0);

  const activeLessonIdRef = useRef<string | null>(activeLessonId);

  activeLessonIdRef.current = activeLessonId;

  // =========================================================
  // LOAD MODULES AND LESSONS
  // =========================================================

  const fetchStructure = useCallback(async () => {
    const requestId = ++structureFetchRequestRef.current;

    setLoading(true);
    setError(null);

    try {
      const { data: moduleData, error: moduleError } =
        await supabase
          .from("course_modules")
          .select("id, title, description, sort_order, is_published")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

      if (moduleError) throw moduleError;

      if (requestId !== structureFetchRequestRef.current) return;

      const loadedModules = (moduleData ?? []) as ModuleItem[];

      setModules(loadedModules);

      if (loadedModules.length === 0) {
        setLessons([]);
        return;
      }

      const moduleIds = loadedModules.map((module) => module.id);

      const { data: lessonData, error: lessonError } =
        await supabase
          .from("course_lessons")
          .select("id, module_id, title, sort_order, is_published")
          .in("module_id", moduleIds)
          .order("sort_order", { ascending: true });

      if (lessonError) throw lessonError;

      if (requestId !== structureFetchRequestRef.current) return;

      setLessons((lessonData ?? []) as LessonItem[]);
    } catch (err: unknown) {
      if (requestId !== structureFetchRequestRef.current) return;

      console.error("Fetch course structure error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Gagal memuat struktur pembelajaran.";

      setError(message);
      toast.error(message);
    } finally {
      if (requestId === structureFetchRequestRef.current) {
        setLoading(false);
      }
    }
  }, [courseId]);

  // =========================================================
  // LOAD SECTIONS
  // =========================================================

  const fetchSections = useCallback(
    async (lessonId?: string) => {
      const targetLessonId = lessonId ?? activeLessonId;

      if (!targetLessonId) {
        sectionFetchRequestRef.current += 1;
        setSections([]);
        setSectionsLoading(false);
        return;
      }

      const requestId = ++sectionFetchRequestRef.current;

      setSectionsLoading(true);

      try {
        const { data, error: sectionError } = await supabase
          .from("lesson_sections")
          .select("id, lesson_id, title, sort_order, is_published")
          .eq("lesson_id", targetLessonId)
          .order("sort_order", { ascending: true });

        if (sectionError) throw sectionError;

        if (
          requestId !== sectionFetchRequestRef.current ||
          activeLessonIdRef.current !== targetLessonId
        ) {
          return;
        }

        setSections((data ?? []) as SectionItem[]);
      } catch (err: unknown) {
        if (
          requestId !== sectionFetchRequestRef.current ||
          activeLessonIdRef.current !== targetLessonId
        ) {
          return;
        }

        console.error("Fetch lesson sections error:", err);

        toast.error(
          "Gagal memuat bagian materi: " +
            (err instanceof Error
              ? err.message
              : "Terjadi kesalahan")
        );
      } finally {
        if (
          requestId === sectionFetchRequestRef.current &&
          activeLessonIdRef.current === targetLessonId
        ) {
          setSectionsLoading(false);
        }
      }
    },
    [activeLessonId]
  );

  useEffect(() => {
    void fetchStructure();
  }, [fetchStructure]);

  useEffect(() => {
    setSections([]);
    setEditingSectionId(null);
    setEditingSectionTitle("");
    setDeletingSectionId(null);
    setShowSectionInput(false);
    setNewSectionTitle("");

    void fetchSections();
  }, [fetchSections]);

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const moduleLessons = lessons.filter(
    (lesson) => lesson.module_id === activeModuleId
  );

  // =========================================================
  // CREATE MODULE
  // =========================================================

  const createModule = async () => {
    const title = newModuleTitle.trim();

    if (!title) {
      toast.error("Nama modul wajib diisi.");
      return;
    }

    if (working) return;

    setWorking(true);

    try {
      const nextOrder =
        modules.length > 0
          ? Math.max(...modules.map((item) => item.sort_order)) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title,
          description: "",
          sort_order: nextOrder,
          is_published: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await fetchStructure();

      onModuleChange(data.id);

      setNewModuleTitle("");
      setShowModuleInput(false);

      toast.success("Modul berhasil ditambahkan.");
    } catch (err: unknown) {
      console.error("Create module error:", err);

      toast.error(
        "Gagal menambahkan modul: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

  // =========================================================
  // CREATE LESSON
  // =========================================================

  const createLesson = async () => {
    if (!activeModuleId) {
      toast.error("Pilih modul terlebih dahulu.");
      return;
    }

    const title = newLessonTitle.trim();

    if (!title) {
      toast.error("Judul sesi wajib diisi.");
      return;
    }

    if (working) return;

    setWorking(true);

    try {
      const currentLessons = lessons.filter(
        (lesson) => lesson.module_id === activeModuleId
      );

      const nextOrder =
        currentLessons.length > 0
          ? Math.max(...currentLessons.map((item) => item.sort_order)) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("course_lessons")
        .insert({
          module_id: activeModuleId,
          title,
          description: "",
          content_json: EMPTY_CONTENT,
          estimated_minutes: 10,
          xp_reward: 10,
          sort_order: nextOrder,
          is_published: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await fetchStructure();

      onLessonSelect(data.id);

      setNewLessonTitle("");
      setShowLessonInputFor(null);

      toast.success("Sesi pembelajaran berhasil ditambahkan.");
    } catch (err: unknown) {
      console.error("Create lesson error:", err);

      toast.error(
        "Gagal menambahkan sesi: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

  // =========================================================
  // CREATE SECTION
  // =========================================================

  const createSection = async () => {
    const targetLessonId = activeLessonId;

    if (!targetLessonId) {
      toast.error("Pilih sesi pembelajaran terlebih dahulu.");
      return;
    }

    const title = newSectionTitle.trim();

    if (!title) {
      toast.error("Judul bagian materi wajib diisi.");
      return;
    }

    if (working) return;

    setWorking(true);

    try {
      const nextOrder =
        sections.length > 0
          ? Math.max(...sections.map((item) => item.sort_order)) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("lesson_sections")
        .insert({
          lesson_id: targetLessonId,
          title,
          content_json: EMPTY_CONTENT,
          sort_order: nextOrder,
          is_published: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await fetchSections(targetLessonId);

      if (activeLessonIdRef.current === targetLessonId) {
        onSectionSelect?.(data.id);
      }

      setNewSectionTitle("");
      setShowSectionInput(false);

      toast.success("Bagian materi berhasil ditambahkan.");
    } catch (err: unknown) {
      console.error("Create section error:", err);

      toast.error(
        "Gagal menambahkan bagian materi: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

  // =========================================================
  // UPDATE SECTION TITLE
  // =========================================================

  const saveSectionTitle = async (sectionId: string) => {
    const targetLessonId = activeLessonId;
    const title = editingSectionTitle.trim();

    if (!targetLessonId) {
      toast.error("Sesi pembelajaran tidak ditemukan.");
      return;
    }

    if (!title) {
      toast.error("Judul bagian materi tidak boleh kosong.");
      return;
    }

    if (working) return;

    setWorking(true);

    try {
      const { error: updateError } = await supabase
        .from("lesson_sections")
        .update({ title })
        .eq("id", sectionId)
        .eq("lesson_id", targetLessonId);

      if (updateError) throw updateError;

      // Sinkronkan judul editor jika bagian yang diubah sedang aktif.
      if (sectionId === activeSectionId) {
        onSectionTitleChange?.(sectionId, title);
      }

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? { ...section, title }
            : section
        )
      );

      setEditingSectionId(null);
      setEditingSectionTitle("");

      toast.success("Judul bagian materi berhasil diperbarui.");
    } catch (err: unknown) {
      console.error("Update section error:", err);

      toast.error(
        "Gagal mengubah judul: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

  // =========================================================
  // DELETE SECTION
  // =========================================================

  const deleteSection = async (sectionId: string) => {
    const targetLessonId = activeLessonId;

    if (working || !targetLessonId) return;

    if (activeSectionId === sectionId) {
      toast.error(
        "Pilih bagian materi lain terlebih dahulu sebelum menghapus bagian ini."
      );

      setDeletingSectionId(null);
      return;
    }

    if (sections.length <= 1) {
      toast.error(
        "Bagian materi terakhir tidak dapat dihapus. Tambahkan bagian baru terlebih dahulu."
      );

      setDeletingSectionId(null);
      return;
    }

    setWorking(true);

    try {
      const { error: deleteError } = await supabase
        .from("lesson_sections")
        .delete()
        .eq("id", sectionId)
        .eq("lesson_id", targetLessonId);

      if (deleteError) throw deleteError;

      setSections((current) =>
        current.filter((section) => section.id !== sectionId)
      );

      setDeletingSectionId(null);

      toast.success("Bagian materi berhasil dihapus.");
    } catch (err: unknown) {
      console.error("Delete section error:", err);

      toast.error(
        "Gagal menghapus bagian materi. Jika bagian ini sudah memiliki aktivitas evaluasi, penghapusan mungkin dibatasi oleh sistem keamanan database. " +
          (err instanceof Error ? err.message : "")
      );
    } finally {
      setWorking(false);
    }
  };

  // =========================================================
  // INPUT HELPERS
  // =========================================================

  const toggleLessonInput = (moduleId: string) => {
    setNewLessonTitle("");

    setShowLessonInputFor((current) =>
      current === moduleId ? null : moduleId
    );
  };

  const cancelSectionEditing = () => {
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <h3 className="font-semibold">Struktur Pembelajaran</h3>
          <p className="text-xs text-muted-foreground">
            Kelola modul, sesi, dan bagian materi
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void fetchStructure();
            void fetchSections();
          }}
          disabled={loading || sectionsLoading || working}
          aria-label="Refresh struktur"
          title="Muat ulang struktur"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading || sectionsLoading ? "animate-spin" : ""
            }`}
          />
        </Button>
      </div>

      <div className="space-y-3 p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setShowModuleInput((value) => !value)}
          disabled={working}
        >
          <Plus className="h-4 w-4" />
          Tambah Modul
        </Button>

        {showModuleInput && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <Input
              autoFocus
              value={newModuleTitle}
              onChange={(event) => setNewModuleTitle(event.target.value)}
              placeholder="Nama modul baru..."
              disabled={working}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createModule();
                }
              }}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void createModule()}
                disabled={working || !newModuleTitle.trim()}
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buat Modul"
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowModuleInput(false);
                  setNewModuleTitle("");
                }}
                disabled={working}
              >
                Batal
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat struktur...
          </div>
        ) : error ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-destructive">{error}</p>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchStructure()}
              disabled={working}
            >
              Coba Lagi
            </Button>
          </div>
        ) : modules.length === 0 ? (
          <div className="py-8 text-center">
            <Folder className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada modul</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tambahkan modul untuk mulai menyusun pembelajaran.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((module, index) => {
              const isActive = module.id === activeModuleId;

              const moduleLessonItems = lessons.filter(
                (lesson) => lesson.module_id === module.id
              );

              return (
                <div
                  key={module.id}
                  className="overflow-hidden rounded-lg border"
                >
                  <button
                    type="button"
                    onClick={() => onModuleChange(module.id)}
                    className={`flex w-full items-center gap-2 p-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary/10"
                        : "bg-card hover:bg-muted/50"
                    }`}
                  >
                    {isActive ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}

                    <Folder
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />

                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {index + 1}. {module.title}
                    </span>

                    <Badge variant="outline" className="text-xs">
                      {moduleLessonItems.length} sesi
                    </Badge>
                  </button>

                  {isActive && (
                    <div className="space-y-2 border-t bg-muted/20 p-2">
                      <div className="flex items-center justify-between gap-2 px-2 py-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Daftar sesi
                        </span>

                        <Badge
                          variant={
                            module.is_published ? "success" : "muted"
                          }
                        >
                          {module.is_published ? "Terbit" : "Draft"}
                        </Badge>
                      </div>

                      {moduleLessonItems.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                          Belum ada sesi pembelajaran.
                        </p>
                      ) : (
                        moduleLessonItems.map((lesson, lessonIndex) => {
                          const isLessonActive =
                            activeLessonId === lesson.id;

                          return (
                            <div key={lesson.id} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => onLessonSelect(lesson.id)}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  isLessonActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <BookOpen className="h-4 w-4 shrink-0" />

                                <span className="min-w-0 flex-1 truncate">
                                  {lessonIndex + 1}. {lesson.title}
                                </span>

                                {isLessonActive && (
                                  <Badge
                                    variant="muted"
                                    className="shrink-0"
                                  >
                                    Aktif
                                  </Badge>
                                )}

                                <span
                                  className={`shrink-0 text-[10px] ${
                                    isLessonActive
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {lesson.is_published ? "Terbit" : "Draft"}
                                </span>
                              </button>

                              {isLessonActive && (
                                <div className="ml-3 space-y-2 border-l-2 border-primary/20 py-2 pl-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <Layers3 className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-xs font-semibold text-muted-foreground">
                                        Bagian Materi
                                      </span>
                                    </div>

                                    <Badge variant="outline">
                                      {sectionsLoading
                                        ? "..."
                                        : sections.length}
                                    </Badge>
                                  </div>

                                  {sectionsLoading ? (
                                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Memuat bagian materi...
                                    </div>
                                  ) : sections.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-3 text-center">
                                      <FileText className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                                      <p className="text-xs font-medium">
                                        Belum ada bagian materi
                                      </p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        Tambahkan bagian pertama untuk mulai
                                        menulis materi.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {sections.map(
                                        (section, sectionIndex) => {
                                          const isSectionActive =
                                            activeSectionId === section.id;

                                          const isEditing =
                                            editingSectionId === section.id;

                                          const isDeleting =
                                            deletingSectionId === section.id;

                                          const canDelete =
                                            sections.length > 1 &&
                                            !isSectionActive;

                                          return (
                                            <div
                                              key={section.id}
                                              className={`rounded-md border p-2 ${
                                                isSectionActive
                                                  ? "border-primary/40 bg-primary/5"
                                                  : "border-transparent bg-card"
                                              }`}
                                            >
                                              {isEditing ? (
                                                <div className="space-y-2">
                                                  <Input
                                                    autoFocus
                                                    value={editingSectionTitle}
                                                    onChange={(event) =>
                                                      setEditingSectionTitle(
                                                        event.target.value
                                                      )
                                                    }
                                                    disabled={working}
                                                    placeholder="Judul bagian materi..."
                                                    onKeyDown={(event) => {
                                                      if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        void saveSectionTitle(
                                                          section.id
                                                        );
                                                      }

                                                      if (event.key === "Escape") {
                                                        cancelSectionEditing();
                                                      }
                                                    }}
                                                  />

                                                  <div className="flex gap-1">
                                                    <Button
                                                      size="sm"
                                                      onClick={() =>
                                                        void saveSectionTitle(
                                                          section.id
                                                        )
                                                      }
                                                      disabled={
                                                        working ||
                                                        !editingSectionTitle.trim()
                                                      }
                                                    >
                                                      <Check className="mr-1 h-3 w-3" />
                                                      Simpan
                                                    </Button>

                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={cancelSectionEditing}
                                                      disabled={working}
                                                    >
                                                      <X className="mr-1 h-3 w-3" />
                                                      Batal
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : isDeleting ? (
                                                <div className="space-y-2">
                                                  <p className="text-xs font-medium text-destructive">
                                                    Hapus bagian materi ini?
                                                  </p>

                                                  <p className="text-[11px] text-muted-foreground">
                                                    Penghapusan tidak dapat
                                                    dibatalkan. Bagian yang
                                                    memiliki aktivitas evaluasi
                                                    dapat dilindungi database.
                                                  </p>

                                                  <div className="flex gap-1">
                                                    <Button
                                                      size="sm"
                                                      variant="destructive"
                                                      onClick={() =>
                                                        void deleteSection(
                                                          section.id
                                                        )
                                                      }
                                                      disabled={working}
                                                    >
                                                      {working ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        "Ya, Hapus"
                                                      )}
                                                    </Button>

                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() =>
                                                        setDeletingSectionId(null)
                                                      }
                                                      disabled={working}
                                                    >
                                                      Batal
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      onSectionSelect?.(
                                                        section.id
                                                      )
                                                    }
                                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                    title={`Pilih ${section.title}`}
                                                  >
                                                    <FileText
                                                      className={`h-3.5 w-3.5 shrink-0 ${
                                                        isSectionActive
                                                          ? "text-primary"
                                                          : "text-muted-foreground"
                                                      }`}
                                                    />

                                                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                                      {sectionIndex + 1}.{" "}
                                                      {section.title}
                                                    </span>

                                                    {isSectionActive && (
                                                      <Badge
                                                        variant="muted"
                                                        className="text-[10px]"
                                                      >
                                                        Aktif
                                                      </Badge>
                                                    )}
                                                  </button>

                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 shrink-0"
                                                    title="Ubah judul"
                                                    onClick={() => {
                                                      setEditingSectionId(
                                                        section.id
                                                      );
                                                      setEditingSectionTitle(
                                                        section.title
                                                      );
                                                      setDeletingSectionId(null);
                                                    }}
                                                    disabled={working}
                                                  >
                                                    <Pencil className="h-3 w-3" />
                                                  </Button>

                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                                    title={
                                                      !canDelete
                                                        ? isSectionActive
                                                          ? "Pilih bagian lain sebelum menghapus"
                                                          : "Bagian terakhir tidak dapat dihapus"
                                                        : "Hapus bagian"
                                                    }
                                                    onClick={() => {
                                                      if (!canDelete) {
                                                        toast.error(
                                                          isSectionActive
                                                            ? "Pilih bagian materi lain terlebih dahulu sebelum menghapus bagian ini."
                                                            : "Bagian materi terakhir tidak dapat dihapus."
                                                        );
                                                        return;
                                                      }

                                                      setDeletingSectionId(
                                                        section.id
                                                      );
                                                      setEditingSectionId(null);
                                                    }}
                                                    disabled={working}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              )}

                                              {!isEditing && !isDeleting && (
                                                <div className="mt-1 pl-6">
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {section.is_published
                                                      ? "Terbit"
                                                      : "Draft"}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    onClick={() => {
                                      setShowSectionInput((value) => !value);
                                      setNewSectionTitle("");
                                    }}
                                    disabled={working || sectionsLoading}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Tambah Bagian Materi
                                  </Button>

                                  {showSectionInput && (
                                    <div className="space-y-2 rounded-lg border bg-card p-3">
                                      <div>
                                        <p className="text-xs font-medium">
                                          Bagian Materi Baru
                                        </p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          Bagian baru akan ditambahkan setelah
                                          bagian terakhir.
                                        </p>
                                      </div>

                                      <Input
                                        autoFocus
                                        value={newSectionTitle}
                                        onChange={(event) =>
                                          setNewSectionTitle(event.target.value)
                                        }
                                        placeholder="Contoh: Pengertian Dasar..."
                                        disabled={working}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void createSection();
                                          }

                                          if (event.key === "Escape") {
                                            setShowSectionInput(false);
                                            setNewSectionTitle("");
                                          }
                                        }}
                                      />

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => void createSection()}
                                          disabled={
                                            working ||
                                            !newSectionTitle.trim()
                                          }
                                        >
                                          {working ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <>
                                              <Plus className="mr-1 h-3.5 w-3.5" />
                                              Buat Bagian
                                            </>
                                          )}
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setShowSectionInput(false);
                                            setNewSectionTitle("");
                                          }}
                                          disabled={working}
                                        >
                                          Batal
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => toggleLessonInput(module.id)}
                        disabled={working}
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Sesi
                      </Button>

                      {showLessonInputFor === module.id && (
                        <div className="space-y-2 rounded-lg border bg-card p-3">
                          <Input
                            autoFocus
                            value={newLessonTitle}
                            onChange={(event) =>
                              setNewLessonTitle(event.target.value)
                            }
                            placeholder="Judul sesi pembelajaran..."
                            disabled={working}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void createLesson();
                              }

                              if (event.key === "Escape") {
                                setShowLessonInputFor(null);
                                setNewLessonTitle("");
                              }
                            }}
                          />

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => void createLesson()}
                              disabled={working || !newLessonTitle.trim()}
                            >
                              {working ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Buat Sesi
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowLessonInputFor(null);
                                setNewLessonTitle("");
                              }}
                              disabled={working}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
