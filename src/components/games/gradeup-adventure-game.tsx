
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  GraduationCap,
  Map,
  Mountain,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";

type EducationLevel = "SD/MI" | "SMP/MTs" | "SMA/MA/SMK";

type AdventureQuestion = {
  question_order: number;
  question_text: string;
  options: { id: string; text: string }[];
  image_url: string | null;
  checkpoint: number;
};

type AdventureSession = {
  session_id: string;
  total_questions: number;
  total_checkpoints: number;
  question: AdventureQuestion;
};

type AnswerFeedback = {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  correct_count: number;
};

type AdventureResult = {
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  score: number;
};

const educationLevels: EducationLevel[] = [
  "SD/MI",
  "SMP/MTs",
  "SMA/MA/SMK",
];

const gradeOptions: Record<EducationLevel, number[]> = {
  "SD/MI": [1, 2, 3, 4, 5, 6],
  "SMP/MTs": [7, 8, 9],
  "SMA/MA/SMK": [10, 11, 12],
};

const checkpoints = [
  { number: 1, name: "Gerbang Pengetahuan", icon: "🌳" },
  { number: 2, name: "Hutan Misteri", icon: "🌲" },
  { number: 3, name: "Lembah Tantangan", icon: "🏞️" },
  { number: 4, name: "Gunung Ilmu", icon: "⛰️" },
  { number: 5, name: "Puncak Kejayaan", icon: "🏆" },
];

