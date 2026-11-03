import { useEffect, useMemo, useState } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Archive, 
  BookOpen, 
  Zap, 
  FileText, 
  Award,
  Pencil,
  Trash2,
  Download,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";
import { DIFFICULTIES, LEVELS } from "@/constants";
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
  startTime: string; // ISO String / YYYY-MM-DDTHH:mm
  endTime: string;   // ISO String / YYYY-MM-DDTHH:mm
  excelFile: File | null;
};

// Default Tanggal Mulai = Hari ini, Tanggal Selesai = 30 hari lagi
const nowIso = new Date().toISOString().slice(0, 16);
const defaultEndIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  level: "SMA",
  difficulty: "Sedang",
  duration: 30,
  questionCount: 10,
  premium: false,
  published: true,
  startTime: nowIso,
  endTime: defaultEndIso,
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
  const [activeTab, setActiveTab] = useState<string>("Aktif");
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

  // Helper Penentu Status Real-time Berdasarkan Tanggal
  const getExamStatus = (e: ExamPackage): "Aktif" | "Akan Datang" | "Arsip" => {
    if (e.status === "Draft" || (e as any).is_published === false) return "Arsip";
    
    const now = new Date().getTime();
    const start = e.start_time ? new Date(e.start_time).getTime() : now;
    const end = e.end_time ? new Date(e.end_time).getTime() : Infinity;

    if (now < start) return "Akan Datang";
    if (now > end) return "Arsip";
    return "Aktif";
  };

  // Ringkasan Jumlah Status untuk Stat Cards (Tersinkron dengan tanggal real-time)
  const counts = useMemo(() => {
    let aktif = 0;
    let akanDatang = 0;
    let arsip = 0;

    items.forEach((item) => {
      const st = getExamStatus(item);
      if (st === "Aktif") aktif++;
      else if (st === "Akan Datang") akanDatang++;
      else arsip++;
    });

    return { aktif, akanDatang, arsip };
  }, [items]);

  // Filtering gabungan (Pencarian, Jenjang, dan Active Tab Status)
  const filtered = useMemo(() => {
    return items.filter((e) => {
      const matchQuery = e.title.toLowerCase().includes(q.toLowerCase());
      const matchLevel = level === "all" || e.level === level;
      const itemStatus = getExamStatus(e);

      const matchTab = activeTab === "all" || itemStatus === activeTab;
      return matchQuery && matchLevel && matchTab;
    });
  }, [items, q, level, activeTab]);

  // Simpan Paket Ujian dengan Input Tanggal ke Supabase
  const save = async () => {
    if (!draft) return;
    const e: Record<string, string> = {};
    if (draft.title.trim().length < 5) e.title = "Judul minimal 5 karakter.";
    if (!(draft.duration >= 5 && draft.duration <= 240)) e.duration = "Durasi 5–240 menit.";
    if (!(draft.questionCount >= 1 && draft.questionCount <= 200)) e.questionCount = "Jumlah soal 1–200.";
    if (!draft.startTime) e.startTime = "Tanggal mulai wajib diisi.";

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
      is_published: draft.published,
      status: draft.published ? "Published" : "Draft",
      start_time: new Date(draft.startTime).toISOString(),
      end_time: draft.endTime ? new Date(draft.endTime).toISOString() : null,
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

      // Upload & parse file Excel jika disertakan
      if (draft.excelFile && packageId) {
        const parsedQuestions = await parseQuestionsExcelForExam(
          draft.excelFile,
          packageId,
          draft.category
        );

        if (parsedQuestions.length > 0) {
          const { error: qErr } = await supabase.from("questions").insert(parsedQuestions);
          if (qErr) throw qErr;

          await supabase
            .from("exam_packages")
            .update({ question_count: parsedQuestions.length })
            .eq("id", packageId);
        }
      }

      toast.success(draft.id ? "Paket ujian diperbarui!" : "Paket ujian & jadwal berhasil disimpan!");
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Tryout":
        return <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20"><Zap className="h-5 w-5" /></div>;
      case "PTS":
      case "PTS/UTS":
        return <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20"><FileText className="h-5 w-5" /></div>;
      case "PAS":
      case "PAS/UAS":
        return <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20"><Award className="h-5 w-5" /></div>;
      default:
        return <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20"><BookOpen className="h-5 w-5" /></div>;
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. HEADER UTAMA ADMIN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Manajemen Paket Ujian
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola paket ujian, atur periode, dan pantau pelaksanaan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadQuestionTemplate} className="gap-2 text-xs font-bold rounded-xl h-10">
            <Download className="h-4 w-4" /> Template Excel
          </Button>
          <Button 
            onClick={() => { setErrs({}); setDraft(emptyDraft); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 h-10 rounded-xl shadow-md gap-1.5"
          >
            <Plus className="h-4 w-4" /> Buat Paket Baru
          </Button>
        </div>
      </div>

      {/* 2. KARTU STATISTIK RINGKASAN */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Paket Aktif</p>
              <h3 className="text-3xl font-black text-foreground">{counts.aktif}</h3>
              <p className="text-[11px] text-muted-foreground">Paket sedang berjalan</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-sky-500/20 bg-sky-500/5 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-sky-600 dark:text-sky-400">Akan Datang</p>
              <h3 className="text-3xl font-black text-foreground">{counts.akanDatang}</h3>
              <p className="text-[11px] text-muted-foreground">Jadwal mendatang</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-500 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-500/20 bg-slate-500/5 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Diarsipkan</p>
              <h3 className="text-3xl font-black text-foreground">{counts.arsip}</h3>
              <p className="text-[11px] text-muted-foreground">Draft / Selesai</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-500/15 border border-slate-500/30 text-slate-500 flex items-center justify-center">
              <Archive className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABS NAVIGASI STATUS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent p-0 border-b border-border w-full justify-start rounded-none h-auto space-x-6">
          <TabsTrigger 
            value="Aktif" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 font-extrabold text-sm pb-3 px-1 gap-2"
          >
            Paket Aktif <Badge className="bg-emerald-500 text-white rounded-full px-2 text-[10px]">{counts.aktif}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="Akan Datang" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sky-500 data-[state=active]:bg-transparent data-[state=active]:text-sky-600 font-extrabold text-sm pb-3 px-1 gap-2"
          >
            Akan Datang <Badge variant="outline" className="rounded-full px-2 text-[10px]">{counts.akanDatang}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="Arsip" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-600 font-extrabold text-sm pb-3 px-1 gap-2"
          >
            Arsip <Badge variant="outline" className="rounded-full px-2 text-[10px]">{counts.arsip}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 4. FILTER & SEARCH BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama paket..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">Semua Jenjang</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. TABEL PAKET UJIAN */}
      <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden bg-card">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4"><EmptyState title="Paket ujian tidak ditemukan" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nama Paket</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Tingkat</th>
                  <th className="p-4">Periode Aktif</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const status = getExamStatus(e);
                  const startDateStr = e.start_time ? new Date(e.start_time).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
                  const endDateStr = e.end_time ? new Date(e.end_time).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Tanpa Batas";

                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(e.category)}
                          <div>
                            <p className="font-extrabold text-sm text-foreground">{e.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {e.category} • {(e as any).question_count || e.questionCount || 0} Soal {e.premium && <Badge variant="warning" className="ml-1 text-[9px] px-1.5 py-0">Premium</Badge>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><Badge variant="outline" className="font-bold">{e.level}</Badge></td>
                      <td className="p-4"><Badge variant="muted" className="font-bold">{e.difficulty}</Badge></td>
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">
                        {startDateStr} - {endDateStr}
                      </td>
                      <td className="p-4">
                        {status === "Aktif" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif
                          </span>
                        ) : status === "Akan Datang" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-sky-500">
                            <span className="h-2 w-2 rounded-full bg-sky-500" /> Akan Datang
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-400" /> Draft / Arsip
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${e.title}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
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
                                  published: e.status === "Published" || (e as any).is_published,
                                  startTime: e.start_time ? new Date(e.start_time).toISOString().slice(0, 16) : nowIso,
                                  endTime: e.end_time ? new Date(e.end_time).toISOString().slice(0, 16) : defaultEndIso,
                                  excelFile: null,
                                });
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive onSelect={() => setRemoving(e)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 6. MODAL DIALOG FORM (TAMBAH / EDIT PAKET PAKAI PERIODE TANGGAL) */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold">
                  {draft.id ? "Edit Paket Ujian" : "Tambah Paket Ujian Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Atur jadwal periode rilis, informasi paket, dan upload file Excel soal sekaligus.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="x-title" className="font-bold">Judul Ujian *</Label>
                  <Input 
                    id="x-title" 
                    value={draft.title} 
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })} 
                    className="h-9 rounded-xl"
                  />
                  <FieldError message={errs.title} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="x-desc" className="font-bold">Deskripsi</Label>
                  <Textarea 
                    id="x-desc" 
                    value={draft.description} 
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })} 
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* INPUT PERIODE TANGGAL UNTUK MEMBUAT "AKAN DATANG" ATAU "AKTIF" */}
                <div className="grid gap-3 sm:grid-cols-2 p-3 rounded-xl border bg-muted/20">
                  <div className="space-y-1">
                    <Label htmlFor="x-start" className="font-bold text-emerald-600 dark:text-emerald-400">
                      📅 Tanggal & Jam Mulai *
                    </Label>
                    <Input
                      id="x-start"
                      type="datetime-local"
                      value={draft.startTime}
                      onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                      className="h-9 rounded-xl bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">Jika diatur ke masa depan, otomatis menjadi <strong>Akan Datang</strong>.</p>
                    <FieldError message={errs.startTime} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="x-end" className="font-bold text-amber-600 dark:text-amber-400">
                      🏁 Tanggal & Jam Selesai
                    </Label>
                    <Input
                      id="x-end"
                      type="datetime-local"
                      value={draft.endTime}
                      onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                      className="h-9 rounded-xl bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">Paket otomatis terarsip setelah waktu ini lewat.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="font-bold">Kategori</Label>
                    <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                      <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold">Jenjang</Label>
                    <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v as Level })}>
                      <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold">Tingkat Kesulitan</Label>
                    <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v as Difficulty })}>
                      <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="x-dur" className="font-bold">Durasi (Menit)</Label>
                    <Input 
                      id="x-dur" 
                      type="number" 
                      min={5} 
                      value={draft.duration} 
                      onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} 
                      className="h-9 rounded-xl"
                    />
                    <FieldError message={errs.duration} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="x-cnt" className="font-bold">Jumlah Soal</Label>
                    <Input 
                      id="x-cnt" 
                      type="number" 
                      min={1} 
                      value={draft.questionCount} 
                      onChange={(e) => setDraft({ ...draft, questionCount: Number(e.target.value) })} 
                      className="h-9 rounded-xl"
                    />
                    <FieldError message={errs.questionCount} />
                  </div>
                </div>

                {/* Upload File Excel Soal */}
                <div className="space-y-2 rounded-xl border border-dashed border-emerald-500/40 p-4 bg-emerald-500/5">
                  <Label className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-4 w-4" /> Upload File Excel Soal (Opsional)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Pilih file `.xlsx` berisi daftar pertanyaan & pilihan jawaban.</p>
                  <Input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setDraft({ ...draft, excelFile: e.target.files?.[0] || null })}
                    className="h-9 rounded-xl bg-background"
                  />
                  {draft.excelFile && (
                    <p className="text-xs font-semibold text-emerald-600">✓ File dipilih: {draft.excelFile.name}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <Switch id="x-prem" checked={draft.premium} onCheckedChange={(v) => setDraft({ ...draft, premium: v })} />
                    <Label htmlFor="x-prem" className="font-bold cursor-pointer">Fitur Premium</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="x-pub" checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
                    <Label htmlFor="x-pub" className="font-bold cursor-pointer text-emerald-600">Terbitkan Langsung</Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving} className="rounded-xl">
                  Batal
                </Button>
                <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Hapus Dialog */}
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
