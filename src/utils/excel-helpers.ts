
import * as XLSX from "xlsx";

export interface ExcelQuestionRow {
  category?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
}

type ParsedExamQuestion = {
  exam_package_id: string;
  category: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
};

const normalize = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const readExcelRows = (file: File): Promise<ExcelQuestionRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;

        if (!result) {
          throw new Error("File Excel kosong atau tidak dapat dibaca.");
        }

        const workbook = XLSX.read(new Uint8Array(result as ArrayBuffer), {
          type: "array",
        });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!firstSheet) {
          throw new Error("Sheet Excel tidak ditemukan.");
        }

        const rows = XLSX.utils.sheet_to_json<ExcelQuestionRow>(firstSheet, {
          defval: "",
        });

        if (rows.length === 0) {
          throw new Error("File Excel belum berisi soal.");
        }

        resolve(rows);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Format file Excel tidak valid.")
        );
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca file Excel."));
    reader.readAsArrayBuffer(file);
  });
};

// Download template Excel.
export const downloadQuestionTemplate = () => {
  const templateData = [
    {
      category: "Matematika",
      question_text: "Berapakah hasil dari 15 + 25?",
      option_a: "30",
      option_b: "35",
      option_c: "40",
      option_d: "45",
      correct_answer: "C",
      explanation: "15 + 25 = 40.",
    },
    {
      category: "Bahasa Indonesia",
      question_text: "Gagasan utama dalam sebuah paragraf disebut...",
      option_a: "Ide pokok",
      option_b: "Kalimat penjelas",
      option_c: "Kesimpulan",
      option_d: "Judul",
      correct_answer: "A",
      explanation: "Ide pokok merupakan inti paragraf.",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");

  XLSX.writeFile(workbook, "Template_Import_Soal_GradeUp.xlsx");
};

// Parser bank soal lama.
// Dipertahankan agar questions-page.tsx tetap kompatibel.
export const parseQuestionsExcel = async (file: File): Promise<any[]> => {
  const rows = await readExcelRows(file);

  return rows.map((row, index) => {
    const questionText = normalize(row.question_text);
    const options = [
      { id: "A", text: normalize(row.option_a) },
      { id: "B", text: normalize(row.option_b) },
      { id: "C", text: normalize(row.option_c) },
      { id: "D", text: normalize(row.option_d) },
    ];

    const correctAnswer = normalize(row.correct_answer).toUpperCase();

    if (
      !questionText ||
      options.some((option) => !option.text) ||
      !["A", "B", "C", "D"].includes(correctAnswer)
    ) {
      throw new Error(
        `Data soal pada baris ${index + 2} tidak lengkap atau kunci jawaban tidak valid.`
      );
    }

    return {
      category: normalize(row.category) || "Umum",
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      explanation: normalize(row.explanation) || null,
    };
  });
};

// Parser khusus paket ujian.
// Semua soal wajib valid dan terikat ke satu paket.
export const parseQuestionsExcelForExam = async (
  file: File,
  examPackageId: string,
  category: string
): Promise<ParsedExamQuestion[]> => {
  const rows = await readExcelRows(file);

  if (!examPackageId) {
    throw new Error("ID paket ujian tidak ditemukan.");
  }

  const questions: ParsedExamQuestion[] = rows.map((row, index) => {
    const questionText = normalize(row.question_text);

    const options = [
      { id: "A", text: normalize(row.option_a) },
      { id: "B", text: normalize(row.option_b) },
      { id: "C", text: normalize(row.option_c) },
      { id: "D", text: normalize(row.option_d) },
    ];

    const correctAnswer = normalize(row.correct_answer).toUpperCase();

    if (!questionText) {
      throw new Error(`Pertanyaan pada baris ${index + 2} masih kosong.`);
    }

    const missingOption = options.find((option) => !option.text);

    if (missingOption) {
      throw new Error(
        `Pilihan ${missingOption.id} pada baris ${index + 2} masih kosong.`
      );
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(
        `Kunci jawaban pada baris ${index + 2} harus A, B, C, atau D.`
      );
    }

    return {
      exam_package_id: examPackageId,
      category,
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      explanation: normalize(row.explanation) || null,
    };
  });

  return questions;
};
