import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Crown,
  Wallet,
  ClipboardCheck,
  Sparkles,
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Info,
  GraduationCap,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  ChartCard,
  axisProps,
  chartTooltipStyle,
} from "@/components/shared/chart-card";
import { FilterSelect } from "@/components/shared/filter-select";
import { CHART_COLORS } from "@/constants";

const ranges = ["3 bulan terakhir", "6 bulan terakhir"] as const;

type RangeType = (typeof ranges)[number];

type ProfileRow = {
  id: string;
  role: string | null;
  created_at: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
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
  exam_id: string | null;
  score: number | null;
  status: string | null;
  created_at: string | null;
  correct_count: number | null;
  wrong_count: number | null;
  total_questions: number | null;
  is_passed: boolean | null;
};

type MonthlyData = {
  bulan: string;
  pendapatan: number;
  penggunaBaru: number;
  totalPengguna: number;
  transaksiPremium: number;
  ujian: number;
};

type WeeklyData = {
  minggu: string;
  ujian: number;
};

type ReportData = {
  profiles: ProfileRow[];
  transactions: TransactionRow[];
  attempts: ExamAttemptRow[];
};

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  trend?: string;
  trendPositive?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

function getMonday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  return result;
}

function getWeekKey(date: Date) {
  return getMonday(date).toISOString().slice(0, 10);
}

function getWeekLabel(date: Date) {
  return getMonday(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function getTransactionAmount(transaction: TransactionRow) {
  const amount = Number(
    transaction.amount ?? transaction.gross_amount ?? 0
  );

  return Number.isFinite(amount) ? amount : 0;
}

function getTransactionDate(transaction: TransactionRow) {
  const date = transaction.paid_at || transaction.created_at;

  return date ? new Date(date) : null;
}

function getAttemptDate(attempt: ExamAttemptRow) {
  return attempt.created_at ? new Date(attempt.created_at) : null;
}

function isValidDate(date: Date | null): date is Date {
  return date !== null && !Number.isNaN(date.getTime());
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  trend,
  trendPositive = true,
}: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.07] blur-2xl ${color}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-bold tracking-tight md:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} bg-opacity-10`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {trend && (
        <div className="relative mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3">
          {trendPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          )}

          <span
            className={`text-xs font-semibold ${
              trendPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend}
          </span>

          <span className="text-xs text-muted-foreground">
            dibandingkan periode sebelumnya
          </span>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function BadgePeriod({ range }: { range: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
      <CalendarDays className="h-3.5 w-3.5" />
      {range}
    </Badge>
  );
}

