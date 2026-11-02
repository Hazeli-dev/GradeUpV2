import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, FileText, HelpCircle, Lock, Pause, Play, Target, Volume2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseThumbnail } from "@/components/shared/course-card";
import { DemoBanner } from "@/components/shared/demo-banner";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useAsync } from "@/hooks/use-async";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { getCourseById } from "@/services/catalog.service";
import { questions } from "@/data/questions";
import { formatDuration } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/types";

const lessonIcon = { video: Play, reading: FileText, quiz: HelpCircle } as const;

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { openUpgrade } = useUpgradeModal();
  const { data: course, loading, error, reload } = useAsync(() => getCourseById(courseId ?? ""), [courseId]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [playing, setPlaying] = useState(false);

  // State Pelacakan & Sinkronisasi
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!course) {
    return <EmptyState title="Materi tidak ditemukan" description="Materi yang Anda cari tidak tersedia." action={<Button onClick={() => navigate("/dashboard/courses")}>Kembali ke materi</Button>} />;
  }

  const lesson = activeLesson ?? course.lessons.find((l) => !l.completed) ?? course.lessons[0];
  const quizPreview = questions.filter((q) => q.subject === course.category).slice(0, 2);
  const locked = course.premium;

  // Fungsi Sinkronisasi Selesai Belajar dengan Supabase RPC
  const handleMarkAsCompleted = async () => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Silakan login terlebih dahulu untuk menyimpan pencapaian.");
        return;
      }

      // Panggil RPC Supabase untuk update total_articles_read & total_xp
      const { data, error: rpcError } = await supabase.rpc("complete_material_reading", {
        p_user_id: user.id,
        p_xp_reward: 50,
      });

      if (rpcError) throw rpcError;

      setIsCompleted(true);

      // Toast Selebrasi
      toast.success("Materi Selesai Dibaca! 🎉", {
        description: "+50 XP ditambahkan! Progres badge membaca kamu bertambah.",
        icon: <Zap className="h-5 w-5 text-amber-400 fill-current" />,
      });

    } catch (err) {
      console.error("Gagal sinkronisasi materi:", err);
      toast.error("Gagal menyimpan progres materi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/dashboard/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Materi Belajar
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Mock video player */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className={cn("relative flex aspect-video items-center justify-center bg-gradient-to-br", course.thumbnail)}>
              <div className="absolute inset-0 bg-slate-950/30" />
              {locked ? (
                <div className="relative text-center text-white">
                  <Lock className="mx-auto h-10 w-10" />
                  <p className="mt-2 font-bold">Materi Premium</p>
                  <Button size="sm" variant="outline" className="mt-3 border-white/40 bg-white/15 text-white hover:bg-white/25 hover:text-white" onClick={openUpgrade}>Upgrade untuk membuka</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-primary shadow-2xl transition-transform hover:scale-110"
                  aria-label={playing ? "Jeda video" : "Putar video"}
                >
                  {playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
                </button>
              )}
              <Badge className="absolute left-4 top-4 bg-white/90 text-primary">Pemutar contoh</Badge>
            </div>
            <div className="space-y-3 p-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full bg-brand-gradient transition-all duration-[4000ms] ease-linear", playing ? "w-2/3" : "w-1/4")} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate font-semibold text-foreground">{lesson.title}</span>
                <span className="inline-flex shrink-0 items-center gap-2"><Volume2 className="h-4 w-4" />{lesson.duration} mnt</span>
              </div>
            </div>
          </div>
          <DemoBanner>Video hanya tampilan contoh dan tidak memutar konten sebenarnya.</DemoBanner>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{course.category}</Badge>
              <Badge variant="muted">{course.level}</Badge>
              {course.premium ? <Badge variant="warning"><Lock className="h-3 w-3" /> Premium</Badge> : <Badge variant="success">Gratis</Badge>}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
            <p className="text-sm text-muted-foreground">Pengajar: <span className="font-semibold text-foreground">{course.instructor}</span> · <Clock className="mb-0.5 inline h-3.5 w-3.5" /> {formatDuration(course.duration)}</p>
          </div>

          <Tabs defaultValue="objectives">
            <TabsList>
              <TabsTrigger value="objectives"><Target /> Tujuan</TabsTrigger>
              <TabsTrigger value="quiz"><HelpCircle /> Pratinjau Kuis</TabsTrigger>
            </TabsList>
            <TabsContent value="objectives">
              <Card><CardContent className="p-6">
                <ul className="space-y-3">
                  {course.objectives.map((o) => (
                    <li key={o} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />{o}</li>
                  ))}
                </ul>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="quiz">
              {quizPreview.length === 0 ? (
                <EmptyState title="Belum ada pratinjau kuis" description="Kuis untuk materi ini akan tersedia pada fase berikutnya." />
              ) : (
                <div className="space-y-4">
                  {quizPreview.map((q, i) => (
                    <Card key={q.id}><CardContent className="space-y-3 p-6">
                      <p className="text-sm font-bold">{i + 1}. {q.text}</p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((o, oi) => (
                          <li key={oi} className="rounded-xl border px-3.5 py-2.5 text-sm"><span className="mr-2 font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>{o}</li>
                        ))}
                      </ul>
                    </CardContent></Card>
                  ))}
                  <p className="text-xs text-muted-foreground">Pratinjau saja: jawaban belum dapat dikirim dan tidak dinilai.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Daftar pelajaran */}
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Daftar Pelajaran</CardTitle>
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold"><span className="text-muted-foreground">Progres</span><span>{isCompleted ? 100 : (course.progress ?? 0)}%</span></div>
              <Progress value={isCompleted ? 100 : (course.progress ?? 0)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {course.lessons.map((l, i) => {
              const Icon = lessonIcon[l.type];
              const isActive = lesson.id === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => { setActiveLesson(l); setPlaying(false); if (locked) toast.info("Materi premium", { description: "Upgrade untuk memutar pelajaran ini." }); }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", isActive ? "bg-soft" : "hover:bg-muted")}
                >
                  {l.completed || isCompleted ? <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{i + 1}. {l.title}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{l.duration} mnt</span>
                  </span>
                </button>
              );
            })}
            
            {/* Tombol Aksi Klaim XP & Selesai Membaca */}
            <Button 
              className="mt-3 w-full font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleMarkAsCompleted}
              disabled={submitting || isCompleted}
            >
              <Zap className="h-4 w-4 fill-current text-amber-300" />
              {isCompleted ? "Materi Selesai Dibaca ✓" : submitting ? "Menyimpan..." : "Tandai Selesai & Klaim XP"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
