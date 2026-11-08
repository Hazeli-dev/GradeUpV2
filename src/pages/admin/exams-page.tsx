import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle2,
  Calendar as CalendarIcon,
  Archive,
  BookOpen,
  Zap,
  FileText,
  Award,
  Pencil,
  Trash2,
  Download,
  FileSpreadsheet,
  Loader2,
  Image as ImageIcon,
  X,
  Eye,
  Upload,
  Send,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";

import { DIFFICULTIES, LEVELS } from "@/constants";
import { supabase } from "@/lib/supabase";
import {
  downloadQuestionTemplate,
  parseQuestionsExcelPreview,
  type ExamQuestionPreview,
} from "@/utils/excel-helpers";

import type { Difficulty, ExamPackage, Level } from "@/types";

// =====================================================
// KONFIGURASI
// =====================================================

const MAX_BULK_PACKAGES = 500;
const MAX_EXCEL_SIZE = 10 * 1024 * 1024;

const GRADES_BY_LEVEL: Record<string, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  SD: [
    "Bahasa Indonesia",
    "Matematika",
    "Pendidikan Pancasila",
    "IPAS",
    "Pendidikan Agama",
    "Bahasa Inggris",
    "Seni Budaya",
    "PJOK",
  ],
  SMP: [
    "Bahasa Indonesia",
    "Matematika",
    "IPA",
    "IPS",
    "Pendidikan Pancasila",
    "Bahasa Inggris",
    "Informatika",
    "Pendidikan Agama",
  ],
  SMA: [
    "Bahasa Indonesia",
    "Matematika",
    "Bahasa Inggris",
    "Fisika",
    "Kimia",
    "Biologi",
    "Ekonomi",
    "Geografi",
    "Sejarah",
    "Sosiologi",
  ],
  SMK: [
    "Bahasa Indonesia",
    "Matematika",
    "Bahasa Inggris",
    "Informatika",
    "Dasar-Dasar Kejuruan",
    "Projek Kreatif dan Kewirausahaan",
  ],
};

const EXAM_TYPES = [
  "Latihan",
  "Ulangan Harian",
  "PTS",
  "PAS",
  "Tryout",
  "Simulasi TKA",
];

const getDefaultGrade = (level: string) =>
  GRADES_BY_LEVEL[level]?.[0] ?? 1;

const getDefaultSubject = (level: string) =>
  SUBJECTS_BY_LEVEL[level]?.[0] ?? "Bahasa Indonesia";

const getLegacyGrade = (
  category: string | null | undefined,
  level: string
) => {
  const match = category?.match(/kelas\s*(\d+)/i);
  const grade = match ? Number(match[1]) : getDefaultGrade(level);

  return (GRADES_BY_LEVEL[level] ?? []).includes(grade)
    ? grade
    : getDefaultGrade(level);
};

// =====================================================
// TIPE DATA
// =====================================================

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  examType: string;
  level: Level;
  grade: number;
  difficulty: Difficulty;
  duration: number;
  questionCount: number;
  premium: boolean;
  published: boolean;
  startTime: string;
  endTime: string;
  noEndDate: boolean;
};

type EditableQuestion = ExamQuestionPreview & {
  id?: string;
  isExisting: boolean;
};

type BulkPackage = {
  title: string;
  description: string;
  level: string;
  grade: number;
  subject: string;
  examType: string;
  category: string;
  difficulty: string;
  duration: number;
  questionCount: number;
  premium: boolean;
  startTime: string;
  endTime: string | null;
  errors: string[];
};

type ExamStatus = "Draft" | "Aktif" | "Akan Datang" | "Arsip";

// =====================================================
// DEFAULT FORM
// =====================================================

const toLocalDateTime = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const nowIso = toLocalDateTime(new Date());

const defaultEndIso = toLocalDateTime(
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
);

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  subject: "Matematika",
  examType: "Latihan",
  level: "SD",
  grade: 1,
  difficulty: "Sedang",
  duration: 30,
  questionCount: 10,
  premium: false,
  published: false,
  startTime: nowIso,
  endTime: defaultEndIso,
  noEndDate: false,
};

// =====================================================
// HELPER
// =====================================================

const normalizeImageUrl = (value: string | null | undefined) =>
  (value ?? "").trim();

const isValidImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeOptions = (
  value: unknown
): { id: string; text: string }[] => {
  if (!Array.isArray(value)) return [];

  return value.map((option: any, index: number) => ({
    id: String(option?.id || String.fromCharCode(65 + index)),
    text: String(option?.text ?? ""),
  }));
};

const normalizeText = (value: unknown) =>
  String(value ?? "").trim();

const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return ["true", "1", "ya", "yes", "premium"].includes(normalized);
};

const parseExcelDate = (value: unknown): string | null => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      const date = new Date(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H,
        parsed.M,
        parsed.S
      );

      return date.toISOString();
    }
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

const getExcelCell = (
  row: Record<string, unknown>,
  ...keys: string[]
) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  return undefined;
};

const createBlankQuestion = (
  category: string
): EditableQuestion => ({
  question_text: "",
  category,
  options: [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ],
  correct_answer: "A",
  explanation: "",
  image_url: null,
  image_enabled: false,
  isExisting: false,
});

// =====================================================
// TEMPLATE EXCEL PAKET
// =====================================================

