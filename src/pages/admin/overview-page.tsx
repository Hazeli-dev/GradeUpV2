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

const donutColors = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
];

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

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const [
        profilesResult,
        packagesResult,
        attemptsResult,
        transactionsResult,
        recentTransactionsResult,
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
          .from("transactions")
          .select(
            "id, user_id, invoice_number, plan_name, amount, gross_amount, status, payment_method, paid_at, created_at"
          )
          .eq("status", "settlement")
          .gte("created_at", sixMonthsAgo.toISOString()),

        supabase
          .from("transactions")
          .select(
            "id, user_id, invoice_number, plan_name, amount, gross_amount, status, payment_method, paid_at, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

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

      setData({
        profiles: (profilesResult.data || []) as ProfileRow[],
        packages: (packagesResult.data || []) as ExamPackageRow[],
        attempts: (attemptsResult.data || []) as ExamAttemptRow[],
        transactions: (transactionsResult.data ||
          []) as TransactionRow[],
        recentTransactions: (recentTransactionsResult.data ||
          []) as TransactionRow[],
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat dashboard.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview Admin"
        description="Pantau kondisi dan perkembangan platform GradeUp secara real-time."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadOverview}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">
              Data dashboard
            </p>
            <p className="text-xs text-muted-foreground">
              Terhubung langsung dengan database Supabase
            </p>
          </div>
        </div>

        <Badge variant="outline">
          Diperbarui {now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={totalUsers.toLocaleString("id-ID")}
          icon={Users}
          hint="Siswa terdaftar"
        />

        <StatCard
          label="Siswa Aktif"
          value={activeStudents.toLocaleString("id-ID")}
          icon={GraduationCap}
          hint="Mengerjakan ujian dalam 30 hari"
        />

        <StatCard
          label="Paket Ujian"
          value={String(data.packages.length)}
          icon={ClipboardList}
          hint={`${publishedPackages} paket dipublikasikan`}
        />

        <StatCard
          label="Pendapatan"
          value={formatRupiah(currentMonthRevenue)}
          icon={Wallet}
          hint="Transaksi settlement bulan ini"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Pertumbuhan Pendaftar"
          description="Jumlah pendaftar baru setiap bulan"
          className="lg:col-span-2"
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
          description="Komposisi transaksi berhasil dalam 6 bulan terakhir"
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
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  Belum ada transaksi berhasil
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Data pendapatan akan muncul setelah pembayaran settlement.
                </p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Pertumbuhan Total Pengguna"
          description="Akumulasi siswa terdaftar selama 6 bulan"
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

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Registrasi Terbaru</CardTitle>

            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/users">Semua</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-9 w-9">
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
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  Belum ada siswa
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registrasi siswa akan muncul di sini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Transaksi Terbaru</CardTitle>

            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/transactions">Semua</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3"
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

                  <PaymentBadge status={transaction.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />

                <p className="mt-2 text-sm font-medium">
                  Belum ada transaksi
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Transaksi pengguna akan muncul di sini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        <div>
          <p className="text-sm font-medium">
            Keterangan statistik
          </p>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pendapatan hanya menghitung transaksi settlement.
            Siswa aktif adalah siswa unik yang menyelesaikan ujian
            dalam 30 hari terakhir. Paket ujian dihitung dari seluruh
            data exam_packages, sedangkan jumlah paket dipublikasikan
            menggunakan is_published atau status Published.
            Grafik pertumbuhan menampilkan data registrasi, bukan
            jumlah pengunjung website.
          </p>
        </div>
      </div>
    </div>
  );
}
