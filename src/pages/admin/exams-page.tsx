import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DifficultyBadge } from "@/components/shared/exam-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { PublishBadge } from "@/components/admin/badges";
import { FieldError } from "@/components/auth/auth-bits";
import { DIFFICULTIES, LEVELS } from "@/constants";
import { formatDuration } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { downloadQuestionTemplate, parseQuestionsExcelForExam } from "@/utils/excel-helpers";
import type { Difficulty, ExamPackage, Level } from "@/types";

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  difficulty: Difficulty;
  duration: number;
  questionCount: number;
  premium: boolean;
  published: boolean;
  excelFile: File | null;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  level: "SMA",
  difficulty: "Sedang",
  duration: 30,
  questionCount: 10,
  premium: false,
  published: false,
  excelFile: null,
};

export default function AdminExamsPage() {
  const [items, setItems] = useState<ExamPackage[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<ExamPackage | null>(null);

  // Fetch Data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: catData } = await supabase.from("categories").select("id, name").order("name");
      if (catData) setCategories(catData);

      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (examErr) throw examErr;
      if (examData) setItems(examData as ExamPackage[]);
    } catch (err: any) {
      setError(err.message || "Gagal memuat paket ujian.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(
    () =>
      items
        .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
        .filter((e) => level === "all" || e.level === level)
        .filter((e) => status === "all" || e.status === status),
    [items, q, level, status]
  );

  // Simpan Paket Ujian & Upload Soal Excel ke Supabase
  const save = async () => {
    if (!draft) return;
    const e: Record<string, string> = {};
    if (draft.title.trim().length < 5) e.title = "Judul minimal 5 karakter.";
    if (!(draft.duration >= 5 && draft.duration <= 240)) e.duration = "Durasi 5–240 menit.";
    if (!(draft.questionCount >= 1 && draft.questionCount <= 200)) e.questionCount = "Jumlah soal 1–200.";
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || "Belum ada deskripsi.",
      category: draft.category,
      level: draft.level,
      difficulty: draft.difficulty,
      duration: Number(draft.duration),
      question_count: Number(draft.questionCount),
      premium: draft.premium,
      status: draft.published ? "Published" : "Draft",
    };

    try {
      let packageId = draft.id;

      if (packageId) {
        const { error: err } = await supabase.from("exam_packages").update(payload).eq("id", packageId);
        if (err) throw err;
      } else {
        const { data: newPkg, error: err } = await supabase.from("exam_packages").insert([payload]).select().single();
        if (err) throw err;
        packageId = newPkg.id;
      }

      // Jika ada File Excel Soal yang diupload bersamaan
      if (draft.excelFile && packageId) {
        const parsedQuestions = await parseQuestionsExcelForExam(
          draft.excelFile,
          packageId,
          draft.category
        );

        if (parsedQuestions.length > 0) {
          const { error: qErr } = await supabase.from("questions").insert(parsedQuestions);
          if (qErr) throw qErr;

          // Update jumlah soal otomatis sesuai jumlah baris Excel
          await supabase
            .from("exam_packages")
            .update({ question_count: parsedQuestions.length })
            .eq("id", packageId);
        }
      }

      toast.success(draft.id ? "Paket ujian diperbarui!" : "Paket ujian & soal berhasil dibuat!");
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
      const { error: err } = await supabase.from("exam_packages").delete().eq("id", removing.id);
      if (err) throw err;
      toast.success("Paket ujian dihapus");
      setRemoving(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paket Ujian"
        description="Kelola paket ujian, durasi, dan jumlah soal."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadQuestionTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Template Excel Soal
            </Button>
            <Button onClick={() => { setErrs({}); setDraft(emptyDraft); }}>
              <Plus /> Tambah Paket
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari paket ujian..." className="flex-1" />
        <FilterSelect value={level} onChange={setLevel} options={[...LEVELS]} allLabel="Semua jenjang" />
        <FilterSelect value={status} onChange={setStatus} options={["Published", "Draft"]} allLabel="Semua status" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4"><EmptyState title="Paket tidak ditemukan" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Soal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <p className="line-clamp-1 font-semibold">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} {e.premium && <Badge variant="warning" className="ml-1">Premium</Badge>}
                    </p>
                  </TableCell>
                  <TableCell><Badge variant="muted">{e.level}</Badge></TableCell>
                  <TableCell><DifficultyBadge difficulty={e.difficulty} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDuration(e.duration)}</TableCell>
                  <TableCell>{(e as any).question_count || e.questionCount || 0}</TableCell>
                  <TableCell><PublishBadge status={e.status} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${e.title}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setErrs({});
                            setDraft({
                              id: e.id,
                              title: e.title,
                              description: e.description,
                              category: e.category,
                              level: e.level,
                              difficulty: e.difficulty,
                              duration: e.duration,
                              questionCount: (e as any).question_count || e.questionCount || 10,
                              premium: e.premium,
                              published: e.status === "Published",
                              excelFile: null,
                            });
                          }}
                        >
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => setRemoving(e)}>
                          <Trash2 /> Hapus
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

      {/* Modal Dialog Form */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit Paket Ujian" : "Tambah Paket Ujian"}</DialogTitle>
                <DialogDescription>Atur informasi paket dan upload file Excel soal sekaligus.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="x-title">Judul</Label>
                  <Input id="x-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  <FieldError message={errs.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-desc">Deskripsi</Label>
                  <Textarea id="x-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jenjang</Label>
                    <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v as Level })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tingkat</Label>
                    <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v as Difficulty })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="x-dur">Durasi (menit)</Label>
                    <Input id="x-dur" type="number" min={5} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} />
                    <FieldError message={errs.duration} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="x-cnt">Jumlah soal</Label>
                    <Input id="x-cnt" type="number" min={1} value={draft.questionCount} onChange={(e) => setDraft({ ...draft, questionCount: Number(e.target.value) })} />
                    <FieldError message={errs.questionCount} />
                  </div>
                </div>

                {/* Direct Upload File Excel Soal */}
                <div className="space-y-2 rounded-xl border border-dashed p-4 bg-muted/30">
                  <Label className="flex items-center gap-2 font-bold text-primary">
                    <FileSpreadsheet className="h-4 w-4" /> Upload File Excel Soal (Opsional)
                  </Label>
                  <p className="text-xs text-muted-foreground">Pilih file `.xlsx` berisi daftar pertanyaan & pilihan jawaban.</p>
                  <Input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setDraft({ ...draft, excelFile: e.target.files?.[0] || null })}
                  />
                  {draft.excelFile && (
                    <p className="text-xs font-semibold text-emerald-600">✓ File dipilih: {draft.excelFile.name}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <Switch id="x-prem" checked={draft.premium} onCheckedChange={(v) => setDraft({ ...draft, premium: v })} />
                    <Label htmlFor="x-prem">Premium</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="x-pub" checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
                    <Label htmlFor="x-pub">Terbitkan</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Batal</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Hapus paket ujian?"
        description={`Paket "${removing?.title ?? ""}" akan dihapus permanen dari Supabase.`}
        destructive
        confirmLabel="Hapus"
        onConfirm={handleDelete}
      />
    </div>
  );
}
