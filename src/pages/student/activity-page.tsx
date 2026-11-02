import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, ClipboardCheck, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useAsync } from "@/hooks/use-async";
import { listActivities, listResults } from "@/services/student.service";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types";

const meta: Record<ActivityItem["type"], { icon: typeof BookOpen; label: string }> = {
  exam: { icon: ClipboardCheck, label: "Ujian" },
  course: { icon: BookOpen, label: "Materi" },
  achievement: { icon: Award, label: "Pencapaian" },
  login: { icon: LogIn, label: "Akun" },
};

export default function ActivityPage() {
  const acts = useAsync(listActivities);
  const res = useAsync(listResults);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => (acts.data ?? []).filter((a) => filter === "all" || a.type === filter),
    [acts.data, filter]
  );

  if (acts.loading || res.loading) return <PageSkeleton />;
  if (acts.error || res.error) return <ErrorState message={acts.error ?? res.error ?? undefined} onRetry={() => { acts.reload(); res.reload(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Aktivitas" description="Linimasa belajar dan ujian yang telah Anda selesaikan." />
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="exam">Ujian</TabsTrigger>
          <TabsTrigger value="course">Materi</TabsTrigger>
          <TabsTrigger value="achievement">Pencapaian</TabsTrigger>
          <TabsTrigger value="login">Akun</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Linimasa</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyState title="Belum ada aktivitas" />
            ) : (
              <ol className="relative space-y-6 border-l-2 border-border pl-7">
                {filtered.map((a) => {
                  const M = meta[a.type];
                  return (
                    <li key={a.id} className="relative">
                      <span className={cn("absolute -left-[43px] flex h-9 w-9 items-center justify-center rounded-xl border-4 border-card bg-soft text-primary dark:text-accent")}>
                        <M.icon className="h-4 w-4" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{a.title}</p>
                        <Badge variant="muted">{M.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.date)} · {new Date(a.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Ujian Selesai</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(res.data ?? []).map((r) => (
              <Link key={r.id} to={`/dashboard/results/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.examTitle}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                </span>
                <span className="text-lg font-extrabold">{r.score}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
