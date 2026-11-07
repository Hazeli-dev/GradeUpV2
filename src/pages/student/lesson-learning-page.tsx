
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Bookmark,
  BookmarkCheck,
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
            parseHTML: (element) => element.style.textIndent || null,
            renderHTML: (attributes) =>
              attributes.textIndent
                ? { style: `text-indent: ${attributes.textIndent}` }
                : {},
          },
          leftIndent: {
            default: null,
            parseHTML: (element) => element.style.marginLeft || null,
            renderHTML: (attributes) =>
              attributes.leftIndent
                ? { style: `margin-left: ${attributes.leftIndent}` }
                : {},
          },
          rightIndent: {
            default: null,
            parseHTML: (element) => element.style.marginRight || null,
            renderHTML: (attributes) =>
              attributes.rightIndent
                ? { style: `margin-right: ${attributes.rightIndent}` }
                : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) =>
              attributes.marginTop
                ? { style: `margin-top: ${attributes.marginTop}` }
                : {},
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) =>
              attributes.marginBottom
                ? { style: `margin-bottom: ${attributes.marginBottom}` }
                : {},
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

  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeAssessment, setActiveAssessment] =
    useState<AssessmentInfo | null>(null);

  const [attemptId, setAttemptId] = useState("");
  const [currentQuestion, setCurrentQuestion] =
    useState<AssessmentQuestion | null>(null);

  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<AssessmentQuestion | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingAssessment, setStartingAssessment] = useState(false);

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
  // BOOKMARK STATE
  // ===================================================

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkChecking, setBookmarkChecking] = useState(true);
  const [bookmarkError, setBookmarkError] = useState("");

  // ===================================================
  // LEARNING ACTIVITY TRACKER
  // ===================================================

  const activitySessionRef = useRef<string | null>(null);

  const activityType = activeAssessment ? "practice" : "reading";
  const activityReferenceId = activeAssessment?.id ?? lessonId ?? null;

  useEffect(() => {
    if (
      !lesson ||
      !lessonId ||
      !courseId ||
      !activityReferenceId
    ) {
      return;
    }

    let cancelled = false;
    let finalized = false;
    let saving = false;

    let activityId: string | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    let accumulatedMilliseconds = 0;
    let activeSegmentStartedAt: number | null =
      document.visibilityState === "visible" ? Date.now() : null;

    const isPractice = activityType === "practice";

    const activityTitle = isPractice
      ? activeAssessment?.title ?? "Latihan"
      : lesson.title;

    const getDurationSeconds = () => {
      let total = accumulatedMilliseconds;

      if (
        activeSegmentStartedAt !== null &&
        document.visibilityState === "visible"
      ) {
        total += Date.now() - activeSegmentStartedAt;
      }

      return Math.max(0, Math.floor(total / 1000));
    };

    const persistActivity = async (finish = false) => {
      if (!activityId || finalized || saving) return;

      saving = true;

      const durationSeconds = getDurationSeconds();

      const updatePayload: {
        duration_seconds: number;
        status?: "completed";
        ended_at?: string;
      } = {
        duration_seconds: durationSeconds,
      };

      if (finish) {
        updatePayload.status = "completed";
        updatePayload.ended_at = new Date().toISOString();
      }

      try {
        const { error: updateError } = await supabase
          .from("learning_activities")
          .update(updatePayload)
          .eq("id", activityId);

        if (updateError) {
          console.error("Update learning activity:", updateError);
          return;
        }

        if (finish) {
          finalized = true;
          activitySessionRef.current = null;
        }
      } catch (err) {
        console.error("Save learning activity:", err);
      } finally {
        saving = false;
      }
    };

    const pauseActivity = () => {
      if (activeSegmentStartedAt !== null) {
        accumulatedMilliseconds +=
          Date.now() - activeSegmentStartedAt;

        activeSegmentStartedAt = null;
      }

      void persistActivity();
    };

    const resumeActivity = () => {
      if (!cancelled && !finalized && activeSegmentStartedAt === null) {
        activeSegmentStartedAt = Date.now();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseActivity();
      } else {
        resumeActivity();
      }
    };

    const handlePageHide = () => {
      pauseActivity();
      void persistActivity(true);
    };

    const startActivity = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user || cancelled) return;

        const { data, error: insertError } = await supabase
          .from("learning_activities")
          .insert({
            user_id: user.id,
            activity_type: activityType,
            title: activityTitle,
            reference_id: activityReferenceId,
            duration_seconds: 0,
            status: "started",
            metadata: {
              course_id: courseId,
              lesson_id: lessonId,
              module_id: lesson.module.id,
              source: "LessonLearningPage",
              ...(isPractice
                ? {
                    assessment_id: activityReferenceId,
                    assessment_type:
                      activeAssessment?.assessment_type ?? null,
                  }
                : {}),
            },
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        activityId = data.id;
        activitySessionRef.current = data.id;

        // Jika halaman sudah berpindah sebelum insert selesai,
        // sesi langsung ditutup.
        if (cancelled) {
          await supabase
            .from("learning_activities")
            .update({
              status: "completed",
              ended_at: new Date().toISOString(),
              duration_seconds: 0,
            })
            .eq("id", data.id);

          return;
        }

        intervalId = setInterval(() => {
          if (
            document.visibilityState === "visible" &&
            !finalized
          ) {
            void persistActivity();
          }
        }, 15000);
      } catch (err) {
        console.error("Start learning activity:", err);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("pagehide", handlePageHide);

    void startActivity();

    return () => {
      cancelled = true;

      if (intervalId) {
        clearInterval(intervalId);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("pagehide", handlePageHide);

      if (activeSegmentStartedAt !== null) {
        accumulatedMilliseconds +=
          Date.now() - activeSegmentStartedAt;

        activeSegmentStartedAt = null;
      }

      void persistActivity(true);
    };
  }, [
    courseId,
    lessonId,
    lesson?.id,
    lesson?.title,
    lesson?.module.id,
    activityType,
    activityReferenceId,
    activeAssessment?.title,
    activeAssessment?.assessment_type,
  ]);

  // ===================================================
  // LOAD BOOKMARK STATUS
  // ===================================================

  const loadBookmarkStatus = useCallback(async () => {
    if (!lessonId) {
      setBookmarkChecking(false);
      return;
    }

    setBookmarkChecking(true);
    setBookmarkError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setIsBookmarked(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("student_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (queryError) throw queryError;

      setIsBookmarked(Boolean(data));
    } catch (err) {
      console.error("Load bookmark:", err);
      setBookmarkError("Status bookmark belum dapat dimuat.");
    } finally {
      setBookmarkChecking(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadBookmarkStatus();
  }, [loadBookmarkStatus]);

  // ===================================================
  // TOGGLE BOOKMARK
  // ===================================================

  const toggleBookmark = async () => {
    if (!lessonId || bookmarkLoading || bookmarkChecking) return;

    setBookmarkLoading(true);
    setBookmarkError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Silakan login terlebih dahulu.");
      }

      if (isBookmarked) {
        const { error: deleteError } = await supabase
          .from("student_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);

        if (deleteError) throw deleteError;

        setIsBookmarked(false);
      } else {
        const { error: insertError } = await supabase
          .from("student_bookmarks")
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            setIsBookmarked(true);
          } else {
            throw insertError;
          }
        } else {
          setIsBookmarked(true);
        }
      }
    } catch (err) {
      console.error("Toggle bookmark:", err);
      setBookmarkError(formatError(err));
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ===================================================
  // TIPTAP READ-ONLY EDITOR
  // ===================================================

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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
      Table.configure({ resizable: false }),
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
      const { data: lessonData, error: lessonError } = await supabase
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
          .select("id,section_id,assessment_type,title,sort_order")
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

      const mappedSections: LessonSection[] = (progress.sections || []).map(
        (item) => {
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
        }
      );

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
    void loadLearningData();
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

  const getCheckpointAssessment = (section: LessonSection) =>
    assessments.find(
      (item) =>
        item.assessment_type === "checkpoint" &&
        item.section_id === section.section_id
    );

  const finalAssessment = useMemo(
    () =>
      assessments.find((item) => item.assessment_type === "final") || null,
    [assessments]
  );

  const refreshLearningProgress = useCallback(async () => {
    if (!lessonId) return;

    const { data, error: progressError } = await supabase.rpc(
      "get_lesson_learning_progress",
      { p_lesson_id: lessonId }
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
              checkpoint_completed: updated.checkpoint_completed,
            }
          : section;
      })
    );
  }, [lessonId]);

  // ===================================================
  // START ASSESSMENT
  // ===================================================

  const startAssessment = async (assessment: AssessmentInfo) => {
    setStartingAssessment(true);
    setAssessmentError("");
    setAnswerFeedback(null);
    setSelectedAnswer("");
    setPendingNextQuestion(null);
    setCurrentQuestion(null);

    try {
      const { data, error: startError } = await supabase.rpc(
        "start_lesson_assessment",
        { p_assessment_id: assessment.id }
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
      submitting ||
      answerFeedback
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
        setPendingNextQuestion(null);
        setSelectedAnswer("");
        setAnswerFeedback(null);

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
        correct: result.correct_answers ?? previous.correct + 1,
        total: result.total_questions ?? previous.total,
        completed: result.completed === true,
      }));

      if (result.completed) {
        setPendingNextQuestion(null);
        await refreshLearningProgress();
      } else if (result.next_question) {
        setPendingNextQuestion(result.next_question);
      } else {
        const { data: progressData, error: progressError } =
          await supabase.rpc("get_lesson_assessment_progress", {
            p_attempt_id: attemptId,
          });

        if (progressError) throw progressError;

        const progress = progressData as ProgressResult;

        setPendingNextQuestion(progress.next_question);

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
  // CONTINUE AFTER FEEDBACK
  // ===================================================

  const continueAfterFeedback = () => {
    if (!answerFeedback) return;

    if (answerFeedback.correct) {
      if (assessmentStats.completed) {
        setCurrentQuestion(null);
        setPendingNextQuestion(null);
      } else if (pendingNextQuestion) {
        setCurrentQuestion(pendingNextQuestion);
        setPendingNextQuestion(null);
      }
    }

    setSelectedAnswer("");
    setAnswerFeedback(null);
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
    setPendingNextQuestion(null);
    setSelectedAnswer("");
    setAnswerFeedback(null);
    setAssessmentError("");
  };

  // ===================================================
  // SECTION ACCESS & PROGRESS
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
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="gu-learning-page min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="rounded-2xl bg-emerald-500/10 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Menyiapkan ruang belajar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error || !lesson) {
    return (
      <div className="gu-learning-page min-h-[60vh] bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-red-500/10 p-3">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Materi tidak dapat dibuka</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {error || "Data materi tidak ditemukan."}
          </p>
          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
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

    const questionNumber = currentQuestion
      ? currentQuestion.sort_order + 1
      : assessmentStats.correct;

    const percentage =
      assessmentStats.total > 0
        ? Math.round(
            (assessmentStats.correct / assessmentStats.total) * 100
          )
        : 0;

    return (
      <div className="gu-learning-page min-h-screen bg-background px-4 py-6 text-foreground md:py-10">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={closeAssessment}
            className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke materi
          </button>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white md:p-9">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />

              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <ShieldCheck className="h-4 w-4" />
                  {activeAssessment.assessment_type === "checkpoint"
                    ? "Checkpoint Materi"
                    : "Evaluasi Akhir Sesi"}
                </div>

                <h1 className="text-2xl font-bold leading-tight md:text-3xl">
                  {activeAssessment.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50 md:text-base">
                  Jawab semua pertanyaan dengan benar untuk melanjutkan
                  pembelajaran. Jika jawaban belum tepat, kamu dapat mencoba
                  kembali.
                </p>
              </div>
            </div>

            <div className="p-5 md:p-9">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Progres pengerjaan</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jawaban benar yang sudah tersimpan
                  </p>
                </div>
                <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {assessmentStats.correct}/{assessmentStats.total}
                </span>
              </div>

              <div
                className="mb-8 h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {assessmentError && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{assessmentError}</p>
                </div>
              )}

              {assessmentStats.completed && !answerFeedback ? (
                <div className="py-8 text-center md:py-12">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10">
                    <Trophy className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Evaluasi selesai
                  </p>
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Hebat! Kamu berhasil!
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Semua pertanyaan telah dijawab dengan benar. Kamu dapat
                    melanjutkan pembelajaran.
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    {assessmentStats.correct} dari {assessmentStats.total}{" "}
                    jawaban benar
                  </div>

                  <div>
                    <button
                      onClick={closeAssessment}
                      className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Lanjutkan belajar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : currentQuestion ? (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <FileText className="h-4 w-4" />
                      Pertanyaan {questionNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Pilih satu jawaban
                    </span>
                  </div>

                  <h2 className="text-lg font-bold leading-relaxed md:text-xl">
                    {currentQuestion.question_text}
                  </h2>

                  <div className="mt-6 grid gap-3">
                    {options.map((option) => {
                      const isSelected = selectedAnswer === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={!!answerFeedback || submitting}
                          onClick={() => setSelectedAnswer(option.id)}
                          className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                              : "border-border bg-card hover:border-emerald-500/50 hover:bg-muted/60"
                          } ${
                            answerFeedback || submitting
                              ? "cursor-default"
                              : "cursor-pointer"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600"
                            }`}
                          >
                            {option.id}
                          </span>

                          <span className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-foreground md:text-base">
                            {option.text}
                          </span>

                          {isSelected && (
                            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {answerFeedback && (
                    <div
                      className={`mt-6 rounded-2xl border p-5 ${
                        answerFeedback.correct
                          ? "border-emerald-500/25 bg-emerald-500/10"
                          : "border-amber-500/25 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {answerFeedback.correct ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-300">
                              Jawaban benar!
                            </span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-700 dark:text-amber-300">
                              Belum tepat, coba lagi.
                            </span>
                          </>
                        )}
                      </div>

                      <p
                        className={`mt-2 text-sm leading-relaxed ${
                          answerFeedback.correct
                            ? "text-emerald-800 dark:text-emerald-200"
                            : "text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {answerFeedback.message}
                      </p>

                      {answerFeedback.correct &&
                        answerFeedback.explanation && (
                          <div className="mt-4 border-t border-emerald-500/20 pt-4">
                            <p className="mb-1 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                              Pembahasan
                            </p>
                            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-100">
                              {answerFeedback.explanation}
                            </p>
                          </div>
                        )}

                      <button
                        onClick={continueAfterFeedback}
                        className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                          answerFeedback.correct
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        {answerFeedback.correct
                          ? assessmentStats.completed
                            ? "Selesaikan evaluasi"
                            : "Lanjutkan"
                          : "Coba kembali"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {!answerFeedback && (
                    <button
                      onClick={submitAnswer}
                      disabled={!selectedAnswer || submitting}
                      className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memeriksa jawaban...
                        </>
                      ) : (
                        <>
                          Periksa jawaban
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Memuat pertanyaan berikutnya...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // NORMAL LEARNING VIEW
  // ===================================================

  return (
    <div className="gu-learning-page min-h-screen bg-background text-foreground">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke kursus</span>
          </button>

          <div className="max-w-md flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progres sesi</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {completedSections}/{sections.length} bagian
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <button
            onClick={loadLearningData}
            title="Muat ulang progres"
            className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{lesson.module.course.title}</span>
          <ChevronRight className="h-3 w-3" />
          <span>{lesson.module.title}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {lesson.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* SIDEBAR */}
          <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-24">
            <button
              onClick={() => setShowOutline((value) => !value)}
              className="flex w-full items-center justify-between p-5 text-left transition hover:bg-muted/40"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Struktur belajar
                </p>
                <h2 className="mt-1 font-bold">Daftar bagian</h2>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  showOutline ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showOutline && (
              <div className="border-t border-border p-3">
                {sections.map((section, index) => {
                  const accessible = isSectionAccessible(index);
                  const completed = section.checkpoint_completed;
                  const active = index === selectedSectionIndex;

                  return (
                    <button
                      key={section.section_id}
                      disabled={!accessible}
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`mb-1 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : accessible
                            ? "border-transparent hover:bg-muted"
                            : "cursor-not-allowed border-transparent opacity-50"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : accessible ? (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Bagian {index + 1}
                        </p>
                        <p
                          className={`mt-0.5 text-sm font-semibold ${
                            active
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-foreground"
                          }`}
                        >
                          {section.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
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

                <div className="mt-3 border-t border-border pt-3">
                  <div className="flex items-start gap-3 rounded-xl p-3">
                    <div className="mt-0.5 shrink-0">
                      {learningProgress?.final_assessment?.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : canOpenFinalAssessment ? (
                        <Trophy className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Evaluasi Akhir</p>
                      <p className="mt-1 text-xs text-muted-foreground">
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
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {/* LESSON HEADER */}
              <div className="border-b border-border p-5 md:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    Materi pembelajaran
                  </span>
                  {lesson.module.course.premium && (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Premium
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  {lesson.title}
                </h1>

                {lesson.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {lesson.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      {sections.length} bagian materi
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      Estimasi {lesson.estimated_minutes || 0} menit
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleBookmark}
                    disabled={bookmarkLoading || bookmarkChecking}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isBookmarked
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                        : "border-border bg-card text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600"
                    }`}
                  >
                    {bookmarkLoading || bookmarkChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}

                    {bookmarkLoading
                      ? "Menyimpan..."
                      : bookmarkChecking
                        ? "Memeriksa..."
                        : isBookmarked
                          ? "Tersimpan"
                          : "Simpan Bookmark"}
                  </button>
                </div>

                {bookmarkError && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                    {bookmarkError}
                  </p>
                )}
              </div>

              {selectedSection ? (
                <>
                  {/* SECTION TITLE */}
                  <div className="px-5 pt-7 md:px-8">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <FileText className="h-4 w-4" />
                      Bagian {selectedSectionIndex + 1}
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">
                      {selectedSection.title}
                    </h2>
                  </div>

                  {/* LESSON CONTENT */}
                  <div className="px-5 py-7 md:px-8">
                    <div className="gu-student-content min-w-0 text-foreground">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* CHECKPOINT AREA */}
                  <div className="border-t border-border bg-muted/40 p-5 md:px-8 md:py-6">
                    {selectedSection.checkpoint_completed ? (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                        <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-5 w-5" />
                          Checkpoint bagian ini sudah selesai
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-emerald-700 dark:text-emerald-200">
                          Kamu sudah menjawab semua pertanyaan dengan benar.
                          Bagian berikutnya sekarang dapat dibuka.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="font-bold">
                            Siap menguji pemahaman?
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            Selesaikan checkpoint untuk membuka bagian
                            berikutnya.
                          </p>
                        </div>

                        <button
                          disabled={startingAssessment}
                          onClick={() => {
                            const assessment =
                              getCheckpointAssessment(selectedSection);

                            if (assessment) {
                              void startAssessment(assessment);
                            } else {
                              setAssessmentError(
                                "Checkpoint untuk bagian ini belum tersedia."
                              );
                            }
                          }}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {startingAssessment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          Mulai checkpoint
                        </button>
                      </div>
                    )}

                    {selectedSection.checkpoint_completed && (
                      <div className="mt-4 flex flex-wrap justify-between gap-3">
                        <button
                          disabled={selectedSectionIndex === 0}
                          onClick={() =>
                            setSelectedSectionIndex((index) =>
                              Math.max(0, index - 1)
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Bagian sebelumnya
                        </button>

                        {selectedSectionIndex < sections.length - 1 ? (
                          <button
                            onClick={() =>
                              setSelectedSectionIndex((index) =>
                                Math.min(sections.length - 1, index + 1)
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Bagian berikutnya
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            disabled={!canOpenFinalAssessment}
                            onClick={() => {
                              if (finalAssessment) {
                                void startAssessment(finalAssessment);
                              } else {
                                setAssessmentError(
                                  "Evaluasi akhir belum tersedia."
                                );
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <GraduationCap className="h-4 w-4" />
                            Evaluasi akhir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="mt-4 font-bold">Belum ada bagian materi</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Admin belum menambahkan bagian materi untuk sesi ini.
                  </p>
                </div>
              )}
            </section>

            {/* FINAL ASSESSMENT CARD */}
            {assessmentError && !activeAssessment && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{assessmentError}</p>
              </div>
            )}

            {canOpenFinalAssessment && finalAssessment && (
              <section className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-3">
                      <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-800 dark:text-emerald-200">
                        Semua checkpoint telah selesai
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Lanjutkan dengan evaluasi akhir untuk menyelesaikan
                        sesi pembelajaran ini.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => void startAssessment(finalAssessment)}
                    disabled={startingAssessment}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {startingAssessment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Mulai evaluasi
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
