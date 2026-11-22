import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import * as XLSX from "xlsx";
import {
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";
import { supabase } from "@/lib/supabase";
import {
  downloadQuestionTemplate,
  parseQuestionsExcel,
} from "@/utils/excel-helpers";

interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionItem {
  id: string;
  category: string;
  grade: number | null;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string;
  explanation?: string;
  created_at?: string;
}

type Draft = {
  id?: string;
  category: string;
  question_text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct_answer: string;
  explanation: string;
};

const emptyDraft: Draft = {
  category: "Matematika",
  question_text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correct_answer: "A",
  explanation: "",
};

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.10)] dark:[--gu-line:rgba(52,211,153,0.09)]";

const panelSurface =
  "border border-emerald-200/70 bg-card/90 shadow-[0_16px_44px_-28px_rgba(15,118,110,0.4)] backdrop-blur-sm dark:border-emerald-900/40";

function AdminStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 12px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 40px 40px;
        -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 20%, transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {children}
    </div>
  );
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [answerFilter, setAnswerFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  // Pagination agar tabel tidak merender seluruh soal sekaligus.
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<QuestionItem | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Memuat kategori dan seluruh bank soal dari Supabase.
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (catError) throw catError;
      if (catData) setCategories(catData);

      // Supabase REST membatasi jumlah baris per permintaan.
      // Ambil bertahap supaya semua soal tetap terbaca, bukan hanya 1.000 pertama.
      const batchSize = 500;
      const allQuestions: QuestionItem[] = [];
      let from = 0;

      while (true) {
        const { data: qData, error: qErr } = await supabase
          .from("questions")
          .select(
            "id, category, grade, question_text, options, correct_answer, explanation, created_at"
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + batchSize - 1);

        if (qErr) throw qErr;

        const batch = (qData ?? []) as QuestionItem[];
        allQuestions.push(...batch);

        if (batch.length < batchSize) break;
        from += batchSize;
      }

      setQuestions(allQuestions);
      setCurrentPage(1);
      setSelectedIds([]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data bank soal."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter pencarian, kategori, kunci jawaban, dan kelas.
  const filtered = useMemo(
    () =>
      questions
        .filter((item) =>
          item.question_text.toLowerCase().includes(q.toLowerCase())
        )
        .filter(
          (item) => category === "all" || item.category === category
        )
        .filter(
          (item) =>
            answerFilter === "all" ||
            item.correct_answer === answerFilter
        )
        .filter(
          (item) =>
            gradeFilter === "all" ||
            item.grade === Number(gradeFilter)
        ),
    [questions, q, category, answerFilter, gradeFilter]
  );

  // Tampilkan maksimal 20 soal pada setiap halaman.
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedQuestions = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Kembali ke halaman pertama saat filter pencarian berubah.
  useEffect(() => {
    setCurrentPage(1);
  }, [q, category, answerFilter, gradeFilter]);

  // Jaga agar halaman aktif tetap valid setelah data/filter berubah.
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const allFilteredSelected =
    paginatedQuestions.length > 0 &&
    paginatedQuestions.every((item) => selectedIds.includes(item.id));

  // Memilih atau membatalkan pilihan satu soal.
  const toggleQuestion = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  };

  // Pilih semua hanya pada halaman yang sedang dibuka.
  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const pageIds = new Set(paginatedQuestions.map((item) => item.id));

      setSelectedIds((current) =>
        current.filter((id) => !pageIds.has(id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([
          ...current,
          ...paginatedQuestions.map((item) => item.id),
        ]),
      ]);
    }
  };

  // Mengembalikan semua filter ke kondisi awal.
  const clearFilters = () => {
    setQ("");
    setCategory("all");
    setAnswerFilter("all");
    setGradeFilter("all");
    setSelectedIds([]);
  };

  // Download bank soal sebagai file Excel XLSX asli.
  const downloadBankSoal = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada soal yang bisa diunduh.");
      return;
    }

    try {
      const data = filtered.map((item, index) => ({
        No: index + 1,
        Pertanyaan: item.question_text,
        Kategori: item.category,
        "Pilihan A": item.options?.[0]?.text ?? "",
        "Pilihan B": item.options?.[1]?.text ?? "",
        "Pilihan C": item.options?.[2]?.text ?? "",
        "Pilihan D": item.options?.[3]?.text ?? "",
        "Kunci Jawaban": item.correct_answer,
        Pembahasan: item.explanation ?? "",
        "Tanggal Dibuat": item.created_at
          ? new Date(item.created_at).toLocaleString("id-ID")
          : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);

      // Mengatur lebar kolom agar isi Excel lebih mudah dibaca.
      worksheet["!cols"] = [
        { wch: 7 },
        { wch: 55 },
        { wch: 22 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 16 },
        { wch: 50 },
        { wch: 22 },
      ];

      // Membekukan baris judul dan mengaktifkan filter kolom.
      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
        topLeftCell: "A2",
        activePane: "bottomLeft",
        state: "frozen",
      };

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: data.length, c: 9 },
        }),
      };

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Bank Soal"
      );

      workbook.Props = {
        Title: "Bank Soal GradeUp",
        Subject: "Data Bank Soal",
        Author: "GradeUp",
        CreatedDate: new Date(),
      };

      const date = new Date().toISOString().slice(0, 10);

      XLSX.writeFile(
        workbook,
        `gradeup-bank-soal-${date}.xlsx`
      );

      toast.success(
        `Berhasil mengunduh ${filtered.length} soal dalam format Excel.`
      );
    } catch (err: unknown) {
      toast.error(
        "Gagal membuat file Excel: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan.")
      );
    }
  };

  // Import soal dari file Excel.
  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const parsedQuestions = await parseQuestionsExcel(file);

      if (parsedQuestions.length === 0) {
        toast.error("File Excel tidak berisi data soal yang valid.");
        return;
      }

      const { error: err } = await supabase
        .from("questions")
        .insert(parsedQuestions);

      if (err) throw err;

      toast.success(
        `Berhasil mengimpor ${parsedQuestions.length} soal ke Bank Soal!`
      );

      setSelectedIds([]);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal mengimpor Excel: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan.")
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // Menambah atau memperbarui soal.
  const save = async () => {
    if (!draft) return;

    const e: Record<string, string> = {};

    if (!draft.question_text.trim()) {
      e.question_text = "Pertanyaan wajib diisi.";
    }

    if (!draft.optionA.trim()) e.optionA = "Opsi A wajib diisi.";
    if (!draft.optionB.trim()) e.optionB = "Opsi B wajib diisi.";
    if (!draft.optionC.trim()) e.optionC = "Opsi C wajib diisi.";
    if (!draft.optionD.trim()) e.optionD = "Opsi D wajib diisi.";

    setErrs(e);

    if (Object.keys(e).length > 0) return;

    setSaving(true);

    const optionsPayload = [
      { id: "A", text: draft.optionA.trim() },
      { id: "B", text: draft.optionB.trim() },
      { id: "C", text: draft.optionC.trim() },
      { id: "D", text: draft.optionD.trim() },
    ];

    const payload = {
      category: draft.category,
      question_text: draft.question_text.trim(),
      options: optionsPayload,
      correct_answer: draft.correct_answer,
      explanation: draft.explanation.trim() || null,
    };

    try {
      if (draft.id) {
        const { error: err } = await supabase
          .from("questions")
          .update(payload)
          .eq("id", draft.id);

        if (err) throw err;

        toast.success("Soal berhasil diperbarui.");
      } else {
        const { error: err } = await supabase
          .from("questions")
          .insert([payload]);

        if (err) throw err;

        toast.success("Soal berhasil ditambahkan.");
      }

      setDraft(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menyimpan: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan.")
      );
    } finally {
      setSaving(false);
    }
  };

  // Menghapus satu soal.
  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { error: err } = await supabase
        .from("questions")
        .delete()
        .eq("id", removing.id);

      if (err) throw err;

      toast.success("Soal berhasil dihapus.");

      setSelectedIds((current) =>
        current.filter((id) => id !== removing.id)
      );

      setRemoving(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menghapus: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan.")
      );
    }
  };

  // Menghapus beberapa soal sekaligus.
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeleting(true);

    try {
      const { error: err } = await supabase
        .from("questions")
        .delete()
        .in("id", selectedIds);

      if (err) throw err;

      toast.success(
        `Berhasil menghapus ${selectedIds.length} soal.`
      );

      setSelectedIds([]);
      setBulkDeleteOpen(false);

      await fetchData();
    } catch (err: unknown) {
      toast.error(
        "Gagal menghapus soal: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan.")
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="relative isolate space-y-6">
      <AdminStyles />

      <DecorLayer>
        <div className={`gu-grid absolute inset-0 ${patternLine}`} />
        <div className="gu-drift absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-600/10" />
        <div className="gu-drift-rev absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-600/10" />
      </DecorLayer>

      {/* HEADER */}
      <div className="gu-reveal relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 via-white/70 to-teal-100/70 p-5 shadow-[0_20px_50px_-30px_rgba(15,118,110,0.45)] backdrop-blur-sm dark:border-emerald-900/40 dark:from-emerald-950/60 dark:via-slate-900/60 dark:to-teal-950/50 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
          <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
          <div className="absolute -right-10 top-6 h-40 w-40 rounded-full border border-emerald-400/30 dark:border-emerald-400/10" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/30" />
        </div>

        <div className="relative">
          <PageHeader
            title="Bank Soal"
            description="Kelola, cari, unduh, dan hapus kumpulan soal GradeUp."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={downloadQuestionTemplate}
                  className="gap-2 bg-background/70 backdrop-blur"
                >
                  <Download className="h-4 w-4" />
                  Template Excel
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadBankSoal}
                  disabled={loading || filtered.length === 0}
                  className="gap-2 bg-background/70 backdrop-blur"
                >
                  <Download className="h-4 w-4" />
                  Download Bank Soal
                </Button>

                <Label htmlFor="excel-upload" className="cursor-pointer">
                  <div className="flex h-9 items-center gap-2 rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900">
                    <Upload className="h-4 w-4" />
                    Import Excel
                  </div>

                  <Input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </Label>

                <Button
                  className="shadow-lg shadow-emerald-700/20"
                  onClick={() => {
                    setErrs({});
                    setDraft({ ...emptyDraft });
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Tambah Soal
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {/* FILTER */}
      <Card className={`space-y-4 p-4 ${panelSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <SlidersHorizontal className="h-5 w-5" />
            </span>

            <div>
              <h3 className="font-semibold">Filter Bank Soal</h3>
              <p className="text-sm text-muted-foreground">
                Temukan soal berdasarkan pertanyaan, kategori, kelas, atau kunci jawaban.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reset Filter
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <SearchInput
              value={q}
              onChange={(value) => {
                setQ(value);
                setSelectedIds([]);
              }}
              placeholder="Cari teks soal..."
              className="w-full"
            />
          </div>

          <FilterSelect
            value={category}
            onChange={(value) => {
              setCategory(value);
              setSelectedIds([]);
            }}
            options={categories.map((c) => c.name)}
            allLabel="Semua Mata Pelajaran"
          />

          <Select
            value={gradeFilter}
            onValueChange={(value) => {
              setGradeFilter(value);
              setSelectedIds([]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>

              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (grade) => (
                  <SelectItem key={grade} value={String(grade)}>
                    Kelas {grade}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          <Select
            value={answerFilter}
            onValueChange={(value) => {
              setAnswerFilter(value);
              setSelectedIds([]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Kunci Jawaban" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Semua Kunci Jawaban</SelectItem>
              <SelectItem value="A">Kunci A</SelectItem>
              <SelectItem value="B">Kunci B</SelectItem>
              <SelectItem value="C">Kunci C</SelectItem>
              <SelectItem value="D">Kunci D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 pt-3 dark:border-emerald-900/30">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <strong className="text-foreground">{filtered.length}</strong>{" "}
            dari{" "}
            <strong className="text-foreground">{questions.length}</strong>{" "}
            soal
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">
                {selectedIds.length} soal dipilih
              </Badge>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Terpilih
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Batal Pilih
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* TABEL */}
      <Card className={`overflow-hidden ${panelSurface}`}>
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={fetchData} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Soal tidak ditemukan"
              description="Coba ubah filter atau tambahkan pertanyaan baru."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-emerald-50/80 dark:bg-emerald-950/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua soal pada halaman ini"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                  </TableHead>

                  <TableHead>Pertanyaan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Kunci</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedQuestions.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`transition-colors hover:bg-emerald-50/70 dark:hover:bg-emerald-950/25 ${
                      selectedIds.includes(item.id)
                        ? "bg-emerald-50 dark:bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Pilih soal ${item.question_text}`}
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleQuestion(item.id)}
                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                      />
                    </TableCell>

                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 font-medium">
                        {item.question_text}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Opsi: A. {item.options?.[0]?.text} · B.{" "}
                        {item.options?.[1]?.text}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                      >
                        {item.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge className="bg-emerald-600 text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-700">
                        Opsi {item.correct_answer}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setErrs({});
                              setDraft({
                                id: item.id,
                                category: item.category,
                                question_text: item.question_text,
                                optionA: item.options?.[0]?.text || "",
                                optionB: item.options?.[1]?.text || "",
                                optionC: item.options?.[2]?.text || "",
                                optionD: item.options?.[3]?.text || "",
                                correct_answer: item.correct_answer || "A",
                                explanation: item.explanation || "",
                              });
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setRemoving(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-transparent to-teal-50/60 p-4 dark:border-emerald-900/30 dark:from-emerald-950/25 dark:to-teal-950/20">
                <p className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  <strong className="text-foreground">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>
                  –
                  <strong className="text-foreground">
                    {Math.min(currentPage * pageSize, filtered.length)}
                  </strong>
                  {" dari "}
                  <strong className="text-foreground">{filtered.length}</strong>
                  {" soal"}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Sebelumnya
                  </Button>

                  <span className="whitespace-nowrap rounded-full border border-emerald-200/70 bg-background/70 px-3 py-1 text-sm dark:border-emerald-900/40">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Dialog Tambah / Edit Soal */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-emerald-200/70 dark:border-emerald-900/50">
          {draft && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
              />

              <DialogHeader>
                <DialogTitle>
                  {draft.id ? "Edit Soal" : "Tambah Soal Baru"}
                </DialogTitle>

                <DialogDescription>
                  Isi rincian pertanyaan, pilihan jawaban, dan pembahasan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Kategori Mata Pelajaran</Label>

                  <Select
                    value={draft.category}
                    onValueChange={(v) =>
                      setDraft({ ...draft, category: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="Matematika">
                          Matematika
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="q-text">Teks Pertanyaan</Label>

                  <textarea
                    id="q-text"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Tuliskan pertanyaan soal di sini..."
                    value={draft.question_text}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        question_text: e.target.value,
                      })
                    }
                  />

                  <FieldError message={errs.question_text} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="opt-a">Pilihan A</Label>
                    <Input
                      id="opt-a"
                      value={draft.optionA}
                      onChange={(e) =>
                        setDraft({ ...draft, optionA: e.target.value })
                      }
                    />
                    <FieldError message={errs.optionA} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="opt-b">Pilihan B</Label>
                    <Input
                      id="opt-b"
                      value={draft.optionB}
                      onChange={(e) =>
                        setDraft({ ...draft, optionB: e.target.value })
                      }
                    />
                    <FieldError message={errs.optionB} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="opt-c">Pilihan C</Label>
                    <Input
                      id="opt-c"
                      value={draft.optionC}
                      onChange={(e) =>
                        setDraft({ ...draft, optionC: e.target.value })
                      }
                    />
                    <FieldError message={errs.optionC} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="opt-d">Pilihan D</Label>
                    <Input
                      id="opt-d"
                      value={draft.optionD}
                      onChange={(e) =>
                        setDraft({ ...draft, optionD: e.target.value })
                      }
                    />
                    <FieldError message={errs.optionD} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kunci Jawaban Benar</Label>

                  <Select
                    value={draft.correct_answer}
                    onValueChange={(v) =>
                      setDraft({ ...draft, correct_answer: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="A">Opsi A</SelectItem>
                      <SelectItem value="B">Opsi B</SelectItem>
                      <SelectItem value="C">Opsi C</SelectItem>
                      <SelectItem value="D">Opsi D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="q-exp">Pembahasan (Opsional)</Label>

                  <textarea
                    id="q-exp"
                    className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Penjelasan ringkas kunci jawaban..."
                    value={draft.explanation}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        explanation: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  onClick={save}
                  disabled={saving}
                  className="shadow-lg shadow-emerald-700/20"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan Soal"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus Satu Soal */}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Hapus Soal?"
        description="Soal ini akan dihapus permanen dari Bank Soal Supabase."
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />

      {/* Konfirmasi Hapus Massal */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !bulkDeleting && setBulkDeleteOpen(o)}
        title="Hapus Soal Terpilih?"
        description={`Kamu akan menghapus ${selectedIds.length} soal secara permanen dari Bank Soal. Tindakan ini tidak dapat dibatalkan.`}
        destructive
        confirmLabel={
          bulkDeleting ? "Menghapus..." : "Hapus Semua Terpilih"
        }
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
