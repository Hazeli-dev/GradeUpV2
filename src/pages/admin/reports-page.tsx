import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard, axisProps, chartTooltipStyle } from "@/components/shared/chart-card";
import { DemoBanner } from "@/components/shared/demo-banner";
import { FilterSelect } from "@/components/shared/filter-select";
import { conversionRate, examActivity, revenueMonthly, userGrowth } from "@/data/analytics";
import { downloadCsv } from "@/utils/format";
import { CHART_COLORS } from "@/constants";

const ranges = ["3 bulan terakhir", "6 bulan terakhir"] as const;

export default function AdminReportsPage() {
  const [range, setRange] = useState<string>("6 bulan terakhir");
  const n = range === "3 bulan terakhir" ? 3 : 6;

  const revenue = useMemo(() => revenueMonthly.slice(-n), [n]);
  const growth = useMemo(() => userGrowth.slice(-n), [n]);
  const conversion = useMemo(() => conversionRate.slice(-n), [n]);

  const exportCsv = () => {
    downloadCsv(
      "gradeup-laporan-demo.csv",
      revenue.map((r, i) => ({
        bulan: r.bulan,
        pendapatan_juta_rp: r.pendapatan,
        pengguna: growth[i]?.pengguna ?? "",
        konversi_persen: conversion[i]?.konversi ?? "",
      }))
    );
    toast.success("CSV demo diunduh", { description: "Berisi data contoh, bukan data produksi." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Analitik"
        description="Pendapatan, pertumbuhan pengguna, konversi premium, dan aktivitas ujian."
        actions={
          <>
            <FilterSelect value={range} onChange={setRange} options={[...ranges]} allLabel="Semua periode" className="sm:w-52" />
            <Button variant="outline" onClick={exportCsv}><Download /> Ekspor CSV (demo)</Button>
          </>
        }
      />
      <DemoBanner>Seluruh grafik memakai data contoh. Ekspor CSV hanya menghasilkan data demo.</DemoBanner>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Pendapatan" description="Juta rupiah per bulan">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`Rp${Number(v)} jt`, "Pendapatan"]} />
              <Bar dataKey="pendapatan" radius={[8, 8, 0, 0]} fill={CHART_COLORS.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pertumbuhan Pengguna" description="Total pengguna terdaftar">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="repGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} />
              <Area type="monotone" dataKey="pengguna" name="Pengguna" stroke={CHART_COLORS.primary} strokeWidth={3} fill="url(#repGrowth)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Konversi Premium" description="Persentase pengguna yang upgrade">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conversion} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis unit="%" {...axisProps} />
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v)}%`, "Konversi"]} />
              <Line type="monotone" dataKey="konversi" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.accent }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Aktivitas Ujian" description="Ujian dikerjakan per minggu (bulan ini)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={examActivity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="minggu" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="ujian" name="Ujian" radius={[8, 8, 0, 0]} fill={CHART_COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
