import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { PublishBadge } from "@/components/admin/badges";
import { FieldError } from "@/components/auth/auth-bits";
import { LEVELS } from "@/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Level } from "@/types";

const gradients = [
  "from-teal-600 to-emerald-400",
  "from-emerald-600 to-teal-400",
  "from-green-600 to-lime-400",
  "from-cyan-600 to-emerald-400"
];

interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  instructor: string;
  premium: boolean;
  status: "Published" | "Draft";
  thumbnail?: string;
  created_at?: string;
}

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  instructor: string;
  premium: boolean;
  published: boolean;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "Matematika",
  level: "SMA",
  instructor: "",
  premium: false,
  published: false
};

export default function AdminCoursesPage() {
  const [items, setItems] = useState<CourseItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CourseItem | null>(null);

  // Load Data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Kategori
      const { data: catData } = await supabase.from("categories").select("*").order("name");
      if (catData) setCategories(catData);

      // Fetch Courses
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (courseErr) throw courseErr;
      if (courseData) setItems(courseData as CourseItem[]);
    } catch (err: any) {
      console.error("Fetch courses error:", err);
      setError(err.message || "Gagal memuat data dari Supabase.");
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
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => category === "all" || c.category === category)
        .filter((c) => status === "all" || c.status === status),
    [items, q, category, status]
  );

  // Simpan (Create / Update) ke Supabase
  const save = async () => {
    if (!draft) return;
    const e: Record<string, string> = {};
    if (draft.title.trim().length < 5) e.title = "Judul minimal 5 karakter.";
    if (!draft.instructor.trim()) e.instructor = "Nama pengajar wajib diisi.";
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const payload = {
      title: draft.title,
      description: draft.description || "Belum ada deskripsi.",
      category: draft.category,
      level: draft.level,
      instructor: draft.instructor,
      premium: draft.premium,
      status: draft.published ? "Published" : "Draft",
      thumbnail: gradients[Math.floor(Math.random() * gradients.length)],
    };

    try {
      if (draft.id) {
        // Update data eksisting
        const { error: err } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", draft.id);

        if (err) throw err;
        toast.success("Materi berhasil diperbarui");
      } else {
        // Create data baru
        const { error: err } = await supabase
          .from("courses")
          .insert([payload]);

        if (err) throw err;
        toast.success("Materi berhasil ditambahkan");
      }

      setDraft(null);
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hapus dari Supabase
  const handleDelete = async () => {
    if (!removing) return;
    try {
      const { error: err } = await supabase
        .from("courses")
        .delete()
        .eq("id", removing.id);

      if (err) throw err;
      toast.success("Materi berhasil dihapus");
      setRemoving(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Materi"
        description="Tambah, ubah, dan kelola materi belajar yang terhubung langsung dengan Supabase."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={() => { setErrs({}); setDraft(emptyDraft); }}>
              <Plus /> Tambah Materi
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Cari materi..." className="flex-1" />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={categories.map((c) => c.name)}
          allLabel="Semua kategori"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={["Published", "Draft"]}
          allLabel="Semua status"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4"><EmptyState title="Materi tidak ditemukan" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Akses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-11 w-16 shrink-0 rounded-lg bg-gradient-to-br", c.thumbnail || gradients[0])} aria-hidden />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.instructor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell><Badge variant="outline">{c.level}</Badge></TableCell>
                  <TableCell>
                    {c.premium ? (
                      <Badge className="bg-amber-500 text-white hover:bg-amber-600">Premium</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">Gratis</Badge>
                    )}
                  </TableCell>
                  <TableCell><PublishBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${c.title}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setErrs({});
                            setDraft({
                              id: c.id,
                              title: c.title,
                              description: c.description,
                              category: c.category,
                              level: c.level,
                              instructor: c.instructor,
                              premium: c.premium,
                              published: c.status === "Published"
                            });
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(c)}>
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

      {/* Modal Dialog Form */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit Materi" : "Tambah Materi"}</DialogTitle>
                <DialogDescription>Isi informasi detail materi untuk disimpan ke database.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="c-title">Judul Materi</Label>
                  <Input id="c-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  <FieldError message={errs.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-desc">Deskripsi</Label>
                  <textarea
                    id="c-desc"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kategori</Label>
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
                    <Label>Jenjang</Label>
                    <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v as Level })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ins">Nama Pengajar</Label>
                  <Input id="c-ins" value={draft.instructor} onChange={(e) => setDraft({ ...draft, instructor: e.target.value })} />
                  <FieldError message={errs.instructor} />
                </div>
                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <Switch id="c-prem" checked={draft.premium} onCheckedChange={(v) => setDraft({ ...draft, premium: v })} />
                    <Label htmlFor="c-prem">Materi Premium</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="c-pub" checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
                    <Label htmlFor="c-pub">Terbitkan Lansung</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Batal</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Ke Database"}
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
        title="Hapus materi?"
        description={`Materi "${removing?.title ?? ""}" akan dihapus permanen dari Supabase.`}
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />
    </div>
  );
}
