
import { useCallback, useEffect, useState } from "react";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
}

interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  estimated_minutes: number;
}

interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

interface CourseStudioProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
  onOpenLesson: (
    moduleId: string,
    lessonId: string
  ) => void;
}

export default function CourseStudio({
  courseId,
  courseTitle,
  onBack,
  onOpenLesson,
}: CourseStudioProps) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [moduleTitle, setModuleTitle] = useState("");

  const [lessonTitles, setLessonTitles] = useState<
    Record<string, string>
  >({});

  const [expandedModules, setExpandedModules] = useState<
    Set<string>
  >(new Set());

  const loadStructure = useCallback(async () => {
    setLoading(true);

    try {
      const { data: moduleData, error: moduleError } =
        await supabase
          .from("course_modules")
          .select(
            "id, course_id, title, description, sort_order, is_published"
          )
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

      if (moduleError) throw moduleError;

      const moduleRows = (moduleData ?? []) as CourseModule[];

      if (moduleRows.length === 0) {
        setModules([]);
        setExpandedModules(new Set());
        return;
      }

      const moduleIds = moduleRows.map((module) => module.id);

      const { data: lessonData, error: lessonError } =
        await supabase
          .from("course_lessons")
          .select(
            "id, module_id, title, description, sort_order, is_published, estimated_minutes"
          )
          .in("module_id", moduleIds)
          .order("sort_order", { ascending: true });

      if (lessonError) throw lessonError;

      const lessonRows = (lessonData ?? []) as CourseLesson[];

      const result: ModuleWithLessons[] = moduleRows.map(
        (module) => ({
          ...module,
          lessons: lessonRows.filter(
            (lesson) => lesson.module_id === module.id
          ),
        })
      );

      setModules(result);

      setExpandedModules((previous) => {
        const next = new Set(previous);

        result.forEach((module) => {
          if (previous.size === 0) {
            next.add(module.id);
          }
        });

        return next;
      });
    } catch (error: unknown) {
      console.error("Load course structure:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal memuat struktur pembelajaran."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  const createModule = async () => {
    const title = moduleTitle.trim();

    if (!title) {
      toast.error("Nama modul wajib diisi.");
      return;
    }

    setBusy(true);

    try {
      const nextOrder =
        modules.length > 0
          ? Math.max(...modules.map((item) => item.sort_order)) + 1
          : 0;

      const { error } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title,
          description: "",
          sort_order: nextOrder,
          is_published: false,
        });

      if (error) throw error;

      setModuleTitle("");

      toast.success("Modul berhasil ditambahkan.");

      await loadStructure();
    } catch (error: unknown) {
      console.error("Create module:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan modul."
      );
    } finally {
      setBusy(false);
    }
  };

  const createLesson = async (module: ModuleWithLessons) => {
    const title = (lessonTitles[module.id] ?? "").trim();

    if (!title) {
      toast.error("Judul sesi wajib diisi.");
      return;
    }

    setBusy(true);

    try {
      const nextOrder =
        module.lessons.length > 0
          ? Math.max(
              ...module.lessons.map((item) => item.sort_order)
            ) + 1
          : 0;

      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          module_id: module.id,
          title,
          description: "",
          content_json: {
            type: "doc",
            content: [{ type: "paragraph" }],
          },
          xp_reward: 10,
          estimated_minutes: 10,
          sort_order: nextOrder,
          is_published: false,
        })
        .select("id")
        .single();

      if (error) throw error;

      setLessonTitles((previous) => ({
        ...previous,
        [module.id]: "",
      }));

      toast.success("Sesi pembelajaran berhasil dibuat.");

      await loadStructure();

      onOpenLesson(module.id, data.id);
    } catch (error: unknown) {
      console.error("Create lesson:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal membuat sesi pembelajaran."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((previous) => {
      const next = new Set(previous);

      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }

      return next;
    });
  };

  const totalLessons = modules.reduce(
    (total, module) => total + module.lessons.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label="Kembali ke daftar kursus"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              GradeUp Studio
            </p>

            <h2 className="text-xl font-bold">
              {courseTitle}
            </h2>

            <p className="text-sm text-muted-foreground">
              Kelola struktur modul dan sesi pembelajaran.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadStructure()}
          disabled={loading || busy}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Layers3 className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="text-2xl font-bold">
              {modules.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Modul
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>

          <div>
            <p className="text-2xl font-bold">
              {totalLessons}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Sesi Pembelajaran
            </p>
          </div>
        </Card>
      </div>

      {/* ADD MODULE */}

      <Card className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold">
            Tambah Modul Pembelajaran
          </h3>

          <p className="text-xs text-muted-foreground">
            Modul digunakan untuk mengelompokkan beberapa sesi.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={moduleTitle}
            onChange={(event) =>
              setModuleTitle(event.target.value)
            }
            placeholder="Contoh: Modul 1 - Dasar Matematika"
            disabled={busy}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void createModule();
              }
            }}
          />

          <Button
            onClick={() => void createModule()}
            disabled={busy || !moduleTitle.trim()}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tambah Modul
          </Button>
        </div>
      </Card>

      {/* MODULE LIST */}

      {loading ? (
        <Card className="flex items-center justify-center gap-3 p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Memuat struktur pembelajaran...
          </span>
        </Card>
      ) : modules.length === 0 ? (
        <Card className="p-8 text-center">
          <Layers3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <h3 className="font-semibold">
            Belum ada modul pembelajaran
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan modul pertama untuk mulai menyusun materi.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => {
            const expanded = expandedModules.has(module.id);

            return (
              <Card key={module.id} className="overflow-hidden">
                {/* MODULE HEADER */}

                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Layers3 className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {module.title}
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        Modul {index + 1} · {module.lessons.length} sesi
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                    <Badge
                      variant={module.is_published ? "default" : "outline"}
                    >
                      {module.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>

                {/* LESSONS */}

                {expanded && (
                  <div className="space-y-3 border-t bg-muted/20 p-4">
                    {module.lessons.length === 0 ? (
                      <p className="py-3 text-center text-sm text-muted-foreground">
                        Belum ada sesi dalam modul ini.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                <BookOpen className="h-4 w-4 text-emerald-600" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {lesson.title}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Sesi {lessonIndex + 1} · sekitar{" "}
                                  {lesson.estimated_minutes} menit
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pl-12 sm:pl-0">
                              <Badge
                                variant={
                                  lesson.is_published
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {lesson.is_published
                                  ? "Published"
                                  : "Draft"}
                              </Badge>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onOpenLesson(
                                    module.id,
                                    lesson.id
                                  )
                                }
                              >
                                Buka Editor
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ADD LESSON */}

                    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
                      <Input
                        value={lessonTitles[module.id] ?? ""}
                        onChange={(event) =>
                          setLessonTitles((previous) => ({
                            ...previous,
                            [module.id]: event.target.value,
                          }))
                        }
                        placeholder="Judul sesi pembelajaran baru..."
                        disabled={busy}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void createLesson(module);
                          }
                        }}
                      />

                      <Button
                        size="sm"
                        onClick={() => void createLesson(module)}
                        disabled={
                          busy ||
                          !(lessonTitles[module.id] ?? "").trim()
                        }
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Sesi
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Perubahan struktur disimpan langsung ke Supabase. Modul dan sesi
        baru secara default berstatus Draft.
      </p>
    </div>
  );
}
