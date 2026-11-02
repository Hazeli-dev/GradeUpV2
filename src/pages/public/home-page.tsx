import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";
import { CourseCard } from "@/components/shared/course-card";
import { ExamCard } from "@/components/shared/exam-card";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { courses } from "@/data/courses";
import { exams } from "@/data/exams";
import { faqs, features } from "@/data/marketing";
import { useGuestGate } from "@/hooks/use-guest-gate";

export default function HomePage() {
  const { requireLogin } = useGuestGate();
  const featuredCourses = courses.filter((c) => c.status === "Published").slice(0, 3);
  const featuredExams = exams.filter((e) => e.status === "Published").slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,hsl(var(--soft))_0%,transparent_70%)]" />
        <div className="container grid items-center gap-14 py-14 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-bold text-primary shadow-soft dark:text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Platform belajar berbasis ujian
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Naik Kelas Lebih Cepat Bersama <span className="text-gradient">GradeUp</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              Akses materi terstruktur, latihan soal, dan try out online. Pantau perkembangan nilai dan temukan topik yang perlu diperkuat.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg">
                <Link to="/register">Mulai Belajar Gratis <ArrowRight /></Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => requireLogin("mencoba simulasi ujian")}>
                <PlayCircle /> Coba Simulasi Ujian
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 text-center lg:text-left">
              {[["50rb+", "Soal latihan"], ["120+", "Materi"], ["4,8/5", "Rating contoh"]].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground lg:text-left">Angka bersifat ilustrasi pada versi demo.</p>
          </div>
          <div className="animate-fade-up [animation-delay:150ms]">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="container py-16 sm:py-24">
        <SectionHeading eyebrow="Fitur" title="Semua yang Anda butuhkan untuk belajar efektif" description="Dirancang agar belajar terasa terarah, terukur, dan menyenangkan." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-hover rounded-2xl border bg-card p-6 shadow-soft">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Materi unggulan */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading center={false} eyebrow="Materi Unggulan" title="Mulai dari materi yang paling diminati" />
            <Button asChild variant="outline"><Link to="/courses">Lihat semua materi <ArrowRight /></Link></Button>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((c) => (
              <CourseCard key={c.id} course={c} onClick={() => requireLogin(`mempelajari materi "${c.title}"`)} />
            ))}
          </div>
        </div>
      </section>

      {/* Paket ujian */}
      <section className="container py-16 sm:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading center={false} eyebrow="Paket Ujian" title="Latihan ujian yang terasa seperti aslinya" />
          <Button asChild variant="outline"><Link to="/exams">Lihat semua paket <ArrowRight /></Link></Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredExams.map((e) => (
            <ExamCard key={e.id} exam={e} actionLabel="Mulai" onAction={() => requireLogin(`mengerjakan paket "${e.title}"`)} />
          ))}
        </div>
      </section>

      {/* Harga */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="container">
          <SectionHeading eyebrow="Harga" title="Pilih paket yang sesuai" description="Mulai gratis, upgrade kapan saja saat siap." />
          <div className="mt-14"><PricingCards /></div>
          <p className="mt-8 text-center text-xs text-muted-foreground">Harga bersifat contoh. Sistem langganan dan pembayaran belum aktif pada versi ini.</p>
        </div>
      </section>

      {/* Testimoni */}
      <section className="container py-16 sm:py-24">
        <SectionHeading eyebrow="Testimoni" title="Cerita dari pengguna GradeUp" description="Contoh testimoni untuk keperluan desain." />
        <div className="mt-12"><TestimonialCarousel /></div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="container max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
          <div className="mt-10"><FaqAccordion items={faqs.slice(0, 5)} /></div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline"><Link to="/faq">Lihat semua FAQ</Link></Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-glow sm:px-12">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Siap naik kelas bersama GradeUp?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/85">Buat akun gratis dan mulai latihan hari ini.</p>
          <Button asChild size="lg" variant="outline" className="relative mt-8 border-white/40 bg-white text-primary hover:bg-white/90">
            <Link to="/register">Daftar Gratis <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
