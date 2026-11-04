
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  ClipboardList,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AssessmentType = "checkpoint" | "final";

interface LessonAssessmentPanelProps {
  lessonId: string;
  sectionId?: string | null;
  sectionTitle?: string;
}

interface Assessment {
  id: string;
  lesson_id: string;
  section_id: string | null;
  assessment_type: AssessmentType;
  title: string;
  sort_order: number;
}

interface AssessmentOption {
  id: string;
  text: string;
}

interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  options: AssessmentOption[];
  correct_answer: string;
  explanation: string;
  sort_order: number;
}

interface QuestionDraft {
  id?: string;
  question_text: string;
  options: AssessmentOption[];
  correct_answer: string;
  explanation: string;
}

const DEFAULT_OPTIONS: AssessmentOption[] = [
  { id: "A", text: "" },
  { id: "B", text: "" },
  { id: "C", text: "" },
  { id: "D", text: "" },
];

const emptyQuestion = (): QuestionDraft => ({
  question_text: "",
  options: DEFAULT_OPTIONS.map((option) => ({ ...option })),
  correct_answer: "A",
  explanation: "",
});

export default function LessonAssessmentPanel({
  lessonId,
  sectionId,
  sectionTitle,
}: LessonAssessmentPanelProps) {
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>("checkpoint");

  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [assessmentTitle, setAssessmentTitle] = useState("");

  const [questions, setQuestions] = useState<
    AssessmentQuestion[]
  >([]);

  const [draft, setDraft] = useState<QuestionDraft | null>(null);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const requestRef = useRef(0);

  const isCheckpoint = assessmentType === "checkpoint";

  const loadAssessment = useCallback(async () => {
    const requestId = ++requestRef.current;

    if (!lessonId || (isCheckpoint && !sectionId)) {
      setAssessment(null);
      setQuestions([]);
      setAssessmentTitle("");
      setDraft(null);
      return;
    }

    setLoading(true);
    setDraft(null);

    try {
      let query = supabase
        .from("lesson_assessments")
        .select(
          "id, lesson_id, section_id, assessment_type, title, sort_order"
        )
        .eq("lesson_id", lessonId)
        .eq("assessment_type", assessmentType);

      if (isCheckpoint) {
        query = query.eq("section_id", sectionId!);
      } else {
        query = query.is("section_id", null);
      }

      const { data: assessmentData, error: assessmentError } =
        await query.maybeSingle();

      if (assessmentError) throw assessmentError;

      if (requestId !== requestRef.current) return;

      if (!assessmentData) {
        setAssessment(null);
        setAssessmentTitle("");
        setQuestions([]);
        return;
      }

      const currentAssessment = assessmentData as Assessment;

      const { data: questionData, error: questionError } =
        await supabase
          .from("lesson_assessment_questions")
          .select(
            "id, assessment_id, question_text, options, correct_answer, explanation, sort_order"
          )
          .eq("assessment_id", currentAssessment.id)
          .order("sort_order", { ascending: true });

      if (questionError) throw questionError;

      if (requestId !== requestRef.current) return;

      setAssessment(currentAssessment);
      setAssessmentTitle(currentAssessment.title);
      setQuestions(
        (questionData ?? []) as AssessmentQuestion[]
      );
    } catch (error: unknown) {
      console.error("Load assessment error:", error);

      if (requestId === requestRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal memuat evaluasi."
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [lessonId, sectionId, assessmentType, isCheckpoint]);

  useEffect(() => {
    void loadAssessment();

    return () => {
      requestRef.current += 1;
    };
  }, [loadAssessment]);

  const createAssessment = async () => {
    if (!lessonId) return;

    if (isCheckpoint && !sectionId) {
      toast.error("Pilih bagian materi terlebih dahulu.");
      return;
    }

    setCreating(true);

    try {
      const payload = {
        lesson_id: lessonId,
        section_id: isCheckpoint ? sectionId : null,
        assessment_type: assessmentType,
        title: isCheckpoint
          ? `Checkpoint - ${sectionTitle || "Bagian Materi"}`
          : "Evaluasi Akhir Sesi",
        sort_order: 0,
      };

      const { data, error } = await supabase
        .from("lesson_assessments")
        .insert(payload)
        .select(
          "id, lesson_id, section_id, assessment_type, title, sort_order"
        )
        .single();

      if (error) throw error;

      setAssessment(data as Assessment);
      setAssessmentTitle(data.title);
      setQuestions([]);

      toast.success("Evaluasi berhasil dibuat.");
    } catch (error: unknown) {
      console.error("Create assessment error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal membuat evaluasi."
      );

      await loadAssessment();
    } finally {
      setCreating(false);
    }
  };

  const saveAssessmentTitle = async () => {
    if (!assessment) return;

    const title = assessmentTitle.trim();

    if (!title) {
      toast.error("Judul evaluasi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("lesson_assessments")
        .update({ title })
        .eq("id", assessment.id);

      if (error) throw error;

      setAssessment({ ...assessment, title });

      toast.success("Judul evaluasi berhasil disimpan.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan judul evaluasi."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (optionId: string, text: string) => {
    if (!draft) return;

    setDraft({
      ...draft,
      options: draft.options.map((option) =>
        option.id === optionId
          ? { ...option, text }
          : option
      ),
    });
  };

  const saveQuestion = async () => {
    if (!assessment || !draft) return;

    const questionText = draft.question_text.trim();

    if (!questionText) {
      toast.error("Pertanyaan wajib diisi.");
      return;
    }

    if (draft.options.some((option) => !option.text.trim())) {
      toast.error("Semua pilihan jawaban A–D wajib diisi.");
      return;
    }

    if (
      !draft.options.some(
        (option) => option.id === draft.correct_answer
      )
    ) {
      toast.error("Pilih kunci jawaban yang benar.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        assessment_id: assessment.id,
        question_text: questionText,
        options: draft.options.map((option) => ({
          id: option.id,
          text: option.text.trim(),
        })),
        correct_answer: draft.correct_answer,
        explanation: draft.explanation.trim(),
      };

      if (draft.id) {
        const { error } = await supabase
          .from("lesson_assessment_questions")
          .update(payload)
          .eq("id", draft.id)
          .eq("assessment_id", assessment.id);

        if (error) throw error;

        toast.success("Soal berhasil diperbarui.");
      } else {
        const nextOrder =
          questions.length > 0
            ? Math.max(
                ...questions.map((question) => question.sort_order)
              ) + 1
            : 0;

        const { error } = await supabase
          .from("lesson_assessment_questions")
          .insert({
            ...payload,
            sort_order: nextOrder,
          });

        if (error) throw error;

        toast.success("Soal berhasil ditambahkan.");
      }

      setDraft(null);
      await loadAssessment();
    } catch (error: unknown) {
      console.error("Save question error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan soal."
      );
    } finally {
      setSaving(false);
    }
  };

  const editQuestion = (question: AssessmentQuestion) => {
    setDraft({
      id: question.id,
      question_text: question.question_text,
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            id: option.id,
            text: option.text,
          }))
        : DEFAULT_OPTIONS.map((option) => ({ ...option })),
      correct_answer: question.correct_answer,
      explanation: question.explanation ?? "",
    });
  };

  const deleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm(
      "Yakin ingin menghapus soal ini?"
    );

    if (!confirmed || !assessment) return;

    setDeletingId(questionId);

    try {
      const { error } = await supabase
        .from("lesson_assessment_questions")
        .delete()
        .eq("id", questionId)
        .eq("assessment_id", assessment.id);

      if (error) throw error;

      toast.success("Soal berhasil dihapus.");
      await loadAssessment();
    } catch (error: unknown) {
      console.error("Delete question error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menghapus soal."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const startNewQuestion = () => {
    setDraft(emptyQuestion());
  };

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h3 className="font-semibold">
              Pengelolaan Evaluasi
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Kelola soal untuk mengukur pemahaman siswa.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadAssessment()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <Button
          type="button"
          variant={isCheckpoint ? "default" : "ghost"}
          onClick={() => setAssessmentType("checkpoint")}
          className="w-full"
        >
          Checkpoint
        </Button>

        <Button
          type="button"
          variant={!isCheckpoint ? "default" : "ghost"}
          onClick={() => setAssessmentType("final")}
          className="w-full"
        >
          Evaluasi Akhir
        </Button>
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">
              {isCheckpoint
                ? "Checkpoint Bagian Materi"
                : "Evaluasi Akhir Sesi"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {isCheckpoint
                ? sectionTitle || "Bagian materi aktif"
                : "Dikerjakan setelah seluruh checkpoint selesai."}
            </p>
          </div>

          <Badge variant="outline">
            {isCheckpoint ? "Per bagian" : "Per sesi"}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat data evaluasi...
        </div>
      ) : isCheckpoint && !sectionId ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="font-medium">
            Belum ada bagian materi yang dipilih.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih bagian materi untuk mengelola checkpoint-nya.
          </p>
        </div>
      ) : !assessment ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />

          <h4 className="font-semibold">
            Evaluasi belum dibuat
          </h4>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {isCheckpoint
              ? "Buat checkpoint untuk bagian materi ini. Soal dapat ditambahkan setelah evaluasi dibuat."
              : "Buat evaluasi akhir untuk menguji pemahaman siswa terhadap seluruh sesi."}
          </p>

          <Button
            onClick={() => void createAssessment()}
            disabled={creating}
            className="mt-4 gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Buat {isCheckpoint ? "Checkpoint" : "Evaluasi Akhir"}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="assessment-title">
                Judul Evaluasi
              </Label>

              <Badge variant="muted">
                {questions.length} soal
              </Badge>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="assessment-title"
                value={assessmentTitle}
                onChange={(event) =>
                  setAssessmentTitle(event.target.value)
                }
                placeholder="Judul evaluasi..."
              />

              <Button
                variant="outline"
                onClick={() => void saveAssessmentTitle()}
                disabled={
                  saving ||
                  !assessmentTitle.trim() ||
                  assessmentTitle.trim() === assessment.title
                }
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Simpan Judul
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isCheckpoint
                ? "Jumlah soal checkpoint dapat ditentukan sesuai kebutuhan."
                : "Jumlah soal evaluasi akhir dapat ditentukan sesuai kebutuhan."}
            </p>
          </div>

          {draft && (
            <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold">
                  {draft.id ? "Edit Soal" : "Tambah Soal Baru"}
                </h4>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                  aria-label="Tutup formulir soal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-text">
                  Pertanyaan
                </Label>

                <textarea
                  id="question-text"
                  value={draft.question_text}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      question_text: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Tuliskan pertanyaan..."
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-3">
                <Label>Pilihan Jawaban</Label>

                {draft.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          correct_answer: option.id,
                        })
                      }
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition ${
                        draft.correct_answer === option.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-input bg-background"
                      }`}
                      title={`Jadikan ${option.id} sebagai jawaban benar`}
                    >
                      {option.id}
                    </button>

                    <Input
                      value={option.text}
                      onChange={(event) =>
                        updateOption(option.id, event.target.value)
                      }
                      placeholder={`Pilihan ${option.id}`}
                    />

                    {draft.correct_answer === option.id && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground">
                  Klik huruf A, B, C, atau D untuk menentukan
                  kunci jawaban.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-explanation">
                  Pembahasan Jawaban
                </Label>

                <textarea
                  id="question-explanation"
                  value={draft.explanation}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      explanation: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Tuliskan penjelasan mengapa jawaban tersebut benar..."
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  onClick={() => void saveQuestion()}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Soal
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold">
                Daftar Soal
              </h4>

              <Button
                size="sm"
                onClick={startNewQuestion}
                disabled={!!draft}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Soal
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="font-medium">
                  Belum ada soal.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Tambahkan soal pertama untuk evaluasi ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            Soal {index + 1}
                          </Badge>

                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-600"
                          >
                            Kunci: {question.correct_answer}
                          </Badge>
                        </div>

                        <p className="whitespace-pre-wrap text-sm font-medium">
                          {question.question_text}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editQuestion(question)}
                          disabled={!!draft || !!deletingId}
                          aria-label="Edit soal"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            void deleteQuestion(question.id)
                          }
                          disabled={!!draft || !!deletingId}
                          aria-label="Hapus soal"
                        >
                          {deletingId === question.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(question.options ?? []).map((option) => (
                        <div
                          key={option.id}
                          className={`rounded-md border px-3 py-2 text-sm ${
                            option.id === question.correct_answer
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-border"
                          }`}
                        >
                          <span className="mr-2 font-semibold">
                            {option.id}.
                          </span>
                          {option.text}
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="mt-3 rounded-md bg-muted/60 p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">
                          PEMBAHASAN
                        </p>

                        <p className="whitespace-pre-wrap text-sm">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
