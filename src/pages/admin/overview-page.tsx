import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClipboardList,
  GraduationCap,
  Users,
  Wallet,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  ChartCard,
  axisProps,
  chartTooltipStyle,
} from "@/components/shared/chart-card";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { PaymentBadge } from "@/components/admin/badges";
import {
  formatDate,
  formatRupiah,
  initials,
} from "@/utils/format";
import { CHART_COLORS } from "@/constants";
import { cn } from "@/lib/utils";

// =====================================================
// KONFIGURASI DUITKU PRODUCTION
// =====================================================

const DUITKU_PRODUCTION_MERCHANT_CODE = "D25895";

const donutColors = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
];

// =====================================================
// DEKORASI VISUAL (tampilan saja, tidak interaktif)
// =====================================================

const panelSurface =
  "border border-slate-200/80 bg-white/90 shadow-[0_16px_44px_-28px_rgba(15,118,110,0.35)] backdrop-blur-sm transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/85";

const heroPanel =
  "relative isolate overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-[0_24px_60px_-34px_rgba(15,118,110,0.45)] ring-1 ring-inset ring-white/60 transition-colors duration-300 dark:border-emerald-900/40 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 dark:ring-white/5";

const insetPanel =
  "rounded-2xl border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20";

const chartSurface = `${panelSurface} rounded-3xl ring-1 ring-emerald-900/[0.04] dark:ring-white/5`;

const rowHover =
  "-mx-2 rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30";

const patternLine =
  "[--gu-line:rgba(15,118,110,0.12)] dark:[--gu-line:rgba(52,211,153,0.10)]";

function AdminStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 12px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-drift { animation: gu-drift 22s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 26s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .gu-reveal-1 { animation-delay: 0.08s; }
      .gu-reveal-2 { animation-delay: 0.16s; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 44px 44px;
        -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 30%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 80% 55% at 50% 30%, #000 20%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

/** Latar ambient untuk seluruh halaman. Diletakkan sebagai anak terakhir wrapper `relative isolate`. */
function AdminDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 !mt-0 overflow-hidden rounded-[2rem]"
    >
      <div
        className={`gu-grid absolute inset-0 opacity-70 ${patternLine}`}
      />
      <div className="gu-drift absolute -right-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10" />
      <div className="gu-drift-rev absolute -left-36 top-1/3 h-[24rem] w-[24rem] rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-500/10" />
      <div className="absolute -bottom-32 right-1/4 h-[22rem] w-[22rem] rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-600/10" />
      <div className="absolute right-[6%] top-24 h-56 w-56 rounded-full border border-emerald-300/30 dark:border-emerald-400/10" />
      <div className="absolute -left-8 bottom-32 h-32 w-32 rotate-12 rounded-[2rem] border border-teal-300/30 bg-gradient-to-br from-white/40 to-transparent dark:border-teal-400/10 dark:from-white/5" />
    </div>
  );
}

/** Dekorasi kecil di dalam panel (butuh parent `relative isolate overflow-hidden`). */
function PanelGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-500/15" />
      <div className="absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/10" />
      <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-emerald-300/40 dark:border-emerald-400/10" />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent dark:via-emerald-500/30" />
    </div>
  );
}

