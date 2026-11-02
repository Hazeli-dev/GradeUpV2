import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, GraduationCap, Users, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard, axisProps, chartTooltipStyle } from "@/components/shared/chart-card";
import { DemoBanner } from "@/components/shared/demo-banner";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { PaymentBadge } from "@/components/admin/badges";
import { useAsync } from "@/hooks/use-async";
import { listTransactions, listUsers } from "@/services/admin.service";
import { adminKpis, revenueByPlan, userGrowth, visitors } from "@/data/analytics";
import { formatDate, formatRupiah, initials } from "@/utils/format";
import { CHART_COLORS } from "@/constants";

const donutColors = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent];

export default function AdminOverviewPage() {
  const users = useAsync(listUsers);
  const tx = useAsync(listTransactions);

  if (users.loading || tx.loading) return <PageSkeleton />;
  if (users.error || tx.error) return <ErrorState message={users.error ?? tx.error ?? undefined} onRetry={() => { users.reload(); tx.reload(); }} />;

  const recentUsers = [...(users.data ?? [])].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 5);
  const recentTx = (tx.data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview Admin" description="Ringkasan performa platform GradeUp." />
      <DemoBanner>Seluruh angka dan grafik pada dashboard admin adalah data contoh.</DemoBanner>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pengguna" value={adminKpis.totalUsers.toLocaleString("id-ID")} icon={Users} trend={{ value: "+12,4%", positive: true }} hint="vs bulan lalu" />
        <StatCard label="Siswa Aktif" value={adminKpis.activeStudents.toLocaleString("id-ID")} icon={GraduationCap} trend={{ value: "+8,1%", positive: true }} hint="30 hari" />
        <StatCard label="Paket Ujian" value={String(adminKpis.examPackages)} icon={ClipboardList} hint="terpublikasi & draf" />
        <StatCard label="Pendapatan" value={formatRupiah(adminKpis.revenue)} icon={Wallet} trend={{ value: "+16,0%", positive: true }} hint="bulan ini" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Pengunjung & Pendaftar" description="Oktober 2026" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visitors} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="tanggal" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="pengunjung" name="Pengunjung" stroke={CHART_COLORS.primary} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="pendaftar" name="Pendaftar" stroke={CHART_COLORS.accent} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pendapatan per Paket" description="Komposisi pendapatan">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={revenueByPlan} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                {revenueByPlan.map((_, i) => <Cell key={i} fill={donutColors[i]} />)}
              </Pie>
              <Tooltip {...chartTooltipStyle} formatter={(v) => formatRupiah(Number(v))} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Pertumbuhan Pengguna" description="6 bulan terakhir">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userGrowth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="bulan" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} />
              <Area type="monotone" dataKey="pengguna" name="Pengguna" stroke={CHART_COLORS.primary} strokeWidth={3} fill="url(#growthFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Registrasi Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/users">Semua</Link></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarFallback>{initials(u.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatDate(u.joinedAt)}</p>
                </div>
                <Badge variant={u.plan === "Premium" ? "default" : "muted"}>{u.plan}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Transaksi Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/transactions">Semua</Link></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.userName}</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(t.amount)}</p>
                </div>
                <PaymentBadge status={t.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
