
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

export type CatalogCourse = Course & {
  lessonCount: number;
}

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

    // Jumlah materi sementara belum dihitung dari relasi.
    lessonCount: 0,

    // Field kompatibilitas dengan tipe Course.
    lessons: [],
    objectives: [],
    duration: 0,
    students: 0,
    rating: 0,
  };
}

/**
 * Mengambil seluruh katalog kursus yang sudah diterbitkan.
 * Menggunakan pola query yang sama dengan Home Page.
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
 * Fungsi katalog ujian tetap menggunakan sumber data sebelumnya.
 */
export async function listExams(): Promise<ExamPackage[]> {
  await delay();
  return exams;
}

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