const downloadPackageTemplate = () => {
  const headers = [
    "title",
    "description",
    "level",
    "grade",
    "subject",
    "exam_type",
    "category",
    "difficulty",
    "duration",
    "question_count",
    "premium",
    "start_time",
    "end_time",
  ];

  const exampleRows = [
    [
      "Simulasi TKA Matematika Kelas 6",
      "Latihan persiapan TKA Matematika",
      "SD",
      6,
      "Matematika",
      "Simulasi TKA",
      "Matematika",
      "Sedang",
      90,
      30,
      false,
      "2026-12-01 08:00",
      "2026-12-31 23:59",
    ],
    [
      "Ulangan Harian Bahasa Indonesia Kelas 5",
      "Evaluasi materi Bahasa Indonesia",
      "SD",
      5,
      "Bahasa Indonesia",
      "Ulangan Harian",
      "Bahasa Indonesia",
      "Mudah",
      45,
      20,
      false,
      "",
      "",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...exampleRows,
  ]);

  worksheet["!cols"] = headers.map(() => ({ wch: 24 }));

  const guide = XLSX.utils.aoa_to_sheet([
    ["PETUNJUK IMPOR PAKET UJIAN GRADEUP"],
    [""],
    ["Kolom", "Keterangan"],
    ["title", "Wajib. Judul paket, minimal 5 karakter."],
    ["description", "Opsional. Deskripsi paket ujian."],
    ["level", "Wajib. SD, SMP, SMA, atau SMK."],
    ["grade", "Wajib. SD 1-6, SMP 7-9, SMA/SMK 10-12."],
    ["subject", "Wajib. Nama mata pelajaran."],
    ["exam_type", "Latihan, Ulangan Harian, PTS, PAS, Tryout, Simulasi TKA."],
    ["category", "Kategori paket. Jika kosong akan mengikuti subject."],
    ["difficulty", "Mudah, Sedang, atau Sulit."],
    ["duration", "Durasi ujian dalam menit, 5-240."],
    ["question_count", "Jumlah soal yang direncanakan, 1-200."],
    ["premium", "TRUE/FALSE atau YA/TIDAK."],
    ["start_time", "Opsional. Format YYYY-MM-DD HH:mm."],
    ["end_time", "Opsional. Format YYYY-MM-DD HH:mm."],
    [""],
    ["PENTING"],
    ["Semua paket hasil impor otomatis disimpan sebagai DRAFT."],
    ["File ini hanya untuk data paket, bukan untuk memasukkan soal."],
    ["Maksimal 500 paket dalam satu kali impor."],
    ["Soal ditambahkan setelah paket dibuat melalui menu Edit."],
  ]);

  guide["!cols"] = [{ wch: 24 }, { wch: 75 }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Paket Ujian");
  XLSX.utils.book_append_sheet(workbook, guide, "Petunjuk");

  XLSX.writeFile(workbook, "Template_Import_Paket_GradeUp.xlsx");
};

// =====================================================
// PARSE EXCEL PAKET
// =====================================================

const parsePackageExcel = async (
  file: File
): Promise<BulkPackage[]> => {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    throw new Error("Worksheet Excel tidak ditemukan.");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    firstSheet,
    {
      defval: "",
      raw: false,
    }
  );

  if (rawRows.length === 0) {
    throw new Error("File Excel belum berisi data paket.");
  }

  if (rawRows.length > MAX_BULK_PACKAGES) {
    throw new Error(
      `Maksimal ${MAX_BULK_PACKAGES} paket dalam satu kali impor. File kamu berisi ${rawRows.length} baris.`
    );
  }

  return rawRows.map((raw, index) => {
    const row: Record<string, unknown> = {};

    Object.entries(raw).forEach(([key, value]) => {
      row[key.trim().toLowerCase()] = value;
    });

    const title = normalizeText(
      getExcelCell(row, "title", "judul", "nama_paket")
    );

    const description = normalizeText(
      getExcelCell(row, "description", "deskripsi")
    );

    const level = normalizeText(
      getExcelCell(row, "level", "jenjang")
    ).toUpperCase();

    const grade = Number(
      getExcelCell(row, "grade", "kelas")
    );

    const subject = normalizeText(
      getExcelCell(row, "subject", "mapel", "mata_pelajaran")
    );

    const examType = normalizeText(
      getExcelCell(row, "exam_type", "jenis_ujian", "type")
    );

    const category =
      normalizeText(getExcelCell(row, "category", "kategori")) ||
      subject;

    const difficulty =
      normalizeText(
        getExcelCell(row, "difficulty", "kesulitan")
      ) || "Sedang";

    const duration = Number(
      getExcelCell(row, "duration", "durasi")
    );

    const questionCount = Number(
      getExcelCell(
        row,
        "question_count",
        "jumlah_soal",
        "total_soal"
      )
    );

    const premium = parseBoolean(
      getExcelCell(row, "premium", "is_premium")
    );

    const startRaw = getExcelCell(
      row,
      "start_time",
      "tanggal_mulai"
    );

    const endRaw = getExcelCell(
      row,
      "end_time",
      "tanggal_selesai"
    );

    const startTime = startRaw
      ? parseExcelDate(startRaw)
      : new Date().toISOString();

    const endTime = endRaw ? parseExcelDate(endRaw) : null;

    const errors: string[] = [];

    if (title.length < 5) {
      errors.push("Judul minimal 5 karakter.");
    }

    if (!["SD", "SMP", "SMA", "SMK"].includes(level)) {
      errors.push("Jenjang harus SD, SMP, SMA, atau SMK.");
    } else if (
      !(GRADES_BY_LEVEL[level] ?? []).includes(grade)
    ) {
      errors.push(`Kelas tidak sesuai dengan jenjang ${level}.`);
    }

    if (!subject) errors.push("Mata pelajaran wajib diisi.");

    if (!EXAM_TYPES.includes(examType)) {
      errors.push("Jenis ujian tidak dikenali.");
    }

    if (!["Mudah", "Sedang", "Sulit"].includes(difficulty)) {
      errors.push("Kesulitan harus Mudah, Sedang, atau Sulit.");
    }

    if (!Number.isInteger(duration) || duration < 5 || duration > 240) {
      errors.push("Durasi harus 5-240 menit.");
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 200
    ) {
      errors.push("Jumlah soal harus 1-200.");
    }

    if (startRaw && !startTime) {
      errors.push("Format tanggal mulai tidak valid.");
    }

    if (endRaw && !endTime) {
      errors.push("Format tanggal selesai tidak valid.");
    }

    if (
      startTime &&
      endTime &&
      new Date(endTime).getTime() < new Date(startTime).getTime()
    ) {
      errors.push("Tanggal selesai sebelum tanggal mulai.");
    }

    return {
      title,
      description,
      level,
      grade,
      subject,
      examType,
      category,
      difficulty,
      duration,
      questionCount,
      premium,
      startTime: startTime || new Date().toISOString(),
      endTime,
      errors: errors.map((error) => `Baris ${index + 2}: ${error}`),
    };
  });
};

// =====================================================
// KOMPONEN UTAMA
// =====================================================

