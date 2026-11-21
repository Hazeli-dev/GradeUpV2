
import { categories } from "@/data/categories";
import { exams } from "@/data/exams";
import { questions } from "@/data/questions";
import { delay } from "./delay";
import { supabase } from "@/lib/supabase";

import type {
  Category,
  Course,
  ExamPackage,
  Question,
} from "@/types";

interface SupabaseCourseRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: Course["level"] | null;
  instructor: string | null;
  premium: boolean | null;
  status: Course["status"];
  thumbnail: string | null;
}

interface SupabaseExamPackageRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  question_count: number | null;
  premium: boolean | null;
  status: string | null;
}

export type CatalogCourse = Course & {
  lessonCount: number;
};

/**
 * Memetakan data kursus dari Supabase.
 */
function mapSupabaseCourse(row: SupabaseCourseRow): CatalogCourse {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category || "Umum",
    level: row.level || "Umum",
    instructor: row.instructor || "GradeUp",
    premium: Boolean(row.premium),
    status: row.status,
    thumbnail: row.thumbnail ?? "from-emerald-500 to-teal-600",
    lessonCount: 0,
    lessons: [],
    objectives: [],
    duration: 0,
    students: 0,
    rating: 0,
  };
}

/**
 * Mengambil seluruh katalog kursus yang sudah diterbitkan.
 */
export async function listCourses(): Promise<CatalogCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      category,
      level,
      instructor,
      premium,
      status,
      thumbnail
    `)
    .eq("status", "Published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil katalog kursus:", error);
    throw error;
  }

  return ((data ?? []) as unknown as SupabaseCourseRow[]).map(
    mapSupabaseCourse
  );
}

/**
 * Mengambil detail kursus berdasarkan ID dari Supabase.
 */
export async function getCourseById(
  id: string
): Promise<CatalogCourse | undefined> {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      category,
      level,
      instructor,
      premium,
      status,
      thumbnail
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil detail kursus:", error);
    throw error;
  }

  if (!data) return undefined;

  return mapSupabaseCourse(data as unknown as SupabaseCourseRow);
}

/**
 * Mengambil paket ujian yang aktif dan sudah diterbitkan.
 */
export async function listExams(): Promise<ExamPackage[]> {
  const { data, error } = await supabase
    .from("exam_packages")
    .select(`
      id,
      title,
      description,
      category,
      level,
      difficulty,
      duration_minutes,
      total_questions,
      question_count,
      premium,
      status
    `)
    .eq("is_active", true)
    .eq("is_published", true)
    .eq("status", "Published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil katalog ujian:", error);
    throw error;
  }

  return ((data ?? []) as SupabaseExamPackageRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category || "Umum",
    level: (row.level || "Umum") as ExamPackage["level"],
    difficulty: (row.difficulty || "Sedang") as ExamPackage["difficulty"],
    duration: row.duration_minutes ?? 0,
    questionCount: row.total_questions ?? row.question_count ?? 0,
    participants: 0,
    premium: Boolean(row.premium),
    status: "Published",
    questionIds: [],
  }));
}

/**
 * Detail ujian tetap menggunakan sumber data demo sebelumnya.
 */
export async function getExamById(
  id: string
): Promise<ExamPackage | undefined> {
  await delay(250);
  return exams.find((exam) => exam.id === id);
}

/**
 * Kategori tetap menggunakan data kategori yang sudah ada.
 */
export async function listCategories(): Promise<Category[]> {
  await delay(250);
  return categories;
}

/**
 * Fungsi soal tetap dipertahankan.
 */
export async function listQuestions(): Promise<Question[]> {
  await delay();
  return questions;
}

export async function getQuestionsForExam(
  exam: ExamPackage
): Promise<Question[]> {
  await delay(300);

  return exam.questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question));
}
