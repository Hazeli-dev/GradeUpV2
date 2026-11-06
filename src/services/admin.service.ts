
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
  status: "Berhasil" | "Menunggu" | "Gagal" | "Refund";
  created_at: string;
  date: string;
  invoice: string;
  method: string;
}

function normalizeTransactionStatus(
  status: unknown
): TransactionRecord["status"] {
  const value = String(status ?? "").toLowerCase().trim();

  if (
    [
      "success",
      "paid",
      "settlement",
      "capture",
      "completed",
      "berhasil",
    ].includes(value)
  ) {
    return "Berhasil";
  }

  if (
    [
      "refund",
      "refunded",
      "partial_refund",
      "partially_refunded",
    ].includes(value)
  ) {
    return "Refund";
  }

  if (
    [
      "failed",
      "failure",
      "deny",
      "denied",
      "cancel",
      "cancelled",
      "canceled",
      "expire",
      "expired",
      "gagal",
    ].includes(value)
  ) {
    return "Gagal";
  }

  return "Menunggu";
}

// 1. Daftar pengguna
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

  return (data || []).map((user: any) => ({
    ...user,
    full_name: user.full_name || user.name || user.email || "",
    name: user.full_name || user.name || user.email || "",
    created_at: user.created_at || new Date().toISOString(),
    joinedAt: user.created_at || new Date().toISOString(),
    plan: user.plan || "Gratis",
    status: user.status || "active",
    level: user.level || "Beginner",
    examsTaken: user.examsTaken || 0,
    avgScore: user.avgScore || 0,
  })) as ProfileRecord[];
}

// 2. Daftar transaksi asli beserta profil pengguna
export async function listTransactions(): Promise<TransactionRecord[]> {
  await delay();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil transaksi:", error.message);
    throw new Error(
      `Gagal mengambil data transaksi: ${error.message}`
    );
  }

  if (!transactions?.length) {
    return [];
  }

  const userIds = [
    ...new Set(
      transactions
        .map((tx: any) => tx.user_id)
        .filter((id: string | null) => Boolean(id))
    ),
  ];

  let profilesById = new Map<string, any>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, name")
      .in("id", userIds);

    if (profileError) {
      console.error(
        "Gagal mengambil profil transaksi:",
        profileError.message
      );

      throw new Error(
        `Gagal mengambil profil pengguna: ${profileError.message}`
      );
    }

    profilesById = new Map(
      (profiles || []).map((profile: any) => [
        profile.id,
        profile,
      ])
    );
  }

  return transactions.map((tx: any) => {
    const profile = tx.user_id
      ? profilesById.get(tx.user_id)
      : null;

    const email =
      profile?.email ||
      tx.metadata?.user_email ||
      "";

    const name =
      profile?.full_name ||
      profile?.name ||
      email ||
      "Pengguna tidak diketahui";

    const createdAt =
      tx.created_at || new Date().toISOString();

    return {
      id: tx.id,
      user_id: tx.user_id || "",
      user_email: email,
      userEmail: email,
      userName: name,
      plan_name: tx.plan_name || "",
      plan: tx.plan_name || "Paket Premium",
      amount: Number(tx.gross_amount ?? tx.amount ?? 0),
      status: normalizeTransactionStatus(tx.status),
      created_at: createdAt,
      date: createdAt,
      invoice:
        tx.invoice_number ||
        `INV-${String(tx.id).slice(0, 8).toUpperCase()}`,
      method:
        tx.payment_method ||
        tx.payment_provider ||
        "Belum ditentukan",
    };
  });
}

// 3. Pembuatan transaksi harus dilakukan melalui backend pembayaran.
// Jangan membuat transaksi pembayaran langsung dari browser.
export async function createTransaction(_payload: {
  user_id: string;
  user_email: string;
  plan_name: string;
  amount: number;
  status?: any;
  method?: string;
}) {
  throw new Error(
    "Pembuatan transaksi harus dilakukan melalui backend pembayaran yang tervalidasi."
  );
}

// 4. Status pembayaran hanya boleh diperbarui oleh backend
// setelah menerima dan memverifikasi notifikasi payment gateway.
export async function updateTransactionStatus(
  _transactionId: string,
  _newStatus: any
) {
  throw new Error(
    "Perubahan status transaksi harus dilakukan melalui backend pembayaran."
  );
}

// 5. Mengubah role pengguna melalui RPC khusus admin.
// Tidak melakukan UPDATE langsung ke tabel profiles.
export async function updateUserRole(
  userId: string,
  newRole: "admin" | "student"
) {
  if (!userId) {
    throw new Error("ID pengguna tidak valid.");
  }

  if (!["admin", "student"].includes(newRole)) {
    throw new Error("Role pengguna tidak valid.");
  }

  const { error } = await supabase.rpc(
    "admin_update_user_role",
    {
      p_target_user_id: userId,
      p_new_role: newRole,
    }
  );

  if (error) {
    console.error("Gagal mengubah role pengguna:", error.message);
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

// 6. Daftar paket ujian
export async function listExamPackages(): Promise<ExamPackageRecord[]> {
  await delay();

  const { data, error } = await supabase
    .from("exam_packages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Gagal mengambil data paket ujian:",
      error.message
    );

    return [];
  }

  return (data as ExamPackageRecord[]) || [];
}

// 7. Membuat paket ujian
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

// 8. Menghapus paket ujian
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
