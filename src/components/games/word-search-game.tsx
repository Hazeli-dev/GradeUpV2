
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Gamepad2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Target,
} from "lucide-react";

const GRID_SIZE = 12;
const WORD_COUNT = 12;

const THEMES: Record<string, string[]> = {
  Negara: [
    "INDONESIA", "MALAYSIA", "SINGAPURA", "THAILAND",
    "JEPANG", "KOREA", "BRAZIL", "KANADA", "AUSTRALIA",
    "JERMAN", "PRANCIS", "MESIR", "FILIPINA", "VIETNAM",
    "ITALIA", "SPANYOL", "ARGENTINA", "TURKI", "BELANDA",
    "INDIA",
  ],
  Buah: [
    "APEL", "MANGGA", "PISANG", "JERUK", "DURIAN",
    "RAMBUTAN", "PEPAYA", "SEMANGKA", "MELON", "ANGGUR",
    "STROBERI", "NANAS", "ALPUKAT", "KELENGKENG",
    "SALAK", "JAMBU", "MANGGIS", "SIRSAK", "LEMON",
    "MARKISA",
  ],
  Profesi: [
    "DOKTER", "GURU", "POLISI", "PILOT", "NELAYAN",
    "PETANI", "ARSITEK", "PENULIS", "ILMUWAN", "PERAWAT",
    "MASINIS", "APOTEKER", "PROGRAMER", "JURNALIS",
    "PEMUSIK", "PEMIMPIN", "PENELITI", "MEKANIK",
    "NAKHODA", "ASTRONOM",
  ],
  Hewan: [
    "GAJAH", "HARIMAU", "SINGA", "KELINCI", "KUCING",
    "KAMBING", "JERAPAH", "ZEBRA", "KOMODO", "PANDA",
    "LUMBA", "PAUS", "KUPU", "MERPATI", "ELANG",
    "BUAYA", "PENYU", "KANGURU", "BADAK", "ORANGUTAN",
  ],
  Benda: [
    "MEJA", "KURSI", "BUKU", "PENSIL", "PENGGARIS",
    "KOMPUTER", "TELEPON", "LAMPU", "JENDELA", "PINTU",
    "SEPATU", "TAS", "KAMERA", "KERTAS", "PAPAN",
    "KIPAS", "PAYUNG", "JAM", "BOTOL", "LEMARI",
  ],
  Bahasa: [
    "INDONESIA", "INGGRIS", "JEPANG", "KOREA", "ARAB",
    "MANDARIN", "SPANYOL", "PRANCIS", "JERMAN", "ITALIA",
    "PORTUGIS", "RUSIA", "THAILAND", "MELAYU", "SUNDA",
    "JAWA", "BALI", "BUGIS", "MINANG", "SANSKERTA",
  ],
  "Alam Semesta": [
    "MATAHARI", "BULAN", "BUMI", "MARS", "VENUS",
    "JUPITER", "SATURNUS", "NEPTUNUS", "GALAKSI",
    "BINTANG", "KOMET", "METEOR", "ORBIT", "ASTEROID",
    "KOSMOS", "NEBULA", "PLANET", "SATELIT", "GERHANA",
    "TELESKOP",
  ],
  IPA: [
    "ATOM", "MOLEKUL", "ENERGI", "GRAVITASI", "FOTOSINTESIS",
    "EKOSISTEM", "MAGNET", "LISTRIK", "SUHU", "KALOR",
    "OKSIGEN", "KARBON", "PROTEIN", "SEL", "JARINGAN",
    "ORGAN", "EVOLUSI", "BAKTERI", "MIKROBA", "ENZIM",
  ],
  Sejarah: [
    "KERAJAAN", "PAHLAWAN", "PROKLAMASI", "MERDEKA",
    "MAJAPAHIT", "SRIWIJAYA", "BOROBUDUR", "PRAMBANAN",
    "KOLONIAL", "REVOLUSI", "PERJUANGAN", "PENJAJAHAN",
    "PRESIDEN", "SEJARAH", "MONUMEN", "NUSANTARA",
    "SUMPAH", "PEMUDA", "PAJAK", "PERADABAN",
  ],
  Matematika: [
    "BILANGAN", "PECAHAN", "GEOMETRI", "ALJABAR",
    "SEGITIGA", "LINGKARAN", "KUBUS", "BALOK",
    "DIAMETER", "KELILING", "VOLUME", "LUAS",
    "PERSEN", "DESIMAL", "FAKTOR", "KELIPATAN",
    "STATISTIK", "DIAGRAM", "SUDUT", "RUMUS",
  ],
  Tumbuhan: [
    "AKAR", "BATANG", "DAUN", "BUNGA", "BUAH",
    "BIJI", "KELAPA", "BAMBU", "ANGGREK", "MELATI",
    "MAWAR", "JATI", "PINUS", "PAKU", "PALEM",
    "KAKTUS", "PALEM", "KEMBANG", "TULIP", "PAKIS",
  ],
  Teknologi: [
    "INTERNET", "KOMPUTER", "ROBOT", "DIGITAL",
    "ALGORITMA", "PROGRAM", "PERANGKAT", "JARINGAN",
    "APLIKASI", "SERVER", "DATABASE", "BROWSER",
    "SENSOR", "SATELIT", "KAMERA", "PROSESOR",
    "ANDROID", "INOVASI", "OTOMASI", "VIRTUAL",
  ],
  Geografi: [
    "GUNUNG", "LAUTAN", "SAMUDRA", "SUNGAI", "DANAU",
    "LEMBAH", "DATARAN", "BUKIT", "PANTAI", "PULAU",
    "BENUA", "KONTINEN", "KOMPAS", "PETA", "IKLIM",
    "GURUN", "HUTAN", "SELAT", "TELUK", "DELTA",
  ],
  Olahraga: [
    "SEPAKBOLA", "BASKET", "VOLI", "BADMINTON",
    "RENANG", "ATLETIK", "TENIS", "GOLF", "KARATE",
    "JUDO", "PANAHAN", "BALAP", "SENAM", "TINJU",
    "FUTSAL", "TAEKWONDO", "SEPEDA", "LARI", "CATUR",
    "DAYUNG",
  ],
  Makanan: [
    "NASIGORENG", "SATE", "RENDANG", "SOTO", "BAKSO",
    "PEMPEK", "GUDEG", "RAWON", "GADO", "KETOPRAK",
    "MARTABAK", "KLEPON", "DODOL", "LONTONG", "OPOR",
    "SAMBAL", "TEMPE", "TAHU", "PASTA", "PIZZA",
  ],
};

