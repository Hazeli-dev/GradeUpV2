
import { supabase } from "@/lib/supabase";
import { delay } from "./delay";

// =====================================================
// KONFIGURASI DUITKU
// =====================================================

// Merchant Code khusus Production GradeUp.
// Transaksi Sandbox dan transaksi yang tidak diketahui
// environment-nya tidak akan ditampilkan di halaman admin.
const DUITKU_PRODUCTION_MERCHANT_CODE = "D25895";

// =====================================================
// INTERFACE
// =====================================================

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
  merchant_order_id: string;
  invoice: string;
  method: string;
  payment_url?: string;
  reference?: string;
}

// =====================================================
// NORMALISASI STATUS TRANSAKSI
// =====================================================

function normalizeTransactionStatus(
  status: unknown
): TransactionRecord["status"] {
  const value = String(status ?? "").toLowerCase().trim();

  if (
    [
      "success",
      "paid",
      "settlement",
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

// =====================================================
// VALIDASI TRANSAKSI PRODUCTION DUITKU
// =====================================================

function isDuitkuProductionTransaction(tx: any): boolean {
  const merchantCode = String(
    tx?.raw_response?.merchantCode ?? ""
  )
    .trim()
    .toUpperCase();

  return merchantCode === DUITKU_PRODUCTION_MERCHANT_CODE;
}

// =====================================================
// 1. DAFTAR PENGGUNA
// =====================================================

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

// =====================================================
// 2. DAFTAR TRANSAKSI DUITKU PRODUCTION
// =====================================================

export async function listTransactions(): Promise<TransactionRecord[]> {
  await delay();

  // Mengambil transaksi dari tabel payment_transactions.
  const { data: transactions, error } = await supabase
    .from("payment_transactions")
    .select(`
      *,
      premium_plans ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil transaksi Duitku:", error.message);

    throw new Error(
      `Gagal mengambil data transaksi: ${error.message}`
    );
  }

  if (!transactions?.length) {
    return [];
  }

  // Hanya transaksi dengan Merchant Code Production.
  // Sandbox dan transaksi tanpa identitas merchant disembunyikan.
  const productionTransactions = transactions.filter(
    (tx: any) => isDuitkuProductionTransaction(tx)
  );

  if (!productionTransactions.length) {
    return [];
  }

  // Ambil ID pengguna dari transaksi Production saja.
  const userIds = [
    ...new Set(
      productionTransactions
        .map((tx: any) => tx.user_id)
        .filter((id: string | null) => Boolean(id))
    ),
  ];

  let profilesById = new Map<string, any>();

  // Ambil profil pengguna.
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

  // Format data transaksi untuk halaman Admin.
  return productionTransactions.map((tx: any) => {
    const profile = tx.user_id
      ? profilesById.get(tx.user_id)
      : null;

    const email = profile?.email || "";

    const name =
      profile?.full_name ||
      profile?.name ||
      email ||
      "Pengguna tidak diketahui";

    const createdAt =
      tx.created_at || new Date().toISOString();

    const orderId =
      tx.merchant_order_id ||
      `INV-${String(tx.id).slice(0, 8).toUpperCase()}`;

    const planName =
      tx.premium_plans?.name ||
      tx.plan_name ||
      "Paket Premium";

    return {
      id: tx.id,
      user_id: tx.user_id || "",
      user_email: email,
      userEmail: email,
      userName: name,
      plan_name: planName,
      plan: planName,
      amount: Number(tx.amount ?? 0),
      status: normalizeTransactionStatus(tx.status),
      created_at: createdAt,
      date: createdAt,
      merchant_order_id: orderId,
      invoice: orderId,
      method: tx.payment_method || "Duitku",
      payment_url: tx.payment_url,
      reference: tx.reference,
    };
  });
}

// =====================================================
// 3. PEMBUATAN TRANSAKSI
// =====================================================

export async function createTransaction(_payload: {
  user_id: string;
  user_email: string;
  plan_name: string;
  amount: number;
  status?: any;
  method?: string;
}) {
  throw new Error(
    "Pembuatan transaksi harus dilakukan melalui backend Edge Function create-payment."
  );
}

// =====================================================
// 4. PEMBARUAN STATUS TRANSAKSI
// =====================================================

export async function updateTransactionStatus(
  _transactionId: string,
  _newStatus: any
) {
  throw new Error(
    "Perubahan status transaksi disinkronkan otomatis oleh webhook Duitku."
  );
}

// =====================================================
// 5. MENGUBAH ROLE PENGGUNA
// =====================================================

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

// =====================================================
// INTERFACE PAKET UJIAN
// =====================================================

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

// =====================================================
// 6. DAFTAR PAKET UJIAN
// =====================================================

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

// =====================================================
// 7. MEMBUAT PAKET UJIAN
// =====================================================

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

// =====================================================
// 8. MENGHAPUS PAKET UJIAN
// =====================================================

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
