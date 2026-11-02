import type { ActivityItem, ExamResult } from "@/types";

export const results: ExamResult[] = [];

export const activities: ActivityItem[] = [];

export const studentProfile = {
  name: "",
  email: "",
  level: "",
  school: "",
  plan: "Gratis",
  streak: 0,
  totalExams: 0,
  avgScore: 0,
  learningHours: 0,
};