export default function GradeUpAdventureGame() {
  const [educationLevel, setEducationLevel] =
    useState<EducationLevel>("SD/MI");

  const [grade, setGrade] = useState<number>(6);
  const [subject, setSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState("");
  const [subjectReload, setSubjectReload] = useState(0);

  const [startingGame, setStartingGame] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [gameError, setGameError] = useState("");

  const [gameSession, setGameSession] =
    useState<AdventureSession | null>(null);

  const [currentQuestion, setCurrentQuestion] =
    useState<AdventureQuestion | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] =
    useState<AnswerFeedback | null>(null);

  const [nextQuestion, setNextQuestion] =
    useState<AdventureQuestion | null>(null);

  const [gameResult, setGameResult] =
    useState<AdventureResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setSubjectError("");
      setSubjects([]);
      setSubject("");

      try {
        const { data, error } = await supabase.rpc(
          "get_adventure_subjects",
          {
            p_grade: grade,
          }
        );

        if (error) throw error;

        if (!cancelled) {
          const availableSubjects = (data ?? [])
            .map((item: { category: string }) => item.category)
            .filter((category: string) => Boolean(category));

          setSubjects(availableSubjects);
        }
      } catch (error) {
        console.error("Gagal memuat mata pelajaran Adventure:", error);

        if (!cancelled) {
          setSubjectError(
            "Mata pelajaran gagal dimuat. Silakan coba lagi."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSubjects(false);
        }
      }
    };

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [grade, subjectReload]);

  const resetGame = () => {
    setGameSession(null);
    setCurrentQuestion(null);
    setSelectedAnswer("");
    setFeedback(null);
    setNextQuestion(null);
    setGameResult(null);
    setGameError("");
  };

  const handleLevelChange = (value: EducationLevel) => {
    resetGame();
    setEducationLevel(value);
    setGrade(gradeOptions[value][0]);
  };

  const getSubjectLabel = (category: string) => {
    return category.replace(` ${educationLevel}`, "").trim();
  };

  const handleStartAdventure = async () => {
    if (!subject || startingGame) return;

    setStartingGame(true);
    setGameError("");
    resetGame();

    try {
      const { data, error } = await supabase.rpc(
        "start_adventure_secure",
        {
          p_grade: grade,
          p_category: subject,
        }
      );

      if (error) throw error;

      if (!data?.success || !data?.session_id || !data?.question) {
        throw new Error("Data petualangan tidak valid.");
      }

      const session = data as AdventureSession;

      setGameSession(session);
      setCurrentQuestion(session.question);
    } catch (error) {
      console.error("Gagal memulai GradeUp Adventure:", error);

      setGameError(
        error instanceof Error
          ? error.message
          : "Petualangan gagal dimulai. Silakan coba lagi."
      );
    } finally {
      setStartingGame(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (
      !gameSession ||
      !currentQuestion ||
      !selectedAnswer ||
      submittingAnswer ||
      feedback
    ) {
      return;
    }

    setSubmittingAnswer(true);
    setGameError("");

    try {
      const { data, error } = await supabase.rpc(
        "answer_adventure_question_secure",
        {
          p_session_id: gameSession.session_id,
          p_question_order: currentQuestion.question_order,
          p_answer: selectedAnswer,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(
          data?.message || "Jawaban gagal diproses."
        );
      }

      setFeedback({
        correct: data.correct,
        correct_answer: data.correct_answer,
        explanation: data.explanation,
        correct_count: data.correct_count,
      });

      if (data.completed) {
        setGameResult({
          correct_count: data.correct_count,
          wrong_count: data.wrong_count,
          total_questions: data.total_questions,
          score: data.score,
        });
      } else if (data.question) {
        setNextQuestion(data.question);
      } else {
        throw new Error("Soal berikutnya tidak ditemukan.");
      }
    } catch (error) {
      console.error("Gagal mengirim jawaban Adventure:", error);

      setGameError(
        error instanceof Error
          ? error.message
          : "Jawaban gagal dikirim. Silakan coba lagi."
      );
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (!nextQuestion) return;

    setCurrentQuestion(nextQuestion);
    setNextQuestion(null);
    setSelectedAnswer("");
    setFeedback(null);
    setGameError("");
  };

  const currentCheckpoint = currentQuestion
    ? checkpoints[currentQuestion.checkpoint - 1]
    : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-900 p-6 text-white shadow-lg md:p-9">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-32 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
              <Sparkles size={16} />
              GradeUp Games
            </div>

            <h1 className="text-3xl font-extrabold md:text-4xl">
              GradeUp Adventure
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-indigo-100 md:text-base">
              Jelajahi dunia pengetahuan, pecahkan tantangan,
              dan taklukkan lima checkpoint dalam satu petualangan!
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                🧭 Mode Solo
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                📚 25 Soal
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                🏆 5 Checkpoint
              </span>
            </div>
          </div>

          <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 md:flex">
            <Compass size={82} strokeWidth={1.3} />
          </div>
        </div>
      </section>

      {/* Game Screen */}
      {gameSession && currentQuestion ? (
        <section className="space-y-6">
          {/* Progress */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Petualangan sedang berlangsung
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {currentCheckpoint?.icon}{" "}
                  {currentCheckpoint?.name}
                </h2>
              </div>

              <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                Soal {currentQuestion.question_order}/25
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500"
                style={{
                  width: `${(currentQuestion.question_order / 25) * 100}%`,
                }}
              />
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {checkpoints.map((checkpoint) => {
                const active =
                  checkpoint.number === currentQuestion.checkpoint;
                const completed =
                  checkpoint.number < currentQuestion.checkpoint;

                return (
                  <div
                    key={checkpoint.number}
                    className={`rounded-xl border p-2 text-center ${
                      active
                        ? "border-violet-500 bg-violet-100 dark:bg-violet-950"
                        : completed
                          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    <div className="text-xl">
                      {completed ? "✓" : checkpoint.icon}
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-gray-600 dark:text-gray-300 sm:text-xs">
                      {checkpoint.number}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
            <div className="mb-5 flex items-center gap-2">
              <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                CHECKPOINT {currentQuestion.checkpoint}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tantangan {((currentQuestion.question_order - 1) % 5) + 1} dari 5
              </span>
            </div>

            <h2 className="text-lg font-bold leading-relaxed text-gray-900 dark:text-white md:text-xl">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.image_url && (
              <img
                src={currentQuestion.image_url}
                alt="Ilustrasi soal"
                className="mt-5 max-h-80 w-full rounded-2xl border border-gray-200 object-contain dark:border-gray-700"
              />
            )}

            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrectOption =
                  feedback?.correct_answer?.toUpperCase() ===
                  option.id.toUpperCase();

                let optionClass =
                  "border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-violet-950/30";

                if (feedback && isCorrectOption) {
                  optionClass =
                    "border-green-500 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-950/30 dark:text-green-300";
                } else if (feedback && isSelected && !feedback.correct) {
                  optionClass =
                    "border-red-500 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-950/30 dark:text-red-300";
                } else if (isSelected) {
                  optionClass =
                    "border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-200 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(feedback) || submittingAnswer}
                    onClick={() => setSelectedAnswer(option.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors disabled:cursor-default ${optionClass}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {option.id}
                    </span>

                    <span className="flex-1 text-sm font-medium leading-relaxed">
                      {option.text}
                    </span>

                    {feedback && isCorrectOption && (
                      <CheckCircle2
                        size={21}
                        className="shrink-0 text-green-600"
                      />
                    )}

                    {feedback &&
                      isSelected &&
                      !feedback.correct && (
                        <XCircle
                          size={21}
                          className="shrink-0 text-red-600"
                        />
                      )}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`mt-6 rounded-2xl border p-5 ${
                  feedback.correct
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.correct ? (
                    <CheckCircle2 className="text-green-600" size={23} />
                  ) : (
                    <XCircle className="text-red-600" size={23} />
                  )}

                  <h3
                    className={`font-bold ${
                      feedback.correct
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {feedback.correct
                      ? "Jawaban Benar!"
                      : "Belum Tepat"}
                  </h3>
                </div>

                <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                  Jawaban yang benar:{" "}
                  <strong>{feedback.correct_answer}</strong>
                </p>

                {feedback.explanation && (
                  <div className="mt-3 border-t border-gray-200/70 pt-3 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Pembahasan
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                      {feedback.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {gameError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {gameError}
              </p>
            )}

            {/* Actions */}
            {!feedback ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || submittingAnswer}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 dark:disabled:bg-gray-700"
              >
                {submittingAnswer
                  ? "Memeriksa Jawaban..."
                  : "Kunci Jawaban"}
                {!submittingAnswer && <ArrowRight size={18} />}
              </button>
            ) : gameResult ? (
              <button
                type="button"
                onClick={resetGame}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition-colors hover:bg-violet-700"
              >
                Lihat Halaman Pemilihan
                <RotateCcw size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={!nextQuestion}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
              >
                Lanjut ke Soal Berikutnya
                <ChevronRight size={19} />
              </button>
            )}
          </div>
        </section>
      ) : gameResult ? (
        /* Result */
        <section className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 dark:bg-amber-950/40">
            <Trophy size={42} className="text-amber-500" />
          </div>

          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Petualangan Selesai
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white md:text-3xl">
            Selamat! Kamu Menyelesaikan Petualangan
          </h2>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Kamu telah melewati seluruh lima checkpoint GradeUp Adventure.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nilai
              </p>
              <p className="mt-2 text-3xl font-extrabold text-violet-700 dark:text-violet-300">
                {gameResult.score}
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Benar
              </p>
              <p className="mt-2 text-3xl font-extrabold text-green-600">
                {gameResult.correct_count}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-950/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Salah
              </p>
              <p className="mt-2 text-3xl font-extrabold text-red-600">
                {gameResult.wrong_count}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Soal
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-800 dark:text-white">
                {gameResult.total_questions}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetGame}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-bold text-white transition-colors hover:bg-violet-700 md:w-auto"
          >
            <RotateCcw size={18} />
            Kembali ke Pemilihan
          </button>
        </section>
      ) : (
        <>
          {/* Selection */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-7">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="text-violet-600" size={22} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Persiapkan Petualanganmu
                </h2>
              </div>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Pilih jenjang dan kelas sebelum menentukan mata pelajaran.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Jenjang Pendidikan
                </label>

                <select
                  value={educationLevel}
                  onChange={(event) =>
                    handleLevelChange(event.target.value as EducationLevel)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {educationLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Kelas
                </label>

                <select
                  value={grade}
                  onChange={(event) => {
                    resetGame();
                    setGrade(Number(event.target.value));
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {gradeOptions[educationLevel].map((item) => (
                    <option key={item} value={item}>
                      Kelas {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Mata Pelajaran
              </label>

              <select
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setGameError("");
                }}
                disabled={loadingSubjects || subjects.length === 0}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              >
                <option value="">
                  {loadingSubjects
                    ? "Memuat mata pelajaran..."
                    : subjects.length > 0
                      ? "Pilih mata pelajaran"
                      : "Belum ada mata pelajaran tersedia"}
                </option>

                {subjects.map((item) => (
                  <option key={item} value={item}>
                    {getSubjectLabel(item)}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {loadingSubjects
                  ? "Sedang mengambil data dari bank soal GradeUp..."
                  : subjectError
                    ? subjectError
                    : subjects.length > 0
                      ? `${subjects.length} mata pelajaran tersedia untuk kelas ${grade}.`
                      : "Belum ditemukan soal untuk kelas yang dipilih."}
              </p>

              {subjectError && (
                <button
                  type="button"
                  onClick={() => setSubjectReload((value) => value + 1)}
                  className="mt-2 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                >
                  Coba muat ulang mata pelajaran
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartAdventure}
              disabled={!subject || startingGame || loadingSubjects}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 dark:disabled:bg-gray-700"
            >
              {startingGame
                ? "Menyiapkan Petualangan..."
                : "Mulai Petualangan"}
              {!startingGame && <ArrowRight size={18} />}
            </button>

            {gameError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {gameError}
              </p>
            )}
          </section>

          {/* Checkpoint Map */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <Map className="text-violet-600" size={23} />

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Peta Petualangan
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Lima checkpoint menantimu.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.number}
                  className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-center dark:border-violet-900/50 dark:bg-violet-950/20"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-gray-800">
                    {checkpoint.icon}
                  </div>

                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Checkpoint {checkpoint.number}
                  </p>

                  <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                    {checkpoint.name}
                  </h3>

                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Star size={13} />
                    5 Tantangan
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <Trophy className="mt-0.5 shrink-0 text-amber-500" size={19} />
                <p>
                  Selesaikan seluruh 25 soal untuk menuntaskan
                  satu perjalanan petualangan.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex items-center justify-center gap-2 pb-2 text-xs text-gray-400">
        <BookOpen size={14} />
        Belajar sambil menjelajah bersama GradeUp
        <Mountain size={14} />
      </div>
    </div>
  );
}
