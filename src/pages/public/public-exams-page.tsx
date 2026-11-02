import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ExamCard } from "@/components/shared/exam-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { useAsync } from "@/hooks/use-async";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { listExams } from "@/services/catalog.service";
import { DIFFICULTIES, LEVELS } from "@/constants";

export default function PublicExamsPage() {
  const { requireLogin } = useGuestGate();
  const { data, loading, error, reload } = useAsync(listExams);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((e) => e.status === "Published")
        .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
        .filter((e) => level === "all" || e.level === level)
        .filter((e) => difficulty === "all" || e.difficulty === difficulty),
    [data, q, level, difficulty]
  );

  return (
    <section className="container py-14 sm:py-20">
      <SectionHeading eyebrow="Paket Ujian" title="Katalog paket ujian" description="Lihat jenjang, durasi, dan jumlah soal. Masuk untuk mengerjakan." />
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari paket ujian..." className="flex-1" />
        <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
        <FilterSelect value={difficulty} onChange={setDifficulty} options={[...DIFFICULTIES]} allLabel="Semua tingkat" />
      </div>
      <div className="mt-8">
        {loading ? (
          <CardGridSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Paket ujian tidak ditemukan" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <ExamCard key={e.id} exam={e} actionLabel="Mulai" onAction={() => requireLogin(`mengerjakan paket "${e.title}"`)} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Jumlah soal pada paket demo sengaja dibuat singkat untuk keperluan pengujian antarmuka.</p>
    </section>
  );
}