type Position = {
  row: number;
  col: number;
};

type Puzzle = {
  grid: string[][];
  words: string[];
  placements: Record<string, Position[]>;
};

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createPuzzle(theme: string): Puzzle {
  const pool = [...new Set(THEMES[theme] ?? THEMES.Negara)];

  const selectedWords = shuffleArray(
    pool.filter((word) => word.length <= GRID_SIZE),
  ).slice(0, WORD_COUNT);

  for (let attempt = 0; attempt < 150; attempt++) {
    const grid = Array.from(
      { length: GRID_SIZE },
      () => Array(GRID_SIZE).fill(""),
    );

    const placements: Record<string, Position[]> = {};
    const sortedWords = [...selectedWords].sort(
      (a, b) => b.length - a.length,
    );

    let success = true;

    for (const word of sortedWords) {
      const candidates: Position[][] = [];

      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          for (const [dr, dc] of DIRECTIONS) {
            const endRow = row + dr * (word.length - 1);
            const endCol = col + dc * (word.length - 1);

            if (
              endRow < 0 ||
              endRow >= GRID_SIZE ||
              endCol < 0 ||
              endCol >= GRID_SIZE
            ) {
              continue;
            }

            const positions = Array.from(
              { length: word.length },
              (_, index) => ({
                row: row + dr * index,
                col: col + dc * index,
              }),
            );

            const canPlace = positions.every((position, index) => {
              const existing = grid[position.row][position.col];
              return !existing || existing === word[index];
            });

            if (canPlace) candidates.push(positions);
          }
        }
      }

      const candidate = shuffleArray(candidates)[0];

      if (!candidate) {
        success = false;
        break;
      }

      candidate.forEach((position, index) => {
        grid[position.row][position.col] = word[index];
      });

      placements[word] = candidate;
    }

    if (success) {
      return {
        grid: grid.map((row) =>
          row.map(
            (letter) =>
              letter ||
              String.fromCharCode(
                65 + Math.floor(Math.random() * 26),
              ),
          ),
        ),
        words: selectedWords,
        placements,
      };
    }
  }

  // Pengaman jika pengacakan utama gagal.
  const fallbackWords = shuffleArray(
    pool.filter((word) => word.length <= 8),
  ).slice(0, WORD_COUNT);

  const grid = Array.from(
    { length: GRID_SIZE },
    () => Array(GRID_SIZE).fill(""),
  );

  const placements: Record<string, Position[]> = {};

  for (const word of fallbackWords) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const [dr, dc] =
        DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      const positions = Array.from(
        { length: word.length },
        (_, index) => ({
          row: row + dr * index,
          col: col + dc * index,
        }),
      );

      const valid = positions.every((position, index) => {
        return (
          position.row >= 0 &&
          position.row < GRID_SIZE &&
          position.col >= 0 &&
          position.col < GRID_SIZE &&
          (!grid[position.row][position.col] ||
            grid[position.row][position.col] === word[index])
        );
      });

      if (valid) {
        positions.forEach((position, index) => {
          grid[position.row][position.col] = word[index];
        });

        placements[word] = positions;
        break;
      }
    }
  }

  return {
    grid: grid.map((row) =>
      row.map(
        (letter) =>
          letter ||
          String.fromCharCode(
            65 + Math.floor(Math.random() * 26),
          ),
      ),
    ),
    words: fallbackWords.filter((word) => placements[word]),
    placements,
  };
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function getSelectionPath(
  start: Position,
  end: Position,
): Position[] {
  const rowDiff = end.row - start.row;
  const colDiff = end.col - start.col;

  if (rowDiff === 0 && colDiff === 0) return [start];

  const isHorizontal = rowDiff === 0;
  const isVertical = colDiff === 0;
  const isDiagonal = Math.abs(rowDiff) === Math.abs(colDiff);

  if (!isHorizontal && !isVertical && !isDiagonal) return [];

  const rowStep = Math.sign(rowDiff);
  const colStep = Math.sign(colDiff);
  const length =
    Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;

  return Array.from({ length }, (_, index) => ({
    row: start.row + rowStep * index,
    col: start.col + colStep * index,
  }));
}

