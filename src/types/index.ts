export type Level = "SD" | "SMP" | "SMA" | "Umum";
export type Difficulty = "Mudah" | "Sedang" | "Sulit";
export type PublishStatus = "Published" | "Draft";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: number; // minutes
  type: "video" | "reading" | "quiz";
  completed?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  instructor: string;
  thumbnail: string; // tailwind gradient classes
  lessons: Lesson[];
  objectives: string[];
  duration: number; // total minutes
  students: number;
  rating: number;
  premium: boolean;
  status: PublishStatus;
  progress?: number; // 0-100 for current student (demo)
}

export interface Question {
  id: string;
  subject: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExamPackage {
  id: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  difficulty: Difficulty;
  duration: number; // minutes
  questionCount: number;
  participants: number;
  premium: boolean;
  status: PublishStatus;
  questionIds: string[];
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  category: string;
  date: string;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  durationUsed: number; // minutes
  passed: boolean;
}

export interface ActivityItem {
  id: string;
  type: "exam" | "course" | "achievement" | "login";
  title: string;
  description: string;
  date: string;
}

export type UserRole = "student" | "admin";
export type AccountStatus = "Aktif" | "Nonaktif" | "Ditangguhkan";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  level: Level;
  plan: "Gratis" | "Premium";
  status: AccountStatus;
  joinedAt: string;
  examsTaken: number;
  avgScore: number;
}

// Status Transaksi Duitku & Database Supabase
export type PaymentStatus =
  | "success"
  | "pending"
  | "failed"
  | "expired"
  | "Berhasil"
  | "Menunggu"
  | "Gagal"
  | "Refund";

export interface Transaction {
  id: string;
  merchant_order_id?: string; // Order ID Duitku (misal: PREM-1741234567-890)
  invoice?: string;           // Dual-compatibility untuk komponen UI lama
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  method: string;             // Kode metode Duitku (misal: VC, BC, QR, SP)
  status: PaymentStatus;
  payment_url?: string;       // Hosted checkout URL Duitku
  reference?: string;         // Duitku reference code
  date: string;
}

// Response dari Edge Function `check-payment-status` / Duitku
export interface PaymentStatusResponse {
  success?: boolean;
  order_id?: string;
  merchant_order_id?: string;
  database_status?: string;
  payment_method?: string | null;
  amount?: number;
  reference?: string;
  message?: string;
  error?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  note?: string;
}
