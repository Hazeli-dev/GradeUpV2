import { categories } from "@/data/categories";
import { courses } from "@/data/courses";
import { exams } from "@/data/exams";
import { questions } from "@/data/questions";
import { delay } from "./delay";
import type { Category, Course, ExamPackage, Question } from "@/types";

/**
 * Lapisan service katalog. Saat ini membaca dari src/data (demo).
 * Ganti isi fungsi dengan query Supabase tanpa mengubah komponen pemanggil.
 */

export async function listCourses(): Promise<Course[]> {
  await delay();
  return courses;
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  await delay(250);
  return courses.find((c) => c.id === id);
}

export async function listExams(): Promise<ExamPackage[]> {
  await delay();
  return exams;
}

export async function getExamById(id: string): Promise<ExamPackage | undefined> {
  await delay(250);
  return exams.find((e) => e.id === id);
}

export async function listCategories(): Promise<Category[]> {
  await delay(250);
  return categories;
}

export async function listQuestions(): Promise<Question[]> {
  await delay();
  return questions;
}

export async function getQuestionsForExam(exam: ExamPackage): Promise<Question[]> {
  await delay(300);
  return exam.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q));
}
