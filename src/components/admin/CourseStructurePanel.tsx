
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
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

interface CourseStructurePanelProps {
  courseId: string;
  activeModuleId: string | null;
  activeLessonId: string | null;
  onModuleChange: (moduleId: string) => void;
  onLessonSelect: (lessonId: string) => void;
}

export default function CourseStructurePanel({
  courseId,
  activeModuleId,
  activeLessonId,
  onModuleChange,
  onLessonSelect,
}: CourseStructurePanelProps) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const [showModuleInput, setShowModuleInput] = useState(false);
  const [showLessonInput, setShowLessonInput] = useState(false);

  const fetchStructure = useCallback(async () => {
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

      setLessons((lessonData ?? []) as LessonItem[]);
    } catch (err: unknown) {
      console.error("Fetch course structure error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Gagal memuat struktur pembelajaran.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void fetchStructure();
  }, [fetchStructure]);

  const selectedModule = modules.find(
    (module) => module.id === activeModuleId
  );

  const moduleLessons = lessons.filter(
    (lesson) => lesson.module_id === activeModuleId
  );

  const createModule = async () => {
    const title = newModuleTitle.trim();

    if (!title) {
      toast.error("Nama modul wajib diisi.");
      return;
    }

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
      toast.error(
        "Gagal menambahkan modul: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

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

    setWorking(true);

    try {
      const nextOrder =
        moduleLessons.length > 0
          ? Math.max(...moduleLessons.map((item) => item.sort_order)) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("course_lessons")
        .insert({
          module_id: activeModuleId,
          title,
          description: "",
          content_json: {
            type: "doc",
            content: [{ type: "paragraph" }],
          },
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
      setShowLessonInput(false);

      toast.success("Sesi pembelajaran berhasil ditambahkan.");
    } catch (err: unknown) {
      toast.error(
        "Gagal menambahkan sesi: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan")
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div>
          <h3 className="font-semibold">Struktur Pembelajaran</h3>
          <p className="text-xs text-muted-foreground">
            Kelola modul dan sesi kursus
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => void fetchStructure()}
          disabled={loading || working}
          aria-label="Refresh struktur"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
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
              onChange={(event) =>
                setNewModuleTitle(event.target.value)
              }
              placeholder="Nama modul baru..."
              disabled={working}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void createModule();
                }
              }}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void createModule()}
                disabled={working}
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
            >
              Coba Lagi
            </Button>
          </div>
        ) : modules.length === 0 ? (
          <div className="py-8 text-center">
            <Folder className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Belum ada modul
            </p>
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
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />

                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {index + 1}. {module.title}
                    </span>

                    <Badge variant="outline" className="text-xs">
                      {moduleLessonItems.length}
                    </Badge>
                  </button>

                  {isActive && (
                    <div className="space-y-2 border-t bg-muted/20 p-2">
                      {moduleLessonItems.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                          Belum ada sesi pembelajaran.
                        </p>
                      ) : (
                        moduleLessonItems.map((lesson, lessonIndex) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => onLessonSelect(lesson.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                              activeLessonId === lesson.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <BookOpen className="h-4 w-4 shrink-0" />

                            <span className="min-w-0 flex-1 truncate">
                              {lessonIndex + 1}. {lesson.title}
                            </span>

                            {activeLessonId === lesson.id && (
                              <Badge
                                variant="secondary"
                                className="shrink-0"
                              >
                                Aktif
                              </Badge>
                            )}
                          </button>
                        ))
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => setShowLessonInput((value) => !value)}
                        disabled={working}
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Sesi
                      </Button>

                      {showLessonInput && (
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
                                void createLesson();
                              }
                            }}
                          />

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => void createLesson()}
                              disabled={working}
                            >
                              {working ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Buat Sesi"
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowLessonInput(false);
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
