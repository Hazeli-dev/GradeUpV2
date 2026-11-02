import { useEffect, useMemo, useState } from "react";
import { Download, MoreHorizontal, Pencil, Plus, Trash2, Upload, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";
import { supabase } from "@/lib/supabase";
import { downloadQuestionTemplate, parseQuestionsExcel } from "@/utils/excel-helpers";

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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<QuestionItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: catData } = await supabase.from("categories").select("id, name").order("name");
      if (catData) setCategories(catData);

      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select("id, category, question_text, options, correct_answer, explanation, created_at")
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      if (qData) setQuestions(qData as QuestionItem[]);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data bank soal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(
    () =>
      questions
        .filter((item) => item.question_text.toLowerCase().includes(q.toLowerCase()))
        .filter((item) => category === "all" || item.category === category),
    [questions, q, category]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsedQuestions = await parseQuestionsExcel(file);

      if (parsedQuestions.length === 0) {
        toast.error("File Excel tidak berisi data soal yang valid.");
        return;
      }

      // Batch Insert ke Supabase
      const { error: err } = await supabase.from("questions").insert(parsedQuestions);

      if (err) throw err;

      toast.success(`Berhasil mengimpor ${parsedQuestions.length} soal ke Bank Soal!`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal mengimpor Excel: " + err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const save = async () => {
    if (!draft) return;
    const e: Record<string, string> = {};

    if (!draft.question_text.trim()) e.question_text = "Pertanyaan wajib diisi.";
    if (!draft.optionA.trim()) e.optionA = "Opsi A wajib diisi.";
    if (!draft.optionB.trim()) e.optionB = "Opsi B wajib diisi.";
    if (!draft.optionC.trim()) e.optionC = "Opsi C wajib diisi.";
    if (!draft.optionD.trim()) e.optionD = "Opsi D wajib diisi.";

    setErrs(e);
    if (Object.keys(e).length) return;

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
        const { error: err } = await supabase.from("questions").update(payload).eq("id", draft.id);
        if (err) throw err;
        toast.success("Soal berhasil diperbarui");
      } else {
        const { error: err } = await supabase.from("questions").insert([payload]);
        if (err) throw err;
        toast.success("Soal berhasil ditambahkan");
      }

      setDraft(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!removing) return;
    try {
      const { error: err } = await supabase.from("questions").delete().eq("id", removing.id);
      if (err) throw err;

      toast.success("Soal berhasil dihapus");
      setRemoving(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal"
        description="Kelola daftar pertanyaan dan pilihan jawaban ujian."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadQuestionTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Template Excel
            </Button>

            <Label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80 h-9">
                <Upload className="h-4 w-4" /> Import Excel
              </div>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </Label>

            <Button onClick={() => { setErrs({}); setDraft(emptyDraft); }}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Soal
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari teks soal..." className="flex-1" />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={categories.map((c) => c.name)}
          allLabel="Semua Kategori"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4"><EmptyState title="Soal tidak ditemukan" description="Tambahkan pertanyaan baru atau import file Excel." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pertanyaan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kunci</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 font-medium">{item.question_text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Opsi: A. {item.options?.[0]?.text} · B. {item.options?.[1]?.text}
                    </p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                      Opsi {item.correct_answer}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
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
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(item)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus
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

      {/* Modal Dialog Form Tambah / Edit */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit Soal" : "Tambah Soal Baru"}</DialogTitle>
                <DialogDescription>Isi rincian pertanyaan, pilihan jawaban, dan pembahasan.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Kategori Mata Pelajaran</Label>
                  <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                      ) : (
                        <SelectItem value="Matematika">Matematika</SelectItem>
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
                    onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
                  />
                  <FieldError message={errs.question_text} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="opt-a">Pilihan A</Label>
                    <Input id="opt-a" value={draft.optionA} onChange={(e) => setDraft({ ...draft, optionA: e.target.value })} />
                    <FieldError message={errs.optionA} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opt-b">Pilihan B</Label>
                    <Input id="opt-b" value={draft.optionB} onChange={(e) => setDraft({ ...draft, optionB: e.target.value })} />
                    <FieldError message={errs.optionB} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opt-c">Pilihan C</Label>
                    <Input id="opt-c" value={draft.optionC} onChange={(e) => setDraft({ ...draft, optionC: e.target.value })} />
                    <FieldError message={errs.optionC} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opt-d">Pilihan D</Label>
                    <Input id="opt-d" value={draft.optionD} onChange={(e) => setDraft({ ...draft, optionD: e.target.value })} />
                    <FieldError message={errs.optionD} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kunci Jawaban Benar</Label>
                  <Select value={draft.correct_answer} onValueChange={(v) => setDraft({ ...draft, correct_answer: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Batal</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Soal"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Hapus Soal?"
        description="Soal ini akan dihapus permanen dari Bank Soal Supabase."
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />
    </div>
  );
}