export default function AdminExamsPage() {
  const [items, setItems] = useState<ExamPackage[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [activeTab, setActiveTab] = useState("Aktif");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<ExamPackage | null>(null);

  const [questionPreview, setQuestionPreview] = useState<
    EditableQuestion[]
  >([]);

  const [parsingExcel, setParsingExcel] = useState(false);

  // Impor massal paket
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkPackage[]>([]);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoryResult, examResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .order("name"),

        supabase
          .from("exam_packages")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (examResult.error) throw examResult.error;

      setCategories(categoryResult.data ?? []);
      setItems((examResult.data ?? []) as ExamPackage[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat paket ujian."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setDraft(null);
    setQuestionPreview([]);
    setErrs({});
    setParsingExcel(false);
    setLoadingQuestions(false);
  };

  const resetBulk = () => {
    setBulkOpen(false);
    setBulkFile(null);
    setBulkRows([]);
    setBulkParsing(false);
    setBulkSaving(false);
  };

  // =====================================================
  // UPDATE SOAL
  // =====================================================

  const updateQuestion = (
    index: number,
    updates: Partial<EditableQuestion>
  ) => {
    setQuestionPreview((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index
          ? { ...question, ...updates }
          : question
      )
    );
  };

  const updateQuestionOption = (
    questionIndex: number,
    optionId: string,
    text: string
  ) => {
    setQuestionPreview((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId
                  ? { ...option, text }
                  : option
              ),
            }
          : question
      )
    );
  };

  const removeQuestion = (index: number) => {
    const question = questionPreview[index];

    if (question?.isExisting) {
      toast.error(
        "Soal yang sudah tersimpan tidak bisa dihapus dari preview ini."
      );
      return;
    }

    setQuestionPreview((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
    );
  };

  // =====================================================
  // IMPOR SOAL EXCEL DI MENU EDIT
  // =====================================================

  const handleQuestionExcel = async (file: File | null) => {
    if (!file || !draft?.id) {
      if (!draft?.id) {
        toast.error("Simpan paket terlebih dahulu sebelum menambahkan soal.");
      }
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension || "")) {
      toast.error("Format file harus .xlsx atau .xls.");
      return;
    }

    if (file.size > MAX_EXCEL_SIZE) {
      toast.error("Ukuran file maksimal 10 MB.");
      return;
    }

    setParsingExcel(true);
    setErrs({});

    try {
      const parsed = await parseQuestionsExcelPreview(
        file,
        draft.category
      );

      if (!parsed || parsed.length === 0) {
        throw new Error("File Excel tidak menghasilkan soal.");
      }

      const newQuestions: EditableQuestion[] = parsed.map(
        (question) => ({
          ...question,
          image_url: null,
          image_enabled: false,
          isExisting: false,
        })
      );

      setQuestionPreview((current) => [
        ...current,
        ...newQuestions,
      ]);

      toast.success(
        `${parsed.length} soal berhasil ditambahkan ke preview. Simpan perubahan untuk memasukkannya ke database.`
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal membaca file Excel."
      );
    } finally {
      setParsingExcel(false);
    }
  };

  // =====================================================
  // STATUS PAKET
  // =====================================================

  const getExamStatus = (exam: ExamPackage): ExamStatus => {
    const item = exam as any;

    if (
      item.status === "Draft" ||
      item.is_published === false ||
      item.is_published == null
    ) {
      return "Draft";
    }

    const now = Date.now();

    const start = item.start_time
      ? new Date(item.start_time).getTime()
      : 0;

    const end = item.end_time
      ? new Date(item.end_time).getTime()
      : Infinity;

    if (end !== Infinity && now > end) return "Arsip";
    if (start && now < start) return "Akan Datang";

    return "Aktif";
  };

  // =====================================================
  // STATISTIK
  // =====================================================

  const counts = useMemo(() => {
    const result = {
      aktif: 0,
      akanDatang: 0,
      draft: 0,
      arsip: 0,
    };

    items.forEach((item) => {
      const status = getExamStatus(item);

      if (status === "Aktif") result.aktif++;
      else if (status === "Akan Datang") result.akanDatang++;
      else if (status === "Draft") result.draft++;
      else result.arsip++;
    });

    return result;
  }, [items]);

  // =====================================================
  // FILTER
  // =====================================================

  const filtered = useMemo(() => {
    return items.filter((exam) => {
      const item = exam as any;
      const keyword = q.toLocaleLowerCase("id-ID");

      const searchableText = [
        exam.title,
        item.subject,
        item.type,
        exam.category,
        exam.level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      const matchQuery = searchableText.includes(keyword);
      const matchLevel = level === "all" || exam.level === level;
      const status = getExamStatus(exam);

      const matchTab =
        activeTab === "all" || status === activeTab;

      return matchQuery && matchLevel && matchTab;
    });
  }, [items, q, level, activeTab]);

  // =====================================================
  // VALIDASI DATA PAKET
  // =====================================================

  const validatePackage = (): Record<string, string> => {
    if (!draft) return {};

    const validation: Record<string, string> = {};

    if (draft.title.trim().length < 5) {
      validation.title = "Judul minimal 5 karakter.";
    }

    if (!(draft.duration >= 5 && draft.duration <= 240)) {
      validation.duration = "Durasi 5-240 menit.";
    }

    if (
      !(draft.questionCount >= 1 && draft.questionCount <= 200)
    ) {
      validation.questionCount = "Jumlah soal 1-200.";
    }

    if (!draft.subject.trim()) {
      validation.subject = "Mata pelajaran wajib dipilih.";
    }

    if (
      !(GRADES_BY_LEVEL[draft.level] ?? []).includes(
        Number(draft.grade)
      )
    ) {
      validation.grade = "Kelas tidak sesuai dengan jenjang.";
    }

    if (!draft.examType) {
      validation.examType = "Jenis ujian wajib dipilih.";
    }

    if (!draft.noEndDate && !draft.endTime) {
      validation.endTime = "Tanggal selesai wajib diisi.";
    }

    if (
      !draft.noEndDate &&
      draft.startTime &&
      draft.endTime &&
      new Date(draft.endTime).getTime() <
        new Date(draft.startTime).getTime()
    ) {
      validation.endTime =
        "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    }

    return validation;
  };

  // =====================================================
  // VALIDASI SOAL
  // =====================================================

  const validateQuestions = () => {
    const validation: Record<string, string> = {};

    questionPreview.forEach((question, index) => {
      if (!question.question_text.trim()) {
        validation[`question_${index}`] =
          `Pertanyaan nomor ${index + 1} belum diisi.`;
      }

      if (
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        validation[`options_${index}`] =
          `Soal nomor ${index + 1} minimal memiliki 2 pilihan jawaban.`;
      } else if (
        question.options.some((option) => !option.text.trim())
      ) {
        validation[`options_${index}`] =
          `Lengkapi pilihan jawaban soal nomor ${index + 1}.`;
      }

      const optionIds = question.options.map((option) => option.id);

      if (!optionIds.includes(question.correct_answer)) {
        validation[`answer_${index}`] =
          `Kunci jawaban soal nomor ${index + 1} tidak valid.`;
      }

      if (question.image_enabled) {
        const imageUrl = normalizeImageUrl(question.image_url);

        if (!imageUrl) {
          validation[`image_${index}`] =
            `URL gambar soal nomor ${index + 1} belum diisi.`;
        } else if (!isValidImageUrl(imageUrl)) {
          validation[`image_${index}`] =
            `URL gambar soal nomor ${index + 1} tidak valid.`;
        }
      }
    });

    return validation;
  };

  // =====================================================
  // SIMPAN PAKET DAN SOAL
  // =====================================================

  const save = async (publishAfterSave = false) => {
    if (!draft || saving || loadingQuestions) return;

    const validation = {
      ...validatePackage(),
      ...validateQuestions(),
    };

    if (parsingExcel) {
      validation.excelFile =
        "Tunggu sampai proses membaca Excel selesai.";
    }

    if (publishAfterSave) {
      if (!draft.id) {
        validation.publish =
          "Simpan paket terlebih dahulu sebelum menerbitkannya.";
      }

      if (questionPreview.length !== draft.questionCount) {
        validation.publish =
          `Jumlah soal harus tepat ${draft.questionCount}. Saat ini terdapat ${questionPreview.length} soal.`;
      }

      if (questionPreview.length === 0) {
        validation.publish = "Tambahkan soal sebelum menerbitkan paket.";
      }
    }

    setErrs(validation);

    if (Object.keys(validation).length > 0) {
      toast.error(
        publishAfterSave
          ? "Paket belum memenuhi syarat publikasi."
          : "Periksa kembali data paket dan soal."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category || draft.subject,
        subject: draft.subject,
        type: draft.examType,
        level: draft.level,
        grade: Number(draft.grade),
        difficulty: draft.difficulty,
        duration: Number(draft.duration),
        duration_minutes: Number(draft.duration),
        question_count: Number(draft.questionCount),
        total_questions: Number(draft.questionCount),
        premium: draft.premium,
        start_time: draft.startTime
          ? new Date(draft.startTime).toISOString()
          : null,
        end_time: draft.noEndDate
          ? null
          : new Date(draft.endTime).toISOString(),
      };

      let packageId = draft.id;

      // Simpan metadata paket
      if (packageId) {
        const { error: updateError } = await supabase
          .from("exam_packages")
          .update(payload)
          .eq("id", packageId);

        if (updateError) throw updateError;
      } else {
        const { data: newPackage, error: insertError } =
          await supabase
            .from("exam_packages")
            .insert({
              ...payload,
              is_published: false,
              is_active: false,
              status: "Draft",
            })
            .select("id")
            .single();

        if (insertError) throw insertError;

        packageId = newPackage.id;
      }

      if (!packageId) {
        throw new Error("ID paket tidak ditemukan.");
      }

      // Update soal yang sudah ada
      const existingQuestions = questionPreview.filter(
        (question) => Boolean(question.id)
      );

      const newQuestions = questionPreview.filter(
        (question) => !question.id
      );

      for (const question of existingQuestions) {
        const imageUrl = normalizeImageUrl(question.image_url);

        const { error: updateQuestionError } = await supabase
          .from("questions")
          .update({
            category: question.category || draft.category,
            question_text: question.question_text.trim(),
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation?.trim() || null,
            image_url:
              question.image_enabled && imageUrl
                ? imageUrl
                : null,
          })
          .eq("id", question.id!)
          .eq("exam_package_id", packageId);

        if (updateQuestionError) throw updateQuestionError;
      }

      // Masukkan soal baru
      if (newQuestions.length > 0) {
        const questionsToInsert = newQuestions.map((question) => {
          const imageUrl = normalizeImageUrl(question.image_url);

          return {
            exam_package_id: packageId,
            category: question.category || draft.category,
            question_text: question.question_text.trim(),
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation?.trim() || null,
            image_url:
              question.image_enabled && imageUrl
                ? imageUrl
                : null,
          };
        });

        const { error: insertQuestionError } = await supabase
          .from("questions")
          .insert(questionsToInsert);

        if (insertQuestionError) throw insertQuestionError;
      }

      // Publikasi hanya melalui tombol Terbitkan
      if (publishAfterSave) {
        const { error: publishError } = await supabase
          .from("exam_packages")
          .update({
            is_published: true,
            is_active: true,
            status: "Published",
          })
          .eq("id", packageId);

        if (publishError) throw publishError;

        toast.success("Paket berhasil diterbitkan!");
      } else {
        toast.success(
          `Paket tersimpan sebagai Draft. ${existingQuestions.length} soal diperbarui dan ${newQuestions.length} soal baru ditambahkan.`
        );
      }

      resetForm();
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menyimpan: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan.")
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // IMPOR MASSAL PAKET
  // =====================================================

  const handleBulkFile = async (file: File | null) => {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension || "")) {
      toast.error("Gunakan file Excel .xlsx atau .xls.");
      return;
    }

    if (file.size > MAX_EXCEL_SIZE) {
      toast.error("Ukuran file maksimal 10 MB.");
      return;
    }

    setBulkParsing(true);
    setBulkRows([]);
    setBulkFile(file);

    try {
      const rows = await parsePackageExcel(file);
      setBulkRows(rows);

      const invalidCount = rows.filter(
        (row) => row.errors.length > 0
      ).length;

      if (invalidCount > 0) {
        toast.warning(
          `${rows.length} paket dibaca. ${invalidCount} baris perlu diperbaiki.`
        );
      } else {
        toast.success(`${rows.length} paket siap diimpor.`);
      }
    } catch (err: unknown) {
      setBulkFile(null);
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal membaca file Excel."
      );
    } finally {
      setBulkParsing(false);
    }
  };

  const validBulkRows = bulkRows.filter(
    (row) => row.errors.length === 0
  );

  const invalidBulkRows = bulkRows.filter(
    (row) => row.errors.length > 0
  );

  const saveBulkPackages = async () => {
    if (bulkSaving || bulkParsing) return;

    if (bulkRows.length === 0) {
      toast.error("Pilih file Excel terlebih dahulu.");
      return;
    }

    if (invalidBulkRows.length > 0) {
      toast.error(
        `Masih ada ${invalidBulkRows.length} baris yang belum valid. Perbaiki file Excel terlebih dahulu.`
      );
      return;
    }

    if (bulkRows.length > MAX_BULK_PACKAGES) {
      toast.error(`Maksimal ${MAX_BULK_PACKAGES} paket.`);
      return;
    }

    setBulkSaving(true);

    try {
      const payload = validBulkRows.map((row) => ({
        title: row.title,
        description: row.description || null,
        level: row.level,
        grade: row.grade,
        subject: row.subject,
        type: row.examType,
        category: row.category || row.subject,
        difficulty: row.difficulty,
        duration: row.duration,
        duration_minutes: row.duration,
        question_count: row.questionCount,
        total_questions: row.questionCount,
        premium: row.premium,
        start_time: row.startTime,
        end_time: row.endTime,
        is_published: false,
        is_active: false,
        status: "Draft",
      }));

      // Satu operasi insert: jika gagal, seluruh batch ditolak.
      const { error: insertError } = await supabase
        .from("exam_packages")
        .insert(payload);

      if (insertError) throw insertError;

      toast.success(
        `${payload.length} paket berhasil diimpor sebagai Draft.`
      );

      resetBulk();
      setActiveTab("Draft");
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Impor gagal: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan.")
      );
    } finally {
      setBulkSaving(false);
    }
  };

  // =====================================================
  // HAPUS PAKET
  // =====================================================

  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { error: deleteError } = await supabase
        .from("exam_packages")
        .delete()
        .eq("id", removing.id);

      if (deleteError) throw deleteError;

      toast.success("Paket ujian berhasil dihapus.");
      setRemoving(null);

      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menghapus: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan.")
      );
    }
  };

  // =====================================================
  // BUKA EDIT
  // =====================================================

  const openEdit = async (exam: ExamPackage) => {
    const item = exam as any;
    const examLevel = item.level || "SD";

    setErrs({});
    setQuestionPreview([]);
    setLoadingQuestions(true);

    setDraft({
      id: exam.id,
      title: exam.title || "",
      description: exam.description || "",
      category: exam.category || "Matematika",
      subject: item.subject || getDefaultSubject(examLevel),
      examType: item.type || "Latihan",
      level: examLevel as Level,
      grade: item.grade
        ? Number(item.grade)
        : getLegacyGrade(exam.category, examLevel),
      difficulty: exam.difficulty || "Sedang",
      duration:
        Number(item.duration || item.duration_minutes) || 30,
      questionCount:
        Number(item.question_count || item.total_questions) || 10,
      premium: Boolean(exam.premium),
      published:
        item.is_published === true ||
        item.status === "Published",
      startTime: item.start_time
        ? toLocalDateTime(new Date(item.start_time))
        : nowIso,
      endTime: item.end_time
        ? toLocalDateTime(new Date(item.end_time))
        : "",
      noEndDate: !item.end_time,
    });

    try {
      const { data, error: questionError } = await supabase
        .from("questions")
        .select(
          "id, category, question_text, options, correct_answer, explanation, image_url"
        )
        .eq("exam_package_id", exam.id)
        .order("created_at", { ascending: true });

      if (questionError) throw questionError;

      const existingQuestions: EditableQuestion[] = (
        data ?? []
      ).map((question: any) => {
        const imageUrl = normalizeImageUrl(question.image_url);

        return {
          id: question.id,
          isExisting: true,
          category: question.category || exam.category || "Umum",
          question_text: question.question_text || "",
          options: normalizeOptions(question.options),
          correct_answer: question.correct_answer || "A",
          explanation: question.explanation || "",
          image_url: imageUrl || null,
          image_enabled: Boolean(imageUrl),
        };
      });

      setQuestionPreview(existingQuestions);

      toast.success(
        existingQuestions.length > 0
          ? `${existingQuestions.length} soal berhasil dimuat.`
          : "Paket ini belum memiliki soal."
      );
    } catch (err: unknown) {
      toast.error(
        "Gagal memuat soal: " +
          (err instanceof Error
            ? err.message
            : "Terjadi kesalahan.")
      );

      setDraft(null);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openCreate = () => {
    setErrs({});
    setQuestionPreview([]);
    setDraft({ ...emptyDraft });
  };

  // =====================================================
  // ICON KATEGORI
  // =====================================================

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Tryout":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
            <Zap className="h-5 w-5" />
          </div>
        );

      case "PTS":
      case "PTS/UTS":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-500">
            <FileText className="h-5 w-5" />
          </div>
        );

      case "PAS":
      case "PAS/UAS":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
            <Award className="h-5 w-5" />
          </div>
        );

      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <BookOpen className="h-5 w-5" />
          </div>
        );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="w-full space-y-6 pb-12">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Manajemen Paket Ujian
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola paket ujian, impor massal, soal, dan publikasi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadQuestionTemplate}
            className="h-10 gap-2 rounded-xl text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            Template Soal
          </Button>

          <Button
            variant="outline"
            onClick={downloadPackageTemplate}
            className="h-10 gap-2 rounded-xl text-xs font-bold"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Template Paket
          </Button>

          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="h-10 gap-2 rounded-xl border-emerald-500/40 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10"
          >
            <Upload className="h-4 w-4" />
            Impor Massal
          </Button>

          <Button
            onClick={openCreate}
            className="h-10 gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Buat Paket
          </Button>
        </div>
      </div>

      {/* STATISTIK */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-bold text-emerald-600">
                Paket Aktif
              </p>
              <h3 className="mt-1 text-3xl font-black">
                {counts.aktif}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Sedang berjalan
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-sky-500/20 bg-sky-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-bold text-sky-600">
                Akan Datang
              </p>
              <h3 className="mt-1 text-3xl font-black">
                {counts.akanDatang}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Menunggu jadwal
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-sky-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-bold text-amber-600">
                Draft
              </p>
              <h3 className="mt-1 text-3xl font-black">
                {counts.draft}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Belum diterbitkan
              </p>
            </div>
            <FileText className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-500/20 bg-slate-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-bold text-slate-500">
                Arsip
              </p>
              <h3 className="mt-1 text-3xl font-black">
                {counts.arsip}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Paket yang berakhir
              </p>
            </div>
            <Archive className="h-8 w-8 text-slate-500" />
          </CardContent>
        </Card>
      </div>

      {/* TABS */}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-4 rounded-none border-b border-border bg-transparent p-0">
          {[
            { value: "Aktif", label: "Aktif", count: counts.aktif },
            {
              value: "Akan Datang",
              label: "Akan Datang",
              count: counts.akanDatang,
            },
            { value: "Draft", label: "Draft", count: counts.draft },
            { value: "Arsip", label: "Arsip", count: counts.arsip },
            { value: "all", label: "Semua", count: items.length },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 text-xs font-extrabold data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600"
            >
              {tab.label}
              <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* SEARCH DAN FILTER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari paket, mapel, atau jenis ujian..."
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
            <SelectValue placeholder="Semua Jenjang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenjang</SelectItem>
            {LEVELS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABEL */}

      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={fetchData} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Paket ujian tidak ditemukan" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Nama Paket</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Kelas & Mapel</th>
                  <th className="p-4">Jenis</th>
                  <th className="p-4">Kesulitan</th>
                  <th className="p-4">Periode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filtered.map((exam) => {
                  const item = exam as any;
                  const status = getExamStatus(exam);

                  const startDate = item.start_time
                    ? new Date(item.start_time).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "-";

                  const endDate = item.end_time
                    ? new Date(item.end_time).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "Selamanya";

                  return (
                    <tr
                      key={exam.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(item.type || exam.category)}
                          <div className="min-w-[170px]">
                            <p className="text-sm font-extrabold">
                              {exam.title}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.question_count ||
                                item.total_questions ||
                                0}{" "}
                              soal
                              {exam.premium && (
                                <Badge
                                  variant="warning"
                                  className="ml-1 px-1.5 py-0 text-[9px]"
                                >
                                  Premium
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge variant="outline">
                          {exam.level || "-"}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <p className="font-bold">
                          Kelas {item.grade ?? "-"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.subject || "Belum ditentukan"}
                        </p>
                      </td>

                      <td className="p-4">
                        <Badge variant="muted">
                          {item.type || "Ujian"}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <Badge variant="muted">
                          {exam.difficulty || "-"}
                        </Badge>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-muted-foreground">
                        <div>{startDate}</div>
                        <div className="mt-1">s.d. {endDate}</div>
                      </td>

                      <td className="p-4">
                        {status === "Aktif" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : status === "Akan Datang" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-sky-500">
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                            Akan Datang
                          </span>
                        ) : status === "Draft" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-500">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Arsip
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Aksi untuk ${exam.title}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onSelect={() => void openEdit(exam)}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                              Edit & Soal
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              destructive
                              onSelect={() => setRemoving(exam)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* =================================================
          DIALOG IMPOR MASSAL
      ================================================= */}

      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && !bulkSaving && !bulkParsing) resetBulk();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Impor Massal Paket Ujian
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan maksimal 500 paket sekaligus. Semua paket
              otomatis disimpan sebagai Draft.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-extrabold">
                    Alur impor paket
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Excel hanya berisi identitas paket. Soal tidak
                    dimasukkan pada tahap ini. Setelah paket tersimpan,
                    buka menu Edit untuk menambahkan soal secara manual
                    atau melalui Excel.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold">
                  1. Siapkan template Excel
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Gunakan template resmi agar kolom terbaca dengan benar.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadPackageTemplate}
                className="rounded-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Unduh Template Paket
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">
                2. Upload file Excel
              </Label>

              <Input
                type="file"
                accept=".xlsx,.xls"
                disabled={bulkParsing || bulkSaving}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void handleBulkFile(file);
                  e.currentTarget.value = "";
                }}
                className="h-11 rounded-xl"
              />

              <p className="text-[10px] text-muted-foreground">
                Format .xlsx atau .xls, maksimal 10 MB dan 500 baris paket.
              </p>

              {bulkFile && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {bulkFile.name}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={bulkSaving || bulkParsing}
                    onClick={() => {
                      setBulkFile(null);
                      setBulkRows([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {bulkParsing && (
              <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs font-semibold text-sky-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Membaca dan memvalidasi file Excel...
              </div>
            )}

            {bulkRows.length > 0 && !bulkParsing && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Total paket
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {bulkRows.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[11px] text-emerald-600">
                      Siap diimpor
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-600">
                      {validBulkRows.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-[11px] text-red-600">
                      Perlu diperbaiki
                    </p>
                    <p className="mt-1 text-2xl font-black text-red-600">
                      {invalidBulkRows.length}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 p-3">
                    <div>
                      <p className="text-xs font-extrabold">
                        Preview paket
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Periksa data sebelum menyimpan.
                      </p>
                    </div>
                    <Badge variant="outline">
                      Maks. {MAX_BULK_PACKAGES}
                    </Badge>
                  </div>

                  <div className="max-h-[320px] overflow-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-3">Baris</th>
                          <th className="p-3">Judul</th>
                          <th className="p-3">Jenjang</th>
                          <th className="p-3">Mapel</th>
                          <th className="p-3">Soal</th>
                          <th className="p-3">Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkRows.map((row, index) => (
                          <tr key={`${row.title}-${index}`}>
                            <td className="p-3">{index + 1}</td>
                            <td className="min-w-[180px] p-3 font-semibold">
                              {row.title || "-"}
                            </td>
                            <td className="p-3">
                              {row.level} / {row.grade}
                            </td>
                            <td className="p-3">{row.subject || "-"}</td>
                            <td className="p-3">{row.questionCount || "-"}</td>
                            <td className="min-w-[180px] p-3">
                              {row.errors.length === 0 ? (
                                <Badge className="bg-emerald-600 text-white">
                                  Valid
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  <Badge variant="muted">
                                    {row.errors.length} kesalahan
                                  </Badge>
                                  {row.errors.map((message) => (
                                    <p
                                      key={message}
                                      className="text-[10px] text-red-500"
                                    >
                                      {message}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="font-bold text-amber-600">
                    Semua paket akan berstatus Draft
                  </p>
                  Paket belum bisa dilihat atau dikerjakan siswa. Kamu
                  perlu membuka menu Edit, menambahkan soal, menyimpan,
                  lalu menerbitkan paket setelah lengkap.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetBulk}
              disabled={bulkSaving || bulkParsing}
              className="rounded-xl"
            >
              Batal
            </Button>

            <Button
              type="button"
              onClick={saveBulkPackages}
              disabled={
                bulkSaving ||
                bulkParsing ||
                bulkRows.length === 0 ||
                invalidBulkRows.length > 0
              }
              className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {bulkSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Impor {validBulkRows.length} Paket sebagai Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================
          DIALOG TAMBAH / EDIT PAKET
      ================================================= */}

      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving && !parsingExcel && !loadingQuestions) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold">
                  {draft.id ? "Edit Paket & Kelola Soal" : "Buat Paket Ujian"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {draft.id
                    ? "Perbarui informasi paket dan kelola soal sebelum diterbitkan."
                    : "Paket baru akan disimpan sebagai Draft. Soal dapat ditambahkan setelah paket dibuat."}
                </DialogDescription>
              </DialogHeader>

              {loadingQuestions && (
                <div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs font-semibold text-sky-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat soal dari database...
                </div>
              )}

              <div className="space-y-5 py-2 text-xs">
                {/* INFORMASI DASAR */}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="x-title" className="font-bold">
                      Judul Ujian *
                    </Label>
                    <Input
                      id="x-title"
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                      placeholder="Contoh: Simulasi TKA Matematika Kelas 6"
                      className="h-10 rounded-xl"
                    />
                    <FieldError message={errs.title} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="x-desc" className="font-bold">
                      Deskripsi
                    </Label>
                    <Textarea
                      id="x-desc"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          description: e.target.value,
                        })
                      }
                      placeholder="Deskripsi singkat paket ujian..."
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* IDENTITAS AKADEMIK */}

                <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div>
                    <h3 className="font-extrabold">
                      Identitas Akademik
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tentukan jenjang, kelas, mapel, dan jenis ujian.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="font-bold">Jenjang *</Label>
                      <Select
                        value={draft.level}
                        onValueChange={(value) => {
                          const nextLevel = value as Level;

                          setDraft({
                            ...draft,
                            level: nextLevel,
                            grade: getDefaultGrade(nextLevel),
                            subject: getDefaultSubject(nextLevel),
                          });
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold">Kelas *</Label>
                      <Select
                        value={String(draft.grade)}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            grade: Number(value),
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(GRADES_BY_LEVEL[draft.level] ?? []).map(
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
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold">
                        Mata Pelajaran *
                      </Label>
                      <Select
                        value={draft.subject}
                        onValueChange={(value) =>
                          setDraft({ ...draft, subject: value })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(SUBJECTS_BY_LEVEL[draft.level] ?? []).map(
                            (subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError message={errs.subject} />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold">Jenis Ujian *</Label>
                      <Select
                        value={draft.examType}
                        onValueChange={(value) =>
                          setDraft({ ...draft, examType: value })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errs.examType} />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="font-bold">
                        Kategori Tambahan
                      </Label>
                      <Select
                        value={draft.category}
                        onValueChange={(value) =>
                          setDraft({ ...draft, category: value })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.name}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                          {!categories.some(
                            (category) => category.name === draft.category
                          ) &&
                            draft.category && (
                              <SelectItem value={draft.category}>
                                {draft.category}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="font-bold">
                        Tingkat Kesulitan
                      </Label>
                      <Select
                        value={draft.difficulty}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            difficulty: value as Difficulty,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map((difficulty) => (
                            <SelectItem
                              key={difficulty}
                              value={difficulty}
                            >
                              {difficulty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* JADWAL */}

                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label
                        htmlFor="x-start"
                        className="font-bold text-emerald-600"
                      >
                        Tanggal & Jam Mulai
                      </Label>
                      <Input
                        id="x-start"
                        type="datetime-local"
                        value={draft.startTime}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            startTime: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor="x-end"
                        className="font-bold text-amber-600"
                      >
                        Tanggal & Jam Selesai
                      </Label>
                      <Input
                        id="x-end"
                        type="datetime-local"
                        value={draft.endTime}
                        disabled={draft.noEndDate}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            endTime: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl bg-background"
                      />
                      {!draft.noEndDate && (
                        <FieldError message={errs.endTime} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <Switch
                      id="x-no-end"
                      checked={draft.noEndDate}
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          noEndDate: value,
                          endTime: value
                            ? ""
                            : draft.endTime || defaultEndIso,
                        })
                      }
                    />
                    <div>
                      <Label
                        htmlFor="x-no-end"
                        className="cursor-pointer font-extrabold text-emerald-600"
                      >
                        Terbit Selamanya
                      </Label>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Paket tidak memiliki batas tanggal akhir.
                      </p>
                    </div>
                  </div>
                </div>

                {/* DURASI DAN JUMLAH SOAL */}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="x-dur" className="font-bold">
                      Durasi (Menit) *
                    </Label>
                    <Input
                      id="x-dur"
                      type="number"
                      min={5}
                      max={240}
                      value={draft.duration}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          duration: Number(e.target.value),
                        })
                      }
                      className="h-10 rounded-xl"
                    />
                    <FieldError message={errs.duration} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="x-cnt" className="font-bold">
                      Jumlah Soal yang Direncanakan *
                    </Label>
                    <Input
                      id="x-cnt"
                      type="number"
                      min={1}
                      max={200}
                      value={draft.questionCount}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          questionCount: Number(e.target.value),
                        })
                      }
                      className="h-10 rounded-xl"
                    />
                    <FieldError message={errs.questionCount} />
                  </div>
                </div>

                {/* PENGATURAN PREMIUM */}

                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch
                    id="x-prem"
                    checked={draft.premium}
                    onCheckedChange={(value) =>
                      setDraft({ ...draft, premium: value })
                    }
                  />
                  <div>
                    <Label
                      htmlFor="x-prem"
                      className="cursor-pointer font-bold"
                    >
                      Paket Premium
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Hanya siswa dengan akses Premium yang dapat
                      mengerjakan paket ini sesuai aturan akses GradeUp.
                    </p>
                  </div>
                </div>

                {/* STATUS DRAFT */}

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600">
                    <FileText className="h-4 w-4" />
                    Status Draft
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {draft.published
                      ? "Paket ini sudah diterbitkan. Menyimpan perubahan tidak akan mengubah status publikasinya."
                      : "Paket belum terlihat oleh siswa. Lengkapi soal terlebih dahulu, kemudian gunakan tombol Terbitkan."}
                  </p>
                </div>

                {/* EDITOR SOAL: HANYA UNTUK PAKET YANG SUDAH TERSIMPAN */}

                {draft.id && (
                  <div className="space-y-4 border-t pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 font-extrabold">
                          <Eye className="h-4 w-4 text-emerald-600" />
                          Kelola Soal
                        </h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Tambahkan soal satu per satu atau impor dari Excel.
                        </p>
                      </div>

                      <Badge className="bg-emerald-600 text-white">
                        {questionPreview.length}/{draft.questionCount} Soal
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving || parsingExcel || loadingQuestions}
                        onClick={() =>
                          setQuestionPreview((current) => [
                            ...current,
                            createBlankQuestion(draft.category),
                          ])
                        }
                        className="rounded-lg"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Soal Manual
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving || parsingExcel || loadingQuestions}
                        onClick={downloadQuestionTemplate}
                        className="rounded-lg"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Template Soal
                      </Button>
                    </div>

                    <div className="space-y-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
                      <Label className="flex items-center gap-2 font-bold text-emerald-600">
                        <FileSpreadsheet className="h-4 w-4" />
                        Impor Soal dari Excel
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Soal Excel akan ditambahkan ke daftar. Soal yang
                        sudah tersimpan tidak akan dihapus.
                      </p>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        disabled={
                          parsingExcel || saving || loadingQuestions
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          void handleQuestionExcel(file);
                          e.currentTarget.value = "";
                        }}
                        className="h-10 rounded-xl bg-background"
                      />

                      {parsingExcel && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Membaca Excel soal...
                        </div>
                      )}
                    </div>

                    {questionPreview.length === 0 &&
                      !loadingQuestions && (
                        <div className="rounded-xl border border-dashed p-6 text-center">
                          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-xs font-bold">
                            Belum ada soal
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Tambahkan soal manual atau impor melalui Excel.
                          </p>
                        </div>
                      )}

                    <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                      {questionPreview.map((question, index) => {
                        const imageUrl = normalizeImageUrl(
                          question.image_url
                        );

                        return (
                          <Card
                            key={question.id || `new-${index}`}
                            className="overflow-hidden rounded-xl border"
                          >
                            <CardContent className="space-y-4 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    Soal {index + 1}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={
                                      question.isExisting
                                        ? "border-sky-500/30 text-sky-600"
                                        : "border-emerald-500/30 text-emerald-600"
                                    }
                                  >
                                    {question.isExisting
                                      ? "Tersimpan"
                                      : "Belum disimpan"}
                                  </Badge>
                                </div>

                                {!question.isExisting && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={saving}
                                    onClick={() => removeQuestion(index)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Hapus
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label className="font-bold">
                                  Pertanyaan
                                </Label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) =>
                                    updateQuestion(index, {
                                      question_text: e.target.value,
                                    })
                                  }
                                  className="min-h-20 rounded-lg bg-background text-sm"
                                />
                                <FieldError
                                  message={errs[`question_${index}`]}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="font-bold">
                                  Pilihan Jawaban
                                </Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {question.options.map((option) => (
                                    <div
                                      key={option.id}
                                      className={`rounded-lg border p-2 ${
                                        option.id === question.correct_answer
                                          ? "border-emerald-500/40 bg-emerald-500/5"
                                          : "border-border bg-muted/20"
                                      }`}
                                    >
                                      <Label className="mb-1 block text-[10px] font-bold">
                                        Pilihan {option.id}
                                      </Label>
                                      <Textarea
                                        value={option.text}
                                        onChange={(e) =>
                                          updateQuestionOption(
                                            index,
                                            option.id,
                                            e.target.value
                                          )
                                        }
                                        className="min-h-16 bg-background text-xs"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <FieldError
                                  message={errs[`options_${index}`]}
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="font-bold">
                                    Kunci Jawaban
                                  </Label>
                                  <Select
                                    value={question.correct_answer}
                                    onValueChange={(value) =>
                                      updateQuestion(index, {
                                        correct_answer: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-10 rounded-lg bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {question.options.map((option) => (
                                        <SelectItem
                                          key={option.id}
                                          value={option.id}
                                        >
                                          {option.id}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FieldError
                                    message={errs[`answer_${index}`]}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="font-bold">
                                    Status Soal
                                  </Label>
                                  <div className="flex h-10 items-center">
                                    <Badge variant="outline">
                                      {question.isExisting
                                        ? "Sudah tersimpan"
                                        : "Akan disimpan"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="font-bold">
                                  Pembahasan
                                </Label>
                                <Textarea
                                  value={question.explanation || ""}
                                  onChange={(e) =>
                                    updateQuestion(index, {
                                      explanation: e.target.value || null,
                                    })
                                  }
                                  placeholder="Tuliskan pembahasan soal..."
                                  className="min-h-16 rounded-lg bg-background text-xs"
                                />
                              </div>

                              <div className="border-t pt-3">
                                <div className="flex items-center gap-3">
                                  <Switch
                                    id={`question-image-${index}`}
                                    checked={question.image_enabled}
                                    onCheckedChange={(checked) =>
                                      updateQuestion(index, {
                                        image_enabled: checked,
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`question-image-${index}`}
                                    className="flex cursor-pointer items-center gap-2 font-bold"
                                  >
                                    <ImageIcon className="h-4 w-4 text-emerald-600" />
                                    Tambahkan gambar
                                  </Label>
                                </div>

                                {question.image_enabled && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="font-semibold">
                                      URL Gambar
                                    </Label>
                                    <Input
                                      type="url"
                                      value={imageUrl}
                                      onChange={(e) =>
                                        updateQuestion(index, {
                                          image_url: e.target.value,
                                        })
                                      }
                                      placeholder="https://contoh.com/gambar.jpg"
                                      className="h-10 rounded-lg bg-background"
                                    />

                                    {errs[`image_${index}`] && (
                                      <p className="text-xs text-destructive">
                                        {errs[`image_${index}`]}
                                      </p>
                                    )}

                                    {imageUrl && isValidImageUrl(imageUrl) && (
                                      <div className="rounded-xl border bg-muted/20 p-2">
                                        <p className="mb-2 text-[10px] font-bold text-muted-foreground">
                                          PREVIEW GAMBAR
                                        </p>
                                        <img
                                          src={imageUrl}
                                          alt={`Gambar soal ${index + 1}`}
                                          loading="lazy"
                                          className="max-h-64 max-w-full rounded-lg object-contain"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                      <div className="flex items-center gap-2 font-bold text-sky-600">
                        <ImageIcon className="h-4 w-4" />
                        Ringkasan Soal
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-lg font-black">
                            {questionPreview.length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Total soal
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-black">
                            {
                              questionPreview.filter((item) => item.isExisting)
                                .length
                            }
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Tersimpan
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-black">
                            {
                              questionPreview.filter((item) => !item.isExisting)
                                .length
                            }
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Soal baru
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-black">
                            {
                              questionPreview.filter(
                                (item) =>
                                  item.image_enabled &&
                                  normalizeImageUrl(item.image_url)
                              ).length
                            }
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Dengan gambar
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p className="font-bold text-amber-600">
                        Syarat publikasi
                      </p>
                      Jumlah soal harus tepat {draft.questionCount}. Semua
                      pertanyaan, pilihan jawaban, dan kunci jawaban harus
                      valid. Simpan perubahan sebelum menerbitkan paket.
                    </div>
                  </div>
                )}

                {!draft.id && (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    <p className="font-bold text-sky-600">
                      Tahap pertama: simpan paket
                    </p>
                    Setelah paket dibuat, buka menu Edit untuk menambahkan
                    soal. Paket baru tidak akan langsung tampil kepada siswa.
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 pt-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving || parsingExcel || loadingQuestions}
                  className="rounded-xl"
                >
                  Tutup
                </Button>

                <Button
                  type="button"
                  onClick={() => void save(false)}
                  disabled={saving || parsingExcel || loadingQuestions}
                  className="rounded-xl bg-slate-700 font-bold text-white hover:bg-slate-800"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Draft"
                  )}
                </Button>

                {draft.id && !draft.published && (
                  <Button
                    type="button"
                    onClick={() => void save(true)}
                    disabled={saving || parsingExcel || loadingQuestions}
                    className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Terbitkan Paket
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG HAPUS */}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Hapus paket ujian?"
        description={`Paket "${removing?.title ?? ""}" akan dihapus permanen dari Supabase.`}
        destructive
        confirmLabel="Hapus"
        onConfirm={handleDelete}
      />
    </div>
  );
}
