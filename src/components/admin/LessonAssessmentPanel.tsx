
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
  Download,
  Upload,
  FileSpreadsheet,
  FileCheck2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

interface ImportQuestion {
  rowNumber: number;
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

const EXCEL_HEADERS = [
  "Pertanyaan",
  "Opsi A",
  "Opsi B",
  "Opsi C",
  "Opsi D",
  "Kunci",
  "Pembahasan",
];

const MAX_IMPORT_QUESTIONS = 500;

const emptyQuestion = (): QuestionDraft => ({
  question_text: "",
  options: DEFAULT_OPTIONS.map((option) => ({ ...option })),
  correct_answer: "A",
  explanation: "",
});

const normalizeText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const cellText = (value: unknown) =>
  String(value ?? "").trim();

export default function LessonAssessmentPanel({
  lessonId,
  sectionId,
  sectionTitle,
}: LessonAssessmentPanelProps) {
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>("checkpoint");

  // Seluruh evaluasi pada section aktif.
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Evaluasi yang sedang dipilih untuk diedit.
  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [selectedAssessmentId, setSelectedAssessmentId] =
    useState<string | null>(null);

  const [assessmentTitle, setAssessmentTitle] = useState("");

  const [questions, setQuestions] = useState<
    AssessmentQuestion[]
  >([]);

  const [draft, setDraft] = useState<QuestionDraft | null>(null);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [importPreview, setImportPreview] = useState<
    ImportQuestion[]
  >([]);

  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const isCheckpoint = assessmentType === "checkpoint";

  // =====================================================
  // CLEAR IMPORT PREVIEW
  // =====================================================

  const clearImportPreview = useCallback(() => {
    setImportPreview([]);
    setImportErrors([]);
    setImportFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // =====================================================
  // LOAD ALL ASSESSMENTS
  // =====================================================

  const loadAssessment = useCallback(async () => {
    const requestId = ++requestRef.current;

    if (!lessonId || (isCheckpoint && !sectionId)) {
      setAssessments([]);
      setAssessment(null);
      setSelectedAssessmentId(null);
      setQuestions([]);
      setAssessmentTitle("");
      setDraft(null);
      setLoading(false);
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

      // PENTING:
      // Jangan menggunakan maybeSingle().
      // Satu section sekarang boleh memiliki banyak checkpoint.
      const { data: assessmentData, error: assessmentError } =
        await query.order("sort_order", { ascending: true });

      if (assessmentError) throw assessmentError;

      if (requestId !== requestRef.current) return;

      const assessmentList = (assessmentData ?? []) as Assessment[];

      setAssessments(assessmentList);

      if (assessmentList.length === 0) {
        setAssessment(null);
        setSelectedAssessmentId(null);
        setAssessmentTitle("");
        setQuestions([]);
        return;
      }

      // Pertahankan pilihan admin jika masih tersedia.
      const selected =
        assessmentList.find(
          (item) => item.id === selectedAssessmentId
        ) ?? assessmentList[0];

      setAssessment(selected);
      setSelectedAssessmentId(selected.id);
      setAssessmentTitle(selected.title);

      const { data: questionData, error: questionError } =
        await supabase
          .from("lesson_assessment_questions")
          .select(
            "id, assessment_id, question_text, options, correct_answer, explanation, sort_order"
          )
          .eq("assessment_id", selected.id)
          .order("sort_order", { ascending: true });

      if (questionError) throw questionError;

      if (requestId !== requestRef.current) return;

      setQuestions((questionData ?? []) as AssessmentQuestion[]);
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
  }, [
    lessonId,
    sectionId,
    assessmentType,
    isCheckpoint,
    selectedAssessmentId,
  ]);

  useEffect(() => {
    void loadAssessment();

    return () => {
      requestRef.current += 1;
    };
  }, [loadAssessment]);

  useEffect(() => {
    clearImportPreview();
  }, [
    assessmentType,
    lessonId,
    sectionId,
    selectedAssessmentId,
    clearImportPreview,
  ]);

  // =====================================================
  // SELECT CHECKPOINT
  // =====================================================

  const selectAssessment = (item: Assessment) => {
    if (item.id === selectedAssessmentId) return;

    if (draft) {
      const confirmed = window.confirm(
        "Perubahan soal belum disimpan. Beralih ke checkpoint lain?"
      );

      if (!confirmed) return;
    }

    setSelectedAssessmentId(item.id);
    setAssessment(item);
    setAssessmentTitle(item.title);
    setQuestions([]);
    setDraft(null);
    clearImportPreview();
  };

  // =====================================================
  // DOWNLOAD EXCEL TEMPLATE
  // =====================================================

  const downloadExcelTemplate = () => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([
        EXCEL_HEADERS,
        [
          "Apa ibu kota Indonesia?",
          "Bandung",
          "Jakarta",
          "Surabaya",
          "Medan",
          "B",
          "Jakarta merupakan ibu kota Indonesia.",
        ],
        [
          "Hasil dari 5 x 4 adalah?",
          "10",
          "15",
          "20",
          "25",
          "C",
          "5 dikalikan 4 menghasilkan 20.",
        ],
      ]);

      worksheet["!cols"] = [
        { wch: 45 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 12 },
        { wch: 45 },
      ];

      worksheet["!autofilter"] = {
        ref: "A1:G3",
      };

      const instructions = [
        ["PETUNJUK PENGISIAN TEMPLATE GRADEUP"],
        ["1. Satu baris digunakan untuk satu soal."],
        ["2. Kolom Pertanyaan wajib diisi."],
        ["3. Opsi A, B, C, dan D wajib diisi."],
        ["4. Kolom Kunci diisi huruf A, B, C, atau D."],
        ["5. Kolom Pembahasan berisi penjelasan jawaban."],
        ["6. Baris contoh dapat dihapus atau diganti."],
        ["7. Jangan mengubah nama kolom pada baris pertama."],
        ["8. Maksimal 500 soal dalam satu kali import."],
      ];

      const instructionSheet =
        XLSX.utils.aoa_to_sheet(instructions);

      instructionSheet["!cols"] = [{ wch: 75 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Daftar Soal"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        instructionSheet,
        "Petunjuk"
      );

      XLSX.writeFile(
        workbook,
        "Template_Import_Soal_GradeUp.xlsx"
      );

      toast.success("Template Excel berhasil diunduh.");
    } catch (error) {
      console.error("Download template error:", error);
      toast.error("Gagal membuat template Excel.");
    }
  };

  // =====================================================
  // IMPORT AND VALIDATE EXCEL
  // =====================================================

  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    clearImportPreview();
    setImportFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setImportErrors([
        "Format file tidak sesuai. Gunakan file Excel .xlsx.",
      ]);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImportErrors([
        "Ukuran file terlalu besar. Maksimal ukuran file adalah 10 MB.",
      ]);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("File Excel tidak memiliki lembar kerja.");
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      }) as unknown[][];

      if (rows.length < 2) {
        throw new Error(
          "Tidak ditemukan data soal. Isi minimal satu baris soal."
        );
      }

      const headers = (rows[0] ?? []).map((header) =>
        cellText(header).toLowerCase()
      );

      const headerIndexes = EXCEL_HEADERS.map((header) =>
        headers.indexOf(header.toLowerCase())
      );

      const missingHeaders = EXCEL_HEADERS.filter(
        (_, index) => headerIndexes[index] === -1
      );

      if (missingHeaders.length > 0) {
        throw new Error(
          `Kolom berikut belum ditemukan: ${missingHeaders.join(", ")}. Gunakan template resmi GradeUp.`
        );
      }

      const dataRows = rows.slice(1);

      if (dataRows.length > MAX_IMPORT_QUESTIONS) {
        throw new Error(
          `Maksimal ${MAX_IMPORT_QUESTIONS} soal dalam satu kali import. File ini memiliki ${dataRows.length} baris data.`
        );
      }

      const errors: string[] = [];
      const validQuestions: ImportQuestion[] = [];
      const seenQuestions = new Set<string>();

      const existingQuestions = new Set(
        questions.map((question) =>
          normalizeText(question.question_text)
        )
      );

      dataRows.forEach((row, index) => {
        const rowNumber = index + 2;

        const getValue = (headerIndex: number) =>
          cellText(row[headerIndexes[headerIndex]]);

        const values = EXCEL_HEADERS.map((_, headerIndex) =>
          getValue(headerIndex)
        );

        if (values.every((value) => !value)) return;

        const [
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswerRaw,
          explanation,
        ] = values;

        const rowErrors: string[] = [];

        if (!questionText) {
          rowErrors.push("Pertanyaan kosong");
        }

        const options = [
          { id: "A", text: optionA },
          { id: "B", text: optionB },
          { id: "C", text: optionC },
          { id: "D", text: optionD },
        ];

        if (options.some((option) => !option.text)) {
          rowErrors.push("Pilihan A–D harus lengkap");
        }

        const correctAnswer = correctAnswerRaw.toUpperCase();

        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
          rowErrors.push("Kunci harus A, B, C, atau D");
        }

        const normalizedQuestion = normalizeText(questionText);

        if (
          normalizedQuestion &&
          seenQuestions.has(normalizedQuestion)
        ) {
          rowErrors.push("Pertanyaan duplikat dalam file Excel");
        }

        if (
          normalizedQuestion &&
          existingQuestions.has(normalizedQuestion)
        ) {
          rowErrors.push(
            "Pertanyaan sudah ada dalam evaluasi ini"
          );
        }

        if (normalizedQuestion) {
          seenQuestions.add(normalizedQuestion);
        }

        if (rowErrors.length > 0) {
          errors.push(
            `Baris ${rowNumber}: ${rowErrors.join("; ")}.`
          );
          return;
        }

        validQuestions.push({
          rowNumber,
          question_text: questionText,
          options,
          correct_answer: correctAnswer,
          explanation,
        });
      });

