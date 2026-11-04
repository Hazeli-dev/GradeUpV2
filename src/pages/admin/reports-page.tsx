
import { useMemo, useState } from "react";
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
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Info,
  Target,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  ChartCard,
  axisProps,
  chartTooltipStyle,
} from "@/components/shared/chart-card";
import { DemoBanner } from "@/components/shared/demo-banner";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  conversionRate,
  examActivity,
  revenueMonthly,
  userGrowth,
} from "@/data/analytics";
import { downloadCsv } from "@/utils/format";
import { CHART_COLORS } from "@/constants";

const ranges = ["3 bulan terakhir", "6 bulan terakhir"] as const;

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
  trendPositive?: boolean;
};

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
          <p className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
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
        <div className="relative mt-4 flex items-center gap-1.5 border-t pt-3">
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
            dari data periode sebelumnya
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
  icon: React.ElementType;
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

export default function AdminReportsPage() {
  const [range, setRange] = useState<string>("6 bulan terakhir");

  const n = range === "3 bulan terakhir" ? 3 : 6;

  const revenue = useMemo(
    () => revenueMonthly.slice(-n),
    [n]
  );

  const growth = useMemo(
    () => userGrowth.slice(-n),
    [n]
  );

  const conversion = useMemo(
    () => conversionRate.slice(-n),
    [n]
  );

  const totalRevenue = useMemo(
    () =>
      revenue.reduce(
        (total, item) => total + Number(item.pendapatan || 0),
        0
      ),
    [revenue]
  );

  const averageRevenue = revenue.length
    ? totalRevenue / revenue.length
    : 0;

  const latestRevenue = revenue.at(-1);
  const previousRevenue = revenue.at(-2);

  const revenueChange =
    latestRevenue && previousRevenue && Number(previousRevenue.pendapatan) > 0
      ? ((Number(latestRevenue.pendapatan) -
          Number(previousRevenue.pendapatan)) /
          Number(previousRevenue.pendapatan)) *
        100
      : null;

  const latestGrowth = growth.at(-1);
  const previousGrowth = growth.at(-2);

  const userIncrease =
    latestGrowth && previousGrowth
      ? Number(latestGrowth.pengguna) -
        Number(previousGrowth.pengguna)
      : null;

  const latestConversion = conversion.at(-1);
  const previousConversion = conversion.at(-2);

  const conversionChange =
    latestConversion && previousConversion
      ? Number(latestConversion.konversi) -
        Number(previousConversion.konversi)
      : null;

  const totalExamActivity = useMemo(
    () =>
      examActivity.reduce(
        (total, item) => total + Number(item.ujian || 0),
        0
      ),
    []
  );

  const averageConversion = useMemo(() => {
    if (!conversion.length) return 0;

    return (
      conversion.reduce(
        (total, item) => total + Number(item.konversi || 0),
        0
      ) / conversion.length
    );
  }, [conversion]);

  const exportCsv = () => {
    downloadCsv(
      "gradeup-laporan-demo.csv",
      revenue.map((item, index) => ({
        bulan: item.bulan,
        pendapatan_juta_rp: item.pendapatan,
        pengguna: growth[index]?.pengguna ?? "",
        konversi_persen: conversion[index]?.konversi ?? "",
      }))
    );

    toast.success("CSV demo berhasil diunduh", {
      description: "File berisi data contoh, bukan data produksi.",
    });
  };

  const exportExamCsv = () => {
    downloadCsv(
      "gradeup-aktivitas-ujian-demo.csv",
      examActivity.map((item) => ({
        minggu: item.minggu,
        jumlah_ujian: item.ujian,
      }))
    );

    toast.success("Data aktivitas ujian berhasil diunduh", {
      description: "File berisi data contoh.",
    });
  };

  const insights = useMemo(() => {
    const items = [];

    if (revenueChange !== null) {
      items.push({
        icon: revenueChange >= 0 ? TrendingUp : TrendingDown,
        title:
          revenueChange >= 0
            ? "Pendapatan mengalami peningkatan"
            : "Pendapatan mengalami penurunan",
        description: `Pendapatan periode terakhir ${
          revenueChange >= 0 ? "naik" : "turun"
        } ${Math.abs(revenueChange).toFixed(1)}% dibandingkan periode sebelumnya.`,
      });
    }

    if (userIncrease !== null) {
      items.push({
        icon: Users,
        title: "Perkembangan pengguna",
        description: `Perubahan jumlah pengguna pada periode terakhir sebesar ${
          userIncrease >= 0 ? "+" : ""
        }${userIncrease.toLocaleString("id-ID")} pengguna.`,
      });
    }

    if (conversionChange !== null) {
      items.push({
        icon: Target,
        title: "Performa konversi Premium",
        description: `Konversi Premium ${
          conversionChange >= 0 ? "meningkat" : "menurun"
        } ${Math.abs(conversionChange).toFixed(1)} poin persentase pada periode terakhir.`,
      });
    }

    items.push({
      icon: ClipboardCheck,
      title: "Aktivitas evaluasi",
      description: `Terdapat ${totalExamActivity.toLocaleString(
        "id-ID"
      )} aktivitas ujian dalam data mingguan yang ditampilkan.`,
    });

    return items;
  }, [
    revenueChange,
    userIncrease,
    conversionChange,
    totalExamActivity,
  ]);

  return (
    <div className="min-h-full space-y-6 p-4 md:space-y-8 md:p-6">
      {/* Header */}
      <PageHeader
        title="Laporan & Analitik"
        description="Pantau perkembangan bisnis, pengguna, keanggotaan Premium, dan aktivitas pembelajaran GradeUp."
        actions={
          <>
            <FilterSelect
              value={range}
              onChange={setRange}
              options={[...ranges]}
              allLabel="Semua periode"
              className="sm:w-52"
            />

            <Button
              variant="outline"
              onClick={exportCsv}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </Button>
          </>
        }
      />

      <DemoBanner>
        Seluruh grafik dan angka pada halaman ini masih menggunakan data
        contoh. Ekspor CSV juga menghasilkan data demo, bukan data produksi.
      </DemoBanner>

      {/* Periode */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Periode analisis
          </span>
        </div>

        <BadgePeriod range={range} />
      </div>

      {/* KPI */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ChartNoAxesCombined className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Ringkasan Performa</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Pendapatan"
            value={`Rp${totalRevenue.toLocaleString("id-ID")} jt`}
            description={`Akumulasi ${revenue.length} bulan`}
            icon={Wallet}
            color="bg-emerald-500 text-emerald-600"
            trend={
              revenueChange !== null
                ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`
                : undefined
            }
            trendPositive={revenueChange === null || revenueChange >= 0}
          />

          <MetricCard
            title="Total Pengguna"
            value={
              latestGrowth
                ? Number(latestGrowth.pengguna).toLocaleString("id-ID")
                : "0"
            }
            description="Akumulasi pengguna terdaftar"
            icon={Users}
            color="bg-blue-500 text-blue-600"
            trend={
              userIncrease !== null
                ? `${userIncrease >= 0 ? "+" : ""}${userIncrease.toLocaleString(
                    "id-ID"
                  )} pengguna`
                : undefined
            }
          />

          <MetricCard
            title="Rata-rata Konversi"
            value={`${averageConversion.toFixed(1)}%`}
            description="Rata-rata konversi Premium"
            icon={Crown}
            color="bg-amber-500 text-amber-600"
            trend={
              conversionChange !== null
                ? `${conversionChange >= 0 ? "+" : ""}${conversionChange.toFixed(
                    1
                  )} poin`
                : undefined
            }
            trendPositive={
              conversionChange === null || conversionChange >= 0
            }
          />

          <MetricCard
            title="Aktivitas Ujian"
            value={totalExamActivity.toLocaleString("id-ID")}
            description="Total aktivitas pada data mingguan"
            icon={ClipboardCheck}
            color="bg-violet-500 text-violet-600"
          />
        </div>
      </section>

      {/* Pendapatan */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Analisis Pendapatan</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Rata-rata pendapatan
            </p>
            <p className="mt-3 text-2xl font-bold">
              Rp{averageRevenue.toFixed(1)} jt
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rata-rata per bulan dalam periode terpilih
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Pendapatan terakhir
            </p>
            <p className="mt-3 text-2xl font-bold">
              Rp{Number(latestRevenue?.pendapatan || 0).toLocaleString(
                "id-ID"
              )} jt
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
                  : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(
                      1
                    )}%`}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Dibandingkan bulan sebelumnya
            </p>
          </div>
        </div>
      </section>

      {/* Grafik utama */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Visualisasi Data</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Pendapatan Bulanan"
            description="Perbandingan pendapatan dalam juta rupiah"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenue}
                margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
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
                    `Rp${Number(value).toLocaleString("id-ID")} jt`,
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
            description="Perkembangan jumlah pengguna terdaftar"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growth}
                margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
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
                <Tooltip {...chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="pengguna"
                  name="Pengguna"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  fill="url(#repGrowth)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Konversi Premium"
            description="Persentase pengguna yang beralih ke Premium"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={conversion}
                margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="bulan" {...axisProps} />
                <YAxis unit="%" {...axisProps} />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)}%`,
                    "Konversi",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="konversi"
                  name="Konversi"
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
            description="Jumlah ujian yang dikerjakan per minggu (data demo)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={examActivity}
                margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
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
                    Number(value).toLocaleString("id-ID"),
                    "Ujian",
                  ]}
                />
                <Bar
                  dataKey="ujian"
                  name="Ujian"
                  radius={[8, 8, 0, 0]}
                  fill={CHART_COLORS.primary}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* Detail indikator */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Ringkasan Konversi Premium</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Indikator berdasarkan periode terpilih
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
                  {averageConversion.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rata-rata konversi
                </p>
              </div>

              <Badge
                variant={
                  conversionChange !== null && conversionChange < 0
                    ? "danger"
                    : "success"
                }
              >
                {conversionChange === null
                  ? "Belum tersedia"
                  : `${conversionChange >= 0 ? "+" : ""}${conversionChange.toFixed(
                      1
                    )} poin`}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {conversion.map((item) => {
                const value = Math.max(
                  0,
                  Math.min(100, Number(item.konversi) || 0)
                );

                return (
                  <div key={item.bulan} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.bulan}
                      </span>
                      <span className="font-semibold">
                        {Number(item.konversi).toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Aktivitas Pembelajaran</h3>
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
              {totalExamActivity.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total aktivitas ujian dalam data contoh
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">
                  Jumlah minggu
                </p>
                <p className="mt-2 text-xl font-bold">
                  {examActivity.length}
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">
                  Rata-rata mingguan
                </p>
                <p className="mt-2 text-xl font-bold">
                  {examActivity.length
                    ? Math.round(
                        totalExamActivity / examActivity.length
                      ).toLocaleString("id-ID")
                    : 0}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full gap-2"
              onClick={exportExamCsv}
            >
              <Download className="h-4 w-4" />
              Ekspor Aktivitas Ujian
            </Button>
          </div>
        </div>
      </section>

      {/* Insight */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Insight Analitik</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ringkasan otomatis berdasarkan data contoh yang tersedia
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

      {/* Catatan */}
      <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Tentang laporan ini
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Halaman ini masih menggunakan sumber data statis dari
            <code className="mx-1 rounded bg-muted px-1 py-0.5">
              @/data/analytics
            </code>
            . Angka pendapatan, pengguna, konversi, dan ujian belum
            terhubung langsung ke transaksi maupun aktivitas aktual
            Supabase. Insight yang ditampilkan merupakan perhitungan
            sederhana, bukan prediksi bisnis.
          </p>
        </div>
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
