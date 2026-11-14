
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
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";

import EditorCanvas from "@/components/admin/EditorCanvas";
import CourseStructurePanel from "@/components/admin/CourseStructurePanel";
import LessonAssessmentPanel from "@/components/admin/LessonAssessmentPanel";

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

/* =========================================
   GRADE OPTIONS
========================================= */

const getGradeOptions = (level: Level): number[] => {
  const normalizedLevel = String(level).trim().toUpperCase();

  switch (normalizedLevel) {
    case "SD":
      return [1, 2, 3, 4, 5, 6];

    case "SMP":
      return [7, 8, 9];

    case "SMA":
      return [10, 11, 12];

    default:
      return [];
  }
};

interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  grade: number | null;
  instructor: string;
  premium: boolean;
  status: "Published" | "Draft";
  thumbnail?: string | null;
  created_at?: string;
}

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  grade: number | null;
  instructor: string;
  thumbnail: string;
  premium: boolean;
  published: boolean;
};

type SaveStatus = "saved" | "dirty" | "saving" | "error";

interface SectionData {
  id: string;
  lesson_id: string;
  title: string;
  content_json: JSONContent;
  sort_order: number;
}

const emptyContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  level: "SMA",
  grade: 10,
  instructor: "",
  thumbnail: "",
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

  const [thumbnailPreviewError, setThumbnailPreviewError] =
    useState(false);

  /* =========================================
     STUDIO STATE
  ========================================= */

  const [activeCourse, setActiveCourse] =
    useState<CourseItem | null>(null);

  const [activeModuleId, setActiveModuleId] =
    useState<string | null>(null);

  const [activeLessonId, setActiveLessonId] =
    useState<string | null>(null);

  const [activeSectionId, setActiveSectionId] =
    useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");

  const [lessonContent, setLessonContent] =
    useState<JSONContent>(emptyContent);

  const [studioLoading, setStudioLoading] = useState(false);

  const [studioError, setStudioError] =
    useState<string | null>(null);

  const [studioClosing, setStudioClosing] = useState(false);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("saved");

  const [dirty, setDirty] = useState(false);

  /* =========================================
     STUDIO REFS
  ========================================= */

  const saveQueueRef = useRef<Promise<void>>(
    Promise.resolve()
  );

  const lessonIdRef = useRef<string | null>(null);
  const sectionIdRef = useRef<string | null>(null);
  const moduleIdRef = useRef<string | null>(null);

  const sectionOrderRef = useRef<number>(0);

  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);

  const contentRef = useRef<JSONContent>(emptyContent);
  const titleRef = useRef("");
  const sectionTitleRef = useRef("");

  const studioSessionRef = useRef(0);
  const loadRequestRef = useRef(0);

  const studioOpeningRef = useRef(false);
  const studioClosingRef = useRef(false);
  const switchingRef = useRef(false);

  /* =========================================
     FETCH COURSES
  ========================================= */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: catData, error: catError } =
        await supabase
          .from("categories")
          .select("*")
          .order("name");

      if (catError) throw catError;

      setCategories(catData ?? []);

      const { data: courseData, error: courseErr } =
        await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });

      if (courseErr) throw courseErr;

      setItems((courseData ?? []) as CourseItem[]);
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
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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

    const validation: Record<string, string> = {};

    if (draft.title.trim().length < 5) {
      validation.title = "Judul minimal 5 karakter.";
    }

    if (!draft.instructor.trim()) {
      validation.instructor = "Nama pengajar wajib diisi.";
    }

    const validGrades = getGradeOptions(draft.level);

    if (
      draft.grade === null ||
      !validGrades.includes(draft.grade)
    ) {
      validation.grade =
        "Pilih kelas yang sesuai dengan jenjang.";
    }

    const thumbnailUrl = draft.thumbnail.trim();

    if (
      thumbnailUrl &&
      !/^https?:\/\/.+/i.test(thumbnailUrl)
    ) {
      validation.thumbnail =
        "URL gambar harus diawali http:// atau https://.";
    }

    setErrs(validation);

    if (Object.keys(validation).length > 0) return;

    setSaving(true);

    const payload = {
      title: draft.title.trim(),
      description:
        draft.description || "Belum ada deskripsi.",
      category: draft.category,
      level: draft.level,
      grade: draft.grade,
      instructor: draft.instructor.trim(),
      premium: draft.premium,
      status: draft.published ? "Published" : "Draft",
      thumbnail: thumbnailUrl || null,
    };

    try {
      if (draft.id) {
        const { error: updateError } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", draft.id);

        if (updateError) throw updateError;

        toast.success("Kursus berhasil diperbarui.");
      } else {
        const { error: insertError } = await supabase
          .from("courses")
          .insert([payload]);

        if (insertError) throw insertError;

        toast.success("Kursus berhasil ditambahkan.");
      }

      setDraft(null);
      setThumbnailPreviewError(false);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menyimpan: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     OPEN ADD COURSE FORM
  ========================================= */

  const openCreateForm = () => {
    setErrs({});
    setThumbnailPreviewError(false);
    setDraft({ ...emptyDraft });
  };

  /* =========================================
     OPEN EDIT COURSE FORM
  ========================================= */

  const openEditForm = (course: CourseItem) => {
    setErrs({});
    setThumbnailPreviewError(false);

    setDraft({
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      category: course.category,
      level: course.level,
      grade: course.grade ?? null,
      instructor: course.instructor,
      thumbnail: course.thumbnail ?? "",
      premium: course.premium,
      published: course.status === "Published",
    });
  };

  /* =========================================
     DELETE COURSE SAFELY
  ========================================= */

  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { data: modules, error: moduleError } =
        await supabase
          .from("course_modules")
          .select("id")
          .eq("course_id", removing.id)
          .limit(1);

      if (moduleError) throw moduleError;

      if (modules && modules.length > 0) {
        toast.error(
          "Kursus memiliki modul pembelajaran. Kelola modulnya terlebih dahulu."
        );

        setRemoving(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from("courses")
        .delete()
        .eq("id", removing.id);

      if (deleteError) throw deleteError;

      toast.success("Kursus berhasil dihapus.");

      setRemoving(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menghapus: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    }
  };

  /* =========================================
     SAVE ACTIVE LESSON + SECTION
  ========================================= */

  const saveLesson = useCallback(
    async (showToast = true): Promise<boolean> => {
      if (!activeCourse) return false;

      const sessionId = studioSessionRef.current;
      const targetModuleId = moduleIdRef.current;
      const targetLessonId = lessonIdRef.current;
      const targetSectionId = sectionIdRef.current;

      const snapshotTitle = titleRef.current.trim();
      const snapshotSectionTitle =
        sectionTitleRef.current.trim();

      const snapshotRevision = revisionRef.current;

      const snapshotContent = JSON.parse(
        JSON.stringify(contentRef.current)
      ) as JSONContent;

      if (!targetModuleId) return false;

      if (!snapshotTitle) {
        setSaveStatus("dirty");

        if (showToast) {
          toast.error("Judul sesi wajib diisi.");
        }

        return false;
      }

      if (!snapshotSectionTitle && targetSectionId) {
        if (showToast) {
          toast.error("Judul bagian materi wajib diisi.");
        }

        return false;
      }

      const task = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (studioSessionRef.current !== sessionId) {
            throw new Error(
              "Sesi editor telah berubah. Penyimpanan dibatalkan."
            );
          }

          setSaveStatus("saving");

          let currentLessonId = targetLessonId;
          let currentSectionId = targetSectionId;

          if (currentLessonId) {
            const { error: updateLessonError } =
              await supabase
                .from("course_lessons")
                .update({
                  title: snapshotTitle,
                })
                .eq("id", currentLessonId)
                .eq("module_id", targetModuleId);

            if (updateLessonError) throw updateLessonError;
          } else {
            const { data: newLesson, error: insertLessonError } =
              await supabase
                .from("course_lessons")
                .insert({
                  title: snapshotTitle,
                  content_json: snapshotContent,
                  module_id: targetModuleId,
                  description: "",
                  estimated_minutes: 10,
                  xp_reward: 10,
                  sort_order: 0,
                  is_published: false,
                })
                .select("id")
                .single();

            if (insertLessonError) throw insertLessonError;

            currentLessonId = newLesson.id;

            if (studioSessionRef.current !== sessionId) {
              throw new Error("Sesi editor telah berubah.");
            }

            lessonIdRef.current = newLesson.id;
            setActiveLessonId(newLesson.id);
          }

          if (!currentLessonId) {
            throw new Error(
              "ID sesi pembelajaran tidak ditemukan."
            );
          }

          if (!currentSectionId) {
            const { data: newSection, error: insertSectionError } =
              await supabase
                .from("lesson_sections")
                .insert({
                  lesson_id: currentLessonId,
                  title:
                    snapshotSectionTitle || "Bagian Materi 1",
                  content_json: snapshotContent,
                  sort_order: 0,
                  is_published: false,
                })
                .select("id")
                .single();

            if (insertSectionError) throw insertSectionError;

            currentSectionId = newSection.id;

            if (studioSessionRef.current !== sessionId) {
              throw new Error("Sesi editor telah berubah.");
            }

            sectionIdRef.current = newSection.id;
            sectionOrderRef.current = 0;

            setActiveSectionId(newSection.id);
          } else {
            const { error: updateSectionError } =
              await supabase
                .from("lesson_sections")
                .update({
                  title: snapshotSectionTitle,
                  content_json: snapshotContent,
                })
                .eq("id", currentSectionId)
                .eq("lesson_id", currentLessonId);

            if (updateSectionError) throw updateSectionError;
          }

          if (sectionOrderRef.current === 0) {
            const { error: legacyUpdateError } =
              await supabase
                .from("course_lessons")
                .update({
                  content_json: snapshotContent,
                })
                .eq("id", currentLessonId)
                .eq("module_id", targetModuleId);

            if (legacyUpdateError) throw legacyUpdateError;
          }

          savedRevisionRef.current = Math.max(
            savedRevisionRef.current,
            snapshotRevision
          );

          if (studioSessionRef.current !== sessionId) {
            return;
          }

          if (revisionRef.current === snapshotRevision) {
            setDirty(false);
            setSaveStatus("saved");
          } else {
            setDirty(true);
            setSaveStatus("dirty");
          }
        });

      saveQueueRef.current = task;

      try {
        await task;

        return (
          studioSessionRef.current === sessionId &&
          savedRevisionRef.current === revisionRef.current
        );
      } catch (err: unknown) {
        console.error("Save lesson error:", err);

        if (studioSessionRef.current === sessionId) {
          setSaveStatus("error");
          setDirty(true);
        }

        if (showToast) {
          toast.error(
            "Gagal menyimpan materi: " +
              (err instanceof Error
                ? err.message
                : "Terjadi kesalahan")
          );
        }

        return false;
      }
    },
    [activeCourse]
  );

  /* =========================================
     LOAD SECTION
  ========================================= */

  const loadSection = useCallback(
    async (sectionId: string, lessonId: string) => {
      const requestId = ++loadRequestRef.current;

      setStudioLoading(true);
      setStudioError(null);

      try {
        const { data, error: sectionError } =
          await supabase
            .from("lesson_sections")
            .select(
              "id, lesson_id, title, content_json, sort_order"
            )
            .eq("id", sectionId)
            .eq("lesson_id", lessonId)
            .single();

        if (sectionError) throw sectionError;

        if (requestId !== loadRequestRef.current) return;

        if (lessonIdRef.current !== lessonId) {
          throw new Error(
            "Sesi pembelajaran berubah saat memuat bagian."
          );
        }

        const section = data as SectionData;

        studioSessionRef.current += 1;

        sectionIdRef.current = section.id;
        sectionOrderRef.current = section.sort_order;

        sectionTitleRef.current = section.title;

        contentRef.current =
          (section.content_json as JSONContent | null) ??
          emptyContent;

        revisionRef.current = 0;
        savedRevisionRef.current = 0;

        setActiveSectionId(section.id);
        setSectionTitle(section.title);
        setLessonContent(contentRef.current);

        setDirty(false);
        setSaveStatus("saved");
      } catch (err: unknown) {
        console.error("Load section error:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Gagal memuat bagian materi.";

        setStudioError(message);
        toast.error(message);
      } finally {
        if (requestId === loadRequestRef.current) {
          setStudioLoading(false);
        }
      }
    },
    []
  );

  /* =========================================
     LOAD LESSON
  ========================================= */

  const loadLesson = useCallback(
    async (lessonId: string, moduleId: string) => {
      if (studioClosingRef.current) return;

      const requestId = ++loadRequestRef.current;

      setStudioLoading(true);
      setStudioError(null);

      try {
        const { data: lesson, error: lessonError } =
          await supabase
            .from("course_lessons")
            .select("id, module_id, title, content_json")
            .eq("id", lessonId)
            .eq("module_id", moduleId)
            .single();

        if (lessonError) throw lessonError;

        if (requestId !== loadRequestRef.current) return;

        let section: SectionData | null = null;

        const { data: sectionData, error: sectionError } =
          await supabase
            .from("lesson_sections")
            .select(
              "id, lesson_id, title, content_json, sort_order"
            )
            .eq("lesson_id", lessonId)
            .order("sort_order", { ascending: true })
            .limit(1);

        if (sectionError) throw sectionError;

        if (sectionData && sectionData.length > 0) {
          section = sectionData[0] as SectionData;
        } else {
          const initialContent =
            (lesson.content_json as JSONContent | null) ??
            emptyContent;

          const {
            data: createdSection,
            error: createSectionError,
          } = await supabase
            .from("lesson_sections")
            .insert({
              lesson_id: lessonId,
              title: "Bagian Materi 1",
              content_json: initialContent,
              sort_order: 0,
              is_published: false,
            })
            .select(
              "id, lesson_id, title, content_json, sort_order"
            )
            .single();

          if (createSectionError) throw createSectionError;

          section = createdSection as SectionData;
        }

        if (requestId !== loadRequestRef.current) return;

        const content =
          (section?.content_json as JSONContent | null) ??
          emptyContent;

        studioSessionRef.current += 1;

        moduleIdRef.current = moduleId;
        lessonIdRef.current = lesson.id;
        sectionIdRef.current = section?.id ?? null;

        sectionOrderRef.current = section?.sort_order ?? 0;

        titleRef.current = lesson.title;

        sectionTitleRef.current =
          section?.title ?? "Bagian Materi 1";

        contentRef.current = content;

        revisionRef.current = 0;
        savedRevisionRef.current = 0;

        setActiveModuleId(moduleId);
        setActiveLessonId(lesson.id);
        setActiveSectionId(section?.id ?? null);

        setLessonTitle(lesson.title);
        setSectionTitle(sectionTitleRef.current);
        setLessonContent(content);

        setDirty(false);
        setSaveStatus("saved");
      } catch (err: unknown) {
        console.error("Load lesson error:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Gagal memuat sesi pembelajaran.";

        setStudioError(message);
        toast.error(message);
      } finally {
        if (requestId === loadRequestRef.current) {
          setStudioLoading(false);
        }
      }
    },
    []
  );

  /* =========================================
     SAVE BEFORE SWITCHING
  ========================================= */

  const ensureCurrentSaved = useCallback(
    async (): Promise<boolean> => {
      if (
        !dirty &&
        savedRevisionRef.current === revisionRef.current
      ) {
        await saveQueueRef.current.catch(() => undefined);

        return (
          savedRevisionRef.current === revisionRef.current
        );
      }

      const success = await saveLesson(true);

      await saveQueueRef.current.catch(() => undefined);

      return (
        success &&
        savedRevisionRef.current === revisionRef.current
      );
    },
    [dirty, saveLesson]
  );

  /* =========================================
     CHANGE SECTION
  ========================================= */

  const handleSectionSelect = useCallback(
    async (sectionId: string) => {
      if (sectionId === sectionIdRef.current) return;

      if (
        studioClosingRef.current ||
        studioLoading ||
        switchingRef.current ||
        !lessonIdRef.current
      ) {
        return;
      }

      switchingRef.current = true;

      const targetLessonId = lessonIdRef.current;

      try {
        const success = await ensureCurrentSaved();

        if (!success) {
          toast.error(
            "Bagian materi tidak berpindah karena perubahan belum tersimpan."
          );

          return;
        }

        if (
          studioClosingRef.current ||
          lessonIdRef.current !== targetLessonId
        ) {
          return;
        }

        await loadSection(sectionId, targetLessonId);
      } finally {
        switchingRef.current = false;
      }
    },
    [
      studioLoading,
      ensureCurrentSaved,
      loadSection,
    ]
  );

  /* =========================================
     CHANGE LESSON
  ========================================= */

  const handleLessonSelect = useCallback(
    async (lessonId: string) => {
      if (lessonId === lessonIdRef.current) return;

      if (
        studioClosingRef.current ||
        studioLoading ||
        switchingRef.current
      ) {
        return;
      }

      switchingRef.current = true;

      try {
        const success = await ensureCurrentSaved();

        if (!success) {
          toast.error(
            "Sesi tidak berpindah karena perubahan sebelumnya belum tersimpan."
          );

          return;
        }

        const targetModuleId = moduleIdRef.current;

        if (!targetModuleId) return;

        await loadLesson(lessonId, targetModuleId);
      } finally {
        switchingRef.current = false;
      }
    },
    [studioLoading, ensureCurrentSaved, loadLesson]
  );

  /* =========================================
     CHANGE MODULE
  ========================================= */

  const handleModuleChange = useCallback(
    async (moduleId: string) => {
      if (moduleId === moduleIdRef.current) return;

      if (
        studioClosingRef.current ||
        studioLoading ||
        switchingRef.current
      ) {
        return;
      }

      switchingRef.current = true;

      try {
        const success = await ensureCurrentSaved();

        if (!success) {
          toast.error(
            "Modul tidak berpindah karena materi belum tersimpan."
          );

          return;
        }

        const requestId = ++loadRequestRef.current;

        setStudioLoading(true);
        setStudioError(null);

        try {
          const { data: lessons, error: lessonsError } =
            await supabase
              .from("course_lessons")
              .select(
                "id, module_id, title, content_json"
              )
              .eq("module_id", moduleId)
              .order("sort_order", { ascending: true });

          if (lessonsError) throw lessonsError;

          if (requestId !== loadRequestRef.current) return;

          if (!lessons || lessons.length === 0) {
            studioSessionRef.current += 1;

            moduleIdRef.current = moduleId;
            lessonIdRef.current = null;
            sectionIdRef.current = null;

            sectionOrderRef.current = 0;

            titleRef.current = "";
            sectionTitleRef.current = "";
            contentRef.current = emptyContent;

            revisionRef.current = 0;
            savedRevisionRef.current = 0;

            setActiveModuleId(moduleId);
            setActiveLessonId(null);
            setActiveSectionId(null);

            setLessonTitle("");
            setSectionTitle("");
            setLessonContent(emptyContent);

            setDirty(false);
            setSaveStatus("saved");

            return;
          }

          await loadLesson(lessons[0].id, moduleId);
        } catch (err: unknown) {
          console.error("Change module error:", err);

          const message =
            err instanceof Error
              ? err.message
              : "Gagal membuka modul.";

          setStudioError(message);
          toast.error(message);
        } finally {
          if (requestId === loadRequestRef.current) {
            setStudioLoading(false);
          }
        }
      } finally {
        switchingRef.current = false;
      }
    },
    [studioLoading, ensureCurrentSaved, loadLesson]
  );

  /* =========================================
     OPEN GRADEUP STUDIO
  ========================================= */

  const openStudio = useCallback(
    async (course: CourseItem) => {
      if (
        studioOpeningRef.current ||
        studioClosingRef.current
      ) {
        return;
      }

      studioOpeningRef.current = true;

      const requestId = ++loadRequestRef.current;

      setStudioLoading(true);
      setStudioError(null);

      try {
        let moduleId: string | null = null;

        const { data: modules, error: moduleError } =
          await supabase
            .from("course_modules")
            .select("id, title, sort_order")
            .eq("course_id", course.id)
            .order("sort_order", { ascending: true })
            .limit(1);

        if (moduleError) throw moduleError;

        if (modules && modules.length > 0) {
          moduleId = modules[0].id;
        } else {
          const {
            data: newModule,
            error: createModuleError,
          } = await supabase
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

          toast.success("Modul Materi Utama berhasil dibuat.");
        }

        if (requestId !== loadRequestRef.current) return;

        if (!moduleId) {
          throw new Error(
            "Modul pembelajaran tidak ditemukan."
          );
        }

        setActiveCourse(course);
        setActiveModuleId(moduleId);

        moduleIdRef.current = moduleId;

        const { data: lessons, error: lessonError } =
          await supabase
            .from("course_lessons")
            .select(
              "id, module_id, title, content_json"
            )
            .eq("module_id", moduleId)
            .order("sort_order", { ascending: true })
            .limit(1);

        if (lessonError) throw lessonError;

        if (requestId !== loadRequestRef.current) return;

        if (lessons && lessons.length > 0) {
          await loadLesson(lessons[0].id, moduleId);
        } else {
          studioSessionRef.current += 1;

          lessonIdRef.current = null;
          sectionIdRef.current = null;

          sectionOrderRef.current = 0;

          titleRef.current = "";
          sectionTitleRef.current = "";
          contentRef.current = emptyContent;

          revisionRef.current = 0;
          savedRevisionRef.current = 0;

          setActiveLessonId(null);
          setActiveSectionId(null);

          setLessonTitle("");
          setSectionTitle("");
          setLessonContent(emptyContent);

          setDirty(false);
          setSaveStatus("saved");
        }
      } catch (err: unknown) {
        console.error("Open GradeUp Studio error:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Gagal membuka editor.";

        setStudioError(message);
        toast.error(message);
      } finally {
        studioOpeningRef.current = false;

        if (requestId === loadRequestRef.current) {
          setStudioLoading(false);
        }
      }
    },
    [loadLesson]
  );

  /* =========================================
     UPDATE DOCUMENT CONTENT
  ========================================= */

  const handleContentChange = useCallback(
    (content: JSONContent) => {
      if (
        studioClosingRef.current ||
        studioLoading
      ) {
        return;
      }

      contentRef.current = content;

      revisionRef.current += 1;

      setLessonContent(content);
      setDirty(true);
      setSaveStatus("dirty");
    },
    [studioLoading]
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      if (studioClosingRef.current) return;

      titleRef.current = value;

      revisionRef.current += 1;

      setLessonTitle(value);
      setDirty(true);
      setSaveStatus("dirty");
    },
    []
  );

  const handleSectionTitleChange = useCallback(
    (value: string) => {
      if (studioClosingRef.current) return;

      sectionTitleRef.current = value;

      revisionRef.current += 1;

      setSectionTitle(value);
      setDirty(true);
      setSaveStatus("dirty");
    },
    []
  );

  /* =========================================
     SECTION TITLE SYNC FROM STRUCTURE PANEL
  ========================================= */

  const handlePanelSectionTitleChange = useCallback(
    (sectionId: string, title: string) => {
      if (sectionId !== sectionIdRef.current) return;

      if (studioClosingRef.current) return;

      sectionTitleRef.current = title;

      revisionRef.current += 1;

      setSectionTitle(title);
      setDirty(true);
      setSaveStatus("dirty");
    },
    []
  );

  /* =========================================
     AUTOSAVE
  ========================================= */

  useEffect(() => {
    if (
      !activeCourse ||
      !activeModuleId ||
      !activeLessonId ||
      !activeSectionId ||
      !dirty ||
      !lessonTitle.trim() ||
      !sectionTitle.trim() ||
      studioLoading ||
      studioClosing
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveLesson(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    activeCourse,
    activeModuleId,
    activeLessonId,
    activeSectionId,
    dirty,
    lessonContent,
    lessonTitle,
    sectionTitle,
    studioLoading,
    studioClosing,
    saveLesson,
  ]);

  /* =========================================
     MANUAL SAVE
  ========================================= */

  const handleManualSave = useCallback(async () => {
    const success = await saveLesson(true);

    if (success) {
      toast.success("Materi berhasil disimpan.");
    }
  }, [saveLesson]);

  /* =========================================
     BACK TO COURSE LIST
  ========================================= */

  const closeStudio = async () => {
    if (studioClosingRef.current) return;

    studioClosingRef.current = true;
    setStudioClosing(true);

    try {
      await saveQueueRef.current.catch(() => undefined);

      let attempts = 0;
      const maxAttempts = 5;

      while (
        savedRevisionRef.current !== revisionRef.current &&
        attempts < maxAttempts
      ) {
        const previousSavedRevision =
          savedRevisionRef.current;

        const success = await saveLesson(true);

        await saveQueueRef.current.catch(() => undefined);

        attempts += 1;

        if (
          !success &&
          savedRevisionRef.current === previousSavedRevision
        ) {
          toast.error(
            "Editor tetap terbuka karena materi belum berhasil disimpan."
          );

          return;
        }
      }

      if (
        savedRevisionRef.current !== revisionRef.current
      ) {
        toast.error(
          "Masih ada perubahan yang belum tersimpan."
        );

        setDirty(true);
        setSaveStatus("dirty");

        return;
      }

      studioSessionRef.current += 1;
      loadRequestRef.current += 1;

      setActiveCourse(null);
      setActiveModuleId(null);
      setActiveLessonId(null);
      setActiveSectionId(null);

      setLessonTitle("");
      setSectionTitle("");
      setLessonContent(emptyContent);

      lessonIdRef.current = null;
      sectionIdRef.current = null;
      moduleIdRef.current = null;

      sectionOrderRef.current = 0;

      contentRef.current = emptyContent;
      titleRef.current = "";
      sectionTitleRef.current = "";

      revisionRef.current = 0;
      savedRevisionRef.current = 0;

      setDirty(false);
      setSaveStatus("saved");
      setStudioError(null);
    } catch (err: unknown) {
      console.error("Close Studio error:", err);

      toast.error(
        "Editor tidak dapat ditutup: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan")
      );
    } finally {
      studioClosingRef.current = false;
      setStudioClosing(false);
    }
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
              onClick={() => void closeStudio()}
              disabled={studioClosing}
              aria-label="Kembali ke daftar kursus"
            >
              {studioClosing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
            </Button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                GradeUp Studio
              </p>

              <h2 className="truncate text-lg font-bold">
                {activeCourse.title}
              </h2>

              <p className="text-xs text-muted-foreground">
                Susun modul, sesi, materi, dan evaluasi pembelajaran
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs">
              {renderSaveStatus()}
            </div>

            <Button
              onClick={() => void handleManualSave()}
              disabled={
                saveStatus === "saving" ||
                studioClosing ||
                studioLoading ||
                !activeLessonId ||
                !activeSectionId ||
                !lessonTitle.trim() ||
                !sectionTitle.trim()
              }
              className="gap-2"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan
            </Button>
          </div>
        </div>

        {studioError && (
          <Card className="flex items-start gap-3 border-destructive/30 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />

            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Terjadi kesalahan
              </p>

              <p className="text-sm text-muted-foreground">
                {studioError}
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="min-w-0">
            <CourseStructurePanel
              courseId={activeCourse.id}
              activeModuleId={activeModuleId}
              activeLessonId={activeLessonId}
              activeSectionId={activeSectionId}
              onModuleChange={(moduleId) => {
                void handleModuleChange(moduleId);
              }}
              onLessonSelect={(lessonId) => {
                void handleLessonSelect(lessonId);
              }}
              onSectionSelect={(sectionId) => {
                void handleSectionSelect(sectionId);
              }}
              onSectionTitleChange={handlePanelSectionTitleChange}
            />
          </div>

          <div className="min-w-0 space-y-4">
            {studioLoading ? (
              <Card className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />

                <p className="text-sm text-muted-foreground">
                  Memuat materi pembelajaran...
                </p>
              </Card>
            ) : !activeLessonId ? (
              <Card className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />

                <h3 className="font-semibold">
                  Belum ada sesi pembelajaran
                </h3>

                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Pilih modul di panel sebelah kiri, kemudian tambahkan
                  sesi pembelajaran untuk mulai menulis materi.
                </p>
              </Card>
            ) : !activeSectionId ? (
              <Card className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground" />

                <h3 className="font-semibold">
                  Belum ada bagian materi
                </h3>

                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Tambahkan bagian materi melalui panel Struktur
                  Pembelajaran di sebelah kiri.
                </p>
              </Card>
            ) : (
              <>
                <Card className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson-title">
                      Judul Sesi Pembelajaran
                    </Label>

                    <Input
                      id="lesson-title"
                      value={lessonTitle}
                      onChange={(event) =>
                        handleTitleChange(event.target.value)
                      }
                      disabled={studioClosing}
                      placeholder="Masukkan judul sesi..."
                      className="text-base font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section-title">
                      Judul Bagian Materi
                    </Label>

                    <Input
                      id="section-title"
                      value={sectionTitle}
                      onChange={(event) =>
                        handleSectionTitleChange(event.target.value)
                      }
                      disabled={studioClosing}
                      placeholder="Masukkan judul bagian materi..."
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
                      {activeCourse.grade !== null
                        ? `Kelas ${activeCourse.grade}`
                        : "Kelas belum diatur"}
                    </Badge>

                    <Badge variant="outline">
                      Bagian Materi
                    </Badge>
                  </div>
                </Card>

                <div
                  className={
                    studioClosing
                      ? "pointer-events-none opacity-70"
                      : ""
                  }
                >
                  <EditorCanvas
                    key={`${activeLessonId}-${activeSectionId}`}
                    initialContent={lessonContent}
                    onChange={handleContentChange}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                  <div className="text-sm text-muted-foreground">
                    Materi otomatis disimpan setelah 1,5 detik.
                  </div>

                  <Button
                    onClick={() => void handleManualSave()}
                    disabled={
                      saveStatus === "saving" ||
                      studioClosing ||
                      studioLoading ||
                      !lessonTitle.trim() ||
                      !sectionTitle.trim()
                    }
                    className="gap-2"
                  >
                    {saveStatus === "saving" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Simpan Materi
                  </Button>
                </div>

                {/* =====================================
                    CHECKPOINT DAN EVALUASI AKHIR
                ====================================== */}

                <div className="pt-2">
                  <LessonAssessmentPanel
                    key={`${activeLessonId}-${activeSectionId}`}
                    lessonId={activeLessonId}
                    sectionId={activeSectionId}
                    sectionTitle={sectionTitle}
                  />
                </div>
              </>
            )}
          </div>
        </div>
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
              onClick={() => void fetchData()}
              disabled={loading || studioLoading}
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
              onClick={openCreateForm}
              disabled={studioLoading}
            >
              <Plus className="mr-1 h-4 w-4" />
              Tambah Materi
            </Button>
          </div>
        }
      />

      {studioLoading && (
        <Card className="flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />

          <div>
            <p className="text-sm font-semibold">
              Menyiapkan GradeUp Studio
            </p>

            <p className="text-xs text-muted-foreground">
              Memuat kursus dan materi dari Supabase...
            </p>
          </div>
        </Card>
      )}

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
              onRetry={() => void fetchData()}
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
                <TableHead>Kelas</TableHead>
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
                          "relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br",
                          gradients[0]
                        )}
                      >
                        {c.thumbnail &&
                          /^https?:\/\//i.test(c.thumbnail) && (
                            <img
                              src={c.thumbnail}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          )}

                        {(!c.thumbnail ||
                          !/^https?:\/\//i.test(c.thumbnail)) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-white/80" />
                          </div>
                        )}
                      </div>

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
                    {c.grade !== null ? (
                      <Badge variant="muted">
                        Kelas {c.grade}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Belum diatur
                      </span>
                    )}
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
                          disabled={studioLoading}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => openEditForm(c)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Kursus
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          disabled={studioLoading}
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

      {/* =========================================
          COURSE FORM DIALOG
      ========================================= */}

      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setErrs({});
            setThumbnailPreviewError(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {draft.id ? "Edit Kursus" : "Tambah Kursus"}
                </DialogTitle>

                <DialogDescription>
                  Isi informasi kursus dan tambahkan gambar agar
                  tampilan materi lebih menarik.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* JUDUL */}

                <div className="space-y-2">
                  <Label htmlFor="c-title">
                    Judul Kursus
                  </Label>

                  <Input
                    id="c-title"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        title: event.target.value,
                      })
                    }
                    placeholder="Contoh: Matematika Dasar"
                  />

                  <FieldError message={errs.title} />
                </div>

                {/* DESKRIPSI */}

                <div className="space-y-2">
                  <Label htmlFor="c-desc">
                    Deskripsi
                  </Label>

                  <textarea
                    id="c-desc"
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        description: event.target.value,
                      })
                    }
                    placeholder="Jelaskan gambaran umum kursus..."
                  />
                </div>

                {/* KATEGORI, JENJANG, DAN KELAS */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kategori</Label>

                    <Select
                      value={draft.category}
                      onValueChange={(value) =>
                        setDraft({
                          ...draft,
                          category: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
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
                      onValueChange={(value) => {
                        const nextLevel = value as Level;
                        const nextGrades =
                          getGradeOptions(nextLevel);

                        setDraft({
                          ...draft,
                          level: nextLevel,
                          grade: nextGrades[0] ?? null,
                        });

                        setErrs((previous) => ({
                          ...previous,
                          grade: "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenjang" />
                      </SelectTrigger>

                      <SelectContent>
                        {LEVELS.map((level) => (
                          <SelectItem
                            key={level}
                            value={level}
                          >
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Kelas</Label>

                    <Select
                      value={
                        draft.grade !== null
                          ? String(draft.grade)
                          : ""
                      }
                      onValueChange={(value) => {
                        setDraft({
                          ...draft,
                          grade: Number(value),
                        });

                        setErrs((previous) => ({
                          ...previous,
                          grade: "",
                        }));
                      }}
                      disabled={
                        getGradeOptions(draft.level).length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>

                      <SelectContent>
                        {getGradeOptions(draft.level).map(
                          (grade) => (
                            <SelectItem
                              key={grade}
                              value={String(grade)}
                            >
                              Kelas {grade}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>

                    <FieldError message={errs.grade} />

                    <p className="text-xs text-muted-foreground">
                      Pilihan kelas akan menyesuaikan jenjang yang dipilih.
                    </p>
                  </div>
                </div>

                {/* PENGAJAR */}

                <div className="space-y-2">
                  <Label htmlFor="c-ins">
                    Nama Pengajar
                  </Label>

                  <Input
                    id="c-ins"
                    value={draft.instructor}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        instructor: event.target.value,
                      })
                    }
                    placeholder="Nama pengajar atau lembaga"
                  />

                  <FieldError message={errs.instructor} />
                </div>

                {/* THUMBNAIL */}

                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />

                    <div>
                      <Label htmlFor="c-thumbnail">
                        Gambar Thumbnail Kursus
                      </Label>

                      <p className="text-xs text-muted-foreground">
                        Gambar utama yang akan tampil pada kartu materi.
                      </p>
                    </div>
                  </div>

                  <Input
                    id="c-thumbnail"
                    type="url"
                    value={draft.thumbnail}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        thumbnail: event.target.value,
                      });

                      setThumbnailPreviewError(false);
                    }}
                    placeholder="https://contoh.com/gambar-materi.jpg"
                    aria-invalid={!!errs.thumbnail}
                  />

                  <FieldError message={errs.thumbnail} />

                  <p className="text-xs text-muted-foreground">
                    Gunakan URL gambar publik yang diawali
                    https:// atau http://. Disarankan gambar
                    landscape dengan rasio 16:9.
                  </p>

                  {draft.thumbnail.trim() &&
                    /^https?:\/\/.+/i.test(
                      draft.thumbnail.trim()
                    ) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            Pratinjau Gambar
                          </Label>

                          <Badge variant="outline">
                            16:9
                          </Badge>
                        </div>

                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                          {!thumbnailPreviewError ? (
                            <img
                              key={draft.thumbnail}
                              src={draft.thumbnail.trim()}
                              alt="Pratinjau thumbnail kursus"
                              className="h-full w-full object-cover"
                              onError={() => {
                                setThumbnailPreviewError(true);
                              }}
                              onLoad={() => {
                                setThumbnailPreviewError(false);
                              }}
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                              <AlertCircle className="h-8 w-8 text-destructive" />

                              <p className="text-sm font-medium">
                                Gambar tidak dapat dimuat
                              </p>

                              <p className="text-xs text-muted-foreground">
                                Periksa kembali URL gambar atau
                                gunakan alamat gambar lain.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {!draft.thumbnail.trim() && (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background text-muted-foreground">
                      <ImageIcon className="h-9 w-9 opacity-40" />

                      <p className="text-xs">
                        Belum ada gambar thumbnail
                      </p>
                    </div>
                  )}
                </div>

                {/* PREMIUM DAN PUBLISH */}

                <div className="flex flex-wrap gap-6 border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="c-prem"
                      checked={draft.premium}
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          premium: value,
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
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          published: value,
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
                  onClick={() => {
                    setDraft(null);
                    setErrs({});
                    setThumbnailPreviewError(false);
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  onClick={saveCourse}
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
                      <Save className="h-4 w-4" />
                      Simpan Kursus
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================
          DELETE CONFIRMATION
      ========================================= */}

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
