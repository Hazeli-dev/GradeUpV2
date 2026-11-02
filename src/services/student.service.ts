import { activities, results, studentProfile } from "@/data/results";
import { delay } from "./delay";

export async function getStudentProfile() {
  await delay(200);
  return studentProfile;
}

export async function listResults() {
  await delay();
  return results;
}

export async function getResultById(id: string) {
  await delay(250);
  return results.find((r) => r.id === id);
}

export async function listActivities() {
  await delay();
  return activities;
}
