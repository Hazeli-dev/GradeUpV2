
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
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

      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select(
          "id, category, question_text, options, correct_answer, explanation, created_at"
        )
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;

      if (qData) setQuestions(qData as QuestionItem[]);
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

  // Filter pencarian, kategori, dan kunci jawaban.
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
        ),
    [questions, q, category, answerFilter]
  );

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((item) => selectedIds.includes(item.id));

  // Memilih atau membatalkan pilihan satu soal.
  const toggleQuestion = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  };

  // Memilih atau membatalkan semua soal yang sedang tampil.
  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((item) => item.id));

      setSelectedIds((current) =>
        current.filter((id) => !filteredIds.has(id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...filtered.map((item) => item.id)]),
      ]);
    }
  };

  // Mengembalikan semua filter ke kondisi awal.
  const clearFilters = () => {
    setQ("");
    setCategory("all");
    setAnswerFilter("all");
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
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal"
        description="Kelola, cari, unduh, dan hapus kumpulan soal GradeUp."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={downloadQuestionTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Template Excel
            </Button>

            <Button
              variant="outline"
              onClick={downloadBankSoal}
              disabled={loading || filtered.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Bank Soal
            </Button>

            <Label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex h-9 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">
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

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Filter Bank Soal</h3>
            <p className="text-sm text-muted-foreground">
              Temukan soal berdasarkan pertanyaan, kategori, atau kunci jawaban.
            </p>
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

        <div className="grid gap-3 md:grid-cols-3">
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
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

      <Card className="overflow-hidden">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua soal yang tampil"
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
              {filtered.map((item) => (
                <TableRow key={item.id}>
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
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>

                  <TableCell>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
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
        )}
      </Card>

      {/* Dialog Tambah / Edit Soal */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {draft && (
            <>
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

                <Button onClick={save} disabled={saving}>
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
