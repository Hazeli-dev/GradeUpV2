import { Link } from "react-router-dom";
import { Compass, Eye, Heart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";

const values = [
  { icon: Target, title: "Terarah", text: "Setiap materi dan latihan punya tujuan belajar yang jelas." },
  { icon: Heart, title: "Ramah siswa", text: "Pengalaman yang menyenangkan agar belajar menjadi kebiasaan." },
  { icon: Compass, title: "Berbasis data", text: "Statistik membantu siswa tahu langkah berikutnya." },
];

export default function AboutPage() {
  return (
    <>
      <section className="container py-16 sm:py-24">
        <SectionHeading eyebrow="Tentang Kami" title="Membuat persiapan ujian lebih terarah" description="GradeUp adalah platform belajar berbasis ujian untuk siswa di berbagai jenjang pendidikan: dari materi, latihan soal, hingga evaluasi hasil belajar." />
      </section>

      <section className="container grid gap-6 pb-16 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-8 shadow-soft">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent"><Eye className="h-6 w-6" /></span>
          <h3 className="mt-5 text-xl font-bold">Visi</h3>
          <p className="mt-2 text-muted-foreground">Menjadi teman belajar digital yang membantu setiap siswa percaya diri menghadapi ujian dan terus berkembang.</p>
        </div>
        <div className="rounded-3xl border bg-card p-8 shadow-soft">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-primary dark:text-accent"><Target className="h-6 w-6" /></span>
          <h3 className="mt-5 text-xl font-bold">Misi</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>Menyediakan materi dan soal latihan yang terstruktur.</li>
            <li>Menghadirkan simulasi ujian yang realistis dan terukur.</li>
            <li>Memberi umpan balik jelas lewat hasil dan statistik belajar.</li>
          </ul>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container">
          <SectionHeading title="Nilai yang kami pegang" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="card-hover rounded-2xl border bg-card p-6 text-center shadow-soft">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white"><v.icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-bold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 text-center">
        <h2 className="text-2xl font-extrabold">Mulai perjalanan belajar Anda</h2>
        <Button asChild size="lg" className="mt-6"><Link to="/register">Daftar Gratis</Link></Button>
      </section>
    </>
  );
}