/** Pembungkus kartu statistik: efek angkat dan cahaya emerald saat hover. */
function StatFrame({
  children,
  delay = "",
}: {
  children: React.ReactNode;
  delay?: string;
}) {
  return (
    <div
      className={`gu-reveal ${delay} group relative isolate transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 -z-10 rounded-3xl bg-emerald-400/0 blur-xl transition-colors duration-500 group-hover:bg-emerald-400/20 dark:group-hover:bg-emerald-500/15"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 z-10 h-px bg-gradient-to-r from-transparent via-emerald-400/0 to-transparent transition-colors duration-500 group-hover:via-emerald-400/70"
      />
      {children}
    </div>
  );
}

// =====================================================
// TYPES
// =====================================================

type ProfileRow = {
  id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  plan: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
  created_at: string | null;
};

type TransactionRow = {
  id: string;
  user_id: string | null;
  invoice_number: string | null;
  plan_name: string | null;
  amount: number | string | null;
  gross_amount: number | string | null;
  status: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type ExamAttemptRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  created_at: string | null;
};

type ExamPackageRow = {
  id: string;
  is_published: boolean | null;
  status: string | null;
};

type MonthlyData = {
  bulan: string;
  pendaftar: number;
  pengguna: number;
  pendapatan: number;
};

type PlanRevenue = {
  name: string;
  value: number;
};

type RecentUser = {
  id: string;
  name: string;
  joinedAt: string;
  plan: string;
};

type RecentTransaction = {
  id: string;
  userName: string;
  amount: number;
  status: string;
  createdAt: string;
};

type OverviewData = {
  profiles: ProfileRow[];
  transactions: TransactionRow[];
  recentTransactions: TransactionRow[];
  attempts: ExamAttemptRow[];
  packages: ExamPackageRow[];
};

const emptyData: OverviewData = {
  profiles: [],
  transactions: [],
  recentTransactions: [],
  attempts: [],
  packages: [],
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getTransactionAmount(transaction: TransactionRow) {
  const amount = Number(
    transaction.amount ?? transaction.gross_amount ?? 0
  );

  return Number.isFinite(amount) ? amount : 0;
}

function getTransactionDate(transaction: TransactionRow) {
  const value = transaction.paid_at || transaction.created_at;

  return value ? new Date(value) : null;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

function isValidDate(date: Date | null): date is Date {
  return date !== null && !Number.isNaN(date.getTime());
}

function isPremiumActive(profile: ProfileRow) {
  if (profile.is_premium) {
    if (!profile.premium_until) return true;

    return new Date(profile.premium_until).getTime() > Date.now();
  }

  return profile.plan?.toLowerCase() === "premium";
}

function getProfileName(profile: ProfileRow) {
  return (
    profile.full_name ||
    profile.name ||
    profile.email ||
    "Pengguna GradeUp"
  );
}

// =====================================================
// HALAMAN OVERVIEW ADMIN
// =====================================================

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===================================================
  // MEMUAT DATA DASHBOARD
  // ===================================================

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      const sixMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        1
      );

      const thirtyDaysAgo = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      );

      // Mengambil data dasar dan daftar transaksi
      // yang memiliki Merchant Code Production.
      const [
        profilesResult,
        packagesResult,
        attemptsResult,
        productionPaymentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, name, email, role, plan, is_premium, premium_until, created_at"
          )
          .eq("role", "student"),

        supabase
          .from("exam_packages")
          .select("id, is_published, status"),

        supabase
          .from("exam_attempts")
          .select("id, user_id, status, created_at")
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString()),

        supabase
          .from("payment_transactions")
          .select("merchant_order_id")
          .filter(
            "raw_response->>merchantCode",
            "eq",
            DUITKU_PRODUCTION_MERCHANT_CODE
          ),
      ]);

      // Validasi hasil query dasar.
      if (profilesResult.error) {
        throw new Error(
          `Gagal mengambil data pengguna: ${profilesResult.error.message}`
        );
      }

      if (packagesResult.error) {
        throw new Error(
          `Gagal mengambil paket ujian: ${packagesResult.error.message}`
        );
      }

      if (attemptsResult.error) {
        throw new Error(
          `Gagal mengambil aktivitas siswa: ${attemptsResult.error.message}`
        );
      }

      if (productionPaymentsResult.error) {
        throw new Error(
          `Gagal memverifikasi transaksi Production: ${productionPaymentsResult.error.message}`
        );
      }

      // Mengambil Order ID transaksi Production saja.
      const productionOrderIds = [
        ...new Set(
          (productionPaymentsResult.data || [])
            .map((payment: any) => payment.merchant_order_id)
            .filter(
              (orderId: string | null): orderId is string =>
                Boolean(orderId)
            )
        ),
      ];

      let productionTransactions: TransactionRow[] = [];
      let recentProductionTransactions: TransactionRow[] = [];

      // Jika belum ada transaksi Production,
      // dashboard tetap berjalan dengan data transaksi kosong.
      if (productionOrderIds.length > 0) {
        const [
          transactionsResult,
          recentTransactionsResult,
        ] = await Promise.all([
          // Pendapatan: hanya transaksi settlement
          // dari Merchant Code Production.
          supabase
            .from("transactions")
            .select(
              "id, user_id, invoice_number, plan_name, amount, gross_amount, status, payment_method, paid_at, created_at"
            )
            .in("invoice_number", productionOrderIds)
            .eq("status", "settlement")
            .gte("created_at", sixMonthsAgo.toISOString()),

          // Transaksi terbaru: semua status,
          // tetapi hanya transaksi Production.
          supabase
            .from("transactions")
            .select(
              "id, user_id, invoice_number, plan_name, amount, gross_amount, status, payment_method, paid_at, created_at"
            )
            .in("invoice_number", productionOrderIds)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (transactionsResult.error) {
          throw new Error(
            `Gagal mengambil pendapatan: ${transactionsResult.error.message}`
          );
        }

        if (recentTransactionsResult.error) {
          throw new Error(
            `Gagal mengambil transaksi terbaru: ${recentTransactionsResult.error.message}`
          );
        }

        productionTransactions =
          (transactionsResult.data || []) as TransactionRow[];

        recentProductionTransactions =
          (recentTransactionsResult.data || []) as TransactionRow[];
      }

      // Simpan seluruh data dashboard.
      setData({
        profiles: (profilesResult.data || []) as ProfileRow[],
        packages: (packagesResult.data || []) as ExamPackageRow[],
        attempts: (attemptsResult.data || []) as ExamAttemptRow[],
        transactions: productionTransactions,
        recentTransactions: recentProductionTransactions,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat dashboard.";

      console.error("Gagal memuat Overview Admin:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // ===================================================
  // STATISTIK UTAMA
  // ===================================================

  const now = new Date();

  const totalUsers = data.profiles.length;

  const activeStudents = useMemo(() => {
    const activeUserIds = new Set(
      data.attempts
        .map((attempt) => attempt.user_id)
        .filter((id): id is string => Boolean(id))
    );

    return activeUserIds.size;
  }, [data.attempts]);

  const activePremium = useMemo(
    () => data.profiles.filter(isPremiumActive).length,
    [data.profiles]
  );

  const publishedPackages = useMemo(
    () =>
      data.packages.filter(
        (item) =>
          item.is_published === true ||
          item.status?.toLowerCase() === "published"
      ).length,
    [data.packages]
  );

  // ===================================================
  // PENDAPATAN BULAN INI
  // ===================================================

  const currentMonthRevenue = useMemo(() => {
    return data.transactions.reduce((total, transaction) => {
      const date = getTransactionDate(transaction);

      if (
        !isValidDate(date) ||
        getMonthKey(date) !== getMonthKey(now)
      ) {
        return total;
      }

      return total + getTransactionAmount(transaction);
    }, 0);
  }, [data.transactions]);

  // ===================================================
  // DATA GRAFIK BULANAN
  // ===================================================

  const monthlyData = useMemo<MonthlyData[]>(() => {
    const result: MonthlyData[] = [];

    for (let index = 5; index >= 0; index--) {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - index,
        1
      );

      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        1
      );

      const monthKey = getMonthKey(monthDate);

      const newUsers = data.profiles.filter((profile) => {
        if (!profile.created_at) return false;

        const date = new Date(profile.created_at);

        return (
          !Number.isNaN(date.getTime()) &&
          date >= monthDate &&
          date < monthEnd
        );
      }).length;

      const cumulativeUsers = data.profiles.filter((profile) => {
        if (!profile.created_at) return false;

        const date = new Date(profile.created_at);

        return (
          !Number.isNaN(date.getTime()) &&
          date < monthEnd
        );
      }).length;

      const revenue = data.transactions
        .filter((transaction) => {
          const date = getTransactionDate(transaction);

          return (
            isValidDate(date) &&
            getMonthKey(date) === monthKey
          );
        })
        .reduce(
          (total, transaction) =>
            total + getTransactionAmount(transaction),
          0
        );

      result.push({
        bulan: getMonthLabel(monthDate),
        pendaftar: newUsers,
        pengguna: cumulativeUsers,
        pendapatan: revenue,
      });
    }

    return result;
  }, [data.profiles, data.transactions]);

  // ===================================================
  // PENDAPATAN BERDASARKAN PAKET
  // ===================================================

  const revenueByPlan = useMemo<PlanRevenue[]>(() => {
    const grouped = new Map<string, number>();

    data.transactions.forEach((transaction) => {
      const planName = transaction.plan_name || "Paket lainnya";
      const amount = getTransactionAmount(transaction);

      grouped.set(
        planName,
        (grouped.get(planName) || 0) + amount
      );
    });

    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.transactions]);

  // ===================================================
  // REGISTRASI TERBARU
  // ===================================================

  const recentUsers = useMemo<RecentUser[]>(() => {
    return [...data.profiles]
      .sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      })
      .slice(0, 5)
      .map((profile) => ({
        id: profile.id,
        name: getProfileName(profile),
        joinedAt: profile.created_at || "",
        plan: isPremiumActive(profile) ? "Premium" : "Gratis",
      }));
  }, [data.profiles]);

  // ===================================================
  // TRANSAKSI TERBARU
  // ===================================================

  const recentTransactions = useMemo<RecentTransaction[]>(() => {
    const profileMap = new Map(
      data.profiles.map((profile) => [
        profile.id,
        getProfileName(profile),
      ])
    );

    return data.recentTransactions.map((transaction) => ({
      id: transaction.id,
      userName: transaction.user_id
        ? profileMap.get(transaction.user_id) || "Pengguna"
        : "Pengguna",
      amount: getTransactionAmount(transaction),
      status: transaction.status || "pending",
      createdAt:
        transaction.paid_at ||
        transaction.created_at ||
        "",
    }));
  }, [data.profiles, data.recentTransactions]);

  // ===================================================
  // LOADING DAN ERROR
  // ===================================================

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadOverview}
      />
    );
  }

  // ===================================================
  // TAMPILAN OVERVIEW ADMIN
  // ===================================================

  return (
    <div className="relative isolate space-y-6">
      <AdminStyles />

      <div className={cn(heroPanel, "gu-reveal p-4 sm:p-6")}>
        <PanelGlow />

        <PageHeader
          title="Overview Admin"
          description="Pantau kondisi dan perkembangan platform GradeUp secara real-time."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={loadOverview}
              disabled={loading}
              className="gap-2 rounded-xl border-slate-300 bg-white/80 transition-colors duration-300 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-teal-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </Button>
          }
        />
      </div>

      <div
        className={cn(
          panelSurface,
          "gu-reveal gu-reveal-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
            <FileSpreadsheet className="h-4 w-4" />
          </span>

          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              Data dashboard
              <span
                aria-hidden="true"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Terhubung langsung dengan database Supabase
            </p>
          </div>
        </div>

        <Badge variant="outline">
          Diperbarui{" "}
          {now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Badge>
      </div>

      {/* STATISTIK UTAMA */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatFrame>
          <StatCard
            label="Total Pengguna"
            value={totalUsers.toLocaleString("id-ID")}
            icon={Users}
            hint="Siswa terdaftar"
          />
        </StatFrame>

        <StatFrame delay="gu-reveal-1">
          <StatCard
            label="Siswa Aktif"
            value={activeStudents.toLocaleString("id-ID")}
            icon={GraduationCap}
            hint="Mengerjakan ujian dalam 30 hari"
          />
        </StatFrame>

        <StatFrame delay="gu-reveal-2">
          <StatCard
            label="Paket Ujian"
            value={String(data.packages.length)}
            icon={ClipboardList}
            hint={`${publishedPackages} paket dipublikasikan`}
          />
        </StatFrame>

        <StatFrame delay="gu-reveal-2">
          <StatCard
            label="Pendapatan"
            value={formatRupiah(currentMonthRevenue)}
            icon={Wallet}
            hint="Transaksi Production settlement bulan ini"
          />
        </StatFrame>
      </div>

      {/* GRAFIK PENDAFTAR DAN PENDAPATAN */}

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Pertumbuhan Pendaftar"
          description="Jumlah pendaftar baru setiap bulan"
          className={cn("lg:col-span-2", chartSurface)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{
                top: 8,
                right: 12,
                left: -16,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />

              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis {...axisProps} />

              <Tooltip
                {...chartTooltipStyle}
                formatter={(value) => [
                  Number(value).toLocaleString("id-ID"),
                  "Pendaftar baru",
                ]}
              />

              <Bar
                dataKey="pendaftar"
                name="Pendaftar baru"
                fill={CHART_COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pendapatan per Paket"
          description="Komposisi transaksi Production berhasil dalam 6 bulan terakhir"
          className={chartSurface}
        >
          {revenueByPlan.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByPlan}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {revenueByPlan.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        donutColors[index % donutColors.length]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  {...chartTooltipStyle}
                  formatter={(value) =>
                    formatRupiah(Number(value))
                  }
                />

                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-center">
              <div>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Wallet className="h-7 w-7" />
                </span>
                <p className="mt-3 text-sm font-medium">
                  Belum ada transaksi Production
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Data pendapatan akan muncul setelah pembayaran Production berhasil.
                </p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* GRAFIK PERTUMBUHAN PENGGUNA */}

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Pertumbuhan Total Pengguna"
          description="Akumulasi siswa terdaftar selama 6 bulan"
          className={chartSurface}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{
                top: 8,
                right: 8,
                left: -16,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="growthFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={CHART_COLORS.secondary}
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_COLORS.secondary}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />

              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis {...axisProps} />

              <Tooltip
                {...chartTooltipStyle}
                formatter={(value) => [
                  Number(value).toLocaleString("id-ID"),
                  "Total pengguna",
                ]}
              />

              <Area
                type="monotone"
                dataKey="pengguna"
                name="Total pengguna"
                stroke={CHART_COLORS.primary}
                strokeWidth={3}
                fill="url(#growthFill)"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* REGISTRASI TERBARU */}

        <Card className={cn(chartSurface, "overflow-hidden")}>
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-slate-800/40">
            <CardTitle>Registrasi Terbaru</CardTitle>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
            >
              <Link to="/admin/users">Semua</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 ${rowHover}`}
                >
                  <Avatar className="h-9 w-9 ring-2 ring-emerald-200/70 dark:ring-emerald-900/60">
                    <AvatarFallback>
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {user.joinedAt
                        ? formatDate(user.joinedAt)
                        : "Tanggal tidak tersedia"}
                    </p>
                  </div>

                  <Badge
                    variant={
                      user.plan === "Premium"
                        ? "default"
                        : "muted"
                    }
                  >
                    {user.plan}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Users className="h-7 w-7" />
                </span>
                <p className="mt-3 text-sm font-medium">
                  Belum ada siswa
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registrasi siswa akan muncul di sini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TRANSAKSI TERBARU */}

        <Card className={cn(chartSurface, "overflow-hidden")}>
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-slate-800/40">
            <CardTitle>Transaksi Terbaru</CardTitle>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
            >
              <Link to="/admin/transactions">Semua</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between gap-3 ${rowHover}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {transaction.userName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatRupiah(transaction.amount)}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      {transaction.createdAt
                        ? formatDate(transaction.createdAt)
                        : "Tanggal tidak tersedia"}
                    </p>
                  </div>

                  <PaymentBadge
                    status={
                      transaction.status === "settlement"
                        ? "Berhasil"
                        : transaction.status === "pending"
                          ? "Menunggu"
                          : transaction.status === "refund"
                            ? "Refund"
                            : "Gagal"
                    }
                  />
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Wallet className="h-7 w-7" />
                </span>

                <p className="mt-3 text-sm font-medium">
                  Belum ada transaksi Production
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Transaksi Production pengguna akan muncul di sini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KETERANGAN STATISTIK */}

      <div className={cn(insetPanel, "flex items-start gap-3 p-4")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-teal-700 dark:bg-emerald-950 dark:text-emerald-300">
          <AlertCircle className="h-4 w-4" />
        </span>

        <div>
          <p className="text-sm font-medium">
            Keterangan statistik
          </p>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pendapatan dan grafik transaksi hanya menghitung
            transaksi Duitku Production dengan Merchant Code D25895
            yang berstatus settlement. Transaksi Sandbox dan transaksi
            tanpa identitas Merchant Code Production tidak disertakan.
            Siswa aktif adalah siswa unik yang menyelesaikan ujian
            dalam 30 hari terakhir. Paket ujian dihitung dari seluruh
            data exam_packages, sedangkan jumlah paket dipublikasikan
            menggunakan is_published atau status Published.
            Grafik pertumbuhan menampilkan data registrasi, bukan
            jumlah pengunjung website.
          </p>
        </div>
      </div>

      <AdminDecor />
    </div>
  );
}
