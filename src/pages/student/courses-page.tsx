import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { CourseCard } from "@/components/shared/course-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { listCategories, listCourses } from "@/services/catalog.service";
import { LEVELS } from "@/constants";

export default function StudentCoursesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(listCourses);
  const { data: categories } = useAsync(listCategories);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.status === "Published")
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => category === "all" || c.category === category)
        .filter((c) => level === "all" || c.level === level),
    [data, q, category, level]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Materi Belajar" description="Pilih materi sesuai jenjang dan mata pelajaran Anda." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari materi..." className="flex-1" />
        <FilterSelect value={category} onChange={setCategory} options={(categories ?? []).map((c) => c.name)} allLabel="Semua kategori" />
        <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
      </div>
      {loading ? (
        <CardGridSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Materi tidak ditemukan" action={<Button variant="outline" onClick={() => { setQ(""); setCategory("all"); setLevel("all"); }}>Reset filter</Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} showProgress onClick={() => navigate(`/dashboard/courses/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