export default function WordSearchGame() {
  const [theme, setTheme] = useState("Negara");
  const [puzzle, setPuzzle] = useState<Puzzle>(() =>
    createPuzzle("Negara"),
  );
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [start, setStart] = useState<Position | null>(null);
  const [end, setEnd] = useState<Position | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState(
    "Pilih huruf pertama, lalu geser ke huruf terakhir.",
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const isComplete =
    puzzle.words.length > 0 &&
    foundWords.length === puzzle.words.length;

  useEffect(() => {
    if (!isPlaying || isComplete) return;

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying, isComplete]);

  useEffect(() => {
    if (isComplete) {
      setIsPlaying(false);
      setMessage("Hebat! Semua kata berhasil ditemukan!");
    }
  }, [isComplete]);

  const selectedPath = useMemo(() => {
    if (!start || !end) return [];
    return getSelectionPath(start, end);
  }, [start, end]);

  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedPath.map(
          (position) => `${position.row}-${position.col}`,
        ),
      ),
    [selectedPath],
  );

  const foundKeys = useMemo(() => {
    const keys = new Set<string>();

    foundWords.forEach((word) => {
      puzzle.placements[word]?.forEach((position) => {
        keys.add(`${position.row}-${position.col}`);
      });
    });

    return keys;
  }, [foundWords, puzzle.placements]);

  const progress =
    puzzle.words.length > 0
      ? (foundWords.length / puzzle.words.length) * 100
      : 0;

  function startGame(nextTheme = theme) {
    setTheme(nextTheme);
    setPuzzle(createPuzzle(nextTheme));
    setFoundWords([]);
    setStart(null);
    setEnd(null);
    setSeconds(0);
    setIsPlaying(true);
    isSelectingRef.current = false;
    setMessage(
      "Pilih huruf pertama, lalu geser ke huruf terakhir.",
    );
  }

  function getCellFromPoint(
    clientX: number,
    clientY: number,
  ): Position | null {
    const element = document.elementFromPoint(clientX, clientY);
    const cell = element?.closest("[data-game-cell]");

    if (!cell) return null;

    const row = Number(cell.getAttribute("data-row"));
    const col = Number(cell.getAttribute("data-col"));

    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return null;
    }

    return { row, col };
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (isComplete) return;

    const position = getCellFromPoint(
      event.clientX,
      event.clientY,
    );

    if (!position) return;

    event.preventDefault();

    isSelectingRef.current = true;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Beberapa browser mungkin tidak mendukung pointer capture.
    }

    if (!isPlaying) setIsPlaying(true);

    setStart(position);
    setEnd(position);
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!isSelectingRef.current || !start) return;

    const position = getCellFromPoint(
      event.clientX,
      event.clientY,
    );

    if (position) {
      setEnd(position);
    }
  }

  function finishSelection() {
    if (!isSelectingRef.current) return;

    isSelectingRef.current = false;

    if (!start || !end) {
      setStart(null);
      setEnd(null);
      return;
    }

    const path = getSelectionPath(start, end);

    if (path.length < 2) {
      setStart(null);
      setEnd(null);
      return;
    }

    const selectedText = path
      .map((position) => puzzle.grid[position.row][position.col])
      .join("");

    const reversedText = selectedText.split("").reverse().join("");

    const matchedWord = puzzle.words.find(
      (word) =>
        (word === selectedText || word === reversedText) &&
        !foundWords.includes(word),
    );

    if (matchedWord) {
      setFoundWords((current) =>
        current.includes(matchedWord)
          ? current
          : [...current, matchedWord],
      );
      setMessage(`Benar! Kamu menemukan ${matchedWord}.`);
    } else {
      setMessage("Belum tepat. Coba cari kata lainnya!");
    }

    setStart(null);
    setEnd(null);
  }

  function cancelSelection() {
    isSelectingRef.current = false;
    setStart(null);
    setEnd(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Gamepad2 size={18} />
            GRADEUP GAMES
          </div>

          <h2 className="mt-1 text-xl font-bold sm:text-2xl">
            Cari Kata HOTS
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Temukan semua kata tersembunyi dalam kotak huruf.
          </p>
        </div>

        <button
          type="button"
          onClick={() => startGame()}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-muted sm:w-auto"
        >
          <RotateCcw size={16} />
          Main Ulang
        </button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target size={15} />
            Kata ditemukan
          </div>

          <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">
            {foundWords.length}
            <span className="text-sm font-medium text-muted-foreground">
              {" "}/ {puzzle.words.length}
            </span>
          </p>
        </div>

        <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 size={15} />
            Waktu bermain
          </div>

          <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">
            {formatTime(seconds)}
          </p>
        </div>

        <div className="col-span-2 min-w-0 rounded-xl border bg-card p-3 sm:col-span-1 sm:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles size={15} />
            Progres permainan
          </div>

          <p className="mt-2 text-xl font-bold sm:text-2xl">
            {Math.round(progress)}%
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">Progres pencarian</span>
          <span className="text-muted-foreground">
            {foundWords.length} dari {puzzle.words.length} kata
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Area permainan */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Grid huruf */}
        <div className="min-w-0 rounded-2xl border bg-card p-2.5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
            <div>
              <h3 className="font-bold">Kotak Huruf</h3>
              <p className="text-xs text-muted-foreground">
                Tema: {theme}
              </p>
            </div>

            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              12 × 12
            </span>
          </div>

          <div
            ref={gridRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishSelection}
            onPointerCancel={cancelSelection}
            onContextMenu={(event) => event.preventDefault()}
            className="mx-auto grid w-full max-w-[560px] select-none gap-[3px] sm:gap-1"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            {puzzle.grid.map((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const isFound = foundKeys.has(key);
                const isSelected = selectedKeys.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    tabIndex={-1}
                    data-game-cell="true"
                    data-row={rowIndex}
                    data-col={colIndex}
                    aria-label={`Baris ${rowIndex + 1}, kolom ${
                      colIndex + 1
                    }, huruf ${letter}`}
                    className={[
                      "flex aspect-square min-w-0 items-center justify-center rounded-[4px] font-bold leading-none transition-colors",
                      "text-[clamp(9px,2.8vw,15px)] sm:rounded-lg sm:text-sm md:text-base",
                      isFound
                        ? "bg-emerald-500 text-white"
                        : isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/70 text-foreground",
                    ].join(" ")}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>

          <div
            aria-live="polite"
            className="mt-4 rounded-lg bg-muted px-3 py-3 text-center text-xs text-muted-foreground sm:text-sm"
          >
            {message}
          </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            Sentuh atau klik huruf pertama, kemudian geser ke huruf
            terakhir. Kata dapat ditemukan secara horizontal,
            vertikal, atau diagonal.
          </p>
        </div>

        {/* Panel samping */}
        <aside className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="min-w-0 rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Daftar Kata</h3>
              <span className="text-xs text-muted-foreground">
                {foundWords.length}/{puzzle.words.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {puzzle.words.map((word) => {
                const found = foundWords.includes(word);

                return (
                  <div
                    key={word}
                    className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                      found
                        ? "bg-emerald-500/10 text-emerald-700 line-through dark:text-emerald-300"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {found ? (
                      <CheckCircle2
                        size={15}
                        className="shrink-0"
                      />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
                    )}

                    <span className="break-all">{word}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-bold">Pilihan Tema</h3>

            <select
              value={theme}
              onChange={(event) => startGame(event.target.value)}
              className="min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.keys(THEMES).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => startGame()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Shuffle size={16} />
              Acak Permainan
            </button>
          </div>
        </aside>
      </div>

      {/* Selesai */}
      {isComplete && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center sm:p-6"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles size={28} />
          </div>

          <h3 className="mt-4 text-lg font-bold text-emerald-700 dark:text-emerald-300 sm:text-xl">
            Selamat! Tantangan Selesai!
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Kamu berhasil menemukan semua {puzzle.words.length} kata
            dalam waktu {formatTime(seconds)}.
          </p>

          <button
            type="button"
            onClick={() => startGame()}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <RotateCcw size={16} />
            Main Lagi
          </button>
        </div>
      )}
    </div>
  );
}
