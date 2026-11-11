
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  GraduationCap,
  Heart,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/page-header";

const highlights = [
  {
    icon: GraduationCap,
    title: "Berbagai Jenjang",
    description: "Mendukung kebutuhan belajar dari berbagai jenjang pendidikan.",
  },
  {
    icon: BookOpen,
    title: "Materi Terstruktur",
    description: "Membantu siswa belajar secara bertahap dan terarah.",
  },
  {
    icon: BarChart3,
    title: "Evaluasi Belajar",
    description: "Memahami hasil latihan dan perkembangan kemampuan.",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Materi Pembelajaran",
    text: "Pelajari berbagai topik melalui materi yang disusun secara terstruktur untuk membantu membangun pemahaman.",
  },
  {
    icon: ClipboardCheck,
    title: "Latihan dan Simulasi",
    text: "Asah kemampuan melalui latihan soal dan simulasi ujian dengan pengalaman pengerjaan berbasis komputer.",
  },
  {
    icon: BarChart3,
    title: "Evaluasi Hasil Belajar",
    text: "Tinjau hasil pengerjaan, jawaban benar dan salah, serta perkembangan kemampuan belajar.",
  },
  {
    icon: Trophy,
    title: "Pencapaian Belajar",
    text: "Bangun motivasi melalui XP, level, badge, dan pencapaian untuk mendukung konsistensi belajar.",
  },
];

const values = [
  {
    icon: Target,
    title: "Terarah",
    text: "Setiap materi, latihan, dan evaluasi memiliki tujuan belajar yang jelas.",
  },
  {
    icon: Heart,
    title: "Ramah Siswa",
    text: "Menghadirkan pengalaman belajar yang nyaman, sederhana, dan mudah digunakan.",
  },
  {
    icon: BarChart3,
    title: "Berbasis Evaluasi",
    text: "Hasil latihan membantu siswa mengenali kemampuan dan menentukan langkah berikutnya.",
  },
  {
    icon: Lightbulb,
    title: "Terus Berkembang",
    text: "Mendorong proses belajar yang konsisten melalui latihan dan perbaikan berkelanjutan.",
  },
  {
    icon: ShieldCheck,
    title: "Bertanggung Jawab",
    text: "Mengutamakan pengalaman belajar yang informatif dan memberikan manfaat.",
  },
  {
    icon: Users,
    title: "Inklusif",
    text: "Mengembangkan pembelajaran digital yang dapat dimanfaatkan oleh siswa dari berbagai jenjang.",
  },
];

const learningSteps = [
  {
    number: "01",
    icon: Users,
    title: "Buat Akun",
    text: "Daftar dan lengkapi profil untuk memulai perjalanan belajar di GradeUp.",
  },
  {
    number: "02",
    icon: BookOpen,
    title: "Pilih Pembelajaran",
    text: "Temukan materi, latihan soal, atau paket ujian sesuai kebutuhan.",
  },
  {
    number: "03",
    icon: BrainCircuit,
    title: "Belajar dan Berlatih",
    text: "Pelajari materi dan kerjakan latihan untuk memperkuat pemahaman.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Evaluasi Hasil",
    text: "Tinjau hasil belajar, pahami kesalahan, dan tingkatkan kemampuan.",
  },
];

