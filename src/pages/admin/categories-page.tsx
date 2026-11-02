import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { FieldError } from "@/components/auth/auth-bits";
import { supabase } from "@/lib/supabase";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  created_at?: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<CategoryItem> | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<CategoryItem | null>(null);

  // Load Data Kategori & Jumlah Materi dari Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch kategori (hanya kolom yang dibutuhkan)
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("id, name, slug, description, color, created_at")
        .order("name", { ascending: true });

      if (catErr) throw catErr;

      // Fetch nama kategori dari courses untuk menghitung jumlah materi secara hemat (Egress Efficient)
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select("category");

      if (courseErr) throw courseErr;

      // Hitung frekuensi materi per kategori di client
      const counts: Record<string, number> = {};
      (courseData ?? []).forEach((c) => {
        if (c.category) {
          counts[c.category] = (counts[c.category] || 0) + 1;
        }
      });

      setCourseCounts(counts);
      setItems(catData as CategoryItem[]);
    } catch (err: any) {
      console.error("Fetch categories error:", err);
      setError(err.message || "Gagal memuat data dari Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const countFor = (name: string) => courseCounts[name] || 0;

  // Simpan (Create / Update) ke Supabase
  const save = async () => {
    if (!draft) return;
    const e: Record<string, string> = {};
    const trimmedName = draft.name?.trim() ?? "";

    if (!trimmedName) {
      e.name = "Nama kategori wajib diisi.";
    } else if (
      items.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== draft.id
      )
    ) {
      e.name = "Nama kategori sudah ada.";
    }

    setErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const payload = {
      name: trimmedName,
      slug: slugify(trimmedName),
      description: draft.description?.trim() || "",
      color: draft.color || "#10B981",
    };

    try {
      if (draft.id) {
        // Update kategori eksisting
        const { error: err } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", draft.id);

        if (err) throw err;
        toast.success("Kategori berhasil diperbarui");
      } else {
        // Create kategori baru
        const { error: err } = await supabase
          .from("categories")
          .insert([payload]);

        if (err) throw err;
        toast.success("Kategori berhasil ditambahkan");
      }

      setDraft(null);
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hapus Kategori dari Supabase
  const handleDelete = async () => {
    if (!removing) return;
    try {
      const { error: err } = await supabase
        .from("categories")
        .delete()
        .eq("id", removing.id);

      if (err) throw err;

      toast.success("Kategori berhasil dihapus");
      setRemoving(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori Materi"
        description="Kelola kategori untuk mengelompokkan materi belajar."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={() => { setErr({}); setDraft({ name: "", description: "", color: "#10B981" }); }}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Kategori
            </Button>
          </div>
        }
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada kategori" description="Tambahkan kategori materi pertama Anda." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="card-hover">
              <CardContent className="space-y-4 p-6 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="h-11 w-11 rounded-xl"
                    style={{ background: c.color || "#10B981" }}
                    aria-hidden
                  />
                  <Badge variant="outline">{countFor(c.name)} materi</Badge>
                </div>
                <div>
                  <h3 className="font-bold">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {c.description || "Tanpa deskripsi."}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">/{c.slug}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { setErr({}); setDraft(c); }}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoving(c)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog Form */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
                <DialogDescription>
                  Slug URL akan dibuat otomatis secara dinamis berdasarkan nama kategori.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="k-name">Nama Kategori</Label>
                  <Input
                    id="k-name"
                    value={draft.name ?? ""}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Contoh: Matematika"
                  />
                  <FieldError message={err.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="k-desc">Deskripsi</Label>
                  <Textarea
                    id="k-desc"
                    value={draft.description ?? ""}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Deskripsi singkat seputar kategori ini..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                  Batal
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Ke Database"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Hapus */}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Hapus kategori?"
        description={
          removing && countFor(removing.name) > 0
            ? `Kategori "${removing.name}" masih terikat dengan ${countFor(removing.name)} materi. Menghapusnya mungkin memengaruhi data materi terkait.`
            : `Kategori "${removing?.name ?? ""}" akan dihapus permanen dari Supabase.`
        }
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={handleDelete}
      />
    </div>
  );
}