      if (validQuestions.length === 0 && errors.length === 0) {
        errors.push("Tidak ditemukan soal yang dapat diimport.");
      }

      setImportPreview(validQuestions);
      setImportErrors(errors);

      if (errors.length > 0) {
        toast.error(
          `Ditemukan ${errors.length} masalah pada file Excel.`
        );
      } else {
        toast.success(
          `${validQuestions.length} soal siap diperiksa.`
        );
      }
    } catch (error: unknown) {
      console.error("Excel upload error:", error);

      setImportPreview([]);

      setImportErrors([
        error instanceof Error
          ? error.message
          : "Gagal membaca file Excel.",
      ]);

      toast.error("Gagal membaca file Excel.");
    }
  };

  // =====================================================
  // IMPORT QUESTIONS INTO SUPABASE
  // =====================================================

  const importExcelQuestions = async () => {
    if (!assessment) return;

    if (importPreview.length === 0) {
      toast.error("Tidak ada soal yang siap diimport.");
      return;
    }

    if (importErrors.length > 0) {
      toast.error("Perbaiki semua kesalahan sebelum import.");
      return;
    }

    if (draft) {
      toast.error(
        "Simpan atau tutup formulir soal sebelum melakukan import."
      );
      return;
    }

    setImporting(true);

    try {
      const currentMaxOrder =
        questions.length > 0
          ? Math.max(
              ...questions.map((question) => question.sort_order)
            )
          : -1;

      const payload = importPreview.map((question, index) => ({
        assessment_id: assessment.id,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        sort_order: currentMaxOrder + index + 1,
      }));

      const { error } = await supabase
        .from("lesson_assessment_questions")
        .insert(payload);

      if (error) throw error;

      const importedCount = payload.length;

      clearImportPreview();

      toast.success(
        `${importedCount} soal berhasil diimport.`
      );

      await loadAssessment();
    } catch (error: unknown) {
      console.error("Bulk import error:", error);

      toast.error(
        error instanceof Error
          ? `Import gagal: ${error.message}`
          : "Import gagal. Periksa kembali file dan koneksi database."
      );
    } finally {
      setImporting(false);
    }
  };

  // =====================================================
  // CREATE ASSESSMENT
  // =====================================================

  const createAssessment = async () => {
    if (!lessonId) return;

    if (isCheckpoint && !sectionId) {
      toast.error("Pilih bagian materi terlebih dahulu.");
      return;
    }

    if (!isCheckpoint && assessments.length > 0) {
      toast.error("Evaluasi akhir untuk sesi ini sudah tersedia.");
      return;
    }

    setCreating(true);

    try {
      // Urutan berikutnya berdasarkan evaluasi yang sudah ada
      // pada section aktif, bukan selalu 0.
      const currentMaxOrder =
        assessments.length > 0
          ? Math.max(
              ...assessments.map((item) => item.sort_order)
            )
          : -1;

      const nextOrder = currentMaxOrder + 1;

      const payload = {
        lesson_id: lessonId,
        section_id: isCheckpoint ? sectionId : null,
        assessment_type: assessmentType,
        title: isCheckpoint
          ? `Checkpoint ${nextOrder + 1} - ${sectionTitle || "Bagian Materi"}`
          : "Evaluasi Akhir Sesi",
        sort_order: nextOrder,
      };

      const { data, error } = await supabase
        .from("lesson_assessments")
        .insert(payload)
        .select(
          "id, lesson_id, section_id, assessment_type, title, sort_order"
        )
        .single();

      if (error) throw error;

      const newAssessment = data as Assessment;

      setAssessments((previous) =>
        [...previous, newAssessment].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );

      setAssessment(newAssessment);
      setSelectedAssessmentId(newAssessment.id);
      setAssessmentTitle(newAssessment.title);
      setQuestions([]);
      setDraft(null);

      clearImportPreview();

      toast.success(
        isCheckpoint
          ? `Checkpoint ${nextOrder + 1} berhasil dibuat.`
          : "Evaluasi akhir berhasil dibuat."
      );
    } catch (error: unknown) {
      console.error("Create assessment error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Gagal membuat evaluasi.";

      toast.error(`Gagal membuat evaluasi: ${message}`);

      await loadAssessment();
    } finally {
      setCreating(false);
    }
  };

  // =====================================================
  // SAVE ASSESSMENT TITLE
  // =====================================================

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

      const updatedAssessment = {
        ...assessment,
        title,
      };

      setAssessment(updatedAssessment);

      setAssessments((previous) =>
        previous.map((item) =>
          item.id === assessment.id
            ? updatedAssessment
            : item
        )
      );

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

  // =====================================================
  // MANUAL QUESTION EDITOR
  // =====================================================

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

  // =====================================================
  // USER INTERFACE
  // =====================================================

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
              Kelola beberapa checkpoint dan soal evaluasi pembelajaran.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadAssessment()}
          disabled={loading || importing || creating}
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
          onClick={() => {
            setAssessmentType("checkpoint");
            setAssessment(null);
            setAssessments([]);
            setSelectedAssessmentId(null);
            setQuestions([]);
            setDraft(null);
          }}
          className="w-full"
        >
          Checkpoint
        </Button>

        <Button
          type="button"
          variant={!isCheckpoint ? "default" : "ghost"}
          onClick={() => {
            setAssessmentType("final");
            setAssessment(null);
            setAssessments([]);
            setSelectedAssessmentId(null);
            setQuestions([]);
            setDraft(null);
          }}
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
            {isCheckpoint ? "Banyak checkpoint" : "Per sesi"}
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
      ) : (
        <>
          {/* =========================================
              CHECKPOINT LIST
          ========================================== */}

          {isCheckpoint && assessments.length > 0 && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">
                    Daftar Checkpoint
                  </h4>
                  <Badge variant="muted">
                    {assessments.length}
                  </Badge>
                </div>

                <Button
                  size="sm"
                  onClick={() => void createAssessment()}
                  disabled={creating || importing}
                  className="gap-2"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Tambah Checkpoint
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {assessments.map((item, index) => {
                  const selected =
                    item.id === selectedAssessmentId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectAssessment(item)}
                      className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.title}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {selected ? "Sedang diedit" : "Pilih untuk mengedit"}
                        </p>
                      </div>

                      {selected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================
              EMPTY ASSESSMENT
          ========================================== */}

          {!assessment ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />

              <h4 className="font-semibold">
                {isCheckpoint
                  ? "Belum ada checkpoint"
                  : "Evaluasi akhir belum dibuat"}
              </h4>

              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {isCheckpoint
                  ? "Buat checkpoint pertama untuk bagian materi ini. Kamu dapat menambahkan checkpoint berikutnya kapan saja."
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
                Buat {isCheckpoint ? "Checkpoint Pertama" : "Evaluasi Akhir"}
              </Button>
            </div>
          ) : (
            <>
              {/* =====================================
                  SELECTED ASSESSMENT
              ====================================== */}

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
                    ? "Soal hanya akan menjadi bagian dari checkpoint yang sedang dipilih."
                    : "Soal akan menjadi bagian dari evaluasi akhir sesi."}
                </p>
              </div>

              {/* EXCEL IMPORT PANEL */}

              <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">
                      Import Soal dari Excel
                    </h4>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Tambahkan banyak soal sekaligus menggunakan template Excel GradeUp.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadExcelTemplate}
                    disabled={importing}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Unduh Template Excel
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleExcelUpload}
                    disabled={importing || !!draft}
                  />

                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing || !!draft}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Pilih File Excel
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Format .xlsx, maksimal 10 MB dan 500 soal per import.
                  Soal lama tidak akan dihapus.
                </p>

                {importFileName && (
                  <div className="flex items-center gap-2 rounded-lg border bg-background p-3">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />

                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {importFileName}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearImportPreview}
                      disabled={importing}
                      aria-label="Batalkan file Excel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-2 font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Ditemukan {importErrors.length} kesalahan
                    </div>

                    <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                      {importErrors.map((error, index) => (
                        <p key={index}>{error}</p>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Perbaiki file Excel, kemudian pilih kembali file yang sudah diperbaiki.
                    </p>
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div className="space-y-3 rounded-lg border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold">
                          Pratinjau Import
                        </span>
                      </div>

                      <Badge variant="muted">
                        {importPreview.length} soal
                      </Badge>
                    </div>

                    {importErrors.length === 0 ? (
                      <p className="text-sm text-emerald-600">
                        <CheckCircle2 className="mr-1 inline h-4 w-4" />
                        Semua soal lolos validasi.
                      </p>
                    ) : (
                      <p className="text-sm text-destructive">
                        Perbaiki kesalahan sebelum melakukan import.
                      </p>
                    )}

                    <div className="max-h-80 space-y-3 overflow-y-auto">
                      {importPreview.map((question, index) => (
                        <div
                          key={`${question.rowNumber}-${index}`}
                          className="rounded-lg border p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <Badge variant="outline">
                              Soal {index + 1}
                            </Badge>

                            <span className="text-xs text-muted-foreground">
                              Baris Excel {question.rowNumber}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap text-sm font-medium">
                            {question.question_text}
                          </p>

                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option) => (
                              <div
                                key={option.id}
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  option.id === question.correct_answer
                                    ? "border-emerald-500/40 bg-emerald-500/5"
                                    : ""
                                }`}
                              >
                                <strong>{option.id}.</strong>{" "}
                                {option.text}
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 text-xs text-emerald-600">
                            Kunci jawaban: {question.correct_answer}
                          </div>

                          {question.explanation && (
                            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                              Pembahasan: {question.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {importErrors.length > 0
                          ? "Import belum dapat dilakukan."
                          : `${importPreview.length} soal akan ditambahkan ke evaluasi ini.`}
                      </p>

                      <Button
                        type="button"
                        onClick={() => void importExcelQuestions()}
                        disabled={
                          importing ||
                          importErrors.length > 0 ||
                          importPreview.length === 0 ||
                          !!draft
                        }
                        className="gap-2"
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {importing
                          ? "Mengimport..."
                          : `Import ${importPreview.length} Soal`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* MANUAL QUESTION FORM */}

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
                      Klik huruf A, B, C, atau D untuk menentukan kunci jawaban.
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

              {/* QUESTION LIST */}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold">
                      Daftar Soal
                    </h4>

                    <p className="text-xs text-muted-foreground">
                      {assessment.title}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={startNewQuestion}
                    disabled={!!draft || importing}
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
                              <Badge variant="muted">
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
                              disabled={
                                !!draft ||
                                !!deletingId ||
                                importing
                              }
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
                              disabled={
                                !!draft ||
                                !!deletingId ||
                                importing
                              }
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
        </>
      )}
    </Card>
  );
}
