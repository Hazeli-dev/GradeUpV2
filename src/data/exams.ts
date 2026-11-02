import type { ExamPackage } from "@/types";

export const exams: ExamPackage[] = [];

export const getExam = (id?: string) => exams.find((e) => e.id === id);
