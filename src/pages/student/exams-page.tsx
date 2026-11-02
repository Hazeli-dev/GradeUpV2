import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ExamCard } from "@/components/shared/exam-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIFFICULTIES } from "@/constants";
import { supabase } from "@/lib/supabase";
import type { ExamPackage } from "@/types";

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [access, setAccess] = useState("semua");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Categories
      const { data: catData } = await supabase.from("categories").select("id, name").order("name");
      if (catData) setCategories(catData);

      // 2. Fetch Exam Packages yang Published
      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("*")
        .eq("status", "Published")
        .order("created_at", { ascending: false });

      if (examErr) throw examErr;

      // Safe Mapping agar ExamCard tidak crash
      const safeMappedExams: ExamPackage[] = (examData || []).map((e: any) => ({
        id: e.id,
        title: e.title || "Tanpa Judul",
        description: e.description || "Belum ada deskripsi.",
        category: e.category || "Umum",
        level: e.level || "SMA",
        difficulty: e.difficulty || "Sedang",
        duration: Number(e.duration) || 30,
        questionCount: Number(e.question_count || e.questionCount) || 0,
        participants: Number(e.participants) || 0,
        premium: Boolean(e.premium),
        status: e.status || "Published",
        questionIds: e.questionIds || [],
      }));

      setExams(safeMappedExams);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar ujian.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(
    () =>
      exams
        .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
        .filter((e) => category === "all" || e.category === category)
        .filter((e) => difficulty === "all" || e.difficulty === difficulty)
        .filter((e) => access === "semua" || (access === "gratis" ? !e.premium : e.premium)),
    [exams, q, category, difficulty, access]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Paket Ujian" description="Pilih paket ujian, baca instruksi, lalu kerjakan dengan timer." />
      <Tabs value={access} onValueChange={setAccess}>
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="gratis">Gratis</TabsTrigger>
          <TabsTrigger value="premium">Premium</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari paket ujian..." className="flex-1" />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={(categories ?? []).map((c) => c.name)}
          allLabel="Semua kategori"
        />
        <FilterSelect
          value={difficulty}
          onChange={setDifficulty}
          options={[...DIFFICULTIES]}
          allLabel="Semua tingkat"
        />
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Paket ujian tidak ditemukan" description="Belum ada ujian yang diterbitkan." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <ExamCard key={e.id} exam={e} actionLabel="Detail" onAction={() => navigate(`/dashboard/exams/${e.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
