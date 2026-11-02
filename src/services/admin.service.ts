import { supabase } from "@/lib/supabase";
import { delay } from "./delay";

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  name: string;
  role: "admin" | "student";
  created_at: string;
  joinedAt: string;
  plan: any;
  status: any;
  level: any;
  examsTaken: number;
  avgScore: number;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  user_email: string;
  userEmail: string;
  userName: string;
  plan_name: string;
  plan: string;
  amount: number;
  status: any;
  created_at: string;
  date: string;
  invoice: string;
  method: string; // Tambahan properti method agar sesuai dengan tipe Transaction
}

// 1. Ambil daftar pengguna asli dari tabel Supabase 'profiles'
export async function listUsers(): Promise<ProfileRecord[]> {
  await delay();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data pengguna:", error.message);
    return [];
  }

  const mappedData = (data || []).map((user: any) => ({
    ...user,
    full_name: user.full_name || user.email || "",
    name: user.full_name || user.email || "",
    created_at: user.created_at || new Date().toISOString(),
    joinedAt: user.created_at || new Date().toISOString(),
    plan: user.plan || "Gratis",
    status: user.status || "active",
    level: user.level || "Beginner",
    examsTaken: user.examsTaken || 0,
    avgScore: user.avgScore || 0,
  }));

  return mappedData as ProfileRecord[];
}

// 2. Ambil daftar transaksi dari Supabase 'transactions' (Hanya 1 fungsi ini saja yang ada)
export async function listTransactions(): Promise<TransactionRecord[]> {
  await delay();
  
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data transaksi:", error.message);
    return [];
  }

  const mappedData = (data || []).map((tx: any) => ({
    ...tx,
    invoice: tx.invoice || `INV-${tx.id.substring(0, 6).toUpperCase()}`,
    userName: tx.userName || tx.user_email || "User",
    userEmail: tx.userEmail || tx.user_email || "",
    plan: tx.plan || tx.plan_name || "Premium Plan",
    date: tx.date || tx.created_at || new Date().toISOString(),
    status: tx.status || "success",
    method: tx.method || "Transfer Bank",
  }));

  return mappedData as TransactionRecord[];
}

// 3. Tambah transaksi baru
export async function createTransaction(payload: {
  user_id: string;
  user_email: string;
  plan_name: string;
  amount: number;
  status?: any;
  method?: string;
}) {
  const { data, error } = await supabase
    .from("transactions")
    .insert([
      {
        user_id: payload.user_id,
        user_email: payload.user_email,
        plan_name: payload.plan_name,
        amount: payload.amount,
        status: payload.status || "pending",
        method: payload.method || "Transfer Bank",
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// 4. Ubah status transaksi
export async function updateTransactionStatus(transactionId: string, newStatus: any) {
  const { error } = await supabase
    .from("transactions")
    .update({ status: newStatus })
    .eq("id", transactionId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}

// 5. Fungsi mengubah role pengguna langsung di Supabase
export async function updateUserRole(userId: string, newRole: "admin" | "student") {
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}

export interface ExamPackageRecord {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  total_questions: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

// 6. Ambil daftar paket ujian dari Supabase
export async function listExamPackages(): Promise<ExamPackageRecord[]> {
  await delay();
  
  const { data, error } = await supabase
    .from("exam_packages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data paket ujian:", error.message);
    return [];
  }

  return (data as ExamPackageRecord[]) || [];
}

// 7. Tambah paket ujian baru
export async function createExamPackage(payload: {
  title: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  total_questions?: number;
  category?: string;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("exam_packages")
    .insert([
      {
        title: payload.title,
        description: payload.description || "",
        price: payload.price || 0,
        duration_minutes: payload.duration_minutes || 120,
        total_questions: payload.total_questions || 0,
        category: payload.category || "Umum",
        is_active: payload.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// 8. Hapus paket ujian
export async function deleteExamPackage(packageId: string) {
  const { error } = await supabase
    .from("exam_packages")
    .delete()
    .eq("id", packageId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}
