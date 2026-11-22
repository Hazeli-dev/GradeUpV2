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
  Maximize2,
  Minimize2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { CodePreviewBlock } from "@/components/course/CodePreviewBlock";

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

type CheckpointProgress = {
  id: string;
  title: string;
  sort_order: number;
  completed: boolean;
};

type LessonSection = {
  section_id: string;
  title: string;
  sort_order: number;
  checkpoints: CheckpointProgress[];
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

type SubmitAnswerResult = {
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

// =====================================================
// DESIGN TOKENS (tampilan saja, tidak terkait logika)
// =====================================================

// Permukaan kaca lembut untuk card dan panel.
const GLASS =
  "border border-emerald-900/10 bg-white/75 backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] dark:border-emerald-400/10 dark:bg-slate-900/60 dark:shadow-[0_10px_35px_-15px_rgba(0,0,0,0.55)]";

// Permukaan kecil di dalam card (baris, pilihan jawaban).
const INSET =
  "border border-emerald-900/10 bg-white/70 dark:border-emerald-400/10 dark:bg-slate-950/40";

// Tombol utama emerald.
const BTN_PRIMARY =
  "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:from-emerald-600 hover:to-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none";

// Tombol utama versi lebih pekat (evaluasi akhir).
const BTN_DEEP =
  "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-800/25 hover:from-emerald-700 hover:to-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none";

// Animasi ringan. Dimatikan otomatis jika prefers-reduced-motion aktif.
const PAGE_STYLES = `
@keyframes gu-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
}
@keyframes gu-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(16px, 12px, 0) scale(1.05); }
}
.gu-float { animation: gu-float 10s ease-in-out infinite; }
.gu-drift { animation: gu-drift 18s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gu-float, .gu-drift { animation: none !important; }
}
`;

/** Latar dekoratif halaman (tidak interaktif). */
function PageDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-transparent to-teal-50/60 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />

      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(5,150,105,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] dark:opacity-40" />

      <div className="gu-drift absolute -left-28 top-40 h-[24rem] w-[24rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/12" />
      <div className="gu-float absolute -right-24 top-[34rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/12" />
      <div className="absolute -left-20 bottom-24 h-[20rem] w-[20rem] rounded-full bg-lime-300/15 blur-3xl dark:bg-emerald-600/10" />
    </div>
  );
}

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
            parseHTML: (element) =>
              element.style.textIndent || null,
            renderHTML: (attributes) =>
              attributes.textIndent
                ? { style: `text-indent: ${attributes.textIndent}` }
                : {},
          },
          leftIndent: {
            default: null,
            parseHTML: (element) =>
              element.style.marginLeft || null,
            renderHTML: (attributes) =>
              attributes.leftIndent
                ? { style: `margin-left: ${attributes.leftIndent}` }
                : {},
          },
          rightIndent: {
            default: null,
            parseHTML: (element) =>
              element.style.marginRight || null,
            renderHTML: (attributes) =>
              attributes.rightIndent
                ? { style: `margin-right: ${attributes.rightIndent}` }
                : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
          marginTop: {
            default: null,
            parseHTML: (element) =>
              element.style.marginTop || null,
            renderHTML: (attributes) =>
              attributes.marginTop
                ? { style: `margin-top: ${attributes.marginTop}` }
                : {},
          },
          marginBottom: {
            default: null,
            parseHTML: (element) =>
              element.style.marginBottom || null,
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

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba kembali.";
}

function getOptionList(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return (
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).text === "string"
      );
    })
    .map((item) => ({
      id: item.id as string,
      text: item.text as string,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function getLearningProgress(value: unknown): LearningProgress {
  if (!value || typeof value !== "object") {
    throw new Error("Data progres pembelajaran tidak valid.");
  }

  const data = value as Record<string, unknown>;

  const rawSections = Array.isArray(data.sections)
    ? data.sections
    : [];

  const parsedSections: LessonSection[] = rawSections.map(
    (rawSection) => {
      if (
        !rawSection ||
        typeof rawSection !== "object" ||
        Array.isArray(rawSection)
      ) {
        throw new Error("Data section pembelajaran tidak valid.");
      }

      const section = rawSection as Record<string, unknown>;

      const rawCheckpoints = Array.isArray(section.checkpoints)
        ? section.checkpoints
        : [];

      const checkpoints: CheckpointProgress[] = rawCheckpoints
        .filter(
          (item): item is Record<string, unknown> =>
            item !== null &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
        .map((checkpoint) => ({
          id: String(checkpoint.id ?? ""),
          title: String(checkpoint.title ?? "Checkpoint"),
          sort_order: Number(checkpoint.sort_order ?? 0),
          completed: checkpoint.completed === true,
        }))
        .filter((checkpoint) => checkpoint.id !== "")
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        section_id: String(section.section_id ?? ""),
        title: String(section.title ?? ""),
        sort_order: Number(section.sort_order ?? 0),
        checkpoints,
        checkpoint_completed:
          section.checkpoint_completed === true,
      };
    }
  );

  const rawFinal = data.final_assessment;

  const finalAssessment =
    rawFinal &&
    typeof rawFinal === "object" &&
    !Array.isArray(rawFinal)
      ? {
          assessment_id: String(
            (rawFinal as Record<string, unknown>).assessment_id ?? ""
          ),
          title: String(
            (rawFinal as Record<string, unknown>).title ?? ""
          ),
          completed:
            (rawFinal as Record<string, unknown>).completed === true,
        }
      : null;

  return {
    lesson_id:
      typeof data.lesson_id === "string" ? data.lesson_id : "",
    sections: parsedSections,
    final_assessment: finalAssessment,
  };
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
  // FULLSCREEN MODE
  // ===================================================

  const learningPageRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === learningPageRef.current
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === learningPageRef.current) {
        await document.exitFullscreen();
      } else {
        await learningPageRef.current?.requestFullscreen();
      }
    } catch (err) {
      console.error("Gagal mengaktifkan fullscreen:", err);
    }
  };

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

  const activityReferenceId =
    activeAssessment?.id ?? lessonId ?? null;

  useEffect(() => {
    if (!lesson || !lessonId || !courseId || !activityReferenceId) {
      return;
    }

    let cancelled = false;
    let finalized = false;
    let finishRequested = false;

    let activityId: string | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    let accumulatedMilliseconds = 0;

    let activeSegmentStartedAt: number | null =
      document.visibilityState === "visible" ? Date.now() : null;

    let writeQueue: Promise<void> = Promise.resolve();

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

    const pauseTimer = () => {
      if (activeSegmentStartedAt !== null) {
        accumulatedMilliseconds +=
          Date.now() - activeSegmentStartedAt;

        activeSegmentStartedAt = null;
      }
    };

    const resumeTimer = () => {
      if (
        !cancelled &&
        !finalized &&
        !finishRequested &&
        activeSegmentStartedAt === null &&
        document.visibilityState === "visible"
      ) {
        activeSegmentStartedAt = Date.now();
      }
    };

    const queueSave = (finish = false) => {
      if (finish) {
        finishRequested = true;
        pauseTimer();
      }

      if (!activityId || finalized) return;

      writeQueue = writeQueue
        .then(async () => {
          if (!activityId || finalized) return;

          const payload: {
            duration_seconds: number;
            status?: "completed";
            ended_at?: string;
          } = {
            duration_seconds: getDurationSeconds(),
          };

          if (finishRequested) {
            payload.status = "completed";
            payload.ended_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from("learning_activities")
            .update(payload)
            .eq("id", activityId);

          if (updateError) {
            console.error(
              "Update learning activity:",
              updateError
            );
            return;
          }

          if (finishRequested) {
            finalized = true;

            if (activitySessionRef.current === activityId) {
              activitySessionRef.current = null;
            }
          }
        })
        .catch((err) => {
          console.error("Save learning activity:", err);
        });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseTimer();
        queueSave();
      } else {
        resumeTimer();
      }
    };

    const handlePageHide = () => {
      pauseTimer();
      queueSave(true);
    };

    const startActivity = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (cancelled || !user) return;

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

        if (cancelled || finishRequested) {
          queueSave(true);
          return;
        }

        intervalId = setInterval(() => {
          if (
            document.visibilityState === "visible" &&
            !finalized &&
            !finishRequested
          ) {
            queueSave();
          }
        }, 15000);

        if (document.visibilityState !== "visible") {
          pauseTimer();
        } else {
          resumeTimer();
        }
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

      pauseTimer();
      queueSave(true);
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
      CodePreviewBlock,
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

      if (!lessonData) {
        throw new Error("Data materi tidak ditemukan.");
      }

      const moduleData = Array.isArray(lessonData.module)
        ? lessonData.module[0]
        : lessonData.module;

      const courseData = Array.isArray(moduleData?.course)
        ? moduleData.course[0]
        : moduleData?.course;

      if (!moduleData || !courseData || courseData.id !== courseId) {
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

      const progress = getLearningProgress(progressData);

      const availableSections = Array.isArray(sectionData)
        ? sectionData
        : [];

      const mappedSections: LessonSection[] = availableSections
        .map((section) => {
          // Ambil progres berdasarkan ID bagian materi
          const sectionProgress = progress.sections.find(
            (item) => item.section_id === section.id
          );

          return {
            section_id: section.id,
            title: section.title,
            sort_order: Number(section.sort_order ?? 0),

            // Progres checkpoint tetap menggunakan data RPC
            checkpoints: sectionProgress?.checkpoints ?? [],

            checkpoint_completed:
              sectionProgress?.checkpoint_completed ?? false,

            // Konten materi langsung dari tabel lesson_sections
            content_json: section.content_json || {
              type: "doc",
              content: [{ type: "paragraph" }],
            },
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      const mappedAssessments = Array.isArray(assessmentData)
        ? (assessmentData as AssessmentInfo[])
        : [];

      setSections(mappedSections);
      setAssessments(mappedAssessments);
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

  const getCheckpointAssessments = (
    section: LessonSection
  ): AssessmentInfo[] => {
    return section.checkpoints
      .map((checkpoint) => {
        const assessment = assessments.find(
          (item) =>
            item.id === checkpoint.id &&
            item.assessment_type === "checkpoint"
        );

        return (
          assessment ?? {
            id: checkpoint.id,
            section_id: section.section_id,
            assessment_type: "checkpoint" as const,
            title: checkpoint.title,
            sort_order: checkpoint.sort_order,
          }
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const finalAssessment = useMemo(
    () =>
      assessments.find((item) => item.assessment_type === "final") ||
      null,
    [assessments]
  );

  // ===================================================
  // REFRESH LEARNING PROGRESS
  // ===================================================

  const refreshLearningProgress = useCallback(async () => {
    if (!lessonId) return;

    const { data, error: progressError } = await supabase.rpc(
      "get_lesson_learning_progress",
      { p_lesson_id: lessonId }
    );

    if (progressError) throw progressError;

    const progress = getLearningProgress(data);

    setLearningProgress(progress);

    setSections((previous) =>
      previous.map((section) => {
        const updated = progress.sections.find(
          (item) => item.section_id === section.section_id
        );

        return updated
          ? {
              ...section,
              checkpoints: updated.checkpoints,
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
    if (startingAssessment || activeAssessment) return;

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

      if (!result?.attempt_id) {
        throw new Error("Sesi pengerjaan tidak berhasil dibuat.");
      }

      setActiveAssessment(assessment);
      setAttemptId(result.attempt_id);

      setAssessmentStats({
        total: result.total_questions ?? 0,
        correct: result.correct_answers ?? 0,
        completed: result.completed === true,
      });

      setCurrentQuestion(result.next_question ?? null);
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

      const result = data as SubmitAnswerResult;

      if (!result?.success) {
        throw new Error(
          result?.message || "Jawaban gagal disimpan."
        );
      }

      if (result.already_correct) {
        const {
          data: progressData,
          error: progressError,
        } = await supabase.rpc("get_lesson_assessment_progress", {
          p_attempt_id: attemptId,
        });

        if (progressError) throw progressError;

        const progress = progressData as ProgressResult;

        setCurrentQuestion(progress.next_question ?? null);
        setPendingNextQuestion(null);
        setSelectedAnswer("");
        setAnswerFeedback(null);

        setAssessmentStats({
          total: progress.total_questions ?? 0,
          correct: progress.correct_answers ?? 0,
          completed: progress.completed === true,
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
        const {
          data: progressData,
          error: progressError,
        } = await supabase.rpc("get_lesson_assessment_progress", {
          p_attempt_id: attemptId,
        });

        if (progressError) throw progressError;

        const progress = progressData as ProgressResult;

        setPendingNextQuestion(progress.next_question ?? null);

        setAssessmentStats({
          total: progress.total_questions ?? 0,
          correct: progress.correct_answers ?? 0,
          completed: progress.completed === true,
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
    if (submitting) return;

    if (assessmentStats.completed) {
      try {
        await refreshLearningProgress();
      } catch (err) {
        console.error("Refresh learning progress:", err);
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
      <div className="gu-learning-page relative isolate flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background text-foreground">
        <style>{PAGE_STYLES}</style>
        <PageDecor />

        <div className="relative rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl"
          />
          <Loader2 className="relative h-8 w-8 animate-spin text-emerald-600 motion-reduce:animate-none" />
        </div>

        <div className="relative text-center">
          <p className="font-semibold">
            Menyiapkan ruang belajar
          </p>
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
      <div className="gu-learning-page relative isolate min-h-[60vh] bg-background px-4 py-10 text-foreground">
        <style>{PAGE_STYLES}</style>
        <PageDecor />

        <div
          className={`relative mx-auto max-w-xl overflow-hidden rounded-3xl p-6 md:p-8 ${GLASS}`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-red-400/15 blur-3xl"
          />

          <div className="relative mb-4 inline-flex rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-500/20">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>

          <h2 className="relative text-xl font-bold">
            Materi tidak dapat dibuka
          </h2>

          <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
            {error || "Data materi tidak ditemukan."}
          </p>

          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className={`relative mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${BTN_PRIMARY}`}
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
      <div className="gu-learning-page relative isolate min-h-screen bg-background px-4 py-6 text-foreground md:py-10">
        <style>{PAGE_STYLES}</style>
        <PageDecor />

        <div className="relative mx-auto max-w-4xl">
          <button
            onClick={() => void closeAssessment()}
            disabled={submitting}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-md transition hover:bg-emerald-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-50 dark:border-emerald-400/10 dark:bg-slate-900/50 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke materi
          </button>

          <div className={`overflow-hidden rounded-3xl ${GLASS}`}>
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white md:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />
                <div className="gu-drift absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-sm" />
                <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-teal-300/15 blur-2xl" />
                <div className="absolute -right-6 bottom-4 h-28 w-28 rounded-full border border-white/15" />
                <div className="absolute -right-20 -bottom-8 h-48 w-48 rounded-full border border-white/10" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>

              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
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
                  pembelajaran. Jika jawaban belum tepat, kamu dapat
                  mencoba kembali.
                </p>
              </div>
            </div>

            <div className="p-5 md:p-9">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Progres pengerjaan
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Jawaban benar yang sudah tersimpan
                  </p>
                </div>

                <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-bold tabular-nums text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400">
                  {assessmentStats.correct}/{assessmentStats.total}
                </span>
              </div>

              <div
                className="mb-8 h-2.5 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-white/10"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 motion-reduce:transition-none"
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
                <div className="relative py-8 text-center md:py-12">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
                  />

                  <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 ring-1 ring-emerald-500/20">
                    <Trophy className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <p className="relative mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Evaluasi selesai
                  </p>

                  <h2 className="relative text-2xl font-bold md:text-3xl">
                    Hebat! Kamu berhasil!
                  </h2>

                  <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Semua pertanyaan telah dijawab dengan benar.
                    Kamu dapat melanjutkan pembelajaran.
                  </p>

                  <div className="relative mt-7 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    {assessmentStats.correct} dari{" "}
                    {assessmentStats.total} jawaban benar
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => void closeAssessment()}
                      className={`mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${BTN_PRIMARY}`}
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
                          className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                              : "border-emerald-900/10 bg-white/60 hover:border-emerald-500/50 hover:bg-emerald-500/[0.06] dark:border-emerald-400/10 dark:bg-slate-950/40"
                          } ${
                            answerFeedback || submitting
                              ? "cursor-default"
                              : "cursor-pointer"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition motion-reduce:transition-none ${
                              isSelected
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/20"
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
                        className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition motion-reduce:transition-none ${
                          answerFeedback.correct
                            ? BTN_PRIMARY
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
                      onClick={() => void submitAnswer()}
                      disabled={!selectedAnswer || submitting}
                      className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 md:w-auto ${BTN_PRIMARY}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
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
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600 motion-reduce:animate-none" />
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
    <div
      ref={learningPageRef}
      className={`gu-learning-page relative isolate w-full bg-background text-foreground ${
        isFullscreen ? "h-screen overflow-y-auto" : "min-h-screen"
      }`}
    >
      <style>{PAGE_STYLES}</style>
      <PageDecor />

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-background/80 shadow-sm shadow-emerald-900/[0.03] backdrop-blur-xl dark:border-emerald-400/10">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 lg:px-8">
          <button
            onClick={() => navigate(`/dashboard/courses/${courseId}`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground transition hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke kursus</span>
          </button>

          <div className="max-w-xl flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progres sesi</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {completedSections}/{sections.length} bagian
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 motion-reduce:transition-none"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? "Keluar dari layar penuh" : "Layar penuh"}
              aria-label={isFullscreen ? "Keluar dari layar penuh" : "Layar penuh"}
              className="rounded-xl border border-emerald-900/10 bg-white/60 p-2.5 text-muted-foreground transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-emerald-400/10 dark:bg-slate-950/40 motion-reduce:transition-none"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => void loadLearningData()}
              title="Muat ulang progres"
              className="rounded-xl border border-emerald-900/10 bg-white/60 p-2.5 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-emerald-400/10 dark:bg-slate-950/40 motion-reduce:transition-none"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="w-full overflow-x-hidden px-3 py-5 sm:px-5 sm:py-7 lg:px-8 xl:px-10">
        {/* BREADCRUMB */}
        <nav className="mb-5 flex min-w-0 flex-wrap items-center gap-2 text-xs leading-relaxed text-muted-foreground sm:mb-7">
          <span>{lesson.module.course.title}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span>{lesson.module.title}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {lesson.title}
          </span>
        </nav>

        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-6">
          {/* SIDEBAR */}
          <aside
            className={`relative overflow-hidden rounded-2xl lg:sticky lg:top-24 ${GLASS}`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl"
            />

            <button
              onClick={() => setShowOutline((value) => !value)}
              className="relative flex w-full items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent p-4 text-left transition hover:bg-emerald-500/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 motion-reduce:transition-none sm:p-5"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Struktur belajar
                </p>
                <h2 className="mt-1 text-base font-bold">
                  Daftar bagian
                </h2>
              </div>

              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform motion-reduce:transition-none ${
                  showOutline ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showOutline && (
              <div className="relative max-h-[420px] overflow-y-auto border-t border-emerald-900/10 p-3 dark:border-emerald-400/10 sm:max-h-[calc(100vh-180px)]">
                {sections.map((section, index) => {
                  const accessible = isSectionAccessible(index);
                  const completed = section.checkpoint_completed;
                  const active = index === selectedSectionIndex;

                  const completedCheckpointCount =
                    section.checkpoints.filter(
                      (checkpoint) => checkpoint.completed
                    ).length;

                  const totalCheckpointCount =
                    section.checkpoints.length;

                  return (
                    <button
                      key={section.section_id}
                      disabled={!accessible}
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`mb-1 flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition motion-reduce:transition-none ${
                        active
                          ? "border-emerald-500/30 bg-emerald-500/10 shadow-sm"
                          : accessible
                            ? "border-transparent hover:bg-emerald-500/[0.06]"
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
                          className={`mt-1 text-sm font-semibold ${
                            active
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-foreground"
                          }`}
                        >
                          {section.title}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {completed
                            ? "Semua checkpoint selesai"
                            : accessible
                              ? totalCheckpointCount > 0
                                ? `${completedCheckpointCount}/${totalCheckpointCount} checkpoint selesai`
                                : "Tidak ada checkpoint"
                              : "Selesaikan bagian sebelumnya"}
                        </p>
                      </div>
                    </button>
                  );
                })}

                <div className="mt-3 border-t border-emerald-900/10 pt-3 dark:border-emerald-400/10">
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
                      <p className="text-sm font-semibold">
                        Evaluasi Akhir
                      </p>
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
            <section className={`overflow-hidden rounded-2xl ${GLASS}`}>
              {/* LESSON HEADER */}
              <div className="relative overflow-hidden border-b border-emerald-900/10 p-5 dark:border-emerald-400/10 sm:p-7 lg:p-9">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.12] via-teal-500/[0.05] to-transparent" />
                  <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(5,150,105,0.22)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom_left,black,transparent_60%)]" />
                  <div className="gu-drift absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                </div>

                <div className="relative">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <BookOpen className="h-3.5 w-3.5" />
                      Materi pembelajaran
                    </span>

                    {lesson.module.course.premium && (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Premium
                      </span>
                    )}
                  </div>

                  <h1 className="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                    {lesson.title}
                  </h1>

                  {lesson.description && (
                    <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {lesson.description}
                    </p>
                  )}

                  <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {sections.length} bagian materi
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Estimasi {lesson.estimated_minutes || 0} menit
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleBookmark()}
                      disabled={bookmarkLoading || bookmarkChecking}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:w-auto ${
                        isBookmarked
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                          : "border-emerald-900/10 bg-white/60 text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 dark:border-emerald-400/10 dark:bg-slate-950/40"
                      }`}
                    >
                      {bookmarkLoading || bookmarkChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
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
              </div>

              {selectedSection ? (
                <>
                  {/* SECTION TITLE */}
                  <div className="px-5 pt-7 sm:px-7 lg:px-9 lg:pt-9">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <FileText className="h-4 w-4" />
                      Bagian {selectedSectionIndex + 1}
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                      {selectedSection.title}
                    </h2>

                    <div className="mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                  </div>

                  {/* LESSON CONTENT */}
                  <div className="min-w-0 px-4 py-7 sm:px-7 sm:py-9 lg:px-9 lg:py-10">
                    <div className="gu-student-content min-w-0 max-w-full overflow-x-auto text-foreground">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* CHECKPOINT AREA */}
                  <div className="relative border-t border-emerald-900/10 bg-emerald-500/[0.04] p-4 dark:border-emerald-400/10 sm:p-6 lg:px-9 lg:py-8">
                    {(() => {
                      const checkpointList =
                        getCheckpointAssessments(selectedSection);

                      const completedCount =
                        checkpointList.filter((checkpoint) =>
                          selectedSection.checkpoints.some(
                            (item) =>
                              item.id === checkpoint.id && item.completed
                          )
                        ).length;

                      const totalCount = checkpointList.length;
                      const allCompleted =
                        selectedSection.checkpoint_completed;

                      return (
                        <>
                          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-bold">
                                Checkpoint pemahaman
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Selesaikan semua checkpoint untuk membuka bagian berikutnya.
                              </p>
                            </div>

                            {totalCount > 0 && (
                              <span className="w-fit rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300">
                                {completedCount}/{totalCount} selesai
                              </span>
                            )}
                          </div>

                          {totalCount === 0 ? (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-5 w-5" />
                                Tidak ada checkpoint pada bagian ini
                              </div>
                              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                                Kamu dapat melanjutkan ke bagian berikutnya.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {checkpointList.map((checkpoint, index) => {
                                const checkpointProgress =
                                  selectedSection.checkpoints.find(
                                    (item) => item.id === checkpoint.id
                                  );

                                const completed =
                                  checkpointProgress?.completed === true;

                                return (
                                  <div
                                    key={checkpoint.id}
                                    className={`flex min-w-0 flex-col gap-3 rounded-2xl border p-4 transition-colors motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                                      completed
                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                        : "border-emerald-900/10 bg-white/70 hover:border-emerald-500/30 dark:border-emerald-400/10 dark:bg-slate-950/40"
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-start gap-3">
                                      <div
                                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                                          completed
                                            ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400"
                                            : "bg-muted text-muted-foreground ring-transparent"
                                        }`}
                                      >
                                        {completed ? (
                                          <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                          <ShieldCheck className="h-5 w-5" />
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-muted-foreground">
                                          Checkpoint {index + 1}
                                        </p>
                                        <h4 className="mt-1 font-bold">
                                          {checkpoint.title}
                                        </h4>
                                        <p
                                          className={`mt-1 text-xs font-medium ${
                                            completed
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {completed
                                            ? "Sudah diselesaikan"
                                            : "Belum dikerjakan"}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={completed || startingAssessment}
                                      onClick={() =>
                                        void startAssessment(checkpoint)
                                      }
                                      className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed motion-reduce:transition-none sm:w-auto sm:px-5 ${
                                        completed
                                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : `${BTN_PRIMARY} disabled:opacity-50`
                                      }`}
                                    >
                                      {startingAssessment ? (
                                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                                      ) : completed ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <ArrowRight className="h-4 w-4" />
                                      )}
                                      {completed ? "Selesai" : "Kerjakan"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {allCompleted && (
                            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-5 w-5" />
                                Semua checkpoint bagian ini selesai!
                              </div>
                              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                                Kamu sudah menyelesaikan seluruh checkpoint pada bagian ini. Silakan lanjutkan pembelajaran.
                              </p>
                            </div>
                          )}

                          {allCompleted && (
                            <div className="mt-4 flex flex-wrap justify-between gap-3">
                              <button
                                disabled={selectedSectionIndex === 0}
                                onClick={() =>
                                  setSelectedSectionIndex((index) =>
                                    Math.max(0, index - 1)
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-400/10 dark:bg-slate-950/40 motion-reduce:transition-none"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                Bagian sebelumnya
                              </button>

                              {selectedSectionIndex < sections.length - 1 ? (
                                <button
                                  disabled={
                                    !isSectionAccessible(selectedSectionIndex + 1)
                                  }
                                  onClick={() =>
                                    setSelectedSectionIndex((index) =>
                                      Math.min(sections.length - 1, index + 1)
                                    )
                                  }
                                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN_PRIMARY}`}
                                >
                                  Bagian berikutnya
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  disabled={
                                    !canOpenFinalAssessment ||
                                    startingAssessment ||
                                    !finalAssessment
                                  }
                                  onClick={() => {
                                    if (finalAssessment) {
                                      void startAssessment(finalAssessment);
                                    } else {
                                      setAssessmentError(
                                        "Evaluasi akhir belum tersedia."
                                      );
                                    }
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN_PRIMARY}`}
                                >
                                  <GraduationCap className="h-4 w-4" />
                                  Evaluasi akhir
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="relative px-6 py-14 text-center">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
                  />
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <BookOpen className="h-8 w-8 text-emerald-600/70 dark:text-emerald-400/70" />
                  </div>
                  <h2 className="relative mt-4 font-bold">
                    Belum ada bagian materi
                  </h2>
                  <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Admin belum menambahkan bagian materi untuk sesi ini.
                  </p>
                </div>
              )}
            </section>

            {/* ASSESSMENT ERROR */}
            {assessmentError && !activeAssessment && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 backdrop-blur-md dark:text-amber-300">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{assessmentError}</p>
              </div>
            )}

            {/* FINAL ASSESSMENT CARD */}
            {canOpenFinalAssessment && finalAssessment && (
              <section className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-white/60 to-teal-500/[0.08] p-5 shadow-[0_10px_35px_-15px_rgba(6,78,59,0.25)] backdrop-blur-md dark:via-slate-900/50 sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(5,150,105,0.22)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom_left,black,transparent_60%)]" />
                  <div className="gu-drift absolute -right-10 -top-14 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                </div>

                <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-md shadow-emerald-700/25">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-800 dark:text-emerald-200">
                        Semua checkpoint telah selesai
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Lanjutkan dengan evaluasi akhir untuk menyelesaikan sesi pembelajaran ini.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => void startAssessment(finalAssessment)}
                    disabled={startingAssessment}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN_DEEP}`}
                  >
                    {startingAssessment ? (
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
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
