
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";

import { DIFFICULTIES, LEVELS } from "@/constants";
import { supabase } from "@/lib/supabase";
import {
  downloadQuestionTemplate,
  parseQuestionsExcelForExam,
} from "@/utils/excel-helpers";

import type { Difficulty, ExamPackage, Level } from "@/types";

// =====================================================
// KONFIGURASI JENJANG, KELAS, MAPEL, DAN JENIS UJIAN
// =====================================================

const GRADES_BY_LEVEL: Record<string, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  SD: [
    "Bahasa Indonesia",
    "Matematika",
    "Pendidikan Pancasila",
    "IPAS",
    "Pendidikan Agama",
    "Bahasa Inggris",
    "Seni Budaya",
    "PJOK",
  ],
  SMP: [
    "Bahasa Indonesia",
    "Matematika",
    "IPA",
    "IPS",
    "Pendidikan Pancasila",
    "Bahasa Inggris",
    "Informatika",
    "Pendidikan Agama",
  ],
  SMA: [
    "Bahasa Indonesia",
    "Matematika",
    "Bahasa Inggris",
    "Fisika",
    "Kimia",
    "Biologi",
    "Ekonomi",
    "Geografi",
    "Sejarah",
    "Sosiologi",
  ],
  SMK: [
    "Bahasa Indonesia",
    "Matematika",
    "Bahasa Inggris",
    "Informatika",
    "Dasar-Dasar Kejuruan",
    "Projek Kreatif dan Kewirausahaan",
  ],
};

const EXAM_TYPES = [
  "Latihan",
  "Ulangan Harian",
  "PTS",
  "PAS",
  "Tryout",
  "Simulasi TKA",
];

const getDefaultGrade = (level: string): number => {
  return GRADES_BY_LEVEL[level]?.[0] ?? 1;
};

const getLegacyGrade = (
  category: string | null | undefined,
  level: string
): number => {
  const match = category?.match(/kelas\s*(\d+)/i);
  const grade = match ? Number(match[1]) : getDefaultGrade(level);

  return (GRADES_BY_LEVEL[level] ?? []).includes(grade)
    ? grade
    : getDefaultGrade(level);
};

const getDefaultSubject = (level: string): string => {
  return SUBJECTS_BY_LEVEL[level]?.[0] ?? "Bahasa Indonesia";
};

// =====================================================
// TIPE DATA FORM
// =====================================================

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  examType: string;
  level: Level;
  grade: number;
  difficulty: Difficulty;
  duration: number;
  questionCount: number;
  premium: boolean;
  published: boolean;
  startTime: string;
  endTime: string;
  noEndDate: boolean;
  excelFile: File | null;
};

// =====================================================
// DEFAULT FORM
// =====================================================

const nowIso = new Date().toISOString().slice(0, 16);

const defaultEndIso = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000
)
  .toISOString()
  .slice(0, 16);

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  subject: "Matematika",
  examType: "Latihan",
  level: "SMA",
  grade: 10,
  difficulty: "Sedang",
  duration: 30,
  questionCount: 10,
  premium: false,
  published: true,
  startTime: nowIso,
  endTime: defaultEndIso,
  noEndDate: false,
  excelFile: null,
};

// =====================================================
// KOMPONEN UTAMA
// =====================================================