export default function AdminReportsPage() {
  const [range, setRange] = useState<RangeType>("6 bulan terakhir");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ReportData>({
    profiles: [],
    transactions: [],
    attempts: [],
  });

  const monthCount = range === "3 bulan terakhir" ? 3 : 6;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      const firstMonth = new Date(
        now.getFullYear(),
        now.getMonth() - monthCount + 1,
        1
      );

      const weeklyStart = getMonday(now);
      weeklyStart.setDate(weeklyStart.getDate() - 6 * 7);

      const activityStart =
        firstMonth < weeklyStart ? firstMonth : weeklyStart;

      const [
        profilesResult,
        transactionsResult,
        attemptsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, role, created_at, is_premium, premium_until"
          )
          .eq("role", "student"),

        supabase
          .from("transactions")
          .select(
            "id, user_id, invoice_number, plan_name, amount, gross_amount, status, payment_method, paid_at, created_at"
          )
          .eq("status", "settlement"),

        supabase
          .from("exam_attempts")
          .select(
            "id, user_id, exam_id, score, status, created_at, correct_count, wrong_count, total_questions, is_passed"
          )
          .eq("status", "completed")
          .gte("created_at", activityStart.toISOString()),
      ]);

      if (profilesResult.error) {
        throw new Error(
          `Gagal mengambil data pengguna: ${profilesResult.error.message}`
        );
      }

      if (transactionsResult.error) {
        throw new Error(
          `Gagal mengambil transaksi: ${transactionsResult.error.message}`
        );
      }

      if (attemptsResult.error) {
        throw new Error(
          `Gagal mengambil aktivitas ujian: ${attemptsResult.error.message}`
        );
      }

      setData({
        profiles: (profilesResult.data || []) as ProfileRow[],
        transactions: (transactionsResult.data ||
          []) as TransactionRow[],
        attempts: (attemptsResult.data || []) as ExamAttemptRow[],
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil laporan.";

      setError(message);
      toast.error("Gagal memuat laporan", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [monthCount]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const now = new Date();

  const monthly = useMemo<MonthlyData[]>(() => {
    const result: MonthlyData[] = [];

    for (let index = monthCount - 1; index >= 0; index--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - index,
        1
      );

      const key = getMonthKey(date);
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1
      );

      const monthlyTransactions = data.transactions.filter(
        (transaction) => {
          const transactionDate = getTransactionDate(transaction);

          return (
            isValidDate(transactionDate) &&
            getMonthKey(transactionDate) === key
          );
        }
      );

      const monthlyProfiles = data.profiles.filter((profile) => {
        if (!profile.created_at) return false;

        const createdAt = new Date(profile.created_at);

        return (
          isValidDate(createdAt) &&
          createdAt >= date &&
          createdAt < monthEnd
        );
      });

      const monthlyAttempts = data.attempts.filter((attempt) => {
        const attemptDate = getAttemptDate(attempt);

        return (
          isValidDate(attemptDate) &&
          getMonthKey(attemptDate) === key
        );
      });

      const cumulativeUsers = data.profiles.filter((profile) => {
        if (!profile.created_at) return false;

        const createdAt = new Date(profile.created_at);

        return isValidDate(createdAt) && createdAt < monthEnd;
      }).length;

      result.push({
        bulan: getMonthLabel(date),
        pendapatan: monthlyTransactions.reduce(
          (total, transaction) =>
            total + getTransactionAmount(transaction),
          0
        ),
        penggunaBaru: monthlyProfiles.length,
        totalPengguna: cumulativeUsers,
        transaksiPremium: monthlyTransactions.length,
        ujian: monthlyAttempts.length,
      });
    }

    return result;
  }, [data, monthCount]);

  const weekly = useMemo<WeeklyData[]>(() => {
    const result: WeeklyData[] = [];

    const currentMonday = getMonday(now);

    for (let index = 6; index >= 0; index--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(weekStart.getDate() - index * 7);

      const weekKey = getWeekKey(weekStart);

      const count = data.attempts.filter((attempt) => {
        const attemptDate = getAttemptDate(attempt);

        return (
          isValidDate(attemptDate) &&
          getWeekKey(attemptDate) === weekKey
        );
      }).length;

      result.push({
        minggu: getWeekLabel(weekStart),
        ujian: count,
      });
    }

    return result;
  }, [data.attempts]);

  const totalRevenue = useMemo(
    () =>
      monthly.reduce(
        (total, item) => total + item.pendapatan,
        0
      ),
    [monthly]
  );

  const totalUsers = data.profiles.length;

  const activePremium = useMemo(() => {
    const currentTime = Date.now();

    return data.profiles.filter((profile) => {
      if (!profile.is_premium) return false;

      if (!profile.premium_until) return true;

      return new Date(profile.premium_until).getTime() > currentTime;
    }).length;
  }, [data.profiles]);

  const premiumRate = totalUsers
    ? (activePremium / totalUsers) * 100
    : 0;

  const totalTransactions = monthly.reduce(
    (total, item) => total + item.transaksiPremium,
    0
  );

  const totalExamActivity = weekly.reduce(
    (total, item) => total + item.ujian,
    0
  );

  const averageRevenue = monthly.length
    ? totalRevenue / monthly.length
    : 0;

  const latestRevenue = monthly[monthly.length - 1];
  const previousRevenue = monthly[monthly.length - 2];

  const revenueChange =
    latestRevenue &&
    previousRevenue &&
    previousRevenue.pendapatan > 0
      ? ((latestRevenue.pendapatan -
          previousRevenue.pendapatan) /
          previousRevenue.pendapatan) *
        100
      : null;

  const latestMonth = monthly[monthly.length - 1];
  const previousMonth = monthly[monthly.length - 2];

  const userIncrease =
    latestMonth && previousMonth
      ? latestMonth.penggunaBaru - previousMonth.penggunaBaru
      : null;

  const transactionChange =
    latestMonth && previousMonth
      ? latestMonth.transaksiPremium -
        previousMonth.transaksiPremium
      : null;

  const averageWeeklyExam = weekly.length
    ? totalExamActivity / weekly.length
    : 0;

  const insights = useMemo(() => {
    const items: {
      icon: LucideIcon;
      title: string;
      description: string;
    }[] = [];

    if (revenueChange !== null) {
      items.push({
        icon: revenueChange >= 0 ? TrendingUp : TrendingDown,
        title:
          revenueChange >= 0
            ? "Pendapatan mengalami peningkatan"
            : "Pendapatan mengalami penurunan",
        description: `Pendapatan bulan terakhir ${
          revenueChange >= 0 ? "naik" : "turun"
        } ${Math.abs(revenueChange).toFixed(
          1
        )}% dibandingkan bulan sebelumnya.`,
      });
    }

    if (userIncrease !== null) {
      items.push({
        icon: Users,
        title: "Pertumbuhan pengguna",
        description: `Jumlah pengguna baru pada bulan terakhir ${
          userIncrease >= 0 ? "bertambah" : "berkurang"
        } ${formatNumber(Math.abs(userIncrease))} dibandingkan bulan sebelumnya.`,
      });
    }

    items.push({
      icon: Crown,
      title: "Keanggotaan Premium",
      description: `Saat ini terdapat ${formatNumber(
        activePremium
      )} siswa dengan Premium aktif, yaitu ${premiumRate.toFixed(
        1
      )}% dari total pengguna.`,
    });

    items.push({
      icon: ClipboardCheck,
      title: "Aktivitas evaluasi",
      description: `Terdapat ${formatNumber(
        totalExamActivity
      )} ujian selesai dalam tujuh minggu terakhir.`,
    });

    return items;
  }, [
    revenueChange,
    userIncrease,
    activePremium,
    premiumRate,
    totalExamActivity,
  ]);

  const exportExcel = () => {
    if (!monthly.length) {
      toast.error("Belum ada data laporan untuk diekspor.");
      return;
    }

    setExporting(true);

    try {
      const workbook = XLSX.utils.book_new();

      // SHEET 1: RINGKASAN
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["LAPORAN ANALITIK GRADEUP"],
        ["Tanggal Ekspor", new Date().toLocaleString("id-ID")],
        ["Periode", range],
        [],
        ["INDIKATOR", "NILAI"],
        ["Total Pengguna", totalUsers],
        ["Premium Aktif", activePremium],
        ["Persentase Premium", `${premiumRate.toFixed(1)}%`],
        ["Total Pendapatan", totalRevenue],
        ["Rata-rata Pendapatan Bulanan", averageRevenue],
        ["Transaksi Settlement", totalTransactions],
        ["Aktivitas Ujian 7 Minggu", totalExamActivity],
      ]);

      summarySheet["!cols"] = [
        { wch: 38 },
        { wch: 28 },
      ];

      ["B9", "B10"].forEach((cellAddress) => {
        const cell = summarySheet[cellAddress];

        if (cell) {
          cell.z = '"Rp" #,##0';
        }
      });

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Ringkasan"
      );

      // SHEET 2: DATA BULANAN
      const monthlySheet = XLSX.utils.json_to_sheet(
        monthly.map((item) => ({
          Bulan: item.bulan,
          Pendapatan_Rupiah: item.pendapatan,
          Pengguna_Baru: item.penggunaBaru,
          Total_Pengguna_Kumulatif: item.totalPengguna,
          Transaksi_Settlement: item.transaksiPremium,
          Ujian_Selesai: item.ujian,
        }))
      );

      monthlySheet["!cols"] = [
        { wch: 18 },
        { wch: 24 },
        { wch: 18 },
        { wch: 30 },
        { wch: 24 },
        { wch: 18 },
      ];

      for (let row = 2; row <= monthly.length + 1; row++) {
        const cell = monthlySheet[`B${row}`];

        if (cell) {
          cell.z = '"Rp" #,##0';
        }
      }

      monthlySheet["!autofilter"] = {
        ref: `A1:F${monthly.length + 1}`,
      };

      XLSX.utils.book_append_sheet(
        workbook,
        monthlySheet,
        "Data Bulanan"
      );

      // SHEET 3: AKTIVITAS MINGGUAN
      const weeklySheet = XLSX.utils.json_to_sheet(
        weekly.map((item) => ({
          Minggu_Mulai: item.minggu,
          Ujian_Selesai: item.ujian,
        }))
      );

      weeklySheet["!cols"] = [
        { wch: 22 },
        { wch: 20 },
      ];

      weeklySheet["!autofilter"] = {
        ref: `A1:B${weekly.length + 1}`,
      };

      XLSX.utils.book_append_sheet(
        workbook,
        weeklySheet,
        "Aktivitas Mingguan"
      );

      // SHEET 4: DETAIL TRANSAKSI BERHASIL
      const successfulTransactions = data.transactions
        .filter((transaction) => {
          const date = getTransactionDate(transaction);

          return (
            isValidDate(date) &&
            date >= new Date(
              now.getFullYear(),
              now.getMonth() - monthCount + 1,
              1
            )
          );
        })
        .map((transaction) => ({
          Nomor_Invoice: transaction.invoice_number || "-",
          Nama_Paket: transaction.plan_name || "-",
          Jumlah_Rupiah: getTransactionAmount(transaction),
          Metode_Pembayaran: transaction.payment_method || "-",
          Tanggal_Pembayaran: getTransactionDate(transaction)
            ? getTransactionDate(transaction)!.toLocaleString("id-ID")
            : "-",
          Status: transaction.status || "-",
        }));

      const transactionSheet = XLSX.utils.json_to_sheet(
        successfulTransactions
      );

      transactionSheet["!cols"] = [
        { wch: 28 },
        { wch: 24 },
        { wch: 22 },
        { wch: 24 },
        { wch: 28 },
        { wch: 18 },
      ];

      for (
        let row = 2;
        row <= successfulTransactions.length + 1;
        row++
      ) {
        const cell = transactionSheet[`C${row}`];

        if (cell) {
          cell.z = '"Rp" #,##0';
        }
      }

      XLSX.utils.book_append_sheet(
        workbook,
        transactionSheet,
        "Transaksi Berhasil"
      );

      XLSX.writeFile(
        workbook,
        `GradeUp-Laporan-Analitik-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );

      toast.success("Laporan Excel berhasil dibuat", {
        description:
          "File berisi ringkasan, data bulanan, aktivitas ujian, dan transaksi berhasil.",
      });
    } catch (err) {
      console.error("Excel export error:", err);

      toast.error("Gagal membuat file Excel", {
        description:
          "Silakan coba kembali beberapa saat lagi.",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportExamExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const examDetails = data.attempts
        .filter((attempt) => {
          const date = getAttemptDate(attempt);

          return (
            isValidDate(date) &&
            date >= getMonday(new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              new Date().getDate()
            ))
              ? false
              : true
          );
        })
        .map((attempt) => ({
          Tanggal: attempt.created_at
            ? new Date(attempt.created_at).toLocaleString("id-ID")
            : "-",
          ID_Siswa: attempt.user_id || "-",
          ID_Ujian: attempt.exam_id || "-",
          Nilai: attempt.score ?? 0,
          Jawaban_Benar: attempt.correct_count ?? 0,
          Jawaban_Salah: attempt.wrong_count ?? 0,
          Total_Soal: attempt.total_questions ?? 0,
          Status_Kelulusan:
            attempt.is_passed === null
              ? "Belum diketahui"
              : attempt.is_passed
                ? "Lulus"
                : "Belum lulus",
          Status: attempt.status || "-",
        }));

      const detailSheet = XLSX.utils.json_to_sheet(examDetails);

      detailSheet["!cols"] = [
        { wch: 24 },
        { wch: 38 },
        { wch: 38 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        "Detail Ujian"
      );

      const weeklySheet = XLSX.utils.json_to_sheet(
        weekly.map((item) => ({
          Minggu_Mulai: item.minggu,
          Ujian_Selesai: item.ujian,
        }))
      );

      weeklySheet["!cols"] = [
        { wch: 22 },
        { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        weeklySheet,
        "Rekap Mingguan"
      );

      XLSX.writeFile(
        workbook,
        `GradeUp-Aktivitas-Ujian-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );

      toast.success("Aktivitas ujian berhasil diekspor ke Excel.");
    } catch (err) {
      console.error("Exam Excel export error:", err);

      toast.error("Gagal mengekspor aktivitas ujian.");
    }
  };

  const latestRevenueValue = latestRevenue?.pendapatan ?? 0;

  return (
    <div className="min-h-full space-y-6 p-4 md:space-y-8 md:p-6">
      <PageHeader
        title="Laporan & Analitik"
        description="Pantau perkembangan bisnis, pengguna, keanggotaan Premium, dan aktivitas pembelajaran GradeUp."
        actions={
          <>
            <FilterSelect
              value={range}
              onChange={(value) => setRange(value as RangeType)}
              options={[...ranges]}
              allLabel="Semua periode"
              className="sm:w-52"
            />

            <Button
              variant="outline"
              onClick={loadReports}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Muat Ulang
            </Button>

            <Button
              onClick={exportExcel}
              disabled={loading || exporting || !!error}
              className="gap-2"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {exporting ? "Membuat Excel..." : "Ekspor Excel"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Periode analisis
          </span>
        </div>

        <BadgePeriod range={range} />
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

            <div>
              <p className="text-sm font-semibold text-rose-600">
                Data laporan gagal dimuat
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {error}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadReports}
            disabled={loading}
            className="shrink-0 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary" />

          <p className="mt-3 text-sm font-semibold">
            Mengambil data laporan...
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Menghubungkan statistik dengan database GradeUp.
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <section>
            <div className="mb-4 flex items-center gap-2">
              <ChartNoAxesCombined className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                Ringkasan Performa
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total Pendapatan"
                value={formatCurrency(totalRevenue)}
                description={`Akumulasi ${monthly.length} bulan`}
                icon={Wallet}
                color="bg-emerald-500 text-emerald-600"
                trend={
                  revenueChange !== null
                    ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`
                    : undefined
                }
                trendPositive={
                  revenueChange === null || revenueChange >= 0
                }
              />

              <MetricCard
                title="Total Pengguna"
                value={formatNumber(totalUsers)}
                description="Total siswa terdaftar"
                icon={Users}
                color="bg-blue-500 text-blue-600"
                trend={
                  userIncrease !== null
                    ? `${userIncrease >= 0 ? "+" : ""}${formatNumber(userIncrease)} siswa baru`
                    : undefined
                }
              />

              <MetricCard
                title="Premium Aktif"
                value={formatNumber(activePremium)}
                description={`${premiumRate.toFixed(1)}% dari total siswa`}
                icon={Crown}
                color="bg-amber-500 text-amber-600"
              />

              <MetricCard
                title="Aktivitas Ujian"
                value={formatNumber(totalExamActivity)}
                description="Ujian selesai dalam 7 minggu"
                icon={ClipboardCheck}
                color="bg-violet-500 text-violet-600"
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                Analisis Pendapatan
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Rata-rata pendapatan
                </p>

                <p className="mt-3 break-words text-2xl font-bold">
                  {formatCurrency(averageRevenue)}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  Rata-rata per bulan dalam periode terpilih
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Pendapatan bulan terakhir
                </p>

                <p className="mt-3 break-words text-2xl font-bold">
                  {formatCurrency(latestRevenueValue)}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  {latestRevenue?.bulan || "Belum tersedia"}
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Perubahan pendapatan
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {revenueChange !== null && revenueChange < 0 ? (
                    <TrendingDown className="h-6 w-6 text-rose-600" />
                  ) : (
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  )}

                  <p className="text-2xl font-bold">
                    {revenueChange === null
                      ? "-"
                      : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`}
                  </p>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Dibandingkan bulan sebelumnya
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                Visualisasi Data
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard
                title="Pendapatan Bulanan"
                description="Pendapatan dari transaksi yang berhasil dibayar"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthly}
                    margin={{
                      top: 12,
                      right: 8,
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
                    <YAxis
                      {...axisProps}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat("id-ID", {
                          notation: "compact",
                        }).format(Number(value))
                      }
                    />

                    <Tooltip
                      {...chartTooltipStyle}
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        "Pendapatan",
                      ]}
                    />

                    <Bar
                      dataKey="pendapatan"
                      name="Pendapatan"
                      radius={[8, 8, 0, 0]}
                      fill={CHART_COLORS.secondary}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Pertumbuhan Pengguna"
                description="Jumlah pengguna baru setiap bulan"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthly}
                    margin={{
                      top: 12,
                      right: 8,
                      left: -16,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="repGrowth"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART_COLORS.secondary}
                          stopOpacity={0.4}
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
                        formatNumber(Number(value)),
                        "Pengguna baru",
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="penggunaBaru"
                      name="Pengguna baru"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#repGrowth)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Transaksi Premium Berhasil"
                description="Jumlah pembayaran dengan status settlement"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthly}
                    margin={{
                      top: 12,
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
                        formatNumber(Number(value)),
                        "Transaksi berhasil",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="transaksiPremium"
                      name="Transaksi berhasil"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: CHART_COLORS.accent,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Aktivitas Ujian"
                description="Jumlah ujian yang diselesaikan per minggu"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weekly}
                    margin={{
                      top: 12,
                      right: 8,
                      left: -16,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />

                    <XAxis dataKey="minggu" {...axisProps} />
                    <YAxis {...axisProps} />

                    <Tooltip
                      {...chartTooltipStyle}
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        "Ujian selesai",
                      ]}
                    />

                    <Bar
                      dataKey="ujian"
                      name="Ujian selesai"
                      radius={[8, 8, 0, 0]}
                      fill={CHART_COLORS.primary}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    Ringkasan Keanggotaan Premium
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Status Premium siswa saat ini
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Crown className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold">
                      {premiumRate.toFixed(1)}%
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Persentase Premium aktif
                    </p>
                  </div>

                  <Badge variant="outline">
                    {formatNumber(activePremium)} Premium
                  </Badge>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, premiumRate)}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total siswa
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {formatNumber(totalUsers)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Pengguna reguler
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {formatNumber(
                        Math.max(0, totalUsers - activePremium)
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Premium aktif dihitung dari status is_premium dan
                  tanggal premium_until pada profil siswa.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    Aktivitas Pembelajaran
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Ringkasan aktivitas evaluasi mingguan
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6">
                <p className="text-3xl font-bold">
                  {formatNumber(totalExamActivity)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Total ujian selesai dalam tujuh minggu terakhir
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Jumlah minggu
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {weekly.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Rata-rata mingguan
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {formatNumber(Math.round(averageWeeklyExam))}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full gap-2"
                  onClick={exportExamExcel}
                  disabled={!data.attempts.length}
                >
                  <Download className="h-4 w-4" />
                  Ekspor Aktivitas Ujian Excel
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-semibold">
                  Insight Analitik
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Ringkasan otomatis berdasarkan data aktual Supabase
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((item, index) => (
                <InsightCard
                  key={`${item.title}-${index}`}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">
                  Ekspor Laporan GradeUp
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Unduh laporan dalam format Excel (.xlsx) yang
                  dapat dibuka dan diedit menggunakan Microsoft Excel
                  maupun Google Sheets.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    "Ringkasan performa",
                    "Data pendapatan bulanan",
                    "Pertumbuhan pengguna",
                    "Aktivitas ujian mingguan",
                    "Detail transaksi berhasil",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-5 gap-2"
                  onClick={exportExcel}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                  Unduh Laporan Excel
                </Button>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-sm font-medium">
                Tentang laporan ini
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pendapatan hanya menghitung transaksi dengan status
                settlement. Transaksi pending, failed, dan expire
                tidak dimasukkan. Total pengguna berasal dari profil
                dengan role student. Aktivitas ujian menghitung
                exam_attempts dengan status completed. Grafik
                transaksi Premium menunjukkan jumlah pembayaran
                berhasil, bukan konversi historis pengguna.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
