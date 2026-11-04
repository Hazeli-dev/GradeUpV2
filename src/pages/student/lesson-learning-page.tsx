
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  GraduationCap,
  Lock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

// =====================================================
// TYPES
// =====================================================

type CourseInfo = {
  id: string;
  title: string;
  premium: boolean;
};

type LessonInfo = {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  module: {
    id: string;
    title: string;
    course: CourseInfo;
  };
};

type LessonSection = {
  section_id: string;
  title: string;
  sort_order: number;
  checkpoint_id: string | null;
  checkpoint_title: string | null;
  checkpoint_completed: boolean;
  content_json?: JSONContent;
};

type AssessmentInfo = {
  id: string;
  section_id: string | null;
  assessment_type: "checkpoint" | "final";
  title: string;
  sort_order: number;
};

type QuestionOption = {
  id: string;
  text: string;
};

type AssessmentQuestion = {
  id: string;
  question_text: string;
  options: QuestionOption[];
  sort_order: number;
};

type AssessmentResult = {
  attempt_id: string;
  assessment_id: string;
  status: string;
  total_questions: number;
  correct_answers: number;
  completed: boolean;
  next_question: AssessmentQuestion | null;
};

type ProgressResult = {
  attempt_id: string;
  assessment_id: string;
  assessment_title: string;
  assessment_type: string;
  status: string;
  total_questions: number;
  correct_answers: number;
  remaining_questions: number;
  progress_percentage: number;
  completed: boolean;
  section_completed: boolean;
  next_question: AssessmentQuestion | null;
};

type LearningProgress = {
  lesson_id: string;
  sections: LessonSection[];
  final_assessment: {
    assessment_id: string;
    title: string;
    completed: boolean;
  } | null;
};

// =====================================================
// PARAGRAPH LAYOUT EXTENSION
// Menyesuaikan atribut format dari GradeUp Studio
// =====================================================

const ParagraphLayout = Extension.create({
  name: "paragraphLayout",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textIndent: {
            default: null,
            parseHTML: (element) =>
              element.style.textIndent || null,
            renderHTML: (attributes) => {
              if (!attributes.textIndent) return {};
              return {
                style: `text-indent: ${attributes.textIndent}`,
              };
            },
          },
          leftIndent: {
            default: null,
            parseHTML: (element) =>
              element.style.marginLeft || null,
            renderHTML: (attributes) => {
              if (!attributes.leftIndent) return {};
              return {
                style: `margin-left: ${attributes.leftIndent}`,
              };
            },
          },
          rightIndent: {
            default: null,
            parseHTML: (element) =>
              element.style.marginRight || null,
            renderHTML: (attributes) => {
              if (!attributes.rightIndent) return {};
              return {
                style: `margin-right: ${attributes.rightIndent}`,
              };
            },
          },
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
          marginTop: {
            default: null,
            parseHTML: (element) =>
              element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.marginTop) return {};
              return {
                style: `margin-top: ${attributes.marginTop}`,
              };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) =>
              element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) return {};
              return {
                style: `margin-bottom: ${attributes.marginBottom}`,
              };
            },
          },
        },
      },
    ];
  },
});

// =====================================================
// HELPERS
// =====================================================

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Terjadi kesalahan. Silakan coba kembali.";
}