export default function AdminExamsPage() {
  const [items, setItems] = useState<ExamPackage[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [activeTab, setActiveTab] = useState("Aktif");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<ExamPackage | null>(null);

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (catError) throw catError;

      setCategories(catData ?? []);

      const { data: examData, error: examErr } = await supabase
        .from("exam_packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (examErr) throw examErr;

      setItems((examData ?? []) as ExamPackage[]);
    } catch (err: any) {
      setError(err.message || "Gagal memuat paket ujian.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =====================================================
  // STATUS PAKET
  // =====================================================

  const getExamStatus = (
    exam: ExamPackage
  ): "Aktif" | "Akan Datang" | "Arsip" => {
    const item = exam as any;

    if (
      exam.status === "Draft" ||
      item.is_published === false
    ) {
      return "Arsip";
    }

    const now = Date.now();

    const start = item.start_time
      ? new Date(item.start_time).getTime()
      : now;

    const end = item.end_time
      ? new Date(item.end_time).getTime()
      : Infinity;

    if (now < start) return "Akan Datang";
    if (now > end) return "Arsip";

    return "Aktif";
  };

  // =====================================================
  // STATISTIK
  // =====================================================

  const counts = useMemo(() => {
    let aktif = 0;
    let akanDatang = 0;
    let arsip = 0;

    items.forEach((item) => {
      const status = getExamStatus(item);

      if (status === "Aktif") aktif++;
      else if (status === "Akan Datang") akanDatang++;
      else arsip++;
    });

    return {
      aktif,
      akanDatang,
      arsip,
    };
  }, [items]);

  // =====================================================
  // FILTER PAKET
  // =====================================================

  const filtered = useMemo(() => {
    return items.filter((exam) => {
      const item = exam as any;

      const keyword = q.toLocaleLowerCase("id-ID");

      const searchableText = [
        exam.title,
        item.subject,
        item.type,
        exam.category,
        exam.level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      const matchQuery = searchableText.includes(keyword);

      const matchLevel =
        level === "all" || exam.level === level;

      const status = getExamStatus(exam);

      const matchTab =
        activeTab === "all" || status === activeTab;

      return matchQuery && matchLevel && matchTab;
    });
  }, [items, q, level, activeTab]);

  // =====================================================
  // SIMPAN / UPDATE PAKET
  // =====================================================

  const save = async () => {
    if (!draft) return;

    const validation: Record<string, string> = {};

    if (draft.title.trim().length < 5) {
      validation.title = "Judul minimal 5 karakter.";
    }

    if (
      !(draft.duration >= 5 && draft.duration <= 240)
    ) {
      validation.duration = "Durasi 5–240 menit.";
    }

    if (
      !(draft.questionCount >= 1 &&
        draft.questionCount <= 200)
    ) {
      validation.questionCount = "Jumlah soal 1–200.";
    }

    if (!draft.startTime) {
      validation.startTime = "Tanggal mulai wajib diisi.";
    }

    if (!draft.subject.trim()) {
      validation.subject = "Mata pelajaran wajib dipilih.";
    }

    if (
      !(GRADES_BY_LEVEL[draft.level] ?? []).includes(
        Number(draft.grade)
      )
    ) {
      validation.grade =
        "Kelas tidak sesuai dengan jenjang pendidikan.";
    }

    if (!draft.examType) {
      validation.examType = "Jenis ujian wajib dipilih.";
    }

    if (!draft.noEndDate && !draft.endTime) {
      validation.endTime =
        "Tanggal selesai wajib diisi atau pilih Terbit Selamanya.";
    }

    if (
      !draft.noEndDate &&
      draft.startTime &&
      draft.endTime &&
      new Date(draft.endTime).getTime() <
        new Date(draft.startTime).getTime()
    ) {
      validation.endTime =
        "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    }

    setErrs(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }

    setSaving(true);

    const payload = {
      title: draft.title.trim(),
      description:
        draft.description.trim() || "Belum ada deskripsi.",

      category: draft.category,

      subject: draft.subject,
      type: draft.examType,
      level: draft.level,
      grade: Number(draft.grade),

      difficulty: draft.difficulty,
      duration: Number(draft.duration),
      question_count: Number(draft.questionCount),

      premium: draft.premium,
      is_published: draft.published,
      status: draft.published ? "Published" : "Draft",

      start_time: new Date(draft.startTime).toISOString(),
      end_time: draft.noEndDate
        ? null
        : new Date(draft.endTime).toISOString(),
    };

    try {
      let packageId = draft.id;

      if (packageId) {
        const { error: updateError } = await supabase
          .from("exam_packages")
          .update(payload)
          .eq("id", packageId);

        if (updateError) throw updateError;
      } else {
        const { data: newPackage, error: insertError } =
          await supabase
            .from("exam_packages")
            .insert([payload])
            .select()
            .single();

        if (insertError) throw insertError;

        packageId = newPackage.id;
      }

      // =================================================
      // IMPORT SOAL EXCEL
      // =================================================

      if (draft.excelFile && packageId) {
        const parsedQuestions =
          await parseQuestionsExcelForExam(
            draft.excelFile,
            packageId,
            draft.category
          );

        if (parsedQuestions.length > 0) {
          if (
            parsedQuestions.length < draft.questionCount
          ) {
            throw new Error(
              `Jumlah soal dalam Excel hanya ${parsedQuestions.length}, sedangkan paket membutuhkan ${draft.questionCount} soal.`
            );
          }

          const { error: questionError } = await supabase
            .from("questions")
            .insert(parsedQuestions);

          if (questionError) throw questionError;
        }
      }

      toast.success(
        draft.id
          ? "Paket ujian berhasil diperbarui!"
          : "Paket ujian berhasil dibuat!"
      );

      setDraft(null);
      setErrs({});

      await fetchData();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // HAPUS PAKET
  // =====================================================

  const handleDelete = async () => {
    if (!removing) return;

    try {
      const { error: deleteError } = await supabase
        .from("exam_packages")
        .delete()
        .eq("id", removing.id);

      if (deleteError) throw deleteError;

      toast.success("Paket ujian berhasil dihapus.");

      setRemoving(null);
      await fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // =====================================================
  // ICON KATEGORI
  // =====================================================

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Tryout":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
            <Zap className="h-5 w-5" />
          </div>
        );

      case "PTS":
      case "PTS/UTS":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-500">
            <FileText className="h-5 w-5" />
          </div>
        );

      case "PAS":
      case "PAS/UAS":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
            <Award className="h-5 w-5" />
          </div>
        );

      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <BookOpen className="h-5 w-5" />
          </div>
        );
    }
  };

  // =====================================================
  // BUKA FORM EDIT
  // =====================================================

  const openEdit = (exam: ExamPackage) => {
    const item = exam as any;

    const examLevel = item.level || "SMA";

    setErrs({});

    setDraft({
      id: exam.id,
      title: exam.title || "",
      description: exam.description || "",

      category: exam.category || "Matematika",

      subject:
        item.subject || getDefaultSubject(examLevel),

      examType: item.type || "Latihan",

      level: examLevel as Level,

      grade: item.grade
        ? Number(item.grade)
        : getLegacyGrade(exam.category, examLevel),

      difficulty: exam.difficulty || "Sedang",

      duration:
        Number(item.duration || item.duration_minutes) || 30,

      questionCount:
        Number(item.question_count || item.total_questions) ||
        10,

      premium: Boolean(exam.premium),

      published:
        exam.status === "Published" ||
        item.is_published === true,

      startTime: item.start_time
        ? new Date(item.start_time)
            .toISOString()
            .slice(0, 16)
        : nowIso,

      endTime: item.end_time
        ? new Date(item.end_time)
            .toISOString()
            .slice(0, 16)
        : "",

      noEndDate: !item.end_time,

      excelFile: null,
    });
  };

  // =====================================================
  // FORM BARU
  // =====================================================

  const openCreate = () => {
    setErrs({});
    setDraft({ ...emptyDraft });
  };

  // =====================================================
  // TAMPILAN
  // =====================================================

  return (
    <div className="w-full space-y-6 pb-12">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Manajemen Paket Ujian
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola paket ujian, jenjang, mata pelajaran, jadwal,
            dan pelaksanaan ujian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={downloadQuestionTemplate}
            className="h-10 gap-2 rounded-xl text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            Template Excel
          </Button>

          <Button
            onClick={openCreate}
            className="h-10 gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Buat Paket Baru
          </Button>
        </div>
      </div>

      {/* STATISTIK */}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Paket Aktif
              </p>
              <h3 className="text-3xl font-black text-foreground">
                {counts.aktif}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Paket sedang berjalan
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-sky-500/20 bg-sky-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Akan Datang
              </p>
              <h3 className="text-3xl font-black text-foreground">
                {counts.akanDatang}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Jadwal mendatang
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/15 text-sky-500">
              <CalendarIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-500/20 bg-slate-500/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">
                Diarsipkan
              </p>
              <h3 className="text-3xl font-black text-foreground">
                {counts.arsip}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Draft / Selesai
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-500/30 bg-slate-500/15 text-slate-500">
              <Archive className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TAB STATUS */}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="h-auto w-full justify-start space-x-6 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="Aktif"
            className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-extrabold data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600"
          >
            Paket Aktif
            <Badge className="rounded-full bg-emerald-500 px-2 text-[10px] text-white">
              {counts.aktif}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="Akan Datang"
            className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-extrabold data-[state=active]:border-sky-500 data-[state=active]:bg-transparent data-[state=active]:text-sky-600"
          >
            Akan Datang
            <Badge variant="outline" className="rounded-full px-2 text-[10px]">
              {counts.akanDatang}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="Arsip"
            className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-extrabold data-[state=active]:border-slate-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-600"
          >
            Arsip
            <Badge variant="outline" className="rounded-full px-2 text-[10px]">
              {counts.arsip}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-bold data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Semua
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SEARCH DAN FILTER JENJANG */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari paket, mapel, atau jenis ujian..."
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
              <SelectValue placeholder="Semua Jenjang" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Semua Jenjang</SelectItem>

              {LEVELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABEL PAKET UJIAN */}

      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              message={error}
              onRetry={fetchData}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Paket ujian tidak ditemukan"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Nama Paket</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Kelas & Mata Pelajaran</th>
                  <th className="p-4">Jenis Ujian</th>
                  <th className="p-4">Kesulitan</th>
                  <th className="p-4">Periode Aktif</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filtered.map((exam) => {
                  const item = exam as any;

                  const status = getExamStatus(exam);

                  const startDateStr = item.start_time
                    ? new Date(item.start_time).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "-";

                  const endDateStr = item.end_time
                    ? new Date(item.end_time).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "Selamanya";

                  return (
                    <tr
                      key={exam.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(item.type || exam.category)}

                          <div className="min-w-[170px]">
                            <p className="text-sm font-extrabold text-foreground">
                              {exam.title}
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.question_count ||
                                item.total_questions ||
                                exam.questionCount ||
                                0}{" "}
                              Soal

                              {exam.premium && (
                                <Badge
                                  variant="warning"
                                  className="ml-1 px-1.5 py-0 text-[9px]"
                                >
                                  Premium
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className="font-bold"
                        >
                          {exam.level || "-"}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-foreground">
                          Kelas {item.grade ?? "-"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.subject || "Belum ditentukan"}
                        </p>
                      </td>

                      <td className="p-4">
                        <Badge variant="muted">
                          {item.type || "Ujian"}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <Badge
                          variant="muted"
                          className="font-bold"
                        >
                          {exam.difficulty || "-"}
                        </Badge>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-muted-foreground">
                        <div>{startDateStr}</div>
                        <div className="mt-1">
                          s.d. {endDateStr}
                        </div>
                      </td>

                      <td className="p-4">
                        {status === "Aktif" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : status === "Akan Datang" ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-sky-500">
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                            Akan Datang
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Draft / Arsip
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Aksi untuk ${exam.title}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="w-36"
                          >
                            <DropdownMenuItem
                              onSelect={() => openEdit(exam)}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                              Edit
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              destructive
                              onSelect={() => setRemoving(exam)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Hapus
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

      {/* =================================================
          MODAL TAMBAH / EDIT PAKET
      ================================================= */}

      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDraft(null);
            setErrs({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold">
                  {draft.id
                    ? "Edit Paket Ujian"
                    : "Tambah Paket Ujian Baru"}
                </DialogTitle>

                <DialogDescription className="text-xs">
                  Atur identitas akademik, jadwal, informasi paket,
                  dan upload soal Excel.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2 text-xs">

                {/* INFORMASI DASAR */}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="x-title"
                      className="font-bold"
                    >
                      Judul Ujian *
                    </Label>

                    <Input
                      id="x-title"
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          title: e.target.value,
                        })
                      }
                      placeholder="Contoh: Latihan Matematika Kelas 4"
                      className="h-10 rounded-xl"
                    />

                    <FieldError message={errs.title} />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="x-desc"
                      className="font-bold"
                    >
                      Deskripsi
                    </Label>

                    <Textarea
                      id="x-desc"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          description: e.target.value,
                        })
                      }
                      placeholder="Tuliskan deskripsi singkat paket ujian..."
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* IDENTITAS AKADEMIK */}

                <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div>
                    <h3 className="font-extrabold text-foreground">
                      Identitas Akademik
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tentukan sasaran jenjang, kelas, mata pelajaran,
                      dan jenis ujian.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">

                    {/* JENJANG */}

                    <div className="space-y-1">
                      <Label className="font-bold">
                        Jenjang Pendidikan *
                      </Label>

                      <Select
                        value={draft.level}
                        onValueChange={(value) => {
                          const nextLevel = value as Level;

                          setDraft({
                            ...draft,
                            level: nextLevel,
                            grade: getDefaultGrade(nextLevel),
                            subject: getDefaultSubject(nextLevel),
                          });
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue placeholder="Pilih jenjang" />
                        </SelectTrigger>

                        <SelectContent>
                          {LEVELS.map((item) => (
                            <SelectItem
                              key={item}
                              value={item}
                            >
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* KELAS */}

                    <div className="space-y-1">
                      <Label className="font-bold">
                        Kelas *
                      </Label>

                      <Select
                        value={String(draft.grade)}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            grade: Number(value),
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue placeholder="Pilih kelas" />
                        </SelectTrigger>

                        <SelectContent>
                          {(GRADES_BY_LEVEL[draft.level] ?? []).map(
                            (grade) => (
                              <SelectItem
                                key={grade}
                                value={String(grade)}
                              >
                                Kelas {grade}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError message={errs.grade} />
                    </div>

                    {/* MATA PELAJARAN */}

                    <div className="space-y-1">
                      <Label className="font-bold">
                        Mata Pelajaran *
                      </Label>

                      <Select
                        value={draft.subject}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            subject: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue placeholder="Pilih mata pelajaran" />
                        </SelectTrigger>

                        <SelectContent>
                          {(SUBJECTS_BY_LEVEL[draft.level] ?? []).map(
                            (subject) => (
                              <SelectItem
                                key={subject}
                                value={subject}
                              >
                                {subject}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError message={errs.subject} />
                    </div>

                    {/* JENIS UJIAN */}

                    <div className="space-y-1">
                      <Label className="font-bold">
                        Jenis Ujian *
                      </Label>

                      <Select
                        value={draft.examType}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            examType: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue placeholder="Pilih jenis ujian" />
                        </SelectTrigger>

                        <SelectContent>
                          {EXAM_TYPES.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={errs.examType} />
                    </div>

                    {/* KATEGORI LAMA */}

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="font-bold">
                        Kategori Tambahan
                      </Label>

                      <Select
                        value={draft.category}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            category: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue placeholder="Pilih kategori tambahan" />
                        </SelectTrigger>

                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.name}
                            >
                              {category.name}
                            </SelectItem>
                          ))}

                          {!categories.some(
                            (category) =>
                              category.name === draft.category
                          ) && draft.category && (
                            <SelectItem value={draft.category}>
                              {draft.category}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <p className="text-[10px] text-muted-foreground">
                        Dipertahankan untuk kompatibilitas kategori
                        dan proses impor soal Excel lama.
                      </p>
                    </div>

                    {/* KESULITAN */}

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="font-bold">
                        Tingkat Kesulitan
                      </Label>

                      <Select
                        value={draft.difficulty}
                        onValueChange={(value) =>
                          setDraft({
                            ...draft,
                            difficulty: value as Difficulty,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {DIFFICULTIES.map((difficulty) => (
                            <SelectItem
                              key={difficulty}
                              value={difficulty}
                            >
                              {difficulty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* JADWAL */}

                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">

                    {/* TANGGAL MULAI */}

                    <div className="space-y-1">
                      <Label
                        htmlFor="x-start"
                        className="font-bold text-emerald-600 dark:text-emerald-400"
                      >
                        📅 Tanggal & Jam Mulai *
                      </Label>

                      <Input
                        id="x-start"
                        type="datetime-local"
                        value={draft.startTime}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            startTime: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl bg-background"
                      />

                      <p className="text-[10px] text-muted-foreground">
                        Jika diatur ke masa depan, paket menjadi
                        Akan Datang.
                      </p>

                      <FieldError message={errs.startTime} />
                    </div>

                    {/* TANGGAL SELESAI */}

                    <div className="space-y-1">
                      <Label
                        htmlFor="x-end"
                        className="font-bold text-amber-600 dark:text-amber-400"
                      >
                        🏁 Tanggal & Jam Selesai
                      </Label>

                      <Input
                        id="x-end"
                        type="datetime-local"
                        value={draft.endTime}
                        disabled={draft.noEndDate}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            endTime: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl bg-background disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      {!draft.noEndDate && (
                        <FieldError message={errs.endTime} />
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        {draft.noEndDate
                          ? "Paket tidak memiliki batas tanggal akhir."
                          : "Tentukan kapan paket ujian berakhir."}
                      </p>
                    </div>
                  </div>

                  {/* TERBIT SELAMANYA */}

                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <Switch
                      id="x-no-end"
                      checked={draft.noEndDate}
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          noEndDate: value,
                          endTime: value
                            ? ""
                            : draft.endTime || defaultEndIso,
                        })
                      }
                    />

                    <div className="space-y-1">
                      <Label
                        htmlFor="x-no-end"
                        className="cursor-pointer font-extrabold text-emerald-600 dark:text-emerald-400"
                      >
                        Terbit Selamanya
                      </Label>

                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Aktifkan agar paket ujian tidak memiliki
                        tanggal kedaluwarsa. Paket tetap tersedia
                        setelah tanggal mulai dan tidak otomatis
                        masuk arsip karena tanggal selesai.
                      </p>
                    </div>
                  </div>
                </div>

                {/* DURASI DAN JUMLAH SOAL */}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="x-dur"
                      className="font-bold"
                    >
                      Durasi (Menit) *
                    </Label>

                    <Input
                      id="x-dur"
                      type="number"
                      min={5}
                      max={240}
                      value={draft.duration}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          duration: Number(e.target.value),
                        })
                      }
                      className="h-10 rounded-xl"
                    />

                    <FieldError message={errs.duration} />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="x-cnt"
                      className="font-bold"
                    >
                      Jumlah Soal *
                    </Label>

                    <Input
                      id="x-cnt"
                      type="number"
                      min={1}
                      max={200}
                      value={draft.questionCount}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          questionCount: Number(e.target.value),
                        })
                      }
                      className="h-10 rounded-xl"
                    />

                    <FieldError message={errs.questionCount} />
                  </div>
                </div>

                {/* UPLOAD EXCEL */}

                <div className="space-y-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
                  <Label className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-4 w-4" />
                    Upload File Excel Soal (Opsional)
                  </Label>

                  <p className="text-[11px] text-muted-foreground">
                    Pilih file .xlsx berisi daftar pertanyaan
                    dan pilihan jawaban.
                  </p>

                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        excelFile: e.target.files?.[0] || null,
                      })
                    }
                    className="h-10 rounded-xl bg-background"
                  />

                  {draft.excelFile && (
                    <p className="text-xs font-semibold text-emerald-600">
                      ✓ File dipilih: {draft.excelFile.name}
                    </p>
                  )}
                </div>

                {/* PENGATURAN PUBLIKASI */}

                <div className="flex flex-wrap gap-6 border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="x-prem"
                      checked={draft.premium}
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          premium: value,
                        })
                      }
                    />

                    <Label
                      htmlFor="x-prem"
                      className="cursor-pointer font-bold"
                    >
                      Fitur Premium
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="x-pub"
                      checked={draft.published}
                      onCheckedChange={(value) =>
                        setDraft({
                          ...draft,
                          published: value,
                        })
                      }
                    />

                    <Label
                      htmlFor="x-pub"
                      className="cursor-pointer font-bold text-emerald-600"
                    >
                      Terbitkan Langsung
                    </Label>
                  </div>
                </div>
              </div>

              {/* FOOTER FORM */}

              <DialogFooter className="gap-2 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                  className="rounded-xl"
                >
                  Batal
                </Button>

                <Button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Paket Ujian"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS */}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Hapus paket ujian?"
        description={`Paket "${removing?.title ?? ""}" akan dihapus permanen dari Supabase.`}
        destructive
        confirmLabel="Hapus"
        onConfirm={handleDelete}
      />
    </div>
  );
}
