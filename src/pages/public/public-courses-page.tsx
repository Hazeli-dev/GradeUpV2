import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { CourseCard } from "@/components/shared/course-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { useGuestGate } from "@/hooks/use-guest-gate";
import { listCategories, listCourses } from "@/services/catalog.service";
import { LEVELS } from "@/constants";

export default function PublicCoursesPage() {
  const { requireLogin } = useGuestGate();
  const { data, loading, error, reload } = useAsync(listCourses);
  const { data: categories } = useAsync(listCategories);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.status === "Published")
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => category === "all" || c.category === category)
        .filter((c) => level === "all" || c.level === level),
    [data, q, category, level]
  );

  return (
    <section className="container py-14 sm:py-20">
      <SectionHeading eyebrow="Katalog Materi" title="Jelajahi materi belajar" description="Cari materi berdasarkan kategori dan jenjang. Masuk untuk mulai belajar." />
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari materi..." className="flex-1" />
        <FilterSelect value={category} onChange={setCategory} options={(categories ?? []).map((c) => c.name)} allLabel="Semua kategori" />
        <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
      </div>
      <div className="mt-8">
        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Materi tidak ditemukan" action={<Button variant="outline" onClick={() => { setQ(""); setCategory("all"); setLevel("all"); }}>Reset filter</Button>} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{filtered.length} materi ditemukan</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard key={c.id} course={c} onClick={() => requireLogin(`mempelajari materi "${c.title}"`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
