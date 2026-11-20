
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  Map,
  Mountain,
  Sparkles,
  Star,
  Trophy,
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

  const [startingGame, setStartingGame] = useState(false);
  const [gameError, setGameError] = useState("");
  const [gameSession, setGameSession] =
    useState<AdventureSession | null>(null);

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
  }, [grade]);

  const handleLevelChange = (value: EducationLevel) => {
    setEducationLevel(value);
    setGrade(gradeOptions[value][0]);
    setGameSession(null);
    setGameError("");
  };

  const getSubjectLabel = (category: string) => {
    return category
      .replace(` ${educationLevel}`, "")
      .trim();
  };

  const handleStartAdventure = async () => {
    if (!subject || startingGame) return;

    setStartingGame(true);
    setGameError("");
    setGameSession(null);

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

      setGameSession(data as AdventureSession);
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
                setGrade(Number(event.target.value));
                setGameSession(null);
                setGameError("");
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
              setGameSession(null);
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
              onClick={() => setGrade((current) => current)}
              className="mt-2 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
            >
              Coba muat ulang halaman
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

      <div className="flex items-center justify-center gap-2 pb-2 text-xs text-gray-400">
        <BookOpen size={14} />
        Belajar sambil menjelajah bersama GradeUp
        <Mountain size={14} />
      </div>
    </div>
  );
}