function getOptionList(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is QuestionOption =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.text === "string"
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function LessonLearningPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonInfo | null>(null);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [assessments, setAssessments] = useState<AssessmentInfo[]>([]);
  const [learningProgress, setLearningProgress] =
    useState<LearningProgress | null>(null);

  const [selectedSectionIndex, setSelectedSectionIndex] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeAssessment, setActiveAssessment] =
    useState<AssessmentInfo | null>(null);

  const [attemptId, setAttemptId] = useState("");
  const [currentQuestion, setCurrentQuestion] =
    useState<AssessmentQuestion | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingAssessment, setStartingAssessment] =
    useState(false);

  const [answerFeedback, setAnswerFeedback] = useState<{
    correct: boolean;
    message: string;
    explanation: string | null;
  } | null>(null);

  const [assessmentStats, setAssessmentStats] = useState({
    total: 0,
    correct: 0,
    completed: false,
  });

  const [assessmentError, setAssessmentError] = useState("");
  const [showOutline, setShowOutline] = useState(true);

  // ===================================================
  // TIPTAP READ-ONLY EDITOR
  // ===================================================

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      ParagraphLayout,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Highlight,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    editorProps: {
      attributes: {
        class: "gu-prose outline-none focus:outline-none",
      },
    },
  });

  // ===================================================
  // LOAD LEARNING DATA
  // ===================================================

  const loadLearningData = useCallback(async () => {
    if (!lessonId || !courseId) {
      setError("Alamat materi tidak valid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: lessonData, error: lessonError } =
        await supabase
          .from("course_lessons")
          .select(`
            id,
            title,
            description,
            estimated_minutes,
            module:course_modules!inner (
              id,
              title,
              course:courses!inner (
                id,
                title,
                premium
              )
            )
          `)
          .eq("id", lessonId)
          .single();

      if (lessonError) throw lessonError;

      const moduleData = Array.isArray(lessonData.module)
        ? lessonData.module[0]
        : lessonData.module;

      const courseData = Array.isArray(moduleData?.course)
        ? moduleData.course[0]
        : moduleData?.course;

      if (!courseData || courseData.id !== courseId) {
        throw new Error("Materi tidak ditemukan dalam kursus ini.");
      }

      setLesson({
        ...lessonData,
        module: {
          id: moduleData.id,
          title: moduleData.title,
          course: courseData,
        },
      } as LessonInfo);

      const [
        { data: sectionData, error: sectionError },
        { data: assessmentData, error: assessmentErrorResult },
        { data: progressData, error: progressError },
      ] = await Promise.all([
        supabase
          .from("lesson_sections")
          .select("id,title,content_json,sort_order,is_published")
          .eq("lesson_id", lessonId)
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("lesson_assessments")
          .select(
            "id,section_id,assessment_type,title,sort_order"
          )
          .eq("lesson_id", lessonId)
          .order("sort_order", { ascending: true }),

        supabase.rpc("get_lesson_learning_progress", {
          p_lesson_id: lessonId,
        }),
      ]);

      if (sectionError) throw sectionError;
      if (assessmentErrorResult) throw assessmentErrorResult;
      if (progressError) throw progressError;

      const progress = progressData as LearningProgress;

      const mappedSections: LessonSection[] = (
        progress.sections || []
      ).map((item) => {
        const sectionContent = (sectionData || []).find(
          (section) => section.id === item.section_id
        );

        return {
          ...item,
          content_json: sectionContent?.content_json || {
            type: "doc",
            content: [{ type: "paragraph" }],
          },
        };
      });

      setSections(mappedSections);
      setAssessments((assessmentData || []) as AssessmentInfo[]);
      setLearningProgress(progress);

      const firstIncompleteIndex = mappedSections.findIndex(
        (section) => !section.checkpoint_completed
      );

      setSelectedSectionIndex(
        firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex
      );
    } catch (err) {
      console.error("Load learning data:", err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    loadLearningData();
  }, [loadLearningData]);

  // ===================================================
  // UPDATE EDITOR CONTENT
  // ===================================================

  const selectedSection = sections[selectedSectionIndex];

  useEffect(() => {
    if (!editor || !selectedSection) return;

    editor.commands.setContent(
      selectedSection.content_json || {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
      false
    );
  }, [editor, selectedSection]);

  // ===================================================
  // ASSESSMENT HELPERS
  // ===================================================

  const getCheckpointAssessment = (
    section: LessonSection
  ) => {
    return assessments.find(
      (item) =>
        item.assessment_type === "checkpoint" &&
        item.section_id === section.section_id
    );
  };

  const finalAssessment = useMemo(
    () =>
      assessments.find(
        (item) => item.assessment_type === "final"
      ) || null,
    [assessments]
  );

  const refreshLearningProgress = useCallback(async () => {
    if (!lessonId) return;

    const { data, error: progressError } = await supabase.rpc(
      "get_lesson_learning_progress",
      {
        p_lesson_id: lessonId,
      }
    );

    if (progressError) throw progressError;

    const progress = data as LearningProgress;
    setLearningProgress(progress);

    setSections((previous) =>
      previous.map((section) => {
        const updated = progress.sections.find(
          (item) => item.section_id === section.section_id
        );

        return updated
          ? {
              ...section,
              checkpoint_completed:
                updated.checkpoint_completed,
            }
          : section;
      })
    );
  }, [lessonId]);

  // ===================================================
  // START CHECKPOINT / FINAL ASSESSMENT
  // ===================================================

  const startAssessment = async (assessment: AssessmentInfo) => {
    setStartingAssessment(true);
    setAssessmentError("");
    setAnswerFeedback(null);
    setSelectedAnswer("");

    try {
      const { data, error: startError } = await supabase.rpc(
        "start_lesson_assessment",
        {
          p_assessment_id: assessment.id,
        }
      );

      if (startError) throw startError;

      const result = data as AssessmentResult;

      setActiveAssessment(assessment);
      setAttemptId(result.attempt_id);
      setAssessmentStats({
        total: result.total_questions,
        correct: result.correct_answers,
        completed: result.completed,
      });

      setCurrentQuestion(result.next_question);

      if (result.completed) {
        setAssessmentStats((previous) => ({
          ...previous,
          completed: true,
        }));
      }
    } catch (err) {
      console.error("Start assessment:", err);
      setAssessmentError(formatError(err));
    } finally {
      setStartingAssessment(false);
    }
  };

  // ===================================================
  // SUBMIT ANSWER
  // ===================================================

  const submitAnswer = async () => {
    if (
      !attemptId ||
      !currentQuestion ||
      !selectedAnswer ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setAssessmentError("");

    try {
      const { data, error: submitError } = await supabase.rpc(
        "submit_lesson_assessment_answer",
        {
          p_attempt_id: attemptId,
          p_question_id: currentQuestion.id,
          p_user_answer: selectedAnswer,
        }
      );

      if (submitError) throw submitError;

      const result = data as {
        success: boolean;
        already_correct?: boolean;
        is_correct: boolean;
        message: string;
        attempt_count: number;
        explanation: string | null;
        correct_answers?: number;
        total_questions?: number;
        completed?: boolean;
        next_question?: AssessmentQuestion | null;
      };

      if (!result.success) {
        throw new Error(result.message || "Jawaban gagal disimpan.");
      }

      if (result.already_correct) {
        const { data: progressData, error: progressError } =
          await supabase.rpc("get_lesson_assessment_progress", {
            p_attempt_id: attemptId,
          });

        if (progressError) throw progressError;

        const progress = progressData as ProgressResult;

        setCurrentQuestion(progress.next_question);
        setAssessmentStats({
          total: progress.total_questions,
          correct: progress.correct_answers,
          completed: progress.completed,
        });

        return;
      }

      if (!result.is_correct) {
        setAnswerFeedback({
          correct: false,
          message: result.message,
          explanation: null,
        });

        return;
      }

      setAnswerFeedback({
        correct: true,
        message: result.message,
        explanation: result.explanation,
      });

      setAssessmentStats((previous) => ({
        ...previous,
        correct:
          result.correct_answers ?? previous.correct + 1,
        total: result.total_questions ?? previous.total,
        completed: result.completed === true,
      }));

      if (result.completed) {
        setCurrentQuestion(null);
        await refreshLearningProgress();
      } else if (result.next_question) {
        setCurrentQuestion(result.next_question);
      } else {
        // Ambil ulang progres untuk memastikan posisi soal.
        const { data: progressData, error: progressError } =
          await supabase.rpc("get_lesson_assessment_progress", {
            p_attempt_id: attemptId,
          });

        if (progressError) throw progressError;

        const progress = progressData as ProgressResult;
        setCurrentQuestion(progress.next_question);
        setAssessmentStats({
          total: progress.total_questions,
          correct: progress.correct_answers,
          completed: progress.completed,
        });
      }
    } catch (err) {
      console.error("Submit answer:", err);
      setAssessmentError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // CLOSE ASSESSMENT
  // ===================================================

  const closeAssessment = async () => {
    if (assessmentStats.completed) {
      try {
        await refreshLearningProgress();
      } catch (err) {
        console.error(err);
      }
    }

    setActiveAssessment(null);
    setAttemptId("");
    setCurrentQuestion(null);
    setSelectedAnswer("");
    setAnswerFeedback(null);
    setAssessmentError("");
  };

  // ===================================================
  // SECTION ACCESS
  // ===================================================

  const isSectionAccessible = (index: number) => {
    if (index === 0) return true;

    return sections
      .slice(0, index)
      .every((section) => section.checkpoint_completed);
  };

  const completedSections = sections.filter(
    (section) => section.checkpoint_completed
  ).length;

  const progressPercentage =
    sections.length > 0
      ? Math.round((completedSections / sections.length) * 100)
      : 0;

  const canOpenFinalAssessment =
    sections.length > 0 &&
    sections.every((section) => section.checkpoint_completed);

  // ===================================================
  // LOADING / ERROR
  // ===================================================

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">
          Menyiapkan ruang belajar...
        </p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <XCircle className="w-8 h-8 text-red-500 mb-3" />
          <h2 className="font-semibold text-gray-900">
            Materi tidak dapat dibuka
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {error || "Data materi tidak ditemukan."}
          </p>
          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke kursus
          </button>
        </div>
      </div>
    );
  }

  // ===================================================
  // ASSESSMENT VIEW
  // ===================================================

  if (activeAssessment) {
    const options = getOptionList(currentQuestion?.options);

    const questionNumber =
      assessmentStats.correct + 1;

    const percentage =
      assessmentStats.total > 0
        ? Math.round(
            (assessmentStats.correct / assessmentStats.total) * 100
          )
        : 0;

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <button
          onClick={closeAssessment}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke materi
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-6 md:p-8 text-white">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-3">
              <ShieldCheck className="w-4 h-4" />
              {activeAssessment.assessment_type === "checkpoint"
                ? "Checkpoint Materi"
                : "Evaluasi Akhir Sesi"}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold">
              {activeAssessment.title}
            </h1>

            <p className="text-sm text-emerald-50 mt-2">
              Jawab semua pertanyaan dengan benar untuk
              melanjutkan pembelajaran.
            </p>
          </div>

          <div className="p-5 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-sm font-medium text-gray-600">
                Progres pengerjaan
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {assessmentStats.correct}/{assessmentStats.total}
              </span>
            </div>

            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {assessmentError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {assessmentError}
              </div>
            )}

            {assessmentStats.completed ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <Trophy className="w-10 h-10 text-emerald-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  Evaluasi berhasil diselesaikan!
                </h2>

                <p className="text-gray-500 mt-3">
                  Semua pertanyaan telah dijawab dengan benar.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  {assessmentStats.correct} dari {assessmentStats.total} jawaban benar
                </div>

                <div>
                  <button
                    onClick={closeAssessment}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                  >
                    Lanjutkan belajar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : currentQuestion ? (
              <div>
                <div className="text-sm font-semibold text-emerald-700 mb-3">
                  Pertanyaan {questionNumber}
                </div>

                <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-gray-900">
                  {currentQuestion.question_text}
                </h2>

                <div className="grid gap-3 mt-6">
                  {options.map((option) => {
                    const isSelected = selectedAnswer === option.id;

                    return (
                      <button
                        key={option.id}
                        disabled={!!answerFeedback || submitting}
                        onClick={() => setSelectedAnswer(option.id)}
                        className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                        } ${
                          answerFeedback
                            ? "cursor-default"
                            : "cursor-pointer"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {option.id}
                        </span>

                        <span className="text-sm md:text-base text-gray-800 pt-1">
                          {option.text}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {answerFeedback && (
                  <div
                    className={`mt-6 rounded-xl border p-5 ${
                      answerFeedback.correct
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {answerFeedback.correct ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-emerald-800">
                            Jawaban benar!
                          </span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5 text-amber-600" />
                          <span className="text-amber-800">
                            Belum tepat, coba lagi.
                          </span>
                        </>
                      )}
                    </div>

                    <p
                      className={`text-sm mt-2 ${
                        answerFeedback.correct
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }`}
                    >
                      {answerFeedback.message}
                    </p>

                    {answerFeedback.correct &&
                      answerFeedback.explanation && (
                        <div className="mt-4 border-t border-emerald-200 pt-4">
                          <p className="text-sm font-semibold text-emerald-900 mb-1">
                            Pembahasan
                          </p>
                          <p className="text-sm leading-relaxed text-emerald-900">
                            {answerFeedback.explanation}
                          </p>
                        </div>
                      )}

                    <button
                      onClick={() => {
                        if (answerFeedback.correct) {
                          setAnswerFeedback(null);
                          setSelectedAnswer("");
                        } else {
                          setAnswerFeedback(null);
                          setSelectedAnswer("");
                        }
                      }}
                      className={`mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold ${
                        answerFeedback.correct
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      {answerFeedback.correct
                        ? "Lanjutkan"
                        : "Coba kembali"}
                    </button>
                  </div>
                )}

                {!answerFeedback && (
                  <button
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || submitting}
                    className="mt-7 w-full md:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memeriksa jawaban...
                      </>
                    ) : (
                      <>
                        Periksa jawaban
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">
                  Memuat pertanyaan berikutnya...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // NORMAL LEARNING VIEW
  // ===================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">
              Kembali ke kursus
            </span>
          </button>

          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Progres sesi</span>
              <span className="font-semibold text-emerald-700">
                {completedSections}/{sections.length} bagian
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <button
            onClick={loadLearningData}
            title="Muat ulang progres"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* BREADCRUMB */}
        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mb-5">
          <span>{lesson.module.course.title}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{lesson.module.title}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-emerald-700 font-medium">
            {lesson.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          {/* SIDEBAR OUTLINE */}
          <aside className="rounded-2xl border border-gray-200 bg-white overflow-hidden lg:sticky lg:top-24">
            <button
              onClick={() => setShowOutline((value) => !value)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Struktur belajar
                </p>
                <h2 className="font-bold text-gray-900 mt-1">
                  Daftar bagian
                </h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition ${
                  showOutline ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showOutline && (
              <div className="border-t border-gray-100 p-3">
                {sections.map((section, index) => {
                  const accessible = isSectionAccessible(index);
                  const completed = section.checkpoint_completed;
                  const active = index === selectedSectionIndex;

                  return (
                    <button
                      key={section.section_id}
                      disabled={!accessible}
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`w-full flex items-start gap-3 rounded-xl p-3 text-left mb-1 transition ${
                        active
                          ? "bg-emerald-50 border border-emerald-200"
                          : accessible
                          ? "hover:bg-gray-50"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="mt-0.5">
                        {completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : accessible ? (
                          <Circle className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">
                          Bagian {index + 1}
                        </p>
                        <p
                          className={`text-sm font-semibold mt-0.5 ${
                            active
                              ? "text-emerald-800"
                              : "text-gray-800"
                          }`}
                        >
                          {section.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {completed
                            ? "Checkpoint selesai"
                            : accessible
                            ? "Materi tersedia"
                            : "Selesaikan bagian sebelumnya"}
                        </p>
                      </div>
                    </button>
                  );
                })}

                <div className="border-t border-gray-100 mt-3 pt-3">
                  <div className="flex items-start gap-3 rounded-xl p-3">
                    <div className="mt-0.5">
                      {learningProgress?.final_assessment?.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : canOpenFinalAssessment ? (
                        <Trophy className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Evaluasi Akhir
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {learningProgress?.final_assessment?.completed
                          ? "Sudah diselesaikan"
                          : canOpenFinalAssessment
                          ? "Siap dikerjakan"
                          : "Selesaikan semua checkpoint"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-5 md:p-8 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                    Materi pembelajaran
                  </span>
                  {lesson.module.course.premium && (
                    <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-semibold">
                      Premium
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  {lesson.title}
                </h1>

                {lesson.description && (
                  <p className="text-gray-500 leading-relaxed mt-3">
                    {lesson.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {sections.length} bagian materi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="w-4 h-4" />
                    Estimasi {lesson.estimated_minutes || 0} menit
                  </span>
                </div>
              </div>

              {selectedSection ? (
                <>
                  <div className="px-5 md:px-8 pt-7">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      <FileText className="w-4 h-4" />
                      Bagian {selectedSectionIndex + 1}
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
                      {selectedSection.title}
                    </h2>
                  </div>

                  <div className="px-5 md:px-8 py-7">
                    <div className="gu-student-content">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 bg-gray-50 p-5 md:px-8 md:py-6">
                    {selectedSection.checkpoint_completed ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          Checkpoint bagian ini sudah selesai
                        </div>
                        <p className="text-sm text-emerald-700 mt-1">
                          Kamu sudah menjawab semua pertanyaan dengan benar.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Siap menguji pemahaman?
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Selesaikan checkpoint untuk membuka bagian berikutnya.
                          </p>
                        </div>

                        <button
                          disabled={startingAssessment}
                          onClick={() => {
                            const assessment =
                              getCheckpointAssessment(selectedSection);

                            if (assessment) {
                              startAssessment(assessment);
                            } else {
                              setAssessmentError(
                                "Checkpoint untuk bagian ini belum tersedia."
                              );
                            }
                          }}
                          className="inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {startingAssessment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                          Mulai checkpoint
                        </button>
                      </div>
                    )}

                    {selectedSection.checkpoint_completed && (
                      <div className="flex flex-wrap justify-between gap-3 mt-4">
                        <button
                          disabled={selectedSectionIndex === 0}
                          onClick={() =>
                            setSelectedSectionIndex((index) =>
                              Math.max(0, index - 1)
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Bagian sebelumnya
                        </button>

                        {selectedSectionIndex < sections.length - 1 ? (
                          <button
                            onClick={() =>
                              setSelectedSectionIndex((index) =>
                                Math.min(sections.length - 1, index + 1)
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Bagian berikutnya
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled={!canOpenFinalAssessment}
                            onClick={() => {
                              if (finalAssessment) {
                                startAssessment(finalAssessment);
                              } else {
                                setAssessmentError(
                                  "Evaluasi akhir belum tersedia."
                                );
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <GraduationCap className="w-4 h-4" />
                            Evaluasi akhir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-10 text-center">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
                  <h2 className="font-semibold text-gray-800 mt-4">
                    Belum ada bagian materi
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Admin belum menambahkan bagian materi untuk sesi ini.
                  </p>
                </div>
              )}
            </div>

            {assessmentError && !activeAssessment && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {assessmentError}
              </div>
            )}

            {canOpenFinalAssessment && finalAssessment && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <Trophy className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-900">
                        Semua checkpoint telah selesai
                      </h3>
                      <p className="text-sm text-emerald-800 mt-1">
                        Lanjutkan dengan evaluasi akhir sesi.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => startAssessment(finalAssessment)}
                    disabled={startingAssessment}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {startingAssessment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    Mulai evaluasi
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