const missions = [
  "Menyediakan materi dan latihan soal yang terstruktur serta mudah diakses.",
  "Menghadirkan simulasi ujian digital sebagai sarana persiapan siswa.",
  "Menyediakan evaluasi untuk membantu memahami hasil belajar.",
  "Mengembangkan pengalaman pembelajaran yang interaktif dan nyaman.",
  "Mendorong kebiasaan belajar mandiri dan konsisten.",
  "Terus meningkatkan kualitas layanan berdasarkan kebutuhan pengguna.",
];

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b bg-muted/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="container py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-xs font-bold tracking-wide text-primary shadow-sm">
              <Sparkles className="h-4 w-4" />
              MENGENAL GRADEUP
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Belajar Lebih Terarah,
              <span className="mt-2 block text-primary">
                Berkembang Lebih Baik.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              GradeUp merupakan platform pembelajaran digital yang
              menggabungkan materi, latihan soal, simulasi ujian, dan
              evaluasi hasil belajar untuk mendukung perjalanan akademik
              siswa dari berbagai jenjang pendidikan.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 rounded-xl px-7">
                <Link to="/register">
                  Mulai Belajar Gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl px-7"
              >
                <Link to="/login">Masuk ke GradeUp</Link>
              </Button>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROFIL */}
      <section className="container py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="TENTANG KAMI"
              title="Belajar bukan sekadar mendapatkan nilai"
              description="Proses belajar yang baik tidak hanya berfokus pada hasil akhir. Memahami materi, mengenali kemampuan, dan memperbaiki kekurangan juga merupakan bagian penting dari perjalanan pendidikan."
            />

            <div className="mt-7 space-y-4 text-sm leading-8 text-muted-foreground sm:text-base">
              <p>
                GradeUp hadir sebagai platform pembelajaran digital
                yang mengintegrasikan materi, latihan soal, simulasi
                ujian, dan evaluasi hasil belajar dalam satu pengalaman
                yang lebih terstruktur.
              </p>

              <p>
                Melalui pendekatan belajar berbasis latihan, siswa
                dapat membangun pemahaman secara bertahap. Hasil
                pengerjaan juga dapat menjadi bahan evaluasi untuk
                menentukan strategi belajar selanjutnya.
              </p>

              <p>
                Kami ingin menjadikan teknologi sebagai sarana
                pendukung pendidikan yang membantu siswa belajar
                secara lebih mandiri, terarah, dan percaya diri.
              </p>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl"
            />

            <div className="relative overflow-hidden rounded-3xl border bg-card p-7 shadow-soft sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg">
                <GraduationCap className="h-8 w-8" />
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Learning Experience
              </p>

              <h3 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
                Satu Platform,
                <span className="block text-primary">
                  Banyak Kesempatan Belajar.
                </span>
              </h3>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Dari memahami materi hingga mengevaluasi hasil ujian,
                GradeUp dirancang untuk mendukung proses belajar dalam
                satu platform digital.
              </p>

              <div className="my-7 h-px bg-border" />

              <div className="space-y-4">
                {[
                  "Pembelajaran lebih terstruktur",
                  "Latihan dan simulasi ujian",
                  "Evaluasi hasil pengerjaan",
                  "Motivasi melalui pencapaian belajar",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISI DAN MISI */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="ARAH DAN TUJUAN"
            title="Visi dan Misi GradeUp"
            description="Landasan yang menjadi arah pengembangan GradeUp dalam menghadirkan pengalaman pembelajaran digital."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border bg-card p-7 shadow-sm transition-shadow hover:shadow-md sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Eye className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Visi Kami
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Pendidikan yang Lebih Terarah
              </h3>

              <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
                Menjadi platform pembelajaran digital yang membantu
                siswa dari berbagai jenjang pendidikan mengembangkan
                potensi, meningkatkan pemahaman, dan membangun
                kepercayaan diri dalam menghadapi tantangan akademik.
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-7 shadow-sm transition-shadow hover:shadow-md sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Misi Kami
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Langkah Nyata untuk Belajar
              </h3>

              <ul className="mt-5 space-y-4">
                {missions.map((mission) => (
                  <li
                    key={mission}
                    className="flex items-start gap-3 text-sm leading-7 text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{mission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="container py-20 sm:py-24">
        <SectionHeading
          eyebrow="FITUR DAN LAYANAN"
          title="Semua kebutuhan belajar dalam satu tempat"
          description="Berbagai fasilitas pembelajaran yang dirancang untuk membantu siswa memahami materi, berlatih, dan mengevaluasi kemampuan."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-bold tracking-widest text-primary/70">
                0{index + 1}
              </p>

              <h3 className="mt-2 text-base font-bold">{feature.title}</h3>

              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CARA BELAJAR */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            eyebrow="MULAI BELAJAR"
            title="Empat langkah menuju belajar lebih terarah"
            description="Mulai dari membuat akun hingga mengevaluasi hasil belajar. Setiap langkah dirancang agar mudah diikuti."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step) => (
              <article
                key={step.number}
                className="relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black tracking-tight text-primary/20">
                    {step.number}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="mt-6 font-bold">{step.title}</h3>

                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NILAI GRADEUP */}
      <section className="container py-20 sm:py-24">
        <SectionHeading
          eyebrow="PRINSIP KAMI"
          title="Nilai yang menjadi dasar GradeUp"
          description="Prinsip yang kami pegang dalam mengembangkan platform dan menghadirkan pengalaman pembelajaran yang bermanfaat."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <article
              key={value.title}
              className="group rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                <value.icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-bold">{value.title}</h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {value.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* KOMITMEN */}
      <section className="border-y bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Award className="h-7 w-7" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Komitmen GradeUp
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Setiap Proses Belajar Berarti
            </h2>

            <p className="mt-5 text-sm leading-8 text-muted-foreground sm:text-base">
              Kami berkomitmen untuk terus mengembangkan platform
              pembelajaran yang mudah digunakan, relevan dengan
              kebutuhan siswa, dan mendukung proses belajar yang
              lebih terarah.
            </p>

            <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
              Kami memahami bahwa setiap siswa memiliki kebutuhan
              dan kecepatan belajar yang berbeda. Karena itu, GradeUp
              ingin menjadi salah satu sarana pendukung agar siswa
              dapat terus berlatih, memahami kemampuan, dan
              meningkatkan pencapaian akademik secara bertahap.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 sm:py-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white shadow-soft sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 -left-20 -z-10 h-80 w-80 rounded-full border border-white/15"
          />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Rocket className="h-7 w-7" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
              Waktunya Berkembang
            </p>

            <h2 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              Mulai Perjalanan Belajarmu Bersama GradeUp
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Pelajari materi, kerjakan latihan, dan evaluasi
              perkembanganmu. Jadikan setiap proses belajar sebagai
              langkah menuju kemampuan yang lebih baik.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 rounded-xl border-white bg-white px-7 font-bold text-primary hover:bg-white/90 hover:text-primary"
              >
                <Link to="/register">
                  Daftar Gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-white/40 bg-transparent px-7 font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">Sudah Punya Akun?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
