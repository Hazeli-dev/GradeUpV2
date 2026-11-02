import type { Course } from "@/types";

export const courses: Course[] = [];

export const getCourse = (id?: string) => courses.find((c) => c.id === id);
