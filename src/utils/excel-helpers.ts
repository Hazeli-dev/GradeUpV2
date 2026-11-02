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

// 1. Download Template Excel Soal
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

// 2. Parse File Excel untuk Bank Soal (Digunakan di questions-page.tsx)
export const parseQuestionsExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<ExcelQuestionRow>(worksheet);

        const formattedQuestions = jsonData.map((row) => ({
          category: row.category?.toString().trim() || "Umum",
          question_text: row.question_text?.toString().trim() || "",
          options: [
            { id: "A", text: row.option_a?.toString().trim() || "" },
            { id: "B", text: row.option_b?.toString().trim() || "" },
            { id: "C", text: row.option_c?.toString().trim() || "" },
            { id: "D", text: row.option_d?.toString().trim() || "" },
          ],
          correct_answer: row.correct_answer?.toString().trim().toUpperCase() || "A",
          explanation: row.explanation?.toString().trim() || null,
        }));

        const validQuestions = formattedQuestions.filter(
          (q) => q.question_text && q.options[0].text && q.options[1].text
        );

        resolve(validQuestions);
      } catch (err) {
        reject(new Error("Format file Excel tidak valid."));
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
};

// 3. Parse File Excel Terikat Paket Ujian (Digunakan di exams-page.tsx)
export const parseQuestionsExcelForExam = (
  file: File,
  examPackageId: string,
  category: string
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ExcelQuestionRow>(worksheet);

        const formattedQuestions = jsonData.map((row) => ({
          exam_package_id: examPackageId,
          category: category,
          question_text: row.question_text?.toString().trim() || "",
          options: [
            { id: "A", text: row.option_a?.toString().trim() || "" },
            { id: "B", text: row.option_b?.toString().trim() || "" },
            { id: "C", text: row.option_c?.toString().trim() || "" },
            { id: "D", text: row.option_d?.toString().trim() || "" },
          ],
          correct_answer: row.correct_answer?.toString().trim().toUpperCase() || "A",
          explanation: row.explanation?.toString().trim() || null,
        }));

        const validQuestions = formattedQuestions.filter(
          (q) => q.question_text && q.options[0].text && q.options[1].text
        );

        resolve(validQuestions);
      } catch (err) {
        reject(new Error("Format file Excel tidak valid."));
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
};
